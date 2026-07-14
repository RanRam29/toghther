-- Migration: Fix anonymize_user crash on storage.objects delete
--
-- Discovered 2026-07-14 while locally verifying 20260713120000: the Supabase
-- storage schema on this project has a `protect_delete` trigger on
-- storage.objects (BEFORE DELETE FOR EACH STATEMENT) that raises
-- "Direct deletion from storage tables is not allowed. Use the Storage API
-- instead." unless the session GUC storage.allow_delete_query is 'true'.
-- anonymize_user (20260713120000) deletes directly from storage.objects
-- without setting this GUC — confirmed via `supabase db dump --linked` that
-- the currently-deployed remote function is missing the bypass. This means
-- right now, in production, deleting the account of any user who has
-- uploaded a document (document_uploads) crashes instead of anonymizing.
--
-- Fix: set the bypass GUC, local to the transaction, immediately before the
-- DELETE. Safe because document_uploads rows for the same owner are deleted
-- in the same transaction/function call — no orphaned storage objects result.
-- Body otherwise identical to 20260713120000 (verbatim from db dump).

CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Authorization: the user themselves, OR a hardened admin with MFA.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    PERFORM public.check_admin_mfa();      -- raises unless admin + AAL2
    IF NOT public.is_admin() THEN          -- requires app_metadata.is_admin
      RAISE EXCEPTION 'Access denied. You can only delete your own account or must be an admin.';
    END IF;
  END IF;

  -- 1. Blank out Auth data to free email/phone and mark as deleted
  UPDATE auth.users
  SET email = id || '@deleted.local',
      phone = NULL,
      raw_user_meta_data = '{"deleted": true}'::jsonb,
      encrypted_password = NULL
  WHERE id = p_user_id;

  -- 2. Blank out Profile
  UPDATE public.profiles
  SET full_name = 'Deleted User',
      phone = NULL,
      avatar_url = NULL,
      deleted_at = now()
  WHERE id = p_user_id;

  -- 3. Blank out Professional data (if any)
  UPDATE public.professionals
  SET display_name = 'Deleted Professional',
      bio = NULL,
      languages = '{}',
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE user_id = p_user_id;

  -- 4. Remove sensitive documents physically AND delete records
  -- storage.objects has a protect_delete trigger blocking raw DELETEs (forces
  -- callers through the Storage API to avoid orphaned files) — bypassed here
  -- because this SECURITY DEFINER function deletes the document_uploads row
  -- in the same transaction, so no orphan is created.
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE bucket_id = 'documents'
    AND name IN (SELECT storage_path FROM public.document_uploads WHERE owner_id = p_user_id);

  DELETE FROM public.document_uploads
  WHERE owner_id = p_user_id;

  -- 5. Blank out Children data (if parent)
  UPDATE public.children
  SET first_name = 'Deleted Child',
      needs = '{}'::jsonb,
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE parent_id = p_user_id;

  DELETE FROM public.child_details
  WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id);

  -- 6. Anonymize Daily Logs for related matches
  UPDATE public.daily_logs
  SET notes = NULL
  WHERE match_id IN (
    SELECT id FROM public.matches
    WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
  );

  -- 7. Anonymize Reviews (reviews has reviewer_id — NOT author_id/target_id)
  UPDATE public.reviews
  SET text = NULL
  WHERE reviewer_id = p_user_id
     OR match_id IN (
       SELECT id FROM public.matches
       WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
          OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
     );

  -- 8. End any active matches (D14 needs ended_at for the 14-day review-unlock path)
  UPDATE public.matches
  SET status = 'ended',
      ended_at = now()
  WHERE status = 'active'
    AND (
       professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
    );
END;
$$;

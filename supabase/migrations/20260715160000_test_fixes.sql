-- Fix anonymize_user Crash on storage.objects delete
-- The previous security review migration overwrote anonymize_user without the storage delete permissions bypass.

CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    PERFORM public.check_admin_mfa();
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied. You can only delete your own account or must be an admin.';
    END IF;
  END IF;

  UPDATE auth.users
  SET email = id || '@deleted.local',
      phone = NULL,
      raw_user_meta_data = '{"deleted": true}'::jsonb,
      encrypted_password = NULL
  WHERE id = p_user_id;

  UPDATE public.profiles
  SET full_name = 'Deleted User',
      phone = NULL,
      avatar_url = NULL,
      deleted_at = now()
  WHERE id = p_user_id;

  UPDATE public.professionals
  SET display_name = 'Deleted Professional',
      bio = NULL,
      languages = '{}',
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE user_id = p_user_id;

  -- TEMPORARY bypass for storage delete trigger
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  DELETE FROM storage.objects
  WHERE bucket_id = 'documents'
    AND name IN (SELECT storage_path FROM public.document_uploads WHERE owner_id = p_user_id);

  DELETE FROM public.document_uploads
  WHERE owner_id = p_user_id;

  UPDATE public.children
  SET first_name = 'Deleted Child',
      needs = '{}'::jsonb,
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE parent_id = p_user_id;

  DELETE FROM public.child_details
  WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id);

  UPDATE public.daily_logs
  SET notes = NULL,
      highlight = NULL
  WHERE match_id IN (
    SELECT id FROM public.matches
    WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
  );

  UPDATE public.reviews
  SET text = NULL
  WHERE reviewer_id = p_user_id
     OR match_id IN (
       SELECT id FROM public.matches
       WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
          OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
     );

  UPDATE public.matches
  SET status = 'ended', ended_at = now()
  WHERE status = 'active'
    AND (
       professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
    );
END;
$$;

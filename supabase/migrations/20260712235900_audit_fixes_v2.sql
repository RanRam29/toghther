-- Migration: Architect Audit Fixes v2 (2026-07-12)
-- Fixes bugs introduced in the previous migration:
-- 1. admin_suspend_user: soften the push notification text to be neutral and remove typos.
-- 2. anonymize_user: fix 'author_id'/'target_id' column reference error in reviews.

-- ==========================================
-- 1. D47: Suspend Professional Match Pause (Soften Text)
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_match_id UUID;
  v_parent_id UUID;
  v_prof_user_id UUID;
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.profiles SET suspended_at = now() WHERE id = p_user_id;

  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (p_user_id, 'Account suspended: ' || p_reason, auth.uid());

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'profile', p_user_id, 'admin_suspend_user', 0,
    jsonb_build_object('reason', p_reason)
  );

  -- Pause active matches and notify the other party
  FOR v_match_id, v_parent_id, v_prof_user_id IN 
    SELECT m.id, c.parent_id, p.user_id 
    FROM public.matches m
    JOIN public.children c ON c.id = m.child_id
    JOIN public.professionals p ON p.id = m.professional_id
    WHERE m.status = 'active'
      AND (p.user_id = p_user_id OR c.parent_id = p_user_id)
  LOOP
    UPDATE public.matches SET status = 'paused' WHERE id = v_match_id;
    
    -- Send neutral push to the other party
    IF v_prof_user_id = p_user_id THEN
      -- Prof suspended, notify parent
      PERFORM public.notify_push(
        v_parent_id,
        'עדכון חשוב',
        'המשדוך שלך הושהה זמנית לצורך בירור. צוות התמיכה ייצור קשר בהקדם.',
        jsonb_build_object('type','match_paused','match_id', v_match_id)
      );
    ELSE
      -- Parent suspended, notify prof
      PERFORM public.notify_push(
        v_prof_user_id,
        'עדכון חשוב',
        'המשדוך שלך הושהה זמנית לצורך בירור. צוות התמיכה ייצור קשר בהקדם.',
        jsonb_build_object('type','match_paused','match_id', v_match_id)
      );
    END IF;
  END LOOP;
END;
$$;


-- ==========================================
-- 2. D28: Physical storage delete in anonymize (Fix column reference)
-- ==========================================
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_is_authorized boolean;
BEGIN
  -- Authorization: User themselves, or Admin
  IF auth.uid() = p_user_id THEN
    v_is_authorized := true;
  ELSE
    SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' INTO v_is_authorized;
    IF NOT v_is_authorized THEN
      SELECT (raw_user_meta_data->>'role') = 'admin' INTO v_is_authorized
      FROM auth.users WHERE id = auth.uid();
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied. You can only delete your own account or must be an admin.';
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

  -- Delete sensitive child medical details
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

  -- 7. Anonymize Reviews (FIXED column references)
  UPDATE public.reviews 
  SET text = NULL
  WHERE reviewer_id = p_user_id
     OR match_id IN (
       SELECT id FROM public.matches
       WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
          OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
     );

  -- 8. End any active matches
  UPDATE public.matches
  SET status = 'ended'
  WHERE status = 'active'
    AND (
       professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

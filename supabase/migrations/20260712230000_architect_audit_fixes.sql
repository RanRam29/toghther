-- Migration: Architect Audit Fixes (2026-07-12)
-- Fixes D14 (Blind Rating RLS)
-- Fixes D47 (Suspend Professional pause matches)
-- Fixes D28 (Physical file deletion on anonymize_user + typo fix)

-- ==========================================
-- 1. D14: Blind Rating RLS Enforcement
-- ==========================================
DROP POLICY IF EXISTS "reviews_read" ON reviews;
DROP POLICY IF EXISTS "reviews_parent_browse" ON reviews;

-- Users can read a review if they wrote it, OR if it's blind-rating unlocked.
CREATE POLICY "reviews_read"
  ON reviews FOR SELECT
  USING (
    reviewer_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM matches m
        WHERE m.id = reviews.match_id
          AND (
            m.professional_id = get_professional_id()
            OR EXISTS (
              SELECT 1 FROM children c
              WHERE c.id = m.child_id
                AND c.parent_id = auth.uid()
            )
          )
      )
      AND (
        -- Mutual review exists
        EXISTS (SELECT 1 FROM reviews r2 WHERE r2.match_id = reviews.match_id AND r2.reviewer_id = auth.uid())
        -- Or 14 days passed
        OR EXISTS (SELECT 1 FROM matches m WHERE m.id = reviews.match_id AND m.ended_at < now() - interval '14 days')
      )
    )
  );

-- Parents can read reviews about professionals only if they are unlocked (from blind rating)
CREATE POLICY "reviews_parent_browse"
  ON reviews FOR SELECT
  USING (
    get_user_role() = 'parent'
    AND reviewer_role = 'parent'
    AND (
      -- Mutual review existed for that match
      EXISTS (SELECT 1 FROM reviews r2 WHERE r2.match_id = reviews.match_id AND r2.reviewer_id != reviews.reviewer_id)
      -- Or 14 days passed for that match
      OR EXISTS (SELECT 1 FROM matches m WHERE m.id = reviews.match_id AND m.ended_at < now() - interval '14 days')
    )
  );


-- ==========================================
-- 2. D47: Suspend Professional Match Pause
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
    
    IF v_prof_user_id = p_user_id THEN
      -- Prof suspended, notify parent
      PERFORM public.notify_push(
        v_parent_id,
        'פעילות מלווה הושהתה',
        'החשבון של המלווה שלך הושהה זמנית על ידי המערכת. המצ'' מושהה.',
        jsonb_build_object('type','match_paused','match_id', v_match_id)
      );
    ELSE
      -- Parent suspended, notify prof
      PERFORM public.notify_push(
        v_prof_user_id,
        'פעילות הורה הושהתה',
        'החשבון של ההורה הושהה זמנית על ידי המערכת. המצ'' מושהה.',
        jsonb_build_object('type','match_paused','match_id', v_match_id)
      );
    END IF;
  END LOOP;
END;
$$;


-- ==========================================
-- 3. D28: Physical storage delete in anonymize
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

  -- 7. Anonymize Reviews
  UPDATE public.reviews
  SET text = NULL
  WHERE author_id = p_user_id 
     OR target_id = p_user_id;

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

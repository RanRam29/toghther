-- Security review fixes (2026-07-15)
-- 1. admin_get_user_login: require MFA (parity with admin_set_user_password)
-- 2. Revoke leftover anon write grants on match_days_off / match_hides
-- 3. Re-apply hardened anonymize_user if WP12 regressed it on a deployed env
-- 4. Re-apply secured professional_stats_view + mark_days_off_range if WP14 regressed

CREATE OR REPLACE FUNCTION public.admin_get_user_login(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_email text;
  v_phone text;
  v_username text;
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT u.email, u.phone
  INTO v_email, v_phone
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_email LIKE '%@deleted.local' THEN
    v_email := NULL;
  END IF;

  v_username := COALESCE(
    NULLIF(trim(v_email), ''),
    NULLIF(trim(v_phone), ''),
    p_user_id::text
  );

  RETURN jsonb_build_object(
    'email', v_email,
    'phone', v_phone,
    'username', v_username
  );
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON public.match_days_off FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.match_hides FROM anon;

-- Restore hardened anonymize_user (includes highlight wipe when column exists)
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

CREATE OR REPLACE FUNCTION public.mark_days_off_range(
  p_match_id uuid,
  p_start_date date,
  p_end_date date,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_is_participant BOOLEAN;
  v_current_date date;
BEGIN
  IF p_start_date < (current_date - 14) OR p_end_date > (current_date + 14) THEN
    RAISE EXCEPTION 'Dates must be within 14 days of today';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date must be on or after start date';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = p_match_id
      AND m.status = 'active'
      AND (
        m.professional_id = public.get_professional_id()
        OR m.child_id IN (
          SELECT id FROM public.children
          WHERE parent_id = auth.uid() OR secondary_parent_id = auth.uid()
        )
      )
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Not authorized or match is not active';
  END IF;

  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    INSERT INTO public.match_days_off (match_id, date, reported_by, reason)
    VALUES (p_match_id, v_current_date, auth.uid(), p_reason)
    ON CONFLICT (match_id, date) DO NOTHING;

    v_current_date := v_current_date + 1;
  END LOOP;
END;
$$;

DROP VIEW IF EXISTS public.professional_stats_view;

CREATE VIEW public.professional_stats_view
WITH (security_invoker = true)
AS
WITH match_stats AS (
  SELECT
    professional_id,
    count(*) filter (where status = 'ended' AND ended_at IS NOT NULL) as completed_matches,
    count(*) filter (where status = 'active') as active_matches
  FROM public.matches
  GROUP BY professional_id
),
reporting_stats AS (
  SELECT
    m.professional_id,
    count(l.id) as recent_logs_count,
    count(DISTINCT (c.created_at AT TIME ZONE 'Asia/Jerusalem')::date) as recent_checkins_count
  FROM public.matches m
  LEFT JOIN public.daily_logs l ON l.match_id = m.id AND l.log_date >= (current_date - 90)
  LEFT JOIN public.checkins c ON c.match_id = m.id AND c.is_valid = true
    AND (c.created_at AT TIME ZONE 'Asia/Jerusalem')::date >= (current_date - 90)
  GROUP BY m.professional_id
)
SELECT
  p.id as professional_id,
  p.user_id,
  COALESCE(
    extract(year from age(now(), p.created_at)) * 12 + extract(month from age(now(), p.created_at)),
    0
  ) as months_active,
  COALESCE(ms.completed_matches, 0) as completed_matches,
  CASE
    WHEN COALESCE(rs.recent_checkins_count, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(rs.recent_logs_count, 0)::numeric / rs.recent_checkins_count) * 100)
  END as reporting_consistency_90d
FROM public.professionals p
LEFT JOIN match_stats ms ON ms.professional_id = p.id
LEFT JOIN reporting_stats rs ON rs.professional_id = p.id;

REVOKE ALL ON public.professional_stats_view FROM PUBLIC, anon;
GRANT SELECT ON public.professional_stats_view TO authenticated;

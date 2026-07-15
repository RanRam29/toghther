-- Migration: WP12 "Highlight of the Day" & Weekly Summary

-- 1. Add highlight column to daily_logs
ALTER TABLE public.daily_logs
ADD COLUMN highlight text CHECK (char_length(highlight) <= 140);

-- 2. Update anonymize_user to clear highlight (D51)
-- Authorization MUST stay hardened (is_admin + MFA) — never trust user_metadata.role.
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

  DELETE FROM public.child_details
  WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id);

  -- 6. Anonymize Daily Logs for related matches
  UPDATE public.daily_logs
  SET notes = NULL, highlight = NULL
  WHERE match_id IN (
    SELECT id FROM public.matches 
    WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
  );

  -- 7. Anonymize Reviews
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
  SET status = 'ended', ended_at = now()
  WHERE status = 'active'
    AND (
       professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
    );
END;
$$;


-- 3. Weekly Summary RPC
CREATE OR REPLACE FUNCTION public.get_weekly_summary(p_match_id uuid, p_week_start date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_authorized boolean;
  v_days_attended int;
  v_days_off int;
  v_mood_this_week numeric;
  v_mood_last_week numeric;
  v_mood_trend text;
  v_highlights text[];
  v_metrics jsonb;
  v_res jsonb;
BEGIN
  -- Authorize: Parent or Secondary Parent
  SELECT true INTO v_authorized
  FROM public.matches m
  JOIN public.children c ON m.child_id = c.id
  WHERE m.id = p_match_id
    AND (c.parent_id = auth.uid() OR c.secondary_parent_id = auth.uid())
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized or match not found';
  END IF;

  -- Days attended
  SELECT count(DISTINCT (created_at AT TIME ZONE 'Asia/Jerusalem')::date) INTO v_days_attended
  FROM public.checkins
  WHERE match_id = p_match_id
    AND is_valid = true
    AND (created_at AT TIME ZONE 'Asia/Jerusalem')::date BETWEEN p_week_start AND (p_week_start + 6);

  -- Days off
  SELECT count(*) INTO v_days_off
  FROM public.match_days_off
  WHERE match_id = p_match_id
    AND date BETWEEN p_week_start AND (p_week_start + 6);

  -- Mood Trend
  SELECT avg(mood) INTO v_mood_this_week
  FROM public.daily_logs
  WHERE match_id = p_match_id AND log_date BETWEEN p_week_start AND (p_week_start + 6);

  SELECT avg(mood) INTO v_mood_last_week
  FROM public.daily_logs
  WHERE match_id = p_match_id AND log_date BETWEEN (p_week_start - 7) AND (p_week_start - 1);

  IF v_mood_this_week IS NULL THEN
    v_mood_trend := 'no_data';
  ELSIF v_mood_last_week IS NULL THEN
    v_mood_trend := 'new';
  ELSIF v_mood_this_week >= v_mood_last_week + 0.5 THEN
    v_mood_trend := 'improving';
  ELSIF v_mood_this_week <= v_mood_last_week - 0.5 THEN
    v_mood_trend := 'declining';
  ELSE
    v_mood_trend := 'stable';
  END IF;

  -- Highlights
  SELECT array_agg(highlight ORDER BY log_date ASC) INTO v_highlights
  FROM public.daily_logs
  WHERE match_id = p_match_id 
    AND log_date BETWEEN p_week_start AND (p_week_start + 6)
    AND highlight IS NOT NULL AND highlight != '';

  -- Metrics average
  SELECT COALESCE(jsonb_object_agg(k, ROUND(v::numeric, 1)), '{}'::jsonb) INTO v_metrics
  FROM (
    SELECT e.key as k, avg(e.value::numeric) as v
    FROM public.daily_logs l
    CROSS JOIN jsonb_each_text(l.metrics) e
    WHERE l.match_id = p_match_id
      AND l.log_date BETWEEN p_week_start AND (p_week_start + 6)
    GROUP BY e.key
  ) agg;

  v_res := jsonb_build_object(
    'days_attended', COALESCE(v_days_attended, 0),
    'days_off', COALESCE(v_days_off, 0),
    'mood_avg', ROUND(COALESCE(v_mood_this_week, 0)::numeric, 1),
    'mood_trend', v_mood_trend,
    'metrics_avg', v_metrics,
    'highlights', COALESCE(v_highlights, '{}'::text[])
  );

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_summary(uuid, date) TO authenticated;


-- 4. Cron job for Weekly Push
SELECT cron.schedule(
  'weekly-summary-push',
  '0 12 * * 5', -- Friday at 12:00
  $$
    SELECT public.notify_push(
      c.id,
      'סיכום שבועי',
      'השבוע שלכם הסתיים, היכנס/י לראות את סיכום המדדים ורגעי היום.',
      jsonb_build_object('type','weekly_summary','match_id', m.id)
    )
    FROM public.matches m
    JOIN public.children ch ON m.child_id = ch.id
    JOIN public.profiles c ON ch.parent_id = c.id
    WHERE m.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.daily_logs l 
        WHERE l.match_id = m.id 
          AND l.log_date >= (current_date - 5) -- From Sunday
      )
  $$
);

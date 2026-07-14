-- Fix: get_child_progress_report counted daily_logs rows, not distinct days.
--
-- 20260714110000_daily_logs_multiple_per_day.sql (deployed to cloud as
-- version 20260714070356 in supabase_migrations.schema_migrations --
-- confirmed via `supabase db query`, same migration under an earlier
-- version number) dropped daily_logs' UNIQUE(match_id, log_date), so a
-- professional can now log several observations on the same day.
-- get_child_progress_report (D53) used count(*) for both the totals
-- 'logs_count' and each week's 'logs' field, so a single day with three
-- notes would silently read as "3 days reported" to a parent instead of
-- "1 day reported, 3 notes". Both occurrences now count DISTINCT log_date
-- to preserve the original meaning (reporting consistency by day), not
-- row count. mood_avg intentionally still averages every row (all
-- observations), which is unaffected by this fix.

CREATE OR REPLACE FUNCTION public.get_child_progress_report(p_child_id uuid, p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_child record;
  v_matches jsonb := '[]'::jsonb;
  v_totals jsonb;
BEGIN
  -- 1. Authentication and Authorization
  SELECT first_name, age INTO v_child
  FROM children
  WHERE id = p_child_id
    AND (parent_id = auth.uid() OR secondary_parent_id = auth.uid())
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized or child not found';
  END IF;

  -- 2. Validation
  IF p_from > p_to THEN
    RAISE EXCEPTION 'Invalid date range: from date must be before or equal to to date';
  END IF;

  IF (p_to - p_from) > 366 THEN
    RAISE EXCEPTION 'Date range exceeds maximum allowed duration of 366 days';
  END IF;

  -- 3. Calculate Matches Data
  WITH match_attendance AS (
    SELECT c.match_id, count(DISTINCT (c.created_at AT TIME ZONE 'Asia/Jerusalem')::date) as days_attended
    FROM checkins c
    WHERE (c.created_at AT TIME ZONE 'Asia/Jerusalem')::date BETWEEN p_from AND p_to
      AND c.is_valid = true
    GROUP BY c.match_id
  ),
  match_days_off_agg AS (
    SELECT doff.match_id, count(*) as days_off
    FROM match_days_off doff
    WHERE doff.date BETWEEN p_from AND p_to
    GROUP BY doff.match_id
  ),
  match_reporting AS (
    SELECT l.match_id, count(DISTINCT l.log_date) as logs_count, avg(l.mood) as mood_avg
    FROM daily_logs l
    WHERE l.log_date BETWEEN p_from AND p_to
    GROUP BY l.match_id
  ),
  match_weeks AS (
    SELECT
      w.match_id,
      jsonb_agg(
        jsonb_build_object(
          'week_start', w.week_start,
          'logs', w.logs,
          'mood_avg', ROUND(w.mood_avg::numeric, 1),
          'metrics_avg', w.metrics_avg
        ) ORDER BY w.week_start
      ) as weeks
    FROM (
      SELECT
        l.match_id,
        (date_trunc('week', l.log_date::timestamp + interval '1 day') - interval '1 day')::date as week_start,
        count(DISTINCT l.log_date) as logs,
        avg(l.mood) as mood_avg,
        (
          SELECT COALESCE(jsonb_object_agg(k, ROUND(v::numeric, 1)), '{}'::jsonb)
          FROM (
            SELECT e.key as k, avg(e.value::numeric) as v
            FROM daily_logs l2
            CROSS JOIN jsonb_each_text(l2.metrics) e
            WHERE l2.match_id = l.match_id
              AND (date_trunc('week', l2.log_date::timestamp + interval '1 day') - interval '1 day')::date = (date_trunc('week', l.log_date::timestamp + interval '1 day') - interval '1 day')::date
              AND l2.log_date BETWEEN p_from AND p_to
              AND e.key = ANY(COALESCE((SELECT metric_keys FROM matches WHERE id = l.match_id), '{}'::text[]))
            GROUP BY e.key
          ) agg
        ) as metrics_avg
      FROM daily_logs l
      WHERE l.log_date BETWEEN p_from AND p_to
      GROUP BY l.match_id, (date_trunc('week', l.log_date::timestamp + interval '1 day') - interval '1 day')::date
    ) w
    GROUP BY w.match_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'professional_name', p.display_name,
      'started_at', m.started_at::date,
      'ended_at', m.ended_at::date,
      'metrics_keys', COALESCE(m.metric_keys, '{}'::text[]),
      'attendance', jsonb_build_object(
        'days_attended', COALESCE(att.days_attended, 0),
        'days_off', COALESCE(off.days_off, 0)
      ),
      'reporting', jsonb_build_object(
        'logs_count', COALESCE(rep.logs_count, 0),
        'mood_avg', ROUND(COALESCE(rep.mood_avg, 0)::numeric, 1)
      ),
      'weeks', COALESCE(wk.weeks, '[]'::jsonb)
    )
  ), '[]'::jsonb) INTO v_matches
  FROM matches m
  JOIN professionals p ON p.id = m.professional_id
  LEFT JOIN match_attendance att ON att.match_id = m.id
  LEFT JOIN match_days_off_agg off ON off.match_id = m.id
  LEFT JOIN match_reporting rep ON rep.match_id = m.id
  LEFT JOIN match_weeks wk ON wk.match_id = m.id
  WHERE m.child_id = p_child_id
    AND m.started_at::date <= p_to
    AND (m.ended_at IS NULL OR m.ended_at::date >= p_from);

  -- 4. Calculate Totals directly from v_matches to avoid recalculating
  IF jsonb_array_length(v_matches) > 0 THEN
    SELECT jsonb_build_object(
      'days_attended', COALESCE(SUM((elem->'attendance'->>'days_attended')::int), 0),
      'logs_count', COALESCE(SUM((elem->'reporting'->>'logs_count')::int), 0),
      'mood_avg', ROUND(COALESCE(AVG((elem->'reporting'->>'mood_avg')::numeric) FILTER (WHERE (elem->'reporting'->>'logs_count')::int > 0), 0), 1)
    ) INTO v_totals
    FROM jsonb_array_elements(v_matches) elem;
  ELSE
    v_totals := jsonb_build_object('days_attended', 0, 'logs_count', 0, 'mood_avg', 0);
  END IF;

  -- 5. Return JSONB
  RETURN jsonb_build_object(
    'report_version', 1,
    'child', jsonb_build_object(
      'first_name', v_child.first_name,
      'age', v_child.age
    ),
    'period', jsonb_build_object(
      'from', p_from,
      'to', p_to
    ),
    'matches', v_matches,
    'totals', v_totals
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_child_progress_report(uuid, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_child_progress_report(uuid, date, date) TO authenticated;

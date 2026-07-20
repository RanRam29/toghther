-- Fix get_my_monthly_attendance to count both checkins and daily_logs

CREATE OR REPLACE FUNCTION public.get_my_monthly_attendance(p_month date)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_pro_id uuid;
  v_res jsonb;
BEGIN
  v_pro_id := public.get_professional_id();
  IF v_pro_id IS NULL THEN
    RAISE EXCEPTION 'Not a professional';
  END IF;

  -- Build attendance per match
  SELECT jsonb_agg(
    jsonb_build_object(
      'match_id', m.id,
      'child_name', c.first_name,
      'days_attended', COALESCE(att.days_attended, 0),
      'attended_dates', COALESCE(att.attended_dates, '{}'::date[]),
      'days_off', COALESCE(off.days_off, 0),
      'off_dates', COALESCE(off.off_dates, '{}'::date[])
    )
  ) INTO v_res
  FROM public.matches m
  JOIN public.children c ON m.child_id = c.id
  LEFT JOIN (
    SELECT match_id, count(DISTINCT d) as days_attended, array_agg(DISTINCT d) as attended_dates
    FROM (
      SELECT match_id, (created_at AT TIME ZONE 'Asia/Jerusalem')::date as d
      FROM public.checkins
      WHERE is_valid = true
      UNION
      SELECT match_id, log_date as d
      FROM public.daily_logs
    ) combined
    WHERE date_trunc('month', d) = date_trunc('month', p_month)
    GROUP BY match_id
  ) att ON att.match_id = m.id
  LEFT JOIN (
    SELECT match_id, count(date) as days_off, array_agg(date) as off_dates
    FROM public.match_days_off
    WHERE date_trunc('month', date) = date_trunc('month', p_month)
    GROUP BY match_id
  ) off ON off.match_id = m.id
  WHERE m.professional_id = v_pro_id
    AND (m.status = 'active' OR (m.status = 'ended' AND date_trunc('month', m.ended_at) >= date_trunc('month', p_month)));

  RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

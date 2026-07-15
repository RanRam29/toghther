-- Migration: WP14 Professional Tools

-- 1. Monthly Attendance RPC
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
    SELECT match_id, count(DISTINCT (created_at AT TIME ZONE 'Asia/Jerusalem')::date) as days_attended,
           array_agg(DISTINCT (created_at AT TIME ZONE 'Asia/Jerusalem')::date) as attended_dates
    FROM public.checkins
    WHERE is_valid = true
      AND date_trunc('month', (created_at AT TIME ZONE 'Asia/Jerusalem')::date) = date_trunc('month', p_month)
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

GRANT EXECUTE ON FUNCTION public.get_my_monthly_attendance(date) TO authenticated;


-- 2. Mark Days Off Range RPC
CREATE OR REPLACE FUNCTION public.mark_days_off_range(p_match_id uuid, p_start_date date, p_end_date date, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_is_participant BOOLEAN;
  v_current_date date;
BEGIN
  -- Validate ±14 days
  IF p_start_date < (current_date - 14) OR p_end_date > (current_date + 14) THEN
    RAISE EXCEPTION 'Dates must be within 14 days of today';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date must be on or after start date';
  END IF;

  -- Verify active participation
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

  -- Insert days off
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    INSERT INTO public.match_days_off (match_id, date, reported_by, reason)
    VALUES (p_match_id, v_current_date, auth.uid(), p_reason)
    ON CONFLICT (match_id, date) DO NOTHING;
    
    v_current_date := v_current_date + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_days_off_range(uuid, date, date, text) TO authenticated;


-- 3. Professional Stats View (security_invoker — must not bypass RLS as view owner)
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
  LEFT JOIN public.checkins c ON c.match_id = m.id AND c.is_valid = true AND (c.created_at AT TIME ZONE 'Asia/Jerusalem')::date >= (current_date - 90)
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

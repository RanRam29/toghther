-- Fix D55 data leak: split stats view into public (no reporting_consistency) and private RPC

DROP VIEW IF EXISTS public.professional_stats_view;

CREATE OR REPLACE VIEW public.professional_public_stats_view
WITH (security_invoker = true) AS
WITH match_stats AS (
  SELECT
    professional_id,
    count(*) filter (where status = 'ended' AND ended_at IS NOT NULL) as completed_matches,
    count(*) filter (where status = 'active') as active_matches
  FROM public.matches
  GROUP BY professional_id
)
SELECT
  p.id as professional_id,
  p.user_id,
  COALESCE(
    extract(year from age(now(), p.created_at)) * 12 + extract(month from age(now(), p.created_at)),
    0
  ) as months_active,
  COALESCE(ms.completed_matches, 0) as completed_matches,
  COALESCE(ms.active_matches, 0) as active_matches
FROM public.professionals p
LEFT JOIN match_stats ms ON ms.professional_id = p.id;

REVOKE ALL ON public.professional_public_stats_view FROM PUBLIC, anon;
GRANT SELECT ON public.professional_public_stats_view TO authenticated;

CREATE OR REPLACE FUNCTION public.get_professional_reporting_consistency(p_professional_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_owner uuid;
  v_val integer;
  v_recent_logs bigint;
  v_recent_checkins bigint;
BEGIN
  SELECT user_id INTO v_owner FROM public.professionals WHERE id = p_professional_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  
  -- Auth: Owner or admin
  IF NOT (v_owner = auth.uid() OR public.is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    count(l.id) as recent_logs_count,
    count(DISTINCT (c.created_at AT TIME ZONE 'Asia/Jerusalem')::date) as recent_checkins_count
  INTO v_recent_logs, v_recent_checkins
  FROM public.matches m
  LEFT JOIN public.daily_logs l ON l.match_id = m.id AND l.log_date >= (current_date - 90)
  LEFT JOIN public.checkins c ON c.match_id = m.id AND c.is_valid = true
    AND (c.created_at AT TIME ZONE 'Asia/Jerusalem')::date >= (current_date - 90)
  WHERE m.professional_id = p_professional_id
  GROUP BY m.professional_id;

  IF COALESCE(v_recent_checkins, 0) = 0 THEN
    v_val := 0;
  ELSE
    v_val := ROUND((COALESCE(v_recent_logs, 0)::numeric / v_recent_checkins) * 100);
  END IF;

  RETURN COALESCE(v_val, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_professional_reporting_consistency(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_reporting_consistency(uuid) TO authenticated;

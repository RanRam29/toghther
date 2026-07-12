-- Migration: Live Ops Dashboard Alerts
-- Creates an RPC to fetch real-time operational alerts for Admins.

CREATE OR REPLACE FUNCTION public.get_live_ops_alerts()
RETURNS TABLE (
  alert_id text,
  alert_type text,
  severity text,
  resource_id uuid,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    'inactive_' || m.id::text AS alert_id,
    'INACTIVE_MATCH'::text AS alert_type,
    'HIGH'::text AS severity,
    m.id AS resource_id,
    jsonb_build_object(
      'child_name', c.first_name,
      'prof_id', p.id,
      'last_activity', (
        SELECT max(ck.created_at) FROM public.checkins ck WHERE ck.match_id = m.id
      )
    ) AS details,
    now() AS created_at
  FROM public.matches m
  JOIN public.children c ON m.child_id = c.id
  JOIN public.professionals p ON m.professional_id = p.id
  WHERE m.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.checkins ck
      WHERE ck.match_id = m.id AND ck.created_at >= now() - interval '3 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_logs d
      WHERE d.match_id = m.id AND d.log_date >= current_date - 3
    )

  UNION ALL

  SELECT
    'pending_prof_' || p.id::text AS alert_id,
    'PENDING_PROFESSIONAL'::text AS alert_type,
    'MEDIUM'::text AS severity,
    p.id AS resource_id,
    jsonb_build_object(
      'user_id', p.user_id,
      'days_waiting', EXTRACT(DAY FROM now() - p.created_at)
    ) AS details,
    now() AS created_at
  FROM public.professionals p
  WHERE p.verified = 'submitted'
    AND p.created_at <= now() - interval '2 days'

  UNION ALL

  SELECT
    'stale_req_' || r.id::text AS alert_id,
    'STALE_REQUEST'::text AS alert_type,
    'MEDIUM'::text AS severity,
    r.id AS resource_id,
    jsonb_build_object(
      'child_name', c.first_name,
      'days_waiting', EXTRACT(DAY FROM now() - r.created_at)
    ) AS details,
    now() AS created_at
  FROM public.match_requests r
  JOIN public.children c ON r.child_id = c.id
  WHERE r.status = 'pending' AND r.professional_status = 'pending'
    AND r.created_at <= now() - interval '7 days';
END;
$$;

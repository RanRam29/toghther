-- Migration: Full System Data Export
-- Creates an RPC to dump the entire database as a JSON object for admins.

CREATE OR REPLACE FUNCTION public.export_system_data()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'profiles', (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM public.profiles p),
    'professionals', (SELECT COALESCE(jsonb_agg(row_to_json(pr)), '[]'::jsonb) FROM public.professionals pr),
    'children', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM public.children c),
    'matches', (SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM public.matches m),
    'checkins', (SELECT COALESCE(jsonb_agg(row_to_json(ch)), '[]'::jsonb) FROM public.checkins ch),
    'daily_logs', (SELECT COALESCE(jsonb_agg(row_to_json(dl)), '[]'::jsonb) FROM public.daily_logs dl),
    'analytics_events', (SELECT COALESCE(jsonb_agg(row_to_json(ae)), '[]'::jsonb) FROM public.analytics_events ae)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

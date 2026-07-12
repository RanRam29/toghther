-- Together Platform — end_match RPC (parent or professional)
-- Migration: 20260709142000_end_match_rpc.sql

CREATE OR REPLACE FUNCTION public.end_match(
  p_match_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_match public.matches%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status NOT IN ('active', 'paused') THEN
    RAISE EXCEPTION 'Match cannot be ended from status %', v_match.status;
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = v_match.child_id AND c.parent_id = auth.uid()
    )
    OR v_match.professional_id = public.get_professional_id()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.matches
  SET status = 'ended',
      ended_at = now(),
      end_reason = nullif(trim(p_reason), '')
  WHERE id = p_match_id;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'match', p_match_id, 'end_match', 1,
    jsonb_build_object('reason', nullif(trim(p_reason), ''))
  );
END;
$$;

-- Admin metric catalog updates (S-ADM-07)
CREATE OR REPLACE FUNCTION public.admin_update_metric_catalog(
  p_key text,
  p_he_label text,
  p_en_label text,
  p_is_core boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.metric_catalog
  SET he_label = trim(p_he_label),
      en_label = trim(p_en_label),
      is_core = p_is_core
  WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Metric key not found: %', p_key;
  END IF;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'metric_catalog', NULL, 'admin_update_metric', 0,
    jsonb_build_object('key', p_key, 'is_core', p_is_core)
  );
END;
$$;

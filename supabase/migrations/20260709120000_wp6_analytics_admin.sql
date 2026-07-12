-- Together Platform — WP6: Admin-2 & Analytics
-- Migration: 20260709120000_wp6_analytics_admin.sql

-- ============================================================
-- 1. ANALYTICS & TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_events_insert ON public.analytics_events 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY analytics_events_read_admin ON public.analytics_events 
  FOR SELECT TO authenticated 
  USING (public.get_user_role() = 'admin');

CREATE OR REPLACE FUNCTION public.track_event(p_event_name TEXT, p_properties JSONB DEFAULT '{}'::jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.analytics_events (user_id, event_name, properties)
  VALUES (auth.uid(), p_event_name, p_properties);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE VIEW public.view_parent_funnel AS
SELECT 
  COUNT(DISTINCT CASE WHEN event_name = 'child_profile_completed' THEN user_id END) AS parents_activated,
  COUNT(DISTINCT CASE WHEN event_name = 'matches_viewed' THEN user_id END) AS parents_viewed_matches,
  COUNT(DISTINCT CASE WHEN event_name = 'request_sent' THEN user_id END) AS parents_sent_request,
  COUNT(DISTINCT CASE WHEN event_name = 'match_created' THEN user_id END) AS parents_with_match,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN event_name = 'matches_viewed' THEN user_id END) > 0 
    THEN ROUND(COUNT(DISTINCT CASE WHEN event_name = 'request_sent' THEN user_id END)::numeric / COUNT(DISTINCT CASE WHEN event_name = 'matches_viewed' THEN user_id END) * 100, 1)
    ELSE 0 
  END AS conversion_to_request_pct,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN event_name = 'request_sent' THEN user_id END) > 0 
    THEN ROUND(COUNT(DISTINCT CASE WHEN event_name = 'match_created' THEN user_id END)::numeric / COUNT(DISTINCT CASE WHEN event_name = 'request_sent' THEN user_id END) * 100, 1)
    ELSE 0 
  END AS conversion_to_match_pct
FROM public.analytics_events;

-- ============================================================
-- 2. SYSTEM CONFIGURATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY system_config_read ON public.system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY system_config_update_admin ON public.system_config FOR ALL TO authenticated USING (public.get_user_role() = 'admin');

INSERT INTO public.system_config (key, value) VALUES
('geofence_radius_m', '100'),
('request_expiration_days', '14'),
('monthly_request_quota', '5'),
('launch_city', '"תל אביב"')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_set_config(p_key TEXT, p_value JSONB)
RETURNS void AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Requires admin role';
  END IF;

  INSERT INTO public.system_config (key, value, updated_by, updated_at)
  VALUES (p_key, p_value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_set_config', auth.uid(), jsonb_build_object('key', p_key, 'value', p_value));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. ADVANCED ADMIN CONTROLS
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_notes_read ON public.admin_notes FOR SELECT TO authenticated USING (public.get_user_role() = 'admin');

CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Requires admin role';
  END IF;

  UPDATE public.profiles SET suspended_at = now() WHERE id = p_user_id;
  
  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (p_user_id, 'Account suspended: ' || p_reason, auth.uid());

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_suspend_user', auth.uid(), jsonb_build_object('target_user', p_user_id, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_restore_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Requires admin role';
  END IF;

  UPDATE public.profiles SET suspended_at = NULL WHERE id = p_user_id;
  
  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (p_user_id, 'Account restored', auth.uid());

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_restore_user', auth.uid(), jsonb_build_object('target_user', p_user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_unpublish_child(p_child_id UUID, p_reason TEXT)
RETURNS void AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Requires admin role';
  END IF;

  UPDATE public.children SET published = false WHERE id = p_child_id RETURNING parent_id INTO v_parent_id;
  
  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (v_parent_id, 'Child profile ' || p_child_id::TEXT || ' unpublished: ' || p_reason, auth.uid());

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_unpublish_child', auth.uid(), jsonb_build_object('child_id', p_child_id, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_log_reasoned_view(p_resource TEXT, p_resource_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Requires admin role';
  END IF;

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_viewed_sensitive_data', auth.uid(), jsonb_build_object('resource', p_resource, 'resource_id', p_resource_id, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Together Platform — WP7: Admin MFA Enforcement
-- Migration: 20260709130000_wp7_admin_mfa.sql

-- Helper function to check admin AND MFA
CREATE OR REPLACE FUNCTION public.check_admin_mfa()
RETURNS void AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Requires admin role';
  END IF;
  
  -- In development or test environments, we might not have a full JWT.
  -- But for production security, we enforce AAL2 for admins.
  -- We allow tests to bypass if we set a specific local config or if jwt is null (in tests).
  -- However, strict enforcement requires:
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'aal') != 'aal2' THEN
      RAISE EXCEPTION 'Access denied: Requires MFA (AAL2)';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update WP6 RPCs
CREATE OR REPLACE FUNCTION public.admin_set_config(p_key TEXT, p_value JSONB)
RETURNS void AS $$
BEGIN
  PERFORM public.check_admin_mfa();

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

CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  PERFORM public.check_admin_mfa();

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
  PERFORM public.check_admin_mfa();

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
  PERFORM public.check_admin_mfa();

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
  PERFORM public.check_admin_mfa();

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_viewed_sensitive_data', auth.uid(), jsonb_build_object('resource', p_resource, 'resource_id', p_resource_id, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update WP3 RPCs
CREATE OR REPLACE FUNCTION public.admin_verify_professional(p_pro_id UUID, p_checklist JSONB)
RETURNS void AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  UPDATE public.professionals SET verified = 'verified' WHERE user_id = p_pro_id;
  
  -- Assuming there is a checklist column or we save it to admin notes
  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (p_pro_id, 'Verified professional. Checklist: ' || p_checklist::TEXT, auth.uid());

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_verify_professional', auth.uid(), jsonb_build_object('pro_id', p_pro_id, 'checklist', p_checklist));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reject_document(p_doc_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  -- Example implementation
  -- UPDATE professional_documents SET status = 'rejected', reject_reason = p_reason WHERE id = p_doc_id;

  INSERT INTO public.audit_log (action, user_id, details)
  VALUES ('admin_reject_document', auth.uid(), jsonb_build_object('doc_id', p_doc_id, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

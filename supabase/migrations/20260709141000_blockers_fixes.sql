-- Together Platform — Blocker fixes: submit_review, pause/resume, admin RPC audit+MFA
-- Migration: 20260709141000_blockers_fixes.sql

-- ============================================================
-- 1. submit_review — correct column names (reliability/professionalism/child_fit/text)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_review(
  p_match_id uuid,
  p_criteria jsonb,
  p_text text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_match RECORD;
  v_role public.reviewer_role;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  IF v_match.status != 'ended' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for ended matches';
  END IF;

  IF v_match.professional_id = public.get_professional_id() THEN
    v_role := 'professional';
  ELSIF (
    SELECT parent_id FROM public.children WHERE id = v_match.child_id
  ) = auth.uid() THEN
    v_role := 'parent';
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reviews
    WHERE match_id = p_match_id AND reviewer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Review already submitted';
  END IF;

  INSERT INTO public.reviews (
    match_id,
    reviewer_id,
    reviewer_role,
    reliability,
    professionalism,
    child_fit,
    text
  )
  VALUES (
    p_match_id,
    auth.uid(),
    v_role,
    (p_criteria->>'reliability')::int,
    (p_criteria->>'professionalism')::int,
    (p_criteria->>'child_fit')::int,
    nullif(trim(p_text), '')
  );
END;
$$;

-- ============================================================
-- 2. pause_match / resume_match — parent-only via RPC (S-PAR-08)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pause_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.children c ON c.id = m.child_id
    WHERE m.id = p_match_id
      AND m.status = 'active'
      AND c.parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied or match is not active';
  END IF;

  UPDATE public.matches SET status = 'paused' WHERE id = p_match_id;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (auth.uid(), 'match', p_match_id, 'pause_match', 1, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.children c ON c.id = m.child_id
    WHERE m.id = p_match_id
      AND m.status = 'paused'
      AND c.parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied or match is not paused';
  END IF;

  UPDATE public.matches SET status = 'active' WHERE id = p_match_id;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (auth.uid(), 'match', p_match_id, 'resume_match', 1, '{}'::jsonb);
END;
$$;

-- ============================================================
-- 3. Admin read — checkins + daily_logs for operational dashboard
-- ============================================================
CREATE POLICY checkins_admin_read ON public.checkins
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY daily_logs_admin_read ON public.daily_logs
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================================
-- 4. Restore WP3 admin RPCs + MFA + correct audit_log schema
--    (WP7 migration overwrote verify/reject with stubs + wrong audit columns)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_verify_professional(p_pro_id uuid, p_checklist jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid;
  v_missing text;
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT user_id INTO v_user_id FROM public.professionals WHERE id = p_pro_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Professional not found';
  END IF;

  SELECT string_agg(req.t, ', ' ORDER BY req.t) INTO v_missing
  FROM (VALUES ('certificate'), ('criminal_record'), ('id_card')) AS req(t)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.document_uploads d
    WHERE d.owner_id = v_user_id AND d.doc_type = req.t::public.document_type
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot verify: missing required document(s): %', v_missing;
  END IF;

  UPDATE public.professionals
  SET verified = 'verified',
      verified_at = now(),
      verified_by = auth.uid(),
      verification_checklist = p_checklist,
      assigned_supervisor_id = NULL,
      assigned_at = NULL
  WHERE id = p_pro_id;

  UPDATE public.document_uploads
  SET verified = true, verified_by = auth.uid(), verified_at = now()
  WHERE owner_id = v_user_id
    AND doc_type IN ('certificate', 'criminal_record', 'id_card')
    AND verified = false;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (auth.uid(), 'professional', p_pro_id, 'admin_verify', 0, coalesce(p_checklist, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_document(p_doc_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  UPDATE public.document_uploads
  SET verified = false,
      rejection_note = p_reason,
      verified_by = auth.uid(),
      verified_at = now()
  WHERE id = p_doc_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'document', p_doc_id, 'admin_reject_document', 0,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_log_reasoned_view(
  p_resource text,
  p_resource_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required for a reasoned view';
  END IF;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), p_resource, p_resource_id, 'admin_reasoned_view', 3,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_config(p_key text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  INSERT INTO public.system_config (key, value, updated_by, updated_at)
  VALUES (p_key, p_value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'system_config', NULL, 'admin_set_config', 0,
    jsonb_build_object('key', p_key, 'value', p_value)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.profiles SET suspended_at = now() WHERE id = p_user_id;

  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (p_user_id, 'Account suspended: ' || p_reason, auth.uid());

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'profile', p_user_id, 'admin_suspend_user', 0,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.profiles SET suspended_at = NULL WHERE id = p_user_id;

  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (p_user_id, 'Account restored', auth.uid());

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (auth.uid(), 'profile', p_user_id, 'admin_restore_user', 0, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unpublish_child(p_child_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.children
  SET published = false
  WHERE id = p_child_id
  RETURNING parent_id INTO v_parent_id;

  INSERT INTO public.admin_notes (target_user_id, note, created_by)
  VALUES (
    v_parent_id,
    'Child profile ' || p_child_id::text || ' unpublished: ' || p_reason,
    auth.uid()
  );

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'child', p_child_id, 'admin_unpublish_child', 1,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

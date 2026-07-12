-- Together Platform — WP3b: Supervisor role (D26)
-- Migration: 20260709140000_wp3_supervisor_role.sql

-- ============================================================
-- 1. Schema
-- ============================================================
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'supervisor';

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS assigned_supervisor_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_professionals_assigned_supervisor
  ON public.professionals(assigned_supervisor_id)
  WHERE verified = 'submitted';

CREATE TABLE IF NOT EXISTS public.supervisor_document_views (
  supervisor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id   uuid NOT NULL REFERENCES public.document_uploads(id) ON DELETE CASCADE,
  viewed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (supervisor_id, document_id)
);

ALTER TABLE public.supervisor_document_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY supervisor_doc_views_own ON public.supervisor_document_views
  FOR ALL TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

-- ============================================================
-- 2. Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.get_user_role()::text = 'supervisor';
$$;

CREATE OR REPLACE FUNCTION public.is_staff_verifier()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_supervisor() OR public.is_admin();
$$;

-- ============================================================
-- 3. RLS — supervisor queue access
-- ============================================================
CREATE POLICY professionals_supervisor_queue_read ON public.professionals
  FOR SELECT TO authenticated
  USING (
    public.get_user_role()::text = 'supervisor'
    AND verified = 'submitted'
    AND (assigned_supervisor_id IS NULL OR assigned_supervisor_id = auth.uid())
  );

CREATE POLICY profiles_supervisor_verification_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.get_user_role()::text = 'supervisor'
    AND EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.user_id = profiles.id
        AND p.verified = 'submitted'
        AND (p.assigned_supervisor_id IS NULL OR p.assigned_supervisor_id = auth.uid())
    )
  );

CREATE POLICY documents_supervisor_read ON public.document_uploads
  FOR SELECT TO authenticated
  USING (
    public.get_user_role()::text = 'supervisor'
    AND EXISTS (
      SELECT 1 FROM public.professionals p
      WHERE p.user_id = document_uploads.owner_id
        AND p.verified = 'submitted'
        AND p.assigned_supervisor_id = auth.uid()
    )
  );

-- Storage: supervisor reads assigned verification documents
CREATE POLICY "Allow supervisors to view assigned documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.get_user_role()::text = 'supervisor'
    AND EXISTS (
      SELECT 1
      FROM public.document_uploads d
      JOIN public.professionals p ON p.user_id = d.owner_id
      WHERE d.storage_path = storage.objects.name
        AND p.verified = 'submitted'
        AND p.assigned_supervisor_id = auth.uid()
    )
  );

-- ============================================================
-- 4. RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.supervisor_claim_professional(p_pro_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_supervisor() THEN
    RAISE EXCEPTION 'Supervisor only';
  END IF;

  UPDATE public.professionals
  SET assigned_supervisor_id = auth.uid(),
      assigned_at = now()
  WHERE id = p_pro_id
    AND verified = 'submitted'
    AND assigned_supervisor_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professional not available for assignment';
  END IF;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (auth.uid(), 'professional', p_pro_id, 'supervisor_claim', 0, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.supervisor_log_document_view(p_doc_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF NOT public.is_supervisor() THEN
    RAISE EXCEPTION 'Supervisor only';
  END IF;

  SELECT d.owner_id INTO v_owner
  FROM public.document_uploads d
  JOIN public.professionals p ON p.user_id = d.owner_id
  WHERE d.id = p_doc_id
    AND p.verified = 'submitted'
    AND p.assigned_supervisor_id = auth.uid();

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Document not in your assigned queue';
  END IF;

  INSERT INTO public.supervisor_document_views (supervisor_id, document_id)
  VALUES (auth.uid(), p_doc_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (auth.uid(), 'document', p_doc_id, 'supervisor_document_view', 0, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.supervisor_verify_professional(
  p_pro_id uuid,
  p_checklist jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid;
  v_missing text;
BEGIN
  IF NOT public.is_supervisor() THEN
    RAISE EXCEPTION 'Supervisor only';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.professionals
  WHERE id = p_pro_id
    AND verified = 'submitted'
    AND assigned_supervisor_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Professional not assigned to you';
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
  VALUES (auth.uid(), 'professional', p_pro_id, 'supervisor_verify', 0, coalesce(p_checklist, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.supervisor_reject_document(
  p_doc_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_owner uuid;
  v_phone text;
  v_required int;
  v_viewed int;
BEGIN
  IF NOT public.is_supervisor() THEN
    RAISE EXCEPTION 'Supervisor only';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT d.owner_id INTO v_owner
  FROM public.document_uploads d
  JOIN public.professionals p ON p.user_id = d.owner_id
  WHERE d.id = p_doc_id
    AND p.verified = 'submitted'
    AND p.assigned_supervisor_id = auth.uid();

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Document not in your assigned queue';
  END IF;

  UPDATE public.document_uploads
  SET verified = false,
      rejection_note = p_reason,
      verified_by = auth.uid(),
      verified_at = now()
  WHERE id = p_doc_id;

  SELECT count(*)::int INTO v_required
  FROM (VALUES ('certificate'), ('criminal_record'), ('id_card')) AS req(t)
  WHERE EXISTS (
    SELECT 1 FROM public.document_uploads d
    WHERE d.owner_id = v_owner AND d.doc_type = req.t::public.document_type
  );

  SELECT count(DISTINCT d.doc_type)::int INTO v_viewed
  FROM public.supervisor_document_views v
  JOIN public.document_uploads d ON d.id = v.document_id
  WHERE v.supervisor_id = auth.uid()
    AND d.owner_id = v_owner
    AND d.doc_type IN ('certificate', 'criminal_record', 'id_card');

  IF v_viewed >= v_required AND v_required > 0 THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = v_owner;
  END IF;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (
    auth.uid(), 'document', p_doc_id, 'supervisor_reject_document', 0,
    jsonb_build_object('reason', p_reason, 'phone_revealed', v_phone IS NOT NULL)
  );

  RETURN jsonb_build_object('phone', v_phone);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_release_supervisor_assignment(p_pro_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.check_admin_mfa();

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.professionals
  SET assigned_supervisor_id = NULL,
      assigned_at = NULL
  WHERE id = p_pro_id;

  INSERT INTO public.audit_log (user_id, resource, resource_id, action, tier, metadata)
  VALUES (auth.uid(), 'professional', p_pro_id, 'admin_release_assignment', 0, '{}'::jsonb);
END;
$$;

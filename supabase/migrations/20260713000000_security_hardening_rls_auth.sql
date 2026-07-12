-- Together Platform — Security Hardening: RLS / Auth / Authorization
-- Migration: 20260713000000_security_hardening_rls_auth.sql
--
-- Closes the findings from the 2026-07-13 security review:
--   C1  — self-assignable privileged role at signup (root cause)
--   C1a — weak `get_user_role() = 'admin'` RLS/view checks (defense-in-depth → is_admin())
--   C2  — professionals could self-verify (no immutability on `verified`)
--   H1  — anonymize_user weak admin check (metadata role) + missing MFA
--   M1  — SECURITY DEFINER functions missing SET search_path
--   M2  — invitation read policy keyed off spoofable public.profiles.phone
--
-- NOTE on the `supervisor` role (C1b): once C1 clamps signup, `profiles.role`
-- can only become 'admin'/'supervisor' via the backend (service_role), so the
-- self-mint vector is closed at the root. The supervisor RPCs/policies keep
-- their existing `verified='submitted' AND assigned_supervisor_id = auth.uid()`
-- scoping (design D26: OTP-only supervisors, no app_metadata gate).

-- ============================================================
-- C1 — ROOT CAUSE: never trust client metadata for privileged roles
-- ============================================================
-- handle_new_user() copied `raw_user_meta_data->>'role'` verbatim, so anyone
-- could sign up as 'admin'/'supervisor'. Clamp to the two self-service roles;
-- admin/supervisor must be granted server-side (service_role) + app_metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_requested text := NEW.raw_user_meta_data->>'role';
  v_role      public.user_role;
BEGIN
  IF v_requested IN ('parent', 'professional') THEN
    v_role := v_requested::public.user_role;
  ELSE
    v_role := 'parent';
  END IF;

  INSERT INTO public.profiles (id, role, phone)
  VALUES (NEW.id, v_role, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ============================================================
-- C1a — DEFENSE IN DEPTH: route all admin RLS through is_admin()
-- (is_admin() requires role='admin' AND JWT app_metadata.is_admin — the latter
--  is not user-editable). Non-admin branches are preserved verbatim.
-- ============================================================

-- profiles (latest: profiles_read_all)
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- children
DROP POLICY IF EXISTS "children_admin_read" ON public.children;
CREATE POLICY "children_admin_read" ON public.children FOR SELECT
  USING (public.is_admin());

-- child_details (crown-jewel medical data)
DROP POLICY IF EXISTS "child_details_admin_read" ON public.child_details;
CREATE POLICY "child_details_admin_read" ON public.child_details FOR SELECT
  USING (public.is_admin());

-- match_requests
DROP POLICY IF EXISTS "match_requests_admin_read" ON public.match_requests;
CREATE POLICY "match_requests_admin_read" ON public.match_requests FOR SELECT
  USING (public.is_admin());

-- matches (FOR ALL)
DROP POLICY IF EXISTS "matches_admin_all" ON public.matches;
CREATE POLICY "matches_admin_all" ON public.matches FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- document_uploads (professional ID / criminal-record metadata) (FOR ALL)
DROP POLICY IF EXISTS "documents_admin_all" ON public.document_uploads;
CREATE POLICY "documents_admin_all" ON public.document_uploads FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- audit_log
DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_log;
CREATE POLICY "audit_admin_read" ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- professionals (FOR ALL — owner OR admin). C2 trigger below still guards `verified`.
DROP POLICY IF EXISTS "professionals_manage_all" ON public.professionals;
CREATE POLICY "professionals_manage_all" ON public.professionals FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- checkins / daily_logs (admin operational read)
DROP POLICY IF EXISTS "checkins_admin_read" ON public.checkins;
CREATE POLICY "checkins_admin_read" ON public.checkins FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "daily_logs_admin_read" ON public.daily_logs;
CREATE POLICY "daily_logs_admin_read" ON public.daily_logs FOR SELECT
  USING (public.is_admin());

-- system_config (FOR ALL write)
DROP POLICY IF EXISTS "system_config_update_admin" ON public.system_config;
CREATE POLICY "system_config_update_admin" ON public.system_config FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- admin_notes
DROP POLICY IF EXISTS "admin_notes_read" ON public.admin_notes;
CREATE POLICY "admin_notes_read" ON public.admin_notes FOR SELECT
  USING (public.is_admin());

-- analytics_events
DROP POLICY IF EXISTS "analytics_events_read_admin" ON public.analytics_events;
CREATE POLICY "analytics_events_read_admin" ON public.analytics_events FOR SELECT
  USING (public.is_admin());

-- children_tier0 view (admin branch only; professional/parent branches unchanged).
-- Column set is identical to the prior definition, so CREATE OR REPLACE works and
-- we avoid DROP ... CASCADE (which could silently drop dependents in prod).
CREATE OR REPLACE VIEW public.children_tier0 AS
  SELECT
    c.id,
    c.first_name,
    c.age,
    c.category,
    c.secondary_category,
    c.framework,
    c.hours_needed,
    c.created_at,
    p.area AS area_general
  FROM public.children c
  JOIN public.profiles p ON p.id = c.parent_id
  WHERE c.published = true
    AND (
      public.get_user_role() = 'professional'
      OR public.is_admin()
      OR c.parent_id = auth.uid()
    );
GRANT SELECT ON public.children_tier0 TO authenticated;

-- ============================================================
-- C2 — Professionals cannot self-verify
-- ============================================================
-- Freeze verification/assignment columns for end-user (authenticated/anon)
-- writes. The SECURITY DEFINER verify RPCs run with the effective user
-- 'postgres', so they are exempt.
--
-- IMPORTANT: this trigger MUST be SECURITY INVOKER. Inside a SECURITY DEFINER
-- function `current_user` resolves to the function OWNER ('postgres'), which
-- would make the `current_user IN ('authenticated','anon')` guard a no-op.
CREATE OR REPLACE FUNCTION public.protect_professional_verification_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      -- Force safe defaults on self-service onboarding insert.
      NEW.verified              := 'pending';
      NEW.verified_by           := NULL;
      NEW.verified_at           := NULL;
      NEW.assigned_supervisor_id := NULL;
      NEW.assigned_at           := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.verified              IS DISTINCT FROM OLD.verified
         OR NEW.verified_by        IS DISTINCT FROM OLD.verified_by
         OR NEW.verified_at        IS DISTINCT FROM OLD.verified_at
         OR NEW.assigned_supervisor_id IS DISTINCT FROM OLD.assigned_supervisor_id
         OR NEW.assigned_at        IS DISTINCT FROM OLD.assigned_at THEN
        RAISE EXCEPTION 'Changing verification fields directly via API is not allowed';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_professional_verification ON public.professionals;
CREATE TRIGGER trg_protect_professional_verification
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.protect_professional_verification_fields();

-- Same latent flaw in the already-shipped children ownership guard
-- (20260712220000_security_audit_fixes.sql): it was SECURITY DEFINER, so its
-- `current_user` guard never fired. Recreate as SECURITY INVOKER so it actually
-- protects parent_id / secondary_parent_id / secondary_parent_permissions.
CREATE OR REPLACE FUNCTION public.protect_children_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      RAISE EXCEPTION 'Changing parent_id directly via API is not allowed. Use transfer_primary_parent() RPC.';
    END IF;
    IF NEW.secondary_parent_id IS DISTINCT FROM OLD.secondary_parent_id THEN
      RAISE EXCEPTION 'Changing secondary_parent_id directly via API is not allowed. Use the invitation RPCs.';
    END IF;
    IF NEW.secondary_parent_permissions IS DISTINCT FROM OLD.secondary_parent_permissions THEN
      RAISE EXCEPTION 'Changing secondary_parent_permissions directly via API is not allowed. Use update_secondary_permissions() RPC.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

-- ============================================================
-- H1 — anonymize_user: hardened admin check + MFA + search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Authorization: the user themselves, OR a hardened admin with MFA.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    PERFORM public.check_admin_mfa();      -- raises unless admin + AAL2
    IF NOT public.is_admin() THEN          -- requires app_metadata.is_admin
      RAISE EXCEPTION 'Access denied. You can only delete your own account or must be an admin.';
    END IF;
  END IF;

  -- 1. Blank out Auth data to free email/phone and mark as deleted
  UPDATE auth.users
  SET email = id || '@deleted.local',
      phone = NULL,
      raw_user_meta_data = '{"deleted": true}'::jsonb,
      encrypted_password = NULL
  WHERE id = p_user_id;

  -- 2. Blank out Profile
  UPDATE public.profiles
  SET full_name = 'Deleted User',
      phone = NULL,
      avatar_url = NULL,
      deleted_at = now()
  WHERE id = p_user_id;

  -- 3. Blank out Professional data (if any)
  UPDATE public.professionals
  SET display_name = 'Deleted Professional',
      bio = NULL,
      languages = '{}',
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE user_id = p_user_id;

  -- 4. Remove sensitive documents physically AND delete records
  DELETE FROM storage.objects
  WHERE bucket_id = 'documents'
    AND name IN (SELECT storage_path FROM public.document_uploads WHERE owner_id = p_user_id);

  DELETE FROM public.document_uploads
  WHERE owner_id = p_user_id;

  -- 5. Blank out Children data (if parent)
  UPDATE public.children
  SET first_name = 'Deleted Child',
      needs = '{}'::jsonb,
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE parent_id = p_user_id;

  DELETE FROM public.child_details
  WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id);

  -- 6. Anonymize Daily Logs for related matches
  UPDATE public.daily_logs
  SET notes = NULL
  WHERE match_id IN (
    SELECT id FROM public.matches
    WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
  );

  -- 7. Anonymize Reviews
  UPDATE public.reviews
  SET text = NULL
  WHERE reviewer_id = p_user_id
     OR match_id IN (
       SELECT id FROM public.matches
       WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
          OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
     );

  -- 8. End any active matches
  UPDATE public.matches
  SET status = 'ended'
  WHERE status = 'active'
    AND (
       professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
    );
END;
$$;

-- ============================================================
-- M2 — invitation read policy uses the VERIFIED phone (auth.users), not the
--       user-editable public.profiles.phone
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_verified_phone()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT phone FROM auth.users WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "parent_invitations_invitee_read" ON public.parent_invitations;
CREATE POLICY "parent_invitations_invitee_read" ON public.parent_invitations
  FOR SELECT TO authenticated
  USING (invited_phone = public.current_verified_phone());

-- ============================================================
-- M1 — pin search_path on legacy SECURITY DEFINER functions
-- (ALTER-only: does not rewrite bodies; guarded so a signature drift or an
--  already-hardened function cannot fail the migration).
-- ============================================================
DO $$
DECLARE
  sigs text[] := ARRAY[
    'public.get_user_role()',
    'public.is_verified_professional()',
    'public.get_professional_id()',
    'public.has_active_match(uuid)',
    'public.get_tier_for_child(uuid)',
    'public.get_child_details(uuid)',
    'public.respond_to_request(uuid, text)',
    'public.approve_request(uuid)',
    'public.reject_request(uuid)',
    'public.withdraw_request(uuid)',
    'public.create_match_from_request(uuid)',
    'public.calculate_match_score(uuid, uuid)',
    'public.verify_checkin(uuid, double precision, double precision, integer)',
    'public.update_professional_rating()',
    'public.track_event(text, jsonb)',
    'public.get_matches_for_child(uuid, integer)',
    'public.invite_secondary_parent(uuid, text)',
    'public.accept_parent_invitation(uuid)',
    'public.update_secondary_permissions(uuid, jsonb)',
    'public.remove_secondary_parent(uuid)',
    'public.transfer_primary_parent(uuid)'
  ];
  s text;
BEGIN
  FOREACH s IN ARRAY sigs LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', s);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'search_path skip for %: %', s, SQLERRM;
    END;
  END LOOP;
END $$;

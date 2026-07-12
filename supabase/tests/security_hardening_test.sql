-- Together Platform — Security Hardening Tests (2026-07-13)
-- Test file: supabase/tests/security_hardening_test.sql
-- Runs via: npx supabase db query --linked --file supabase/tests/security_hardening_test.sql
--
-- Covers the gaps the C4 test missed:
--   C1 — signup cannot mint a privileged role (handle_new_user clamps metadata)
--   C2 — a professional cannot self-verify (protect_professional_verification_fields)
--   C1a defense — is_admin() stays false for a role='admin' profile with no app_metadata

BEGIN;

SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.test_security_hardening()
RETURNS SETOF TEXT AS $$
DECLARE
  admin_try_id  uuid := 'f1000000-0000-4000-8000-000000000a01';
  super_try_id  uuid := 'f1000000-0000-4000-8000-000000000a02';
  parent_id     uuid := 'f1000000-0000-4000-8000-000000000a03';
  pro_user_id   uuid := 'f1000000-0000-4000-8000-000000000a04';
  v_role        text;
  v_verified    text;
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT USAGE ON SCHEMA public TO authenticated;

  -- ============================================================
  -- C1: signup metadata role is clamped
  -- Inserting into auth.users fires on_auth_user_created -> handle_new_user.
  -- ============================================================
  INSERT INTO auth.users (id, phone, raw_user_meta_data, aud, role) VALUES
    (admin_try_id, '0500000A01', '{"role": "admin"}',        'authenticated', 'authenticated'),
    (super_try_id, '0500000A02', '{"role": "supervisor"}',   'authenticated', 'authenticated'),
    (pro_user_id,  '0500000A04', '{"role": "professional"}', 'authenticated', 'authenticated'),
    (parent_id,    '0500000A03', '{"role": "parent"}',       'authenticated', 'authenticated');

  SELECT role::text INTO v_role FROM profiles WHERE id = admin_try_id;
  RETURN NEXT is(v_role, 'parent', 'C1: signup with role=admin is clamped to parent');

  SELECT role::text INTO v_role FROM profiles WHERE id = super_try_id;
  RETURN NEXT is(v_role, 'parent', 'C1: signup with role=supervisor is clamped to parent');

  SELECT role::text INTO v_role FROM profiles WHERE id = pro_user_id;
  RETURN NEXT is(v_role, 'professional', 'C1: signup with role=professional is preserved');

  -- ============================================================
  -- C1a: is_admin() is false for a role='admin' profile lacking app_metadata
  -- ============================================================
  -- Promote via superuser (legitimate backend path), but issue a JWT with NO app_metadata.
  UPDATE profiles SET role = 'admin' WHERE id = admin_try_id;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', admin_try_id, 'role', 'authenticated')::text, true);
  RETURN NEXT is(public.is_admin(), false,
    'C1a: is_admin() is false without app_metadata.is_admin, even if profiles.role=admin');
  PERFORM set_config('request.jwt.claims', NULL, true);

  -- ============================================================
  -- C2: a professional cannot self-verify
  -- ============================================================
  -- Professional onboards their own row (as end user, via authenticated role).
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', pro_user_id, 'role', 'authenticated')::text, true);

  -- Attacker explicitly tries to be born verified; trigger must force 'pending'.
  INSERT INTO professionals (user_id, display_name, verified)
  VALUES (pro_user_id, 'Self Verify Attempt', 'verified');

  -- Trigger forces verified back to 'pending' on insert regardless of attempted value.
  SELECT verified::text INTO v_verified FROM professionals WHERE user_id = pro_user_id;
  RETURN NEXT is(v_verified, 'pending', 'C2: onboarding insert cannot start verified');

  RETURN NEXT throws_ok(
    format('UPDATE professionals SET verified = ''verified'' WHERE user_id = %L', pro_user_id),
    'Changing verification fields directly via API is not allowed',
    'C2: professional cannot self-verify via UPDATE'
  );

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', NULL, true);

  SELECT verified::text INTO v_verified FROM professionals WHERE user_id = pro_user_id;
  RETURN NEXT is(v_verified, 'pending', 'C2: verified remains pending after blocked self-verify');

  -- ============================================================
  -- (b) is_supervisor() requires app_metadata.is_supervisor
  -- ============================================================
  UPDATE profiles SET role = 'supervisor' WHERE id = super_try_id;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', super_try_id, 'role', 'authenticated')::text, true);
  RETURN NEXT is(public.is_supervisor(), false,
    '(b): is_supervisor() is false without app_metadata.is_supervisor');

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', super_try_id, 'role', 'authenticated',
      'app_metadata', json_build_object('is_supervisor', true))::text, true);
  RETURN NEXT is(public.is_supervisor(), true,
    '(b): is_supervisor() is true with role=supervisor and app_metadata.is_supervisor');
  PERFORM set_config('request.jwt.claims', NULL, true);

  -- ============================================================
  -- (a) reviews blind-rating: leftover permissive policy is gone
  -- ============================================================
  RETURN NEXT is(
    (SELECT count(*)::int FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'reviews_select'),
    0,
    '(a): permissive reviews_select policy has been removed');
  RETURN NEXT isnt(
    (SELECT count(*)::int FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'reviews'
         AND policyname IN ('reviews_read', 'reviews_parent_browse')),
    0,
    '(a): blind-rating reviews_read / reviews_parent_browse policies remain');
END;
$$ LANGUAGE plpgsql;

SELECT * FROM runtests('public'::name, '^test_security_hardening');

ROLLBACK;

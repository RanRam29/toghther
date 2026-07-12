-- Together Platform — RLS & Privacy Tests
-- Test file: supabase/tests/rls_privacy_test.sql
-- Runs via: npx supabase db query --linked --file supabase/tests/rls_privacy_test.sql

BEGIN;

-- Add extensions to search path so pgTAP functions are resolved
SET search_path TO public, extensions;

-- Create temporary test function
CREATE OR REPLACE FUNCTION public.test_together_rls_privacy()
RETURNS SETOF TEXT AS $$
DECLARE
  parent_1_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  parent_2_id uuid := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  professional_id uuid := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  child_id uuid := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  request_id uuid := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
  v_match_id uuid;
BEGIN
  -- ============================================================
  -- TEST 1 - 4: VERIFY RLS IS ENABLED
  -- ============================================================
  RETURN NEXT ok(rowsecurity, 'RLS is enabled on profiles') FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles';
  RETURN NEXT ok(rowsecurity, 'RLS is enabled on children') FROM pg_tables WHERE schemaname = 'public' AND tablename = 'children';
  RETURN NEXT ok(rowsecurity, 'RLS is enabled on child_details') FROM pg_tables WHERE schemaname = 'public' AND tablename = 'child_details';
  RETURN NEXT ok(rowsecurity, 'RLS is enabled on professionals') FROM pg_tables WHERE schemaname = 'public' AND tablename = 'professionals';

  -- ============================================================
  -- SETUP MOCK DATA
  -- ============================================================

  -- Local Postgres does not auto-grant table privileges to `anon`/`authenticated`
  -- the way Supabase Cloud does (Cloud provisions them at project init). Grant
  -- them here so this test file is portable across environments. RLS still
  -- enforces per-row access on top of the grants — that is exactly what we test.
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT USAGE ON SCHEMA public TO authenticated;

  -- Setup mock auth users
  INSERT INTO auth.users (id, phone, aud, role) VALUES 
    (parent_1_id, '0501234567', 'authenticated', 'authenticated'),
    (parent_2_id, '0507654321', 'authenticated', 'authenticated'),
    (professional_id, '0521234567', 'authenticated', 'authenticated');

  -- Setup profiles (triggered automatically by trigger handle_new_user, 
  -- but we update their specific roles/names for testing)
  UPDATE profiles SET role = 'parent', full_name = 'הורה בדיקה 1' WHERE id = parent_1_id;
  UPDATE profiles SET role = 'parent', full_name = 'הורה בדיקה 2' WHERE id = parent_2_id;
  UPDATE profiles SET role = 'professional', full_name = 'משלבת בדיקה' WHERE id = professional_id;

  -- Setup professional details (id matches user_id for simplicity in test)
  INSERT INTO professionals (id, user_id, display_name, type, verified) 
  VALUES (professional_id, professional_id, 'משלבת בדיקה', 'mashlavit', 'verified');

  -- ============================================================
  -- TEST 5: ANON USER PRIVACY
  -- ============================================================
  -- Anon has no GRANT on children (blocked before RLS even runs) — strictly stronger
  -- than "returns empty". Assert on the permission-denied error class.
  EXECUTE 'SET LOCAL role TO anon';
  RETURN NEXT throws_ok(
    'SELECT * FROM public.children',
    '42501',
    NULL,
    'Anon cannot read public children (permission denied — RLS backed by table GRANT)'
  );

  -- ============================================================
  -- TEST 6 & 7: PARENT ACCESS
  -- ============================================================
  EXECUTE 'SET LOCAL role TO authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', parent_1_id, 'role', 'authenticated')::text, true);

  -- Parent 1 creates a child profile
  INSERT INTO children (id, parent_id, first_name, age, category, functioning_level, framework, published)
  VALUES (child_id, parent_1_id, 'נועם בדיקה', 8, 'autism', 2, 'regular_school', true);

  INSERT INTO child_details (child_id, full_name, diagnosis_full, what_works, what_triggers)
  VALUES (child_id, 'נועם כהן בדיקה', 'אוטיזם קלאסי', 'עבודה עם כרטיסיות ויזואליות', 'רעשים חזקים');

  RETURN NEXT lives_ok(
    'SELECT * FROM public.children WHERE id = ' || quote_literal(child_id),
    'Parent 1 can select their own child'
  );

  RETURN NEXT lives_ok(
    'SELECT * FROM public.child_details WHERE child_id = ' || quote_literal(child_id),
    'Parent 1 can select their own child details'
  );

  -- ============================================================
  -- TEST 8 & 9: BOLA / IDOR PREVENTION (PARENT 2 CANNOT ACCESS)
  -- ============================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', parent_2_id, 'role', 'authenticated')::text, true);

  RETURN NEXT is_empty(
    'SELECT * FROM public.children WHERE id = ' || quote_literal(child_id),
    'Parent 2 cannot select Parent 1 child'
  );

  RETURN NEXT is_empty(
    'SELECT * FROM public.child_details WHERE child_id = ' || quote_literal(child_id),
    'Parent 2 cannot select Parent 1 child details'
  );

  -- ============================================================
  -- TEST 10 - 13: TIER 0 PRO LIMITATIONS (C2 & C3)
  -- ============================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', professional_id, 'role', 'authenticated')::text, true);

  -- C2: Direct select on children table is empty for professional
  RETURN NEXT is_empty(
    'SELECT * FROM public.children WHERE id = ' || quote_literal(child_id),
    'Verified professional CANNOT select directly from raw children table (TIER 0 blocked)'
  );

  -- C2: View select works for professional
  RETURN NEXT lives_ok(
    'SELECT * FROM public.children_tier0 WHERE id = ' || quote_literal(child_id),
    'Verified professional can select from children_tier0 view'
  );

  -- C2: View does not leak location/needs
  RETURN NEXT ok(
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children_tier0' AND column_name = 'location'),
    'View children_tier0 does not contain location column'
  );
  RETURN NEXT ok(
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children_tier0' AND column_name = 'needs'),
    'View children_tier0 does not contain needs column'
  );

  -- C3: Direct select on child_details table is empty for professional
  RETURN NEXT is_empty(
    'SELECT * FROM public.child_details WHERE child_id = ' || quote_literal(child_id),
    'Verified professional CANNOT select child_details table directly'
  );

  -- ============================================================
  -- TEST 14 - 17: REQUEST STATE MACHINE & BYPASS PROTECTION (C1)
  -- ============================================================
  -- Switch to parent 1 to create request
  PERFORM set_config('request.jwt.claims', json_build_object('sub', parent_1_id, 'role', 'authenticated')::text, true);
  INSERT INTO match_requests (id, child_id, professional_id, status, initiated_by)
  VALUES (request_id, child_id, professional_id, 'pending', 'parent');

  -- Switch to professional context
  PERFORM set_config('request.jwt.claims', json_build_object('sub', professional_id, 'role', 'authenticated')::text, true);

  -- C1: Professional tries to update status to approved directly (should fail/update 0 rows)
  UPDATE match_requests SET status = 'approved' WHERE id = request_id;
  RETURN NEXT ok(
    EXISTS (SELECT 1 FROM match_requests WHERE id = request_id AND status = 'pending'),
    'Direct UPDATE to status approved by professional is blocked (remains pending)'
  );

  -- C1: Professional responds with invalid status approved using RPC (should throw exception)
  RETURN NEXT throws_ok(
    format('SELECT respond_to_request(%L, ''approved'')', request_id),
    'P0001',
    NULL,
    'RPC respond_to_request blocks invalid approved status'
  );

  -- C1: Professional responds with valid status interested using RPC
  RETURN NEXT lives_ok(
    format('SELECT respond_to_request(%L, ''interested'')', request_id),
    'Professional can express interest via respond_to_request RPC'
  );

  -- ============================================================
  -- TEST 18 - 21: PARENT APPROVAL, SECURE ACCESS & AUDIT LOG (C3)
  -- ============================================================
  -- Switch back to parent_1 to approve request
  PERFORM set_config('request.jwt.claims', json_build_object('sub', parent_1_id, 'role', 'authenticated')::text, true);

  -- Parent approves request (TIER 2 only — no match yet)
  PERFORM approve_request(request_id);
  RETURN NEXT ok(
    EXISTS (SELECT 1 FROM match_requests WHERE id = request_id AND status = 'approved' AND tier_reached = 2),
    'Parent can approve request to TIER 2 without creating a match'
  );

  -- Parent activates match explicitly (TIER 3)
  SELECT create_match_from_request(request_id) INTO v_match_id;
  RETURN NEXT ok(v_match_id IS NOT NULL, 'Parent can activate match from approved request');

  -- Switch to professional context (now Tier 3 active match)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', professional_id, 'role', 'authenticated')::text, true);

  -- C3: Professional queries child_details via secure RPC
  RETURN NEXT lives_ok(
    format('SELECT * FROM get_child_details(%L)', child_id),
    'Professional can query get_child_details RPC at Tier 3'
  );

  -- C3: Access registers in audit_log
  RETURN NEXT ok(
    EXISTS (SELECT 1 FROM audit_log WHERE user_id = professional_id AND resource = 'child_details' AND action = 'view'),
    'Audit log successfully registers professional access to child_details'
  );

  -- C3: Direct select on child_details table is still blocked even at Tier 3
  RETURN NEXT is_empty(
    'SELECT * FROM public.child_details',
    'Professional CANNOT select child_details table directly even at Tier 3'
  );

END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

-- Run all tests starting with test_
SELECT * FROM runtests('public'::name, '^test_');

-- Cleanup/Rollback at end
ROLLBACK;

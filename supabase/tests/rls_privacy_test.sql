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
  -- Set current user role to anon
  EXECUTE 'SET LOCAL role TO anon';
  RETURN NEXT is_empty(
    'SELECT * FROM public.children',
    'Anon cannot read public children (returns empty)'
  );

  -- ============================================================
  -- TEST 6 & 7: PARENT ACCESS
  -- ============================================================
  -- Switch to parent_1 authentication context
  EXECUTE 'SET LOCAL role TO authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', parent_1_id, 'role', 'authenticated')::text, true);

  -- Parent 1 creates a child profile (TIER 0-1) and child details (TIER 2-3)
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
    'Parent 1 can select their own child details (TIER 3)'
  );

  -- ============================================================
  -- TEST 8 & 9: BOLA / IDOR PREVENTION (PARENT 2 CANNOT ACCESS)
  -- ============================================================
  -- Switch to parent_2 context
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
  -- TEST 10 & 11: VERIFIED PROFESSIONAL ACCESS (TIER 0)
  -- ============================================================
  -- Switch to professional context
  PERFORM set_config('request.jwt.claims', json_build_object('sub', professional_id, 'role', 'authenticated')::text, true);

  RETURN NEXT lives_ok(
    'SELECT * FROM public.children WHERE id = ' || quote_literal(child_id),
    'Verified professional can select published child (TIER 0)'
  );

  RETURN NEXT is_empty(
    'SELECT * FROM public.child_details WHERE child_id = ' || quote_literal(child_id),
    'Verified professional CANNOT select child details without relationship (TIER 2/3 blocked)'
  );

  -- ============================================================
  -- TEST 12 & 13: TIER TRANSITION TO TIER 2 (APPROVED REQUEST)
  -- ============================================================
  -- Switch back to parent_1 to create and approve request
  PERFORM set_config('request.jwt.claims', json_build_object('sub', parent_1_id, 'role', 'authenticated')::text, true);

  INSERT INTO match_requests (id, child_id, professional_id, status, initiated_by)
  VALUES (request_id, child_id, professional_id, 'pending', 'parent');

  -- Approve the request
  UPDATE match_requests SET status = 'approved' WHERE id = request_id;

  -- Switch back to professional context
  PERFORM set_config('request.jwt.claims', json_build_object('sub', professional_id, 'role', 'authenticated')::text, true);

  RETURN NEXT lives_ok(
    'SELECT * FROM public.child_details WHERE child_id = ' || quote_literal(child_id),
    'Professional with approved request can access child details (TIER 2 unlocked)'
  );

END;
$$ LANGUAGE plpgsql;

-- Run all tests starting with test_
SELECT * FROM runtests('public'::name, '^test_');

-- Cleanup/Rollback at end
ROLLBACK;

-- Together Platform — WP1 Match-Loop Tests (H4 / D10)
-- Test file: supabase/tests/wp1_match_loop_test.sql
-- Runs via: npx supabase db query --linked --file supabase/tests/wp1_match_loop_test.sql
--   (or `supabase test db --linked` if wired into the pgTAP suite)
--
-- Proves the approval / activation split from 20260708130000_wp1_split_approve_from_match.sql:
--   • approve_request  → 'approved' + TIER 2 ONLY, never a match (H4 fixed).
--   • create_match_from_request → explicit parent-only TIER-3 activation, no double-activate.
--   • decline_after_intro → closes an approved (pre-match) request with a reason, no match.
--   • professionals cannot approve or activate; approval only from a live status.

BEGIN;

SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.test_wp1_match_loop()
RETURNS SETOF TEXT AS $$
DECLARE
  parent_id       uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c501';
  pro_user_id     uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c502';
  professional_id uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c503';
  child_a         uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c511';
  child_b         uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c512';
  child_c         uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c513';
  req_a           uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c521';
  req_b           uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c522';
  req_c           uuid := 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd38c523';
BEGIN
  -- ============================================================
  -- SETUP (superuser context — no JWT)
  -- ============================================================
  INSERT INTO auth.users (id, phone, aud, role) VALUES
    (parent_id,   '0500000501', 'authenticated', 'authenticated'),
    (pro_user_id, '0500000502', 'authenticated', 'authenticated');

  UPDATE profiles SET role = 'parent',       full_name = 'הורה WP1',  phone = '0500000501' WHERE id = parent_id;
  UPDATE profiles SET role = 'professional', full_name = 'משלבת WP1', phone = '0500000502' WHERE id = pro_user_id;

  INSERT INTO professionals (id, user_id, display_name, verified)
  VALUES (professional_id, pro_user_id, 'משלבת WP1', 'verified');

  INSERT INTO children (id, parent_id, first_name, age, category, functioning_level, framework, communication_verbal) VALUES
    (child_a, parent_id, 'ילד א', 6, 'autism',              2, 'regular_school', true),
    (child_b, parent_id, 'ילד ב', 7, 'adhd',                1, 'regular_school', true),
    (child_c, parent_id, 'ילד ג', 8, 'learning_disability', 2, 'special_ed',     true);

  -- One live (professional-interested) request per child.
  INSERT INTO match_requests (id, child_id, professional_id, status, initiated_by, tier_reached) VALUES
    (req_a, child_a, professional_id, 'interested', 'professional', 1),
    (req_b, child_b, professional_id, 'interested', 'professional', 1),
    (req_c, child_c, professional_id, 'interested', 'professional', 1);

  -- ============================================================
  -- TEST 1: parent approves → 'approved' + TIER 2, and NO match (H4)
  -- ============================================================
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', parent_id, 'role', 'authenticated')::text, true);

  RETURN NEXT lives_ok(
    format('SELECT approve_request(%L)', req_a),
    'Parent can approve an interested request');
  RETURN NEXT is(
    (SELECT status::text FROM match_requests WHERE id = req_a),
    'approved', 'approve_request → status approved');
  RETURN NEXT is(
    (SELECT tier_reached FROM match_requests WHERE id = req_a),
    2, 'approve_request → TIER 2 only (D10)');
  RETURN NEXT is(
    (SELECT count(*)::int FROM matches WHERE request_id = req_a),
    0, 'approve_request creates NO match (H4 fixed)');

  -- ============================================================
  -- TEST 2: parent explicitly activates the match → TIER 3
  -- ============================================================
  RETURN NEXT lives_ok(
    format('SELECT create_match_from_request(%L)', req_a),
    'Parent can activate a match from an approved request');
  RETURN NEXT is(
    (SELECT count(*)::int FROM matches WHERE request_id = req_a),
    1, 'create_match_from_request → exactly one active match');
  RETURN NEXT is(
    (SELECT tier_reached FROM match_requests WHERE id = req_a),
    3, 'create_match_from_request → TIER 3');

  -- ============================================================
  -- TEST 3: double activation is blocked
  -- ============================================================
  RETURN NEXT throws_ok(
    format('SELECT create_match_from_request(%L)', req_a),
    'Match already exists for this request',
    'Double activation of the same request is blocked');

  -- ============================================================
  -- TEST 4: a professional cannot approve or activate (not the parent)
  -- ============================================================
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', pro_user_id, 'role', 'authenticated')::text, true);

  RETURN NEXT throws_ok(
    format('SELECT approve_request(%L)', req_b),
    'Request not found or access denied',
    'Professional cannot approve a request');
  RETURN NEXT throws_ok(
    format('SELECT create_match_from_request(%L)', req_b),
    'Request not found, not approved, or access denied',
    'Professional cannot activate a match');

  -- ============================================================
  -- TEST 5: approval only from a live status (no re-approve)
  -- ============================================================
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', parent_id, 'role', 'authenticated')::text, true);

  RETURN NEXT lives_ok(
    format('SELECT approve_request(%L)', req_b),
    'Parent approves req_b');
  RETURN NEXT throws_ok(
    format('SELECT approve_request(%L)', req_b),
    'Request cannot be approved from status: approved',
    'Cannot re-approve an already-approved request');

  -- ============================================================
  -- TEST 6: decline_after_intro closes an approved request with a reason, no match
  -- ============================================================
  RETURN NEXT lives_ok(
    format('SELECT approve_request(%L)', req_c),
    'Parent approves req_c');
  RETURN NEXT lives_ok(
    format('SELECT decline_after_intro(%L, %L)', req_c, 'לא הסתדרו הזמנים'),
    'Parent can decline after the intro');
  RETURN NEXT is(
    (SELECT status::text FROM match_requests WHERE id = req_c),
    'rejected', 'decline_after_intro → status rejected');
  RETURN NEXT is(
    (SELECT decline_reason FROM match_requests WHERE id = req_c),
    'לא הסתדרו הזמנים', 'decline_after_intro stores the reason');
  RETURN NEXT is(
    (SELECT count(*)::int FROM matches WHERE request_id = req_c),
    0, 'decline_after_intro creates NO match');

  -- ============================================================
  -- TEST 7: cannot decline once a match already exists
  -- ============================================================
  RETURN NEXT throws_ok(
    format('SELECT decline_after_intro(%L, NULL)', req_a),
    'Request not found, not in approved (pre-match) state, or access denied',
    'Cannot decline a request that already has an active match');

  -- ============================================================
  -- TEST 8: get_intro_contact exposes the pro's phone only for the parent's approved request
  -- ============================================================
  -- req_a is 'approved' (with an active match) → parent may read the professional's contact.
  RETURN NEXT is(
    (SELECT phone FROM get_intro_contact(req_a)),
    '0500000502', 'Parent reads the professional contact for an approved request');
  -- req_c is 'rejected' (declined) → contact is not exposed.
  RETURN NEXT throws_ok(
    format('SELECT get_intro_contact(%L)', req_c),
    'Contact not available: request not found, not in intro stage, or access denied',
    'Professional contact is not exposed for a non-approved request');

  PERFORM set_config('request.jwt.claims', NULL, true);
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

SELECT * FROM runtests('public'::name, '^test_wp1');

ROLLBACK;

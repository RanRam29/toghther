-- Together Platform — WP3 Admin-1 Verification Tests
-- Test file: supabase/tests/wp3_admin_verification_test.sql
-- Runs via: npx supabase db query --linked --file supabase/tests/wp3_admin_verification_test.sql
--
-- Proves the admin verification RPCs from 20260708150000_wp3_admin_verification.sql:
--   • non-admins are blocked from every admin_* RPC,
--   • verification fails while any required document is missing (D15 all-or-nothing),
--   • a full verification flips the professional to 'verified', stores the checklist, and
--     marks the docs verified,
--   • document rejection requires a reason, and reasoned views are audited.

BEGIN;

SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.test_wp3_admin_verification()
RETURNS SETOF TEXT AS $$
DECLARE
  admin_id        uuid := 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d001';
  parent_id       uuid := 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d002';
  pro_user_id     uuid := 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d003';
  professional_id uuid := 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d004';
  doc_cert        uuid := 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d011';
  doc_crim        uuid := 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d012';
  doc_idc         uuid := 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d013';
  admin_claims    text := json_build_object('sub', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d001',
                            'role', 'authenticated',
                            'aal', 'aal2',
                            'app_metadata', json_build_object('is_admin', true))::text;
  parent_claims   text := json_build_object('sub', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd38d002',
                            'role', 'authenticated')::text;
BEGIN
  -- ============================================================
  -- SETUP (superuser context)
  -- ============================================================
  INSERT INTO auth.users (id, phone, aud, role) VALUES
    (admin_id,    '0500000601', 'authenticated', 'authenticated'),
    (parent_id,   '0500000602', 'authenticated', 'authenticated'),
    (pro_user_id, '0500000603', 'authenticated', 'authenticated');

  UPDATE profiles SET role = 'admin',        full_name = 'מנהל WP3',  phone = '0500000601' WHERE id = admin_id;
  UPDATE profiles SET role = 'parent',       full_name = 'הורה WP3'  WHERE id = parent_id;
  UPDATE profiles SET role = 'professional', full_name = 'משלבת WP3' WHERE id = pro_user_id;

  INSERT INTO professionals (id, user_id, display_name, verified)
  VALUES (professional_id, pro_user_id, 'משלבת WP3', 'pending');

  -- ============================================================
  -- TEST 1: a non-admin cannot verify a professional
  -- ============================================================
  PERFORM set_config('request.jwt.claims', parent_claims, true);
  RETURN NEXT throws_ok(
    format('SELECT admin_verify_professional(%L, %L)', professional_id, '{}'::jsonb),
    'Admin only', 'Non-admin cannot call admin_verify_professional');

  -- ============================================================
  -- TEST 2: verification fails while required documents are missing (D15)
  -- ============================================================
  PERFORM set_config('request.jwt.claims', admin_claims, true);
  RETURN NEXT throws_ok(
    format('SELECT admin_verify_professional(%L, %L)', professional_id, '{}'::jsonb),
    'Cannot verify: missing required document(s): certificate, criminal_record, id_card',
    'Verify blocked while all required documents are missing (D15)');

  -- ============================================================
  -- TEST 3: with all documents present, verification succeeds
  -- ============================================================
  INSERT INTO document_uploads (id, owner_id, doc_type, storage_path, verified) VALUES
    (doc_cert, pro_user_id, 'certificate',     'documents/'||pro_user_id||'/certificate.pdf',     false),
    (doc_crim, pro_user_id, 'criminal_record', 'documents/'||pro_user_id||'/criminal_record.pdf', false),
    (doc_idc,  pro_user_id, 'id_card',          'documents/'||pro_user_id||'/id_card.pdf',          false);

  RETURN NEXT lives_ok(
    format('SELECT admin_verify_professional(%L, %L)', professional_id,
           '{"identity":true,"certificate":true,"criminal_record":true}'::jsonb),
    'Admin verifies a professional once all documents are present');
  RETURN NEXT is(
    (SELECT verified::text FROM professionals WHERE id = professional_id),
    'verified', 'Professional is now verified');
  RETURN NEXT ok(
    (SELECT verification_checklist IS NOT NULL FROM professionals WHERE id = professional_id),
    'Verification checklist is stored (legal evidence)');
  RETURN NEXT is(
    (SELECT count(*)::int FROM document_uploads WHERE owner_id = pro_user_id AND verified = true),
    3, 'All reviewed documents are marked verified');
  RETURN NEXT ok(
    EXISTS (SELECT 1 FROM audit_log WHERE resource='professional' AND resource_id=professional_id
            AND action='admin_verify' AND user_id=admin_id),
    'admin_verify is audited');

  -- ============================================================
  -- TEST 4: rejecting a document requires a reason
  -- ============================================================
  RETURN NEXT throws_ok(
    format('SELECT admin_reject_document(%L, %L)', doc_cert, ''),
    'A rejection reason is required', 'Document rejection requires a reason');
  RETURN NEXT lives_ok(
    format('SELECT admin_reject_document(%L, %L)', doc_cert, 'המסמך מטושטש'),
    'Admin rejects a document with a reason');
  RETURN NEXT is(
    (SELECT rejection_note FROM document_uploads WHERE id = doc_cert),
    'המסמך מטושטש', 'Rejection reason is stored on the document');
  RETURN NEXT is(
    (SELECT verified FROM document_uploads WHERE id = doc_cert),
    false, 'Rejected document is marked not-verified');

  -- ============================================================
  -- TEST 5: reasoned view requires a reason and is audited
  -- ============================================================
  RETURN NEXT throws_ok(
    format('SELECT admin_log_reasoned_view(%L, %L, %L)', 'child_details', professional_id, ''),
    'A reason is required for a reasoned view', 'Reasoned view requires a reason');
  RETURN NEXT lives_ok(
    format('SELECT admin_log_reasoned_view(%L, %L, %L)', 'child_details', professional_id, 'בירור תלונה'),
    'Admin logs a reasoned view');
  RETURN NEXT ok(
    EXISTS (SELECT 1 FROM audit_log WHERE action='admin_reasoned_view' AND user_id=admin_id),
    'Reasoned view is written to the audit log');

  -- ============================================================
  -- TEST 6: non-admin is blocked from the other admin RPCs too
  -- ============================================================
  PERFORM set_config('request.jwt.claims', parent_claims, true);
  RETURN NEXT throws_ok(
    format('SELECT admin_reject_document(%L, %L)', doc_crim, 'x'),
    'Admin only', 'Non-admin cannot reject a document');
  RETURN NEXT throws_ok(
    format('SELECT admin_log_reasoned_view(%L, %L, %L)', 'child_details', professional_id, 'y'),
    'Admin only', 'Non-admin cannot log a reasoned view');

  PERFORM set_config('request.jwt.claims', NULL, true);
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

SELECT * FROM runtests('public'::name, '^test_wp3');

ROLLBACK;

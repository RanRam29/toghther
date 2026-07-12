BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(8);

SELECT has_function(
  'public',
  'supervisor_claim_professional',
  ARRAY['uuid'],
  'supervisor_claim_professional exists'
);

SELECT has_function(
  'public',
  'supervisor_log_document_view',
  ARRAY['uuid'],
  'supervisor_log_document_view exists'
);

SELECT has_function(
  'public',
  'supervisor_verify_professional',
  ARRAY['uuid', 'jsonb'],
  'supervisor_verify_professional exists'
);

SELECT has_function(
  'public',
  'supervisor_reject_document',
  ARRAY['uuid', 'text'],
  'supervisor_reject_document exists'
);

SELECT has_function(
  'public',
  'admin_release_supervisor_assignment',
  ARRAY['uuid'],
  'admin_release_supervisor_assignment exists'
);

SELECT has_function(
  'public',
  'pause_match',
  ARRAY['uuid'],
  'pause_match exists'
);

SELECT has_function(
  'public',
  'resume_match',
  ARRAY['uuid'],
  'resume_match exists'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'supervisor'
  ),
  'user_role includes supervisor'
);

SELECT * FROM finish();
ROLLBACK;

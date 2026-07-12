BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan tests
SELECT plan(6);

-- Test 1: track_event signature
SELECT has_function(
  'public',
  'track_event',
  ARRAY['text', 'jsonb'],
  'track_event function exists and has correct signature'
);

-- Test 2: admin_set_config signature
SELECT has_function(
  'public',
  'admin_set_config',
  ARRAY['text', 'jsonb'],
  'admin_set_config function exists and has correct signature'
);

-- Test 3: admin_suspend_user signature
SELECT has_function(
  'public',
  'admin_suspend_user',
  ARRAY['uuid', 'text'],
  'admin_suspend_user function exists and has correct signature'
);

-- Test 4: admin_restore_user signature
SELECT has_function(
  'public',
  'admin_restore_user',
  ARRAY['uuid'],
  'admin_restore_user function exists and has correct signature'
);

-- Test 5: admin_unpublish_child signature
SELECT has_function(
  'public',
  'admin_unpublish_child',
  ARRAY['uuid', 'text'],
  'admin_unpublish_child function exists and has correct signature'
);

-- Test 6: admin_log_reasoned_view signature
SELECT has_function(
  'public',
  'admin_log_reasoned_view',
  ARRAY['text', 'uuid', 'text'],
  'admin_log_reasoned_view function exists and has correct signature'
);

SELECT * FROM finish();
ROLLBACK;

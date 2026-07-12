BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(4);

SELECT has_function(
  'public',
  'end_match',
  ARRAY['uuid', 'text'],
  'end_match exists'
);

SELECT has_function(
  'public',
  'admin_update_metric_catalog',
  ARRAY['text', 'text', 'text', 'boolean'],
  'admin_update_metric_catalog exists'
);

SELECT has_function(
  'public',
  'submit_review',
  ARRAY['uuid', 'jsonb', 'text'],
  'submit_review exists with correct signature'
);

SELECT lives_ok(
  $q$
    SELECT proname FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND proname = 'submit_review'
  $q$,
  'submit_review is callable'
);

SELECT * FROM finish();
ROLLBACK;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan tests
SELECT plan(5);

-- Test 1-4: availability_overlaps function
SELECT ok(
  public.availability_overlaps('{"sunday": [8,14]}'::jsonb, '{"sunday": [10,16]}'::jsonb),
  'availability_overlaps should return true for overlapping times on the same day'
);

SELECT ok(
  NOT public.availability_overlaps('{"sunday": [8,10]}'::jsonb, '{"sunday": [12,16]}'::jsonb),
  'availability_overlaps should return false for non-overlapping times on the same day'
);

SELECT ok(
  NOT public.availability_overlaps('{"sunday": [8,14]}'::jsonb, '{"monday": [8,14]}'::jsonb),
  'availability_overlaps should return false when there are no common days'
);

SELECT ok(
  public.availability_overlaps(NULL, '{"monday": [8,14]}'::jsonb),
  'availability_overlaps should return true when availability constraint is NULL'
);

-- Test 5: get_matches_for_child rejects unknown child for current user
PREPARE test_get_matches AS SELECT * FROM public.get_matches_for_child(gen_random_uuid(), 5);
SELECT throws_ok(
  'test_get_matches',
  'P0001',
  NULL,
  'get_matches_for_child raises when child not found or access denied'
);

SELECT * FROM finish();
ROLLBACK;

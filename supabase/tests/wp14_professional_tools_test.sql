BEGIN;

SELECT plan(9);

-- 1. Setup Test Data
-- Create a parent, child, professional, and match
SELECT auth.uid() INTO my_uid FROM auth.users LIMIT 1; -- Assume running as professional

-- 2. Test get_my_monthly_attendance
-- Since the exact data depends on state, we test the shape
SELECT lives_ok(
  $$SELECT get_my_monthly_attendance(current_date)$$,
  'get_my_monthly_attendance executes without error'
);

-- 3. Test mark_days_off_range validation constraints
-- Should fail if > 14 days
SELECT throws_ok(
  $$SELECT mark_days_off_range(gen_random_uuid(), current_date + 15, current_date + 16, 'Vacation')$$,
  'Dates must be within 14 days of today',
  'mark_days_off_range enforces +/- 14 days limit'
);

-- Should fail if end_date < start_date
SELECT throws_ok(
  $$SELECT mark_days_off_range(gen_random_uuid(), current_date + 2, current_date + 1, 'Vacation')$$,
  'End date must be on or after start date',
  'mark_days_off_range enforces date order'
);

-- Should fail for non-existent match
SELECT throws_ok(
  $$SELECT mark_days_off_range(gen_random_uuid(), current_date, current_date, 'Vacation')$$,
  'Not authorized or match is not active',
  'mark_days_off_range enforces match validity'
);

-- 4. Test professional_stats_view structure and public access
SELECT has_view('public', 'professional_stats_view', 'professional_stats_view exists');

SELECT has_column('public', 'professional_stats_view', 'reporting_consistency_90d', 'Has consistency column');
SELECT has_column('public', 'professional_stats_view', 'completed_matches', 'Has completed matches column');

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'professional_stats_view'
      AND c.relkind = 'v'
      AND 'security_invoker=true' = ANY (c.reloptions)
  ),
  'professional_stats_view is a security_invoker view'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.professional_stats_view', 'SELECT'),
  'anon cannot select from professional_stats_view'
);

SELECT * FROM finish();

ROLLBACK;

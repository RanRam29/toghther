-- WP13 Progress Report tests
-- Run: npx supabase test db

BEGIN;
SET search_path TO public, extensions;
SELECT plan(16);

-- Create some users for testing
INSERT INTO auth.users (id, email, phone, encrypted_password, aud, role) VALUES
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'primary@test.local', '0500000001', crypt('pass123', gen_salt('bf')), 'authenticated', 'authenticated'),
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d702', 'secondary@test.local', '0500000002', crypt('pass123', gen_salt('bf')), 'authenticated', 'authenticated'),
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d703', 'other-parent@test.local', '0500000003', crypt('pass123', gen_salt('bf')), 'authenticated', 'authenticated'),
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d704', 'prof@test.local', '0500000004', crypt('pass123', gen_salt('bf')), 'authenticated', 'authenticated');

INSERT INTO profiles (id, role, full_name, phone) VALUES
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'parent', 'Primary Parent', '0500000001'),
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d702', 'parent', 'Secondary Parent', '0500000002'),
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d703', 'parent', 'Other Parent', '0500000003'),
  ('f2eebc99-0000-4ef8-bb6d-6bb9bd38d704', 'professional', 'Prof User', 'SECRET_PHONE_LEAK_0500000004');

INSERT INTO professionals (id, user_id, display_name) VALUES
  ('e2eebc99-0000-4ef8-bb6d-6bb9bd38d704', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d704', 'Prof User Display');

-- Create a child
INSERT INTO children (id, parent_id, secondary_parent_id, first_name, age, category, framework) VALUES
  ('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d702', 'Test Child', 5, 'autism', 'regular_school');

-- Create child details to test leak
INSERT INTO child_details (child_id, diagnosis_full, notes) VALUES
  ('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'SECRET_DIAGNOSIS_LEAK', 'SECRET_NOTES_LEAK');

-- Create match
INSERT INTO matches (id, child_id, professional_id, started_at, metric_keys) VALUES
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'e2eebc99-0000-4ef8-bb6d-6bb9bd38d704', now() - interval '30 days', '{"regulation","transitions"}');

-- Create match days off
INSERT INTO match_days_off (match_id, date, reason) VALUES
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '5 days')::date, 'holiday');

-- Create valid checkins
INSERT INTO checkins (match_id, location, is_valid, created_at) VALUES
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', ST_Point(34.8, 32.1)::geography, true, now() - interval '10 days'),
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', ST_Point(34.8, 32.1)::geography, true, now() - interval '9 days'),
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', ST_Point(34.8, 32.1)::geography, false, now() - interval '8 days'); -- invalid checkin should be ignored

-- Create daily logs
INSERT INTO daily_logs (match_id, log_date, mood, metrics) VALUES
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '10 days')::date, 4, '{"regulation": 3, "transitions": 5}'),
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '9 days')::date, 5, '{"regulation": 4, "transitions": 4}');

-- 1. Anonymous should fail
SELECT set_config('request.jwt.claims', '{}', true);
SELECT throws_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)$$,
  'Not authorized or child not found',
  'Anonymous fails'
);

-- 2. Professional should fail
SELECT set_config('request.jwt.claims', json_build_object('sub', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d704', 'role', 'authenticated')::text, true);
SELECT throws_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)$$,
  'Not authorized or child not found',
  'Professional fails'
);

-- 3. Other parent should fail
SELECT set_config('request.jwt.claims', json_build_object('sub', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d703', 'role', 'authenticated')::text, true);
SELECT throws_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)$$,
  'Not authorized or child not found',
  'Other parent fails'
);

-- 4. Date range validation
SELECT set_config('request.jwt.claims', json_build_object('sub', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'role', 'authenticated')::text, true);
SELECT throws_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', now()::date, (now() - interval '30 days')::date)$$,
  'Invalid date range: from date must be before or equal to to date',
  'Reversed dates throws'
);

SELECT throws_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '400 days')::date, now()::date)$$,
  'Date range exceeds maximum allowed duration of 366 days',
  '>366 days throws'
);

-- 5. Primary Parent gets OK
SELECT lives_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)$$,
  'Primary parent can get report'
);

-- 6. Secondary Parent gets OK
SELECT set_config('request.jwt.claims', json_build_object('sub', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d702', 'role', 'authenticated')::text, true);
SELECT lives_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)$$,
  'Secondary parent can get report'
);

-- 7. Correctness of data
SELECT set_config('request.jwt.claims', json_build_object('sub', 'f2eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'role', 'authenticated')::text, true);

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)->'totals'->>'logs_count')::int = 2,
  'Logs count is exactly 2'
);

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)->'totals'->>'days_attended')::int = 2,
  'Days attended is exactly 2 (ignoring invalid checkin)'
);

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)->'matches'->0->'attendance'->>'days_off')::int = 1,
  'Days off is exactly 1'
);

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)->'totals'->>'mood_avg')::numeric = 4.5,
  'Average mood is 4.5'
);

-- 7b. Regression: 20260714110000 dropped daily_logs' UNIQUE(match_id, log_date),
-- so a professional can now log multiple observations on the same day. logs_count
-- must still reflect distinct days reported, not raw row count (see 20260714120000).
INSERT INTO daily_logs (match_id, log_date, mood, metrics) VALUES
  ('m2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '9 days')::date, 3, '{"regulation": 2, "transitions": 3}');

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)->'totals'->>'logs_count')::int = 2,
  'Logs count stays 2 distinct days after a second same-day entry (3 rows total)'
);

-- 8. Anti-leakage tests
SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)::text) NOT LIKE '%autism%',
  'Category (autism) is not leaked'
);

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)::text) NOT LIKE '%SECRET_DIAGNOSIS_LEAK%',
  'child_details diagnosis is not leaked'
);

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)::text) NOT LIKE '%SECRET_NOTES_LEAK%',
  'child_details notes are not leaked'
);

SELECT ok(
  (get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)::text) NOT LIKE '%SECRET_PHONE_LEAK%',
  'Professional phone is not leaked'
);

-- 9. Soft deleted child
UPDATE children SET deleted_at = now() WHERE id = 'c2eebc99-0000-4ef8-bb6d-6bb9bd38d701';
SELECT throws_ok(
  $$SELECT get_child_progress_report('c2eebc99-0000-4ef8-bb6d-6bb9bd38d701', (now() - interval '30 days')::date, now()::date)$$,
  'Not authorized or child not found',
  'Soft deleted child fails'
);

SELECT * FROM finish();
ROLLBACK;

-- Daily logs: multiple entries per day
-- Run: npx supabase test db

BEGIN;
SET search_path TO public, extensions;
SELECT plan(2);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.daily_logs'::regclass
      AND conname = 'daily_logs_match_id_log_date_key'
  ),
  'unique constraint on (match_id, log_date) was removed'
);
INSERT INTO auth.users (id, email, encrypted_password, aud, role) VALUES
  ('a1eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'dl-parent@test.local', crypt('pass123', gen_salt('bf')), 'authenticated', 'authenticated'),
  ('a1eebc99-0000-4ef8-bb6d-6bb9bd38d702', 'dl-prof@test.local', crypt('pass123', gen_salt('bf')), 'authenticated', 'authenticated');

INSERT INTO profiles (id, role, full_name, phone) VALUES
  ('a1eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'parent', 'DL Parent', '0500000011'),
  ('a1eebc99-0000-4ef8-bb6d-6bb9bd38d702', 'professional', 'DL Prof', '0500000012');

INSERT INTO professionals (id, user_id, display_name) VALUES
  ('b1eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'a1eebc99-0000-4ef8-bb6d-6bb9bd38d702', 'DL Prof');

INSERT INTO children (id, parent_id, first_name, age, category, functioning_level, framework) VALUES
  ('c1eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'a1eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'DL Child', 6, 'autism', 2, 'regular_school');

INSERT INTO matches (id, child_id, professional_id, started_at, metric_keys) VALUES
  ('d1eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'c1eebc99-0000-4ef8-bb6d-6bb9bd38d701', 'b1eebc99-0000-4ef8-bb6d-6bb9bd38d701', now(), '{"regulation"}');

INSERT INTO daily_logs (match_id, log_date, mood, metrics, notes) VALUES
  ('d1eebc99-0000-4ef8-bb6d-6bb9bd38d701', current_date, 3, '{"regulation": 3}', 'morning'),
  ('d1eebc99-0000-4ef8-bb6d-6bb9bd38d701', current_date, 4, '{"regulation": 4}', 'afternoon');

SELECT is(
  (SELECT count(*)::int FROM daily_logs
   WHERE match_id = 'd1eebc99-0000-4ef8-bb6d-6bb9bd38d701'
     AND log_date = current_date),
  2,
  'two daily logs on the same date are allowed'
);

SELECT * FROM finish();
ROLLBACK;

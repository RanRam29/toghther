BEGIN;

SELECT plan(8);

-- Setup Data
INSERT INTO auth.users (id, email) VALUES 
('p1111111-1111-1111-1111-111111111111', 'pro@test.com'),
('p2222222-2222-2222-2222-222222222222', 'parent@test.com'),
('p3333333-3333-3333-3333-333333333333', 'admin@test.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, role, full_name) VALUES 
('p1111111-1111-1111-1111-111111111111', 'professional', 'Pro User'),
('p2222222-2222-2222-2222-222222222222', 'parent', 'Parent User'),
('p3333333-3333-3333-3333-333333333333', 'admin', 'Admin User')
ON CONFLICT DO NOTHING;

INSERT INTO public.professionals (id, user_id, display_name) VALUES 
('p1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Pro User')
ON CONFLICT DO NOTHING;

-- 1. Check professional_public_stats_view exists and lacks reporting_consistency_90d
SELECT has_view('public', 'professional_public_stats_view', 'professional_public_stats_view exists');
SELECT hasnt_column('public', 'professional_public_stats_view', 'reporting_consistency_90d', 'public view does not have reporting_consistency_90d');
SELECT has_column('public', 'professional_public_stats_view', 'completed_matches', 'public view has completed_matches');

-- 2. Test Parent trying to read RPC (should fail)
SELECT set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', 'p2222222-2222-2222-2222-222222222222'), true);

SELECT throws_ok(
  $$SELECT public.get_professional_reporting_consistency('p1111111-1111-1111-1111-111111111111'::uuid)$$,
  'forbidden',
  'Parent cannot read reporting_consistency of a professional'
);

SELECT throws_ok(
  $$SELECT public.get_professional_reporting_consistency('00000000-0000-0000-0000-000000000000'::uuid)$$,
  'not found',
  'RPC throws not found for invalid pro id'
);

-- 3. Test Professional reading their own (should succeed)
SELECT set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', 'p1111111-1111-1111-1111-111111111111'), true);

SELECT lives_ok(
  $$SELECT public.get_professional_reporting_consistency('p1111111-1111-1111-1111-111111111111'::uuid)$$,
  'Professional can read their own reporting_consistency'
);

-- 4. Test Admin reading any professional (should succeed)
SELECT set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', 'p3333333-3333-3333-3333-333333333333'), true);

SELECT lives_ok(
  $$SELECT public.get_professional_reporting_consistency('p1111111-1111-1111-1111-111111111111'::uuid)$$,
  'Admin can read reporting_consistency of any professional'
);

-- Also ensure professional_stats_view is gone
SELECT hasnt_view('public', 'professional_stats_view', 'old professional_stats_view is removed');

SELECT * FROM finish();
ROLLBACK;

BEGIN;

-- Plan the tests
SELECT plan(6);

-- Setup data
-- We need: A parent, a child, a professional, a match, and some daily logs
DO $$ 
DECLARE
    v_parent_id uuid := '00000000-0000-0000-0000-000000000001';
    v_child_id uuid := '00000000-0000-0000-0000-000000000002';
    v_prof_id uuid := '00000000-0000-0000-0000-000000000003';
    v_prof_profile_id uuid := '00000000-0000-0000-0000-000000000004';
    v_match_id uuid := '00000000-0000-0000-0000-000000000005';
    v_unrelated_parent_id uuid := '00000000-0000-0000-0000-000000000006';
    v_week_start date := '2026-07-05'; -- Sunday
BEGIN
    -- Create users in auth.users
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        (v_parent_id, 'parent@test.com', '{"role": "parent"}'),
        (v_prof_profile_id, 'prof@test.com', '{"role": "professional"}'),
        (v_unrelated_parent_id, 'unrelated@test.com', '{"role": "parent"}');

    -- Create profiles
    INSERT INTO public.profiles (id, role, full_name) VALUES
        (v_parent_id, 'parent', 'Parent 1'),
        (v_prof_profile_id, 'professional', 'Prof 1'),
        (v_unrelated_parent_id, 'parent', 'Parent Unrelated');

    -- Create child
    INSERT INTO public.children (id, parent_id, first_name, age, category, functioning_level, framework) VALUES
        (v_child_id, v_parent_id, 'Child 1', 6, 'autism', 2, 'regular_school');

    -- Create professional
    INSERT INTO public.professionals (id, user_id, verified) VALUES
        (v_prof_id, v_prof_profile_id, 'verified');

    -- Create match
    INSERT INTO public.matches (id, child_id, professional_id, status, started_at) VALUES
        (v_match_id, v_child_id, v_prof_id, 'active', '2026-07-01');

    -- Insert daily logs
    -- Last week
    INSERT INTO public.daily_logs (match_id, log_date, mood, metrics, notes, highlight) VALUES
        (v_match_id, v_week_start - 3, 3, '{"focus": 3}'::jsonb, 'Test', NULL),
        (v_match_id, v_week_start - 1, 4, '{"focus": 3}'::jsonb, 'Test', 'Great!');
        
    -- This week
    INSERT INTO public.daily_logs (match_id, log_date, mood, metrics, notes, highlight) VALUES
        (v_match_id, v_week_start, 4, '{"focus": 4}'::jsonb, 'Test', 'Ate well'),
        (v_match_id, v_week_start + 1, 5, '{"focus": 5}'::jsonb, 'Test', 'Played well');

    -- Insert checkins for attendance
    INSERT INTO public.checkins (match_id, is_valid, created_at) VALUES
        (v_match_id, true, (v_week_start::timestamp AT TIME ZONE 'Asia/Jerusalem')),
        (v_match_id, true, ((v_week_start + 1)::timestamp AT TIME ZONE 'Asia/Jerusalem'));
END $$;

-- Test 1: Parent can get the weekly summary
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
SELECT auth.uid(); -- Force jwt claims update
SELECT is(
    (public.get_weekly_summary('00000000-0000-0000-0000-000000000005'::uuid, '2026-07-05'::date) ->> 'days_attended')::int,
    2,
    'Parent can get weekly summary with correct days_attended'
);

-- Test 2: Verify mood average and trend
SELECT is(
    (public.get_weekly_summary('00000000-0000-0000-0000-000000000005'::uuid, '2026-07-05'::date) ->> 'mood_avg'),
    '4.5',
    'Mood average is correctly calculated (4 and 5)'
);

SELECT is(
    (public.get_weekly_summary('00000000-0000-0000-0000-000000000005'::uuid, '2026-07-05'::date) ->> 'mood_trend'),
    'improving',
    'Mood trend is improving (4.5 vs 3.5)'
);

-- Test 3: Verify highlights
SELECT is(
    (public.get_weekly_summary('00000000-0000-0000-0000-000000000005'::uuid, '2026-07-05'::date) ->> 'highlights')::jsonb,
    '["Ate well", "Played well"]'::jsonb,
    'Highlights are correctly aggregated for this week'
);

-- Test 4: Unrelated parent gets an error
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000006", "role": "authenticated"}', true);
SELECT auth.uid();
SELECT throws_ok(
    $$ SELECT public.get_weekly_summary('00000000-0000-0000-0000-000000000005'::uuid, '2026-07-05'::date) $$,
    'Not authorized or match not found',
    'Unrelated parent is blocked'
);

-- Test 5: Verify anonymize_user clears highlight
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
SELECT auth.uid();
SELECT public.anonymize_user('00000000-0000-0000-0000-000000000001'::uuid);

SELECT set_config('request.jwt.claims', '{"role": "postgres"}', true); -- reset to postgres to query daily_logs
SELECT auth.uid();
SELECT is(
    (SELECT count(*)::int FROM public.daily_logs WHERE match_id = '00000000-0000-0000-0000-000000000005'::uuid AND highlight IS NOT NULL),
    0,
    'Highlights are cleared by anonymize_user'
);

SELECT * FROM finish();
ROLLBACK;

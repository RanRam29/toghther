-- Together Platform — Fix verification: 20260713120000_fix_v3_hardening_gaps.sql
-- Test file: supabase/tests/wp_fix_v3_gaps_test.sql
--
-- anonymize_user had zero test coverage before this file, which is how the
-- reviews.author_id/target_id column-name bug survived three rounds of
-- "fixed" status updates. Test 1 below calls it end-to-end on a user with a
-- review AND a document upload — the two dependents that broke it.

BEGIN;
SET search_path TO public, extensions;
SELECT plan(4);

GRANT SELECT ON public.match_hides TO authenticated;
GRANT SELECT ON public.match_days_off TO authenticated;

INSERT INTO auth.users (id, phone, email, aud, role, raw_user_meta_data) VALUES
  ('f2000000-0000-4000-8000-000000000b01', '0599999911', 'b01@test.local', 'authenticated', 'authenticated', '{"role": "parent"}'),
  ('f2000000-0000-4000-8000-000000000b02', '0599999912', 'b02@test.local', 'authenticated', 'authenticated', '{"role": "professional"}');

DO $$
DECLARE
  v_child_id uuid;
  v_prof_id uuid;
  v_match_id uuid;
BEGIN
  INSERT INTO public.children (parent_id, first_name, age, category, functioning_level, framework, communication_verbal)
  VALUES ('f2000000-0000-4000-8000-000000000b01', 'Child B', 6, 'autism', 2, 'regular_school', true)
  RETURNING id INTO v_child_id;

  INSERT INTO public.professionals (user_id, verified, display_name)
  VALUES ('f2000000-0000-4000-8000-000000000b02', 'verified', 'Prof B')
  RETURNING id INTO v_prof_id;

  INSERT INTO public.matches (child_id, professional_id, status, ended_at)
  VALUES (v_child_id, v_prof_id, 'active', NULL)
  RETURNING id INTO v_match_id;

  -- Dependents that previously crashed anonymize_user:
  INSERT INTO public.reviews (match_id, reviewer_id, reviewer_role, reliability, professionalism, child_fit, text)
  VALUES (v_match_id, 'f2000000-0000-4000-8000-000000000b01', 'parent', 5, 5, 5, 'note to be scrubbed');

  INSERT INTO public.document_uploads (owner_id, doc_type, storage_path, file_name)
  VALUES ('f2000000-0000-4000-8000-000000000b02', 'criminal_record', 'f2000000-0000-4000-8000-000000000b02/doc.pdf', 'doc.pdf');

  PERFORM set_config('my.parent_id', 'f2000000-0000-4000-8000-000000000b01', true);
  PERFORM set_config('my.prof_user_id', 'f2000000-0000-4000-8000-000000000b02', true);
  PERFORM set_config('my.match_id', v_match_id::text, true);
END $$;

-- 1. anonymize_user must not crash on a user with a review + a document (the exact regression)
SELECT lives_ok(
  format('SELECT public.anonymize_user(%L::uuid)', current_setting('my.parent_id')),
  'anonymize_user runs end-to-end on a user with a review (no author_id/target_id crash)'
);

-- 2. D14: matches ended by anonymize_user must get ended_at set (needed for the 14-day review-unlock path)
SELECT ok(
  (SELECT ended_at IS NOT NULL FROM public.matches WHERE id = current_setting('my.match_id')::uuid),
  'anonymize_user sets ended_at when force-ending active matches'
);

-- 3. get_matches_for_child keeps its search_path pin after the 2026-07-13 redefinitions
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_matches_for_child'
      AND pronamespace = 'public'::regnamespace
      AND proconfig IS NOT NULL
      AND EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%')
  ),
  'get_matches_for_child has SET search_path pinned'
);

-- 4. invite_secondary_parent keeps its search_path pin after wp11_rate_limits redefined it
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'invite_secondary_parent'
      AND pronamespace = 'public'::regnamespace
      AND proconfig IS NOT NULL
      AND EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%')
  ),
  'invite_secondary_parent has SET search_path pinned'
);

SELECT * FROM finish();
ROLLBACK;

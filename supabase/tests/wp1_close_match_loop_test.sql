begin;

select plan(5);

insert into auth.users (id, phone, aud, role) values
  ('a1111111-1111-1111-1111-111111111111', '0501111111', 'authenticated', 'authenticated'),
  ('a2222222-2222-2222-2222-222222222222', '0502222222', 'authenticated', 'authenticated');

update profiles set role = 'parent' where id = 'a1111111-1111-1111-1111-111111111111';
update profiles set role = 'professional' where id = 'a2222222-2222-2222-2222-222222222222';

insert into professionals (id, user_id, display_name, verified)
values ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Prof1', 'verified');

insert into children (id, parent_id, first_name, age, category, functioning_level, framework, communication_verbal) values
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Child1', 8, 'autism', 2, 'regular_school', true),
  ('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Child2', 9, 'adhd', 2, 'regular_school', true);

select set_config('request.jwt.claims',
  json_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

insert into match_requests (id, child_id, professional_id, status, initiated_by)
values ('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'interested', 'professional');

select lives_ok(
    $$select public.approve_request('d1111111-1111-1111-1111-111111111111')$$,
    'approve_request should succeed and return void'
);

select results_eq(
    $$select status::text, tier_reached from match_requests where id = 'd1111111-1111-1111-1111-111111111111'$$,
    $$values ('approved'::text, 2)$$,
    'approve_request should set status to approved and tier_reached to 2'
);

select is_empty(
    $$select id from matches where request_id = 'd1111111-1111-1111-1111-111111111111'$$,
    'approve_request should NOT create a match'
);

insert into match_requests (id, child_id, professional_id, status, initiated_by)
values ('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'interested', 'professional');
select public.approve_request('d2222222-2222-2222-2222-222222222222');

select lives_ok(
    $$select public.decline_after_intro('d2222222-2222-2222-2222-222222222222', 'not a good fit')$$,
    'decline_after_intro should succeed'
);

select results_eq(
    $$select status::text, decline_reason from match_requests where id = 'd2222222-2222-2222-2222-222222222222'$$,
    $$values ('rejected'::text, 'not a good fit'::text)$$,
    'decline_after_intro should set status to rejected with reason'
);

select * from finish();
rollback;

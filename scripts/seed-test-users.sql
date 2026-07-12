-- ============================================================
-- Together — Test users seed  (idempotent, safe to re-run)
-- ============================================================
-- WHERE TO RUN:  Supabase Dashboard → SQL Editor  (project flrflktlltmqbiamljlm)
-- WHY IT WORKS:  The SQL Editor runs as `postgres` (no JWT), so the C4 role-freeze
--                trigger (20260707120000) does NOT apply — seed may set role/id.
--
-- LOGIN (app + Expo web):  role-select → phone → OTP code = 123456
--                (Test-OTP numbers already configured in Auth → Phone).
--
-- TEST USERS
--   972524627635  parent         הורה בדיקה     (2 published children)
--   972501111111  professional   משלבת בדיקה    (verified)
--   972523333333  professional   משלבת בדיקה 2  (verified)
--   972521111111  admin          מנהל בדיקה     (app_metadata.is_admin = true)
--   972522222222  supervisor     מפקח בדיקה     (תור אימות D26)
--
-- NOTE ON ADMIN:  the app has no (admin) route yet (D23 unbuilt); role='admin'
--   falls back to role-select, so the admin account is for DB/RLS testing and
--   Supabase Studio management only — it has no in-app admin screen today.
-- ============================================================

-- 1) Ensure auth.users + auth.identities exist for each test phone.
--    (Test-OTP login also auto-creates them, but this makes the seed self-contained
--     and stamps the correct role from the first insert via handle_new_user().)
do $$
declare
  u record;
  v_id uuid;
  test_users constant jsonb := '[
    {"phone":"972524627635","role":"parent"},
    {"phone":"972501111111","role":"professional"},
    {"phone":"972523333333","role":"professional"},
    {"phone":"972521111111","role":"admin"},
    {"phone":"972522222222","role":"supervisor"}
  ]';
begin
  for u in
    select * from jsonb_to_recordset(test_users) as x(phone text, role text)
  loop
    select id into v_id from auth.users where phone = u.phone;
    if v_id is null then
      v_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, phone, phone_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change,
        email_change_token_new, phone_change, phone_change_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        u.phone, now(),
        jsonb_build_object('provider','phone','providers', jsonb_build_array('phone')),
        jsonb_build_object('role', u.role), now(), now(),
        '', '', '', '', '', ''
      );

      insert into auth.identities (
        provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        v_id::text, v_id,
        jsonb_build_object('sub', v_id::text, 'phone', u.phone),
        'phone', now(), now(), now()
      );
      -- public.profiles row is created by the on_auth_user_created trigger.
    end if;
  end loop;
end $$;

-- 2) Set role / name / area on profiles (fixes any pre-existing account too).
update public.profiles p set
  role      = v.role::user_role,
  full_name = v.full_name,
  area      = v.area,
  phone     = v.phone
from (values
  ('972524627635', 'parent',       'הורה בדיקה',   'תל אביב'),
  ('972501111111', 'professional', 'משלבת בדיקה',  'תל אביב'),
  ('972523333333', 'professional', 'משלבת בדיקה 2','רמת גן'),
  ('972521111111', 'admin',        'מנהל בדיקה',   'תל אביב'),
  ('972522222222', 'supervisor',   'מפקח בדיקה',   'תל אביב')
) as v(phone, role, full_name, area)
join auth.users u on u.phone = v.phone
where p.id = u.id;

-- 3) Admin: app_metadata.is_admin = true  (required by public.is_admin()).
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
where phone = '972521111111';

-- 4) Professional records (verified → pass onboarding gates & appear in matching).
insert into public.professionals (
  user_id, display_name, bio, type, specialties, experience_years,
  verified, verified_at, languages, framework_types, location, max_radius_km, backup_available
)
select u.id, v.display_name, 'משתמש בדיקה QA', 'mashlavit',
       v.specialties, v.experience_years, 'verified', now(),
       '{he}', v.framework_types, v.location, v.radius, v.backup
from (values
  ('972501111111', 'משלבת בדיקה',
     '{autism,adhd}'::need_category[], 3,
     '{regular_school,special_ed}'::framework_type[],
     'SRID=4326;POINT(34.78 32.08)'::geography, 20, true),
  ('972523333333', 'משלבת בדיקה 2',
     '{learning_disability,speech}'::need_category[], 5,
     '{kindergarten,regular_school}'::framework_type[],
     'SRID=4326;POINT(34.81 32.07)'::geography, 15, false)
) as v(phone, display_name, specialties, experience_years, framework_types, location, radius, backup)
join auth.users u on u.phone = v.phone
on conflict (user_id) do update set
  display_name    = excluded.display_name,
  specialties     = excluded.specialties,
  experience_years= excluded.experience_years,
  verified        = 'verified',
  verified_at     = now(),
  framework_types = excluded.framework_types,
  location        = excluded.location,
  max_radius_km   = excluded.max_radius_km;

-- 5) Sample published children for the parent (so professional browse & matching return data).
insert into public.children (
  parent_id, first_name, age, category, functioning_level, framework,
  communication_verbal, needs, published, location
)
select u.id, v.first_name, v.age, v.category::need_category, v.level,
       v.framework::framework_type, v.verbal, v.needs, true, v.location
from (values
  ('972524627635', 'דניאל', 7, 'autism', 2, 'regular_school', true,
     '{"routine":true,"sensory":true}'::jsonb, 'SRID=4326;POINT(34.79 32.08)'::geography),
  ('972524627635', 'מאיה',  5, 'adhd',   1, 'kindergarten',   true,
     '{"focus":true}'::jsonb,                  'SRID=4326;POINT(34.80 32.07)'::geography)
) as v(phone, first_name, age, category, level, framework, verbal, needs, location)
join auth.users u on u.phone = v.phone
where not exists (
  select 1 from public.children c
  where c.parent_id = u.id and c.first_name = v.first_name
);

-- 6) Sanity check — expect 4 rows: admin / parent / professional / professional.
select p.phone, p.role, p.full_name, p.area,
       (u.raw_app_meta_data->>'is_admin')::boolean            as is_admin,
       pr.verified                                            as prof_verified,
       (select count(*) from public.children c where c.parent_id = p.id) as children
from public.profiles p
join auth.users u on u.id = p.id
left join public.professionals pr on pr.user_id = p.id
where p.phone in ('972524627635','972501111111','972523333333','972521111111')
order by p.role, p.phone;

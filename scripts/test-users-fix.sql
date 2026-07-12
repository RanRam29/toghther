-- Fix test users created via the app's phone-OTP flow.
-- The auth.users + profiles rows already exist (created by handle_new_user());
-- this just corrects role/name/area and, for the professional, adds the
-- professionals row so the account is immediately usable.

-- 1) Professional test user (phone 972501111111) — was created as 'parent' by mistake
update public.profiles
set role = 'professional', full_name = 'משלבת בדיקה', area = 'תל אביב'
where phone = '972501111111';

insert into public.professionals (user_id, display_name, bio, type, specialties, experience_years, verified, languages, framework_types, location, max_radius_km)
select id, 'משלבת בדיקה', 'משתמש בדיקה למטרות QA', 'mashlavit', '{autism}', 3, 'verified', '{he}', '{regular_school}',
       'SRID=4326;POINT(34.78 32.08)', 15
from public.profiles
where phone = '972501111111'
on conflict (user_id) do nothing;

-- 2) Admin test user (phone 972521111111) — base signup was created as 'parent'
update public.profiles
set role = 'admin', full_name = 'מנהל בדיקה', area = 'תל אביב'
where phone = '972521111111';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
where phone = '972521111111';

-- Sanity check — should show 3 rows: parent / professional / admin
select p.phone, p.role, p.full_name,
       (u.raw_app_meta_data->>'is_admin')::boolean as is_admin
from public.profiles p
join auth.users u on u.id = p.id
where p.phone in ('972524627635', '972501111111', '972521111111')
order by p.role;

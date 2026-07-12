-- ============================================================
-- Together — Test LOGIN credentials + staff/verification personas
-- Idempotent, safe to re-run. Run AFTER scripts/seed-test-data.sql.
-- ============================================================
-- WHERE:  Supabase SQL Editor OR `supabase db query --linked --file`.
--         Runs as `postgres` (no JWT) → role-freeze trigger is exempt.
--
-- Adds, on top of seed-test-data.sql:
--   • email+password on the 5 login personas (second login method)
--   • supervisor persona (972522222222) with app_metadata.is_supervisor=true
--     (REQUIRED by the hardened public.is_supervisor())
--   • an UNVERIFIED professional (972525555555, verified='submitted') assigned
--     to the supervisor, with 3 pending documents → drives the verification queue
--
-- LOGIN — two ways for every persona:
--   (1) Phone + OTP 123456   (numbers must be in Auth → Phone → Test OTP)
--   (2) Email + password     (created below; works in the shipped app as-is)
--
--   role         phone           email                          password
--   parent       972524627635    parent.demo@together.test      Tgthr!Parent2026
--   professional 972501111111    pro.demo@together.test         Tgthr!Pro2026
--   prof (new)   972525555555    pro.unverified@together.test   Tgthr!ProNew2026
--   admin        972521111111    admin.demo@together.test       Tgthr!Admin2026
--   supervisor   972522222222    supervisor.demo@together.test  Tgthr!Super2026
-- ============================================================

-- ------------------------------------------------------------
-- 1) Ensure all 5 login personas exist (auth.users + phone identity)
-- ------------------------------------------------------------
do $$
declare
  u record;
  v_id uuid;
  accounts constant jsonb := '[
    {"phone":"972524627635","role":"parent"},
    {"phone":"972501111111","role":"professional"},
    {"phone":"972525555555","role":"professional"},
    {"phone":"972521111111","role":"admin"},
    {"phone":"972522222222","role":"supervisor"}
  ]';
begin
  for u in select * from jsonb_to_recordset(accounts) as x(phone text, role text)
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
        jsonb_build_object('role', u.role), now() - interval '60 days', now(),
        '', '', '', '', '', ''
      );
      insert into auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_id::text, v_id,
        jsonb_build_object('sub', v_id::text, 'phone', u.phone),
        'phone', now(), now(), now()
      );
      -- public.profiles created by the on_auth_user_created trigger.
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2) profiles — role / name / area for the two NEW personas
--    (seed-test-data.sql already set the other three)
-- ------------------------------------------------------------
update public.profiles p set
  role = v.role::user_role, full_name = v.full_name, area = v.area, phone = v.phone
from (values
  ('972525555555','professional','משלבת חדשה (לא מאומתת)','תל אביב'),
  ('972522222222','supervisor',  'מפקח בדיקה',           'תל אביב')
) as v(phone, role, full_name, area)
join auth.users u on u.phone = v.phone
where p.id = u.id;

-- ------------------------------------------------------------
-- 3) app_metadata claims required by the hardened gates
--    admin → is_admin (public.is_admin) ; supervisor → is_supervisor (public.is_supervisor)
-- ------------------------------------------------------------
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"is_admin": true}'::jsonb
where phone = '972521111111';
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"is_supervisor": true}'::jsonb
where phone = '972522222222';

-- ------------------------------------------------------------
-- 4) Email + password login for all 5 personas
--    Sets email/encrypted_password on auth.users and adds an email identity.
-- ------------------------------------------------------------
do $$
declare
  r record;
  creds constant jsonb := '[
    {"phone":"972524627635","email":"parent.demo@together.test","pw":"Tgthr!Parent2026"},
    {"phone":"972501111111","email":"pro.demo@together.test","pw":"Tgthr!Pro2026"},
    {"phone":"972525555555","email":"pro.unverified@together.test","pw":"Tgthr!ProNew2026"},
    {"phone":"972521111111","email":"admin.demo@together.test","pw":"Tgthr!Admin2026"},
    {"phone":"972522222222","email":"supervisor.demo@together.test","pw":"Tgthr!Super2026"}
  ]';
  v_uid uuid;
begin
  for r in select * from jsonb_to_recordset(creds) as x(phone text, email text, pw text)
  loop
    select id into v_uid from auth.users where phone = r.phone;
    if v_uid is null then continue; end if;

    update auth.users set
      email = r.email,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      encrypted_password = extensions.crypt(r.pw, extensions.gen_salt('bf')),
      raw_app_meta_data = raw_app_meta_data
        || jsonb_build_object('providers',
             (select jsonb_agg(distinct p) from jsonb_array_elements_text(
                coalesce(raw_app_meta_data->'providers','[]'::jsonb) || '["email"]'::jsonb) p))
    where id = v_uid;

    -- email identity (GoTrue needs one identity per provider)
    if not exists (select 1 from auth.identities where user_id = v_uid and provider = 'email') then
      insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), r.email, v_uid,
              jsonb_build_object('sub', v_uid::text, 'email', r.email, 'email_verified', true),
              'email', now(), now(), now());
    else
      update auth.identities set identity_data = jsonb_build_object('sub', v_uid::text, 'email', r.email, 'email_verified', true), provider_id = r.email
      where user_id = v_uid and provider = 'email';
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 5) UNVERIFIED professional → supervisor verification queue
--    verified='submitted' + assigned to the supervisor + 3 pending docs
-- ------------------------------------------------------------
insert into public.professionals (
  user_id, display_name, bio, type, specialties, experience_years,
  languages, framework_types, verified, location, max_radius_km,
  assigned_supervisor_id, assigned_at
)
select pu.id, 'משלבת חדשה', 'ממתינה לאימות מסמכים', 'mashlavit',
       '{autism,emotional}'::need_category[], 1, '{he}',
       '{regular_school}'::framework_type[], 'submitted',
       'SRID=4326;POINT(34.79 32.07)'::geography, 15,
       su.id, now() - interval '2 days'
from auth.users pu
join auth.users su on su.phone = '972522222222'
where pu.phone = '972525555555'
on conflict (user_id) do update set
  verified = 'submitted',
  assigned_supervisor_id = excluded.assigned_supervisor_id,
  assigned_at = coalesce(public.professionals.assigned_at, excluded.assigned_at),
  display_name = excluded.display_name, bio = excluded.bio;

insert into public.document_uploads (owner_id, doc_type, storage_path, file_name, verified)
select u.id, v.doc_type::document_type,
       'documents/' || u.id || '/' || v.doc_type || '.pdf', v.file_name, false
from (values
  ('972525555555','id_card',        'תעודת_זהות.pdf'),
  ('972525555555','criminal_record','תעודת_יושר.pdf'),
  ('972525555555','certificate',    'תעודת_הכשרה.pdf')
) as v(pro_phone, doc_type, file_name)
join auth.users u on u.phone = v.pro_phone
where not exists (
  select 1 from public.document_uploads d
  where d.owner_id = u.id and d.doc_type = v.doc_type::document_type
);

-- ------------------------------------------------------------
-- 6) VERIFY — expect 5 rows, correct roles/claims/email/verification
-- ------------------------------------------------------------
select p.role, p.phone, p.full_name,
       u.email,
       (u.encrypted_password is not null)                       as has_password,
       (u.raw_app_meta_data->>'is_admin')::boolean              as is_admin,
       (u.raw_app_meta_data->>'is_supervisor')::boolean         as is_supervisor,
       pr.verified                                              as prof_verified,
       (pr.assigned_supervisor_id is not null)                  as assigned_to_supervisor,
       (select count(*) from public.document_uploads d where d.owner_id = p.id and not d.verified) as pending_docs
from public.profiles p
join auth.users u on u.id = p.id
left join public.professionals pr on pr.user_id = p.id
where p.phone in ('972524627635','972501111111','972525555555','972521111111','972522222222')
order by array_position(array['admin','supervisor','parent','professional']::text[], p.role::text), p.phone;

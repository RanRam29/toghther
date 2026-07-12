-- ============================================================
-- Together — FULL test environment seed  (idempotent, safe to re-run)
-- ============================================================
-- WHERE:  Supabase Dashboard → SQL Editor  (project flrflktlltmqbiamljlm)
-- WHY OK: SQL Editor runs as `postgres` (no JWT) → the C4 role-freeze trigger
--         (20260707120000) is exempt, so seed may set role/id freely.
--
-- ─── LOGIN USERS (Test-OTP already configured, code = 123456) ───────────────
--   972524627635  parent         הורה בדיקה      → 2 children, incoming requests, 1 active match
--   972501111111  professional   משלבת בדיקה     → verified, active match + reviews + docs
--   972523333333  professional   משלבת בדיקה 2   → verified, active match + docs
--   972521111111  admin          מנהל בדיקה      → is_admin=true (no in-app screen yet — Studio)
--
-- ─── DATA-ONLY USERS (NO login — only enrich lists/matching) ────────────────
--   972500000001  PRO3 יעל כהן        (verified)
--   972500000002  PRO4 נועה לוי       (verified)
--   972500000003  PRO5 מירי אבני      (verified, accepts all frameworks)
--   972500000010  P2  הורה בדיקה 2    (2 published children)
--
-- Everything is clustered around Tel Aviv (~34.78,32.08) so PostGIS radius
-- filters in the matching engine return results.
-- ============================================================

-- ============================================================
-- A) auth.users + auth.identities for every test account
-- ============================================================
do $$
declare
  u record;
  v_id uuid;
  accounts constant jsonb := '[
    {"phone":"972524627635","role":"parent"},
    {"phone":"972501111111","role":"professional"},
    {"phone":"972523333333","role":"professional"},
    {"phone":"972521111111","role":"admin"},
    {"phone":"972500000001","role":"professional"},
    {"phone":"972500000002","role":"professional"},
    {"phone":"972500000003","role":"professional"},
    {"phone":"972500000010","role":"parent"}
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
    end if;
  end loop;
end $$;

-- ============================================================
-- B) profiles — role / name / area  (fixes pre-existing rows too)
-- ============================================================
update public.profiles p set
  role = v.role::user_role, full_name = v.full_name, area = v.area, phone = v.phone
from (values
  ('972524627635','parent',      'הורה בדיקה',    'תל אביב'),
  ('972501111111','professional','משלבת בדיקה',   'תל אביב'),
  ('972523333333','professional','משלבת בדיקה 2', 'רמת גן'),
  ('972521111111','admin',       'מנהל בדיקה',    'תל אביב'),
  ('972500000001','professional','יעל כהן',       'תל אביב'),
  ('972500000002','professional','נועה לוי',      'גבעתיים'),
  ('972500000003','professional','מירי אבני',     'תל אביב'),
  ('972500000010','parent',      'הורה בדיקה 2',  'רמת גן')
) as v(phone, role, full_name, area)
join auth.users u on u.phone = v.phone
where p.id = u.id;

-- ============================================================
-- C) admin app_metadata.is_admin = true  (required by public.is_admin())
-- ============================================================
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"is_admin": true}'::jsonb
where phone = '972521111111';

-- ============================================================
-- D) professionals (all verified)
-- ============================================================
insert into public.professionals (
  user_id, display_name, bio, type, specialties, certifications, experience_years,
  availability, languages, framework_types, verified, verified_at,
  location, max_radius_km, backup_available
)
select u.id, v.display_name, v.bio, 'mashlavit',
       v.specialties, v.certs, v.years, v.availability, '{he}',
       v.frameworks, 'verified', now() - interval '40 days',
       v.location, v.radius, v.backup
from (values
  ('972501111111','משלבת בדיקה','מלווה ילדים על הרצף 3 שנים',
     '{autism,adhd}'::need_category[], '{"תעודת מטפל רגשי"}'::text[], 3,
     '{"sunday":[8,14],"monday":[8,14],"tuesday":[8,13]}'::jsonb,
     '{regular_school,special_ed}'::framework_type[],
     'SRID=4326;POINT(34.78 32.08)'::geography, 20, true),
  ('972523333333','משלבת בדיקה 2','קלינאית תקשורת ולקויות למידה',
     '{learning_disability,speech}'::need_category[], '{"B.A. חינוך מיוחד"}'::text[], 5,
     '{"sunday":[9,15],"wednesday":[9,15]}'::jsonb,
     '{kindergarten,regular_school}'::framework_type[],
     'SRID=4326;POINT(34.81 32.07)'::geography, 15, false),
  ('972500000001','יעל כהן','מומחית אוטיזם ומוגבלות שכלית',
     '{autism,intellectual}'::need_category[], '{"M.A. ABA"}'::text[], 7,
     '{"monday":[8,16],"thursday":[8,16]}'::jsonb,
     '{special_ed,special_kindergarten}'::framework_type[],
     'SRID=4326;POINT(34.79 32.09)'::geography, 25, true),
  ('972500000002','נועה לוי','מלווה ADHD ולקויות למידה',
     '{adhd,learning_disability}'::need_category[], '{}'::text[], 2,
     '{"sunday":[12,18]}'::jsonb,
     '{regular_school}'::framework_type[],
     'SRID=4326;POINT(34.77 32.06)'::geography, 15, false),
  ('972500000003','מירי אבני','טיפול רגשי ושפה, גמישות מלאה במסגרות',
     '{speech,emotional}'::need_category[], '{"תעודת הבעה ויצירה"}'::text[], 4,
     '{"tuesday":[8,14],"friday":[8,12]}'::jsonb,
     '{}'::framework_type[],
     'SRID=4326;POINT(34.80 32.05)'::geography, 30, true)
) as v(phone, display_name, bio, specialties, certs, years, availability, frameworks, location, radius, backup)
join auth.users u on u.phone = v.phone
on conflict (user_id) do update set
  display_name = excluded.display_name, bio = excluded.bio,
  specialties = excluded.specialties, certifications = excluded.certifications,
  experience_years = excluded.experience_years, availability = excluded.availability,
  framework_types = excluded.framework_types, verified = 'verified',
  verified_at = coalesce(professionals.verified_at, now() - interval '40 days'),
  location = excluded.location, max_radius_km = excluded.max_radius_km,
  backup_available = excluded.backup_available;
-- NOTE: rating_avg / rating_count intentionally omitted → owned by the reviews trigger.

-- ============================================================
-- E) children (published) + child_details (TIER 2–3 content)
-- ============================================================
insert into public.children (
  parent_id, first_name, age, category, secondary_category, functioning_level,
  framework, communication_verbal, hours_needed, needs, published, location
)
select u.id, v.first_name, v.age, v.category::need_category,
       v.secondary::need_category, v.level, v.framework::framework_type,
       v.verbal, v.hours, v.needs, true, v.location
from (values
  ('972524627635','דניאל', 7, 'autism', 'adhd', 2, 'regular_school', true,
     '{"sunday":[8,14],"monday":[8,14]}'::jsonb, '{"routine":true,"sensory":true}'::jsonb,
     'SRID=4326;POINT(34.79 32.08)'::geography),
  ('972524627635','מאיה',  5, 'adhd', null, 1, 'kindergarten', true,
     '{"sunday":[8,13]}'::jsonb, '{"focus":true}'::jsonb,
     'SRID=4326;POINT(34.80 32.07)'::geography),
  ('972500000010','יונתן', 9, 'learning_disability', null, 2, 'special_ed', true,
     '{"tuesday":[8,15]}'::jsonb, '{"reading":true}'::jsonb,
     'SRID=4326;POINT(34.81 32.07)'::geography),
  ('972500000010','תמר',   6, 'speech', null, 1, 'regular_school', false,
     '{"wednesday":[9,13]}'::jsonb, '{"aac":true}'::jsonb,
     'SRID=4326;POINT(34.82 32.06)'::geography)
) as v(parent_phone, first_name, age, category, secondary, level, framework, verbal, hours, needs, location)
join auth.users u on u.phone = v.parent_phone
where not exists (
  select 1 from public.children c where c.parent_id = u.id and c.first_name = v.first_name
);

insert into public.child_details (child_id, full_name, diagnosis_full, what_works, what_triggers, gender_preference, win_definition, notes)
select ch.id, v.full_name, v.diagnosis, v.works, v.triggers, v.gender, v.win, v.notes
from (values
  ('972524627635','דניאל','דניאל לוי','אוטיזם בתפקוד בינוני, ADHD משני','חיזוקים חזותיים, לוח זמנים קבוע','רעש פתאומי, שינויים לא צפויים','נקבה','שיפור השתלבות בהפסקות',null),
  ('972524627635','מאיה','מאיה לוי','ADHD','משחק תנועתי, הפסקות קצרות','משימות ארוכות','ללא העדפה','ישיבה ממושכת בגן',null),
  ('972500000010','יונתן','יונתן ישראלי','לקות למידה בקריאה','קריאה מודרכת, טכנולוגיה מסייעת','לחץ זמן','זכר','קריאה עצמאית של פסקה',null),
  ('972500000010','תמר','תמר ישראלי','עיכוב שפתי, תקשורת לא מילולית','תקשורת תומכת (AAC), תמונות','דרישה מילולית','נקבה','יוזמת תקשורת עם עמיתים',null)
) as v(parent_phone, child_name, full_name, diagnosis, works, triggers, gender, win, notes)
join auth.users u on u.phone = v.parent_phone
join public.children ch on ch.parent_id = u.id and ch.first_name = v.child_name
on conflict (child_id) do update set
  full_name = excluded.full_name, diagnosis_full = excluded.diagnosis_full,
  what_works = excluded.what_works, what_triggers = excluded.what_triggers,
  gender_preference = excluded.gender_preference, win_definition = excluded.win_definition;

-- ============================================================
-- F) match_requests — full spread of statuses / tiers
-- ============================================================
insert into public.match_requests (
  child_id, professional_id, status, initiated_by, tier_reached, cover_letter, parent_message, score, match_reason
)
select ch.id, pr.id, v.status::match_request_status, v.initiated_by, v.tier,
       v.cover_letter, v.parent_message, v.score, v.reason
from (values
  -- P1 / דניאל (autism) — parent has 'interested' candidates to approve/reject (S-PAR-05)
  ('972524627635','דניאל','972501111111','interested','professional',1,'שלום, יש לי ניסיון רב עם ילדים על הרצף. אשמח ללוות את דניאל.',null,88.0,'ניסיון עם autism · 3 שנות ניסיון · 1.1 ק"מ'),
  ('972524627635','דניאל','972500000001','interested','professional',1,'מומחית ABA, אשמח להכיר את דניאל.',null,84.0,'ניסיון עם autism · 7 שנות ניסיון · 1.4 ק"מ'),
  ('972524627635','דניאל','972500000002','pending','parent',1,null,'ראיתי את הפרופיל שלך, נשמח שתכירי את דניאל.',60.0,'2 שנות ניסיון · 2.3 ק"מ'),
  ('972524627635','דניאל','972500000003','rejected','professional',0,'אשמח לעזור.',null,40.0,'3.6 ק"מ'),
  -- P1 / מאיה (adhd) — APPROVED (→ active match M1) + another 'interested' to approve
  ('972524627635','מאיה','972501111111','approved','professional',2,'אשמח ללוות את מאיה בגן.',null,82.0,'ניסיון עם adhd · 3 שנות ניסיון · 1.0 ק"מ'),
  ('972524627635','מאיה','972523333333','interested','professional',1,'זמינה בגן, ניסיון עם ויסות.',null,70.0,'2.0 ק"מ'),
  -- P2 / יונתן — APPROVED (→ active match M2 for PRO2) + PENDING incoming for PRO1 (login) + interested
  ('972500000010','יונתן','972523333333','approved','parent',2,null,'נשמח שתלווי את יונתן בקריאה.',80.0,'ניסיון עם learning_disability · 5 שנות ניסיון'),
  ('972500000010','יונתן','972501111111','pending','parent',1,null,'נשמח שתכיר את יונתן.',55.0,'incoming'),
  ('972500000010','יונתן','972500000001','interested','professional',1,'ניסיון עם לקויות למידה.',null,66.0,'ניסיון עם learning_disability'),
  -- P2 / תמר — PENDING incoming for PRO2 (login) + interested + withdrawn
  ('972500000010','תמר','972523333333','pending','parent',1,null,'נשמח שתלווי את תמר.',58.0,'incoming'),
  ('972500000010','תמר','972500000003','interested','professional',1,'קלינאית, אשמח ללוות את תמר.',null,72.0,'ניסיון עם speech'),
  ('972500000010','תמר','972500000002','withdrawn','parent',0,null,'בוטל.',0.0,null)
) as v(parent_phone, child_name, pro_phone, status, initiated_by, tier, cover_letter, parent_message, score, reason)
join auth.users pu on pu.phone = v.parent_phone
join public.children ch on ch.parent_id = pu.id and ch.first_name = v.child_name
join auth.users pou on pou.phone = v.pro_phone
join public.professionals pr on pr.user_id = pou.id
on conflict (child_id, professional_id) do update set
  status = excluded.status, initiated_by = excluded.initiated_by,
  cover_letter = excluded.cover_letter, parent_message = excluded.parent_message,
  score = excluded.score, match_reason = excluded.match_reason;

-- ============================================================
-- G) matches — active (TIER 3), linked to the approved requests
-- ============================================================
insert into public.matches (child_id, professional_id, request_id, status, score, match_reason, started_at)
select ch.id, pr.id, mr.id, 'active', v.score, v.reason, now() - make_interval(days => v.days_ago)
from (values
  ('972524627635','מאיה','972501111111', 82.0, 'ניסיון עם adhd · 3 שנות ניסיון · 1.0 ק"מ', 30),
  ('972500000010','יונתן','972523333333', 80.0, 'ניסיון עם learning_disability · 5 שנות ניסיון', 20)
) as v(parent_phone, child_name, pro_phone, score, reason, days_ago)
join auth.users pu on pu.phone = v.parent_phone
join public.children ch on ch.parent_id = pu.id and ch.first_name = v.child_name
join auth.users pou on pou.phone = v.pro_phone
join public.professionals pr on pr.user_id = pou.id
left join public.match_requests mr on mr.child_id = ch.id and mr.professional_id = pr.id
on conflict (child_id, professional_id) do update set
  status = 'active', score = excluded.score, match_reason = excluded.match_reason;

-- Bump the approved requests to tier 3 (they now have an active match).
update public.match_requests mr set tier_reached = 3
from public.matches m
where m.request_id = mr.id and m.status = 'active';

-- One ENDED match (history) → gives PRO1 a rating WITHOUT blocking the parent's
-- live review test on the active match. (No active screen lists ended matches.)
insert into public.matches (child_id, professional_id, status, score, match_reason, started_at, ended_at, end_reason)
select ch.id, pr.id, 'ended', 74.0, 'התאמה שהסתיימה', now() - interval '120 days', now() - interval '30 days', 'סיום שנת לימודים'
from auth.users pu
join public.children ch on ch.parent_id = pu.id and ch.first_name = 'תמר'
join auth.users pou on pou.phone = '972501111111'
join public.professionals pr on pr.user_id = pou.id
where pu.phone = '972500000010'
on conflict (child_id, professional_id) do nothing;

-- ============================================================
-- H) checkins — GPS EVV history for each active match (valid + one invalid)
-- ============================================================
-- valid check-ins (at the child's framework location)
insert into public.checkins (match_id, location, is_valid, created_at)
select m.id, c.location, true, now() - make_interval(days => g.d)
from public.matches m
join public.children c on c.id = m.child_id
join generate_series(1,5) as g(d) on true
where m.status = 'active'
  and not exists (select 1 from public.checkins ck where ck.match_id = m.id);

-- one invalid check-in (~1.1 km away → outside geofence)
insert into public.checkins (match_id, location, is_valid, created_at)
select m.id,
       ST_SetSRID(ST_MakePoint(ST_X(c.location::geometry) + 0.01, ST_Y(c.location::geometry) + 0.01), 4326)::geography,
       false, now() - make_interval(days => 6)
from public.matches m
join public.children c on c.id = m.child_id
where m.status = 'active'
  and not exists (select 1 from public.checkins ck where ck.match_id = m.id and ck.is_valid = false);

-- ============================================================
-- I) daily_logs — pedagogical micro-survey w/ AI summary
-- ============================================================
insert into public.daily_logs (match_id, log_date, mood, metrics, notes, ai_summary, ai_strategy)
select m.id, (now()::date - g.d), (3 + (g.d % 3)),
       jsonb_build_object('social_initiatives', 2 + (g.d % 4), 'regulation', 3 + (g.d % 3)),
       'יום טוב בסך הכל, שיתוף פעולה טוב.',
       'הילד/ה הפגין/ה יציבות רגשית ושיתוף פעולה גובר לאורך היום.',
       'מומלץ להמשיך בחיזוקים חזותיים ולהוסיף הפסקה תנועתית לפני משימות ארוכות.'
from public.matches m
join generate_series(1,4) as g(d) on true
where m.status = 'active'
on conflict (match_id, log_date) do nothing;

-- ============================================================
-- J) reviews — parent → professional (fires rating trigger)
-- ============================================================
-- Reviews land on the ACTIVE PRO2 match (יונתן) and the ENDED PRO1 match (תמר),
-- so both login professionals get a rating, while P1's active match (מאיה) stays
-- un-reviewed → parent & professional can both test submitting a review there.
insert into public.reviews (match_id, reviewer_id, reviewer_role, reliability, professionalism, child_fit, text)
select m.id, c.parent_id, 'parent', v.rel, v.prof, v.fit, v.txt
from (values
  ('972500000010','יונתן', 4, 5, 5, 'מקצועית ורגישה, יונתן מתקדם בקריאה.'),
  ('972500000010','תמר',   5, 4, 5, 'ליווי מצוין לאורך כל השנה, תודה!')
) as v(parent_phone, child_name, rel, prof, fit, txt)
join auth.users pu on pu.phone = v.parent_phone
join public.children c on c.parent_id = pu.id and c.first_name = v.child_name
join public.matches m on m.child_id = c.id
on conflict (match_id, reviewer_id) do nothing;

-- ============================================================
-- K) document_uploads — verification queue (mix verified / pending)
-- ============================================================
insert into public.document_uploads (owner_id, doc_type, storage_path, file_name, verified, verified_at, verified_by)
select u.id, v.doc_type::document_type,
       'documents/' || u.id || '/' || v.doc_type || '.pdf', v.file_name,
       v.verified, case when v.verified then now() - interval '35 days' else null end,
       case when v.verified then (select id from auth.users where phone = '972521111111') else null end
from (values
  ('972501111111','certificate',    'תעודת_מטפל.pdf',      true),
  ('972501111111','criminal_record','תעודת_יושר.pdf',      true),
  ('972523333333','certificate',    'תואר_חינוך_מיוחד.pdf', false),
  ('972500000001','id_card',        'תעודת_זהות.pdf',       false),
  ('972500000002','degree',         'תואר.pdf',             false)
) as v(pro_phone, doc_type, file_name, verified)
join auth.users u on u.phone = v.pro_phone
where not exists (
  select 1 from public.document_uploads d where d.owner_id = u.id and d.doc_type = v.doc_type::document_type
);

-- ============================================================
-- L) audit_log — a few TIER-3 access rows for admin analytics
-- ============================================================
insert into public.audit_log (user_id, resource, resource_id, action, tier, metadata)
select (select id from auth.users where phone = '972501111111'),
       'child_details', ch.id, 'view', 3, '{"via":"active_match"}'::jsonb
from public.children ch
join auth.users u on u.id = ch.parent_id
where u.phone = '972524627635' and ch.first_name = 'מאיה'
  and not exists (
    select 1 from public.audit_log a
    where a.resource = 'child_details' and a.resource_id = ch.id
      and a.user_id = (select id from auth.users where phone = '972501111111')
  );

-- ============================================================
-- OPTIONAL HELPERS (commented — run manually when needed)
-- ============================================================
-- Force a user back through Onboarding (S-PAR-10 / S-PRO-08): clears profile
-- completeness so app/index.tsx routes them to /(auth)/onboarding on next launch.
--   update public.profiles set full_name = null, area = null where phone = '972524627635';
--
-- Reset everything and re-seed from scratch (DESTRUCTIVE — test project only):
--   truncate public.reviews, public.daily_logs, public.checkins, public.matches,
--            public.match_requests, public.child_details, public.children,
--            public.document_uploads, public.audit_log restart identity cascade;
--   -- then re-run this whole file.

-- ============================================================
-- M) SANITY REPORT
-- ============================================================
select 'users'         as entity, count(*) from public.profiles where phone like '9725%'
union all select 'professionals', count(*) from public.professionals pr join public.profiles p on p.id=pr.user_id where p.phone like '9725%'
union all select 'children (published)', count(*) from public.children where published
union all select 'match_requests', count(*) from public.match_requests
union all select 'matches (active)', count(*) from public.matches where status='active'
union all select 'checkins', count(*) from public.checkins
union all select 'daily_logs', count(*) from public.daily_logs
union all select 'reviews', count(*) from public.reviews
union all select 'documents (pending)', count(*) from public.document_uploads where not verified
order by entity;

-- Per-account overview (the 4 login users first)
select p.phone, p.role, p.full_name,
       (u.raw_app_meta_data->>'is_admin')::boolean as is_admin,
       pr.verified as prof_verified, pr.rating_avg, pr.rating_count,
       (select count(*) from public.children c where c.parent_id = p.id) as children
from public.profiles p
join auth.users u on u.id = p.id
left join public.professionals pr on pr.user_id = p.id
where p.phone in ('972524627635','972501111111','972523333333','972521111111',
                  '972500000001','972500000002','972500000003','972500000010')
order by (p.phone in ('972524627635','972501111111','972523333333','972521111111')) desc, p.role, p.phone;

-- Together Platform — WP2: Push Notification Triggers (pg_net)
-- Migration: 20260709000000_wp2_push_triggers.sql

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ============================================================
-- notify_push: Core function to call the send-push Edge Function
-- ============================================================
create or replace function public.notify_push(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_category text default null
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_url text;
  v_key text;
begin
  -- Use Vault/settings for configuration. 
  -- In local dev without Vault, this might be null, so fallback to empty string or avoid errors.
  -- To work around local testing where current_setting might throw if not defined:
  begin
    v_url := current_setting('app.settings.functions_url', true);
    v_key := current_setting('app.settings.service_role_key', true);
  exception when others then
    v_url := null;
    v_key := null;
  end;
  
  if v_url is not null and v_url != '' then
    perform net.http_post(
      url := v_url || '/send-push',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_key
      ),
      body := jsonb_build_object(
        'user_id', p_user_id,
        'title', p_title,
        'body', p_body,
        'data', p_data,
        'category', p_category
      )
    );
  else
    -- Log it so developers know push wasn't sent due to missing config
    raise notice 'notify_push skipped: missing app.settings.functions_url';
  end if;
end; $$;

-- ============================================================
-- 1. New Request -> Professional
-- ============================================================
create or replace function public.on_match_request_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.notify_push(
    (select user_id from public.professionals where id = NEW.professional_id),
    'בקשה חדשה', 'הורה מעוניין בך — היכנס/י לצפייה.',
    jsonb_build_object('type','match_request','request_id', NEW.id)
  );
  return NEW;
end; $$;

drop trigger if exists trg_notify_new_request on public.match_requests;
create trigger trg_notify_new_request after insert on public.match_requests
  for each row execute function public.on_match_request_notify();

-- ============================================================
-- 2. Request status update (Interested / Declined) -> Parent
-- ============================================================
create or replace function public.on_match_request_update_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_parent_id uuid;
begin
  if OLD.professional_status is distinct from NEW.professional_status then
    select user_id into v_parent_id from public.children where id = NEW.child_id;
    
    if NEW.professional_status = 'interested' then
      perform public.notify_push(
        v_parent_id,
        'עדכון לבקשה', 'משלבת הביעה עניין בבקשה שלך!',
        jsonb_build_object('type','request_interested','request_id', NEW.id)
      );
    elsif NEW.professional_status = 'declined' then
      perform public.notify_push(
        v_parent_id,
        'עדכון לבקשה', 'המשלבת דחתה את הבקשה, נמשיך לחפש.',
        jsonb_build_object('type','request_declined','request_id', NEW.id)
      );
    end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_request_update on public.match_requests;
create trigger trg_notify_request_update after update on public.match_requests
  for each row execute function public.on_match_request_update_notify();

-- ============================================================
-- 3. Match Created (Parent Approved) -> Professional
-- ============================================================
create or replace function public.on_match_insert_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_prof_user_id uuid;
begin
  select user_id into v_prof_user_id from public.professionals where id = NEW.professional_id;
  
  perform public.notify_push(
    v_prof_user_id,
    'התאמה אושרה!', 'ההורה אישר את ההתאמה והיא כעת פעילה. היכנס/י לפרטים.',
    jsonb_build_object('type','match_created','match_id', NEW.id)
  );
  return NEW;
end; $$;

drop trigger if exists trg_notify_match_created on public.matches;
create trigger trg_notify_match_created after insert on public.matches
  for each row execute function public.on_match_insert_notify();

-- ============================================================
-- 4. Professional Verification & Document Rejection
-- ============================================================
create or replace function public.on_professional_update_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if OLD.verification_status is distinct from NEW.verification_status then
    if NEW.verification_status = 'verified' then
      perform public.notify_push(
        NEW.user_id,
        'הפרופיל אומת!', 'כעת תוכלי לקבל בקשות ממשפחות.',
        jsonb_build_object('type','professional_verified')
      );
    elsif NEW.verification_status = 'rejected' then
      perform public.notify_push(
        NEW.user_id,
        'עדכון אימות פרופיל', 'ישנה בעיה באימות הפרופיל שלך. אנא היכנס/י לפרטים.',
        jsonb_build_object('type','professional_rejected')
      );
    end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_professional_update on public.professionals;
create trigger trg_notify_professional_update after update on public.professionals
  for each row execute function public.on_professional_update_notify();

create or replace function public.on_document_update_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_prof_user_id uuid;
begin
  if OLD.status is distinct from NEW.status and NEW.status = 'rejected' then
    select user_id into v_prof_user_id from public.professionals where id = NEW.professional_id;
    perform public.notify_push(
      v_prof_user_id,
      'עדכון מסמך', 'אחד המסמכים שהעלית נדחה. אנא העלה/י מחדש.',
      jsonb_build_object('type','document_rejected','document_id', NEW.id)
    );
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_document_update on public.document_uploads;
create trigger trg_notify_document_update after update on public.document_uploads
  for each row execute function public.on_document_update_notify();

-- ============================================================
-- 5. Checkin & Daily Summary (Daily Logs)
-- ============================================================
create or replace function public.on_daily_log_insert_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_parent_id uuid;
begin
  if NEW.check_in_time is not null then
    select c.user_id into v_parent_id
      from public.matches m join public.children c on m.child_id = c.id
     where m.id = NEW.match_id;
     
    perform public.notify_push(
      v_parent_id,
      'עדכון', 'המשלבת ביצעה check-in למסגרת.',
      jsonb_build_object('type','checkin','log_id', NEW.id),
      'checkin'
    );
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_daily_log_insert on public.daily_logs;
create trigger trg_notify_daily_log_insert after insert on public.daily_logs
  for each row execute function public.on_daily_log_insert_notify();

create or replace function public.on_daily_log_update_notify() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_parent_id uuid;
begin
  if OLD.ai_summary is null and NEW.ai_summary is not null then
    select c.user_id into v_parent_id
      from public.matches m join public.children c on m.child_id = c.id
     where m.id = NEW.match_id;
     
    perform public.notify_push(
      v_parent_id,
      'סיכום יומי', 'הסיכום היומי מוכן, היכנס/י לקרוא.',
      jsonb_build_object('type','daily_summary_ready','log_id', NEW.id),
      'daily_summary'
    );
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_daily_log_update on public.daily_logs;
create trigger trg_notify_daily_log_update after update on public.daily_logs
  for each row execute function public.on_daily_log_update_notify();

-- ============================================================
-- 6. CRON Jobs
-- ============================================================
-- Cron for daily log reminder at 13:00
select cron.schedule(
  'daily-log-reminder',
  '0 13 * * *',
  $$
    select public.notify_push(
      p.user_id,
      'תזכורת סיכום יומי',
      'לא לשכוח למלא את השאלון היומי של היום.',
      jsonb_build_object('type','daily_log_reminder','match_id', m.id)
    )
    from public.matches m
    join public.professionals p on m.professional_id = p.id
    where m.status = 'active'
      and not exists (
        select 1 from public.daily_logs dl 
        where dl.match_id = m.id and dl.created_at::date = current_date
      )
  $$
);

-- Cron for 7 days no answer request
select cron.schedule(
  'request-no-answer-7-days',
  '0 9 * * *',
  $$
    select public.notify_push(
      p.user_id,
      'תזכורת בקשה פתוחה',
      'יש לך בקשות המחכות לתשובתך כבר יותר מ-7 ימים.',
      jsonb_build_object('type','request_no_answer')
    )
    from public.match_requests r
    join public.professionals p on r.professional_id = p.id
    where r.status = 'pending' and r.professional_status = 'pending'
      and r.created_at < now() - interval '7 days'
    group by p.user_id
  $$
);

-- Cron for review request 24h after match ended
select cron.schedule(
  'review-request-after-ended',
  '0 10 * * *',
  $$
    select public.notify_push(
      c.user_id,
      'בקשת דירוג',
      'איך היתה המשלבת? נשמח אם תשאיר/י דירוג.',
      jsonb_build_object('type','review_request','match_id', m.id)
    )
    from public.matches m
    join public.children c on m.child_id = c.id
    where m.status = 'ended'
      and m.updated_at >= now() - interval '48 hours'
      and m.updated_at < now() - interval '24 hours'
      and not exists (
        select 1 from public.reviews rv where rv.match_id = m.id
      )
  $$
);

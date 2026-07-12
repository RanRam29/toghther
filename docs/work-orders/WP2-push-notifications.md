# WP2 — תשתית Push Notifications

> **בעלים:** Antigravity (טבלה+טריגרים+Edge) → Cursor (רישום token+הרשאה+הגדרות) · **תלוי ב:** WP1 · **אבן דרך:** 2
> **מטרה:** לולאת המרקטפלייס חיה — כל אירוע state machine שולח push. בלי זה המשתמשים לא חוזרים.
> קרא: `PRODUCT_UX_SPEC.md` חלק 6 (מטריצת ההתראות) · `product/01-DECISIONS.md` D22 · `docs/AUTH-SPEC.md`.

## שלב A — Backend (Antigravity)

> **סטטוס (2026-07-08):** היסוד נכתב ע"י הארכיטקט: מיגרציה `20260708140000_wp2_push_foundation.sql` (טבלאות `push_tokens` + `notification_prefs` + RLS "own only" + updated_at) ו-Edge Function `supabase/functions/send-push` (רשום ב-`config.toml`: שולף tokens, מכבד opt-out לקטגוריות `checkin`/`daily_summary`, קורא ל-Expo Push, מנקה `DeviceNotRegistered`). **נותר (תלוי-ענן):** חיווט הטריגרים דרך pg_net + Vault (סעיף 4 למטה).

1. ✅ **טבלה `push_tokens`** — נכתב (UNIQUE(user_id,token) + RLS own-only).
2. ✅ **טבלת `notification_prefs`** — נכתב (checkin, daily_summary opt-out; אירועי לולאה תמיד נשלחים).
3. ✅ **Edge Function `send-push`** — נכתב (service role, ניקוי tokens מתים, opt-out).
4. ⬜ **טריגרים → `send-push`** (Antigravity — דורש `pg_net` + סודות ב-Vault). תבנית מוכנה:
   ```sql
   -- דורש: create extension pg_net;  + הגדרת app.settings.functions_url / service_role_key (Vault / alter database set)
   create or replace function public.notify_push(p_user_id uuid, p_title text, p_body text,
                                                 p_data jsonb default '{}', p_category text default null)
   returns void language plpgsql security definer set search_path = public, pg_temp as $$
   begin
     perform net.http_post(
       url := current_setting('app.settings.functions_url', true) || '/send-push',
       headers := jsonb_build_object('Content-Type','application/json',
                                     'Authorization','Bearer '||current_setting('app.settings.service_role_key', true)),
       body := jsonb_build_object('user_id',p_user_id,'title',p_title,'body',p_body,'data',p_data,'category',p_category));
   end; $$;

   -- דוגמה: בקשה חדשה → למשלבת (בלי PII)
   create or replace function public.on_match_request_notify() returns trigger
   language plpgsql security definer set search_path = public, pg_temp as $$
   begin
     perform notify_push((select user_id from professionals where id = NEW.professional_id),
       'בקשה חדשה', 'הורה מעוניין בך — היכנס/י לצפייה.',
       jsonb_build_object('type','match_request','request_id',NEW.id));
     return NEW;
   end; $$;
   create trigger trg_notify_new_request after insert on match_requests
     for each row execute function on_match_request_notify();
   ```
   **כיסוי אירועים נדרש:** בקשה חדשה · `respond`→interested · `approve_request` · `create_match_from_request` · אימות משלבת · דחיית מסמך · checkin (category=`checkin`) · סיכום יומי מוכן (category=`daily_summary`) · תזכורת שאלון (pg_cron 13:00) · בקשה ללא מענה 7 ימים (pg_cron) · בקשת דירוג (24ש' אחרי ended, pg_cron).
5. ✅ **בלי PII** — ה-payloads בתבנית נטולי שם/אבחנה ("הורה מעוניין בך"). לשמר בכל הטריגרים.

## שלב B — Client (Cursor)

1. `expo-notifications`: בקשת הרשאה **ברגע הצדקה** (D22 — אחרי שליחת בקשה ראשונה / קבלת אימות), עם מסך הסבר מקדים.
2. רישום Expo push token → `push_tokens` בהתחברות; מחיקה ב-logout.
3. Handlers: foreground (banner in-app) + tap → deep link למסך הרלוונטי (בקשה/match). ולידציית session לפני ניווט לפעולה רגישה.
4. מסך הגדרות התראות (S-SHARED-02): מתגים פר-קטגוריה ↔ העדפות בשרת.

## Definition of Done
- [ ] push מתקבל פיזית ב-iOS+Android לפחות ב-3 אירועי הליבה (בקשה, אישור, אימות)
- [ ] opt-out עובד: קטגוריה מכובה לא שולחת
- [ ] token מתווסף בהתחברות ונמחק ב-logout; tokens מתים מנוקים
- [ ] הרשאה מבוקשת רק ברגע הצורך עם הסבר (D22)
- [ ] אין PII בגוף ההודעה — אומת
- [ ] E2E דו-מכשירי של לולאת בקשה→אישור עם push בכל צומת

-- Migration: Automated Ops Room (Phase 1.5)
-- Schedules a CRON job to alert professionals and admins about matches with no activity for 3 days.

-- 1. Notify the Professional
SELECT cron.schedule(
  'ops-room-prof-nudge',
  '0 9 * * *',
  $$
    SELECT public.notify_push(
      p.user_id,
      'הכל בסדר?',
      'שמנו לב שלא דיווחת נוכחות או סיכום יומי ב-3 הימים האחרונים. הכל תקין?',
      jsonb_build_object('type', 'ops_nudge', 'match_id', m.id)
    )
    FROM public.matches m
    JOIN public.professionals p ON m.professional_id = p.id
    WHERE m.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.checkins c 
        WHERE c.match_id = m.id AND c.created_at >= now() - interval '3 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_logs d 
        WHERE d.match_id = m.id AND d.log_date >= current_date - 3
      )
  $$
);

-- 2. Notify Admins
SELECT cron.schedule(
  'ops-room-admin-alert',
  '0 9 * * *',
  $$
    SELECT public.notify_push(
      u.id,
      'התראת חמ"ל: חוסר פעילות',
      'ישנם התאמות פעילות ללא דיווח מעל 3 ימים. נא להיכנס לאזור המנהל לבדיקה.',
      jsonb_build_object('type', 'admin_ops_alert')
    )
    FROM auth.users u
    WHERE u.raw_user_meta_data->>'role' = 'admin'
      AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM public.checkins c 
            WHERE c.match_id = m.id AND c.created_at >= now() - interval '3 days'
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.daily_logs d 
            WHERE d.match_id = m.id AND d.log_date >= current_date - 3
          )
      )
  $$
);

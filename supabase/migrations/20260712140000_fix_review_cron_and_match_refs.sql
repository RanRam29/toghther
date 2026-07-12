-- Fix review-request cron: matches has ended_at (not updated_at); children has parent_id (not user_id)
SELECT cron.unschedule('review-request-after-ended');

SELECT cron.schedule(
  'review-request-after-ended',
  '0 10 * * *',
  $$
    SELECT public.notify_push(
      c.parent_id,
      'בקשת דירוג',
      'איך היתה המשלבת? נשמח אם תשאיר/י דירוג.',
      jsonb_build_object('type','review_request','match_id', m.id),
      'reviews'
    )
    FROM public.matches m
    JOIN public.children c ON m.child_id = c.id
    WHERE m.status = 'ended'
      AND m.ended_at IS NOT NULL
      AND m.ended_at >= now() - interval '48 hours'
      AND m.ended_at < now() - interval '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.reviews rv
        WHERE rv.match_id = m.id AND rv.reviewer_id = c.parent_id
      )
  $$
);

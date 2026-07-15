-- WP15: Waitlist Engine and Quick Replace

-- 1. Create waitlist_notifications tracking table
CREATE TABLE IF NOT EXISTS public.waitlist_notifications (
    child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    last_notified_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (child_id)
);

-- Enable RLS (though mostly manipulated by triggers)
ALTER TABLE public.waitlist_notifications ENABLE ROW LEVEL SECURITY;

-- Parents can view their own children's notification records (for debugging/completeness)
CREATE POLICY "Parents can view waitlist notifications for their children" ON public.waitlist_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = waitlist_notifications.child_id
        AND c.parent_id = auth.uid()
    )
  );

-- 2. Function to check and notify waitlist when a professional is updated
CREATE OR REPLACE FUNCTION public.check_waitlist_for_professional(p_pro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_child record;
  v_match record;
  v_old_claims text;
BEGIN
  -- Save the current JWT claims to restore them later
  v_old_claims := current_setting('request.jwt.claims', true);

  FOR v_child IN (
    SELECT c.id, c.parent_id, c.first_name
    FROM public.children c
    LEFT JOIN public.waitlist_notifications wn ON c.id = wn.child_id
    WHERE c.deleted_at IS NULL 
      AND c.published = true
      -- Ensure no active or paused match exists for this child
      AND NOT EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.child_id = c.id AND m.status IN ('active', 'paused')
      )
      -- Ensure no notification sent in the last 7 days (D56)
      AND (wn.last_notified_at IS NULL OR wn.last_notified_at < now() - interval '7 days')
  ) LOOP
    -- Mock the JWT claims as if the parent is calling
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_child.parent_id), true);

    -- Check if this specific professional matches with score >= 50
    SELECT * INTO v_match
    FROM public.get_matches_for_child(v_child.id)
    WHERE professional_id = p_pro_id AND score >= 50
    LIMIT 1;

    IF FOUND THEN
      -- Found a match! Send Push Notification
      PERFORM public.notify_push(
        v_child.parent_id,
        'התאמה חדשה',
        'משלבת חדשה שמתאימה ל' || v_child.first_name || ' הצטרפה. לחצ/י לפרטים.',
        jsonb_build_object('type', 'waitlist_match_found'),
        'waitlist_match'
      );

      -- Update the tracking table
      INSERT INTO public.waitlist_notifications (child_id, last_notified_at)
      VALUES (v_child.id, now())
      ON CONFLICT (child_id) DO UPDATE SET last_notified_at = now();
    END IF;
  END LOOP;

  -- Restore original claims
  IF v_old_claims IS NULL OR v_old_claims = '' THEN
    PERFORM set_config('request.jwt.claims', '', true);
  ELSE
    PERFORM set_config('request.jwt.claims', v_old_claims, true);
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Ensure we restore claims even if something fails
  IF v_old_claims IS NULL OR v_old_claims = '' THEN
    PERFORM set_config('request.jwt.claims', '', true);
  ELSE
    PERFORM set_config('request.jwt.claims', v_old_claims, true);
  END IF;
  RAISE;
END;
$$;

-- 3. Trigger on `professionals` table
CREATE OR REPLACE FUNCTION public.on_professional_update_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  -- We only want to trigger this if there's a relevant change:
  -- 1. Became verified
  -- 2. Availability changed
  -- 3. Location changed
  -- (and must be currently verified)
  IF NEW.verified = 'verified' AND (
    (OLD.verified != 'verified') OR
    (OLD.availability IS DISTINCT FROM NEW.availability) OR
    (OLD.location IS DISTINCT FROM NEW.location)
  ) THEN
    -- To avoid blocking the update transaction for a long time, we could use pg_net 
    -- but for MVP, inline execution is fine. 
    -- We'll just call the function directly.
    PERFORM public.check_waitlist_for_professional(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_professional_waitlist ON public.professionals;
CREATE TRIGGER trigger_professional_waitlist
  AFTER UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.on_professional_update_waitlist();


-- 4. Expiring request reminder for parent (Cron job function)
CREATE OR REPLACE FUNCTION public.cron_notify_parent_expiring_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_req record;
BEGIN
  -- Find requests that were created between 12 and 13 days ago (they expire in 14 days)
  FOR v_req IN (
    SELECT mr.id, c.user_id as parent_id, p.display_name as pro_name
    FROM public.match_requests mr
    JOIN public.children c ON mr.child_id = c.id
    JOIN public.professionals p ON mr.professional_id = p.id
    WHERE mr.status = 'pending'
      AND mr.created_at >= (now() - interval '13 days')
      AND mr.created_at < (now() - interval '12 days')
  ) LOOP
    PERFORM public.notify_push(
      v_req.parent_id,
      'תזכורת לפקיעת בקשה',
      'הבקשה שנשלחה ל' || v_req.pro_name || ' תפוג בעוד יומיים. לחצ/י כדי למצוא התאמות נוספות.',
      jsonb_build_object('type', 'parent_request_expiring', 'request_id', v_req.id),
      'request_expiring'
    );
  END LOOP;
END;
$$;

-- Note: We assume the actual pg_cron extension scheduling is handled centrally 
-- or we can schedule it here:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule to run daily at 10:00 AM (10:00 UTC)
    PERFORM cron.schedule(
      'notify_parent_expiring_requests',
      '0 10 * * *',
      'SELECT public.cron_notify_parent_expiring_requests();'
    );
  END IF;
END $$;

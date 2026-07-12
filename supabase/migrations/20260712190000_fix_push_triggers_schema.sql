-- Fix push notification triggers referencing non-existent columns
-- (professional_status, verification_status, children.user_id, document status)

CREATE OR REPLACE FUNCTION public.on_match_request_update_notify()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT c.parent_id INTO v_parent_id
    FROM public.children c
    WHERE c.id = NEW.child_id;

    IF NEW.status = 'interested' THEN
      PERFORM public.notify_push(
        v_parent_id,
        'עדכון לבקשה', 'משלבת הביעה עניין בבקשה שלך!',
        jsonb_build_object('type', 'request_interested', 'request_id', NEW.id),
        'match_requests'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_push(
        v_parent_id,
        'עדכון לבקשה', 'המשלבת דחתה את הבקשה, נמשיך לחפש.',
        jsonb_build_object('type', 'request_declined', 'request_id', NEW.id),
        'match_requests'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_professional_update_notify()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.verified IS DISTINCT FROM NEW.verified THEN
    IF NEW.verified = 'verified' THEN
      PERFORM public.notify_push(
        NEW.user_id,
        'הפרופיל אומת!', 'כעת תוכלי לקבל בקשות ממשפחות.',
        jsonb_build_object('type', 'professional_verified'),
        'verification'
      );
    ELSIF NEW.verified = 'rejected' THEN
      PERFORM public.notify_push(
        NEW.user_id,
        'עדכון אימות פרופיל', 'ישנה בעיה באימות הפרופיל שלך. אנא היכנס/י לפרטים.',
        jsonb_build_object('type', 'professional_rejected'),
        'verification'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_document_update_notify()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.rejection_note IS NULL AND NEW.rejection_note IS NOT NULL THEN
    PERFORM public.notify_push(
      NEW.owner_id,
      'עדכון מסמך', 'אחד המסמכים שהעלית נדחה. אנא העלה/י מחדש.',
      jsonb_build_object('type', 'document_rejected', 'document_id', NEW.id),
      'verification'
    );
  END IF;
  RETURN NEW;
END;
$$;

SELECT cron.unschedule('request-no-answer-7-days');
SELECT cron.schedule(
  'request-no-answer-7-days',
  '0 9 * * *',
  $$
    SELECT public.notify_push(
      p.user_id,
      'תזכורת בקשה פתוחה',
      'יש לך בקשות המחכות לתשובתך כבר יותר מ-7 ימים.',
      jsonb_build_object('type', 'request_no_answer'),
      'match_requests'
    )
    FROM public.match_requests r
    JOIN public.professionals p ON r.professional_id = p.id
    WHERE r.status = 'pending'
      AND r.created_at < now() - interval '7 days'
    GROUP BY p.user_id
  $$
);

CREATE OR REPLACE FUNCTION public.get_live_ops_alerts()
RETURNS TABLE (
  alert_id text,
  alert_type text,
  severity text,
  resource_id uuid,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    'inactive_' || m.id::text,
    'INACTIVE_MATCH'::text,
    'HIGH'::text,
    m.id,
    jsonb_build_object(
      'child_name', c.first_name,
      'prof_id', p.id,
      'last_activity', (SELECT max(ck.created_at) FROM public.checkins ck WHERE ck.match_id = m.id)
    ),
    now()
  FROM public.matches m
  JOIN public.children c ON m.child_id = c.id
  JOIN public.professionals p ON m.professional_id = p.id
  WHERE m.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.checkins ck
      WHERE ck.match_id = m.id AND ck.created_at >= now() - interval '3 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_logs d
      WHERE d.match_id = m.id AND d.log_date >= current_date - 3
    )

  UNION ALL

  SELECT
    'pending_prof_' || p.id::text,
    'PENDING_PROFESSIONAL'::text,
    'MEDIUM'::text,
    p.id,
    jsonb_build_object('user_id', p.user_id, 'days_waiting', EXTRACT(DAY FROM now() - p.created_at)),
    now()
  FROM public.professionals p
  WHERE p.verified = 'submitted'
    AND p.created_at <= now() - interval '2 days'

  UNION ALL

  SELECT
    'stale_req_' || r.id::text,
    'STALE_REQUEST'::text,
    'MEDIUM'::text,
    r.id,
    jsonb_build_object('child_name', c.first_name, 'days_waiting', EXTRACT(DAY FROM now() - r.created_at)),
    now()
  FROM public.match_requests r
  JOIN public.children c ON r.child_id = c.id
  WHERE r.status = 'pending'
    AND r.created_at <= now() - interval '7 days';
END;
$$;

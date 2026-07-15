-- Fix missing match_id in checkin and daily_summary_ready push notification payloads (WP17 Stage D.5)

CREATE OR REPLACE FUNCTION public.on_daily_log_insert_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  IF NEW.check_in_time IS NOT NULL THEN
    SELECT c.parent_id INTO v_parent_id
      FROM public.matches m JOIN public.children c ON m.child_id = c.id
     WHERE m.id = NEW.match_id;

    PERFORM public.notify_push(
      v_parent_id,
      'עדכון', 'המשלבת ביצעה check-in למסגרת.',
      jsonb_build_object('type','checkin','log_id', NEW.id, 'match_id', NEW.match_id),
      'checkin'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_daily_log_update_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  IF OLD.ai_summary IS NULL AND NEW.ai_summary IS NOT NULL THEN
    SELECT c.parent_id INTO v_parent_id
      FROM public.matches m JOIN public.children c ON m.child_id = c.id
     WHERE m.id = NEW.match_id;

    PERFORM public.notify_push(
      v_parent_id,
      'סיכום יומי', 'הסיכום היומי מוכן, היכנס/י לקרוא.',
      jsonb_build_object('type','daily_summary_ready','log_id', NEW.id, 'match_id', NEW.match_id),
      'daily_summary'
    );
  END IF;
  RETURN NEW;
END;
$$;

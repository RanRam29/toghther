-- Together Platform — WP5: Daily Operations (Metrics, Checkin, AI, Reviews)
-- Migration: 20260709110000_wp5_daily_ops.sql

-- ============================================================
-- 1. METRICS CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.metric_catalog (
  key TEXT PRIMARY KEY,
  he_label TEXT NOT NULL,
  en_label TEXT NOT NULL,
  categories public.need_category[] NOT NULL DEFAULT '{}',
  is_core BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.metric_catalog (key, he_label, en_label, is_core, categories) VALUES
('regulation', 'ויסות רגשי', 'Emotion Regulation', true, '{}'),
('transitions', 'מעברים בין פעילויות', 'Transitions', true, '{}'),
('social_initiative', 'יוזמות חברתיות', 'Social Initiative', true, '{}'),
('task_persistence', 'התמדה במשימה', 'Task Persistence', true, '{}'),
('cooperation', 'שיתוף פעולה עם הנחיות', 'Cooperation', true, '{}'),
('independence', 'עצמאות בפעילויות', 'Independence', true, '{intellectual}'),
('communication_attempts', 'יוזמות תקשורת', 'Communication Attempts', false, '{autism, speech}'),
('flexibility', 'גמישות מחשבתית', 'Flexibility', false, '{autism}'),
('sensory_regulation', 'ויסות חושי', 'Sensory Regulation', false, '{autism}'),
('peer_interaction', 'משחק משותף', 'Peer Interaction', false, '{autism}'),
('focus_duration', 'רצפי קשב', 'Focus Duration', false, '{adhd}'),
('impulse_control', 'עצירה לפני תגובה', 'Impulse Control', false, '{adhd}'),
('organization', 'התארגנות', 'Organization', false, '{adhd}'),
('task_confidence', 'ביטחון מול משימה לימודית', 'Task Confidence', false, '{learning_disability}'),
('help_seeking', 'בקשת עזרה מותאמת', 'Help Seeking', false, '{learning_disability}'),
('frustration_tolerance', 'התמודדות עם קושי', 'Frustration Tolerance', false, '{learning_disability}'),
('mood_stability', 'יציבות מצב רוח', 'Mood Stability', false, '{emotional}'),
('separation', 'פרידה בבוקר', 'Separation', false, '{emotional}'),
('expression', 'ביטוי רגשות', 'Expression', false, '{emotional}'),
('intelligibility', 'מובנות הדיבור', 'Intelligibility', false, '{speech}'),
('aac_usage', 'שימוש בתת"ח', 'AAC Usage', false, '{speech}'),
('mobility_participation', 'השתתפות בפעילות פיזית', 'Mobility Participation', false, '{physical, hearing, vision}'),
('aid_usage', 'שימוש באמצעי עזר', 'Aid Usage', false, '{physical, hearing, vision}'),
('peer_inclusion', 'הכללה חברתית', 'Peer Inclusion', false, '{physical, hearing, vision}'),
('instruction_following', 'הבנת הוראות', 'Instruction Following', false, '{intellectual}'),
('daily_skills', 'כישורי יומיום', 'Daily Skills', false, '{intellectual}')
ON CONFLICT (key) DO UPDATE SET 
  he_label = EXCLUDED.he_label, 
  en_label = EXCLUDED.en_label, 
  categories = EXCLUDED.categories, 
  is_core = EXCLUDED.is_core;

ALTER TABLE public.metric_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY metric_catalog_read_all ON public.metric_catalog FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.get_metrics_for_child(p_child_id UUID)
RETURNS SETOF public.metric_catalog AS $$
DECLARE
  v_category public.need_category;
BEGIN
  SELECT category INTO v_category FROM public.children WHERE id = p_child_id;
  RETURN QUERY 
    SELECT * FROM public.metric_catalog 
    WHERE is_core = true OR v_category = ANY(categories);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. MATCH METRICS
-- ============================================================
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS metric_keys TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.set_match_metrics(p_match_id UUID, p_keys TEXT[])
RETURNS void AS $$
DECLARE
  v_child_parent UUID;
BEGIN
  SELECT c.parent_id INTO v_child_parent 
  FROM public.matches m JOIN public.children c ON c.id = m.child_id 
  WHERE m.id = p_match_id;

  IF v_child_parent != auth.uid() THEN
    RAISE EXCEPTION 'Only the parent can set metrics for a match';
  END IF;

  IF array_length(p_keys, 1) != 3 THEN
    RAISE EXCEPTION 'Exactly 3 metrics must be selected';
  END IF;

  UPDATE public.matches SET metric_keys = p_keys WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. CHECKIN PUSH NOTIFICATION FIX
-- ============================================================
-- Drop the old daily_logs insert trigger which incorrectly checked check_in_time
DROP TRIGGER IF EXISTS trg_notify_daily_log_insert ON public.daily_logs;
DROP FUNCTION IF EXISTS public.on_daily_log_insert_notify();

-- Update the daily_summary ready trigger to also fix c.user_id to c.parent_id
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
      jsonb_build_object('type','daily_summary_ready','log_id', NEW.id),
      'daily_summary'
    );
  END IF;
  RETURN NEW;
END; $$;

-- Create proper trigger on checkins
CREATE OR REPLACE FUNCTION public.on_checkin_insert_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT c.parent_id INTO v_parent_id
  FROM public.matches m JOIN public.children c ON m.child_id = c.id
  WHERE m.id = NEW.match_id;
  
  PERFORM public.notify_push(
    v_parent_id,
    'עדכון נוכחות', 'המשלבת ביצעה check-in למסגרת.',
    jsonb_build_object('type','checkin','checkin_id', NEW.id, 'is_valid', NEW.is_valid),
    'checkin'
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_checkin_insert ON public.checkins;
CREATE TRIGGER trg_notify_checkin_insert AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.on_checkin_insert_notify();

-- ============================================================
-- 4. DAILY LOG AI PROCESSING WEBHOOK
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_daily_log_upsert_webhook() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.ai_summary IS NULL THEN
    BEGIN
      v_url := current_setting('app.settings.functions_url', true);
      v_key := current_setting('app.settings.service_role_key', true);
    EXCEPTION WHEN others THEN
      v_url := null;
      v_key := null;
    END;

    IF v_url IS NOT NULL AND v_url != '' THEN
      PERFORM net.http_post(
        url := v_url || '/process-daily-log',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA,
          'record', row_to_json(NEW),
          'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_process_daily_log ON public.daily_logs;
CREATE TRIGGER trg_process_daily_log AFTER INSERT OR UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.on_daily_log_upsert_webhook();

-- ============================================================
-- 5. BLIND REVIEWS
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_review(
  p_match_id UUID,
  p_criteria JSONB,
  p_text TEXT
) RETURNS void AS $$
DECLARE
  v_match RECORD;
  v_role public.reviewer_role;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  
  IF v_match.status != 'ended' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for ended matches';
  END IF;

  -- Determine role. Check if caller is professional
  IF v_match.professional_id = public.get_professional_id() THEN
    v_role := 'professional';
  -- Else check if caller is parent
  ELSIF (SELECT parent_id FROM public.children WHERE id = v_match.child_id) = auth.uid() THEN
    v_role := 'parent';
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Check if already reviewed
  IF EXISTS (SELECT 1 FROM public.reviews WHERE match_id = p_match_id AND reviewer_id = auth.uid()) THEN
    RAISE EXCEPTION 'Review already submitted';
  END IF;

  INSERT INTO public.reviews (
    match_id, reviewer_id, reviewer_role,
    reliability, professionalism, child_fit, text
  )
  VALUES (
    p_match_id, auth.uid(), v_role,
    (p_criteria->>'reliability')::int,
    (p_criteria->>'professionalism')::int,
    (p_criteria->>'child_fit')::int,
    nullif(trim(p_text), '')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for blind reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_read_own ON public.reviews;
CREATE POLICY reviews_read_own ON public.reviews FOR SELECT
USING (reviewer_id = auth.uid());

DROP POLICY IF EXISTS reviews_read_blind ON public.reviews;
CREATE POLICY reviews_read_blind ON public.reviews FOR SELECT
USING (
  reviewer_id != auth.uid() AND (
    EXISTS (SELECT 1 FROM public.reviews r2 WHERE r2.match_id = reviews.match_id AND r2.reviewer_id = auth.uid())
    OR (SELECT ended_at FROM public.matches WHERE id = reviews.match_id) < now() - interval '14 days'
  )
);

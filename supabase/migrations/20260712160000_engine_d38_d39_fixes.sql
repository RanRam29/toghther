-- Migration: Engine Fixes (D38-D39)
-- 1. availability_overlaps updated to 25% overlap threshold.
-- 2. get_matches_for_child updated to remove tenure points and distribute to rating/category.

-- Insert the new system config key if not exists
INSERT INTO public.system_config (key, value, updated_by)
VALUES ('availability_match_threshold_pct', '0.25'::jsonb, NULL)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.availability_overlaps(avail jsonb, needed jsonb)
RETURNS boolean AS $$
DECLARE
  v_day text;
  v_avail_range jsonb;
  v_needed_range jsonb;
  v_avail_start numeric;
  v_avail_end numeric;
  v_needed_start numeric;
  v_needed_end numeric;
  v_total_needed numeric := 0;
  v_total_overlap numeric := 0;
  v_threshold numeric := 0.25;
BEGIN
  IF avail IS NULL OR needed IS NULL THEN RETURN true; END IF;
  IF needed = '{}'::jsonb THEN RETURN true; END IF;

  -- Attempt to get threshold from config
  BEGIN
    SELECT COALESCE((value::text)::numeric, 0.25) INTO v_threshold
    FROM public.system_config
    WHERE key = 'availability_match_threshold_pct';
  EXCEPTION WHEN OTHERS THEN
    v_threshold := 0.25;
  END;

  FOR v_day IN SELECT jsonb_object_keys(needed)
  LOOP
    v_needed_range := needed->v_day;
    IF jsonb_array_length(v_needed_range) >= 2 THEN
      v_needed_start := (v_needed_range->>0)::numeric;
      v_needed_end := (v_needed_range->>1)::numeric;
      IF v_needed_end > v_needed_start THEN
        v_total_needed := v_total_needed + (v_needed_end - v_needed_start);
        
        IF avail ? v_day THEN
          v_avail_range := avail->v_day;
          IF jsonb_array_length(v_avail_range) >= 2 THEN
            v_avail_start := (v_avail_range->>0)::numeric;
            v_avail_end := (v_avail_range->>1)::numeric;
            IF GREATEST(v_avail_start, v_needed_start) < LEAST(v_avail_end, v_needed_end) THEN
              v_total_overlap := v_total_overlap + (LEAST(v_avail_end, v_needed_end) - GREATEST(v_avail_start, v_needed_start));
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  IF v_total_needed <= 0 THEN RETURN true; END IF;
  
  RETURN (v_total_overlap / v_total_needed) >= v_threshold;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_matches_for_child(
  p_child_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  professional_id UUID,
  display_name TEXT,
  bio TEXT,
  specialties need_category[],
  experience_years INTEGER,
  rating_avg NUMERIC,
  rating_count INTEGER,
  distance_km NUMERIC,
  score NUMERIC,
  match_reason TEXT
) AS $func$
DECLARE
  v_child RECORD;
BEGIN
  -- Get child info
  SELECT
    c.category,
    c.secondary_category,
    c.functioning_level,
    c.framework,
    c.communication_verbal,
    c.communication_language,
    c.hours_needed,
    c.location,
    c.needs
  INTO v_child
  FROM public.children c
  WHERE c.id = p_child_id
    AND (c.parent_id = auth.uid() OR public.get_user_role() = 'admin');

  IF v_child IS NULL THEN
    RAISE EXCEPTION 'Child not found or access denied';
  END IF;

  RETURN QUERY
  WITH filtered_professionals AS (
    SELECT
      p.id,
      p.user_id,
      p.display_name,
      p.bio,
      p.specialties,
      p.experience_years,
      p.rating_avg,
      p.rating_count,
      p.location AS pro_location,
      p.availability,
      p.languages,
      p.framework_types,
      ROUND(
        (ST_Distance(
          p.location::geography,
          v_child.location::geography
        ) / 1000.0)::numeric, 1
      ) AS dist_km
    FROM public.professionals p
    WHERE
      p.verified = 'verified'
      AND ST_DWithin(
        p.location::geography,
        v_child.location::geography,
        COALESCE(p.max_radius_km, 15) * 1000.0
      )
      AND (
        p.framework_types = '{}' 
        OR v_child.framework = ANY(p.framework_types)
      )
      -- Hard filter: Language
      AND (v_child.communication_language IS NULL OR v_child.communication_language = ANY(p.languages))
      -- Hard filter: Availability (now using 25% coverage rule)
      AND public.availability_overlaps(p.availability, v_child.hours_needed)
      AND NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.professional_id = p.id
          AND m.child_id = p_child_id
          AND m.status = 'active'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.match_requests mr
        WHERE mr.professional_id = p.id
          AND mr.child_id = p_child_id
          AND mr.status IN ('pending', 'interested')
      )
  ),
  scored_professionals AS (
    SELECT
      fp.*,
      (
        CASE
          WHEN v_child.category = ANY(fp.specialties) THEN 40 -- Was 30 (+10)
          WHEN v_child.secondary_category IS NOT NULL
               AND v_child.secondary_category = ANY(fp.specialties) THEN 15
          ELSE 0
        END
        + LEAST(COALESCE(fp.experience_years, 0) * 2, 20)
        + CASE
            WHEN fp.rating_count >= 3 THEN ROUND(fp.rating_avg * 5, 0) -- Was *4 (+5 max)
            ELSE 5
          END
        + CASE
            WHEN fp.dist_km <= 2 THEN 15
            WHEN fp.dist_km <= 5 THEN 12
            WHEN fp.dist_km <= 10 THEN 8
            WHEN fp.dist_km <= 15 THEN 4
            ELSE 0
          END
        -- REMOVED: 15 points for tenure based on user_id created_at
      )::NUMERIC AS total_score
    FROM filtered_professionals fp
  )
  SELECT
    sp.id AS professional_id,
    sp.display_name,
    sp.bio,
    sp.specialties,
    sp.experience_years,
    sp.rating_avg,
    sp.rating_count,
    sp.dist_km AS distance_km,
    sp.total_score AS score,
    CONCAT_WS(' · ',
      CASE WHEN v_child.category = ANY(sp.specialties)
           THEN 'ניסיון עם ' || v_child.category::TEXT
           ELSE NULL END,
      CASE WHEN sp.experience_years >= 3
           THEN sp.experience_years || ' שנות ניסיון'
           ELSE NULL END,
      CASE WHEN sp.rating_count >= 3
           THEN 'דירוג ' || ROUND(sp.rating_avg, 1) || '/5'
           ELSE NULL END,
      sp.dist_km || ' ק"מ'
    ) AS match_reason
  FROM scored_professionals sp
  ORDER BY sp.total_score DESC
  LIMIT p_limit;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

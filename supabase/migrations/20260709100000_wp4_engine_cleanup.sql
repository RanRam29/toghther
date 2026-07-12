-- Together Platform — WP4: Engine Cleanup (Hard filters & AI Cache)
-- Migration: 20260709100000_wp4_engine_cleanup.sql

-- 1. Schema Updates
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS communication_language TEXT DEFAULT 'he';

CREATE TABLE IF NOT EXISTS public.ai_match_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  reason_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, professional_id)
);

ALTER TABLE public.ai_match_reasons ENABLE ROW LEVEL SECURITY;
-- Allow all authenticated users to read AI reasons (useful for edge functions and UI)
CREATE POLICY ai_match_reasons_read_all ON public.ai_match_reasons FOR SELECT TO authenticated USING (true);
-- We won't allow direct inserts from clients; Edge functions use service_role.

-- 2. Availability Overlap Function
CREATE OR REPLACE FUNCTION public.availability_overlaps(avail jsonb, needed jsonb)
RETURNS boolean AS $$
DECLARE
  v_day text;
  v_avail_range jsonb;
  v_needed_range jsonb;
  v_avail_start int;
  v_avail_end int;
  v_needed_start int;
  v_needed_end int;
BEGIN
  -- If constraints are missing, assume no conflict (true)
  IF avail IS NULL OR needed IS NULL THEN
    RETURN true;
  END IF;
  
  -- If needed is empty object, assume true
  IF needed = '{}'::jsonb THEN
    RETURN true;
  END IF;

  FOR v_day IN SELECT jsonb_object_keys(needed)
  LOOP
    IF avail ? v_day THEN
      v_avail_range := avail->v_day;
      v_needed_range := needed->v_day;
      
      IF jsonb_array_length(v_avail_range) >= 2 AND jsonb_array_length(v_needed_range) >= 2 THEN
        v_avail_start := (v_avail_range->>0)::int;
        v_avail_end := (v_avail_range->>1)::int;
        v_needed_start := (v_needed_range->>0)::int;
        v_needed_end := (v_needed_range->>1)::int;
        
        -- Check overlap: max(start1, start2) < min(end1, end2)
        IF GREATEST(v_avail_start, v_needed_start) < LEAST(v_avail_end, v_needed_end) THEN
          RETURN true; -- Found at least one overlapping day
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Update get_matches_for_child
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
      -- [H3] Hard filter: Language
      AND (v_child.communication_language IS NULL OR v_child.communication_language = ANY(p.languages))
      -- [H3] Hard filter: Availability
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
          WHEN v_child.category = ANY(fp.specialties) THEN 30
          WHEN v_child.secondary_category IS NOT NULL
               AND v_child.secondary_category = ANY(fp.specialties) THEN 15
          ELSE 0
        END
        + LEAST(COALESCE(fp.experience_years, 0) * 2, 20)
        + CASE
            WHEN fp.rating_count >= 3 THEN ROUND(fp.rating_avg * 4, 0)
            ELSE 5
          END
        + CASE
            WHEN fp.dist_km <= 2 THEN 15
            WHEN fp.dist_km <= 5 THEN 12
            WHEN fp.dist_km <= 10 THEN 8
            WHEN fp.dist_km <= 15 THEN 4
            ELSE 0
          END
        + LEAST(
            COALESCE(
              (
                SELECT 
                  (EXTRACT(YEAR FROM age(now(), pr.created_at)) * 12 + 
                   EXTRACT(MONTH FROM age(now(), pr.created_at)))
                FROM public.profiles pr
                WHERE pr.id = fp.user_id
              ) * 1.5, 
              0
            ),
            15
          )
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

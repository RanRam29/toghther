-- Migration: D46 and D48 Features (2026-07-12)
-- Implements "Not a fit" match hides and "Day Off" reporting.

-- ==========================================
-- 1. D48: Match Hides ("לא מתאים")
-- ==========================================

CREATE TABLE IF NOT EXISTS public.match_hides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 months'),
  UNIQUE(hider_id, hidden_user_id)
);

ALTER TABLE public.match_hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own hides" 
  ON public.match_hides FOR SELECT 
  USING (hider_id = auth.uid());

CREATE OR REPLACE FUNCTION public.hide_match_profile(p_target_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.match_hides (hider_id, hidden_user_id)
  VALUES (auth.uid(), p_target_user_id)
  ON CONFLICT (hider_id, hidden_user_id) 
  DO UPDATE SET expires_at = now() + interval '3 months';
END;
$$;

-- Update children_tier0 view to exclude hidden children
CREATE OR REPLACE VIEW public.children_tier0 AS
  SELECT
    c.id,
    c.first_name,
    c.age,
    c.category,
    c.secondary_category,
    c.framework,
    c.hours_needed,
    c.created_at,
    p.area AS area_general
  FROM public.children c
  JOIN public.profiles p ON p.id = c.parent_id
  WHERE c.published = true
    AND NOT EXISTS (
      SELECT 1 FROM public.match_hides mh 
      WHERE mh.hider_id = auth.uid() 
        AND mh.hidden_user_id = c.parent_id 
        AND mh.expires_at > now()
    )
    AND (
      public.get_user_role() = 'professional'
      OR public.is_admin()
      OR c.parent_id = auth.uid()
    );

-- Update get_matches_for_child to exclude hidden professionals
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
      -- D48: Exclude hidden profiles
      AND NOT EXISTS (
        SELECT 1 FROM public.match_hides mh
        WHERE mh.hider_id = auth.uid() 
          AND mh.hidden_user_id = p.user_id 
          AND mh.expires_at > now()
      )
  ),
  scored_professionals AS (
    SELECT
      fp.*,
      (
        CASE
          WHEN v_child.category = ANY(fp.specialties) THEN 40
          WHEN v_child.secondary_category IS NOT NULL
               AND v_child.secondary_category = ANY(fp.specialties) THEN 15
          ELSE 0
        END
        + LEAST(COALESCE(fp.experience_years, 0) * 2, 20)
        + CASE
            WHEN fp.rating_count >= 3 THEN ROUND(fp.rating_avg * 5, 0)
            ELSE 5
          END
        + CASE
            WHEN fp.dist_km <= 2 THEN 15
            WHEN fp.dist_km <= 5 THEN 12
            WHEN fp.dist_km <= 10 THEN 8
            WHEN fp.dist_km <= 15 THEN 4
            ELSE 0
          END
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


-- ==========================================
-- 2. D46: Day Off Reporting
-- ==========================================

CREATE TABLE IF NOT EXISTS public.match_days_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, date)
);

ALTER TABLE public.match_days_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_participants_read_days_off" ON public.match_days_off FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_days_off.match_id
    AND (
      m.professional_id = public.get_professional_id()
      OR m.child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
    )
  )
  OR public.get_user_role() = 'admin'
);

CREATE OR REPLACE FUNCTION public.mark_day_off(p_match_id UUID, p_date DATE, p_reason TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_is_participant BOOLEAN;
BEGIN
  -- Verify participation
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = p_match_id
    AND (
      m.professional_id = public.get_professional_id()
      OR m.child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid())
    )
  ) INTO v_is_participant;

  IF NOT v_is_participant THEN
    RAISE EXCEPTION 'Not authorized to mark days off for this match';
  END IF;

  INSERT INTO public.match_days_off (match_id, date, reported_by, reason)
  VALUES (p_match_id, p_date, auth.uid(), p_reason)
  ON CONFLICT (match_id, date) DO NOTHING;
END;
$$;

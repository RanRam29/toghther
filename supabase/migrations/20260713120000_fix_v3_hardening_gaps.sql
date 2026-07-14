-- Migration: Fix unresolved gaps from the 2026-07-13 architect review
-- (docs/work-orders/2026-07-13-v3-hardening-review.md)
--
-- Verified against live code on 2026-07-13 (post "phase 1 complete" report):
-- none of the three requested fixes were actually applied. This migration
-- applies them directly instead of a fourth round of prose instructions.
--
--   1. anonymize_user (20260713030000) still uses the pre-H1 body: it
--      references reviews.author_id/target_id (columns that do not exist —
--      the table only has reviewer_id, so account deletion crashes at
--      runtime for any user with a review), drops the check_admin_mfa()
--      gate (H1 regression), and drops physical storage.objects deletion
--      (D28 regression). Restored from 20260713000000 + ended_at=now().
--   2. get_matches_for_child (redefined in 20260713030000) lost its
--      SET search_path pin — CREATE OR REPLACE resets function properties
--      unless restated. Same fix applied inline this time.
--   3. GRANT ALL on match_hides/match_days_off (20260713030000 section 1.5)
--      was never narrowed — writes go through SECURITY DEFINER RPCs, direct
--      table writes by 'authenticated' are not needed.
--   4. NEW regression found in the same pattern: invite_secondary_parent was
--      hardened by the M1 search_path sweep (20260713000000) but
--      20260713081000_wp11_rate_limits.sql's CREATE OR REPLACE (adding the
--      rate-limit call) dropped it again. Fixed inline.
--
-- Process note: any future CREATE OR REPLACE of a hardened function MUST
-- restate SET search_path = public, pg_temp in the same statement — it is
-- not inherited from a prior migration.

-- ============================================================
-- 1. anonymize_user — restore H1 (MFA + physical delete) + correct columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Authorization: the user themselves, OR a hardened admin with MFA.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    PERFORM public.check_admin_mfa();      -- raises unless admin + AAL2
    IF NOT public.is_admin() THEN          -- requires app_metadata.is_admin
      RAISE EXCEPTION 'Access denied. You can only delete your own account or must be an admin.';
    END IF;
  END IF;

  -- 1. Blank out Auth data to free email/phone and mark as deleted
  UPDATE auth.users
  SET email = id || '@deleted.local',
      phone = NULL,
      raw_user_meta_data = '{"deleted": true}'::jsonb,
      encrypted_password = NULL
  WHERE id = p_user_id;

  -- 2. Blank out Profile
  UPDATE public.profiles
  SET full_name = 'Deleted User',
      phone = NULL,
      avatar_url = NULL,
      deleted_at = now()
  WHERE id = p_user_id;

  -- 3. Blank out Professional data (if any)
  UPDATE public.professionals
  SET display_name = 'Deleted Professional',
      bio = NULL,
      languages = '{}',
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE user_id = p_user_id;

  -- 4. Remove sensitive documents physically AND delete records
  DELETE FROM storage.objects
  WHERE bucket_id = 'documents'
    AND name IN (SELECT storage_path FROM public.document_uploads WHERE owner_id = p_user_id);

  DELETE FROM public.document_uploads
  WHERE owner_id = p_user_id;

  -- 5. Blank out Children data (if parent)
  UPDATE public.children
  SET first_name = 'Deleted Child',
      needs = '{}'::jsonb,
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE parent_id = p_user_id;

  DELETE FROM public.child_details
  WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id);

  -- 6. Anonymize Daily Logs for related matches
  UPDATE public.daily_logs
  SET notes = NULL
  WHERE match_id IN (
    SELECT id FROM public.matches
    WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
  );

  -- 7. Anonymize Reviews (reviews has reviewer_id — NOT author_id/target_id)
  UPDATE public.reviews
  SET text = NULL
  WHERE reviewer_id = p_user_id
     OR match_id IN (
       SELECT id FROM public.matches
       WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
          OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
     );

  -- 8. End any active matches (D14 needs ended_at for the 14-day review-unlock path)
  UPDATE public.matches
  SET status = 'ended',
      ended_at = now()
  WHERE status = 'active'
    AND (
       professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
    );
END;
$$;

-- ============================================================
-- 2. get_matches_for_child — restore SET search_path
--    (body unchanged from 20260713030000 / 20260713020000 — D48 hide filter,
--     D38/D39 scoring, is_admin() ownership check all preserved verbatim)
-- ============================================================
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
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $func$
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
    AND (c.parent_id = auth.uid() OR public.is_admin());

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
      -- Hard filter: Availability (25% coverage rule)
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
$func$;

-- ============================================================
-- 3. Narrow match_hides / match_days_off grants to SELECT-only
--    (all writes go through SECURITY DEFINER RPCs, which run as the
--     function owner — not affected by revoking the 'authenticated' role)
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON public.match_hides FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.match_days_off FROM authenticated;

-- ============================================================
-- 4. invite_secondary_parent — restore SET search_path
--    (dropped again by 20260713081000_wp11_rate_limits.sql's
--     CREATE OR REPLACE; body unchanged, rate-limit call preserved)
-- ============================================================
CREATE OR REPLACE FUNCTION public.invite_secondary_parent(p_child_id UUID, p_phone TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.enforce_rate_limit('invite_secondary_parent', 5, interval '1 day');

  -- Verify caller is primary parent
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_child_id AND parent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only primary parent can invite';
  END IF;

  -- Create invitation
  INSERT INTO public.parent_invitations (child_id, inviter_id, invited_phone, status)
  VALUES (p_child_id, auth.uid(), p_phone, 'pending');
END;
$$;

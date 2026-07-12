-- Together Platform — Security Hardening (part 2): reviews blind-rating + supervisor gate
-- Migration: 20260713010000_security_hardening_reviews_supervisor.sql
--
--   (a) Close the blind-rating bypass — a leftover permissive `reviews_select`
--       policy let parents read all parent-authored reviews WITHOUT the 14-day /
--       mutual-review gate that architect_audit_fixes introduced.
--   (b) Harden is_supervisor() with a non-editable app_metadata claim (mirrors
--       is_admin), and backfill existing supervisors so they keep access.

-- ============================================================
-- (a) reviews: drop the leftover permissive SELECT policy
-- ============================================================
-- reviews_read + reviews_parent_browse (20260712230000_architect_audit_fixes.sql)
-- already enforce the blind-rating gate; reviews_select (20260707105411) bypassed
-- it because RLS SELECT policies are OR-combined.
DROP POLICY IF EXISTS "reviews_select" ON public.reviews;

-- ============================================================
-- (b) supervisor gate: require app_metadata.is_supervisor (like is_admin)
-- ============================================================
-- Backfill the claim for any existing supervisor so the hardened check does not
-- lock them out. (Live sessions pick up the claim on their next token refresh.)
-- New supervisors must be provisioned with BOTH role='supervisor' (backend) and
-- app_metadata.is_supervisor = true.
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || '{"is_supervisor": true}'::jsonb
FROM public.profiles p
WHERE p.id = u.id
  AND p.role = 'supervisor';

CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.get_user_role()::text = 'supervisor'
    AND COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_supervisor')::boolean, false);
$$;
-- is_staff_verifier() = is_supervisor() OR is_admin() inherits this automatically.

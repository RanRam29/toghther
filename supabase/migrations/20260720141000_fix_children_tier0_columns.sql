-- Add missing columns to children_tier0 view
-- Needed by fetchPublishedChildren API which requests functioning_level and communication_verbal

CREATE OR REPLACE FUNCTION private.children_tier0_source()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  age INTEGER,
  category need_category,
  secondary_category need_category,
  framework framework_type,
  functioning_level integer,
  communication_verbal boolean,
  hours_needed JSONB,
  created_at TIMESTAMPTZ,
  area_general TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT
    c.id,
    c.first_name,
    c.age,
    c.category,
    c.secondary_category,
    c.framework,
    c.functioning_level,
    c.communication_verbal,
    c.hours_needed,
    c.created_at,
    p.area AS area_general
  FROM public.children c
  JOIN public.profiles p ON p.id = c.parent_id
  WHERE c.published = true
    AND c.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.match_hides mh
      WHERE mh.hider_id = auth.uid()
        AND mh.hidden_user_id = c.parent_id
        AND mh.expires_at > now()
    )
    AND (
      public.get_user_role() = 'professional'
      OR public.is_admin()
      OR c.parent_id = auth.uid()
      OR c.secondary_parent_id = auth.uid()
    );
$$;

DROP VIEW IF EXISTS public.children_tier0;

CREATE VIEW public.children_tier0
WITH (security_invoker = true)
AS
SELECT * FROM private.children_tier0_source();

GRANT SELECT ON public.children_tier0 TO authenticated;

-- Migration: Soft Delete Data Retention (D27-D28)
-- Implements anonymization of user data instead of destructive cascade deletion.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_is_authorized boolean;
  v_role text;
BEGIN
  -- Authorization: User themselves, or Admin
  IF auth.uid() = p_user_id THEN
    v_is_authorized := true;
  ELSE
    SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' INTO v_is_authorized;
    IF NOT v_is_authorized THEN
      SELECT (raw_user_meta_data->>'role') = 'admin' INTO v_is_authorized
      FROM auth.users WHERE id = auth.uid();
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied. You can only delete your own account or must be an admin.';
  END IF;

  -- 1. Blank out Auth data to free email/phone and mark as deleted
  UPDATE auth.users 
  SET email = id || '@deleted.local',
      phone = NULL,
      raw_user_meta_data = '{"deleted": true}'::jsonb,
      encrypted_password = NULL -- they can't log in anymore
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

  -- Remove sensitive documents physically (if any, requires bucket cleanup which is separate)
  -- But we delete the DB records to sever the link
  DELETE FROM public.document_uploads
  WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id);

  -- 4. Blank out Children data (if parent)
  UPDATE public.children
  SET first_name = 'Deleted Child',
      needs = '{}'::jsonb,
      location = 'POINT(0 0)'::geometry,
      deleted_at = now()
  WHERE parent_id = p_user_id;

  -- Delete sensitive child medical details
  DELETE FROM public.child_details
  WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id);

  -- 5. Anonymize Daily Logs for related matches
  UPDATE public.daily_logs
  SET notes = NULL
  WHERE match_id IN (
    SELECT id FROM public.matches 
    WHERE professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
  );

  -- 6. Anonymize Reviews
  UPDATE public.reviews
  SET text = NULL
  WHERE author_id = p_user_id 
     OR target_id = p_user_id;

  -- 7. End any active matches
  UPDATE public.matches
  SET status = 'ended'
  WHERE status = 'active'
    AND (
       professional_id IN (SELECT id FROM public.professionals WHERE user_id = p_user_id)
       OR child_id IN (SELECT id FROM public.children WHERE parent_id = p_user_id)
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

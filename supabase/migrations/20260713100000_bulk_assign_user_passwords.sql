-- Backfill default password for all active users (email+password login).
-- Migration: 20260713100000_bulk_assign_user_passwords.sql

CREATE OR REPLACE FUNCTION public.backfill_user_default_password(
  p_password text DEFAULT 'admin123'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  r record;
  v_updated int := 0;
  v_hash text;
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;

  v_hash := extensions.crypt(trim(p_password), extensions.gen_salt('bf'));

  FOR r IN
    SELECT u.id
    FROM auth.users u
    WHERE u.email IS NOT NULL
      AND trim(u.email) <> ''
      AND u.email NOT LIKE '%@deleted.local'
  LOOP
    UPDATE auth.users
    SET
      encrypted_password = v_hash,
      updated_at = now()
    WHERE id = r.id;

    v_updated := v_updated + 1;
  END LOOP;

  RETURN v_updated;
END;
$$;

SELECT public.backfill_user_default_password('admin123');

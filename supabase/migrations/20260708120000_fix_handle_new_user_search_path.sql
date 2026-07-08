-- Together Platform — Fix: handle_new_user() trigger fails on signup
-- Migration: 20260708120000_fix_handle_new_user_search_path.sql
--
-- Bug: handle_new_user() is SECURITY DEFINER but never sets search_path.
-- The auth.users AFTER INSERT trigger runs under the supabase_auth_admin role,
-- whose default search_path does not include `public`, so the unqualified
-- `INSERT INTO profiles` fails with `42P01 relation "profiles" does not exist`
-- on every phone/OTP signup (confirmed in Postgres logs 2026-07-08).
--
-- Fix: pin search_path on the function and schema-qualify the target table.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')::user_role,
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

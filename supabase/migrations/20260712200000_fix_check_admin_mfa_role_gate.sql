-- check_admin_mfa should enforce MFA only for admins; role gate stays in each RPC.

CREATE OR REPLACE FUNCTION public.check_admin_mfa()
RETURNS void
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'aal', '') != 'aal2' THEN
      RAISE EXCEPTION 'Access denied: Requires MFA (AAL2)';
    END IF;
  END IF;
END;
$$;

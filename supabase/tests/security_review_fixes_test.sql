-- Security review fixes tests (2026-07-15)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;
SET search_path TO public, extensions;

SELECT plan(3);

-- 1. anonymize_user must not authorize via user_metadata.role
SELECT ok(
  pg_get_functiondef('public.anonymize_user(uuid)'::regprocedure) NOT LIKE '%user_metadata%',
  'anonymize_user does not check user_metadata.role'
);

SELECT ok(
  pg_get_functiondef('public.anonymize_user(uuid)'::regprocedure) LIKE '%check_admin_mfa%'
    AND pg_get_functiondef('public.anonymize_user(uuid)'::regprocedure) LIKE '%is_admin%',
  'anonymize_user uses is_admin and check_admin_mfa'
);

-- 2. admin_get_user_login requires MFA
SELECT ok(
  pg_get_functiondef('public.admin_get_user_login(uuid)'::regprocedure) LIKE '%check_admin_mfa%',
  'admin_get_user_login requires check_admin_mfa'
);

SELECT * FROM finish();
ROLLBACK;

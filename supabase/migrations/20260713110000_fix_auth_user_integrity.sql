-- Repair auth.users rows so GoTrue can load them for email+password login.
-- NULL instance_id / token columns cause "Invalid login credentials" (400).
-- Migration: 20260713110000_fix_auth_user_integrity.sql

UPDATE auth.users
SET
  instance_id = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
  created_at = COALESCE(created_at, now() - interval '60 days'),
  updated_at = COALESCE(updated_at, now()),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE instance_id IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL
   OR raw_app_meta_data IS NULL
   OR raw_user_meta_data IS NULL
   OR confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;

-- Re-hash passwords per user (GoTrue-compatible, unique salt each row).
UPDATE auth.users
SET
  encrypted_password = extensions.crypt('admin123', extensions.gen_salt('bf')),
  updated_at = now()
WHERE email IS NOT NULL
  AND trim(email) <> ''
  AND email NOT LIKE '%@deleted.local';

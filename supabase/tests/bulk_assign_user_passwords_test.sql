-- Backfill default user password
-- Run: npx supabase test db

BEGIN;
SET search_path TO public, extensions;
SELECT plan(3);

INSERT INTO auth.users (instance_id, id, aud, role, email, phone, encrypted_password, phone_confirmed_at, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000000', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd38d701', 'authenticated', 'authenticated', 'pw-backfill@test.local', '0500001001', NULL, now(), now(), now());

SELECT ok(
  public.backfill_user_default_password('admin123') >= 1,
  'Backfill sets password on users with email'
);

SELECT ok(
  (SELECT encrypted_password IS NOT NULL FROM auth.users WHERE id = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd38d701'),
  'User row has encrypted_password'
);

SELECT ok(
  (SELECT encrypted_password = extensions.crypt('admin123', encrypted_password)
   FROM auth.users WHERE id = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd38d701'),
  'Password matches admin123'
);

SELECT * FROM finish();
ROLLBACK;

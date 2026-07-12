-- Together Platform — WP2: Push notifications foundation (device tokens + prefs + RLS)
-- Migration: 20260708140000_wp2_push_foundation.sql
--
-- Backend foundation for WP2 Stage A (independent of WP1 deploy):
--   • push_tokens        — one row per (user, device token); the user manages only their own.
--   • notification_prefs — per-category opt-out. Only checkin & daily_summary are opt-outable;
--                          loop events (request/approve/verify/…) are ALWAYS sent (D-security / WP2).
--
-- NOT in this migration (env-coupled → Antigravity with cloud access):
--   the send-push Edge Function (scaffolded in supabase/functions/send-push) and the DB
--   triggers/pg_cron that call it via pg_net (need the function URL + service key in Vault).

-- ============================================================
-- push_tokens
-- ============================================================
create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,                         -- Expo push token (ExponentPushToken[...])
  platform    text not null default 'unknown',       -- ios / android / web
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);
create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

-- ============================================================
-- notification_prefs (opt-out only for the two quiet-hours categories)
-- ============================================================
create table if not exists public.notification_prefs (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  checkin       boolean not null default true,       -- "המשלבת הגיעה"
  daily_summary boolean not null default true,       -- "הסיכום היומי מוכן"
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- updated_at triggers (reuse update_updated_at() from 001)
-- ============================================================
drop trigger if exists trg_push_tokens_updated on public.push_tokens;
create trigger trg_push_tokens_updated
  before update on public.push_tokens
  for each row execute function update_updated_at();

drop trigger if exists trg_notification_prefs_updated on public.notification_prefs;
create trigger trg_notification_prefs_updated
  before update on public.notification_prefs
  for each row execute function update_updated_at();

-- ============================================================
-- RLS — a user manages only their own tokens & prefs
-- ============================================================
alter table public.push_tokens      enable row level security;
alter table public.notification_prefs enable row level security;

drop policy if exists push_tokens_own_all on public.push_tokens;
create policy push_tokens_own_all on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notification_prefs_own_all on public.notification_prefs;
create policy notification_prefs_own_all on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- The send-push Edge Function reads tokens/prefs with the service role (bypasses RLS).

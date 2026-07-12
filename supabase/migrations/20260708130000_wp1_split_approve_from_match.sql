-- Together Platform — WP1: split match APPROVAL from match ACTIVATION (fixes H4 / enforces D10)
-- Migration: 20260708130000_wp1_split_approve_from_match.sql
--
-- H4 / D10: today public.approve_request() approves the request AND immediately creates an
-- active TIER-3 match in one call. D10 requires the opposite: approval only reaches TIER 2
-- (intro + contact details); the parent then explicitly activates the match ("started working
-- together") in a separate action, and a failed intro closes the request WITHOUT a match.
--
-- This migration:
--   0. Adds match_requests.decline_reason (optional "didn't work out" reason).
--   1. Redefines approve_request  → move to 'approved' + TIER 2 ONLY (no match).      [SIGNATURE CHANGE]
--   2. Re-asserts create_match_from_request → the explicit TIER-3 activation (parent-only).
--   3. Adds decline_after_intro(request_id, reason) → close an approved request, no match.
--
-- ⚠️ SIGNATURE CHANGE: approve_request now RETURNS void (was RETURNS uuid / match_id).
--    → run `npm run types:generate` and update the coordination board; Cursor's S-PAR-05/06/07
--      UI must be split (approve no longer returns a match_id and no longer creates a match).

-- 0) Optional decline reason --------------------------------------------------
alter table public.match_requests
  add column if not exists decline_reason text;

-- 1) approve_request → TIER 2 ONLY (drop first — return type changes) ----------
drop function if exists public.approve_request(uuid);

create function public.approve_request(p_request_id uuid)
returns void as $$
declare
  v_request record;
begin
  -- Lock the request, ensuring the caller is the parent of the child.
  select r.* into v_request
  from match_requests r
  join children c on c.id = r.child_id
  where r.id = p_request_id
    and c.parent_id = auth.uid()
  for update;

  if v_request is null then
    raise exception 'Request not found or access denied';
  end if;

  -- Only a live request (professional interested, or parent-initiated pending) can be approved.
  if v_request.status not in ('pending', 'interested') then
    raise exception 'Request cannot be approved from status: %', v_request.status;
  end if;

  -- Approve = TIER 2 (intro). NO match is created here — that is create_match_from_request().
  -- (trg_tier_transition also derives tier_reached from status; set explicitly for clarity.)
  update match_requests
  set status = 'approved',
      tier_reached = 2,
      updated_at = now()
  where id = p_request_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 2) create_match_from_request → explicit TIER-3 activation (parent-only) -------
create or replace function public.create_match_from_request(p_request_id uuid)
returns uuid as $$
declare
  v_request record;
  v_match_id uuid;
  v_score    numeric;
  v_reason   text;
begin
  -- Parent-only, and only from an 'approved' request (post-intro).
  select r.* into v_request
  from match_requests r
  join children c on c.id = r.child_id
  where r.id = p_request_id
    and c.parent_id = auth.uid()
    and r.status = 'approved'
  for update;

  if v_request is null then
    raise exception 'Request not found, not approved, or access denied';
  end if;

  -- Idempotency / double-activation guard.
  if exists (select 1 from matches m where m.request_id = p_request_id) then
    raise exception 'Match already exists for this request';
  end if;

  select s.score, s.match_reason
  into v_score, v_reason
  from calculate_match_score(v_request.child_id, v_request.professional_id) s;

  insert into matches (child_id, professional_id, request_id, score, match_reason, status)
  values (v_request.child_id, v_request.professional_id, p_request_id, v_score, v_reason, 'active')
  returning id into v_match_id;

  -- Promote the request to TIER 3 (active match). status column untouched → tier trigger not fired.
  update match_requests set tier_reached = 3 where id = p_request_id;

  return v_match_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 3) decline_after_intro → close an approved request WITHOUT a match ------------
create or replace function public.decline_after_intro(
  p_request_id uuid,
  p_reason     text default null
)
returns void as $$
begin
  update match_requests r
  set status         = 'rejected',
      decline_reason = p_reason,
      updated_at     = now()
  from children c
  where r.id = p_request_id
    and c.id = r.child_id
    and c.parent_id = auth.uid()
    and r.status = 'approved'
    and not exists (select 1 from matches m where m.request_id = r.id);

  if not found then
    raise exception 'Request not found, not in approved (pre-match) state, or access denied';
  end if;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- 4) get_intro_contact → expose the professional's contact to the parent at the intro stage --
-- Needed because profiles.phone is not readable cross-user (RLS: profiles_own_read) and the
-- professionals table has no phone column. Parent-only, request must be 'approved'
-- (covers both the intro stage and the active match, since status stays 'approved'). Audited.
create or replace function public.get_intro_contact(p_request_id uuid)
returns table (
  professional_id uuid,
  display_name    text,
  phone           text
) as $$
begin
  if not exists (
    select 1
    from match_requests r
    join children c on c.id = r.child_id
    where r.id = p_request_id
      and c.parent_id = auth.uid()
      and r.status = 'approved'
  ) then
    raise exception 'Contact not available: request not found, not in intro stage, or access denied';
  end if;

  insert into audit_log (user_id, resource, resource_id, action, tier)
  values (auth.uid(), 'professional_contact', p_request_id, 'view', 2);

  return query
  select pr.id, pr.display_name, prof.phone
  from match_requests r
  join professionals pr on pr.id = r.professional_id
  join profiles prof on prof.id = pr.user_id
  where r.id = p_request_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

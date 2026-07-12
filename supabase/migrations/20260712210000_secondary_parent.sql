-- Migration: Secondary Parent Access (D31)
-- Adds secondary parent support to children table, with robust permissions model.

-- 1. Schema Updates
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS secondary_parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS secondary_parent_permissions JSONB DEFAULT '{"can_edit": false, "can_approve": false}'::jsonb;

CREATE TABLE IF NOT EXISTS public.parent_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_invitations_inviter_all" ON public.parent_invitations
  FOR ALL TO authenticated
  USING (inviter_id = auth.uid());

CREATE POLICY "parent_invitations_invitee_read" ON public.parent_invitations
  FOR SELECT TO authenticated
  USING (
    invited_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
  );

-- 2. Policy Updates (Replace existing parent policies)

-- Children table
DROP POLICY IF EXISTS "children_parent_all" ON public.children;
CREATE POLICY "children_parent_all" ON public.children
  FOR ALL TO authenticated
  USING (
    parent_id = auth.uid() OR 
    (secondary_parent_id = auth.uid() AND (secondary_parent_permissions->>'can_edit')::boolean = true)
  )
  WITH CHECK (
    parent_id = auth.uid() OR 
    (secondary_parent_id = auth.uid() AND (secondary_parent_permissions->>'can_edit')::boolean = true)
  );

-- For SELECT on children (read-only), secondary always has access
CREATE POLICY "children_secondary_read" ON public.children
  FOR SELECT TO authenticated
  USING (secondary_parent_id = auth.uid());

-- Child details
DROP POLICY IF EXISTS "child_details_parent_all" ON public.child_details;
CREATE POLICY "child_details_parent_all" ON public.child_details
  FOR ALL TO authenticated
  USING (
    child_id IN (
      SELECT id FROM public.children 
      WHERE parent_id = auth.uid() OR (secondary_parent_id = auth.uid() AND (secondary_parent_permissions->>'can_edit')::boolean = true)
    )
  );

CREATE POLICY "child_details_secondary_read" ON public.child_details
  FOR SELECT TO authenticated
  USING (
    child_id IN (SELECT id FROM public.children WHERE secondary_parent_id = auth.uid())
  );

-- Match requests
DROP POLICY IF EXISTS "match_requests_parent_create" ON public.match_requests;
CREATE POLICY "match_requests_parent_create" ON public.match_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    child_id IN (
      SELECT id FROM public.children 
      WHERE parent_id = auth.uid() OR (secondary_parent_id = auth.uid() AND (secondary_parent_permissions->>'can_approve')::boolean = true)
    )
  );

DROP POLICY IF EXISTS "match_requests_parent_read" ON public.match_requests;
CREATE POLICY "match_requests_parent_read" ON public.match_requests
  FOR SELECT TO authenticated
  USING (
    child_id IN (
      SELECT id FROM public.children WHERE parent_id = auth.uid() OR secondary_parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "match_requests_parent_update" ON public.match_requests;
CREATE POLICY "match_requests_parent_update" ON public.match_requests
  FOR UPDATE TO authenticated
  USING (
    child_id IN (
      SELECT id FROM public.children 
      WHERE parent_id = auth.uid() OR (secondary_parent_id = auth.uid() AND (secondary_parent_permissions->>'can_approve')::boolean = true)
    )
  );

-- Matches
DROP POLICY IF EXISTS "matches_parent_read" ON public.matches;
CREATE POLICY "matches_parent_read" ON public.matches
  FOR SELECT TO authenticated
  USING (
    child_id IN (
      SELECT id FROM public.children WHERE parent_id = auth.uid() OR secondary_parent_id = auth.uid()
    )
  );

-- Checkins & Daily Logs
DROP POLICY IF EXISTS "checkins_parent_read" ON public.checkins;
CREATE POLICY "checkins_parent_read" ON public.checkins
  FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT id FROM public.matches 
      WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid() OR secondary_parent_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "daily_logs_parent_read" ON public.daily_logs;
CREATE POLICY "daily_logs_parent_read" ON public.daily_logs
  FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT id FROM public.matches 
      WHERE child_id IN (SELECT id FROM public.children WHERE parent_id = auth.uid() OR secondary_parent_id = auth.uid())
    )
  );


-- 3. RPCs

CREATE OR REPLACE FUNCTION public.invite_secondary_parent(p_child_id UUID, p_phone TEXT)
RETURNS void AS $$
BEGIN
  -- Verify caller is primary parent
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_child_id AND parent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only primary parent can invite';
  END IF;

  -- Create invitation
  INSERT INTO public.parent_invitations (child_id, inviter_id, invited_phone, status)
  VALUES (p_child_id, auth.uid(), p_phone, 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.accept_parent_invitation(p_invitation_id UUID)
RETURNS void AS $$
DECLARE
  v_inv RECORD;
  v_my_phone TEXT;
  v_role TEXT;
BEGIN
  -- DANGER PREVENTED: Use verified phone from auth.users (OTP), NOT user-editable public.profiles
  SELECT phone INTO v_my_phone FROM auth.users WHERE id = auth.uid();
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_role != 'parent' THEN
    RAISE EXCEPTION 'Only users registered as parents can accept an invitation';
  END IF;
  
  SELECT * INTO v_inv FROM public.parent_invitations WHERE id = p_invitation_id;
  IF NOT FOUND OR v_inv.status != 'pending' THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF v_inv.invited_phone != v_my_phone THEN
    RAISE EXCEPTION 'Phone number mismatch. You can only accept invitations sent to your verified phone number';
  END IF;

  -- Accept it
  UPDATE public.parent_invitations SET status = 'accepted', updated_at = now() WHERE id = p_invitation_id;
  UPDATE public.children SET secondary_parent_id = auth.uid() WHERE id = v_inv.child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_secondary_permissions(p_child_id UUID, p_permissions JSONB)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_child_id AND parent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only primary parent can update permissions';
  END IF;

  UPDATE public.children SET secondary_parent_permissions = p_permissions WHERE id = p_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.remove_secondary_parent(p_child_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_child_id AND parent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only primary parent can remove secondary';
  END IF;

  UPDATE public.children 
  SET secondary_parent_id = NULL, secondary_parent_permissions = '{"can_edit": false, "can_approve": false}'::jsonb 
  WHERE id = p_child_id;

  UPDATE public.parent_invitations
  SET status = 'revoked'
  WHERE child_id = p_child_id AND status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.transfer_primary_parent(p_child_id UUID)
RETURNS void AS $$
DECLARE
  v_secondary UUID;
BEGIN
  SELECT secondary_parent_id INTO v_secondary FROM public.children WHERE id = p_child_id AND parent_id = auth.uid();
  
  IF v_secondary IS NULL THEN
    RAISE EXCEPTION 'No secondary parent exists to transfer to';
  END IF;

  UPDATE public.children
  SET parent_id = v_secondary,
      secondary_parent_id = auth.uid(),
      secondary_parent_permissions = '{"can_edit": true, "can_approve": true}'::jsonb
  WHERE id = p_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

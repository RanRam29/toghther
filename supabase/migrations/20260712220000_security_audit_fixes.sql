-- Migration: Security Audit Fixes (Authorization & Privilege Escalation)
-- Prevents unauthorized ownership transfers and IDOR vulnerabilities.

-- ====================================================================
-- 1. Lock down `children` table ownership columns
-- ====================================================================
CREATE OR REPLACE FUNCTION public.protect_children_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- `current_user` evaluates to 'authenticated' when queried via the PostgREST API.
  -- Inside our SECURITY DEFINER RPCs (e.g. `accept_parent_invitation`), it evaluates
  -- to the function owner ('postgres'), so official API methods can still modify these fields.
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      RAISE EXCEPTION 'Changing parent_id directly via API is not allowed. Use transfer_primary_parent() RPC.';
    END IF;
    IF NEW.secondary_parent_id IS DISTINCT FROM OLD.secondary_parent_id THEN
      RAISE EXCEPTION 'Changing secondary_parent_id directly via API is not allowed. Use the invitation RPCs.';
    END IF;
    IF NEW.secondary_parent_permissions IS DISTINCT FROM OLD.secondary_parent_permissions THEN
      RAISE EXCEPTION 'Changing secondary_parent_permissions directly via API is not allowed. Use update_secondary_permissions() RPC.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_children_immutable ON public.children;
CREATE TRIGGER trg_protect_children_immutable
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.protect_children_immutable_fields();


-- ====================================================================
-- 2. Lock down `parent_invitations` table (Prevent IDOR target swapping)
-- ====================================================================
-- The previous 'FOR ALL' policy allowed an inviter to UPDATE `child_id` 
-- after creation, potentially tricking an invitee into gaining access to a stranger's child.
DROP POLICY IF EXISTS "parent_invitations_inviter_all" ON public.parent_invitations;

CREATE POLICY "parent_invitations_inviter_read" ON public.parent_invitations
  FOR SELECT TO authenticated
  USING (inviter_id = auth.uid());

-- Note: No INSERT or UPDATE policies are needed because creation and modification 
-- of invitations is handled exclusively by SECURITY DEFINER RPCs.

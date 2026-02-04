-- Migration: Allow Call Center to view gift_card_inventory for recipient lookups
-- AND fix recipient_audit_log access for Recent Activity
-- 
-- Problem 1: Call center agents need to see previous redemptions/gift cards
-- when looking up a code, but gift_card_inventory RLS only allows admins.
--
-- Problem 2: The "Admin and call center can view all audit logs" policy was 
-- dropped, preventing call center from seeing their recent activity.
--
-- Solutions:
-- 1. Add a policy that allows call_center and higher roles to view
--    gift_card_inventory records for recipients they can access.
-- 2. Re-add the policy for call_center to view their own audit log entries.

SET search_path TO public;

-- ============================================================================
-- PART 0: Add Missing Foreign Key Constraint
-- ============================================================================
-- The assignment_condition_id column was added but no FK constraint was created.
-- This causes Supabase PostgREST to return 400 errors when using FK hints in queries.

-- Add the missing foreign key constraint (if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'gift_card_inventory_assignment_condition_id_fkey'
    AND table_name = 'gift_card_inventory'
  ) THEN
    ALTER TABLE public.gift_card_inventory
      ADD CONSTRAINT gift_card_inventory_assignment_condition_id_fkey
      FOREIGN KEY (assignment_condition_id) 
      REFERENCES public.campaign_conditions(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for query performance on the FK column
CREATE INDEX IF NOT EXISTS idx_gift_card_inventory_assignment_condition_id 
  ON public.gift_card_inventory(assignment_condition_id);

-- ============================================================================
-- PART 1: Call Center Access to Gift Card Inventory
-- ============================================================================

-- Create a function to check if user has call center access or higher
CREATE OR REPLACE FUNCTION public.has_call_center_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role IN ('admin', 'agency_owner', 'company_owner', 'call_center')
  );
$$;

COMMENT ON FUNCTION public.has_call_center_access(uuid) IS 
  'Check if user has call_center role or higher (for gift card inventory access)';

-- Add policy for call center to view inventory cards
-- Only allows viewing cards that are assigned to recipients
DROP POLICY IF EXISTS "Call center can view assigned inventory" ON public.gift_card_inventory;

CREATE POLICY "Call center can view assigned inventory"
ON public.gift_card_inventory
FOR SELECT
TO authenticated
USING (
  -- User must have call_center access or higher
  public.has_call_center_access((SELECT auth.uid()))
  AND (
    -- Card must be assigned (not available/unassigned)
    assigned_to_recipient_id IS NOT NULL
  )
);

COMMENT ON POLICY "Call center can view assigned inventory" ON public.gift_card_inventory IS 
  'Allows call center agents to view gift cards that have been assigned to recipients, for showing previous redemptions';

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.has_call_center_access(uuid) TO authenticated;

-- ============================================================================
-- PART 2: Call Center Access to Recipient Audit Log (Recent Activity)
-- ============================================================================

-- Add policy for call center users to view their own audit log entries
-- This enables the "Recent Activity" sidebar to show recent redemptions
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.recipient_audit_log;

CREATE POLICY "Users can view their own audit logs"
ON public.recipient_audit_log
FOR SELECT
TO authenticated
USING (
  -- Users can always see entries they created
  performed_by_user_id = (SELECT auth.uid())
);

COMMENT ON POLICY "Users can view their own audit logs" ON public.recipient_audit_log IS 
  'Allows any authenticated user to view audit logs for entries they created (Recent Activity sidebar)';

-- Also ensure call_center role can view audit logs for recipients they're looking up
DROP POLICY IF EXISTS "Call center can view audit logs" ON public.recipient_audit_log;

CREATE POLICY "Call center can view audit logs"
ON public.recipient_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_call_center_access((SELECT auth.uid()))
);

COMMENT ON POLICY "Call center can view audit logs" ON public.recipient_audit_log IS 
  'Allows call center agents to view all audit logs for recipient lookup and history';

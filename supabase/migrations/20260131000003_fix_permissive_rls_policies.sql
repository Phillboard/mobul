-- Migration: Fix Permissive RLS Policies
-- Issue: Policies with USING(true) bypass security
-- Focus: Critical tables credit_accounts and credit_transactions

-- ============================================
-- HELPER FUNCTION: Check if user can access credit account
-- ============================================
CREATE OR REPLACE FUNCTION public.user_can_access_credit_account(
  _user_id UUID, 
  _entity_type TEXT, 
  _entity_id UUID
) 
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Platform admins can access everything
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
  OR
  -- For platform accounts, only platform admins (handled above)
  (
    _entity_type = 'platform' AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _user_id AND role = 'admin'
    )
  )
  OR
  -- For agency accounts, check if user belongs to the agency
  (
    _entity_type = 'agency' AND EXISTS (
      SELECT 1 FROM user_agencies
      WHERE user_id = _user_id AND agency_id = _entity_id
    )
  )
  OR
  -- For client accounts, check if user can access the client
  (
    _entity_type = 'client' AND user_can_access_client(_user_id, _entity_id)
  );
$$;

COMMENT ON FUNCTION public.user_can_access_credit_account IS 'Check if a user can access a credit account based on entity type and ID';

-- ============================================
-- 1. FIX credit_accounts POLICIES
-- ============================================

-- Drop the dangerous "Allow all" policy
DROP POLICY IF EXISTS "Allow all credit_accounts" ON public.credit_accounts;

-- Create proper policies

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access to credit_accounts"
ON public.credit_accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Platform admins can manage all credit accounts
CREATE POLICY "Platform admins can manage all credit accounts"
ON public.credit_accounts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::public.app_role
  )
);

-- Agency users can view their agency's credit account
CREATE POLICY "Agency users can view their agency credit account"
ON public.credit_accounts
FOR SELECT
TO authenticated
USING (
  entity_type = 'agency' 
  AND EXISTS (
    SELECT 1 FROM public.user_agencies
    WHERE user_agencies.user_id = (SELECT auth.uid())
    AND user_agencies.agency_id = credit_accounts.entity_id
  )
);

-- Agency owners can update their agency's credit account settings
CREATE POLICY "Agency owners can update their agency credit account"
ON public.credit_accounts
FOR UPDATE
TO authenticated
USING (
  entity_type = 'agency' 
  AND EXISTS (
    SELECT 1 FROM public.user_agencies
    WHERE user_agencies.user_id = (SELECT auth.uid())
    AND user_agencies.agency_id = credit_accounts.entity_id
    AND user_agencies.role = 'owner'
  )
)
WITH CHECK (
  entity_type = 'agency' 
  AND EXISTS (
    SELECT 1 FROM public.user_agencies
    WHERE user_agencies.user_id = (SELECT auth.uid())
    AND user_agencies.agency_id = credit_accounts.entity_id
    AND user_agencies.role = 'owner'
  )
);

-- Client users can view their client's credit account
CREATE POLICY "Client users can view their client credit account"
ON public.credit_accounts
FOR SELECT
TO authenticated
USING (
  entity_type = 'client' 
  AND public.user_can_access_client((SELECT auth.uid()), entity_id)
);

-- Company owners can update their client's credit account settings
CREATE POLICY "Company owners can update their client credit account"
ON public.credit_accounts
FOR UPDATE
TO authenticated
USING (
  entity_type = 'client' 
  AND public.user_can_access_client((SELECT auth.uid()), entity_id)
  AND public.has_role((SELECT auth.uid()), 'company_owner'::public.app_role)
)
WITH CHECK (
  entity_type = 'client' 
  AND public.user_can_access_client((SELECT auth.uid()), entity_id)
  AND public.has_role((SELECT auth.uid()), 'company_owner'::public.app_role)
);

-- ============================================
-- 2. FIX credit_transactions POLICIES
-- ============================================

-- Drop the dangerous "Allow all" policy
DROP POLICY IF EXISTS "Allow all credit_transactions" ON public.credit_transactions;

-- Create proper policies

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access to credit_transactions"
ON public.credit_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Platform admins can view all transactions
CREATE POLICY "Platform admins can view all credit transactions"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::public.app_role
  )
);

-- Users can view transactions for accounts they can access
CREATE POLICY "Users can view their accessible credit transactions"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.credit_accounts ca
    WHERE ca.id = credit_transactions.credit_account_id
    AND public.user_can_access_credit_account((SELECT auth.uid()), ca.entity_type, ca.entity_id)
  )
);

-- ============================================
-- 3. FIX gift_card_inventory UPDATE policy
-- ============================================
-- The "Service can update inventory" policy is needed for edge functions
-- but should be restricted to service_role only

DROP POLICY IF EXISTS "Service can update inventory" ON public.gift_card_inventory;

CREATE POLICY "Service role can update inventory"
ON public.gift_card_inventory
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- DOCUMENTATION: Intentional Public INSERT Policies
-- ============================================
-- The following tables have intentional public INSERT policies for specific use cases:
--
-- 1. ace_form_submissions - Public form submissions from landing pages
--    - Policy: "Allow public form submissions" / "Public can create submissions"
--    - Reason: Forms need to accept submissions from unauthenticated users
--
-- 2. leads - Public lead capture from landing pages
--    - Policy: "Public can insert leads"
--    - Reason: Lead forms need to work for unauthenticated visitors
--
-- 3. call_sessions - Public call session creation
--    - Policy: "Public can create call sessions"
--    - Reason: Call center portal may operate with anonymous sessions
--
-- 4. error_logs - Anonymous error logging
--    - Policy: "Allow anonymous error logging"
--    - Reason: Client-side errors need to be logged even for unauthenticated users
--
-- 5. qr_tracking_events - Public QR code tracking
--    - Policy: "System can insert QR tracking events"
--    - Reason: QR code scans need to be tracked anonymously
--
-- 6. Audit/Log tables (these SHOULD allow INSERT for logging):
--    - admin_alerts, admin_notifications - System alerts
--    - gift_card_billing_ledger - Billing records from service role
--    - gift_card_revoke_log - Revocation audit trail
--    - mail_submissions - Mail submission tracking
--    - performance_metrics - System metrics
--    - recipient_audit_log - Recipient changes audit
--    - redemption_workflow_log - Redemption audit
--    - security_audit_log - Security events
--    - usage_analytics - Analytics events
--
-- RECOMMENDATION: These policies are intentional for their use cases.
-- However, consider adding rate limiting at the edge function level
-- to prevent abuse of public INSERT endpoints.

-- ============================================
-- Verify policies were created
-- ============================================
DO $$
BEGIN
  -- Check credit_accounts has proper policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'credit_accounts' 
    AND policyname = 'Allow all credit_accounts'
  ) THEN
    RAISE EXCEPTION 'Dangerous policy "Allow all credit_accounts" still exists';
  END IF;
  
  -- Check credit_transactions has proper policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'credit_transactions' 
    AND policyname = 'Allow all credit_transactions'
  ) THEN
    RAISE EXCEPTION 'Dangerous policy "Allow all credit_transactions" still exists';
  END IF;
  
  RAISE NOTICE 'Permissive RLS policies have been fixed';
END $$;

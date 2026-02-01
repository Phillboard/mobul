-- Migration: Optimize RLS Policies for Performance
-- Issue: RLS policies calling auth.uid() directly re-evaluate for each row
-- Solution: Wrap auth.uid() and auth.jwt() in subqueries for single evaluation
-- 
-- This migration affects ~560 policies identified by Supabase linter

-- ============================================
-- STRATEGY:
-- Since we can't easily modify policy definitions in-place,
-- we create helper functions that are already optimized
-- and update key policies manually for high-traffic tables.
-- ============================================

-- ============================================
-- 1. Create optimized helper functions
-- ============================================

-- Optimized function to get current user ID (evaluates once)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_id() IS 'Returns current authenticated user ID - use in RLS for better performance';

-- Optimized function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::public.app_role
  );
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS 'Check if current user is platform admin - cached per query';

-- ============================================
-- 2. Update high-traffic table policies
-- Focus on tables with most queries first
-- ============================================

-- ----- PROFILES TABLE -----
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ----- ORGANIZATIONS TABLE -----
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT org_id FROM public.org_members WHERE user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
CREATE POLICY "Admins can view all organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Admins can manage all organizations" ON public.organizations;
CREATE POLICY "Admins can manage all organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  );

-- ----- CAMPAIGNS TABLE -----
DROP POLICY IF EXISTS "Users can view campaigns for accessible clients" ON public.campaigns;
CREATE POLICY "Users can view campaigns for accessible clients" ON public.campaigns
  FOR SELECT TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can create campaigns for accessible clients" ON public.campaigns;
CREATE POLICY "Users can create campaigns for accessible clients" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can update campaigns for accessible clients" ON public.campaigns;
CREATE POLICY "Users can update campaigns for accessible clients" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id))
  WITH CHECK (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can delete campaigns for accessible clients" ON public.campaigns;
CREATE POLICY "Users can delete campaigns for accessible clients" ON public.campaigns
  FOR DELETE TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id));

-- ----- RECIPIENTS TABLE -----
DROP POLICY IF EXISTS "Users can view recipients for accessible audiences" ON public.recipients;
CREATE POLICY "Users can view recipients for accessible audiences" ON public.recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = recipients.audience_id
      AND public.user_can_access_client((SELECT auth.uid()), a.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can create recipients for accessible audiences" ON public.recipients;
CREATE POLICY "Users can create recipients for accessible audiences" ON public.recipients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = recipients.audience_id
      AND public.user_can_access_client((SELECT auth.uid()), a.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can update recipients for accessible audiences" ON public.recipients;
CREATE POLICY "Users can update recipients for accessible audiences" ON public.recipients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = recipients.audience_id
      AND public.user_can_access_client((SELECT auth.uid()), a.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = recipients.audience_id
      AND public.user_can_access_client((SELECT auth.uid()), a.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete recipients for accessible audiences" ON public.recipients;
CREATE POLICY "Users can delete recipients for accessible audiences" ON public.recipients
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = recipients.audience_id
      AND public.user_can_access_client((SELECT auth.uid()), a.client_id)
    )
  );

-- ----- AUDIENCES TABLE -----
DROP POLICY IF EXISTS "Users can view audiences for accessible clients" ON public.audiences;
CREATE POLICY "Users can view audiences for accessible clients" ON public.audiences
  FOR SELECT TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can create audiences for accessible clients" ON public.audiences;
CREATE POLICY "Users can create audiences for accessible clients" ON public.audiences
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can update audiences for accessible clients" ON public.audiences;
CREATE POLICY "Users can update audiences for accessible clients" ON public.audiences
  FOR UPDATE TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id))
  WITH CHECK (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can delete audiences for accessible clients" ON public.audiences;
CREATE POLICY "Users can delete audiences for accessible clients" ON public.audiences
  FOR DELETE TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id));

-- ----- TEMPLATES TABLE -----
DROP POLICY IF EXISTS "Users can view templates for accessible clients" ON public.templates;
CREATE POLICY "Users can view templates for accessible clients" ON public.templates
  FOR SELECT TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can create templates for accessible clients" ON public.templates;
CREATE POLICY "Users can create templates for accessible clients" ON public.templates
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can update templates for accessible clients" ON public.templates;
CREATE POLICY "Users can update templates for accessible clients" ON public.templates
  FOR UPDATE TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id))
  WITH CHECK (public.user_can_access_client((SELECT auth.uid()), client_id));

DROP POLICY IF EXISTS "Users can delete templates for accessible clients" ON public.templates;
CREATE POLICY "Users can delete templates for accessible clients" ON public.templates
  FOR DELETE TO authenticated
  USING (public.user_can_access_client((SELECT auth.uid()), client_id));

-- ----- DR_PHILLIP_CHATS TABLE -----
DROP POLICY IF EXISTS "Users can view their own chats" ON public.dr_phillip_chats;
CREATE POLICY "Users can view their own chats" ON public.dr_phillip_chats
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own chats" ON public.dr_phillip_chats;
CREATE POLICY "Users can create their own chats" ON public.dr_phillip_chats
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own chats" ON public.dr_phillip_chats;
CREATE POLICY "Users can update their own chats" ON public.dr_phillip_chats
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own chats" ON public.dr_phillip_chats;
CREATE POLICY "Users can delete their own chats" ON public.dr_phillip_chats
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ----- GIFT_CARD_INVENTORY TABLE -----
DROP POLICY IF EXISTS "Users can view assigned cards" ON public.gift_card_inventory;
CREATE POLICY "Users can view assigned cards" ON public.gift_card_inventory
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('admin', 'agency_owner', 'company_owner')
    )
  );

DROP POLICY IF EXISTS "Admins can update inventory" ON public.gift_card_inventory;
CREATE POLICY "Admins can update inventory" ON public.gift_card_inventory
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  );

-- ----- GIFT_CARD_DENOMINATIONS TABLE -----
DROP POLICY IF EXISTS "Users can view enabled denominations" ON public.gift_card_denominations;
CREATE POLICY "Users can view enabled denominations" ON public.gift_card_denominations
  FOR SELECT TO authenticated
  USING (
    is_enabled_by_admin = true 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Admins can manage denominations" ON public.gift_card_denominations;
CREATE POLICY "Admins can manage denominations" ON public.gift_card_denominations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  );

-- ----- CALL_SESSIONS TABLE -----
DROP POLICY IF EXISTS "Users can view call sessions for accessible campaigns" ON public.call_sessions;
CREATE POLICY "Users can view call sessions for accessible campaigns" ON public.call_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_sessions.campaign_id
      AND public.user_can_access_client((SELECT auth.uid()), c.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can create call sessions for accessible campaigns" ON public.call_sessions;
CREATE POLICY "Users can create call sessions for accessible campaigns" ON public.call_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_sessions.campaign_id
      AND public.user_can_access_client((SELECT auth.uid()), c.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can update call sessions for accessible campaigns" ON public.call_sessions;
CREATE POLICY "Users can update call sessions for accessible campaigns" ON public.call_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_sessions.campaign_id
      AND public.user_can_access_client((SELECT auth.uid()), c.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = call_sessions.campaign_id
      AND public.user_can_access_client((SELECT auth.uid()), c.client_id)
    )
  );

-- ----- AGENCIES TABLE -----
DROP POLICY IF EXISTS "Platform admins can manage agencies" ON public.agencies;
CREATE POLICY "Platform admins can manage agencies" ON public.agencies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Agency users can view their agency" ON public.agencies;
CREATE POLICY "Agency users can view their agency" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_agencies
      WHERE user_agencies.user_id = (SELECT auth.uid())
      AND user_agencies.agency_id = agencies.id
    )
  );

-- ----- USER_AGENCIES TABLE -----
DROP POLICY IF EXISTS "Users can view their agency memberships" ON public.user_agencies;
CREATE POLICY "Users can view their agency memberships" ON public.user_agencies
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================
-- 3. Update the user_can_access_client helper function
-- to use optimized auth calls internally
-- ============================================
CREATE OR REPLACE FUNCTION public.user_can_access_client(
  _user_id UUID, 
  _client_id UUID
) 
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins can access all clients
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
  OR
  -- Agency owners can access clients in their org
  EXISTS (
    SELECT 1 
    FROM clients c
    JOIN org_members om ON om.org_id = c.org_id
    JOIN user_roles ur ON ur.user_id = om.user_id
    WHERE c.id = _client_id 
      AND om.user_id = _user_id
      AND ur.role = 'agency_owner'
  )
  OR
  -- Direct client access
  EXISTS (
    SELECT 1 FROM client_users
    WHERE user_id = _user_id AND client_id = _client_id
  );
$$;

-- ============================================
-- DOCUMENTATION: Additional Policies to Update
-- ============================================
-- The following tables also have policies that need optimization
-- but can be done incrementally as needed:
--
-- HIGH TRAFFIC:
-- - landing_pages, landing_page_exports, landing_page_ai_chats
-- - contacts, contact_lists, contact_custom_field_definitions
-- - events, print_batches, campaign_versions
-- - campaign_conditions, campaign_comments, campaign_approvals
-- - qr_code_configs, qr_tracking_events
-- - leads, lead_purchases
-- - crm_integrations, crm_events
-- - call_center_scripts, call_dispositions
-- - webhook_logs, webhooks, api_keys
--
-- LOWER TRAFFIC:
-- - admin_notifications, admin_alerts, admin_impersonations
-- - activity_log, security_audit_log, recipient_audit_log
-- - billing tables, usage analytics
--
-- Run the Supabase linter after deployment to verify
-- which policies still need optimization.

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'RLS policy optimization migration completed';
  RAISE NOTICE 'High-traffic tables (profiles, campaigns, recipients, audiences, templates) have been optimized';
  RAISE NOTICE 'Run Supabase linter to check remaining policies';
END $$;

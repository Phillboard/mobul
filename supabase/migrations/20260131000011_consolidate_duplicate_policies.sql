-- ============================================
-- Consolidate Duplicate Policies
-- Removes truly redundant policies that do the same thing
-- ============================================

-- ============================================
-- 1. FIX zapier_connections - has duplicate policies
-- "Users can X zapier connections for accessible clients" AND
-- "Users can X zapier connections for their client"
-- These are redundant - user_can_access_client already covers client_users check
-- ============================================

-- SELECT policies
DROP POLICY IF EXISTS "Users can view zapier connections for their client" ON public.zapier_connections;
-- Keep: "Users can view zapier connections for accessible clients"

-- INSERT policies  
DROP POLICY IF EXISTS "Users can create zapier connections for their client" ON public.zapier_connections;
-- Keep: "Users can create zapier connections for accessible clients"

-- UPDATE policies
DROP POLICY IF EXISTS "Users can update zapier connections for their client" ON public.zapier_connections;
-- Keep: "Users can update zapier connections for accessible clients"

-- DELETE policies
DROP POLICY IF EXISTS "Users can delete zapier connections for their client" ON public.zapier_connections;
-- Keep: "Users can delete zapier connections for accessible clients"

-- ============================================
-- 2. FIX zapier_trigger_logs - has duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Users can view trigger logs for their client connections" ON public.zapier_trigger_logs;
-- Keep: "Users can view zapier logs for accessible connections"

-- ============================================
-- 3. FIX permission_templates - has duplicate SELECT policies
-- "Allow read access to permission templates" AND
-- "Users can view permission templates"
-- Both do the same thing: USING (true)
-- ============================================

DROP POLICY IF EXISTS "Allow read access to permission templates" ON public.permission_templates;
-- Keep: "Users can view permission templates"

-- ============================================
-- 4. FIX error_logs INSERT policies
-- "Platform admins can insert error logs" AND
-- "System can insert error logs"
-- Both allow INSERT for authenticated users - may be redundant
-- ============================================

-- Check what these policies actually do before dropping
-- "Platform admins can insert error logs" - WITH CHECK (true) for authenticated
-- "System can insert error logs" - WITH CHECK (true) for authenticated  
-- These ARE duplicates
DROP POLICY IF EXISTS "Platform admins can insert error logs" ON public.error_logs;
-- Keep: "System can insert error logs"

-- ============================================
-- 5. Verify consolidation
-- ============================================

DO $$
DECLARE
  zapier_count INTEGER;
  perm_count INTEGER;
  error_count INTEGER;
BEGIN
  -- Check zapier_connections
  SELECT COUNT(*) INTO zapier_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'zapier_connections';
  
  RAISE NOTICE 'zapier_connections now has % policies', zapier_count;
  
  -- Check permission_templates
  SELECT COUNT(*) INTO perm_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'permission_templates';
  
  RAISE NOTICE 'permission_templates now has % policies', perm_count;
  
  -- Check error_logs INSERT policies
  SELECT COUNT(*) INTO error_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND c.relname = 'error_logs'
    AND pol.polcmd = 'a';  -- INSERT
  
  RAISE NOTICE 'error_logs INSERT policies count: %', error_count;
END $$;

-- ============================================
-- Note: The following multiple policies are INTENTIONAL
-- and should NOT be consolidated:
-- ============================================
-- 
-- client_users: Different access levels (admin, agency, company, user)
-- activity_log: Different access levels (admin, agency, company)
-- clients: Different access levels (admin, agency, user)
-- org_members: Different access levels (admin, agency, user)
-- error_logs SELECT: Different access levels (admin, client, own)
-- gift_card_billing_ledger: Different access levels (admin, agency, client)
-- mail_provider_settings: Different access levels (admin, agency, client)
-- twilio_fallback_events: Different access levels (admin, agency, client)
-- credit_accounts: Different access levels (agency, client)
-- profiles: Different access levels (admin, own)
-- organizations: Different access levels (admin, user)
-- etc.
--
-- These represent a layered permission model where:
-- - Admins can see/do everything
-- - Agency owners can see/do agency-level things
-- - Company owners can see/do client-level things
-- - Users can see/do their assigned things
-- ============================================

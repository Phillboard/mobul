-- ============================================================================
-- RLS Permission System Overhaul - Safe Role Checking
-- ============================================================================
-- This migration fixes the infinite recursion bug in RLS policies by creating
-- internal bypass functions that all role-checking helpers use.
--
-- Problem: RLS policies on user_roles call has_role(), which queries user_roles,
-- triggering the same RLS policies -> infinite recursion
--
-- Solution: Create internal functions that bypass RLS using SET LOCAL row_security = off
-- ============================================================================

-- ============================================================================
-- PHASE 1: Create Internal Bypass Functions
-- These are the foundation that all other functions will use
-- ============================================================================

-- Internal function: Check if user has any of the specified roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public._check_user_roles_internal(
  _user_id uuid,
  _roles public.app_role[]
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Bypass RLS to prevent recursion
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = ANY(_roles)
  );
END;
$$;

COMMENT ON FUNCTION public._check_user_roles_internal(uuid, public.app_role[]) IS 
  'Internal function to check user roles without triggering RLS. Used by all role-checking helpers.';

-- Internal function: Get all roles for a user (bypasses RLS)
CREATE OR REPLACE FUNCTION public._get_user_roles_internal(_user_id uuid)
RETURNS SETOF public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  SET LOCAL row_security = off;
  
  RETURN QUERY
  SELECT role FROM public.user_roles WHERE user_id = _user_id;
END;
$$;

COMMENT ON FUNCTION public._get_user_roles_internal(uuid) IS 
  'Internal function to get user roles without triggering RLS. Used by permission checking helpers.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public._check_user_roles_internal(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public._get_user_roles_internal(uuid) TO authenticated;

-- ============================================================================
-- PHASE 2: Update Core Helper Functions
-- ============================================================================

-- 2.1 has_role() - Most critical, used everywhere
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._check_user_roles_internal(_user_id, ARRAY[_role]);
$$;

-- 2.2 has_permission() - Uses role_permissions join
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_list public.app_role[];
BEGIN
  -- Get user's roles safely using internal function
  SELECT array_agg(r) INTO user_roles_list 
  FROM public._get_user_roles_internal(_user_id) r;
  
  -- Check user-specific permission override (revoked)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id 
      AND p.name = _permission_name
      AND up.granted = false
  ) THEN 
    RETURN false;
  END IF;
  
  -- Check user-specific permission grant
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id 
      AND p.name = _permission_name
      AND up.granted = true
  ) THEN 
    RETURN true;
  END IF;
  
  -- Check role-based permissions
  IF user_roles_list IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.role_permissions rp
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE rp.role = ANY(user_roles_list) 
        AND p.name = _permission_name
    );
  END IF;
  
  RETURN false;
END;
$$;

-- 2.3 get_user_permissions() - Get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_list public.app_role[];
BEGIN
  -- Get user's roles safely
  SELECT array_agg(r) INTO user_roles_list 
  FROM public._get_user_roles_internal(_user_id) r;
  
  -- Return role-based permissions
  RETURN QUERY
  SELECT DISTINCT p.name
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE rp.role = ANY(COALESCE(user_roles_list, ARRAY[]::public.app_role[]))
  
  UNION
  
  -- Plus user-specific grants
  SELECT DISTINCT p.name
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = _user_id AND up.granted = true;
END;
$$;

-- 2.4 get_user_role_level() - Get lowest (highest privilege) role level
CREATE OR REPLACE FUNCTION public.get_user_role_level(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_list public.app_role[];
  result integer;
BEGIN
  -- Get user's roles safely
  SELECT array_agg(r) INTO user_roles_list 
  FROM public._get_user_roles_internal(_user_id) r;
  
  IF user_roles_list IS NULL THEN
    RETURN 999; -- No roles = lowest privilege
  END IF;
  
  SELECT COALESCE(MIN(rh.level), 999) INTO result
  FROM public.role_hierarchy rh
  WHERE rh.role = ANY(user_roles_list);
  
  RETURN result;
END;
$$;

-- 2.5 user_can_access_client() - Client-level access check
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can access all clients
  IF public._check_user_roles_internal(_user_id, ARRAY['admin'::public.app_role]) THEN
    RETURN true;
  END IF;
  
  -- Agency owners can access clients in their org
  IF public._check_user_roles_internal(_user_id, ARRAY['agency_owner'::public.app_role]) THEN
    IF EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.org_members om ON om.org_id = c.org_id
      WHERE c.id = _client_id AND om.user_id = _user_id
    ) THEN 
      RETURN true;
    END IF;
  END IF;
  
  -- Users directly assigned to the client
  RETURN EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_id = _client_id AND user_id = _user_id
  );
END;
$$;

-- 2.6 user_has_org_access() - Organization-level access check
CREATE OR REPLACE FUNCTION public.user_has_org_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can access all orgs
  IF public._check_user_roles_internal(_user_id, ARRAY['admin'::public.app_role]) THEN
    RETURN true;
  END IF;
  
  -- Org members can access their org
  RETURN EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = _user_id
  );
END;
$$;

-- 2.7 user_can_manage_role() - Check if user can assign/manage a role
CREATE OR REPLACE FUNCTION public.user_can_manage_role(_user_id uuid, _target_role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_list public.app_role[];
BEGIN
  -- Get user's roles safely
  SELECT array_agg(r) INTO user_roles_list 
  FROM public._get_user_roles_internal(_user_id) r;
  
  IF user_roles_list IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.role_hierarchy rh
    WHERE rh.role = ANY(user_roles_list) 
      AND _target_role = ANY(rh.can_manage_roles)
  );
END;
$$;

-- 2.8 platform_admin_exists() - Check if any admin exists
CREATE OR REPLACE FUNCTION public.platform_admin_exists()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE role = 'admin'::public.app_role
  );
END;
$$;

-- 2.9 get_accessible_documentation() - Get docs user can see
CREATE OR REPLACE FUNCTION public.get_accessible_documentation()
RETURNS TABLE(
  id uuid, 
  category text, 
  title text, 
  slug text, 
  file_path text, 
  order_index integer, 
  doc_audience text, 
  visible_to_roles public.app_role[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles_list public.app_role[];
BEGIN
  -- Check if admin using safe internal function
  IF public._check_user_roles_internal(auth.uid(), ARRAY['admin'::public.app_role]) THEN
    RETURN QUERY 
    SELECT dp.id, dp.category, dp.title, dp.slug, dp.file_path, 
      dp.order_index, dp.doc_audience, dp.visible_to_roles
    FROM public.documentation_pages dp 
    ORDER BY dp.category, dp.order_index, dp.title;
  ELSE
    -- Get user's roles safely
    SELECT array_agg(r) INTO user_roles_list 
    FROM public._get_user_roles_internal(auth.uid()) r;
    
    RETURN QUERY 
    SELECT dp.id, dp.category, dp.title, dp.slug, dp.file_path, 
      dp.order_index, dp.doc_audience, dp.visible_to_roles
    FROM public.documentation_pages dp
    WHERE user_roles_list && dp.visible_to_roles  -- Array overlap
    ORDER BY dp.category, dp.order_index, dp.title;
  END IF;
END;
$$;

-- ============================================================================
-- PHASE 3: Fix user_roles Table RLS Policies
-- These MUST use _check_user_roles_internal to avoid recursion
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Users can always view their own roles (direct check, no function call needed)
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Admins can manage all roles (uses internal bypass function)
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public._check_user_roles_internal((SELECT auth.uid()), ARRAY['admin'::public.app_role]))
  WITH CHECK (public._check_user_roles_internal((SELECT auth.uid()), ARRAY['admin'::public.app_role]));

-- ============================================================================
-- PHASE 4: Fix profiles Table RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Admins can view all profiles (now uses safe has_role)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- ============================================================================
-- PHASE 5: Fix organizations Table RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Admins can manage all organizations
CREATE POLICY "Admins can manage all organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = (SELECT auth.uid()))
  );

-- ============================================================================
-- PHASE 6: Fix Inline user_roles Queries in Other Policies
-- Convert all EXISTS (SELECT 1 FROM user_roles ...) to use has_role()
-- ============================================================================

-- 6.1 provisioning_alert_thresholds
DROP POLICY IF EXISTS "Admins can manage alert thresholds" ON public.provisioning_alert_thresholds;
CREATE POLICY "Admins can manage alert thresholds" ON public.provisioning_alert_thresholds
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.2 gift_card_inventory
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.gift_card_inventory;
CREATE POLICY "Admins can manage inventory" ON public.gift_card_inventory
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all inventory" ON public.gift_card_inventory;
CREATE POLICY "Admins can view all inventory" ON public.gift_card_inventory
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.3 rate_limit_tracking
DROP POLICY IF EXISTS "Admins can manage rate limit tracking" ON public.rate_limit_tracking;
CREATE POLICY "Admins can manage rate limit tracking" ON public.rate_limit_tracking
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.4 beta_feedback
DROP POLICY IF EXISTS "Admins can update beta feedback" ON public.beta_feedback;
CREATE POLICY "Admins can update beta feedback" ON public.beta_feedback
  FOR UPDATE
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.5 error_logs
DROP POLICY IF EXISTS "Admins can update error logs" ON public.error_logs;
CREATE POLICY "Admins can update error logs" ON public.error_logs
  FOR UPDATE
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all error logs" ON public.error_logs;
CREATE POLICY "Admins can view all error logs" ON public.error_logs
  FOR SELECT
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.6 admin_notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
  FOR SELECT
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.7 performance_metrics
DROP POLICY IF EXISTS "Admins can view all performance metrics" ON public.performance_metrics;
CREATE POLICY "Admins can view all performance metrics" ON public.performance_metrics
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.8 gift_card_provisioning_trace (admin OR tech_support)
DROP POLICY IF EXISTS "Admins can view all provisioning traces" ON public.gift_card_provisioning_trace;
CREATE POLICY "Admins can view all provisioning traces" ON public.gift_card_provisioning_trace
  FOR SELECT
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role) OR
    public.has_role((SELECT auth.uid()), 'tech_support'::public.app_role)
  );

-- 6.9 security_audit_log
DROP POLICY IF EXISTS "Admins can view all security logs" ON public.security_audit_log;
CREATE POLICY "Admins can view all security logs" ON public.security_audit_log
  FOR SELECT
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.10 usage_analytics
DROP POLICY IF EXISTS "Admins can view all usage analytics" ON public.usage_analytics;
CREATE POLICY "Admins can view all usage analytics" ON public.usage_analytics
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.11 rate_limit_log
DROP POLICY IF EXISTS "Admins can view rate limit logs" ON public.rate_limit_log;
CREATE POLICY "Admins can view rate limit logs" ON public.rate_limit_log
  FOR SELECT
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.12 gift_card_inventory_balance_history
DROP POLICY IF EXISTS "Admins manage balance history" ON public.gift_card_inventory_balance_history;
CREATE POLICY "Admins manage balance history" ON public.gift_card_inventory_balance_history
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6.13 campaign_conditions (call center access)
DROP POLICY IF EXISTS "Call center can view campaign conditions" ON public.campaign_conditions;
CREATE POLICY "Call center can view campaign conditions" ON public.campaign_conditions
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'call_center'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.clients cl ON cl.id = c.client_id
      WHERE c.id = campaign_conditions.campaign_id
      AND public.user_can_access_client((SELECT auth.uid()), cl.id)
    )
  );

-- 6.14 call center provisioning trace access
DROP POLICY IF EXISTS "Call center can view provisioning traces" ON public.gift_card_provisioning_trace;
CREATE POLICY "Call center can view provisioning traces" ON public.gift_card_provisioning_trace
  FOR SELECT
  USING (public.has_role((SELECT auth.uid()), 'call_center'::public.app_role));

-- 6.15 zapier_connections (admin access component)
DROP POLICY IF EXISTS "Users can create zapier connections for their client" ON public.zapier_connections;
CREATE POLICY "Users can create zapier connections for their client" ON public.zapier_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_users.client_id = zapier_connections.client_id 
      AND client_users.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users can view zapier connections for their client" ON public.zapier_connections;
CREATE POLICY "Users can view zapier connections for their client" ON public.zapier_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_users.client_id = zapier_connections.client_id 
      AND client_users.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users can update zapier connections for their client" ON public.zapier_connections;
CREATE POLICY "Users can update zapier connections for their client" ON public.zapier_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_users.client_id = zapier_connections.client_id 
      AND client_users.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users can delete zapier connections for their client" ON public.zapier_connections;
CREATE POLICY "Users can delete zapier connections for their client" ON public.zapier_connections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users
      WHERE client_users.client_id = zapier_connections.client_id 
      AND client_users.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

-- 6.16 zapier_trigger_logs
DROP POLICY IF EXISTS "Users can view trigger logs for their client connections" ON public.zapier_trigger_logs;
CREATE POLICY "Users can view trigger logs for their client connections" ON public.zapier_trigger_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zapier_connections zc
      JOIN public.client_users cu ON cu.client_id = zc.client_id
      WHERE zc.id = zapier_trigger_logs.zapier_connection_id 
      AND cu.user_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

-- 6.17 documentation_pages (role-based visibility)
DROP POLICY IF EXISTS "Users can view docs matching their role" ON public.documentation_pages;
CREATE POLICY "Users can view docs matching their role" ON public.documentation_pages
  FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public._get_user_roles_internal((SELECT auth.uid())) r
      WHERE r = ANY(visible_to_roles)
    )
  );

-- ============================================================================
-- PHASE 7: Ensure RLS is enabled on all critical tables
-- ============================================================================

-- These should already be enabled but ensure they are
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Summary of changes:
-- 1. Created 2 internal bypass functions (_check_user_roles_internal, _get_user_roles_internal)
-- 2. Updated 9 helper functions to use internal bypass
-- 3. Fixed user_roles RLS policies (source of recursion)
-- 4. Fixed profiles RLS policies
-- 5. Fixed organizations RLS policies
-- 6. Fixed 17+ inline policies with direct user_roles queries
--
-- All role checking now flows through the safe internal functions,
-- eliminating any possibility of infinite recursion.
-- ============================================================================

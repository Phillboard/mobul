-- ============================================================================
-- Fix Function Volatility for SET LOCAL Support
-- ============================================================================
-- Problem: Functions using SET LOCAL row_security = off were marked as STABLE,
-- but PostgreSQL requires VOLATILE for functions that use SET commands.
-- Error: "SET is not allowed in a non-volatile function"
--
-- Fix: Recreate the affected functions with VOLATILE volatility
-- ============================================================================

-- 1. Fix _check_user_roles_internal (STABLE -> VOLATILE)
CREATE OR REPLACE FUNCTION public._check_user_roles_internal(
  _user_id uuid,
  _roles public.app_role[]
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Changed from STABLE to VOLATILE because we use SET LOCAL
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

-- 2. Fix _get_user_roles_internal (STABLE -> VOLATILE)
CREATE OR REPLACE FUNCTION public._get_user_roles_internal(_user_id uuid)
RETURNS SETOF public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Changed from STABLE to VOLATILE because we use SET LOCAL
AS $$
BEGIN
  SET LOCAL row_security = off;
  
  RETURN QUERY
  SELECT role FROM public.user_roles WHERE user_id = _user_id;
END;
$$;

-- 3. Fix platform_admin_exists (STABLE -> VOLATILE)
CREATE OR REPLACE FUNCTION public.platform_admin_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
-- Changed from STABLE to VOLATILE because we use SET LOCAL
AS $$
BEGIN
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE role = 'admin'::public.app_role
  );
END;
$$;

-- Note: The following functions do NOT use SET LOCAL directly, 
-- they only call the fixed internal functions, so they can remain STABLE:
-- - has_role()
-- - has_permission()
-- - get_user_permissions()
-- - get_user_role_level()
-- - user_can_access_client()
-- - user_has_org_access()
-- - user_can_manage_role()
-- - get_accessible_documentation()

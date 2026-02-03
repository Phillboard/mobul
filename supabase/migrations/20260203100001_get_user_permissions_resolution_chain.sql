-- ============================================================
-- MIGRATION: get_user_permissions with Full Resolution Chain
-- ============================================================
-- Replaces the existing get_user_permissions RPC with a version that
-- implements the full permission resolution chain:
--   1. User-level overrides (user_permissions table)
--   2. Org-level overrides (org_permission_overrides table)
--   3. Role defaults (role_permissions table)
--
-- Returns: Array of { permission_name TEXT, source TEXT }
--   source = 'user_override' | 'org_override' | 'role_default'
-- ============================================================

-- Drop the existing function first (signature is changing)
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

-- Create the new function with resolution chain
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_name TEXT, source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_role public.app_role;
  _agency_id UUID;
BEGIN
  -- Get user's primary role (highest privilege = lowest level number)
  SELECT ur.role INTO _user_role
  FROM user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY 
    CASE ur.role 
      WHEN 'admin' THEN 1
      WHEN 'tech_support' THEN 2
      WHEN 'agency_owner' THEN 3
      WHEN 'company_owner' THEN 4
      WHEN 'developer' THEN 5
      WHEN 'call_center' THEN 6
      ELSE 99
    END
  LIMIT 1;

  -- If no role found, return empty
  IF _user_role IS NULL THEN
    RETURN;
  END IF;

  -- Admin gets everything, skip resolution chain for performance
  IF _user_role = 'admin' THEN
    RETURN QUERY
      SELECT p.name, 'role_default'::TEXT
      FROM permissions p;
    RETURN;
  END IF;

  -- Get user's agency (for org-level overrides)
  -- Agency owners: directly from user_agencies
  -- Client owners / call center / developer: through client_users -> clients -> agencies
  SELECT COALESCE(
    (SELECT ua.agency_id FROM user_agencies ua WHERE ua.user_id = _user_id LIMIT 1),
    (SELECT c.agency_id FROM client_users cu JOIN clients c ON cu.client_id = c.id WHERE cu.user_id = _user_id LIMIT 1)
  ) INTO _agency_id;

  -- Build the effective permission set using the resolution chain
  RETURN QUERY
  WITH 
  -- Layer 1: User-level overrides (both grants and revokes)
  user_overrides AS (
    SELECT p.name AS perm_name, up.granted
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id
  ),
  -- Layer 2: Org-level overrides (only if user has an agency)
  org_overrides AS (
    SELECT opo.permission_name AS perm_name, opo.granted
    FROM org_permission_overrides opo
    WHERE opo.agency_id = _agency_id
      AND opo.role = _user_role::TEXT
      AND _agency_id IS NOT NULL
  ),
  -- Layer 3: Role defaults from database
  role_defaults AS (
    SELECT p.name AS perm_name
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = _user_role
  ),
  -- Combine with resolution priority
  effective AS (
    -- Permissions GRANTED by role default (not revoked by org or user override)
    SELECT rd.perm_name, 'role_default'::TEXT AS src
    FROM role_defaults rd
    WHERE NOT EXISTS (
      SELECT 1 FROM org_overrides oo WHERE oo.perm_name = rd.perm_name AND oo.granted = false
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_overrides uo WHERE uo.perm_name = rd.perm_name AND uo.granted = false
    )

    UNION

    -- Permissions GRANTED by org override (not in role default, not revoked by user override)
    SELECT oo.perm_name, 'org_override'::TEXT AS src
    FROM org_overrides oo
    WHERE oo.granted = true
    AND NOT EXISTS (
      SELECT 1 FROM role_defaults rd WHERE rd.perm_name = oo.perm_name
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_overrides uo WHERE uo.perm_name = oo.perm_name AND uo.granted = false
    )

    UNION

    -- Permissions GRANTED by user override (regardless of anything else)
    SELECT uo.perm_name, 'user_override'::TEXT AS src
    FROM user_overrides uo
    WHERE uo.granted = true
  )
  SELECT e.perm_name, e.src FROM effective e;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_user_permissions(UUID) IS 
  'Returns effective permissions for a user with full resolution chain: user_override > org_override > role_default. Returns permission_name and source for each granted permission.';

-- ============================================================
-- Helper function: Check if user has a specific permission
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_user_permissions(_user_id) 
    WHERE permission_name = _permission
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.user_has_permission(UUID, TEXT) IS 
  'Check if a user has a specific permission. Uses the full resolution chain.';

-- ============================================================
-- Helper function: Get permissions with detailed source info
-- (Useful for admin UI / debugging)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions_detailed(_user_id UUID)
RETURNS TABLE(
  permission_name TEXT,
  source TEXT,
  is_granted BOOLEAN,
  role_default BOOLEAN,
  org_override BOOLEAN,
  user_override BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_role public.app_role;
  _agency_id UUID;
BEGIN
  -- Get user's primary role
  SELECT ur.role INTO _user_role
  FROM user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY 
    CASE ur.role 
      WHEN 'admin' THEN 1
      WHEN 'tech_support' THEN 2
      WHEN 'agency_owner' THEN 3
      WHEN 'company_owner' THEN 4
      WHEN 'developer' THEN 5
      WHEN 'call_center' THEN 6
      ELSE 99
    END
  LIMIT 1;

  IF _user_role IS NULL THEN
    RETURN;
  END IF;

  -- Get user's agency
  SELECT COALESCE(
    (SELECT ua.agency_id FROM user_agencies ua WHERE ua.user_id = _user_id LIMIT 1),
    (SELECT c.agency_id FROM client_users cu JOIN clients c ON cu.client_id = c.id WHERE cu.user_id = _user_id LIMIT 1)
  ) INTO _agency_id;

  -- Return all permissions with detailed breakdown
  RETURN QUERY
  WITH 
  all_perms AS (SELECT p.name AS perm_name FROM permissions p),
  user_ov AS (
    SELECT p.name AS perm_name, up.granted
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id
  ),
  org_ov AS (
    SELECT opo.permission_name AS perm_name, opo.granted
    FROM org_permission_overrides opo
    WHERE opo.agency_id = _agency_id
      AND opo.role = _user_role::TEXT
      AND _agency_id IS NOT NULL
  ),
  role_def AS (
    SELECT p.name AS perm_name
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = _user_role
  )
  SELECT 
    ap.perm_name,
    CASE 
      WHEN uo.perm_name IS NOT NULL THEN 
        CASE WHEN uo.granted THEN 'user_override' ELSE 'user_revoked' END
      WHEN oo.perm_name IS NOT NULL THEN 
        CASE WHEN oo.granted THEN 'org_override' ELSE 'org_revoked' END
      WHEN rd.perm_name IS NOT NULL THEN 'role_default'
      ELSE 'not_granted'
    END,
    -- is_granted: final effective state
    CASE
      WHEN uo.perm_name IS NOT NULL THEN uo.granted
      WHEN oo.perm_name IS NOT NULL THEN oo.granted
      WHEN rd.perm_name IS NOT NULL THEN true
      ELSE false
    END,
    -- role_default
    rd.perm_name IS NOT NULL,
    -- org_override
    oo.perm_name IS NOT NULL,
    -- user_override
    uo.perm_name IS NOT NULL
  FROM all_perms ap
  LEFT JOIN user_ov uo ON uo.perm_name = ap.perm_name
  LEFT JOIN org_ov oo ON oo.perm_name = ap.perm_name
  LEFT JOIN role_def rd ON rd.perm_name = ap.perm_name
  ORDER BY ap.perm_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions_detailed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions_detailed(UUID) TO service_role;

COMMENT ON FUNCTION public.get_user_permissions_detailed(UUID) IS 
  'Returns ALL permissions with detailed breakdown of role_default, org_override, and user_override status. Useful for admin UI and debugging.';

-- Phase 1: Database Optimization for Enterprise Scale

-- 1.1: Add is_active column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 1.2: Create audit logging table
CREATE TABLE IF NOT EXISTS user_management_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id),
  target_user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_management_audit ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON user_management_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 1.3: Create paginated user fetch function
CREATE OR REPLACE FUNCTION get_manageable_users_paginated(
  _requesting_user_id uuid,
  _search text DEFAULT NULL,
  _role_filter app_role DEFAULT NULL,
  _org_filter uuid DEFAULT NULL,
  _client_filter uuid DEFAULT NULL,
  _show_inactive boolean DEFAULT false,
  _limit int DEFAULT 20,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  is_active boolean,
  roles app_role[],
  org_ids uuid[],
  org_names text[],
  client_ids uuid[],
  client_names text[],
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requesting_user_role app_role;
  _requesting_user_org_id uuid;
  _requesting_user_client_id uuid;
BEGIN
  -- Get requesting user's highest privilege role
  SELECT role INTO _requesting_user_role
  FROM user_roles
  WHERE user_id = _requesting_user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'tech_support' THEN 2
    WHEN 'agency_owner' THEN 3
    WHEN 'company_owner' THEN 4
    WHEN 'developer' THEN 5
    WHEN 'call_center' THEN 6
  END
  LIMIT 1;

  -- Get requesting user's org and client
  SELECT om.org_id INTO _requesting_user_org_id
  FROM org_members om
  WHERE om.user_id = _requesting_user_id
  LIMIT 1;

  SELECT cu.client_id INTO _requesting_user_client_id
  FROM client_users cu
  WHERE cu.user_id = _requesting_user_id
  LIMIT 1;

  -- Return users based on requesting user's scope
  RETURN QUERY
  WITH user_data AS (
    SELECT DISTINCT
      p.id,
      p.email,
      p.full_name,
      p.created_at,
      p.is_active,
      ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles,
      ARRAY_AGG(DISTINCT om.org_id) FILTER (WHERE om.org_id IS NOT NULL) as org_ids,
      ARRAY_AGG(DISTINCT o.name) FILTER (WHERE o.name IS NOT NULL) as org_names,
      ARRAY_AGG(DISTINCT cu.client_id) FILTER (WHERE cu.client_id IS NOT NULL) as client_ids,
      ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as client_names
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN org_members om ON om.user_id = p.id
    LEFT JOIN organizations o ON o.id = om.org_id
    LEFT JOIN client_users cu ON cu.user_id = p.id
    LEFT JOIN clients c ON c.id = cu.client_id
    WHERE 
      -- Scope filtering based on requesting user's role
      (_requesting_user_role IN ('admin', 'tech_support')
        OR (_requesting_user_role = 'agency_owner' AND (om.org_id = _requesting_user_org_id OR cu.client_id IN (
          SELECT cl.id FROM clients cl WHERE cl.org_id = _requesting_user_org_id
        )))
        OR (_requesting_user_role = 'company_owner' AND cu.client_id = _requesting_user_client_id)
      )
      -- Search filter
      AND (_search IS NULL OR 
        p.email ILIKE '%' || _search || '%' OR 
        p.full_name ILIKE '%' || _search || '%')
      -- Role filter
      AND (_role_filter IS NULL OR ur.role = _role_filter)
      -- Org filter
      AND (_org_filter IS NULL OR om.org_id = _org_filter)
      -- Client filter
      AND (_client_filter IS NULL OR cu.client_id = _client_filter)
      -- Active status filter
      AND (_show_inactive = true OR p.is_active = true)
    GROUP BY p.id, p.email, p.full_name, p.created_at, p.is_active
  ),
  total AS (
    SELECT COUNT(*) as cnt FROM user_data
  )
  SELECT 
    ud.*,
    t.cnt as total_count
  FROM user_data ud
  CROSS JOIN total t
  ORDER BY ud.created_at DESC
  LIMIT _limit
  OFFSET _offset;
END;
$$;

-- 1.4: Complete permission matrix for tech_support role
INSERT INTO role_permissions (role, permission_id)
SELECT 'tech_support', p.id
FROM permissions p
WHERE p.name IN (
  'dashboard.view',
  'users.view',
  'users.create',
  'users.edit',
  'organizations.view',
  'clients.view',
  'campaigns.view',
  'giftcards.view',
  'calls.view',
  'platform.impersonate',
  'analytics.view',
  'system.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 1.5: Complete permission matrix for developer role
INSERT INTO role_permissions (role, permission_id)
SELECT 'developer', p.id
FROM permissions p
WHERE p.name IN (
  'dashboard.view',
  'api.view',
  'api.manage',
  'system.view',
  'analytics.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;
-- Step 2: Create platform-level permissions and policies
INSERT INTO permissions (name, module, description) VALUES
  ('platform.manage_all_orgs', 'platform', 'Manage all organizations across the platform'),
  ('platform.manage_all_users', 'platform', 'Manage all users across all organizations'),
  ('platform.view_system_analytics', 'platform', 'View system-wide analytics and metrics'),
  ('platform.manage_billing', 'platform', 'Manage billing and subscriptions for all orgs'),
  ('platform.manage_permissions', 'platform', 'Manage permission system'),
  ('platform.view_audit_logs', 'platform', 'View all audit logs across platform')
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to platform_admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'platform_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Update RLS policies to allow platform_admin full access
-- Update profiles policy
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON profiles;
CREATE POLICY "Platform admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

-- Update organizations policy  
DROP POLICY IF EXISTS "Platform admins can manage all organizations" ON organizations;
CREATE POLICY "Platform admins can manage all organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

-- Update clients policy
DROP POLICY IF EXISTS "Platform admins can view all clients" ON clients;
CREATE POLICY "Platform admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

DROP POLICY IF EXISTS "Platform admins can manage all clients" ON clients;
CREATE POLICY "Platform admins can manage all clients"
  ON clients FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

-- Update user_roles to allow platform_admin to manage roles
DROP POLICY IF EXISTS "Platform admins can manage all user roles" ON user_roles;
CREATE POLICY "Platform admins can manage all user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

-- Update org_members to allow platform_admin
DROP POLICY IF EXISTS "Platform admins can manage all org members" ON org_members;
CREATE POLICY "Platform admins can manage all org members"
  ON org_members FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

-- Update client_users policy
DROP POLICY IF EXISTS "Platform admins can manage all client users" ON client_users;
CREATE POLICY "Platform admins can manage all client users"
  ON client_users FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

-- Update user_permissions policy
DROP POLICY IF EXISTS "Platform admins can manage all user permissions" ON user_permissions;
CREATE POLICY "Platform admins can manage all user permissions"
  ON user_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'));

-- Function to check if platform admin exists
CREATE OR REPLACE FUNCTION public.platform_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE role = 'platform_admin'
  );
$$;
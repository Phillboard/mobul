
-- Add role column as nullable first
ALTER TABLE role_permissions 
ADD COLUMN role app_role;

-- Set all existing rows to admin role
UPDATE role_permissions 
SET role = 'admin'::app_role
WHERE role IS NULL;

-- Now make it NOT NULL
ALTER TABLE role_permissions 
ALTER COLUMN role SET NOT NULL;

-- Remove duplicates - keep only one entry per permission for admin
DELETE FROM role_permissions a
WHERE EXISTS (
  SELECT 1 
  FROM role_permissions b 
  WHERE b.permission_id = a.permission_id 
  AND b.role = a.role
  AND b.id < a.id
);

-- Add unique constraint
ALTER TABLE role_permissions 
ADD CONSTRAINT role_permissions_role_permission_unique UNIQUE (role, permission_id);

-- Insert permissions for agency_owner (all except system admin)
INSERT INTO role_permissions (role, permission_id)
SELECT 'agency_owner'::app_role, p.id
FROM permissions p
WHERE p.module NOT IN ('admin', 'system')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Insert permissions for company_owner (campaigns, contacts, mail, etc.)
INSERT INTO role_permissions (role, permission_id)
SELECT 'company_owner'::app_role, p.id
FROM permissions p
WHERE p.module IN ('campaigns', 'contacts', 'mail', 'landing_pages', 'forms', 'rewards', 'analytics')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Insert permissions for call_center (call-related only)
INSERT INTO role_permissions (role, permission_id)
SELECT 'call_center'::app_role, p.id
FROM permissions p
WHERE p.module = 'calls' OR p.name LIKE 'calls.%'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Update function to use role column
CREATE OR REPLACE FUNCTION get_user_permissions(_user_id uuid)
RETURNS TABLE (permission_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.name
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role = ur.role
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id
  
  UNION
  
  SELECT DISTINCT p.name
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = _user_id AND up.granted = true;
$$;

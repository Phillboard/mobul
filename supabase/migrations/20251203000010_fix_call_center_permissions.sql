-- Fix call center permissions for Mike demo
-- Grant call center permissions to ALL appropriate roles

-- Step 1: Create the permissions in the permissions table (if they don't exist)
INSERT INTO permissions (name, description, module)
VALUES 
  ('calls.confirm_redemption', 'Access to call center redemption panel', 'calls'),
  ('calls.manage', 'Full call center management access', 'calls')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Grant permissions to all appropriate roles
-- Using a CTE to get permission IDs and insert into role_permissions

-- Grant calls.confirm_redemption to all roles
WITH perm AS (
  SELECT id FROM permissions WHERE name = 'calls.confirm_redemption'
)
INSERT INTO role_permissions (role, permission_id)
SELECT role::app_role, perm.id
FROM (VALUES 
  ('admin'),
  ('agency_owner'),
  ('agency_user'),
  ('client_user'),
  ('call_center_agent')
) AS roles(role)
CROSS JOIN perm
ON CONFLICT (role, permission_id) DO NOTHING;

-- Grant calls.manage to admin and call_center_agent
WITH perm AS (
  SELECT id FROM permissions WHERE name = 'calls.manage'
)
INSERT INTO role_permissions (role, permission_id)
SELECT role::app_role, perm.id
FROM (VALUES 
  ('admin'),
  ('call_center_agent')
) AS roles(role)
CROSS JOIN perm
ON CONFLICT (role, permission_id) DO NOTHING;

-- Add comment explaining the permissions
COMMENT ON TABLE role_permissions IS 'Defines which permissions are available to each role. calls.confirm_redemption allows access to call center redemption panel.';


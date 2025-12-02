-- Fix call center permissions for Mike demo
-- Grant call center permissions to ALL appropriate roles using CORRECT enum values

-- Step 1: Ensure the permissions exist in the permissions table
INSERT INTO permissions (name, description, module)
VALUES 
  ('calls.confirm_redemption', 'Access to call center redemption panel', 'calls'),
  ('calls.manage', 'Full call center management access', 'calls')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Grant calls.confirm_redemption to all roles that need call center access
-- Valid app_role enum values: admin, tech_support, agency_owner, company_owner, developer, call_center
WITH perm AS (
  SELECT id FROM permissions WHERE name = 'calls.confirm_redemption'
)
INSERT INTO role_permissions (role, permission_id)
SELECT role::app_role, perm.id
FROM (VALUES 
  ('admin'),
  ('agency_owner'),
  ('company_owner'),
  ('call_center'),
  ('tech_support')
) AS roles(role)
CROSS JOIN perm
ON CONFLICT (role, permission_id) DO NOTHING;

-- Step 3: Grant calls.manage to admin and call_center only (full management access)
WITH perm AS (
  SELECT id FROM permissions WHERE name = 'calls.manage'
)
INSERT INTO role_permissions (role, permission_id)
SELECT role::app_role, perm.id
FROM (VALUES 
  ('admin'),
  ('call_center')
) AS roles(role)
CROSS JOIN perm
ON CONFLICT (role, permission_id) DO NOTHING;

-- Step 4: Verify the permissions were granted
DO $$
DECLARE
  perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count
  FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  WHERE p.module = 'calls';
  
  RAISE NOTICE 'Total call-related permissions granted: %', perm_count;
END $$;

-- Add comment explaining the permissions
COMMENT ON TABLE role_permissions IS 'Defines which permissions are available to each role. calls.confirm_redemption allows access to call center redemption panel.';


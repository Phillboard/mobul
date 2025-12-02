-- IMMEDIATE FIX: Grant call center permissions to all roles
-- Run this SQL directly in Supabase SQL Editor for instant fix

-- Step 1: Ensure the permission exists
INSERT INTO permissions (name, description, module)
VALUES ('calls.confirm_redemption', 'Access to call center redemption panel', 'calls')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Grant to all appropriate roles (using CORRECT app_role enum values)
-- Valid roles: admin, tech_support, agency_owner, company_owner, developer, call_center
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

-- Step 3: Verify the permissions were granted
SELECT 
  r.role, 
  p.name as permission,
  p.module,
  p.description
FROM role_permissions r 
JOIN permissions p ON p.id = r.permission_id 
WHERE p.module = 'calls'
ORDER BY r.role, p.name;

-- Step 4: Check your current user's permissions
-- Replace 'your-email@example.com' with your actual email
SELECT 
  u.email,
  ur.role,
  p.name as permission
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN role_permissions rp ON rp.role = ur.role
JOIN permissions p ON p.id = rp.permission_id
WHERE u.email = 'your-email@example.com'  -- REPLACE THIS
  AND p.module = 'calls'
ORDER BY ur.role, p.name;


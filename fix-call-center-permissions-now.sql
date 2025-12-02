-- EMERGENCY FIX: Grant call center permissions to ALL roles
-- Run this immediately in Supabase SQL Editor

-- Check current role_permissions table
SELECT * FROM role_permissions WHERE permission LIKE '%call%';

-- Grant call center permissions to all user roles
INSERT INTO role_permissions (role, permission)
VALUES 
  ('admin', 'calls.confirm_redemption'),
  ('admin', 'calls.manage'),
  ('agency_owner', 'calls.confirm_redemption'),
  ('agency_user', 'calls.confirm_redemption'),
  ('client_user', 'calls.confirm_redemption'),
  ('client_admin', 'calls.confirm_redemption'),
  ('call_center_agent', 'calls.confirm_redemption'),
  ('call_center_agent', 'calls.manage'),
  ('company_owner', 'calls.confirm_redemption')
ON CONFLICT (role, permission) DO NOTHING;

-- Verify permissions were added
SELECT role, permission FROM role_permissions WHERE permission LIKE '%call%' ORDER BY role;

-- Check your current user's roles
SELECT 
  u.email,
  ur.role,
  rp.permission
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN role_permissions rp ON rp.role = ur.role
WHERE u.email = 'your-email@example.com'  -- Replace with your email
  AND rp.permission LIKE '%call%';


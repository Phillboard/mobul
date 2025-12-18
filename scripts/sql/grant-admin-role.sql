-- Grant Admin Role to User
-- This script helps you grant admin role to users who need to revoke gift cards
-- 
-- USAGE:
-- 1. Copy this script to Supabase SQL Editor
-- 2. Replace 'user-email@example.com' with the actual user's email
-- 3. Run the script

-- Option 1: Grant admin role by email
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'user-email@example.com'  -- REPLACE THIS EMAIL
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was granted
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  ur.role,
  ur.created_at as role_granted_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'user-email@example.com'  -- REPLACE THIS EMAIL
  AND ur.role = 'admin';

-- Option 2: Grant admin role by user ID (if you know it)
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('user-uuid-here', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option 3: View all current admins
-- SELECT 
--   u.id,
--   u.email,
--   ur.role,
--   ur.created_at as role_granted_at
-- FROM auth.users u
-- JOIN user_roles ur ON ur.user_id = u.id
-- WHERE ur.role = 'admin'
-- ORDER BY ur.created_at DESC;

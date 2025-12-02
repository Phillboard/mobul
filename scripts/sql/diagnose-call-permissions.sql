-- Permission System Diagnostic Script
-- Run this in Supabase SQL Editor to diagnose permission issues

-- ============================================
-- SECTION 1: Check if permissions exist
-- ============================================
SELECT 
  '1. Call Permissions in Database' as section,
  id, 
  name, 
  module, 
  description,
  created_at
FROM permissions 
WHERE module = 'calls' OR name LIKE 'calls.%'
ORDER BY name;

-- ============================================
-- SECTION 2: Check all role-permission mappings for calls
-- ============================================
SELECT 
  '2. Role Permission Mappings' as section,
  r.role::text, 
  p.name as permission,
  p.module,
  r.created_at
FROM role_permissions r 
JOIN permissions p ON p.id = r.permission_id 
WHERE p.module = 'calls' OR p.name LIKE 'calls.%'
ORDER BY r.role, p.name;

-- ============================================
-- SECTION 3: Check valid app_role enum values
-- ============================================
SELECT 
  '3. Valid App Roles (Enum Values)' as section,
  unnest(enum_range(NULL::app_role))::text as valid_role
ORDER BY valid_role;

-- ============================================
-- SECTION 4: Check all users and their roles
-- ============================================
SELECT 
  '4. Users and Their Roles' as section,
  u.email,
  ur.role::text,
  ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
ORDER BY u.email, ur.role;

-- ============================================
-- SECTION 5: Check current user's call permissions
-- ============================================
SELECT 
  '5. Current User Call Permissions' as section,
  u.email,
  ur.role::text,
  p.name as permission,
  p.description
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN role_permissions rp ON rp.role = ur.role
JOIN permissions p ON p.id = rp.permission_id
WHERE u.id = auth.uid()
  AND (p.module = 'calls' OR p.name LIKE 'calls.%')
ORDER BY ur.role, p.name;

-- ============================================
-- SECTION 6: Check for orphaned permissions
-- ============================================
SELECT 
  '6. Potential Issues - Invalid Role References' as section,
  COUNT(*) as count
FROM role_permissions rp
WHERE NOT EXISTS (
  SELECT 1 FROM unnest(enum_range(NULL::app_role)) e(role)
  WHERE e.role = rp.role
);

-- ============================================
-- SECTION 7: Summary Statistics
-- ============================================
SELECT 
  '7. Summary Statistics' as section,
  'Total Permissions' as metric,
  COUNT(*) as count
FROM permissions
WHERE module = 'calls'

UNION ALL

SELECT 
  '7. Summary Statistics' as section,
  'Total Role Grants' as metric,
  COUNT(*) as count
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'calls'

UNION ALL

SELECT 
  '7. Summary Statistics' as section,
  'Roles with Call Access' as metric,
  COUNT(DISTINCT rp.role) as count
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.name = 'calls.confirm_redemption';

-- ============================================
-- SECTION 8: Test get_user_permissions function
-- ============================================
SELECT 
  '8. Test Permission Function' as section,
  permission_name
FROM get_user_permissions(auth.uid())
WHERE permission_name LIKE 'calls.%'
ORDER BY permission_name;


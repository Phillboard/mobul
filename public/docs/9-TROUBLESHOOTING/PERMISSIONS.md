# Permissions & Access Troubleshooting

## Overview

Guide for resolving permission-related issues including missing menu items, access denied errors, and role assignment problems.

---

## Common Permission Issues

### Issue: "Redemption Center" menu item not showing

**Cause:** User lacks `calls.confirm_redemption` permission

**Solution:**

1. **Check User's Permissions:**
   ```sql
   SELECT 
     u.email,
     ur.role::text,
     p.name as permission
   FROM auth.users u
   JOIN user_roles ur ON ur.user_id = u.id
   JOIN role_permissions rp ON rp.role = ur.role
   JOIN permissions p ON p.id = rp.permission_id
   WHERE u.id = auth.uid()
     AND p.module = 'calls'
   ORDER BY ur.role, p.name;
   ```

2. **Verify Permission Exists:**
   ```sql
   SELECT * FROM permissions 
   WHERE name = 'calls.confirm_redemption';
   ```

3. **Grant Permission to Role:**
   ```sql
   WITH perm AS (SELECT id FROM permissions WHERE name = 'calls.confirm_redemption')
   INSERT INTO role_permissions (role, permission_id)
   SELECT 'call_center'::app_role, perm.id
   FROM perm
   ON CONFLICT (role, permission_id) DO NOTHING;
   ```

4. **Hard Refresh Browser:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Valid App Roles

The system recognizes these roles (and ONLY these):

```
✅ admin
✅ tech_support
✅ agency_owner
✅ company_owner
✅ developer
✅ call_center
```

**Invalid roles (do NOT use):**
- ❌ `agency_user`
- ❌ `client_user`
- ❌ `call_center_agent`
- ❌ `agency_admin`
- ❌ `client_admin`

---

## Permission Matrix

### Call Center Permissions

| Role | calls.confirm_redemption | calls.manage | Notes |
|------|-------------------------|--------------|-------|
| `admin` | ✅ Yes | ✅ Yes | Full access |
| `agency_owner` | ✅ Yes | ❌ No | Can confirm redemptions for clients |
| `company_owner` | ✅ Yes | ❌ No | Can confirm redemptions for own company |
| `call_center` | ✅ Yes | ✅ Yes | Full call center access |
| `tech_support` | ✅ Yes | ❌ No | Can assist with redemptions |
| `developer` | ❌ No | ❌ No | No call center access needed |

### Admin Permissions

| Role | admin.manage_users | admin.view_reports | admin.system_config |
|------|-------------------|-------------------|---------------------|
| `admin` | ✅ Yes | ✅ Yes | ✅ Yes |
| `tech_support` | ❌ No | ✅ Yes | ❌ No |
| `agency_owner` | ❌ No | ✅ Yes | ❌ No |

---

## Troubleshooting Steps

### Step 1: Identify User's Current Role

```sql
SELECT 
  u.email,
  ur.role
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.id = auth.uid();
```

### Step 2: Check Role's Permissions

```sql
SELECT 
  r.role,
  p.name as permission,
  p.module
FROM role_permissions r
JOIN permissions p ON p.id = r.permission_id
WHERE r.role = 'YOUR_ROLE'::app_role
ORDER BY p.module, p.name;
```

### Step 3: Verify RLS Policies

```sql
-- Check policies for specific table
SELECT 
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'TABLE_NAME'
ORDER BY policyname;
```

### Step 4: Test Permission Check

```typescript
// In browser console
const { data } = await supabase.rpc('get_user_permissions', {
  _user_id: 'user-uuid'
});
console.log(data); // Should show array of permission names
```

---

## Common Scenarios

### Scenario 1: New User Can't Access Anything

**Checklist:**
- [ ] User has accepted invitation
- [ ] User has at least one role assigned
- [ ] Role has necessary permissions
- [ ] User belongs to correct organization
- [ ] RLS policies allow access
- [ ] User has refreshed browser

**Quick Fix:**
```sql
-- Assign admin role temporarily for testing
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid', 'admin'::app_role)
ON CONFLICT DO NOTHING;
```

### Scenario 2: User Can See Menu But Gets "Permission Denied"

**Cause:** Role has permission for menu visibility but not for actual data access

**Solution:**
1. Check RLS policies on queried tables
2. Verify organization/client context
3. Check user_roles has correct organization_id

### Scenario 3: Admin Can't Access Admin Features

**Checklist:**
- [ ] User has `admin` role (not just `agency_owner`)
- [ ] `has_role()` function exists in database
- [ ] User is in correct organization context
- [ ] Protected routes check for correct permission

**Fix:**
```sql
-- Verify admin role
SELECT has_role(auth.uid(), 'admin'::app_role);

-- Grant admin role if needed
INSERT INTO user_roles (user_id, role, organization_id)
VALUES (
  'user-uuid',
  'admin'::app_role,
  (SELECT id FROM organizations WHERE is_platform_admin = true LIMIT 1)
);
```

---

## Permission System Architecture

### Permission Resolution Flow

```
1. User authenticates → JWT token with user_id
2. Frontend checks → hasAnyPermission(['permission.name'])
3. Query user_roles → Get user's role(s)
4. Query role_permissions → Get permissions for each role
5. Query user_permissions → Get individual permissions
6. Combine results → Return array of permission names
7. Check if required permission in array → Allow/Deny
```

### Database Functions

**get_user_permissions(user_id):**
```sql
-- Returns all permissions for a user
SELECT DISTINCT p.name
FROM user_roles ur
JOIN role_permissions rp ON rp.role = ur.role
JOIN permissions p ON p.id = rp.permission_id
WHERE ur.user_id = $1

UNION

SELECT DISTINCT p.name
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
WHERE up.user_id = $1 AND up.granted = true;
```

**has_role(user_id, role):**
```sql
-- Check if user has specific role
SELECT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = $1 AND role = $2
);
```

---

## Fixing Common Permission Errors

### Fix: Missing Permission

```sql
-- 1. Create permission if it doesn't exist
INSERT INTO permissions (name, description, module)
VALUES ('feature.action', 'Description', 'module_name')
ON CONFLICT (name) DO NOTHING;

-- 2. Grant to role
WITH perm AS (SELECT id FROM permissions WHERE name = 'feature.action')
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin'::app_role, perm.id
FROM perm
ON CONFLICT (role, permission_id) DO NOTHING;
```

### Fix: Invalid Role

```sql
-- Check valid roles
SELECT unnest(enum_range(NULL::app_role))::text as valid_roles;

-- Remove invalid role
DELETE FROM user_roles 
WHERE role NOT IN (
  SELECT unnest(enum_range(NULL::app_role))
);

-- Assign correct role
INSERT INTO user_roles (user_id, role, organization_id)
VALUES ('user-uuid', 'call_center'::app_role, 'org-uuid');
```

### Fix: RLS Policy Blocking Access

```sql
-- Disable RLS temporarily for testing (NOT for production!)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Test access
-- Then re-enable:
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Fix the policy instead
CREATE POLICY "proper_access_policy" ON table_name
FOR SELECT
TO authenticated
USING (
  -- Your proper access logic here
  user_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role)
);
```

---

## Verification Checklist

After fixing permission issues:

- [ ] User can see expected menu items
- [ ] User can navigate to pages without errors
- [ ] User can query data successfully
- [ ] User cannot see unauthorized data
- [ ] RLS policies prevent cross-tenant access
- [ ] Logs show no permission errors
- [ ] All role-specific features work

---

## Related Documentation

- [Security Architecture](../2-ARCHITECTURE/SECURITY.md)
- [User Management Guide](../6-USER-GUIDES/ADMIN_GUIDE.md)
- [Database Schema](../4-DEVELOPER-GUIDE/DATABASE.md)

---

**Last Updated:** December 4, 2024

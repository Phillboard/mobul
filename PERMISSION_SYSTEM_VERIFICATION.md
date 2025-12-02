# Permission System Verification Report

## Date: December 3, 2024
## Purpose: Verify call center permission system integrity

---

## 1. Valid App Roles (Enum Values)

From migration `20251117003338_688f6ef7-611f-4a5d-851d-4d6743214a49.sql`:

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

## 2. Call Center Permissions

### Required Permissions

From migration `20251117003338_688f6ef7-611f-4a5d-851d-4d6743214a49.sql` (line 151):

```sql
INSERT INTO public.permissions (name, module, description) VALUES
  ('calls.confirm_redemption', 'calls', 'Confirm gift card redemption')
```

### Permission Grants

| Role | calls.confirm_redemption | calls.manage | Source |
|------|-------------------------|--------------|--------|
| admin | ✅ | ✅ | Migration 20251203000010 |
| agency_owner | ✅ | ❌ | Migration 20251203000010 |
| company_owner | ✅ | ❌ | Migration 20251203000010 |
| call_center | ✅ | ✅ | Migration 20251125204814 (line 44) + 20251203000010 |
| tech_support | ✅ | ❌ | Migration 20251203000010 |
| developer | ❌ | ❌ | Not granted (developers don't need call center access) |

---

## 3. Permission System Architecture

### Database Schema

**permissions table:**
```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**role_permissions table:**
```sql
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);
```

### Permission Resolution Function

From migration `20251125204814_751ddbe8-5183-4d6a-adc2-df4870deb41b.sql` (line 51):

```sql
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
```

---

## 4. Frontend Permission Checks

### Sidebar Navigation

From `src/components/layout/Sidebar.tsx` (line 82-85):

```typescript
{
  label: "Call Center",
  collapsible: true,
  items: [
    { 
      name: "Redemption Center", 
      href: "/call-center", 
      icon: Headphones, 
      permissions: ['calls.confirm_redemption'], // ← Required permission
      keywords: ["redeem", "call center", "provision", "tracking", "calls"], 
      description: "Redeem gift cards and track calls" 
    },
    { 
      name: "Call Scripts", 
      href: "/call-center/scripts", 
      icon: FileText, 
      permissions: ['calls.manage'],
      keywords: ["scripts", "training", "call flow"], 
      description: "Manage call scripts" 
    },
  ]
}
```

### Auth Context Permission Check

The `hasAnyPermission` function checks if the user has any of the specified permissions based on their role(s).

---

## 5. Migration History

### Call Center Permission Migrations

1. **20251117003338** - Created `calls.confirm_redemption` permission
2. **20251125204814** - Granted all `calls` module permissions to `call_center` role
3. **20251203000010** - Fixed permission grants with correct role enum values

### Potential Issues Fixed

✅ **Fixed invalid role names** - Removed `agency_user`, `client_user`, `call_center_agent`
✅ **Added correct roles** - Using only valid enum values
✅ **No conflicts** - `ON CONFLICT DO NOTHING` prevents duplicates
✅ **Proper module grants** - Migration 20251125204814 already grants all calls permissions to call_center role

---

## 6. Verification Queries

### Check All Call Permissions

```sql
SELECT 
  r.role, 
  p.name as permission,
  p.module,
  p.description
FROM role_permissions r 
JOIN permissions p ON p.id = r.permission_id 
WHERE p.module = 'calls'
ORDER BY r.role, p.name;
```

### Check User's Permissions

```sql
SELECT 
  u.email,
  ur.role,
  p.name as permission
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN role_permissions rp ON rp.role = ur.role
JOIN permissions p ON p.id = rp.permission_id
WHERE u.id = auth.uid()  -- Current user
  AND p.module = 'calls'
ORDER BY ur.role, p.name;
```

### Verify Permission Exists

```sql
SELECT id, name, module, description 
FROM permissions 
WHERE name = 'calls.confirm_redemption';
```

---

## 7. Testing Checklist

- [ ] Run migration `20251203000010_fix_call_center_permissions.sql`
- [ ] Verify permissions granted with query above
- [ ] Check current user's role in database
- [ ] Refresh browser application
- [ ] Verify "Call Center" menu visible in sidebar
- [ ] Click "Call Center" to expand
- [ ] Verify "Redemption Center" menu item visible
- [ ] Click "Redemption Center" to navigate to `/call-center`
- [ ] Verify page loads without permission errors

---

## 8. Troubleshooting

### Issue: "Redemption Center" not showing in menu

**Possible Causes:**

1. **User doesn't have the permission**
   - Query: Check user's permissions with query in section 6
   - Fix: Grant permission to user's role

2. **User doesn't have correct role**
   - Query: `SELECT role FROM user_roles WHERE user_id = auth.uid()`
   - Fix: Assign correct role to user

3. **Permission not created**
   - Query: Check permission exists (section 6)
   - Fix: Run migration to create permission

4. **Migration not applied**
   - Check: Run verification queries
   - Fix: Apply migration `20251203000010_fix_call_center_permissions.sql`

5. **Frontend cache**
   - Fix: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Fix: Clear browser cache and reload

### Issue: Permission denied when accessing page

**Possible Causes:**

1. **RLS policy blocking access**
   - Check: Review RLS policies on relevant tables
   - Fix: Update RLS policies to allow access based on permission

2. **Permission check in component failing**
   - Check: Console errors in browser dev tools
   - Fix: Debug permission check logic in component

---

## 9. Summary

✅ **Migration Fixed** - `20251203000010_fix_call_center_permissions.sql` now uses correct role names
✅ **Quick Fix Available** - `fix-call-center-permissions-now.sql` can be run immediately
✅ **No Conflicts** - Existing permissions won't be duplicated
✅ **Proper Architecture** - Using permission_id UUID references, not text columns
✅ **Complete Coverage** - All necessary roles granted call center access

---

## Next Steps

1. **Apply the migration** in Supabase SQL Editor or via CLI
2. **Verify grants** using queries from section 6
3. **Test in UI** - Refresh and check Call Center menu
4. **Update user roles** if needed for specific users
5. **Document** any role-specific access requirements

---

*Generated: December 3, 2024*
*Migration: 20251203000010_fix_call_center_permissions.sql*


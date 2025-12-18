# Quick Admin Access Check

## You're Still Getting the Error?

The error "Edge Function returned a non-2xx status code" is still generic because **the browser hasn't reloaded the updated code yet**, OR **you don't have admin access**.

## STEP 1: Check Your Admin Access (DO THIS FIRST!)

Open Supabase SQL Editor and run this:

```sql
-- Check if YOU have admin role (replace with your email)
SELECT 
  u.email,
  u.id as user_id,
  COALESCE(
    (SELECT role FROM user_roles WHERE user_id = u.id AND role = 'admin'),
    'NO ADMIN ROLE'
  ) as admin_status
FROM auth.users u
WHERE u.email = 'your-email@example.com';  -- ⚠️ REPLACE THIS
```

### If Result Shows "NO ADMIN ROLE":

Run this to grant yourself admin:

```sql
-- Grant admin role to yourself
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your-email@example.com'  -- ⚠️ REPLACE THIS
ON CONFLICT (user_id, role) DO NOTHING;
```

Then verify it worked:

```sql
SELECT u.email, ur.role, ur.created_at
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'your-email@example.com';
```

## STEP 2: Hard Refresh Browser

Even after granting admin access, your browser has cached the old JavaScript code.

**Windows**: `Ctrl + Shift + R` or `Ctrl + F5`  
**Mac**: `Cmd + Shift + R`

## STEP 3: Open Browser Console to See Real Error

After refreshing, try revoking again and **immediately open browser DevTools (F12)**:

1. Go to **Console** tab
2. Look for error messages
3. You should now see the REAL error (not just "non-2xx status code")

Common errors you'll see:
- ✅ "Forbidden - Admin access required" → You need to run the SQL above
- ✅ "Gift card assignment not found" → Invalid assignment ID
- ✅ "This gift card has already been revoked" → Already revoked

## STEP 4: Test Your Access (Advanced)

If you want to test if you have access, open browser console and run:

```javascript
// Test if function is reachable
fetch('https://uibvxhwhkatjcwghnzpu.supabase.co/functions/v1/revoke-gift-card', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Get your token from: Application → Local Storage → sb-...-auth-token → access_token
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: JSON.stringify({
    assignmentId: 'test-123',
    reason: 'Testing from console'
  })
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

Expected responses:
- If **no admin**: `{"success": false, "error": "Forbidden - Admin access required..."}`
- If **have admin**: `{"success": false, "error": "Gift card assignment not found"}` (because test-123 doesn't exist)

## Quick Checklist

- [ ] Ran SQL to check admin role
- [ ] Granted myself admin role (if needed)
- [ ] Hard refreshed browser (`Ctrl + Shift + R`)
- [ ] Opened browser DevTools Console (F12)
- [ ] Tried revoking again and checked console for real error message

## Still Not Working?

The updated frontend code includes better error logging. After hard refresh, when you try to revoke, check the Console tab for logs that start with:
- `Revoke error:` - Shows the actual error from the function
- `Revoke failed:` - Shows business logic errors

Share the console output and I can help further!

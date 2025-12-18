# Revoke Gift Card - Troubleshooting Guide

## Issue Fixed ✅

The `revoke-gift-card` edge function has been redeployed with:
1. **Better error handling** - Uses `.maybeSingle()` instead of `.single()` 
2. **Detailed error messages** - All errors return both `error` and `message` fields
3. **Improved validation** - Clearer messages for each error case

## Current Status

**Function deployed**: ✅ Version 4  
**Endpoint**: `https://uibvxhwhkatjcwghnzpu.supabase.co/functions/v1/revoke-gift-card`

## Steps to Fix Your Error

### Step 1: Clear Browser Cache (IMPORTANT!)

The 404 error you're seeing is likely because your browser cached the old endpoint. **Do this first**:

1. **Hard Refresh** the page:
   - Windows: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. Or **Clear Site Data**:
   - Open DevTools (F12)
   - Go to Application tab → Storage → Clear site data
   - Or right-click the refresh button → "Empty Cache and Hard Reload"

### Step 2: Verify You Have Admin Access

Run this SQL in Supabase SQL Editor to check your role:

```sql
-- Check if you have admin role
SELECT 
  u.email,
  u.id as user_id,
  ur.role,
  ur.created_at as role_granted_at
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'your-email@example.com';  -- Replace with your email
```

**If no row is returned** or `role` is NULL, grant yourself admin:

```sql
-- Grant admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your-email@example.com'  -- Replace with your email
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 3: Try Revoking Again

After clearing cache and verifying admin access:

1. Refresh the page with `Ctrl + Shift + R`
2. Try revoking the gift card again
3. You should now see specific error messages if something is wrong

## Expected Behavior

### Success ✅
- Toast message: "Gift Card Revoked"
- Card status changes to "revoked" in the list
- Card is returned to inventory (if applicable)

### Common Errors (with clear messages)

| Error | Meaning | Fix |
|-------|---------|-----|
| **403: Forbidden - Admin access required** | You don't have admin role | Run the SQL above to grant yourself admin |
| **404: Gift card assignment not found** | Invalid assignment ID | Check that you're revoking the correct card |
| **400: Already revoked** | Card was already revoked | Nothing to do - card is already revoked |
| **400: Reason too short** | Reason < 10 characters | Enter a longer reason (should be prevented by UI) |

## Verification

### Check if Function is Working

Test the endpoint directly (requires auth token):

```bash
# Get your auth token from browser DevTools:
# Application → Local Storage → sb-{project}-auth-token → access_token

curl -X POST \
  https://uibvxhwhkatjcwghnzpu.supabase.co/functions/v1/revoke-gift-card \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignmentId": "test-id", "reason": "Testing the endpoint works"}'
```

Expected response (if you have admin):
- If assignment doesn't exist: `{"success": false, "error": "Gift card assignment not found", ...}`
- If no admin: `{"success": false, "error": "Forbidden - Admin access required...", ...}`

### Check Revoke Log

View all revocations:

```sql
SELECT 
  revoked_at,
  recipient_name,
  card_value,
  brand_name,
  reason,
  original_delivery_status
FROM gift_card_revoke_log
ORDER BY revoked_at DESC
LIMIT 10;
```

## Still Having Issues?

1. **Check Function Logs**:
   - Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/functions
   - Click on `revoke-gift-card`
   - Check "Logs" tab for detailed error messages

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for the actual error response (not just "404")
   - The error should now show the detailed message from the edge function

3. **Verify Migration**:
   ```sql
   -- Check if revoke columns exist
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'recipient_gift_cards' 
   AND column_name IN ('revoked_at', 'revoked_by', 'revoke_reason');
   
   -- Should return 3 rows
   ```

## Files Changed

- ✅ `supabase/functions/revoke-gift-card/index.ts` - Improved error handling
- ✅ `src/features/gift-cards/hooks/useRevokeGiftCard.ts` - Already had good error handling
- ✅ `src/features/gift-cards/components/RevokeGiftCardButton.tsx` - UI component (no changes needed)
- ✅ `docs/REVOKE_GIFT_CARD_FIX.md` - Comprehensive documentation

## Summary

The main issue was:
1. ❌ Edge function used `.single()` which threw errors instead of returning proper responses
2. ❌ Browser had cached the old version (causing 404)
3. ⚠️ User might not have admin role

All fixed! Just clear your cache and try again.

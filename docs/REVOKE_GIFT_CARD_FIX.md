# Gift Card Revoke Feature - Error Fix

## Problem
The revoke gift card functionality was returning a generic error: "Edge Function returned a non-2xx status code" without showing the actual error details.

## Root Cause
Two main issues were identified:

1. **Incorrect Error Handling**: The edge function was using `.single()` instead of `.maybeSingle()` when checking for admin role. This caused an error to be thrown when the user didn't have an admin role, rather than properly returning `null`.

2. **Insufficient Error Messages**: Error responses didn't include enough detail for the frontend to display meaningful error messages to users.

## Changes Made

### Edge Function Updates (`supabase/functions/revoke-gift-card/index.ts`)

1. **Fixed Admin Role Check**:
   - Changed from `.single()` to `.maybeSingle()`
   - Added separate error handling for database errors vs missing role
   - Now properly differentiates between a database error and user not having admin access

2. **Enhanced Error Responses**:
   - All error responses now include both `error` and `message` fields for frontend compatibility
   - Added more descriptive error messages
   - Included additional details in error responses (e.g., `details` field with stack traces)
   - All errors now return proper HTTP status codes (401, 403, 404, 400, 500)

## How to Use the Revoke Feature

### Prerequisites
The user attempting to revoke a gift card **must** have the `admin` role in the `user_roles` table.

### Grant Admin Role to a User

Run this SQL in the Supabase SQL Editor:

```sql
-- Replace 'user-email@example.com' with the actual user's email
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'user-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

Or if you know the user_id:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Testing the Fix

1. **Ensure Admin Role**: Verify the user has admin role:
   ```sql
   SELECT u.email, ur.role
   FROM auth.users u
   JOIN user_roles ur ON ur.user_id = u.id
   WHERE u.email = 'your-email@example.com';
   ```

2. **Test Revoke**: Try revoking a gift card through the UI
   - The error messages should now be clear and specific
   - If you don't have admin role, you'll see: "Forbidden - Admin access required. Only administrators can revoke gift cards."
   - If the assignment is not found, you'll see: "Gift card assignment not found"
   - If already revoked: "This gift card has already been revoked"

3. **Check Revoke Log**: Verify the audit trail:
   ```sql
   SELECT * FROM gift_card_revoke_log 
   ORDER BY revoked_at DESC 
   LIMIT 10;
   ```

## Expected Error Messages

The following specific error messages are now returned:

| Status Code | Condition | Error Message |
|------------|-----------|---------------|
| 401 | No auth header | "Unauthorized - No authorization header" |
| 401 | Invalid token | "Unauthorized - Invalid token" |
| 403 | Not admin | "Forbidden - Admin access required. Only administrators can revoke gift cards." |
| 400 | Missing assignmentId | "Missing required field: assignmentId" |
| 400 | Reason too short | "Reason is required and must be at least 10 characters" |
| 404 | Assignment not found | "Gift card assignment not found" |
| 400 | Already revoked | "This gift card has already been revoked" |
| 500 | Database error | "Failed to revoke gift card. Please try again or contact support." |

## Deployment
The updated edge function has been deployed to Supabase:
```
Deployed Functions on project uibvxhwhkatjcwghnzpu: revoke-gift-card
```

## Next Steps

If you're still experiencing issues:

1. Check the browser console for the actual error response
2. Verify the user has the admin role in the database
3. Check the Supabase Functions logs in the dashboard: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/functions
4. Ensure the database migration `20251218090631_add_gift_card_revoke.sql` has been applied

## Related Files
- Edge Function: `supabase/functions/revoke-gift-card/index.ts`
- Migration: `supabase/migrations/20251218090631_add_gift_card_revoke.sql`
- Audit Log Table: `gift_card_revoke_log`

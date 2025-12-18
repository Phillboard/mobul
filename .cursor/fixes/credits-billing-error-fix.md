# Credits Billing Page Error - Fix Summary

## Issues Fixed

### 1. RLS Error (Initial Issue - RESOLVED)
The `/credits-billing` page was showing "Something went wrong" error for users.

### 2. "No credit account found" Error (NEW - RESOLVED)
When users tried to add credits but had no existing credit account, they received "No credit account found" error.

## Root Cause
The error was caused by a database query attempting to join the `clients` table with the `agencies` table using PostgREST syntax:

```typescript
.select("id, name, agency_id, agencies(name)")
```

### Why It Failed
1. **RLS Policy Restriction**: The `agencies` table has Row Level Security (RLS) policies that only allow:
   - Platform admins (full access)
   - Agency users who are members of that agency (via `user_agencies` table)

2. **Access Denied**: When a `company_owner` (client owner) tried to view their credit account, they attempted to join their client record with the agency, but they weren't a member of the agency in the `user_agencies` table, causing the RLS policy to block the query.

## Solution Applied

### 1. Split the Query
Changed from a single query with a join to separate queries:

```typescript
// Before (causing RLS error):
const { data, error } = await supabase
  .from("clients")
  .select("id, name, agency_id, agencies(name)")
  .eq("id", targetClientId)
  .single();

// After (resilient):
// Step 1: Get client data (always succeeds)
const { data: clientData, error: clientError } = await supabase
  .from("clients")
  .select("id, name, agency_id")
  .eq("id", targetClientId)
  .single();

// Step 2: Optionally get agency name (fails gracefully if no permission)
if (clientData?.agency_id) {
  const { data: agencyData } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", clientData.agency_id)
    .single();
  
  agencyName = agencyData?.name || null;
}
```

### 2. Added Defensive Programming
- Added optional chaining for `hasRole` function calls
- Added error state handling with user-friendly error display
- Added `retry: false` to prevent infinite retry loops
- Added error logging for debugging

### 3. Better Error UI
Added a proper error display component that shows:
- Clear error message
- Retry button
- User-friendly explanation

## Solution for "No credit account found" Error

### Root Cause
The `addCreditsMutation` in `CreditsBilling.tsx` had a premature check that threw an error if `creditAccount?.id` didn't exist:

```typescript
if (!creditAccount?.id) {
  throw new Error("No credit account found");
}
```

This prevented the RPC function from being called. However, the `allocate_credits_atomic` RPC function automatically creates credit accounts via `get_credit_account()` which has built-in account creation logic:

```sql
-- From get_credit_account function (line 116-121)
IF NOT FOUND THEN
  INSERT INTO credit_accounts (entity_type, entity_id, balance)
  VALUES (p_entity_type, p_entity_id, 0)
  RETURNING * INTO v_account;
END IF;
```

### Changes Made

1. **Removed premature account check** - Changed from checking `creditAccount?.id` to checking `targetClientId`
2. **Added comment** - Documented that RPC automatically creates accounts
3. **Fixed auto-reload mutation** - Added logic to create account with 0 credits if needed before updating settings
4. **Improved UI text** - Changed "Create Account & Add Credits" to "Add Credits to Get Started" (more accurate)

### Code Changes

**addCreditsMutation (lines 171-206):**
- Before: `if (!creditAccount?.id) throw new Error("No credit account found")`
- After: `if (!targetClientId) throw new Error("No client selected")`
- Added comment explaining automatic account creation

**saveAutoReloadMutation (lines 220-260):**
- Added automatic account creation by calling `allocate_credits_atomic` with 0 amount
- This ensures an account exists before updating auto-reload settings

## Files Modified
- `src/pages/CreditsBilling.tsx` (lines 171-260, 456-460)

## Testing Recommendations
1. Test with `company_owner` role (most likely to encounter the issue)
2. Test with `agency_owner` role (should see agency name)
3. Test with `admin` role (should see everything)
4. Test with clients that have no agency assigned (null agency_id)

## Future Improvements
Consider one of these options:
1. **Update RLS Policy**: Allow clients to view their own agency's basic info (name only)
2. **Denormalize Data**: Store agency_name directly in the clients table
3. **Edge Function**: Create an edge function that bypasses RLS for this specific read-only query

## Related Database Objects
- Table: `clients` (has `agency_id` foreign key)
- Table: `agencies` (has RLS policies)
- RLS Policy: "Agency users can view their agency" (line 9574-9576 in baseline.sql)
- RLS Policy: "Platform admins can manage agencies" (line 9709 in baseline.sql)

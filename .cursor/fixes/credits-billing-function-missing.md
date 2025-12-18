# Credit Management Functions Missing - Fix Instructions

## Issue
The `allocate_credits_atomic` function (and related credit management functions) don't exist in the production database, causing this error:

```
Could not find the function public.allocate_credits_atomic(p_amount, p_description, p_entity_id, p_entity_type, p_user_id) in the schema cache
```

## Root Cause
The credit management RPC functions were only created in archived migrations (`supabase/migrations_archive/`) and were never applied to the production database.

## Solution

### Option 1: Apply via Supabase Dashboard (RECOMMENDED)

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project (`uibvxhwhkatjcwghnzpu`)
3. Go to **SQL Editor**
4. Copy the entire contents of `scripts/sql/apply-credit-functions.sql`
5. Paste into the SQL Editor
6. Click **RUN**
7. Verify success - all 6 functions should be created

### Option 2: Use psql Directly

If you have direct database access:

```bash
psql "your-connection-string-here" -f scripts/sql/apply-credit-functions.sql
```

### Option 3: Split Migration Files

If you need to use `supabase db push`, split the migration into 6 separate files:
- `20251218130001_credit_function_get_account.sql`
- `20251218130002_credit_function_get_balance.sql`
- `20251218130003_credit_function_allocate.sql`
- `20251218130004_credit_function_deduct.sql`
- `20251218130005_credit_function_transfer.sql`
- `20251218130006_credit_function_history.sql`

## Functions Created

1. **get_credit_account** - Get or create a credit account (auto-creates if missing)
2. **get_credit_balance** - Get current balance for an entity
3. **allocate_credits_atomic** - Add credits to an account (with auto-create)
4. **deduct_credits_atomic** - Deduct credits with validation
5. **transfer_credits_atomic** - Transfer credits between accounts
6. **get_credit_transaction_history** - Get transaction history

## Testing After Application

After applying the SQL:

1. Refresh the Credits & Billing page
2. Try to add credits (e.g., $2357)
3. The error should be gone
4. Credits should be added successfully
5. A credit account should be auto-created if it didn't exist

## Files Modified

- ✅ `src/pages/CreditsBilling.tsx` - Fixed premature account check
- ✅ `scripts/sql/apply-credit-functions.sql` - SQL to apply functions
- ⏳ `supabase/migrations/20251218130000_add_credit_management_functions.sql` - Migration file (blocked by CLI limitation)

## Why Supabase CLI Fails

The `supabase db push` command uses prepared statements which don't support multiple `CREATE FUNCTION` statements in a single file. This is a known limitation. The workaround is to either:
1. Use the SQL Editor (recommended)
2. Split into multiple migration files
3. Use psql directly

## Next Steps

After applying the functions:
1. Test the Credits & Billing page
2. Verify account auto-creation works
3. If successful, mark the migration file as applied in `supabase/migrations` (or delete it since it was applied manually)

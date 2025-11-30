# Testing & Fixes for Credit System Implementation

## Issues Found & Fixed

### Issue 1: Supabase Type Generation Needed
The new tables won't be in the generated types yet.

**Fix**: Run Supabase type generation:
```bash
npx supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
```

### Issue 2: Missing Switch Component Import
The ClientCreditDashboard uses `<Switch>` but may not have it imported.

**Status**: Already imported correctly ✅

### Issue 3: Potential RLS Policy Conflicts  
The credit system creates new RLS policies that might conflict with existing ones.

**Fix Applied**: The migration properly handles policy drops and recreation

### Issue 4: User-Agency Relationship  
The AgencyDashboard queries `user_agencies` table which needs to exist.

**Fix**: Added in migration 20251201000000_create_credit_system.sql ✅

### Issue 5: Missing Helper Functions
Need to verify `has_role()` and `user_can_access_client()` functions exist.

**Action Required**: Check if these exist in earlier migrations

---

## Testing Checklist

### Database Setup
- [ ] Run migration: `20251201000000_create_credit_system.sql`
- [ ] Run migration: `20251201000001_archive_legacy_system.sql`  
- [ ] Run migration: `20251201000002_initialize_credit_accounts.sql`
- [ ] Verify all tables created successfully
- [ ] Check RLS policies are active

### Edge Functions
- [ ] Deploy `provision-gift-card` function
- [ ] Deploy `allocate-credit` function
- [ ] Deploy `monitor-gift-card-system` function
- [ ] Test each function individually

### UI Testing - Admin Dashboard
- [ ] Login as admin (admin@mopads.com)
- [ ] Navigate to admin inventory page
- [ ] Verify pool health displays
- [ ] Check agency accounts table
- [ ] View system alerts tab

### UI Testing - Agency Dashboard  
- [ ] Create/assign user to agency
- [ ] View credit balance
- [ ] List clients
- [ ] Test credit allocation dialog
- [ ] Verify stats display

### UI Testing - Client Dashboard
- [ ] Login as client user
- [ ] View credit balance
- [ ] List campaigns
- [ ] Test budget allocation
- [ ] Toggle shared/isolated credit

### UI Testing - Redemption Flow
- [ ] Create test campaign
- [ ] Generate redemption code
- [ ] Visit redemption page
- [ ] Verify gift card displays
- [ ] Check credit deduction

---

## Quick Fixes to Apply Now

### Fix 1: Add Missing Navigation Routes
Need to add the new dashboards to your router.

### Fix 2: Create Test Data
Need sample agencies, clients, campaigns with credit accounts.

### Fix 3: Verify Function Availability
Check that helper functions exist.

---

## SQL Quick Test Queries

```sql
-- Test 1: Check if credit_accounts table exists
SELECT * FROM credit_accounts LIMIT 1;

-- Test 2: Check if helper functions exist
SELECT has_role(auth.uid(), 'admin');
SELECT user_can_access_client(auth.uid(), 'some-uuid');

-- Test 3: Verify RLS is working
SELECT * FROM gift_card_redemptions WHERE status = 'pending';

-- Test 4: Check agencies table
SELECT * FROM agencies LIMIT 5;

-- Test 5: Test provisioning would work
SELECT * FROM gift_card_pools WHERE pool_type = 'csv' AND is_active = true;
```

---

## Common Error Messages & Solutions

### "relation credit_accounts does not exist"
**Solution**: Run the migrations in order

### "function has_role does not exist"
**Solution**: Check earlier migrations for this function or create it

### "permission denied for table"
**Solution**: Check RLS policies and user roles

### "insufficient credit"
**Solution**: Allocate credit to the account first

### "No available gift cards in pool"
**Solution**: Upload CSV cards or configure API provider

---

## Next Steps

1. Run the three migrations
2. Deploy the three edge functions
3. Add navigation routes for the new dashboards
4. Create test agency with credit
5. Test full redemption flow
6. Monitor system alerts

Let me know which specific error you're encountering and I'll provide the exact fix!


# 🚀 Credit System Deployment & Testing Guide

## Quick Start

Use these credentials to test:
- **Email**: admin@mopads.com
- **Password**: Killer123!

---

## Step-by-Step Deployment

### Step 1: Database Migrations

Run these SQL files in your Supabase SQL Editor in this exact order:

```sql
-- 1. Core credit system
\i supabase/migrations/20251201000000_create_credit_system.sql

-- 2. Archive legacy system
\i supabase/migrations/20251201000001_archive_legacy_system.sql

-- 3. Initialize accounts
\i supabase/migrations/20251201000002_initialize_credit_accounts.sql

-- 4. Run testing script
\i supabase/migrations/20251201000003_testing_script.sql
```

Or via Supabase CLI:
```bash
supabase db push
```

### Step 2: Deploy Edge Functions

```bash
cd supabase/functions

# Deploy provision function
supabase functions deploy provision-gift-card

# Deploy allocate function  
supabase functions deploy allocate-credit

# Deploy monitoring function
supabase functions deploy monitor-gift-card-system
```

### Step 3: Set Up Monitoring Cron

In Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'monitor-gift-card-system',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/monitor-gift-card-system',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

Replace `YOUR_PROJECT` and `YOUR_SERVICE_ROLE_KEY` with actual values.

---

## Testing Checklist

### ✅ Test 1: Database Schema

```sql
-- Run this to verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'credit_accounts',
    'credit_transactions',
    'gift_card_redemptions',
    'agencies',
    'system_alerts'
  )
ORDER BY table_name;
```

**Expected**: 5 rows returned

### ✅ Test 2: Credit Account Creation

```sql
-- Create a test agency with credit
INSERT INTO agencies (name, slug, status)
VALUES ('Test Agency', 'test-agency', 'active')
ON CONFLICT (slug) DO UPDATE SET name = 'Test Agency'
RETURNING id;

-- Create credit account (replace UUID with agency ID from above)
SELECT get_or_create_credit_account('agency', 'YOUR_AGENCY_ID'::uuid, NULL);

-- Give it $10,000 credit
UPDATE credit_accounts 
SET total_purchased = 10000, total_remaining = 10000
WHERE account_type = 'agency' AND owner_id = 'YOUR_AGENCY_ID'::uuid;

-- Verify
SELECT * FROM credit_accounts WHERE account_type = 'agency';
```

**Expected**: Agency with $10,000 credit

### ✅ Test 3: Edge Function - Provision Gift Card

Test via Supabase Functions UI or curl:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/provision-gift-card' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "campaignId": "YOUR_CAMPAIGN_ID",
    "brandId": "YOUR_BRAND_ID",
    "denomination": 25,
    "redemptionCode": "TEST-123-XYZ"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "card": { "cardCode": "...", "cardValue": 25 },
  "source": "csv" or "api",
  "creditRemaining": 9975
}
```

### ✅ Test 4: Edge Function - Allocate Credit

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/allocate-credit' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "fromAccountId": "AGENCY_ACCOUNT_ID",
    "toAccountId": "CLIENT_ACCOUNT_ID",
    "amount": 5000,
    "notes": "Test allocation"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "fromAccountBalance": 5000,
  "toAccountBalance": 5000
}
```

### ✅ Test 5: Edge Function - Monitor System

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/monitor-gift-card-system' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

**Expected Response**:
```json
{
  "success": true,
  "alerts_generated": 0,
  "breakdown": {
    "csv_pools": 0,
    "campaigns": 0,
    "agencies": 0,
    "clients": 0
  }
}
```

### ✅ Test 6: Admin Dashboard UI

1. Login as admin@mopads.com
2. Navigate to `/admin/inventory` (you may need to add this route)
3. Should see:
   - Inventory status table
   - Agency accounts
   - System alerts (if any)
   - Stats cards showing healthy/low/empty pools

### ✅ Test 7: Credit Allocation Flow

1. As admin, go to agency dashboard
2. Click "Allocate Credit to Client"
3. Select a client
4. Enter amount (less than available credit)
5. Submit
6. Verify:
   - Agency credit decreased
   - Client credit increased
   - Two transactions created (out + in)

---

## Common Issues & Fixes

### Issue: "relation credit_accounts does not exist"

**Cause**: Migrations not run

**Fix**:
```bash
supabase db push
```

### Issue: "function has_role does not exist"

**Cause**: Old migrations not applied

**Fix**: Run all migrations from beginning or check migration order

### Issue: "permission denied for table credit_accounts"

**Cause**: RLS policies not set correctly

**Fix**:
```sql
-- Verify admin role
SELECT has_role(auth.uid(), 'admin'::app_role);

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'credit_accounts';
```

### Issue: "No available gift cards in pool"

**Cause**: No CSV cards uploaded and no API configured

**Fix**:
1. Upload CSV cards via admin UI, OR
2. Configure API provider in pool settings

### Issue: "Insufficient credit - campaign depleted"

**Cause**: Campaign or client has $0 credit

**Fix**:
```sql
-- Check credit
SELECT * FROM credit_accounts WHERE owner_id = 'YOUR_CAMPAIGN_OR_CLIENT_ID';

-- Allocate credit from parent
-- Use allocate-credit edge function
```

### Issue: UI components not showing data

**Cause**: Missing routes or authentication

**Fix**:
1. Add routes to your router
2. Verify user has correct role
3. Check browser console for errors

---

## Verification Queries

### Check System Health

```sql
-- Overall credit system status
SELECT 
  account_type,
  COUNT(*) as accounts,
  SUM(total_purchased) as total_purchased,
  SUM(total_allocated) as total_allocated,
  SUM(total_used) as total_used,
  SUM(total_remaining) as total_remaining
FROM credit_accounts
GROUP BY account_type
ORDER BY account_type;
```

### Check Pools by Type

```sql
SELECT 
  pool_type,
  is_active,
  COUNT(*) as pool_count,
  SUM(total_cards) as total_cards,
  SUM(available_cards) as available_cards
FROM gift_card_pools
GROUP BY pool_type, is_active
ORDER BY pool_type, is_active;
```

### Check Recent Redemptions

```sql
SELECT 
  r.id,
  r.denomination,
  r.provisioning_source,
  r.status,
  r.amount_charged,
  r.cost_basis,
  r.profit,
  c.name as campaign_name,
  r.created_at
FROM gift_card_redemptions r
LEFT JOIN campaigns c ON c.id = r.campaign_id
ORDER BY r.created_at DESC
LIMIT 20;
```

### Check Recent Transactions

```sql
SELECT 
  t.id,
  t.transaction_type,
  t.amount,
  t.balance_before,
  t.balance_after,
  ca.account_type,
  t.created_at
FROM credit_transactions t
LEFT JOIN credit_accounts ca ON ca.id = t.account_id
ORDER BY t.created_at DESC
LIMIT 20;
```

### Check System Alerts

```sql
SELECT 
  severity,
  alert_type,
  message,
  created_at
FROM system_alerts
WHERE resolved_at IS NULL
ORDER BY created_at DESC;
```

---

## Performance Checks

```sql
-- Check if indexes exist
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('credit_accounts', 'credit_transactions', 'gift_card_redemptions')
ORDER BY tablename, indexname;
```

Expected indexes:
- `idx_credit_accounts_owner`
- `idx_credit_accounts_parent`
- `idx_credit_accounts_status`
- `idx_credit_transactions_account`
- `idx_credit_transactions_type`
- `idx_redemptions_campaign`
- `idx_redemptions_code`
- `idx_redemptions_status`

---

## Next Steps After Successful Deployment

1. ✅ **Upload CSV Inventory**
   - Go to Admin Dashboard
   - Click "Upload CSV"
   - Import your gift card inventory

2. ✅ **Configure API Providers**
   - Set up Tango Card credentials
   - Create API config pools
   - Test API provisioning

3. ✅ **Create Agencies**
   - Create your first agency
   - Allocate initial credit
   - Configure brand access

4. ✅ **Set Up Clients**
   - Add clients to agencies
   - Allocate credit from agency
   - Configure campaigns

5. ✅ **Test Full Flow**
   - Create campaign
   - Generate redemption code
   - Redeem gift card
   - Verify credit deduction
   - Check profit tracking

6. ✅ **Monitor System**
   - Watch system alerts
   - Monitor pool health
   - Track credit usage
   - Review redemption analytics

---

## Support & Debugging

If you encounter issues:

1. **Check Browser Console** - Look for JavaScript errors
2. **Check Supabase Logs** - View edge function logs
3. **Check Database Logs** - Review SQL errors
4. **Run Testing Script** - Use the testing migration
5. **Check This Guide** - Review common issues section

---

## Success Indicators

You'll know the system is working when:

✅ All 5 new tables exist in database
✅ Credit accounts have positive balances
✅ Provision function returns gift cards
✅ Allocate function moves credit between accounts
✅ Monitor function reports system health
✅ UI dashboards display data correctly
✅ Redemption flow completes successfully
✅ Credit deducts atomically
✅ Transactions appear in ledger
✅ Profit calculates correctly

---

**Ready to launch! 🚀**

Need help? Check TESTING_GUIDE.md or IMPLEMENTATION_COMPLETE.md for more details.


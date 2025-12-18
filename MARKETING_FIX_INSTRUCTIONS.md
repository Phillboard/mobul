# 🎯 Marketing Hub Fix - Quick Instructions

## Problem Fixed
✅ Marketing Hub now shows accurate recipient counts instead of 0

## What Was Changed

### 1. **New Edge Function Deployed**
- `preview-campaign-audience` - Calculates recipient counts
- Already deployed to production ✅

### 2. **Code Updates**
- ✅ Campaigns now calculate recipients when created
- ✅ Marketing Hub auto-refreshes counts for draft campaigns
- ✅ Better UI messaging for 0 counts

### 3. **Database Backfill (Run This Now)**

To fix **existing campaigns** that currently show 0 recipients:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `scripts/sql/backfill-campaign-recipients.sql`
6. Click **Run**

This will:
- ✅ Calculate recipients for all draft campaigns with 0 count
- ✅ Display a summary of updated campaigns
- ✅ Take about 1-5 seconds per campaign

#### Option B: Using psql (Advanced)

```bash
# If you have direct database access
psql YOUR_DATABASE_URL -f scripts/sql/backfill-campaign-recipients.sql
```

## Expected Results

### Before Fix
```
Active Broadcasts: 1
Messages Sent: 0          ❌ Shows 0 even with contacts in lists
```

### After Fix
```
Active Broadcasts: 1
Messages Sent: 0          ✅ Shows "250 recipients targeted"
```

### For Automations
```
Automation Enrollments: 0  ✅ Shows "2 automations waiting for triggers"
```

## Testing

1. **Test with new campaign:**
   ```
   - Go to Marketing Hub
   - Create New Broadcast
   - Select a contact list with contacts
   - Save as draft
   - Go back to Marketing Hub
   → Should show "X recipients targeted" immediately
   ```

2. **Test with existing campaigns:**
   ```
   - Run the SQL backfill script (see above)
   - Refresh Marketing Hub
   → Draft campaigns should now show recipient counts
   ```

3. **Test with sent campaigns:**
   ```
   - Send a campaign (or start sending)
   → Progress updates as messages are sent
   → Shows "X / Y recipients" or "X total recipients"
   ```

## If Counts Still Show 0

This is normal if:
- ✅ **New automation** - Hasn't been triggered yet (enrollments are event-driven)
- ✅ **Empty lists** - No contacts in the selected lists
- ✅ **All opted out** - All contacts have opted out of email/SMS

Check:
1. Verify contacts exist in the list
2. Check if contacts are opted out (`email_opt_out` or `sms_opt_out`)
3. Verify contacts don't have `do_not_contact = true`

## Manual Refresh (If Needed)

The Marketing Hub auto-refreshes on load, but you can also:
1. Navigate away and back to Marketing Hub
2. Refresh the page
3. Or the system will auto-update when you view the campaign details

## Files Changed

- ✅ `supabase/functions/preview-campaign-audience/index.ts` (NEW)
- ✅ `src/features/marketing/hooks/useMarketingCampaigns.ts`
- ✅ `src/pages/marketing/MarketingHub.tsx`
- ✅ `scripts/sql/backfill-campaign-recipients.sql` (NEW)
- ✅ `docs/marketing-recipient-count-fix.md` (Documentation)

## Support

If you still see issues:
1. Check browser console for errors
2. Verify edge function is deployed: Check Supabase Dashboard → Functions
3. Check database for recipient counts: `SELECT id, name, total_recipients FROM marketing_campaigns;`

---

**Status**: ✅ Code deployed, ⏳ Run SQL backfill script to fix existing data

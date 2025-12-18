# Marketing Hub Recipient Count Fix

## Problem
The Marketing Hub was showing 0 for "Messages Sent" and "Automation Enrollments" even though there were contacts in lists. This was because:

1. **Campaigns**: The `total_recipients` field was only calculated when a campaign started sending, not when it was created
2. **Automations**: The `total_enrolled` field is only updated when contacts are actually enrolled via triggers

## Solution

### 1. Created Preview Campaign Audience Edge Function
**File**: `supabase/functions/preview-campaign-audience/index.ts`

This function calculates the recipient count for a campaign based on its audience configuration WITHOUT actually sending messages. It supports:
- All contacts
- Contact lists
- Manual contact selection
- Respects opt-out preferences (email_opt_out, sms_opt_out)
- Filters out do_not_contact contacts

### 2. Updated Campaign Creation Hook
**File**: `src/features/marketing/hooks/useMarketingCampaigns.ts`

- Modified `useCreateMarketingCampaign()` to calculate recipient count BEFORE creating the campaign
- New campaigns now have accurate `total_recipients` from the start
- Added `useRefreshCampaignRecipients()` hook to manually recalculate recipient counts for existing campaigns

### 3. Updated Marketing Hub UI
**File**: `src/pages/marketing/MarketingHub.tsx`

**Changes**:
- Auto-refreshes recipient counts for draft campaigns with 0 recipients on page load
- Shows contextual messages:
  - "X recipients targeted" when a campaign hasn't been sent yet
  - "X total recipients" when partially sent
  - "X automations waiting for triggers" when automations are active but have 0 enrollments
- Displays both `total_recipients` and `sent_count` for better visibility

### 4. Created SQL Backfill Script
**File**: `scripts/sql/backfill-campaign-recipients.sql`

- Database function `calculate_campaign_recipients()` that calculates recipients using SQL
- Backfills recipient counts for existing campaigns with 0 recipients
- Can be run on production to fix historical data

## Usage

### For New Campaigns
- Recipients are automatically calculated when you create a campaign
- The Marketing Hub will immediately show the correct recipient count

### For Existing Campaigns
Two options:

**Option 1: Automatic** (Frontend)
- Navigate to Marketing Hub
- Draft campaigns with 0 recipients will automatically refresh their counts
- Happens once per campaign per session

**Option 2: Manual** (Database)
```sql
-- Run the backfill script in Supabase SQL Editor
-- File: scripts/sql/backfill-campaign-recipients.sql
```

### For Automations
- Automation enrollments are event-driven (triggered by actions)
- 0 enrollments means no contacts have triggered the automation yet
- This is expected behavior and the UI now clarifies this

## Technical Details

### Audience Type Calculations

**All Contacts**
```typescript
SELECT * FROM contacts 
WHERE client_id = ? 
  AND do_not_contact = false
  AND (email_opt_out = false OR sms_opt_out = false) // based on campaign type
```

**Contact Lists**
```typescript
SELECT contacts.* FROM contact_list_members
JOIN contacts ON contacts.id = contact_list_members.contact_id
WHERE list_id IN (?)
  AND do_not_contact = false
  AND opt-out filters...
```

**Manual Selection**
```typescript
SELECT * FROM contacts
WHERE id IN (?)
  AND do_not_contact = false
  AND opt-out filters...
```

### Performance Considerations
- Recipient calculation is done asynchronously
- Uses database indexes on `client_id`, `list_id`, and `do_not_contact`
- Auto-refresh only runs once per campaign per session
- Failed calculations don't block campaign creation (defaults to 0)

## Testing

1. **Create a new campaign** with a contact list
   - ✅ Verify `total_recipients` is set correctly
   - ✅ Marketing Hub shows the count immediately

2. **View Marketing Hub** with existing draft campaigns
   - ✅ Campaigns with 0 recipients auto-refresh
   - ✅ UI shows "X recipients targeted" message

3. **Create an automation** but don't trigger it
   - ✅ Shows 0 enrollments (correct)
   - ✅ UI shows "X automations waiting for triggers"

4. **Send a campaign**
   - ✅ `sent_count` increments as messages are sent
   - ✅ UI shows actual send progress

## Files Modified

1. ✅ `supabase/functions/preview-campaign-audience/index.ts` (NEW)
2. ✅ `src/features/marketing/hooks/useMarketingCampaigns.ts`
3. ✅ `src/pages/marketing/MarketingHub.tsx`
4. ✅ `scripts/sql/backfill-campaign-recipients.sql` (NEW)

## Deployment Steps

1. ✅ Deploy edge function: `npx supabase functions deploy preview-campaign-audience`
2. ⏳ Run backfill script in Supabase SQL Editor (if needed for existing data)
3. ✅ Frontend changes are automatically deployed with next build

## Next Steps (Optional Enhancements)

1. Add segment audience type support
2. Add real-time recipient count updates when lists change
3. Show recipient breakdown by email/SMS in UI
4. Add "Refresh Count" button for manual updates
5. Cache recipient counts to reduce API calls

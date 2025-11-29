# MVP Setup Guide

## Quick Start Checklist

Follow these steps to get your ACE Engage platform ready for running campaigns with gift card rewards.

### Prerequisites

- [ ] Node.js 18+ installed
- [ ] Supabase project created
- [ ] Twilio account created (for SMS)
- [ ] Git repository cloned

---

## Step 1: Environment Configuration

### 1.1 Copy Environment Template

```bash
cp .env.example .env
```

### 1.2 Configure Supabase

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings → API**
3. Copy these values to your `.env`:
   - `VITE_SUPABASE_URL` - Your Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your anon/public key

### 1.3 Configure Twilio (Required for SMS)

1. Go to Twilio Console: https://console.twilio.com
2. Get your credentials from the dashboard:
   - `VITE_TWILIO_ACCOUNT_SID` - Account SID
   - `VITE_TWILIO_AUTH_TOKEN` - Auth Token
3. Purchase a phone number: **Phone Numbers → Buy a Number**
4. Add to `.env`:
   - `VITE_TWILIO_PHONE_NUMBER` - Your purchased number (E.164 format: +15125551234)

---

## Step 2: Database Setup

### 2.1 Run Migrations

All database migrations should already be applied if you're using Supabase CLI:

```bash
cd supabase
npx supabase db reset  # Resets and applies all migrations
```

Or via Supabase Dashboard:
1. Go to **SQL Editor**
2. Run each migration file in `supabase/migrations/` in order

### 2.2 Seed Test Data

Run the seed script to create test organizations, clients, and gift cards:

1. Open Supabase SQL Editor
2. Run the contents of: `scripts/sql/seed-mvp-test-data.sql`

This will create:
- Gift card brands (Amazon, Starbucks, etc.)
- Test organization & client
- Test gift card pool with 20 cards
- Test contact list with 10 contacts
- Test template

### 2.3 Verify Database

Run the verification script:

1. Open Supabase SQL Editor
2. Run: `scripts/sql/verify-mvp-database.sql`
3. Check that all tables exist and have data

---

## Step 3: Install Dependencies

```bash
npm install --legacy-peer-deps
```

---

## Step 4: Start Development Server

```bash
npm run dev
```

The app should open at: **http://localhost:8081**

---

## Step 5: Run MVP Verification

### 5.1 Via Web Interface

1. Log in to the platform
2. Navigate to: **/admin/mvp-verification**
3. Click **"Run Verification"**
4. Review results

### 5.2 Via Browser Console

```javascript
// Run in browser console
await window.verifyMVP()
```

### Expected Results:

```
✅ Database Tables: All critical tables exist
✅ Organizations & Clients: Found test data
✅ User Setup: User logged in with role
✅ Gift Cards: Pools with available cards
✅ Contacts: Test contacts and lists exist
✅ Environment Config: All required vars set
```

---

## Step 6: Create Your First Campaign

### 6.1 Navigate to Campaigns

Go to: **/campaigns/new**

### 6.2 Campaign Wizard Steps

**Step 1 - Setup:**
- Name: "Test Campaign"
- Size: 4x6
- Template: Select "Simple Test Template" (or skip)

**Step 2 - Recipients:**
- Source: Contact List
- Select: "Test Contact List"

**Step 3 - Tracking & Rewards:**
- Configure condition:
  - Condition Name: "Call Completed"
  - Trigger Type: "Manual Agent"
- Link gift card pool:
  - Pool: "Test Amazon $25 Pool"
  - SMS Template: "Your reward: {{card_code}}"

**Step 4 - Delivery:**
- Mail Date: Choose "ASAP" or schedule
- Postage: Standard

**Step 5 - Review:**
- Review settings
- Click **"Create Campaign"**

### 6.3 Verify Campaign Created

Check that:
- Campaign appears in campaigns list
- Status is "draft"
- Recipients were generated
- Condition is configured
- Reward config is linked

---

## Step 7: Test Gift Card Flow

### 7.1 Trigger Condition Manually

You can test gift card provisioning through:

**Option A: Call Center Interface**
1. Go to: **/call-center**
2. Enter a recipient's redemption code
3. Mark condition as met
4. Gift card should be provisioned and SMS sent

**Option B: Direct API Call**
```javascript
// Via browser console or API tool
const { data, error } = await supabase.functions.invoke('evaluate-conditions', {
  body: {
    recipientId: '<RECIPIENT_ID>',
    campaignId: '<CAMPAIGN_ID>',
    eventType: 'call_completed',
    metadata: {}
  }
});
```

### 7.2 Verify Gift Card Delivery

Check:
- Gift card status changed from 'available' to 'claimed'
- Delivery record created in `gift_card_deliveries`
- SMS sent to recipient phone number
- Recipient can view card via PURL

---

## Troubleshooting

### Issue: Database tables don't exist

**Solution:** Run migrations:
```bash
cd supabase
npx supabase db reset
```

### Issue: No gift cards available

**Solution:** Run seed script `scripts/sql/seed-mvp-test-data.sql`

### Issue: SMS not sending

**Solution:**
1. Check Twilio credentials in `.env`
2. Verify phone number is E.164 format (+15125551234)
3. Check Twilio console for error logs

### Issue: "User not assigned to client"

**Solution:** Run this in SQL Editor:
```sql
-- Get your user ID
SELECT auth.uid();

-- Assign to test client
INSERT INTO client_users (user_id, client_id)
VALUES (
  auth.uid(),
  '00000000-0000-0000-0000-000000000002'
);
```

### Issue: Edge functions not working

**Solution:** Deploy edge functions:
```bash
cd supabase
npx supabase functions deploy
```

---

## MVP Success Criteria

Your MVP is ready when:

- All database tables exist with test data
- Environment variables configured
- Gift card pool has available cards
- Can create campaign through wizard
- Conditions trigger gift card provisioning
- SMS delivery works
- PURL pages load correctly
- Recipients can view gift cards

---

## Next Steps

Once MVP is working:

1. **Import Real Contacts:** Use CSV import
2. **Create Real Gift Card Pools:** Purchase from vendors
3. **Design Templates:** Use mail designer
4. **Set Up Call Tracking:** Configure Twilio webhooks
5. **Test Full Workflow:** End-to-end campaign
6. **Configure Production:** Update environment for prod

---

## Quick Reference

### Key URLs
- Dev Server: http://localhost:8081
- Campaigns: /campaigns
- Gift Cards: /gift-cards
- Contacts: /contacts
- Call Center: /call-center
- Admin: /admin/mvp-verification

### Key Tables
- `campaigns` - Campaign data
- `recipients` - Campaign recipients with tokens
- `gift_card_pools` - Gift card inventory
- `gift_cards` - Individual cards
- `campaign_conditions` - Trigger conditions
- `campaign_reward_configs` - Reward settings

### Key Functions
- `evaluate-conditions` - Process triggers
- `claim-and-provision-card` - Get card from pool
- `send-gift-card-sms` - Send via Twilio
- `handle-purl` - Track PURL visits


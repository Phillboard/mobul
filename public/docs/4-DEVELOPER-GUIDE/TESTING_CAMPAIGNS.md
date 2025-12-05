# Campaign Testing Guide

This guide walks you through testing the complete campaign workflow from creation to gift card delivery.

## Prerequisites

- Run MVP Verification first: `/admin/mvp-verification`
- Test data seeded successfully
- Twilio configured for SMS
- User assigned to test client

---

## Test 1: Campaign Creation

### Step 1: Navigate to Campaign Creation

1. Go to: `/campaigns/new`
2. You should see the 5-step campaign wizard

### Step 2: Complete Wizard - Setup

**Fields:**
- Campaign Name: `Test Campaign MVP`
- Mail Size: `4x6`
- Template: Select `Simple Test Template` (or skip)

Click **Next** → 

### Step 3: Complete Wizard - Recipients

**Select Source:**
- Source Type: `Contact List`
- Contact List: `Test Contact List`

The wizard should show:
- 10 contacts selected
- Preview of first few contacts

Click **Next** →

### Step 4: Complete Wizard - Tracking & Rewards

**Configure Condition:**
1. Click "Add Condition"
2. Fill in:
   - Condition Name: `Call Completed`
   - Trigger Type: `Manual Agent` (or `call_completed`)
   - Gift Card Brand: `Amazon`
   - Denomination: `$25`
   - SMS Template: `Congratulations! Your reward code is: {{card_code}}`

Click **Next** →

### Step 5: Complete Wizard - Delivery

**Settings:**
- Postage Class: `Standard`
- Mail Date Mode: `ASAP` (or schedule a date)
- Vendor: Leave empty for testing

Click **Next** →

### Step 6: Complete Wizard - Review

Review all settings and click **Create Campaign**

### Expected Results:

- Success message displayed
- Redirected to campaign detail page
- Campaign status is `draft`
- Audience created with 10 recipients
- Each recipient has unique token
- Condition configured
- Reward config linked to pool

### Verification Queries:

```sql
-- Check campaign
SELECT id, name, status, audience_id 
FROM campaigns 
WHERE name = 'Test Campaign MVP';

-- Check recipients (should have 10)
SELECT COUNT(*), MIN(token), MAX(token)
FROM recipients 
WHERE audience_id = (
  SELECT audience_id FROM campaigns WHERE name = 'Test Campaign MVP'
);

-- Check condition
SELECT * FROM campaign_conditions 
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE name = 'Test Campaign MVP'
);

-- Check reward config
SELECT * FROM campaign_reward_configs 
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE name = 'Test Campaign MVP'
);
```

---

## Test 2: Condition Trigger & Gift Card Provisioning

### Method A: Via Call Center Interface

1. Go to: `/call-center`
2. Get a recipient token from database:

```sql
SELECT 
  r.token as redemption_code,
  r.first_name,
  r.last_name,
  r.phone,
  c.name as campaign_name
FROM recipients r
JOIN audiences a ON r.audience_id = a.id
JOIN campaigns c ON a.id = c.audience_id
WHERE c.name = 'Test Campaign MVP'
LIMIT 1;
```

3. Enter the redemption code in call center interface
4. Click "Provision Gift Card"
5. Select condition: `Call Completed`
6. Confirm provisioning

### Expected Results:

- Gift card provisioned message
- Card details displayed (code, number, PIN)
- SMS sent to recipient phone
- Gift card status changed to `claimed`
- Delivery record created

### Method B: Via Edge Function (Direct API)

Using Supabase Functions or browser console:

```javascript
// Get campaign and recipient IDs first
const { data: campaign } = await supabase
  .from('campaigns')
  .select('id, campaign_conditions(id)')
  .eq('name', 'Test Campaign MVP')
  .single();

const { data: recipient } = await supabase
  .from('recipients')
  .select('id')
  .eq('audience_id', campaign.audience_id)
  .limit(1)
  .single();

// Trigger condition evaluation
const { data, error } = await supabase.functions.invoke('evaluate-conditions', {
  body: {
    recipientId: recipient.id,
    campaignId: campaign.id,
    eventType: 'call_completed',
    metadata: {
      trigger_source: 'manual_test'
    }
  }
});

console.log('Result:', data, error);
```

### Verification Queries:

```sql
-- Check gift card was claimed
SELECT 
  gc.card_code,
  gc.status,
  gc.claimed_at,
  gc.claimed_by_recipient_id
FROM gift_cards gc
WHERE gc.status = 'claimed'
ORDER BY gc.claimed_at DESC
LIMIT 1;

-- Check delivery record
SELECT 
  gcd.*,
  r.first_name,
  r.last_name,
  r.phone
FROM gift_card_deliveries gcd
JOIN recipients r ON gcd.recipient_id = r.id
ORDER BY gcd.created_at DESC
LIMIT 1;
```

---

## Test 3: SMS Delivery

### Prerequisites:

- Twilio credentials configured
- Recipient has valid phone number

### Test SMS via Twilio Test Mode:

```javascript
// Test Twilio SMS directly
const { data, error } = await supabase.functions.invoke('send-gift-card-sms', {
  body: {
    deliveryId: '<DELIVERY_ID_FROM_PREVIOUS_STEP>'
  }
});

console.log('SMS Result:', data, error);
```

### Expected Results:

- SMS sent successfully
- Twilio SID returned
- Delivery status updated to `sent`
- Recipient receives SMS with card details

### Twilio Console Verification:

1. Go to: https://console.twilio.com/us1/monitor/logs/messages
2. Find recent message
3. Check status: `delivered` or `sent`
4. View message body contains card code

---

## Test 4: PURL Landing Page

### Get PURL URL:

```sql
SELECT 
  c.id as campaign_id,
  r.token,
  r.first_name,
  r.last_name,
  CONCAT('http://localhost:8081/c/', c.id, '/', r.token) as purl_url
FROM recipients r
JOIN audiences a ON r.audience_id = a.id
JOIN campaigns c ON a.id = c.audience_id
WHERE c.name = 'Test Campaign MVP'
LIMIT 1;
```

### Visit PURL:

1. Copy the `purl_url` from query
2. Open in browser (or new incognito window)
3. Page should load with personalized content

### Expected Results:

- Page loads successfully
- Personalized greeting with recipient name
- Landing page content displays
- PURL visit tracked in database
- Forms (if present) are functional

### Verification Queries:

```sql
-- Check PURL visit was tracked
SELECT * FROM events
WHERE event_type = 'purl_visit'
AND recipient_id = '<RECIPIENT_ID>'
ORDER BY created_at DESC;
```

---

## Test 5: Gift Card Redemption Page

### Get Gift Card Reveal Link:

After a card is delivered, recipient can view it:

```sql
SELECT 
  CONCAT('http://localhost:8081/gift-card-reveal/', gcd.id) as reveal_url,
  gc.card_code,
  gc.card_value
FROM gift_card_deliveries gcd
JOIN gift_cards gc ON gcd.gift_card_id = gc.id
ORDER BY gcd.created_at DESC
LIMIT 1;
```

### Visit Reveal Page:

1. Copy `reveal_url`
2. Open in browser
3. Card details should display

### Expected Results:

- Page loads successfully
- Card code visible
- Card value displayed
- Brand logo shown (if available)
- "Add to Wallet" buttons present (Apple/Google)

---

## End-to-End Test Summary

| Step | Component | Status | Notes |
|------|-----------|--------|-------|
| 1 | Campaign Creation | ⬜ | Via wizard |
| 2 | Audience & Recipients | ⬜ | 10 test contacts |
| 3 | Condition Configuration | ⬜ | Call completed trigger |
| 4 | Reward Configuration | ⬜ | Linked to gift card brand |
| 5 | Condition Trigger | ⬜ | Manual or API |
| 6 | Gift Card Provisioning | ⬜ | From pool |
| 7 | SMS Delivery | ⬜ | Via Twilio |
| 8 | PURL Visit | ⬜ | Personalized page |
| 9 | Card Reveal | ⬜ | View card details |
| 10 | Tracking & Analytics | ⬜ | All events logged |

---

## Common Issues & Solutions

### Issue: Campaign creation fails

**Symptoms:** Error during wizard submission

**Solutions:**
1. Check user is assigned to client
2. Verify contact list has contacts
3. Check gift card pool has available cards
4. Review browser console for errors

### Issue: Gift card not provisioning

**Symptoms:** Condition triggers but no card claimed

**Solutions:**
1. Verify gift card inventory has available cards
2. Check condition has valid brand_id and card_value
3. Review edge function logs in Supabase
4. Check condition is properly configured

### Issue: SMS not sending

**Symptoms:** Card provisioned but no SMS received

**Solutions:**
1. Verify Twilio credentials in .env
2. Check recipient has valid phone number
3. Check Twilio console for error messages
4. Verify Twilio phone number is active
5. Check account balance in Twilio

### Issue: PURL page doesn't load

**Symptoms:** 404 or blank page

**Solutions:**
1. Verify campaign and recipient IDs are correct
2. Check token format (no spaces/special chars)
3. Review RLS policies on recipients table
4. Check landing_page_id is set (if using custom pages)

---

## Performance Benchmarks

### Expected Response Times:

- Campaign Creation: < 2 seconds
- Condition Evaluation: < 1 second
- Gift Card Provisioning: < 500ms
- SMS Delivery: < 3 seconds
- PURL Page Load: < 500ms

### Database Queries:

All queries should complete in < 100ms for test data sets.

---

## Next Steps After Successful Testing

1. Scale test with larger contact lists (100+)
2. Test concurrent gift card provisioning
3. Load test PURL pages
4. Test edge cases (empty pool, invalid tokens)
5. Configure production Twilio credentials
6. Set up monitoring and alerts
7. Document production deployment checklist


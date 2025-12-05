# Gift Card System Troubleshooting

## Overview

Comprehensive troubleshooting guide for gift card provisioning, delivery, and common errors.

---

## Common Error Messages & Solutions

### Error: "400 Bad Request" from provision-gift-card-for-call-center

This is the most common error. Here's how to diagnose and fix it:

#### Possible Causes & Solutions

**1. No Gift Cards in Inventory AND No Tillo API Configured**

**Error Message in Logs:**
```
No gift card configured for this campaign condition
```

**Solution - Choose ONE:**

**Option A: Upload Gift Card Inventory (Recommended for Testing)**

1. Go to Settings → Gift Cards → Upload Cards
2. Create a CSV file with this format:
   ```csv
   card_code,card_number,expiration_date
   CODE123,1234567890123456,2025-12-31
   CODE456,1234567890123457,2025-12-31
   CODE789,1234567890123458,2025-12-31
   ```
3. Upload the CSV for your brand/denomination
4. Verify cards show as "Available" in the pool

**Option B: Configure Tillo API (For Production)**

1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Add Tillo credentials:
   - `TILLO_API_KEY` = your_api_key
   - `TILLO_SECRET_KEY` = your_secret_key
3. In Settings → Gift Cards → Brands
4. Edit your brand and add the `tillo_brand_code`
5. Set cost per card for automatic provisioning

**2. Campaign Has No Gift Card Configured**

**Error Message:**
```
No gift card configured for this campaign condition
```

**Solution:**
1. Go to Campaigns → Select your campaign
2. Click "Edit Campaign"
3. Go to "Conditions" tab
4. For each condition, set:
   - Gift Card Brand (e.g., "Amazon")
   - Card Value (e.g., 25)
5. Save the campaign

**3. Recipient Not Opted In**

**Error Message:**
```
Recipient verification required
```

**Solution:**
- Customer must complete SMS opt-in by replying "YES"
- OR use "Verify via Email" option
- OR use "Skip Verification" with valid disposition

**4. Gift Card Already Provisioned**

**Error Message:**
```
Gift card has already been provisioned for this recipient and condition
```

**Solution:**
- This customer already received a gift card
- Check the database: `gift_card_billing_ledger` table
- If this is an error, contact admin to reset

---

## Error Code Reference

Complete reference for all gift card error codes:

| Code | Description | Can Retry | Needs Campaign Edit | Action Required |
|------|-------------|-----------|---------------------|-----------------|
| GC-001 | Missing brand_id/card_value | No | Yes | Edit campaign condition settings |
| GC-002 | Brand not found | No | Yes | Enable brand or select different one |
| GC-003 | No inventory available | Yes | No | Upload cards or wait for restocking |
| GC-004 | Tillo API not configured | No | No | Add Tillo credentials to Supabase |
| GC-005 | Tillo API call failed | Yes | No | Check Tillo account status and balance |
| GC-006 | Insufficient credits | No | No | Allocate more credits to account |
| GC-007 | Billing transaction failed | No | No | Contact support - database issue |
| GC-008 | Campaign billing not configured | No | Yes | Configure billing entity for campaign |
| GC-009 | Verification required | Yes | No | Complete SMS opt-in or skip verification |
| GC-010 | Already provisioned | No | No | Customer already received gift card |
| GC-011 | Invalid redemption code | Yes | No | Verify code exists and spelling correct |
| GC-012 | Missing parameters | Yes | No | Check API request includes all fields |
| GC-013 | Database function error | No | No | Check migrations applied correctly |
| GC-014 | Delivery notification failed | Yes | No | Check SMS/email provider configuration |
| GC-015 | Unknown error | Yes | No | Check function logs for specific details |

---

## Step-by-Step: Getting Gift Card Provisioning Working

### Prerequisites Checklist

- [ ] Campaign is created and in "In Production" or "Mailed" status
- [ ] Campaign has at least one active condition configured
- [ ] Condition has a gift card brand and value set
- [ ] Either:
  - [ ] Gift card inventory uploaded for that brand/value, OR
  - [ ] Tillo API credentials configured
- [ ] Twilio SMS configured (for delivery)

### Step 1: Verify Campaign Configuration

```sql
-- Run this in Supabase SQL Editor
SELECT 
  c.id,
  c.campaign_name,
  c.status,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  cc.card_value,
  cc.is_active,
  gb.brand_name
FROM campaigns c
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = cc.brand_id
WHERE c.id = 'YOUR_CAMPAIGN_ID';
```

**Expected Results:**
- Campaign status: `in_production`, `mailed`, or `scheduled`
- Condition is_active: `true`
- brand_id: NOT NULL
- card_value: Should be a number (e.g., 25, 50)
- brand_name: Should show (e.g., "Amazon", "Visa")

**If Missing:**
1. Edit campaign
2. Go to Conditions tab
3. Add or edit condition
4. Set brand and value
5. Make sure condition is active

### Step 2: Check Gift Card Inventory

```sql
-- Check if you have available cards
SELECT 
  gi.denomination,
  gb.brand_name,
  COUNT(*) FILTER (WHERE gi.status = 'available') as available,
  COUNT(*) as total
FROM gift_card_inventory gi
JOIN gift_card_brands gb ON gb.id = gi.brand_id
GROUP BY gi.denomination, gb.brand_name
ORDER BY gb.brand_name, gi.denomination;
```

**Expected Results:**
- At least one brand-denomination with `available > 0`
- Matching your campaign condition's brand and value

**If No Available Cards:**

Choose one option:

**Option A: Upload CSV Inventory**
1. Create a test CSV:
   ```csv
   card_code,card_number,expiration_date
   TEST001,1111222233334444,2025-12-31
   TEST002,1111222233334445,2025-12-31
   TEST003,1111222233334446,2025-12-31
   ```
2. Go to Settings → Gift Cards
3. Click "Upload Cards"
4. Select your brand and value
5. Upload the CSV
6. Verify cards appear in inventory

**Option B: Configure Tillo API**
1. Get Tillo credentials from Tillo dashboard
2. Set environment variables in Supabase
3. Configure brand Tillo code
4. System will auto-provision from Tillo when inventory is empty

### Step 3: Configure Twilio for SMS Delivery

```bash
# Set these in Supabase Dashboard → Settings → Edge Functions → Secrets
TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN = your_auth_token
TWILIO_FROM_NUMBER = +15551234567
```

### Step 4: Test the Complete Flow

1. **Lookup Customer**
   - Go to Call Center → Redemption Center
   - Enter redemption code (e.g., `AB6-1061`)
   - Customer info should load

2. **Send SMS Opt-In**
   - Enter customer's cell phone
   - Click "Send Opt-In SMS"
   - Check logs: `supabase functions logs send-sms-opt-in --tail`
   - Customer should receive SMS

3. **Customer Opts In**
   - Customer replies "YES" to SMS
   - Status should update to "Opted In" (green checkmark)

4. **Provision Gift Card**
   - Click "Continue to Delivery"
   - Select condition
   - Click "Provision Gift Card"
   - Card should be delivered via SMS

5. **Verify Success**
   - Customer receives gift card code via SMS
   - Dashboard shows success message
   - Check logs: `supabase functions logs provision-gift-card-for-call-center --tail`

---

## Diagnostic SQL Queries

### Check Recipient Status

```sql
SELECT 
  id,
  redemption_code,
  first_name,
  last_name,
  phone,
  email,
  sms_opt_in_status,
  sms_opt_in_sent_at,
  verification_method,
  disposition,
  approval_status
FROM recipients
WHERE redemption_code = 'YOUR_CODE';
```

### Check if Gift Card Already Provisioned

```sql
SELECT 
  gcbl.*,
  r.redemption_code,
  r.first_name,
  r.last_name,
  gb.brand_name
FROM gift_card_billing_ledger gcbl
JOIN recipients r ON r.id = gcbl.recipient_id
JOIN gift_card_brands gb ON gb.id = gcbl.brand_id
WHERE r.redemption_code = 'YOUR_CODE';
```

### View SMS Delivery Log

```sql
SELECT 
  sdl.*,
  r.redemption_code,
  r.first_name,
  r.last_name
FROM sms_delivery_log sdl
JOIN recipients r ON r.id = sdl.recipient_id
WHERE r.redemption_code = 'YOUR_CODE'
ORDER BY sdl.created_at DESC;
```

### Check Campaign Gift Card Configuration

```sql
SELECT 
  c.campaign_name,
  cc.condition_number,
  cc.condition_name,
  gb.brand_name,
  cc.card_value,
  cc.is_active
FROM campaigns c
JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = cc.brand_id
WHERE c.id = 'YOUR_CAMPAIGN_ID';
```

---

## Environment Variables Quick Reference

### Required for SMS (Twilio)

```
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15551234567
```

### Optional for Gift Card API (Tillo)

```
TILLO_API_KEY=your_api_key
TILLO_SECRET_KEY=your_secret_key
TILLO_BASE_URL=https://api.tillo.tech/v2  # Optional, defaults to this
```

### Optional for Support Info

```
COMPANY_NAME=Your Company
SUPPORT_PHONE_NUMBER=1-800-SUPPORT
SUPPORT_EMAIL=support@company.com
```

---

## Monitoring & Logs

### View Real-Time Logs

```bash
# SMS Opt-In
supabase functions logs send-sms-opt-in --tail

# Gift Card SMS Delivery
supabase functions logs send-gift-card-sms --tail

# Gift Card Provisioning
supabase functions logs provision-gift-card-for-call-center --tail
supabase functions logs provision-gift-card-unified --tail
```

### Common Log Messages

**Success Indicators:**
- `[CALL-CENTER-PROVISION] Provisioning successful`
- `[PROVISION] Success`
- `[TWILIO] SMS sent successfully, SID: SMxxxxxx`

**Error Indicators:**
- `No gift card configured`
- `No available gift cards in pool`
- `Tillo API error`
- `SMS service not configured`

---

## Quick Fixes for Common Issues

### Issue: Can't Provision Because "Not Opted In"

**Quick Fix:**
1. Use "Verify via Email" button
2. OR use "Skip Verification" → Select "VIP Customer" or "Verified Verbally"
3. OR wait for customer to reply "YES" to SMS

### Issue: "No Gift Cards Available"

**Quick Fix (Testing):**
1. Go to Settings → Gift Cards
2. Create a new pool for your brand/value
3. Upload a test CSV with 3-5 cards
4. Try provisioning again

### Issue: SMS Not Sending

**Quick Fix:**
1. Verify Twilio credentials in Supabase Secrets
2. Check Twilio Console for account status
3. Ensure `TWILIO_FROM_NUMBER` has `+1` prefix
4. Try a different test phone number

### Issue: Card Provisioned But Customer Didn't Get SMS

**Quick Fix:**
1. Check `sms_delivery_log` table
2. Look for `delivery_status = 'failed'`
3. Check Twilio Console → SMS Logs
4. Use "Resend SMS" button in call center

---

## Migration Guide: Pool-Based to Marketplace

### Old System (Deprecated)
- **gift_card_pools** table - Managed inventory in "pools"
- Each pool had a brand, denomination, and inventory count
- Pools belonged to specific clients
- Complex pool management UI

### New System (Current)
- **gift_card_brands** - Master catalog of available brands
- **gift_card_denominations** - Denominations available per brand
- **gift_card_inventory** - Uploaded gift card codes
- **client_available_gift_cards** - Enabled brand-denomination pairs per client
- **campaign_gift_card_config** - Links campaigns to specific brand-denominations

### Migration Impact

If you see references to `gift_card_pools` in error messages:
- The system has been migrated to the marketplace model
- Use `gift_card_inventory` instead
- Query by `brand_id` + `denomination` instead of `pool_id`

---

## Advanced Diagnostics

### Provisioning Trace Analysis

```sql
-- View complete provisioning trace for a request
SELECT 
  request_id,
  step_number,
  step_name,
  status,
  duration_ms,
  error_code,
  error_message
FROM gift_card_provisioning_trace
WHERE request_id = 'req_xxxxx'
ORDER BY step_number;

-- Find most common failures
SELECT 
  error_code,
  error_message,
  COUNT(*) as occurrence_count
FROM gift_card_provisioning_trace
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_code, error_message
ORDER BY occurrence_count DESC
LIMIT 10;
```

### Monitoring Views

```sql
-- Provisioning health (last 24 hours)
SELECT * FROM v_provisioning_health_hourly
WHERE hour > NOW() - INTERVAL '24 hours';

-- Top failures
SELECT * FROM v_top_provisioning_failures;

-- Campaign-specific stats
SELECT * FROM v_campaign_provisioning_stats
WHERE campaign_id = 'YOUR_CAMPAIGN_ID';

-- Active issues requiring attention
SELECT * FROM v_active_provisioning_issues;
```

---

## Support Resources

### Need Help?

1. **Check Logs First**: Most errors are visible in function logs
2. **Run Diagnostic SQL**: Use the queries above
3. **Review Environment Variables**: Ensure all required secrets are set
4. **Test with Known Good Data**: Try with a test customer and test inventory
5. **Contact Support**: Provide error logs and diagnostic query results

### Related Documentation

- [Gift Card Features Guide](../3-FEATURES/GIFT_CARDS.md)
- [Call Center Guide](../6-USER-GUIDES/CALL_CENTER_GUIDE.md)
- [Edge Functions API](../5-API-REFERENCE/EDGE_FUNCTIONS.md)
- [Testing Guide](../4-DEVELOPER-GUIDE/TESTING.md)

---

**Last Updated:** December 4, 2024

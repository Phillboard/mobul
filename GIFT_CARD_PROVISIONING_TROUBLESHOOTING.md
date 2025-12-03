# Gift Card Provisioning Troubleshooting Guide

## Common Error Messages & Solutions

### Error: "400 Bad Request" from provision-gift-card-for-call-center

This is the error you're seeing in the browser console. Here's how to diagnose and fix it:

#### Possible Causes & Solutions

1. **No Gift Cards in Inventory AND No Tillo API Configured**

   **Error Message in Logs:**
   ```
   No gift card configured for this campaign condition
   ```

   **Solution:**
   Choose ONE of these options:

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

2. **Campaign Has No Gift Card Configured**

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

3. **Recipient Not Opted In**

   **Error Message:**
   ```
   Recipient verification required
   ```

   **Solution:**
   - Customer must complete SMS opt-in by replying "YES"
   - OR use "Verify via Email" option
   - OR use "Skip Verification" with valid disposition

4. **Gift Card Already Provisioned**

   **Error Message:**
   ```
   Gift card has already been provisioned for this recipient and condition
   ```

   **Solution:**
   - This customer already received a gift card
   - Check the database: `gift_card_billing_ledger` table
   - If this is an error, contact admin to reset

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
  gcp.pool_name,
  gcp.card_value,
  gcp.provider,
  gcp.available_cards,
  gcp.total_cards,
  gb.brand_name
FROM gift_card_pools gcp
JOIN gift_card_brands gb ON gb.id = gcp.brand_id
WHERE gcp.available_cards > 0
ORDER BY gcp.created_at DESC;
```

**Expected Results:**
- At least one pool with `available_cards > 0`
- Matching `card_value` to your campaign condition

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
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
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

## Need Help?

1. **Check Logs First**: Most errors are visible in function logs
2. **Run Diagnostic SQL**: Use the queries above
3. **Review Environment Variables**: Ensure all required secrets are set
4. **Test with Known Good Data**: Try with a test customer and test inventory
5. **Contact Support**: Provide error logs and diagnostic query results

## Related Documentation

- [Twilio SMS Migration Guide](./TWILIO_SMS_MIGRATION_GUIDE.md)
- [Gift Card System Implementation](./GIFT_CARD_SYSTEM_IMPLEMENTATION_COMPLETE.md)
- [Call Center Permissions](./CALL_CENTER_PERMISSIONS_FIX_COMPLETE.md)


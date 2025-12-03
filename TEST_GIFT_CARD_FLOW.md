# Gift Card Provisioning Flow - Testing Guide

## Prerequisites

Before testing, ensure:

1. **Twilio Credentials Set** in Supabase Dashboard → Settings → Edge Functions → Secrets:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER`

2. **Functions Deployed**:
   ```bash
   supabase functions deploy send-sms-opt-in
   supabase functions deploy send-gift-card-sms
   supabase functions deploy provision-gift-card-for-call-center
   supabase functions deploy validate-environment
   ```

3. **Campaign Configured**:
   - Campaign status: "In Production", "Mailed", or "Scheduled"
   - At least one active condition
   - Condition has brand and card value set

4. **Gift Cards Available**:
   - Either uploaded CSV inventory
   - OR Tillo API configured

## Step-by-Step Test Procedure

### Step 1: Validate Environment

```bash
# Call validation endpoint (replace with your project URL)
curl https://YOUR_PROJECT.supabase.co/functions/v1/validate-environment \
  -H "Authorization: Bearer YOUR_ANON_KEY" | jq
```

**Expected Result:**
```json
{
  "success": true,
  "summary": {
    "errors": 0,
    "healthy": true
  }
}
```

**If Errors:** Fix missing environment variables before proceeding.

---

### Step 2: Verify Campaign Configuration

```sql
-- Run in Supabase SQL Editor
SELECT 
  c.id,
  c.campaign_name,
  c.status,
  cc.id as condition_id,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  cc.card_value,
  cc.is_active,
  gb.brand_name,
  cc.sms_template
FROM campaigns c
LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = cc.brand_id
WHERE c.campaign_name = 'spring 26'  -- Use your campaign name
ORDER BY cc.condition_number;
```

**Expected Results:**
- ✅ Campaign status is "in_production", "mailed", or "scheduled"
- ✅ At least one condition with `is_active = true`
- ✅ Condition has `brand_id` (not null)
- ✅ Condition has `card_value` (e.g., 25)
- ✅ `brand_name` shows (e.g., "Amazon")

**If Missing Brand/Value:**
1. Go to Campaigns → Edit Campaign
2. Click "Conditions" tab
3. Set brand and value for the condition
4. Save

---

### Step 3: Check Gift Card Inventory

```sql
-- Check available cards
SELECT 
  gcp.id as pool_id,
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

**Expected Result:**
- ✅ At least one pool with `available_cards > 0`
- ✅ Pool matches your campaign's brand and value

**If No Cards Available:**

Create test inventory:

1. Create `test_cards.csv`:
```csv
card_code,card_number,expiration_date
TEST001,1111222233334444,2025-12-31
TEST002,1111222233334445,2025-12-31
TEST003,1111222233334446,2025-12-31
TEST004,1111222233334447,2025-12-31
TEST005,1111222233334448,2025-12-31
```

2. Go to Settings → Gift Cards → Upload Cards
3. Select your brand and value ($25, $50, etc.)
4. Upload the CSV
5. Verify cards appear in inventory

---

### Step 4: Test SMS Opt-In Flow

1. **Open Call Center**:
   - Navigate to `http://localhost:8080/call-center`
   - Go to "Redemption Center" tab

2. **Lookup Customer**:
   - Enter redemption code: `AB6-1061` (or your test code)
   - Click "Look Up"
   - Customer info should load

3. **Send Opt-In SMS**:
   - Enter your cell phone number in "Customer's Cell Phone Number"
   - Click "Send Opt-In SMS"
   - Wait for success message

4. **Monitor Logs**:
   ```bash
   supabase functions logs send-sms-opt-in --tail
   ```
   
   **Look for:**
   ```
   [SEND-SMS-OPT-IN] Sending opt-in to +1XXXXXXXXXX
   [TWILIO] Sending SMS to +1XXXXXXXXXX
   [TWILIO] SMS sent successfully, SID: SMxxxxxx
   ```

5. **Check Phone**:
   - You should receive SMS: "This is [Company]. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out."

6. **Reply YES**:
   - Reply "YES" to the SMS
   - Wait a few seconds
   - Status indicator should turn green with "✓ Opted In"

---

### Step 5: Test Gift Card Provisioning

1. **Continue to Delivery**:
   - After opt-in status shows green
   - Click "Continue to Delivery" button

2. **Verify Phone Number**:
   - Phone number should auto-fill from opt-in step
   - Click "Continue"

3. **Select Condition**:
   - Choose condition (e.g., "Condition 1: Listened to sales call")
   - View brand and value displayed
   - Click "Continue" or "Provision Gift Card"

4. **Provision Gift Card**:
   - Click "Provision Gift Card"
   - Wait for processing

5. **Monitor Logs**:
   ```bash
   # Terminal 1
   supabase functions logs provision-gift-card-for-call-center --tail
   
   # Terminal 2
   supabase functions logs provision-gift-card-unified --tail
   
   # Terminal 3
   supabase functions logs send-gift-card-sms --tail
   ```
   
   **Look for:**
   ```
   [CALL-CENTER-PROVISION] Starting
   [CALL-CENTER-PROVISION] Recipient found
   [CALL-CENTER-PROVISION] Gift card config found
   [CALL-CENTER-PROVISION] Calling unified provisioning
   [PROVISION] Claimed from inventory (or) Purchasing from Tillo
   [PROVISION] Success
   [CALL-CENTER-PROVISION] SMS sent successfully
   [CALL-CENTER-PROVISION] Complete success
   ```

6. **Check Phone**:
   - You should receive SMS: "Congratulations! You've earned a $25 gift card. Your code: TEST001. Thank you for your business!"

7. **Verify Success Screen**:
   - Should show gift card details
   - Code: TEST001
   - Value: $25.00
   - Brand: Amazon (or your brand)

---

### Step 6: Verify Database Records

```sql
-- Check SMS delivery log
SELECT 
  sdl.*,
  r.redemption_code,
  r.first_name,
  r.last_name
FROM sms_delivery_log sdl
JOIN recipients r ON r.id = sdl.recipient_id
WHERE r.redemption_code = 'AB6-1061'
ORDER BY sdl.created_at DESC;
```

**Expected:**
- ✅ Two records: one for opt-in, one for gift card delivery
- ✅ `delivery_status = 'sent'`
- ✅ `twilio_message_sid` populated (starts with "SM")

```sql
-- Check billing ledger
SELECT 
  gcbl.*,
  r.redemption_code,
  r.first_name,
  gb.brand_name
FROM gift_card_billing_ledger gcbl
JOIN recipients r ON r.id = gcbl.recipient_id
JOIN gift_card_brands gb ON gb.id = gcbl.brand_id
WHERE r.redemption_code = 'AB6-1061'
ORDER BY gcbl.created_at DESC;
```

**Expected:**
- ✅ One billing record created
- ✅ `transaction_type = 'purchase_from_inventory'` (or 'purchase_from_tillo')
- ✅ `amount_billed` matches card value
- ✅ `cost_basis` and `profit` calculated

```sql
-- Check gift card inventory updated
SELECT 
  gc.*,
  gcp.pool_name,
  gcp.available_cards,
  r.redemption_code
FROM gift_cards gc
LEFT JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
LEFT JOIN recipients r ON r.id = gc.claimed_by_recipient_id
WHERE r.redemption_code = 'AB6-1061'
ORDER BY gc.claimed_at DESC;
```

**Expected:**
- ✅ Gift card status = 'claimed'
- ✅ `claimed_by_recipient_id` populated
- ✅ `claimed_at` timestamp set
- ✅ Pool `available_cards` decremented by 1

---

### Step 7: Test Edge Cases

#### Test: Already Provisioned

1. Try to provision gift card again for same customer/condition
2. **Expected Error**: "Gift card has already been provisioned for this recipient and condition → This customer has already received a gift card for this campaign."

#### Test: No Opt-In

1. Look up a new customer
2. Skip the opt-in step
3. Try to provision
4. **Expected Error**: "Recipient verification required → Customer must opt-in via SMS, verify via email, or you must skip verification with a valid disposition."

#### Test: No Inventory (with Tillo configured)

1. Use all cards in inventory
2. Try to provision
3. **Expected**: Should automatically purchase from Tillo API
4. **Check logs**: `[PROVISION] No inventory, purchasing from Tillo`

#### Test: No Inventory (without Tillo)

1. Use all cards in inventory
2. Ensure Tillo NOT configured
3. Try to provision
4. **Expected Error**: "Provisioning failed → Check that you have gift cards in inventory OR Tillo API configured. Go to Settings → Gift Cards to manage inventory."

---

## Troubleshooting During Testing

### Issue: "SMS service not configured"

**Solution:**
```bash
# Verify environment variables are set
curl https://YOUR_PROJECT.supabase.co/functions/v1/validate-environment
```

If errors, set the variables in Supabase Dashboard.

### Issue: "No gift card configured"

**Solution:**
1. Edit your campaign
2. Go to Conditions tab
3. Set brand and card value for the condition
4. Save

### Issue: SMS not received

**Solution:**
1. Check Twilio Console → SMS Logs
2. Look for the message
3. Check delivery status
4. Try a different phone number
5. Ensure `TWILIO_FROM_NUMBER` is a valid Twilio number you own

### Issue: "400 Bad Request" with no helpful message

**Solution:**
1. Check function logs for detailed error
2. Run diagnostic SQL queries above
3. Use `validate-environment` to check configuration
4. Verify campaign and inventory setup

---

## Success Criteria

✅ All tests pass:
- [ ] Environment validation shows no errors
- [ ] Campaign configured with brand and value
- [ ] Gift card inventory available (or Tillo configured)
- [ ] SMS opt-in sent and received
- [ ] Customer can reply "YES" and status updates
- [ ] Gift card provisioned successfully
- [ ] Gift card delivery SMS sent and received
- [ ] Database records created correctly
- [ ] Inventory decremented
- [ ] Billing ledger updated
- [ ] Edge cases handled correctly

---

## Next Steps After Testing

1. **If All Tests Pass**:
   - System is ready for production use
   - Train call center staff
   - Monitor Twilio usage/costs
   - Monitor gift card inventory levels

2. **If Tests Fail**:
   - Review logs for specific errors
   - Check environment variable configuration
   - Verify campaign and inventory setup
   - Consult troubleshooting guides

---

## Related Documentation

- [Twilio SMS Migration Guide](./TWILIO_SMS_MIGRATION_GUIDE.md)
- [Gift Card Provisioning Troubleshooting](./GIFT_CARD_PROVISIONING_TROUBLESHOOTING.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY_TWILIO_AND_GIFT_CARDS.md)


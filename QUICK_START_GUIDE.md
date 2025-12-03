# Quick Start Guide - Gift Card Provisioning & Twilio SMS

## 🚀 Get Your System Working in 5 Steps

### Step 1: Set Environment Variables (5 minutes)

Go to **Supabase Dashboard → Settings → Edge Functions → Secrets**

Add these three secrets:

```
Name: TWILIO_ACCOUNT_SID
Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Name: TWILIO_AUTH_TOKEN  
Value: your_auth_token_here

Name: TWILIO_FROM_NUMBER
Value: +15551234567
```

Get these from: https://console.twilio.com

---

### Step 2: Deploy Functions (2 minutes)

```bash
cd /path/to/mobul
supabase functions deploy send-sms-opt-in
supabase functions deploy send-gift-card-sms
supabase functions deploy provision-gift-card-for-call-center
supabase functions deploy validate-environment
```

---

### Step 3: Validate Setup (1 minute)

```bash
# Check if everything is configured correctly
curl https://YOUR_PROJECT.supabase.co/functions/v1/validate-environment \
  -H "Authorization: Bearer YOUR_ANON_KEY" | jq '.summary'
```

**Look for:**
```json
{
  "errors": 0,
  "healthy": true
}
```

If errors > 0, fix missing environment variables.

---

### Step 4: Configure Campaign Gift Cards (3 minutes)

1. Go to **Campaigns** → Select "spring 26" (or your campaign)
2. Click **Edit Campaign**
3. Click **"Conditions" tab**
4. For "Condition 1: Listened to sales call":
   - Set **Brand**: Amazon (or any brand)
   - Set **Card Value**: 25 (or desired amount)
5. Click **Save**

---

### Step 5: Upload Test Gift Card Inventory (5 minutes)

#### Option A: Quick Test (Recommended)

1. Create file `test_cards.csv`:

```csv
card_code,card_number,expiration_date
TEST001,1111222233334444,2025-12-31
TEST002,1111222233334445,2025-12-31
TEST003,1111222233334446,2025-12-31
TEST004,1111222233334447,2025-12-31
TEST005,1111222233334448,2025-12-31
```

2. Go to **Settings → Gift Cards**
3. Click **"Upload Cards"**
4. Select:
   - Brand: Match what you set in campaign (e.g., Amazon)
   - Value: Match what you set in campaign (e.g., $25)
5. Upload `test_cards.csv`
6. Verify: Should show "5 cards available"

#### Option B: Use Tillo API (Production)

1. Get Tillo credentials from Tillo dashboard
2. Go to **Supabase → Settings → Edge Functions → Secrets**
3. Add:
   ```
   TILLO_API_KEY = your_api_key
   TILLO_SECRET_KEY = your_secret_key
   ```
4. Go to **Settings → Gift Cards → Brands**
5. Edit your brand, add `tillo_brand_code`
6. System will auto-provision when inventory is empty

---

## ✅ You're Ready! Test It Now

### Test the Complete Flow

1. **Open Call Center**:
   - Go to `http://localhost:8080/call-center`
   - Click "Redemption Center" tab

2. **Look Up Customer**:
   - Enter code: `AB6-1061`
   - Click "Look Up"

3. **Send Opt-In**:
   - Enter YOUR cell phone number
   - Click "Send Opt-In SMS"
   - Check your phone for SMS

4. **Reply YES**:
   - Reply "YES" to the SMS
   - Wait for green checkmark

5. **Provision Gift Card**:
   - Click "Continue to Delivery"
   - Click "Continue"
   - Select condition
   - Click "Provision Gift Card"
   - Check your phone for gift card SMS

6. **Success!** 🎉
   - You should see the gift card details
   - Code, value, and brand displayed
   - SMS delivered to your phone

---

## 🐛 If Something Goes Wrong

### Error: "SMS service not configured"

**Fix:** Go back to Step 1, set Twilio environment variables

### Error: "No gift card configured"

**Fix:** Go back to Step 4, set brand and value in campaign condition

### Error: "400 Bad Request" when provisioning

**Most common causes:**

1. **No inventory and no Tillo**
   - **Fix:** Go to Step 5, upload test cards OR configure Tillo

2. **Campaign condition missing brand/value**
   - **Fix:** Edit campaign → Conditions tab → Set brand and value

3. **Twilio not configured**
   - **Fix:** Set Twilio environment variables in Supabase

### Check Logs for Details

```bash
# See what went wrong
supabase functions logs provision-gift-card-for-call-center --tail
supabase functions logs send-sms-opt-in --tail
supabase functions logs send-gift-card-sms --tail
```

---

## 📚 Need More Help?

### Detailed Guides

- **[Testing Guide](./TEST_GIFT_CARD_FLOW.md)** - Step-by-step testing procedures
- **[Troubleshooting](./GIFT_CARD_PROVISIONING_TROUBLESHOOTING.md)** - Fix common errors
- **[Twilio Migration](./TWILIO_SMS_MIGRATION_GUIDE.md)** - Complete migration guide
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY_TWILIO_AND_GIFT_CARDS.md)** - What changed

### Quick SQL Checks

```sql
-- Check if campaign has gift card configured
SELECT 
  c.campaign_name,
  cc.condition_name,
  gb.brand_name,
  cc.card_value
FROM campaigns c
JOIN campaign_conditions cc ON cc.campaign_id = c.id
LEFT JOIN gift_card_brands gb ON gb.id = cc.brand_id
WHERE c.campaign_name = 'spring 26';

-- Check if you have inventory
SELECT 
  pool_name,
  card_value,
  provider,
  available_cards
FROM gift_card_pools
WHERE available_cards > 0;

-- Check Twilio message log
SELECT * FROM sms_delivery_log 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🎯 Summary

**What You Just Did:**

1. ✅ Configured Twilio for SMS
2. ✅ Deployed updated edge functions
3. ✅ Configured campaign with gift card
4. ✅ Added gift card inventory
5. ✅ Tested complete provisioning flow

**What Changed:**

- SMS now uses Twilio (instead of EZ Texting)
- Better error messages
- Comprehensive troubleshooting guides
- Environment validation tools

**Next Steps:**

- Train call center staff on new flow
- Monitor Twilio usage in console
- Add more gift card inventory as needed
- Consider configuring Tillo for auto-provisioning

---

## 💡 Pro Tips

1. **Use test cards for training**: Upload test cards with obvious codes like TEST001, TEST002
2. **Monitor inventory**: Set alerts when inventory drops below 10 cards
3. **Check Twilio Console**: Monitor SMS delivery rates and costs
4. **Use validation tool**: Run regularly to catch configuration issues early

---

*Context improved by Giga AI - used information from: Call Center Operations, Gift Card Provisioning Pipeline, Campaign Management System, and SMS Opt-In Compliance.*


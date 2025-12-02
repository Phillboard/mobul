# Environment Variables Configuration for Mike Demo

This document outlines the required environment variables for the complete Mike call demo flow.

## Required Edge Function Environment Variables

### Twilio Configuration (SMS Functionality)

These are required for SMS opt-in and gift card delivery notifications:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**How to configure:**
1. Log into Supabase Dashboard
2. Navigate to: Project Settings → Edge Functions → Environment Variables
3. Add the three variables above with your Twilio credentials

**Where these are used:**
- `send-sms-opt-in` - Sends opt-in request to customer
- `handle-sms-response` - Processes "YES" responses
- `approve-customer-code` - Sends redemption link after approval
- `send-gift-card-sms` - Backup/manual gift card delivery

### Public App URL

Required for generating correct redemption links in SMS messages:

```bash
PUBLIC_APP_URL=https://your-app.lovable.app
```

**Default fallback:** If not set, will use `SUPABASE_URL` with `.supabase.co` replaced by `.lovable.app`

**How to configure:**
1. Supabase Dashboard → Project Settings → Edge Functions → Environment Variables
2. Add `PUBLIC_APP_URL` with your production app URL

**Where used:**
- `approve-customer-code` - Generates redemption URL: `${PUBLIC_APP_URL}/redeem-gift-card?code=XXX&campaign=YYY`

## Verification Checklist

### 1. Verify Twilio Credentials

```bash
# Test if credentials are set (run in Supabase SQL Editor or via psql)
SELECT 
  CASE 
    WHEN current_setting('app.settings.twilio_account_sid', true) IS NOT NULL 
    THEN 'Twilio Account SID: ✅ Configured'
    ELSE 'Twilio Account SID: ❌ Missing'
  END;
```

### 2. Test Twilio Connection

Create a test edge function invocation:

```typescript
// Test via Supabase Dashboard → Edge Functions → send-sms-opt-in
{
  "recipient_id": "test-recipient-id",
  "campaign_id": "test-campaign-id",
  "call_session_id": null,
  "phone": "+15555551234",
  "client_name": "Test Company"
}
```

**Expected result:** SMS sent successfully with message SID returned

### 3. Verify PUBLIC_APP_URL

```bash
# Check if set correctly
echo $PUBLIC_APP_URL
# Should output: https://your-app.lovable.app
```

### 4. Test Complete SMS Flow

1. **Set up test recipient:**
   ```sql
   INSERT INTO recipients (
     audience_id, 
     redemption_code, 
     first_name, 
     last_name, 
     address1, 
     city, 
     state, 
     zip,
     approval_status
   ) VALUES (
     'your-audience-id',
     'TEST1234',
     'Test',
     'User',
     '123 Test St',
     'Test City',
     'CA',
     '90210',
     'pending'
   );
   ```

2. **Trigger opt-in SMS:** Use call center UI to enter code TEST1234 and send opt-in

3. **Approve code:** After opt-in, approve via call center UI

4. **Verify SMS link:** Check that SMS contains correct URL format:
   ```
   https://your-app.lovable.app/redeem-gift-card?code=TEST1234&campaign=xxx
   ```

## Troubleshooting

### SMS Not Sending

**Problem:** Twilio API returns error

**Check:**
- Verify all three Twilio env vars are set
- Confirm Twilio account has sufficient balance
- Check phone number format (must be E.164: +1XXXXXXXXXX)
- Verify Twilio phone number is SMS-capable

### Wrong Redemption URL

**Problem:** SMS link points to wrong domain

**Check:**
- Verify `PUBLIC_APP_URL` is set correctly
- Redeploy edge functions after setting env vars
- Check edge function logs for actual URL being generated

### Permission Denied on Call Center Page

**Problem:** User cannot access `/call-center` route

**Fix:** Run the permission migration:
```bash
cd supabase
supabase db push
# Or apply specific migration:
psql $DATABASE_URL < migrations/20251203000010_fix_call_center_permissions.sql
```

## Mike Demo Pre-Flight Check

Before the Mike call on Wednesday, verify:

- [ ] Twilio credentials configured and tested
- [ ] PUBLIC_APP_URL set to production domain
- [ ] Test SMS sent successfully
- [ ] Redemption link opens correct page
- [ ] Call center page accessible
- [ ] Test campaign created with codes
- [ ] Test gift card in inventory ($5-25 for demo)
- [ ] Complete flow tested end-to-end

## Production Deployment

### Edge Function Deployment

After setting environment variables, redeploy all affected edge functions:

```bash
supabase functions deploy send-sms-opt-in
supabase functions deploy handle-sms-response
supabase functions deploy approve-customer-code
supabase functions deploy redeem-customer-code
supabase functions deploy send-gift-card-sms
```

### Database Migration

Apply the permissions fix:

```bash
supabase db push
# Or specific file:
supabase db push --file supabase/migrations/20251203000010_fix_call_center_permissions.sql
```

## Support Resources

- **Twilio Console:** https://console.twilio.com
- **Twilio SMS Logs:** Console → Monitor → Logs → Programmable Messaging
- **Supabase Edge Functions:** Project → Edge Functions → Logs
- **Database Logs:** Project → Logs → Postgres Logs

## Emergency Contacts

If issues during Mike demo:
1. Check Twilio console for SMS delivery status
2. Check Supabase edge function logs
3. Verify environment variables in Supabase dashboard
4. Test redemption URL manually in browser


# SMS Delivery Troubleshooting

## Overview

Guide for diagnosing and fixing SMS delivery issues across the three-provider architecture (NotificationAPI → Infobip → Twilio).

---

## SMS Provider Architecture

The system uses a three-tier fallback chain:

```
NotificationAPI (Primary)
    ↓ on failure
Infobip (Fallback 1)
    ↓ on failure
Twilio (Fallback 2)
```

---

## Common SMS Issues

### Issue: "SMS service not configured"

**Cause:** Environment variables not set

**Solution:**
1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Add required variables for at least one provider:

**For Twilio (Recommended for Start):**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+15551234567
```

**For NotificationAPI:**
```
NOTIFICATIONAPI_CLIENT_ID=your_client_id
NOTIFICATIONAPI_CLIENT_SECRET=your_client_secret
```

**For Infobip:**
```
INFOBIP_API_KEY=your_api_key
INFOBIP_SENDER_ID=YourSenderName
```

### Issue: SMS sent but not received

**Debugging Steps:**

1. **Check Twilio Console** (if using Twilio)
   - Go to https://console.twilio.com → Messaging → Logs
   - Look for your message
   - Check delivery status

2. **Check Database Logs:**
   ```sql
   SELECT 
     phone_number,
     delivery_status,
     provider_used,
     error_message,
     created_at
   FROM sms_delivery_log
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **Verify Phone Number Format:**
   - Must be E.164 format: `+15551234567`
   - Include country code ("+1" for US)
   - No spaces, dashes, or parentheses

4. **Check for Carrier Blocks:**
   - Some carriers block automated messages
   - Try different phone number
   - Check if number is on do-not-disturb list

### Issue: "All providers failed"

**Cause:** All three SMS providers failed to send

**Solution:**
1. Check all provider credentials are correct
2. Verify phone number format (E.164: +15551234567)
3. Check provider account status and balance
4. Review logs for specific error messages:
   ```bash
   supabase functions logs send-sms-opt-in --tail
   supabase functions logs send-gift-card-sms --tail
   ```

### Issue: Wrong provider being used

**Check Current Provider Settings:**
```sql
SELECT * FROM get_sms_provider_settings();
```

**Change Primary Provider:**
```sql
-- Set Twilio as primary
SELECT update_sms_provider_settings(
  p_primary_provider := 'twilio',
  p_fallback_provider_1 := 'notificationapi',
  p_fallback_provider_2 := 'infobip'
);

-- Set NotificationAPI as primary
SELECT update_sms_provider_settings(
  p_primary_provider := 'notificationapi',
  p_fallback_provider_1 := 'infobip',
  p_fallback_provider_2 := 'twilio'
);
```

---

## Provider-Specific Troubleshooting

### Twilio Errors

**Error: "Twilio API error: 21211"**
- **Cause:** Invalid "To" phone number
- **Solution:** Ensure phone is E.164 format and valid mobile number

**Error: "Twilio API error: 21606"**
- **Cause:** The "From" number is not a Twilio number you own
- **Solution:** Verify `TWILIO_FROM_NUMBER` matches a number in your Twilio account

**Error: "Twilio API error: 21408"**
- **Cause:** Permission denied (account suspended or insufficient funds)
- **Solution:** Check Twilio account status and balance

### NotificationAPI Errors

**Error: "NOTIFICATIONAPI_CLIENT_ID environment variable is required"**
- **Cause:** Credentials not set
- **Solution:** Add client ID and secret to Supabase secrets

**Error: "NotificationAPI API error: 401"**
- **Cause:** Invalid credentials
- **Solution:** Verify client ID and secret in NotificationAPI dashboard

### Infobip Errors

**Error: "INFOBIP_API_KEY environment variable is required"**
- **Cause:** API key not set
- **Solution:** Add API key to Supabase secrets

**Error:** "Infobip API error: 401"**
- **Cause:** Invalid API key
- **Solution:** Regenerate key in Infobip dashboard

---

## Monitoring SMS Delivery

### Real-Time Logs

```bash
# SMS Opt-In
supabase functions logs send-sms-opt-in --tail

# Gift Card SMS
supabase functions logs send-gift-card-sms --tail

# SMS Response Handler
supabase functions logs handle-sms-response --tail
```

### SMS Delivery Statistics

```sql
-- Delivery rate by provider (last 7 days)
SELECT 
  provider_used,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE delivery_status = 'sent') as delivered,
  COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed,
  ROUND(COUNT(*) FILTER (WHERE delivery_status = 'sent')::NUMERIC / COUNT(*) * 100, 2) as success_rate
FROM sms_delivery_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider_used;

-- Recent failures with details
SELECT 
  phone_number,
  provider_used,
  error_message,
  created_at
FROM sms_delivery_log
WHERE delivery_status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

### Fallback Chain Analysis

```sql
-- See when fallback was triggered
SELECT 
  DATE(created_at) as date,
  provider_used,
  COUNT(*) as count
FROM sms_delivery_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), provider_used
ORDER BY date DESC, count DESC;
```

---

## Testing SMS Providers

### Test Twilio Directly

```bash
curl -X POST 'https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json' \
  --data-urlencode "To=+15551234567" \
  --data-urlencode "From=+15559876543" \
  --data-urlencode "Body=Test message from Mobul ACE" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

### Test via Edge Function

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-sms-opt-in' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recipientId": "test-uuid",
    "phone": "+15551234567",
    "campaignId": "test-uuid"
  }'
```

---

## Provider Configuration Database

### View Current Settings

```sql
SELECT * FROM sms_provider_settings;
```

### Update Settings

```sql
-- Enable fallback
SELECT update_sms_provider_settings(
  p_enable_fallback := true,
  p_fallback_on_error := true
);

-- Disable a provider
SELECT update_sms_provider_settings(
  p_twilio_enabled := false
);

-- Change provider order
SELECT update_sms_provider_settings(
  p_primary_provider := 'twilio',
  p_fallback_provider_1 := 'infobip',
  p_fallback_provider_2 := 'notificationapi'
);
```

---

## Emergency Procedures

### All SMS Failing - Immediate Actions

1. **Check Provider Status Pages:**
   - Twilio: https://status.twilio.com
   - Infobip: https://status.infobip.com
   - NotificationAPI: Check their status page

2. **Switch to Working Provider:**
   ```sql
   -- If Twilio is working
   SELECT update_sms_provider_settings(
     p_primary_provider := 'twilio',
     p_enable_fallback := false
   );
   ```

3. **Enable Email Fallback:**
   - Temporarily deliver gift cards via email
   - Update edge functions to use email if SMS fails

4. **Contact Support:**
   - Notify team of SMS outage
   - Provide error logs
   - Escalate to provider support

---

## Best Practices

1. **Always configure at least 2 providers** for redundancy
2. **Monitor delivery rates daily** - set up alerts for < 95%
3. **Test SMS delivery** after any provider configuration change
4. **Keep provider credentials secure** - rotate regularly
5. **Use E.164 format** for all phone numbers
6. **Monitor costs** - SMS can get expensive at scale
7. **Respect opt-out requests** - check "STOP" responses

---

## Related Documentation

- [Twilio Migration Guide](../../TWILIO_SMS_MIGRATION_GUIDE.md)
- [Call Center Guide](../6-USER-GUIDES/CALL_CENTER_GUIDE.md)
- [Edge Functions API](../5-API-REFERENCE/EDGE_FUNCTIONS.md)

---

**Last Updated:** December 4, 2024

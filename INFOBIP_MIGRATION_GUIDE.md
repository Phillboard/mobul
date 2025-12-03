# Infobip SMS Configuration Guide

## Overview

This guide documents the Infobip SMS configuration for the Mobul ACE platform. Infobip serves as the **first fallback SMS provider** in the provider chain.

> **Note:** As of December 2025, the system uses a three-provider architecture:
> - **Primary Provider**: NotificationAPI (see [NOTIFICATIONAPI_MIGRATION_GUIDE.md](./NOTIFICATIONAPI_MIGRATION_GUIDE.md))
> - **Fallback 1**: Infobip (this guide)
> - **Fallback 2**: Twilio (see [TWILIO_SMS_MIGRATION_GUIDE.md](./TWILIO_SMS_MIGRATION_GUIDE.md))

## Architecture

The SMS system uses a provider abstraction layer with the following fallback chain:

```
NotificationAPI (Primary)
    ↓ on failure
Infobip (Fallback 1)
    ↓ on failure
Twilio (Fallback 2)
```

## Infobip as Fallback Provider

Infobip is configured as the first fallback SMS provider. When NotificationAPI fails (API errors, rate limits, etc.), the system automatically falls back to Infobip.

### Benefits of Infobip
- **Reliability**: Enterprise-grade SMS infrastructure
- **Global Coverage**: Excellent international SMS delivery
- **Cost Effective**: Competitive per-message pricing
- **Rich Features**: Delivery reports, analytics, and more

## Required Environment Variables

Configure these in Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
INFOBIP_API_KEY=your_api_key_here
INFOBIP_BASE_URL=https://api.infobip.com  # Optional
INFOBIP_SENDER_ID=YourSenderName
```

### How to Get Infobip Credentials

1. Sign up at [Infobip](https://www.infobip.com)
2. Go to your Infobip Dashboard
3. Navigate to **API Keys** section
4. Create a new API key with SMS permissions
5. Note your:
   - **API Key**: Your authentication key
   - **Base URL**: Usually `https://api.infobip.com` (may vary by region)
   - **Sender ID**: Your registered sender name or phone number

## Provider Settings

### View Current Settings

```sql
SELECT * FROM get_sms_provider_settings();
```

### Make Infobip the Primary Provider

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'infobip',
  p_fallback_provider_1 := 'notificationapi',
  p_fallback_provider_2 := 'twilio'
);
```

### Keep Infobip as Fallback 1 (Default)

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'notificationapi',
  p_fallback_provider_1 := 'infobip',
  p_fallback_provider_2 := 'twilio'
);
```

### Disable Infobip

```sql
SELECT update_sms_provider_settings(
  p_infobip_enabled := false
);
```

### Update Infobip Sender ID

```sql
SELECT update_sms_provider_settings(
  p_infobip_sender_id := 'NewSenderName'
);
```

## API Response Format

### Infobip SMS API

**Endpoint:** `POST /sms/2/text/advanced`

**Request:**
```json
{
  "messages": [{
    "from": "SenderID",
    "destinations": [{"to": "+15551234567"}],
    "text": "Your message here"
  }]
}
```

**Response:**
```json
{
  "messages": [{
    "messageId": "abc123",
    "status": {
      "groupId": 1,
      "groupName": "PENDING",
      "id": 7,
      "name": "PENDING_ENROUTE",
      "description": "Message sent to next instance"
    },
    "to": "+15551234567"
  }]
}
```

### Status Codes

| Group ID | Group Name | Meaning |
|----------|------------|---------|
| 1 | PENDING | Message is being processed |
| 2 | UNDELIVERABLE | Message cannot be delivered |
| 3 | DELIVERED | Message was delivered |
| 4 | EXPIRED | Message expired |
| 5 | REJECTED | Message was rejected |

## Testing Infobip

### Test as Fallback

1. Temporarily set invalid NotificationAPI credentials
2. Send a test SMS
3. Check logs for `[SMS-PROVIDER] Fallback infobip succeeded`
4. Restore valid NotificationAPI credentials

### Test as Primary

1. Set Infobip as primary: `SELECT update_sms_provider_settings(p_primary_provider := 'infobip');`
2. Send a test SMS
3. Check logs for `[INFOBIP] SMS sent successfully`
4. Reset to NotificationAPI if desired

## Monitoring & Logging

### View SMS Delivery Logs

```sql
-- Recent SMS deliveries with provider info
SELECT 
  sdl.id,
  sdl.phone_number,
  sdl.delivery_status,
  sdl.provider_used,
  sdl.twilio_message_sid as message_id,
  sdl.created_at
FROM sms_delivery_log sdl
WHERE sdl.provider_used = 'infobip'
ORDER BY sdl.created_at DESC
LIMIT 20;
```

### SMS Opt-In Logs

```sql
-- Recent opt-in SMS with provider info
SELECT 
  sol.id,
  sol.phone,
  sol.status,
  sol.provider_used,
  sol.message_sid,
  sol.created_at
FROM sms_opt_in_log sol
WHERE sol.provider_used = 'infobip'
ORDER BY sol.created_at DESC
LIMIT 20;
```

### Provider Usage Statistics

```sql
-- SMS count by provider (last 7 days)
SELECT 
  provider_used,
  COUNT(*) as message_count
FROM sms_delivery_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider_used;
```

### Failed SMS Analysis

```sql
-- Failed SMS with error details
SELECT 
  phone_number,
  provider_used,
  error_message,
  created_at
FROM sms_delivery_log
WHERE delivery_status = 'failed'
  AND provider_used = 'infobip'
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### Error: "INFOBIP_API_KEY environment variable is required"

**Cause:** Infobip API key not set

**Solution:**
1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Add `INFOBIP_API_KEY` with your API key value
3. Redeploy functions

### Error: "Infobip API error: 401"

**Cause:** Invalid API key

**Solution:**
1. Verify your API key in Infobip dashboard
2. Regenerate if necessary
3. Update the environment variable

### Error: "All providers failed"

**Cause:** NotificationAPI, Infobip, and Twilio all failed to send

**Solution:**
1. Check all provider credentials
2. Verify phone number format (must be E.164: +15551234567)
3. Check provider account status and balance
4. Review logs for specific error messages

### SMS Sent But Not Received

**Debugging steps:**
1. Check Infobip dashboard for delivery reports
2. Verify sender ID is approved for destination country
3. Check for carrier blocks or spam filters
4. Try different phone number for testing

## Cost Comparison

### Infobip
- Competitive per-message pricing
- Volume discounts available
- Regional pricing varies
- No monthly minimum

### When Infobip is Used
- NotificationAPI API is down
- NotificationAPI returns an error
- NotificationAPI rate limit exceeded
- NotificationAPI credentials invalid

## Files Reference

### Infobip Client Library
- `supabase/functions/_shared/infobip-client.ts`

### SMS Provider Abstraction
- `supabase/functions/_shared/sms-provider.ts`

### Functions Using SMS
- `supabase/functions/send-gift-card-sms/index.ts`
- `supabase/functions/send-sms-opt-in/index.ts`

## Database Tables

### SMS Delivery Log
```sql
-- Provider tracking column
ALTER TABLE sms_delivery_log 
ADD COLUMN provider_used TEXT CHECK (provider_used IN ('notificationapi', 'infobip', 'twilio'));
```

### SMS Opt-In Log
```sql
-- Provider tracking column
ALTER TABLE sms_opt_in_log 
ADD COLUMN provider_used TEXT CHECK (provider_used IN ('notificationapi', 'infobip', 'twilio'));
```

## Migration History

### Original: EZ Texting
- Deprecated December 2025
- Replaced by Twilio

### December 2025: Twilio
- Became primary SMS provider
- Full integration with call tracking

### December 2025: Infobip + Twilio
- Infobip became primary provider
- Twilio became fallback provider
- Dual-provider architecture implemented

### December 2025: NotificationAPI + Infobip + Twilio
- NotificationAPI became primary provider
- Infobip became fallback 1
- Twilio became fallback 2
- Three-provider architecture implemented

## Related Documentation

- [NotificationAPI Migration Guide](./NOTIFICATIONAPI_MIGRATION_GUIDE.md) - Primary SMS provider
- [Twilio SMS Configuration Guide](./TWILIO_SMS_MIGRATION_GUIDE.md) - Fallback 2 provider
- [Gift Card Provisioning Troubleshooting](./GIFT_CARD_PROVISIONING_TROUBLESHOOTING.md)
- [Infobip SMS API](https://www.infobip.com/docs/api/channels/sms)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Support Resources

- [Infobip Documentation](https://www.infobip.com/docs/api)
- [Infobip SMS API Reference](https://www.infobip.com/docs/api/channels/sms)
- [Infobip Support](https://www.infobip.com/contact)

## Migration Checklist

- [ ] Infobip account created
- [ ] API key generated with SMS permissions
- [ ] Sender ID registered/approved
- [ ] Environment variables set in Supabase
- [ ] Database migration applied
- [ ] Edge functions deployed
- [ ] Validation endpoint returns healthy
- [ ] Test SMS sent successfully via Infobip
- [ ] Fallback tested by simulating NotificationAPI failure
- [ ] Monitoring dashboards set up
- [ ] Team trained on new provider settings

# Infobip SMS Integration Guide

## Overview

This guide documents the integration of Infobip as the primary SMS provider for the Mobul ACE platform, with Twilio as a configurable fallback option.

## Architecture

The system now uses a unified SMS provider abstraction layer that supports:

- **Infobip** - Primary SMS provider (recommended)
- **Twilio** - Fallback SMS provider (optional)

The provider selection is configured globally through the `sms_provider_settings` database table.

## Key Features

- **Automatic Fallback**: If Infobip fails, the system automatically tries Twilio
- **Configurable**: Admins can switch providers or disable fallback via database settings
- **Logging**: Each SMS logs which provider was used for analytics
- **Cost Effective**: Infobip often offers better rates than Twilio

## Setup Instructions

### Step 1: Get Infobip API Credentials

1. Sign up at [Infobip](https://www.infobip.com)
2. Go to your Infobip Dashboard
3. Navigate to **API Keys** section
4. Create a new API key with SMS permissions
5. Note your:
   - **API Key**: Your authentication key
   - **Base URL**: Usually `https://api.infobip.com` (may vary by region)
   - **Sender ID**: Your registered sender name or phone number

### Step 2: Set Environment Variables

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```
INFOBIP_API_KEY = your_infobip_api_key_here
INFOBIP_BASE_URL = https://api.infobip.com
INFOBIP_SENDER_ID = YourSenderName
```

**Note:** `INFOBIP_BASE_URL` is optional and defaults to `https://api.infobip.com`

### Step 3: Run Database Migration

Apply the SMS provider settings migration:

```sql
-- The migration creates:
-- 1. sms_provider_settings table with default Infobip as primary
-- 2. Helper functions for viewing/updating settings
-- 3. Adds provider_used column to SMS log tables
```

### Step 4: Deploy Updated Functions

```bash
supabase functions deploy send-gift-card-sms
supabase functions deploy send-sms-opt-in
supabase functions deploy validate-environment
```

### Step 5: Verify Configuration

Call the validation endpoint:

```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/validate-environment \
  -H "Authorization: Bearer YOUR_ANON_KEY" | jq
```

Expected output:
```json
{
  "success": true,
  "smsProvider": {
    "activeProvider": "infobip",
    "primaryProvider": "infobip",
    "fallbackEnabled": true,
    "infobipAvailable": true,
    "twilioAvailable": true
  }
}
```

## Managing SMS Provider Settings

### View Current Settings

```sql
SELECT * FROM get_sms_provider_settings();
```

### Switch to Twilio as Primary

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'twilio'
);
```

### Switch Back to Infobip as Primary

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'infobip'
);
```

### Disable Fallback

```sql
SELECT update_sms_provider_settings(
  p_enable_fallback := false
);
```

### Update Infobip Sender ID

```sql
SELECT update_sms_provider_settings(
  p_infobip_sender_id := 'NewSenderName'
);
```

### View All Settings Directly

```sql
SELECT 
  primary_provider,
  enable_fallback,
  infobip_enabled,
  infobip_base_url,
  infobip_sender_id,
  twilio_enabled,
  fallback_on_error,
  updated_at
FROM sms_provider_settings;
```

## Environment Variables Reference

### Required for Infobip (Primary)

| Variable | Description | Example |
|----------|-------------|---------|
| `INFOBIP_API_KEY` | Your Infobip API key | `abc123...` |
| `INFOBIP_BASE_URL` | API base URL (optional) | `https://api.infobip.com` |
| `INFOBIP_SENDER_ID` | Sender name/number | `MyCompany` |

### Required for Twilio (Fallback)

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxx...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `xxx...` |
| `TWILIO_FROM_NUMBER` | Twilio phone number | `+15551234567` |

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

### Error: "Both providers failed"

**Cause:** Both Infobip and Twilio failed to send

**Solution:**
1. Check both provider credentials
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

### Twilio
- $0.0079 per SMS (US)
- Volume discounts available
- Monthly phone number costs
- Carrier lookup fees

## Best Practices

1. **Always configure both providers** for reliability
2. **Enable fallback** for production environments
3. **Monitor provider usage** to optimize costs
4. **Test with both providers** before going live
5. **Set up alerts** for high failure rates

## Files Reference

### New Files Created

- `supabase/functions/_shared/infobip-client.ts` - Infobip client library
- `supabase/functions/_shared/sms-provider.ts` - Provider abstraction layer
- `supabase/migrations/[timestamp]_add_sms_provider_settings.sql` - Database migration

### Files Modified

- `supabase/functions/send-gift-card-sms/index.ts` - Uses SMS provider abstraction
- `supabase/functions/send-sms-opt-in/index.ts` - Uses SMS provider abstraction
- `supabase/functions/validate-environment/index.ts` - Validates Infobip credentials

## Support Resources

- [Infobip Documentation](https://www.infobip.com/docs/api)
- [Infobip SMS API Reference](https://www.infobip.com/docs/api/channels/sms)
- [Infobip Support](https://www.infobip.com/contact)
- [Twilio Documentation](https://www.twilio.com/docs/sms)

## Migration Checklist

- [ ] Infobip account created
- [ ] API key generated with SMS permissions
- [ ] Sender ID registered/approved
- [ ] Environment variables set in Supabase
- [ ] Database migration applied
- [ ] Edge functions deployed
- [ ] Validation endpoint returns healthy
- [ ] Test SMS sent successfully via Infobip
- [ ] Twilio configured as fallback (optional but recommended)
- [ ] Fallback tested by simulating Infobip failure
- [ ] Monitoring dashboards set up
- [ ] Team trained on new provider settings


# Twilio SMS Configuration Guide

## Overview

This guide documents the Twilio SMS configuration for the Mobul ACE platform. Twilio serves as the **fallback SMS provider** with Infobip as the primary provider.

> **Note:** As of December 2025, the system uses a dual-provider architecture:
> - **Primary Provider**: Infobip (see [INFOBIP_MIGRATION_GUIDE.md](./INFOBIP_MIGRATION_GUIDE.md))
> - **Fallback Provider**: Twilio (this guide)

## Architecture

The SMS system uses a provider abstraction layer that:
1. Tries the primary provider (Infobip) first
2. If Infobip fails and fallback is enabled, tries Twilio
3. Logs which provider was used for each message

## Twilio as Fallback Provider

Twilio is configured as the fallback SMS provider. When Infobip fails (API errors, rate limits, etc.), the system automatically falls back to Twilio.

### Benefits of Fallback
- **Reliability**: Messages still send even if primary provider is down
- **Redundancy**: Two independent SMS providers
- **Flexibility**: Can switch primary/fallback via database settings

## Required Environment Variables

Configure these in Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+15551234567  # or TWILIO_PHONE_NUMBER
```

### How to Get Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com)
2. **Account SID**: Found on dashboard
3. **Auth Token**: Found on dashboard (click "Show" to reveal)
4. **From Number**: Purchase a phone number or use an existing one

## Provider Settings

### View Current Settings

```sql
SELECT * FROM get_sms_provider_settings();
```

### Make Twilio the Primary Provider

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'twilio'
);
```

### Make Infobip Primary (Default)

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'infobip'
);
```

### Disable Fallback (Twilio Only)

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'twilio',
  p_enable_fallback := false
);
```

### Enable Fallback

```sql
SELECT update_sms_provider_settings(
  p_enable_fallback := true,
  p_fallback_on_error := true
);
```

## Testing Twilio

### Test as Fallback

1. Temporarily set invalid Infobip credentials
2. Send a test SMS
3. Check logs for `[SMS-PROVIDER] Fallback twilio succeeded`
4. Restore valid Infobip credentials

### Test as Primary

1. Set Twilio as primary: `SELECT update_sms_provider_settings(p_primary_provider := 'twilio');`
2. Send a test SMS
3. Check logs for `[TWILIO] SMS sent successfully`
4. Reset to Infobip if desired

## Monitoring

### View SMS Logs with Provider Info

```sql
SELECT 
  phone_number,
  delivery_status,
  provider_used,
  twilio_message_sid,
  created_at
FROM sms_delivery_log
WHERE provider_used = 'twilio'
ORDER BY created_at DESC
LIMIT 20;
```

### Fallback Usage Statistics

```sql
-- Count of fallback vs primary usage (last 7 days)
SELECT 
  provider_used,
  COUNT(*) as message_count
FROM sms_delivery_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider_used;
```

## Troubleshooting

### Error: "SMS service not configured"

**Cause:** Environment variables not set

**Solution:**
1. Verify all three Twilio variables are set in Supabase
2. Ensure `TWILIO_FROM_NUMBER` includes the `+1` country code
3. Redeploy functions

### Error: "Twilio API error: 21211"

**Cause:** Invalid "To" phone number

**Solution:**
- Ensure phone numbers are in E.164 format (`+1XXXXXXXXXX`)
- Verify the number is a valid mobile number

### Error: "Twilio API error: 21606"

**Cause:** The "From" number is not a Twilio number you own

**Solution:**
1. Go to Twilio Console → Phone Numbers
2. Verify the number in `TWILIO_FROM_NUMBER` exists in your account
3. Purchase a new number if needed

### Error: "Both providers failed"

**Cause:** Both Infobip and Twilio failed

**Solution:**
1. Check both provider credentials
2. Verify phone number format
3. Check provider account status and balance
4. Review logs for specific error messages

## Cost Information

### Twilio Pricing
- $0.0079 per SMS (US)
- Volume discounts available
- Monthly phone number costs (~$1/month)
- Real-time delivery status

### When Twilio is Used (as Fallback)
- Infobip API is down
- Infobip returns an error
- Infobip rate limit exceeded
- Infobip credentials invalid

## Files Reference

### Twilio Client Library
- `supabase/functions/_shared/twilio-client.ts`

### SMS Provider Abstraction
- `supabase/functions/_shared/sms-provider.ts`

### Functions Using SMS
- `supabase/functions/send-gift-card-sms/index.ts`
- `supabase/functions/send-sms-opt-in/index.ts`

## Database Tables

### SMS Delivery Log
```sql
-- New column added for provider tracking
ALTER TABLE sms_delivery_log 
ADD COLUMN provider_used TEXT CHECK (provider_used IN ('infobip', 'twilio'));
```

### SMS Opt-In Log
```sql
-- New column added for provider tracking
ALTER TABLE sms_opt_in_log 
ADD COLUMN provider_used TEXT CHECK (provider_used IN ('infobip', 'twilio'));
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

## Related Documentation

- [Infobip Migration Guide](./INFOBIP_MIGRATION_GUIDE.md) - Primary SMS provider
- [Gift Card Provisioning Troubleshooting](./GIFT_CARD_PROVISIONING_TROUBLESHOOTING.md)
- [Twilio SMS API](https://www.twilio.com/docs/sms/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Support

- **Twilio API**: https://support.twilio.com
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Platform Issues**: Contact your system administrator

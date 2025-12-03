# NotificationAPI SMS Integration Guide

This guide covers the setup and configuration of NotificationAPI as the primary SMS provider for the gift card and notification system.

## Overview

NotificationAPI is now configured as the **primary SMS provider** with the following fallback chain:

```
NotificationAPI (Primary)
    ↓ on failure
Infobip (Fallback 1)
    ↓ on failure
Twilio (Fallback 2)
```

## Quick Start

### 1. Get NotificationAPI Credentials

1. Sign up at [NotificationAPI.com](https://www.notificationapi.com)
2. Create a new project or use an existing one
3. Navigate to **Settings** → **API Keys**
4. Copy your **Client ID** and **Client Secret**

### 2. Set Environment Variables

In your Supabase dashboard, go to **Settings** → **Edge Functions** → **Secrets** and add:

```bash
NOTIFICATIONAPI_CLIENT_ID=your_client_id_here
NOTIFICATIONAPI_CLIENT_SECRET=your_client_secret_here
NOTIFICATIONAPI_NOTIFICATION_ID=sms_direct  # Optional: template ID
```

### 3. Run Database Migration

The migration adds NotificationAPI support to the SMS provider settings:

```bash
supabase db push
```

Or apply the specific migration:

```sql
-- This is done automatically with the migration file
-- 20251203500001_add_notificationapi_provider.sql
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy send-gift-card-sms
supabase functions deploy send-sms-opt-in
supabase functions deploy validate-environment
```

### 5. Verify Configuration

```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/validate-environment
```

## Environment Variables

### Required for NotificationAPI

| Variable | Description | Required |
|----------|-------------|----------|
| `NOTIFICATIONAPI_CLIENT_ID` | Your NotificationAPI Client ID | Yes |
| `NOTIFICATIONAPI_CLIENT_SECRET` | Your NotificationAPI Client Secret | Yes |
| `NOTIFICATIONAPI_NOTIFICATION_ID` | SMS template ID (defaults to 'sms_direct') | No |

### Fallback Provider Variables

#### Infobip (Fallback 1)

| Variable | Description |
|----------|-------------|
| `INFOBIP_API_KEY` | Infobip API key |
| `INFOBIP_BASE_URL` | API base URL (default: https://api.infobip.com) |
| `INFOBIP_SENDER_ID` | Sender ID for SMS |

#### Twilio (Fallback 2)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Twilio phone number |

## Database Configuration

### View Current Settings

```sql
SELECT * FROM get_sms_provider_settings();
```

### Set NotificationAPI as Primary (Default)

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'notificationapi'
);
```

### Switch to Infobip as Primary

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'infobip',
  p_fallback_provider_1 := 'notificationapi',
  p_fallback_provider_2 := 'twilio'
);
```

### Switch to Twilio as Primary

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'twilio',
  p_fallback_provider_1 := 'notificationapi',
  p_fallback_provider_2 := 'infobip'
);
```

### Disable NotificationAPI

```sql
SELECT update_sms_provider_settings(
  p_notificationapi_enabled := false,
  p_primary_provider := 'infobip'
);
```

### Disable Fallback (Use Only Primary)

```sql
SELECT update_sms_provider_settings(
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

## NotificationAPI Setup

### Creating an SMS Notification Template

If you want to use a custom template instead of direct messaging:

1. Log in to NotificationAPI dashboard
2. Go to **Notifications** → **Create Notification**
3. Set up an SMS channel with your template
4. Use merge tags like `{{message}}` for dynamic content
5. Copy the notification ID and set it as `NOTIFICATIONAPI_NOTIFICATION_ID`

### Example Template

```
{{message}}
```

Or for a branded message:

```
{{company_name}}: {{message}}

Reply STOP to unsubscribe.
```

### Merge Tags Available

The system sends the following merge tags:

| Tag | Description |
|-----|-------------|
| `message` | The full SMS message content |
| `content` | Same as message (alias) |
| `body` | Same as message (alias) |
| `sms_body` | Same as message (alias) |

## How It Works

### Provider Selection Flow

```
1. Load settings from sms_provider_settings table
2. Check if primary provider (NotificationAPI) has credentials
3. If yes, attempt to send via NotificationAPI
4. If NotificationAPI fails and fallback is enabled:
   a. Try Infobip (if configured)
   b. If Infobip fails, try Twilio (if configured)
5. Log the provider used in sms_delivery_log
```

### API Request Format

NotificationAPI uses the following request format:

```json
POST https://api.notificationapi.com/{clientId}/sender

{
  "notificationId": "sms_direct",
  "user": {
    "id": "sms_15551234567_1701234567890",
    "number": "+15551234567"
  },
  "mergeTags": {
    "message": "Your gift card code is: XXXX-XXXX-XXXX"
  },
  "forceChannels": ["SMS"]
}
```

### Authentication

NotificationAPI uses Basic Authentication:

```
Authorization: Basic base64(clientId:clientSecret)
```

## Testing

### Test SMS Sending

1. Navigate to the Call Center panel in the application
2. Find a recipient with SMS opt-in
3. Trigger a gift card provision
4. Check the SMS delivery log for the provider used

### Verify Provider Status

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-environment \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Response will show:

```json
{
  "smsProvider": {
    "activeProvider": "notificationapi",
    "primaryProvider": "notificationapi",
    "fallbackEnabled": true,
    "fallbackChain": ["infobip", "twilio"],
    "notificationapiAvailable": true,
    "infobipAvailable": true,
    "twilioAvailable": true
  }
}
```

### Check SMS Delivery Logs

```sql
SELECT 
  id,
  recipient_phone,
  provider_used,
  status,
  created_at
FROM sms_delivery_log
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### NotificationAPI Not Working

1. **Check credentials:**
   ```sql
   -- Verify environment variables are set
   SELECT * FROM get_sms_provider_settings();
   ```

2. **Check logs:**
   ```bash
   supabase functions logs send-gift-card-sms
   ```

3. **Verify API access:**
   - Log in to NotificationAPI dashboard
   - Check API usage and errors

### Fallback Not Triggering

1. **Ensure fallback is enabled:**
   ```sql
   SELECT update_sms_provider_settings(
     p_enable_fallback := true,
     p_fallback_on_error := true
   );
   ```

2. **Check fallback provider credentials:**
   - Verify Infobip/Twilio environment variables are set

### SMS Not Delivered

1. **Check phone number format:**
   - Numbers should be E.164 format (+15551234567)
   - The system auto-formats US numbers

2. **Check NotificationAPI dashboard:**
   - View delivery reports
   - Check for carrier blocks

3. **Verify sender ID:**
   - Some countries require pre-registered sender IDs

### Provider Switching Issues

Clear the settings cache by redeploying:

```bash
supabase functions deploy send-gift-card-sms
supabase functions deploy send-sms-opt-in
```

## Migration from Infobip Primary

If you were previously using Infobip as primary:

1. Set NotificationAPI credentials
2. Run the database migration
3. The migration automatically sets NotificationAPI as primary
4. Infobip becomes fallback 1

To revert to Infobip as primary:

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'infobip',
  p_fallback_provider_1 := 'notificationapi',
  p_fallback_provider_2 := 'twilio'
);
```

## Rollback Plan

If NotificationAPI has issues, immediately switch to Infobip:

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'infobip',
  p_notificationapi_enabled := false
);
```

Or switch to Twilio:

```sql
SELECT update_sms_provider_settings(
  p_primary_provider := 'twilio',
  p_notificationapi_enabled := false,
  p_infobip_enabled := false
);
```

## Cost Considerations

- **NotificationAPI**: Check your plan's SMS pricing
- **Infobip**: Pay-as-you-go SMS pricing
- **Twilio**: Per-message pricing

Configure fallback order based on your cost preferences:

```sql
-- Example: Cheapest provider first
SELECT update_sms_provider_settings(
  p_primary_provider := 'notificationapi',
  p_fallback_provider_1 := 'twilio',
  p_fallback_provider_2 := 'infobip'
);
```

## Support

- **NotificationAPI Docs**: https://docs.notificationapi.com
- **NotificationAPI Support**: support@notificationapi.com
- **Infobip Docs**: https://www.infobip.com/docs
- **Twilio Docs**: https://www.twilio.com/docs


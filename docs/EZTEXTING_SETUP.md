# EZTexting SMS Provider Setup Guide

## Overview

EZTexting is now configured to use **Bearer Token (API Key) authentication** instead of the deprecated OAuth 2.0 username/password method.

## Getting Your API Key

1. **Log in to EZTexting**: Go to [https://www.eztexting.com](https://www.eztexting.com)
2. **Navigate to API Settings**: 
   - Click on your account name in the top right
   - Select "Settings" → "API"
3. **Generate API Key**:
   - Click "Create New API Key"
   - Give it a descriptive name (e.g., "Mobul Production")
   - Copy the API key immediately (you won't be able to see it again)

## Configuration

### Supabase Environment Variables

Add the following environment variable to your Supabase project:

```bash
EZTEXTING_API_KEY=your_api_key_here
```

Optional (defaults to `https://app.eztexting.com/api/v2`):
```bash
EZTEXTING_BASE_URL=https://app.eztexting.com/api/v2
```

### Setting the Environment Variable

#### Via Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secret: `EZTEXTING_API_KEY` with your API key value

#### Via Supabase CLI:
```bash
supabase secrets set EZTEXTING_API_KEY=your_api_key_here
```

## Database Configuration

Enable EZTexting in the SMS provider settings:

```sql
UPDATE sms_provider_settings
SET 
  eztexting_enabled = true,
  -- Optionally set as primary provider
  primary_provider = 'eztexting',
  -- Or set as fallback
  fallback_provider_3 = 'eztexting';
```

## Testing

### Via Admin UI

1. Navigate to `/admin/messaging-test`
2. Go to the **Provider Settings** tab
3. Set EZTexting as your primary provider or as a fallback
4. Go back to the **SMS Testing** tab
5. Send a test message

### Via Edge Function

```typescript
import { getEZTextingClient } from '../_shared/eztexting-client.ts';

const client = getEZTextingClient();
const result = await client.sendSMS('+12065551234', 'Test message');

if (result.success) {
  console.log('SMS sent!', result.messageId);
} else {
  console.error('Failed:', result.error);
}
```

## API Endpoints

The client uses the EZTexting REST API v2:

- **Base URL**: `https://app.eztexting.com/api/v2`
- **Send SMS**: `POST /sending/messages`
- **Get Status**: `GET /sending/messages/{id}`
- **Get Credits**: `GET /credits`
- **List Contacts**: `GET /contacts`
- **Create Contact**: `POST /contacts`

## Migration from Old Setup

If you were using the deprecated username/password method:

1. **Remove old env vars** (optional):
   ```bash
   # Old (deprecated)
   EZTEXTING_USERNAME
   EZTEXTING_PASSWORD
   ```

2. **Add new API key**:
   ```bash
   EZTEXTING_API_KEY=your_new_api_key
   ```

3. **Test the connection** using the Admin Messaging Test page

## Troubleshooting

### "Failed to get access token: 404"
✅ **FIXED** - This error occurred with the old OAuth implementation. The new Bearer token method doesn't use token endpoints.

### "401 Unauthorized"
- Check that your API key is correct
- Verify the API key is active in your EZTexting account
- Make sure you copied the entire key (they can be quite long)

### "API key not configured"
- Verify the `EZTEXTING_API_KEY` environment variable is set in Supabase
- After setting env vars, redeploy your edge functions:
  ```bash
  supabase functions deploy --no-verify-jwt
  ```

### Messages not sending
1. Check your EZTexting credit balance via the API:
   ```typescript
   const balance = await client.getCreditBalance();
   console.log(balance);
   ```

2. Verify the phone number format (should be 10 digits for US numbers)

3. Check the Supabase Edge Function logs for detailed error messages

## Provider Priority

Configure SMS provider priority in `/admin/messaging-test` → Provider Settings:

**Recommended Setup:**
- Primary: NotificationAPI or Twilio (most reliable)
- Fallback 1: Infobip
- Fallback 2: Twilio or EZTexting
- Fallback 3: EZTexting (cost-effective backup)

## Support

- **EZTexting API Docs**: https://www.eztexting.com/developers-v1
- **Mobul Support**: Contact your system administrator

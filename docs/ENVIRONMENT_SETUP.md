# Environment Setup Guide

Complete guide for configuring environment variables for Mobul platform.

---

## Overview

Mobul requires several environment variables for proper operation. This document lists all required and optional variables with descriptions and setup instructions.

---

## Required Environment Variables

### Supabase Configuration

```bash
# Supabase Project URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous (Public) Key
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Service Role Key (BACKEND ONLY - Never expose to client)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy URL and anon key

**Security Note:** Service role key should ONLY be in edge functions environment, never in frontend `.env` files.

---

### AI Integration (Gemini)

```bash
# Google Gemini API Key (for AI design features)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Setup:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy to environment

**Used for:**
- AI landing page generation
- AI design assistant
- Dr. Phillip chat assistant

---

### SMS Provider (Twilio)

```bash
# Twilio Account SID (Legacy - for environment variable fallback)
TWILIO_ACCOUNT_SID=your_account_sid

# Twilio Auth Token (Legacy - for environment variable fallback)
TWILIO_AUTH_TOKEN=your_auth_token

# Twilio Phone Number (Legacy - for environment variable fallback)
TWILIO_PHONE_NUMBER=+1234567890

# Twilio Encryption Key (required for hierarchical Twilio)
# Must be 32 bytes (64 hex characters) for AES-256-GCM encryption
TWILIO_ENCRYPTION_KEY=your_64_char_hex_key_here
```

**Setup:**
1. Sign up at [twilio.com](https://www.twilio.com)
2. Get Account SID and Auth Token from Console
3. Purchase a phone number

**Used for:**
- Gift card SMS delivery
- SMS opt-in requests
- Call tracking

#### Hierarchical Twilio Configuration

The platform supports hierarchical Twilio configuration, allowing different Twilio accounts at different levels:

1. **Client-level** - Individual clients can have their own Twilio account
2. **Agency-level** - Agency owners can configure a shared Twilio for all their clients
3. **Admin/Master-level** - Platform-wide fallback Twilio account
4. **Environment variables** - Final fallback (legacy)

Configure hierarchical Twilio via the UI:
- **Admin**: Settings → Twilio Configuration
- **Agency**: Settings → Phone Numbers
- **Client**: Settings → Phone Numbers

#### Twilio Webhook Configuration (REQUIRED)

For SMS opt-in responses (YES/STOP) to work, configure Twilio webhooks:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to: **Phone Numbers → Manage → Active Numbers**
3. Select your SMS-enabled phone number
4. Under **Messaging Configuration**:
   - **A MESSAGE COMES IN**: Webhook
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/handle-sms-response`
   - **HTTP Method**: POST

**Example Webhook URL:**
```
https://abcdefghijk.supabase.co/functions/v1/handle-sms-response
```

This webhook handles:
- Customer replies "YES" → Updates status to `opted_in`
- Customer replies "STOP" → Updates status to `opted_out`
- Real-time status updates to the Call Center dashboard

**Note:** Each Twilio phone number (at client, agency, or admin level) needs its own webhook configured to point to the same `handle-sms-response` function.

---

### Gift Card API (Tillo)

```bash
# Tillo API Base URL
TILLO_API_URL=https://api.tillo.io

# Tillo API Key
TILLO_API_KEY=your_tillo_api_key

# Tillo Secret Key
TILLO_SECRET_KEY=your_tillo_secret_key
```

**Setup:**
1. Contact Tillo for API access
2. Get credentials from Tillo dashboard

**Used for:**
- On-demand gift card provisioning
- Brand catalog sync
- Balance checking (when enabled)

---

## Optional Environment Variables

### Email Services

```bash
# SendGrid API Key (if using SendGrid for email)
SENDGRID_API_KEY=your_sendgrid_key

# SMTP Configuration (alternative to SendGrid)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@mobul.com
```

---

### Alert & Monitoring

```bash
# Slack Webhook URL (for system alerts)
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Alert Email Recipients (comma-separated)
ALERT_EMAIL_RECIPIENTS=admin@mobul.com,support@mobul.com
```

---

### Company Information

```bash
# Company name (used in templates and communications)
COMPANY_NAME=Mobul

# Support contact information
SUPPORT_PHONE_NUMBER=1-800-ACE-ENGG
SUPPORT_EMAIL=support@mobul.com
```

---

### Google Wallet & Apple Wallet (Optional)

```bash
# Google Wallet Issuer ID
GOOGLE_WALLET_ISSUER_ID=your_issuer_id

# Apple Wallet Team ID
APPLE_WALLET_TEAM_ID=your_team_id

# Apple Wallet Pass Type ID
APPLE_WALLET_PASS_TYPE_ID=pass.com.aceengage.giftcard
```

---

### Analytics & Tracking (Optional)

```bash
# Google Analytics ID
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# PostHog API Key (if using PostHog)
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://app.posthog.com
```

---

## Development vs Production

### Development (.env.local)

```bash
# Development uses local/test credentials
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev_anon_key
VITE_GEMINI_API_KEY=dev_gemini_key

# Test mode flags
VITE_ENABLE_DEBUG=true
VITE_MOCK_TILLO=true
```

### Production (.env.production)

```bash
# Production uses live credentials
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key
VITE_GEMINI_API_KEY=prod_gemini_key

# Production flags
VITE_ENABLE_DEBUG=false
VITE_MOCK_TILLO=false
```

---

## Supabase Edge Functions Environment

Edge functions have their own environment configuration in Supabase Dashboard:

**Navigate to:** Project Settings → Edge Functions → Secrets

**Required Secrets:**
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)
- `TWILIO_ACCOUNT_SID` (fallback if hierarchical config not set)
- `TWILIO_AUTH_TOKEN` (fallback if hierarchical config not set)
- `TWILIO_PHONE_NUMBER` (fallback if hierarchical config not set)
- `TWILIO_ENCRYPTION_KEY` (required - 64 hex chars for AES-256-GCM)
- `TILLO_API_KEY`
- `TILLO_SECRET_KEY`
- `SENDGRID_API_KEY` (if using SendGrid)
- `ALERT_SLACK_WEBHOOK_URL` (optional)
- `SUPPORT_PHONE_NUMBER`
- `SUPPORT_EMAIL`

**Generate Encryption Key:**
```bash
# Generate a 32-byte (64 hex char) encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Environment File Structure

```
mobul/
├── .env.example          # Template with all variables (commit this)
├── .env.local            # Development overrides (gitignored)
├── .env.production       # Production values (gitignored)
└── .env.test             # Test environment (gitignored)
```

---

## Validation

### Check Required Variables

Run the environment checker:

```bash
npm run dev
# Navigate to /system-health
# Check "Environment Variables" section
```

### Test Edge Functions

```bash
# Test locally with Supabase CLI
supabase functions serve

# Test specific function
curl -X POST 'http://localhost:54321/functions/v1/provision-gift-card-unified' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"campaignId": "test", "brandId": "test", "denomination": 25}'
```

---

## Security Best Practices

1. **Never commit** `.env` files (except `.env.example`)
2. **Rotate keys** regularly (at least quarterly)
3. **Use different keys** for dev/staging/production
4. **Restrict API keys** to specific IPs or domains when possible
5. **Monitor usage** for unusual patterns
6. **Store backups** of production keys in secure vault (1Password, etc.)

---

## Troubleshooting

### "Missing environment variable" errors

- Check variable name spelling (case-sensitive)
- Ensure `.env.local` exists in project root
- Restart dev server after adding variables
- Check Supabase Edge Functions secrets for backend variables

### OAuth not working

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check OAuth providers are enabled in Supabase Dashboard
- See `docs/OAUTH_SETUP.md` for complete OAuth configuration

### SMS not sending

- Verify Twilio configuration at client/agency/admin level in the UI
- Check that `TWILIO_ENCRYPTION_KEY` is set in Edge Functions secrets
- If using environment variable fallback, verify all Twilio variables are set
- Check Twilio phone number is active and SMS-capable
- Ensure phone number includes country code (+1 for US)
- Check Edge Function logs: `supabase functions logs send-sms-opt-in`

### SMS opt-in not updating

- Verify Twilio webhook is configured (see "Twilio Webhook Configuration" above)
- Check that webhook URL matches your Supabase project ref
- Test webhook manually: `curl -X POST YOUR_WEBHOOK_URL -d "From=+1234567890&Body=YES"`
- Check Edge Function logs: `supabase functions logs handle-sms-response`

---

**Last Updated**: January 2026  
**Maintainer**: Platform Engineering Team


# Environment Setup Guide

Complete guide for configuring environment variables for ACE Engage platform.

---

## Overview

ACE Engage requires several environment variables for proper operation. This document lists all required and optional variables with descriptions and setup instructions.

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
# Twilio Account SID
TWILIO_ACCOUNT_SID=your_account_sid

# Twilio Auth Token
TWILIO_AUTH_TOKEN=your_auth_token

# Twilio Phone Number (for sending SMS)
TWILIO_PHONE_NUMBER=+1234567890
```

**Setup:**
1. Sign up at [twilio.com](https://www.twilio.com)
2. Get Account SID and Auth Token from Console
3. Purchase a phone number

**Used for:**
- Gift card SMS delivery
- SMS opt-in requests
- Call tracking

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
SMTP_FROM=noreply@aceengage.com
```

---

### Alert & Monitoring

```bash
# Slack Webhook URL (for system alerts)
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Alert Email Recipients (comma-separated)
ALERT_EMAIL_RECIPIENTS=admin@aceengage.com,support@aceengage.com
```

---

### Company Information

```bash
# Company name (used in templates and communications)
COMPANY_NAME=ACE Engage

# Support contact information
SUPPORT_PHONE_NUMBER=1-800-ACE-ENGG
SUPPORT_EMAIL=support@aceengage.com
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
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TILLO_API_KEY`
- `TILLO_SECRET_KEY`
- `SENDGRID_API_KEY` (if using SendGrid)
- `ALERT_SLACK_WEBHOOK_URL` (optional)
- `SUPPORT_PHONE_NUMBER`
- `SUPPORT_EMAIL`

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

- Verify all Twilio variables are set
- Check Twilio phone number is active
- Ensure phone number includes country code (+1 for US)

---

**Last Updated**: December 2024  
**Maintainer**: Platform Engineering Team


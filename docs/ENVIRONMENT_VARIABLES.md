# Environment Variables Documentation

## Overview
This document lists all environment variables used in the application and edge functions.

---

## Frontend Environment Variables

These variables are defined in `.env` and automatically managed by Lovable Cloud:

### Required Variables

#### `VITE_SUPABASE_URL`
- **Type**: URL
- **Example**: `https://arzthloosvnasokxygfo.supabase.co`
- **Description**: The URL of your Supabase project
- **Usage**: Used by the Supabase client for all database and auth operations
- **Auto-managed**: Yes (updated automatically by Lovable Cloud)

#### `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Type**: String (JWT)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Description**: Public/anonymous key for client-side Supabase operations
- **Usage**: Safe to expose in client-side code, used for authentication and RLS
- **Auto-managed**: Yes (updated automatically by Lovable Cloud)

#### `VITE_SUPABASE_PROJECT_ID`
- **Type**: String
- **Example**: `arzthloosvnasokxygfo`
- **Description**: Unique identifier for your Supabase project
- **Usage**: Used for project-specific operations and debugging
- **Auto-managed**: Yes (updated automatically by Lovable Cloud)

---

## Edge Function Secrets

These secrets are stored securely in Supabase and accessed by edge functions only. They are **never** exposed to the client.

### Authentication & Database

#### `SUPABASE_URL`
- **Type**: URL
- **Required by**: All edge functions
- **Description**: Internal Supabase URL for server-side operations
- **Auto-managed**: Yes

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type**: String (JWT)
- **Required by**: All edge functions
- **Description**: Service role key with admin access (bypasses RLS)
- **Security**: Never expose to client, only use in edge functions
- **Auto-managed**: Yes

#### `SUPABASE_ANON_KEY`
- **Type**: String (JWT)
- **Required by**: Some edge functions
- **Description**: Anonymous key for client-like operations
- **Auto-managed**: Yes

#### `SUPABASE_DB_URL`
- **Type**: Connection String
- **Required by**: Database-intensive edge functions
- **Description**: Direct database connection URL
- **Auto-managed**: Yes

### Third-Party Integrations

#### `TWILIO_ACCOUNT_SID`
- **Type**: String
- **Example**: `AC1234567890abcdef1234567890abcdef`
- **Required by**: 
  - `provision-twilio-number`
  - `release-twilio-number`
  - `send-gift-card-sms`
  - `send-user-invitation`
  - `retry-failed-sms`
  - `handle-incoming-call`
  - `handle-call-webhook`
- **Description**: Twilio account identifier
- **How to get**: Sign up at [twilio.com](https://www.twilio.com/), find in Console Dashboard
- **Required**: Yes (for SMS and call tracking features)

#### `TWILIO_AUTH_TOKEN`
- **Type**: String (Secret)
- **Required by**: All Twilio-related edge functions
- **Description**: Authentication token for Twilio API
- **How to get**: Found in Twilio Console Dashboard alongside Account SID
- **Security**: Keep secret, never expose
- **Required**: Yes (for SMS and call tracking features)

#### `TWILIO_PHONE_NUMBER`
- **Type**: Phone Number (E.164 format)
- **Example**: `+15551234567`
- **Required by**: SMS and calling functions
- **Description**: Your Twilio phone number for sending SMS and receiving calls
- **How to get**: Purchase a number in Twilio Console
- **Required**: Yes (for SMS features)

#### `ANTHROPIC_API_KEY`
- **Type**: String (Secret)
- **Required by**: 
  - `dr-phillip-chat`
  - `ai-design-chat`
- **Description**: API key for Claude AI (Anthropic)
- **How to get**: Sign up at [console.anthropic.com](https://console.anthropic.com/)
- **Required**: Only if using AI features
- **Cost**: Pay-per-use pricing

#### `LOVABLE_API_KEY`
- **Type**: String (Secret)
- **Required by**: 
  - `generate-template-design`
  - `regenerate-template-element`
  - `generate-landing-page`
  - `generate-prototype`
  - `generate-ace-form-ai`
- **Description**: API key for Lovable AI services
- **How to get**: Contact Lovable support
- **Required**: Only if using AI generation features

#### `STRIPE_SECRET_KEY`
- **Type**: String (Secret)
- **Example**: `sk_test_...` or `sk_live_...`
- **Required by**: 
  - `purchase-gift-cards`
  - `stripe-webhook`
- **Description**: Stripe API secret key for payment processing
- **How to get**: [dashboard.stripe.com](https://dashboard.stripe.com/) → Developers → API Keys
- **Required**: Only if using Stripe payments
- **Security**: Use test key for development, live key for production

#### `STRIPE_WEBHOOK_SECRET`
- **Type**: String (Secret)
- **Example**: `whsec_...`
- **Required by**: `stripe-webhook`
- **Description**: Secret for validating Stripe webhook signatures
- **How to get**: Stripe Dashboard → Webhooks → Add endpoint → Copy signing secret
- **Required**: Only if using Stripe webhooks
- **Security**: Different secret for test/live modes

---

## How to Set Secrets

### For Local Development
1. Secrets are automatically synced from Supabase
2. Never commit secrets to git
3. Use `.env.local` for local overrides (gitignored)

### For Production
1. All secrets are managed in Lovable Cloud/Supabase
2. Go to Settings → Integrations → Lovable Cloud → Secrets
3. Add/update secrets through the UI
4. Edge functions automatically receive updated secrets

---

## Security Best Practices

### DO ✅
- Use different API keys for development and production
- Rotate secrets regularly (every 90 days minimum)
- Use the minimum required permissions for each key
- Monitor usage and set up alerts for unusual activity
- Store secrets in Lovable Cloud/Supabase secrets manager

### DON'T ❌
- Never commit secrets to git
- Never expose service role keys to the client
- Don't share secrets via email or chat
- Don't use production keys in development
- Don't log secrets in edge functions

---

## Troubleshooting

### Edge function says "Missing secret"
1. Check if the secret is set in Lovable Cloud → Settings → Secrets
2. Verify the secret name matches exactly (case-sensitive)
3. Redeploy the edge function after adding secrets
4. Check edge function logs for specific error messages

### Twilio integration not working
1. Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set
2. Ensure phone number is in E.164 format (`+15551234567`)
3. Check Twilio account status (active and funded)
4. Verify phone number is verified in Twilio for test accounts

### Stripe payments failing
1. Check if using correct key (test vs. live)
2. Verify webhook secret matches your endpoint
3. Ensure Stripe webhook is pointing to correct URL
4. Check Stripe dashboard for error details

---

## Required Secrets Checklist

**Minimum Required** (for core features):
- [x] `SUPABASE_URL` (auto-managed)
- [x] `SUPABASE_SERVICE_ROLE_KEY` (auto-managed)
- [x] `SUPABASE_ANON_KEY` (auto-managed)

**For SMS Features**:
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`

**For AI Features**:
- [ ] `LOVABLE_API_KEY` (Lovable AI)
- [ ] `ANTHROPIC_API_KEY` (Claude AI)

**For Payment Features**:
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`

---

## Contact & Support

For questions about:
- **Lovable Cloud/Supabase**: Check docs or contact Lovable support
- **Twilio**: [support.twilio.com](https://support.twilio.com)
- **Stripe**: [support.stripe.com](https://support.stripe.com)
- **Anthropic**: [support.anthropic.com](https://support.anthropic.com)

**Last Updated**: 2025-01-23

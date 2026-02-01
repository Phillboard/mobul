# Edge Functions

> Supabase Edge Functions for the Mobul platform backend.

## Overview

- **Total Functions:** 91
- **Runtime:** Deno
- **Shared Modules:** 18 in `_shared/`

## Function Categories

### Gift Card Management (15 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `provision-gift-card-unified` | Unified provisioning (inventory + Tillo) | JWT |
| `provision-gift-card-for-call-center` | Call center provisioning | JWT |
| `provision-gift-card-from-api` | API-based provisioning | API Key |
| `check-gift-card-balance` | Check balance via Tillo | JWT |
| `check-inventory-card-balance` | Check uploaded card balance | JWT |
| `revoke-gift-card` | Revoke/cancel gift cards | JWT |
| `validate-gift-card-code` | Validate gift card codes | Public |
| `validate-gift-card-configuration` | Validate campaign config | JWT |
| `cleanup-stuck-gift-cards` | Cleanup stuck states | JWT |
| `monitor-gift-card-system` | System health monitoring | JWT |
| `purchase-gift-cards` | Purchase from Tillo | JWT |
| `import-gift-cards` | Import to inventory | JWT |
| `export-pool-cards` | Export pool data | JWT |
| `transfer-admin-cards` | Transfer admin cards | JWT |
| `lookup-tillo-brand` | Lookup brand details | JWT |

### Campaign Management (12 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `evaluate-conditions` | Evaluate conditions, trigger rewards | JWT |
| `complete-condition` | Mark condition complete | JWT |
| `validate-campaign-budget` | Validate budget | JWT |
| `calculate-credit-requirements` | Calculate credit needs | JWT |
| `preview-campaign-audience` | Preview audience | JWT |
| `save-campaign-draft` | Save drafts | JWT |
| `diagnose-campaign-config` | Diagnose issues | JWT |
| `track-mail-delivery` | Track delivery events | Public |
| `create-preview-link` | Create preview links | JWT |
| `generate-recipient-tokens` | Generate tracking tokens | JWT |
| `submit-to-vendor` | Submit to print vendor | JWT |

### Redemption & Call Center (8 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `validate-redemption-code` | Validate codes (rate-limited) | Public |
| `redeem-customer-code` | Redeem codes | Public |
| `redeem-gift-card-embed` | Embedded redemption | Public |
| `approve-customer-code` | Approve codes | JWT |
| `bulk-approve-codes` | Bulk approval | JWT |
| `handle-incoming-call` | Twilio call handling | Public |
| `update-call-status` | Update call status | Public |
| `complete-call-disposition` | Complete disposition | JWT |
| `handle-call-webhook` | Call webhook handler | Public |

### SMS & Communication (10 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `send-gift-card-sms` | Send via SMS (hierarchical Twilio) | JWT |
| `send-sms-opt-in` | Send opt-in requests | JWT |
| `send-marketing-sms` | Send marketing SMS | JWT |
| `retry-failed-sms` | Retry failed sends | JWT |
| `handle-sms-response` | Handle STOP, YES, etc. | Public |
| `test-sms-provider` | Test SMS config | JWT |
| `send-marketing-email` | Send marketing emails | JWT |
| `send-gift-card-email` | Send via email | JWT |
| `send-email` | Generic email sending | JWT |
| `send-verification-email` | Send verification | JWT |

### Twilio Integration (7 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `configure-twilio-webhooks` | Configure webhooks | JWT |
| `update-twilio-config` | Update configuration | JWT |
| `get-twilio-status` | Get account status | JWT |
| `fetch-twilio-numbers` | Fetch available numbers | JWT |
| `provision-twilio-number` | Provision number | JWT |
| `release-twilio-number` | Release number | JWT |
| `test-twilio-connection` | Test connection | JWT |

### Data Import/Export (8 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `import-audience` | Import audiences | JWT |
| `import-contacts` | Import contacts | JWT |
| `import-campaign-codes` | Import codes | JWT |
| `import-customer-codes` | Import customer codes | JWT |
| `export-audience` | Export audience data | JWT |
| `export-database` | Export database (admin) | JWT |

### Marketing Automation (5 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `send-marketing-campaign` | Send campaigns | JWT |
| `process-marketing-automation` | Process triggers | JWT |
| `trigger-marketing-automation` | Trigger workflows | JWT |

### AI & Landing Pages (5 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `ai-landing-page-generate` | Generate landing pages | JWT |
| `ai-landing-page-chat` | AI chat | JWT |
| `generate-landing-page-ai` | Generate pages | JWT |
| `generate-form-ai` | Generate forms | JWT |
| `ai-design-chat` | Design chat | JWT |

### Forms & Submissions (4 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `submit-form` | Submit ACE forms | Public |
| `submit-lead-form` | Submit lead forms | Public |
| `handle-purl` | Handle personalized URLs | Public |

### Webhooks & Integrations (6 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `trigger-webhook` | Trigger webhooks | JWT |
| `crm-webhook-receiver` | CRM webhooks | Public |
| `eztexting-webhook` | EZTexting handler | Public |
| `stripe-webhook` | Stripe handler | Public |
| `zapier-incoming-webhook` | Zapier receiver | Public |
| `dispatch-zapier-event` | Dispatch events | JWT |

### Wallet Passes (2 functions)

| Function | Purpose | Auth |
|----------|---------|------|
| `generate-apple-wallet-pass` | Apple Wallet | JWT |
| `generate-google-wallet-pass` | Google Wallet | JWT |

---

## Shared Modules (`_shared/`)

### Core Infrastructure

| Module | Purpose |
|--------|---------|
| `api-gateway.ts` | Request/response handling, validation |
| `supabase.ts` | Supabase client factory |
| `config.ts` | Centralized configuration |
| `cors.ts` | CORS headers |

### Logging

| Module | Purpose |
|--------|---------|
| `error-logger.ts` | Structured error logging |
| `activity-logger.ts` | Activity logging (6 categories) |

### SMS Providers

| Module | Purpose |
|--------|---------|
| `sms-provider.ts` | Unified SMS abstraction |
| `twilio-client.ts` | Twilio SMS client |
| `twilio-hierarchy.ts` | Hierarchical credential resolution |
| `twilio-encryption.ts` | Auth token encryption |
| `eztexting-client.ts` | EZTexting client |
| `infobip-client.ts` | Infobip client |
| `notificationapi-client.ts` | NotificationAPI client |
| `a2p-validation.ts` | A2P/TCPA compliance |

### Business Rules

| Module | Purpose |
|--------|---------|
| `business-rules/campaign-rules.ts` | Campaign lifecycle rules |
| `business-rules/organization-rules.ts` | Organization rules |

### Validation

| Module | Purpose |
|--------|---------|
| `schemas/validation.ts` | Request validation schemas |

### Utilities

| Module | Purpose |
|--------|---------|
| `rate-limiter.ts` | IP-based rate limiting |
| `tillo-client.ts` | Tillo gift card API |

---

## SMS Provider Hierarchy

```
1. NotificationAPI (primary)
   ↓ fallback
2. Infobip
   ↓ fallback
3. Twilio (hierarchical: Client → Agency → Admin)
   ↓ fallback
4. EZTexting (legacy)
```

---

## Function Structure

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { param1, param2 } = await req.json();
    
    // Business logic here
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## Deployment

```bash
# Deploy all functions
npm run deploy:functions

# Deploy single function
supabase functions deploy function-name

# Test locally
supabase functions serve function-name --env-file .env.local
```

---

## Configuration

See `config.toml` for JWT verification settings per function.

**Public functions** (`verify_jwt = false`):
- Form submissions, webhooks, redemption, PURLs

**Authenticated functions** (`verify_jwt = true`):
- Admin operations, campaign management, provisioning

# Edge Functions

> Supabase Edge Functions for the Mobul platform backend.
> All functions use the standardized `withApiGateway` wrapper for consistent CORS, authentication, error handling, and audit logging.

## Overview

- **Total Functions:** 93
- **Runtime:** Deno
- **Shared Modules:** 26 in `_shared/`
- **Architecture:** Standardized API Gateway pattern
- **Using withApiGateway:** 83/93 (89%)
- **Supabase Client:** 100% centralized (no inline `createClient`)

## Quick Stats

| Category | Count | Auth Types |
|----------|-------|------------|
| Gift Cards | 17 | JWT, Public, API Key |
| Campaigns | 11 | JWT, Public |
| Call Center | 10 | JWT, Public (webhooks) |
| Messaging | 15 | JWT, Internal |
| Twilio | 11 | JWT, Public (webhooks) |
| Import/Export | 8 | JWT |
| Marketing | 3 | JWT, Internal |
| AI | 7 | JWT, Public |
| Forms | 3 | Public |
| Webhooks | 5 | Public |
| Admin | 5 | JWT (Admin role) |
| Wallet | 2 | Public |

---

## Function Registry by Domain

### Gift Card Operations (17 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `provision-gift-card-unified` | Unified provisioning (inventory + Tillo) | JWT | `api-gateway`, `tillo-client`, `business-rules/gift-card-provisioning` |
| `provision-gift-card-for-call-center` | Redirect → unified (call center) | JWT | `api-gateway`, `business-rules/gift-card-provisioning` |
| `provision-gift-card-from-api` | Redirect → unified (API key auth) | API Key | `api-gateway`, `business-rules/gift-card-provisioning` |
| `check-gift-card-balance` | Check Tillo card balance | JWT | `api-gateway`, `tillo-client`, `business-rules/gift-card-rules` |
| `check-inventory-card-balance` | Check uploaded card balance | JWT | `api-gateway`, `business-rules/gift-card-rules` |
| `revoke-gift-card` | Revoke/cancel gift cards | JWT | `api-gateway`, `business-rules/gift-card-rules` |
| `validate-gift-card-code` | Validate gift card codes | Public | `api-gateway`, `business-rules/gift-card-rules` |
| `validate-gift-card-configuration` | Validate campaign gift card config | JWT | `api-gateway` |
| `cleanup-stuck-gift-cards` | Cleanup stuck provisioning states | JWT (Admin) | `api-gateway`, `business-rules/gift-card-rules` |
| `monitor-gift-card-system` | System health monitoring | JWT (Admin) | `api-gateway`, `business-rules/gift-card-rules` |
| `purchase-gift-cards` | Purchase cards from Tillo | JWT | `api-gateway`, `tillo-client` |
| `import-gift-cards` | Import cards to inventory pool | JWT | `api-gateway`, `import-export-utils` |
| `export-pool-cards` | Export pool card data | JWT | `api-gateway`, `import-export-utils` |
| `transfer-admin-cards` | Transfer cards between pools | JWT | `api-gateway`, `business-rules/gift-card-rules` |
| `lookup-tillo-brand` | Lookup Tillo brand details | JWT (Admin) | `api-gateway`, `tillo-client` |
| `validate-redemption-code` | Validate redemption codes (rate-limited) | Public | `api-gateway`, `rate-limiter`, `business-rules/gift-card-rules` |
| `redeem-customer-code` | Redeem customer codes | Public | `api-gateway`, `business-rules/gift-card-rules` |

### Campaign Management (11 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `evaluate-conditions` | Evaluate conditions, trigger rewards | JWT/Internal | `api-gateway`, `business-rules/campaign-rules` |
| `complete-condition` | Mark condition as complete | JWT | `api-gateway`, `business-rules/campaign-rules` |
| `validate-campaign-budget` | Validate campaign budget | JWT | `api-gateway`, `business-rules/campaign-rules` |
| `calculate-credit-requirements` | Calculate credit needs | JWT | `api-gateway`, `business-rules/credit-rules` |
| `preview-campaign-audience` | Preview audience segment | JWT | `api-gateway` |
| `save-campaign-draft` | Save campaign drafts | JWT | `api-gateway` |
| `diagnose-campaign-config` | Diagnose campaign issues | JWT (Admin) | `api-gateway` |
| `track-mail-delivery` | Track mail delivery events | Webhook | `api-gateway`, `webhook-utils` |
| `create-preview-link` | Create secure preview links | JWT | `api-gateway` |
| `generate-recipient-tokens` | Generate tracking tokens | JWT | `api-gateway` |
| `submit-to-vendor` | Submit to print vendor | JWT | `api-gateway` |

### Call Center & Redemption (10 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `redeem-gift-card-embed` | Embedded redemption widget | Public | `api-gateway`, `business-rules/gift-card-rules` |
| `approve-customer-code` | Approve redemption codes | JWT | `api-gateway` |
| `bulk-approve-codes` | Bulk code approval | JWT (Role) | `api-gateway` |
| `handle-incoming-call` | Handle Twilio incoming calls | Webhook | `api-gateway`, `twilio-auth` |
| `update-call-status` | Update call status | Webhook | `api-gateway`, `twilio-auth` |
| `complete-call-disposition` | Complete call disposition | JWT | `api-gateway` |
| `handle-call-webhook` | Twilio call webhook handler | Webhook | `api-gateway`, `twilio-auth` |
| `assign-tracked-numbers` | Assign tracked phone numbers | JWT | `api-gateway`, `twilio-hierarchy` |

### SMS & Email Messaging (15 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `send-gift-card-sms` | Send gift card via SMS | JWT/Internal | `api-gateway`, `sms-provider`, `sms-templates` |
| `send-sms-opt-in` | Send opt-in requests | JWT | `api-gateway`, `sms-provider`, `a2p-validation` |
| `send-marketing-sms` | Send marketing SMS | Internal | `api-gateway`, `sms-provider` |
| `retry-failed-sms` | Retry failed SMS sends | JWT | `api-gateway`, `sms-provider` |
| `handle-sms-response` | Handle SMS responses (STOP, YES) | Webhook | `api-gateway`, `webhook-utils`, `sms-provider` |
| `test-sms-provider` | Test SMS configuration | JWT | `api-gateway`, `sms-provider` |
| `send-marketing-email` | Send marketing emails | Internal | `api-gateway`, `email-provider`, `email-templates` |
| `send-gift-card-email` | Send gift card via email | Internal | `api-gateway`, `email-provider`, `email-templates` |
| `send-email` | Generic email sending | JWT | `api-gateway`, `email-provider` |
| `send-verification-email` | Send verification emails | JWT | `api-gateway`, `email-provider`, `email-templates` |
| `send-approval-notification` | Send approval notifications | JWT | `api-gateway`, `email-provider` |
| `send-comment-notification` | Send comment notifications | JWT | `api-gateway`, `email-provider` |
| `send-user-invitation` | Send user invitations | JWT | `api-gateway`, `email-provider`, `email-templates` |

### Twilio Integration (11 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `configure-twilio-webhooks` | Configure Twilio webhooks | JWT | `api-gateway`, `twilio-client` |
| `update-twilio-config` | Update Twilio configuration | JWT | `api-gateway`, `twilio-client`, `twilio-encryption` |
| `get-twilio-status` | Get Twilio account status | JWT | `api-gateway`, `twilio-client` |
| `fetch-twilio-numbers` | Fetch available numbers | JWT | `api-gateway`, `twilio-client` |
| `provision-twilio-number` | Provision phone number | JWT | `api-gateway`, `twilio-client` |
| `release-twilio-number` | Release phone number | JWT | `api-gateway`, `twilio-client` |
| `test-twilio-connection` | Test Twilio connection | JWT | `api-gateway`, `twilio-client` |
| `disable-twilio-config` | Disable Twilio config | JWT | `api-gateway`, `twilio-client` |
| `remove-twilio-config` | Remove Twilio config | JWT | `api-gateway`, `twilio-client` |
| `revalidate-twilio` | Revalidate Twilio credentials | JWT | `api-gateway`, `twilio-client` |
| `admin-twilio-health-report` | Admin health report | JWT (Admin) | `api-gateway`, `twilio-client` |

### Data Import/Export (8 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `import-audience` | Import audiences from CSV | JWT | `api-gateway`, `import-export-utils` |
| `import-contacts` | Import contacts from CSV | JWT | `api-gateway`, `import-export-utils` |
| `import-campaign-codes` | Import campaign codes | JWT | `api-gateway`, `import-export-utils` |
| `import-customer-codes` | Import customer codes | JWT | `api-gateway`, `import-export-utils` |
| `export-audience` | Export audience data | JWT | `api-gateway`, `import-export-utils` |
| `export-database` | Export full database | JWT (Admin) | `api-gateway`, `import-export-utils` |

### Marketing Automation (3 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `send-marketing-campaign` | Execute marketing campaigns | JWT | `api-gateway` |
| `process-marketing-automation` | Process automation workflows | Internal | `api-gateway` |
| `trigger-marketing-automation` | Trigger automation events | Internal | `api-gateway` |

### AI & Landing Pages (7 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `ai-landing-page-generate` | Generate landing pages (full) | JWT | `api-gateway`, `ai-client` |
| `ai-landing-page-chat` | AI chat for landing pages | JWT | `api-gateway`, `ai-client` |
| `generate-landing-page-ai` | Generate landing pages (simple) | JWT | `api-gateway`, `ai-client` |
| `generate-form-ai` | Generate forms with AI | Public | `api-gateway`, `ai-client` |
| `ai-design-chat` | Design assistant chat | JWT | `api-gateway`, `ai-client` |
| `openai-chat` | General OpenAI chat | JWT | `api-gateway`, `ai-client` |
| `dr-phillip-chat` | Dr. Phillip AI assistant | JWT | `ai-client` (streaming) |

### Forms & Submissions (3 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `submit-form` | Submit ACE forms | Public | `api-gateway`, `business-rules/form-rules` |
| `submit-lead-form` | Submit lead capture forms | Public | `api-gateway`, `business-rules/form-rules` |
| `handle-purl` | Handle personalized URLs | Public | `api-gateway` |

### External Webhooks (5 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `trigger-webhook` | Trigger client webhooks | Internal | `api-gateway`, `webhook-utils` |
| `crm-webhook-receiver` | Receive CRM webhooks | Webhook | `api-gateway`, `webhook-utils`, `crm-adapters` |
| `eztexting-webhook` | EZTexting SMS webhook | Webhook | `api-gateway`, `webhook-utils` |
| `stripe-webhook` | Stripe payment webhook | Webhook | `api-gateway`, `webhook-utils` |
| `zapier-incoming-webhook` | Zapier webhook receiver | Webhook | `api-gateway`, `webhook-utils` |
| `dispatch-zapier-event` | Dispatch events to Zapier | Internal | `api-gateway` |

### Admin & System (5 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `accept-invitation` | Accept user invitations | Public | `api-gateway` |
| `generate-api-key` | Generate API keys | JWT | `api-gateway` |
| `diagnose-provisioning-setup` | Diagnose provisioning issues | JWT (Admin) | `api-gateway` |
| `validate-environment` | Validate environment config | JWT (Admin) | `api-gateway` |
| `allocate-credit` | Allocate credits | JWT (Admin) | `api-gateway`, `business-rules/credit-rules` |

### Wallet Passes (2 functions)

| Function | Purpose | Auth | Shared Modules |
|----------|---------|------|----------------|
| `generate-apple-wallet-pass` | Generate Apple Wallet pass | Public | `api-gateway` |
| `generate-google-wallet-pass` | Generate Google Wallet pass | Public | `api-gateway` |

---

## Shared Modules (`_shared/`)

### Core Infrastructure

| Module | Purpose |
|--------|---------|
| `api-gateway.ts` | Standardized request handling, auth, CORS, error handling, audit logging |
| `supabase.ts` | Supabase client factory (`createServiceClient`, `createUserClient`) |
| `config.ts` | Centralized configuration |
| `cors.ts` | CORS headers |
| `cache.ts` | Caching utilities |
| `rate-limiter.ts` | IP-based rate limiting |

### Logging & Monitoring

| Module | Purpose |
|--------|---------|
| `error-logger.ts` | Structured error logging |
| `activity-logger.ts` | Activity logging (6 categories: user, system, gift_card, campaign, messaging, api) |

### Business Rules

| Module | Purpose |
|--------|---------|
| `business-rules/campaign-rules.ts` | Campaign lifecycle validation |
| `business-rules/organization-rules.ts` | Organization hierarchy rules |
| `business-rules/gift-card-provisioning.ts` | Gift card provisioning logic |
| `business-rules/gift-card-rules.ts` | Gift card validation, redemption, balance |
| `business-rules/credit-rules.ts` | Credit allocation and validation |
| `business-rules/form-rules.ts` | Form submission validation |

### Communication Providers

| Module | Purpose |
|--------|---------|
| `sms-provider.ts` | Unified SMS provider abstraction |
| `twilio-client.ts` | Twilio SMS/Voice client |
| `twilio-hierarchy.ts` | Hierarchical Twilio credential resolution |
| `twilio-encryption.ts` | Auth token encryption |
| `twilio-auth.ts` | Twilio webhook authentication |
| `eztexting-client.ts` | EZTexting SMS client |
| `infobip-client.ts` | Infobip SMS client |
| `notificationapi-client.ts` | NotificationAPI client |
| `a2p-validation.ts` | A2P/TCPA compliance validation |
| `email-provider.ts` | Email provider abstraction |
| `email-templates.ts` | Email template rendering |
| `sms-templates.ts` | SMS template rendering |

### AI Services

| Module | Purpose |
|--------|---------|
| `ai-client.ts` | Unified AI client (OpenAI, Anthropic, Gemini, Lovable) |

### External APIs

| Module | Purpose |
|--------|---------|
| `tillo-client.ts` | Tillo gift card API client |
| `crm-adapters.ts` | CRM webhook adapters (Salesforce, HubSpot, Zoho) |

### Utilities

| Module | Purpose |
|--------|---------|
| `webhook-utils.ts` | Webhook signature verification, payload parsing |
| `import-export-utils.ts` | CSV parsing, generation, batch processing |
| `schemas/common.ts` | Common validation schemas |
| `schemas/validation.ts` | Request validation schemas |

---

## Auth Types

| Type | Description | Example Functions |
|------|-------------|-------------------|
| **JWT** | User authenticated via Supabase auth | Most dashboard operations |
| **JWT (Admin)** | JWT + admin/platform_admin role required | `validate-environment`, `export-database` |
| **JWT (Role)** | JWT + specific role(s) required | `bulk-approve-codes` (admin/call_center) |
| **Public** | No authentication, rate-limited | Form submissions, redemptions |
| **Webhook** | External webhook (signature verified) | Stripe, Twilio, CRM webhooks |
| **API Key** | API key authentication | `provision-gift-card-from-api` |
| **Internal** | Called only by other edge functions | `send-marketing-sms`, `evaluate-conditions` |

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

## Function Architecture

All functions follow the `withApiGateway` pattern:

```typescript
import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface RequestBody {
  param1: string;
  param2: number;
}

interface ResponseBody {
  success: boolean;
  data: unknown;
}

async function handleRequest(
  request: RequestBody,
  context: AuthContext
): Promise<ResponseBody> {
  const supabase = createServiceClient();
  const logger = createActivityLogger('function-name');
  
  // Validation
  if (!request.param1) {
    throw new ApiError('param1 is required', 'VALIDATION_ERROR', 400);
  }
  
  // Business logic
  const result = await supabase.from('table').select('*');
  
  // Activity logging
  await logger.api('action_name', 'success', {
    userId: context.user.id,
    description: 'Action completed',
  });
  
  return { success: true, data: result };
}

// Export with API Gateway wrapper
Deno.serve(withApiGateway(handleRequest, {
  requireAuth: true,           // JWT required
  requiredRole: 'admin',       // Optional role check
  parseBody: true,             // Auto-parse JSON body
  auditAction: 'my_action',    // Audit log action name
}));
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

# View logs
supabase functions logs function-name
```

---

## Configuration

See `config.toml` for JWT verification settings per function.

**Public functions** (`verify_jwt = false`):
- Form submissions, webhooks, redemption, PURLs, wallet passes

**Authenticated functions** (`verify_jwt = true`):
- Admin operations, campaign management, provisioning

---

## Redirect Stubs (Backward Compatibility)

The following functions redirect to unified implementations:

| Stub | Redirects To | Callers |
|------|--------------|---------|
| `provision-gift-card-for-call-center` | `provision-gift-card-unified` | Call center frontend |
| `provision-gift-card-from-api` | `provision-gift-card-unified` | External API clients |

These will be removed after frontend migration to use unified functions directly.

---

## Function Status

| Status | Count | Description |
|--------|-------|-------------|
| Active | 86 | Used by frontend or other functions |
| Webhook-only | 7 | External webhook receivers |
| Redirect | 2 | Backward compatibility stubs |

---

## Migration Status (Post-Phase 24 Audit)

### Functions Using withApiGateway: 83/93 ✓

### Legacy Functions (Inline CORS, Manual Auth) - 5 Total

These functions use older patterns and may be migrated in future:

| Function | Issue | Priority |
|----------|-------|----------|
| `complete-condition` | Inline CORS, manual auth, inline createClient | Medium |
| `evaluate-conditions` | Inline CORS | Medium |
| `handle-purl` | Inline CORS | Medium |
| `generate-recipient-tokens` | Inline CORS | Low |
| `diagnose-campaign-config` | Inline CORS | Low |

### Functions with Duplicate CORS Import - 4 Total

These import from `_shared/cors.ts` but also define inline (non-breaking):

| Function | Note |
|----------|------|
| `dr-phillip-chat` | Streaming function with manual CORS |
| `export-audience` | Export function |
| `export-pool-cards` | Export function |
| `export-database` | Export function |

These work correctly but have redundant code.

---

## Audit Summary (Phase 24)

| Check | Status |
|-------|--------|
| Supabase client centralization | ✅ 100% |
| withApiGateway adoption | ✅ 89% (83/93) |
| CORS centralization | ⚠️ 90% (5 legacy) |
| TypeScript compilation | ✅ Passes |
| No direct invoke in frontend | ✅ (except tests/exports) |

Last updated: February 2026

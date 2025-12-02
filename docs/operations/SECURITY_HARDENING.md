# Security Hardening Guide

## Overview

This guide outlines security measures, configurations, and best practices for the ACE Engage platform.

---

## Authentication & Authorization

### JWT Configuration

**Current Setup**:
- Supabase handles JWT generation and validation
- Tokens valid for 1 hour by default
- Refresh tokens valid for 30 days

**Edge Function JWT Settings**:

Review [`supabase/config.toml`](../../supabase/config.toml) for JWT verification settings:

```toml
# Public endpoints (no JWT required)
[functions.handle-purl]
verify_jwt = false  # ✅ OK - recipient landing page

[functions.submit-lead-form]
verify_jwt = false  # ✅ OK - public form submission

[functions.handle-sms-response]
verify_jwt = false  # ✅ OK - Twilio webhook

# Protected endpoints (JWT required)
[functions.generate-api-key]
verify_jwt = true  # ✅ Correct - admin only

[functions.provision-gift-card-for-call-center]
verify_jwt = true  # ✅ Correct - authenticated users only
```

**Security Recommendations**:

1. **Public Endpoints** - OK to have `verify_jwt = false` if:
   - Recipient-facing (PURLs, forms)
   - Webhook receivers (with signature validation)
   - Public API endpoints (with rate limiting)

2. **Protected Endpoints** - Must have `verify_jwt = true` if:
   - Administrative functions
   - Data modification operations
   - Sensitive data access

3. **Webhook Endpoints** - If `verify_jwt = false`, MUST have:
   - Signature validation (Twilio, Stripe, etc.)
   - IP whitelist (if provider supports)
   - Timestamp validation (replay attack prevention)

---

## Rate Limiting

### Implementation

**Database Migration**: `20251203000001_create_rate_limiting_system.sql`

**Usage in Edge Functions**:

```typescript
// File: supabase/functions/YOUR_FUNCTION/index.ts
import { checkRateLimit, logRateLimitRequest } from '../_shared/rate-limiter.ts';

Deno.serve(async (req) => {
  // Get identifier (IP, API key, or user ID)
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  const functionName = 'YOUR_FUNCTION';
  
  // Check rate limit
  const rateLimitResult = await checkRateLimit(
    clientIP,
    functionName,
    100, // requests
    60 // per 60 seconds
  );
  
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: rateLimitResult.retry_after
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': rateLimitResult.retry_after.toString()
        }
      }
    );
  }
  
  // Log request
  await logRateLimitRequest(clientIP, functionName);
  
  // Continue with function logic
  // ...
});
```

### Rate Limit Thresholds

**Recommended Limits**:

| Endpoint Type | Requests | Window | Notes |
|--------------|----------|--------|-------|
| Public Forms | 10 | 60s | Prevent spam |
| Public APIs | 100 | 60s | Standard API usage |
| Authenticated API | 1000 | 60s | Higher for logged-in users |
| Webhooks | 100 | 60s | External service callbacks |
| Admin Functions | 500 | 60s | Internal operations |

**Per-Client Limits** (higher tier):

```typescript
// For clients with API keys
const clientTier = await getClientTier(apiKey);

const limits = {
  'free': { requests: 100, window: 60 },
  'standard': { requests: 1000, window: 60 },
  'premium': { requests: 10000, window: 60 }
};

const { requests, window } = limits[clientTier];
```

---

## API Key Management

### Key Generation

**Format**: `ace_live_[32_random_chars]` or `ace_test_[32_random_chars]`

**Security Features**:
- Keys are hashed before storage (SHA-256)
- Only prefix shown in UI
- Full key shown once at creation
- Cannot retrieve full key later

**Best Practices**:
1. Use separate keys for different environments
2. Use `ace_test_` prefix for development
3. Use `ace_live_` prefix for production
4. Never commit keys to git

### Key Rotation

**When to Rotate**:
- Every 90 days (proactive)
- When employee leaves
- On suspected compromise
- After security incident

**Rotation Process**:

```typescript
// Using useApiKeys hook
const { rotateApiKey } = useApiKeys(clientId);

// Rotate key
const newKey = await rotateApiKey({
  keyId: 'old-key-id',
  expiresInDays: 90
});

// Update services with new key
// Old key is revoked automatically
```

### Key Expiration

**Policy**:
- All keys should have expiration
- Default: 90 days
- Maximum: 365 days
- Never: Not allowed in production

**Monitoring**:
```sql
-- Check for keys expiring soon
SELECT 
  key_name,
  key_prefix,
  expires_at,
  (expires_at - NOW()) as time_remaining
FROM api_keys
WHERE status = 'active'
  AND expires_at < NOW() + INTERVAL '30 days'
ORDER BY expires_at;
```

### Key Scopes

**Available Scopes**:
- `read` - Read-only access
- `write` - Create/update operations
- `delete` - Delete operations
- `admin` - Administrative functions

**Principle of Least Privilege**:
```typescript
// Only grant necessary scopes
const apiKey = await createApiKey({
  keyName: 'Analytics Service',
  scopes: ['read'], // Read-only
  expiresInDays: 90
});

// Not this:
const apiKey = await createApiKey({
  keyName: 'Analytics Service',
  scopes: ['read', 'write', 'delete', 'admin'], // Too permissive!
  expiresInDays: 90
});
```

---

## Row Level Security (RLS)

### Current Status

**RLS Enabled**: 442 policies across all tables

**Verification**:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return no rows!
```

### Policy Patterns

**Pattern 1: User owns resource**
```sql
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (user_id = auth.uid());
```

**Pattern 2: User can access through relationship**
```sql
CREATE POLICY "Users can view client data"
  ON campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_id = campaigns.client_id
      AND user_id = auth.uid()
    )
  );
```

**Pattern 3: Role-based access**
```sql
CREATE POLICY "Admins can view all"
  ON table_name FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

**Pattern 4: Service role bypass**
```sql
CREATE POLICY "Service role full access"
  ON table_name FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### Testing RLS Policies

```sql
-- Test as specific user
SET request.jwt.claims TO '{"sub": "user-id-here"}';

-- Try to access data
SELECT * FROM campaigns LIMIT 1;

-- Reset
RESET request.jwt.claims;
```

---

## Security Audit Logging

### What to Log

**Always Log**:
- Authentication attempts (success/failure)
- Role changes
- Permission grants/revokes
- API key creation/rotation/revocation
- Data exports
- Configuration changes
- Failed authorization attempts

**Table**: `security_audit_log`

**Example Usage**:
```sql
INSERT INTO security_audit_log (
  user_id,
  action_type,
  resource_type,
  resource_id,
  details,
  ip_address,
  user_agent,
  success
) VALUES (
  auth.uid(),
  'role_change',
  'user',
  target_user_id,
  jsonb_build_object(
    'old_role', old_role,
    'new_role', new_role
  ),
  current_setting('request.headers')::json->>'x-forwarded-for',
  current_setting('request.headers')::json->>'user-agent',
  true
);
```

### Monitoring Audit Logs

**Daily Review**:
```sql
-- Failed authentication attempts
SELECT 
  user_id,
  action_type,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM security_audit_log
WHERE action_type = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, action_type
HAVING COUNT(*) > 5;

-- Unusual activity
SELECT 
  user_id,
  action_type,
  COUNT(*) as count
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND action_type IN ('role_change', 'permission_grant', 'api_key_created')
GROUP BY user_id, action_type
ORDER BY count DESC;
```

---

## Data Protection

### Sensitive Data

**PII (Personal Identifiable Information)**:
- Recipient names
- Email addresses
- Phone numbers
- Physical addresses
- SMS opt-in records

**Protection Measures**:
1. **Encryption at Rest**: Supabase provides automatic encryption
2. **Encryption in Transit**: All traffic over HTTPS
3. **Access Control**: RLS policies restrict access
4. **Audit Logging**: All access logged

### Data Export Security

**Requirements**:
- Must be authenticated
- Audit log entry created
- Data encrypted before transfer
- Temporary files cleaned up

**Example**:
```typescript
// Secure export function
async function exportRecipients(campaignId: string) {
  // Check permission
  const canExport = await checkPermission('data.export');
  if (!canExport) throw new Error('Unauthorized');
  
  // Log export
  await logAudit({
    action: 'data_export',
    resource: 'recipients',
    resourceId: campaignId
  });
  
  // Export data
  const { data } = await supabase
    .from('recipients')
    .select('*')
    .eq('campaign_id', campaignId);
  
  // Encrypt before sending
  const encrypted = await encryptData(JSON.stringify(data));
  
  return encrypted;
}
```

---

## Webhook Security

### Signature Validation

**Twilio Webhooks**:
```typescript
import { validateRequest } from 'twilio';

const isValid = validateRequest(
  authToken,
  signature,
  url,
  params
);

if (!isValid) {
  return new Response('Invalid signature', { status: 403 });
}
```

**Stripe Webhooks**:
```typescript
import Stripe from 'stripe';

const sig = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  sig,
  webhookSecret
);
```

**Custom Webhooks**:
```typescript
// HMAC-SHA256 signature
import { createHmac } from 'crypto';

const signature = createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Validate
const expectedSignature = req.headers.get('x-webhook-signature');
const isValid = signature === expectedSignature;
```

### Timestamp Validation

**Prevent Replay Attacks**:
```typescript
const timestamp = req.headers.get('x-webhook-timestamp');
const now = Date.now() / 1000;

// Reject if older than 5 minutes
if (Math.abs(now - Number(timestamp)) > 300) {
  return new Response('Request too old', { status: 400 });
}
```

---

## Environment Variables

### Sensitive Variables

**Never Commit**:
- Database passwords
- API keys (Twilio, Stripe, etc.)
- Encryption keys
- JWT secrets
- Webhook secrets

**Storage**:
- Supabase Dashboard → Settings → Edge Functions → Environment Variables
- Local: `.env.local` (add to `.gitignore`)

**Rotation Schedule**:
- Database credentials: Every 90 days
- API keys: Every 90 days or on-demand
- Encryption keys: Annually
- JWT secrets: As needed (requires re-login)

### Variable Validation

**Startup Check**:
```typescript
// In edge function
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN'
];

for (const varName of requiredVars) {
  if (!Deno.env.get(varName)) {
    throw new Error(`Missing required env var: ${varName}`);
  }
}
```

---

## Security Checklist

### Pre-Launch

- [ ] All tables have RLS enabled
- [ ] RLS policies tested and verified
- [ ] API keys have expiration dates
- [ ] Rate limiting implemented on public endpoints
- [ ] Webhook signature validation in place
- [ ] Sensitive data encrypted at rest
- [ ] Audit logging enabled for sensitive operations
- [ ] Environment variables in secure storage
- [ ] No secrets in git repository
- [ ] JWT configuration reviewed
- [ ] CORS policies configured correctly
- [ ] Database credentials rotated recently
- [ ] Admin accounts use strong passwords
- [ ] 2FA enabled for admin accounts
- [ ] Security audit log monitoring active

### Post-Launch

- [ ] Monitor failed authentication attempts
- [ ] Review audit logs daily
- [ ] Check for expiring API keys weekly
- [ ] Rotate credentials on schedule
- [ ] Update dependencies for security patches
- [ ] Review and update RLS policies
- [ ] Test disaster recovery procedures
- [ ] Security team training current

---

## Incident Response

See [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) for full playbook.

**Security Incident Types**:
- Unauthorized access attempts
- Data breach
- API key compromise
- DDoS attack
- SQL injection attempt
- XSS attack

**Immediate Actions**:
1. Contain the incident
2. Assess impact
3. Notify security team
4. Document everything
5. Remediate vulnerability
6. Notify affected users (if required)

---

## Compliance

### GDPR (EU)

**Requirements**:
- Right to access
- Right to erasure
- Data portability
- Breach notification (72 hours)

**Implementation**:
- Export user data endpoint
- Delete user data endpoint
- Audit log of data access
- Incident response plan

### TCPA (US - SMS)

**Requirements**:
- Explicit opt-in for SMS
- Easy opt-out mechanism
- Record keeping

**Implementation**:
- `sms_opt_ins` table with timestamps
- "STOP" keyword handling
- Audit trail of consent

### SOC 2 (Optional)

**If pursuing certification**:
- Access control policies
- Encryption standards
- Audit logging
- Incident response
- Business continuity

---

**Last Updated**: December 2024  
**Next Review**: March 2025  
**Owner**: Security Team



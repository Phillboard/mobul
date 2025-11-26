# Security Model

Comprehensive security architecture for the Mobul ACE Platform including authentication, authorization, data isolation, and compliance.

## Security Principles

### Defense in Depth
Multiple layers of security:
1. Network security (HTTPS, TLS 1.3)
2. Authentication (email/password, JWT)
3. Authorization (RBAC + permissions)
4. Database security (RLS policies)
5. Application logic validation
6. Audit logging

### Least Privilege
Users granted minimum permissions necessary for their role.

### Data Isolation
Complete separation between tenants (organizations and clients) enforced at the database level.

### Security by Default
Secure defaults for all configurations:
- RLS enabled on all tables
- API endpoints require authentication by default
- Secrets encrypted in vault
- HTTPS enforced

## Authentication

### Supabase Auth
Built-in authentication system providing:
- Email/password authentication
- Email verification required
- Password strength requirements
- Secure password reset flow
- Session management

### Password Requirements
- Minimum 8 characters
- Must include uppercase, lowercase, number
- No common passwords (dictionary check)
- Passwords hashed with bcrypt

### Session Management
- **Access Token**: JWT with 1-hour expiration
- **Refresh Token**: 30-day expiration, httpOnly cookie
- **Token Refresh**: Automatic refresh before expiration
- **Session Revocation**: Logout invalidates all tokens

### Authentication Flow

```
1. User enters email + password
2. POST /auth/v1/token
3. Backend validates credentials
4. Returns JWT access token + refresh token
5. Frontend stores JWT in memory (not localStorage)
6. Refresh token stored in httpOnly cookie
7. JWT included in Authorization header for API calls
8. Automatic token refresh before expiration
```

### JWT Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Authorization

### Role-Based Access Control (RBAC)

Six primary roles with hierarchical permissions:

| Role | Level | Description |
|------|-------|-------------|
| **admin** | 1 | Full platform access, all clients, system configuration |
| **tech_support** | 2 | Support and troubleshooting, read-only access |
| **agency_owner** | 3 | Agency-level management, multiple clients |
| **company_owner** | 4 | Single client management |
| **developer** | 5 | API access, integration development |
| **call_center** | 6 | Call handling, gift card provisioning |

### Permission System

Granular permissions control specific actions:

**Campaign Permissions**
- `campaigns.view` - View campaigns
- `campaigns.create` - Create campaigns
- `campaigns.edit` - Modify campaigns
- `campaigns.delete` - Delete campaigns
- `campaigns.submit` - Submit to print vendor

**Gift Card Permissions**
- `giftcards.view` - View gift card inventory
- `giftcards.purchase` - Buy gift cards
- `giftcards.redeem` - Redeem codes
- `giftcards.provision` - Assign cards to recipients

**User Management Permissions**
- `users.view` - View user list
- `users.invite` - Send user invitations
- `users.edit` - Modify user roles/permissions
- `users.delete` - Deactivate users

**Call Center Permissions**
- `calls.view` - View call sessions
- `calls.manage` - Handle incoming calls
- `calls.confirm_redemption` - Complete call conditions

### Permission Checking

**Frontend**
```typescript
const { hasPermission, hasAnyPermission } = useAuth();

// Check single permission
if (hasPermission('campaigns.create')) {
  // Show create button
}

// Check multiple permissions (OR logic)
if (hasAnyPermission(['campaigns.create', 'campaigns.edit'])) {
  // Allow access
}
```

**Backend (Edge Functions)**
```typescript
const userPermissions = await getUserPermissions(userId);
if (!userPermissions.includes('giftcards.redeem')) {
  return new Response('Forbidden', { status: 403 });
}
```

### Role Hierarchy

Higher-level roles inherit permissions from lower levels:
- Admin can do everything
- Agency Owner can manage their clients
- Company Owner can manage their single client
- Call Center can only handle calls and redeem gift cards

## Row-Level Security (RLS)

### What is RLS?
PostgreSQL Row-Level Security policies enforce data access at the database level. Even if application logic is bypassed, RLS prevents unauthorized data access.

### RLS Policy Pattern

**Example: campaigns table**
```sql
-- Enable RLS on table
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Admin sees all campaigns
CREATE POLICY "Admins can view all campaigns"
ON campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Agency owners see their organization's client campaigns
CREATE POLICY "Agency owners can view org campaigns"
ON campaigns FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN org_members om ON c.org_id = om.org_id
    WHERE om.user_id = auth.uid()
  )
);

-- Client users see only their client's campaigns
CREATE POLICY "Client users can view own campaigns"
ON campaigns FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid()
  )
);
```

### Helper Functions

**`has_role(role_name TEXT)`**
```sql
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = role_name::app_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**`user_can_access_client(client_uuid UUID)`**
```sql
CREATE OR REPLACE FUNCTION user_can_access_client(client_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can access any client
  IF has_role('admin') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is assigned to this client
  RETURN EXISTS (
    SELECT 1 FROM client_users
    WHERE client_id = client_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Data Isolation Guarantees

| Role | Data Access |
|------|-------------|
| **Admin** | All organizations, all clients |
| **Tech Support** | All organizations, all clients (read-only) |
| **Agency Owner** | Their organization + assigned clients only |
| **Company Owner** | Their single client only |
| **Developer** | Scoped to their assigned client(s) |
| **Call Center** | Active campaigns they're assigned to only |

## API Security

### REST API Authentication

**API Key Method**
```bash
curl https://api.mobulace.com/v1/campaigns \
  -H "Authorization: Bearer ace_live_abc123..."
```

**JWT Method**
```bash
curl https://api.mobulace.com/v1/campaigns \
  -H "Authorization: Bearer eyJhbGci..."
```

### API Key Management
- Generated in Settings → API & Integrations
- Stored hashed (bcrypt) in database
- Cannot be retrieved after creation (show once)
- Can be revoked at any time
- Scoped to specific client

### Rate Limiting

| Endpoint Type | Rate Limit |
|---------------|-----------|
| Public endpoints (PURL, QR) | 1000 req/min |
| Authenticated API | 100 req/min per key |
| Gift card redemption | 10 req/min per recipient |
| Webhook receivers | 500 req/min |

### CORS Policy
- API accessible from any origin (CORS enabled)
- Preflight requests handled
- Credentials (cookies) not allowed for API endpoints

## Edge Function Security

### Authentication Levels

**Public Endpoints**
No authentication required:
- `handle-purl`: Landing page visits
- `redeem-customer-code`: Gift card redemption (code-based auth)
- `ace-form-public`: Public form rendering

**Authenticated Endpoints**
Require JWT or API key:
- `generate-recipient-tokens`: Campaign token generation
- `provision-gift-cards`: Card provisioning
- `send-gift-card-sms`: SMS delivery

**Admin-Only Endpoints**
Require admin role:
- `reset-demo-database`: Database reset
- `enrich-demo-data`: Data simulation

### JWT Verification

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Extract JWT from Authorization header
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

// Verify JWT and get user
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}

// Check permissions
const { data: roles } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);

if (!roles?.some(r => r.role === 'admin')) {
  return new Response('Forbidden', { status: 403 });
}
```

## Webhook Security

### Signature Verification

Webhooks include HMAC signature for verification:

```typescript
const signature = req.headers.get('X-ACE-Signature');
const body = await req.text();

const expectedSignature = await crypto.subtle.sign(
  'HMAC',
  webhookSecret,
  new TextEncoder().encode(body)
);

if (signature !== expectedSignature) {
  return new Response('Invalid signature', { status: 401 });
}
```

### Webhook Best Practices
- Always verify signatures
- Use HTTPS URLs only
- Implement idempotency (handle duplicate deliveries)
- Respond with 200 status quickly
- Process payload asynchronously if needed

## Data Encryption

### At Rest
- **Database**: PostgreSQL built-in encryption
- **File Storage**: S3-compatible storage with encryption
- **Backups**: Encrypted backups

### In Transit
- **HTTPS Only**: TLS 1.3 enforced
- **Certificate**: Auto-renewed Let's Encrypt certificates
- **HSTS**: HTTP Strict Transport Security enabled

### Sensitive Data

**Gift Card Codes**
- Stored encrypted in database
- Decrypted only when needed (delivery, display)
- Never logged in plaintext

**API Keys**
- Hashed with bcrypt before storage
- Original key never stored
- Cannot be retrieved, only regenerated

**Call Recordings**
- Stored in secure storage bucket
- Access-controlled via RLS
- Automatic deletion after 90 days

## Secrets Management

### Environment Variables
Stored in encrypted vault (Lovable Cloud / Supabase):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TILLO_API_KEY`
- `POSTGRID_API_KEY`

### Accessing Secrets

**Edge Functions**
```typescript
const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
```

### Secret Rotation
- Rotate secrets quarterly
- Immediate rotation on compromise
- Update all edge functions after rotation

## Audit Logging

### user_management_audit
Tracks sensitive operations:

| Column | Description |
|--------|-------------|
| action_type | 'invite', 'role_change', 'deactivate', 'delete' |
| actor_user_id | Who performed the action |
| target_user_id | Who was affected |
| details_json | Action details (old role → new role, etc.) |
| ip_address | Source IP |
| performed_at | Timestamp |

### Event Logging
All significant events tracked in `events` table:
- Campaign submissions
- Gift card redemptions
- Call completions
- Landing page visits

### Log Retention
- Audit logs: Retained indefinitely
- Event logs: Retained 2 years
- Call recordings: Retained 90 days
- Analytics events: Retained 1 year

## Compliance

### GDPR Compliance
- **Right to Access**: Users can export their data
- **Right to Deletion**: Users can request account deletion
- **Right to Portability**: Data exportable in CSV/JSON
- **Consent Tracking**: Email/SMS opt-out flags

### PCI Compliance
- **No Credit Card Storage**: Payment processing via external providers
- **Gift Card Codes**: Encrypted at rest
- **Secure Transmission**: HTTPS/TLS only

### Data Retention
- **Personal Data**: Retained while account active
- **Campaign Data**: Retained 2 years
- **Call Recordings**: 90 days
- **Deleted Accounts**: Data purged within 30 days

## Security Best Practices

### For Developers

✅ **Always check permissions** in both frontend and backend  
✅ **Use RLS policies** for all database tables  
✅ **Validate all inputs** (never trust user input)  
✅ **Sanitize outputs** (prevent XSS)  
✅ **Use parameterized queries** (prevent SQL injection)  
✅ **Log security events** for audit trail  
✅ **Rotate secrets** regularly  
✅ **Keep dependencies updated** (npm audit)  

### For Admins

✅ **Enable MFA** for admin accounts (when available)  
✅ **Review user permissions** regularly  
✅ **Monitor audit logs** for suspicious activity  
✅ **Limit API key usage** to necessary scopes  
✅ **Educate users** on security best practices  
✅ **Respond to incidents** immediately  

## Incident Response

### Security Incident Procedure
1. **Detect**: Monitoring alerts, user reports
2. **Assess**: Determine scope and impact
3. **Contain**: Revoke compromised credentials
4. **Eradicate**: Patch vulnerabilities
5. **Recover**: Restore normal operations
6. **Review**: Post-mortem analysis

### Reporting Security Issues
Contact: security@mobulace.com

## Related Documentation

- [Architecture Overview →](/admin/docs/architecture/overview)
- [Data Model →](/admin/docs/architecture/data-model)
- [API Authentication →](/admin/docs/api-reference/authentication)
- [User Management →](/admin/docs/user-guides/admin-guide)

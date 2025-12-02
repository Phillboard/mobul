# API Authentication

## Overview

The Mobul ACE Platform supports two authentication methods: API keys for server-to-server integration and JWT tokens for user sessions.

---

## API Keys

### Creating API Keys

Navigate to **Settings** → **API Keys** → **Create API Key**

### Using API Keys

```bash
curl -H "X-API-Key: mob_live_abc123..." https://api.mobulace.com/v1/campaigns
```

### Best Practices

1. **Never commit** API keys to version control
2. **Use environment variables** to store keys
3. **Rotate regularly** - Change keys every 90 days
4. **Revoke compromised keys** immediately
5. **Use different keys** for dev/staging/production

---

## JWT Tokens

### Obtaining Tokens

```typescript
const { data } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

const token = data.session.access_token;
```

### Using Tokens

```bash
curl -H "Authorization: Bearer eyJhb..." https://api.mobulace.com/v1/campaigns
```

---

## Edge Function Authentication

### JWT Authentication

All edge functions require valid JWT tokens in the Authorization header:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' \
  https://your-project.supabase.co/functions/v1/function-name
```

### Role-Based Authorization

Edge functions enforce role-based access control:

| Role | Permissions |
|------|------------|
| **admin** | All operations |
| **platform_admin** | Platform-level operations |
| **agency_owner** | Agency and client management |
| **client_admin** | Client-level operations |
| **client_user** | Campaign management |
| **call_center_agent** | Gift card provisioning |
| **call_center_supervisor** | Agent oversight |

### API Gateway Security

The API gateway provides:
- **Authentication Verification** - Validates JWT signature
- **Token Expiration Check** - Rejects expired tokens
- **Role Validation** - Enforces required permissions
- **Rate Limiting** - 100 requests/minute per user
- **Audit Logging** - Tracks all sensitive operations

### Service-to-Service Authentication

For internal edge function calls:

```typescript
import { createServiceClient } from '../_shared/api-gateway.ts';

const supabase = createServiceClient();
// Uses SUPABASE_SERVICE_ROLE_KEY for elevated permissions
```

### Authentication Errors

Common authentication error responses:

```json
{
  "success": false,
  "error": "No authorization header",
  "code": "UNAUTHORIZED"
}
```

```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

```json
{
  "success": false,
  "error": "This operation requires admin role",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### Token Refresh

Tokens expire after 1 hour. Refresh before expiration:

```typescript
const { data, error } = await supabase.auth.refreshSession();
if (data.session) {
  const newToken = data.session.access_token;
}
```

---

## Related Documentation

- [Edge Functions API](./EDGE_FUNCTIONS.md)
- [REST API](./REST_API.md)
- [Security Architecture](../2-ARCHITECTURE/SECURITY.md)

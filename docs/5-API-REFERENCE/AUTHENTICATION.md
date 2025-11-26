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

## Related Documentation

- [REST API](/admin/docs/api-reference/rest-api)
- [Security](/admin/docs/architecture/security)

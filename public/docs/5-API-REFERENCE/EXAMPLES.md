# API Examples

## Overview

Practical code examples for common API integrations.

---

## JavaScript/TypeScript

```typescript
// Create campaign
const response = await fetch('https://api.mobulace.com/v1/campaigns', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.MOBUL_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Q1 2024 Campaign',
    client_id: 'client-id',
    contact_list_id: 'list-id',
  }),
});

const campaign = await response.json();
```

---

## Python

```python
import requests

response = requests.post(
    'https://api.mobulace.com/v1/campaigns',
    headers={'X-API-Key': 'your-api-key'},
    json={
        'name': 'Q1 2024 Campaign',
        'client_id': 'client-id',
        'contact_list_id': 'list-id',
    }
)

campaign = response.json()
```

---

## cURL

```bash
curl -X POST https://api.mobulace.com/v1/campaigns \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2024 Campaign",
    "client_id": "client-id",
    "contact_list_id": "list-id"
  }'
```

---

## Related Documentation

- [REST API](/admin/docs/api-reference/rest-api)
- [Authentication](/admin/docs/api-reference/authentication)

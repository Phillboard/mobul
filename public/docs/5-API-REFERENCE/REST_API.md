# REST API Reference

## Overview

Complete REST API documentation for the Mobul ACE Platform. All endpoints require authentication via API key or JWT token.

---

## Authentication

```bash
# API Key (preferred for server-to-server)
curl -H "X-API-Key: your-api-key" https://api.mobulace.com/v1/campaigns

# JWT Token (for user sessions)
curl -H "Authorization: Bearer your-jwt-token" https://api.mobulace.com/v1/campaigns
```

---

## Campaigns API

### List Campaigns

```
GET /v1/campaigns
```

Query parameters:
- `client_id` - Filter by client
- `status` - Filter by status
- `limit` - Results per page (default 20)
- `offset` - Pagination offset

### Get Campaign

```
GET /v1/campaigns/:id
```

### Create Campaign

```
POST /v1/campaigns

{
  "name": "Q1 2024 Roofing",
  "client_id": "...",
  "contact_list_id": "...",
  "status": "draft"
}
```

---

## Recipients API

### List Recipients

```
GET /v1/campaigns/:campaign_id/recipients
```

### Get Recipient by Token

```
GET /v1/recipients/:token
```

---

## Gift Cards API

### Claim Gift Card

```
POST /v1/gift-cards/claim

{
  "pool_id": "...",
  "recipient_id": "..."
}
```

---

## Rate Limits

- 100 requests per minute per API key
- 1000 requests per hour
- Contact support for higher limits

---

## Related Documentation

- [Authentication](/admin/docs/api-reference/authentication)
- [Webhooks](/admin/docs/api-reference/webhooks)
- [Examples](/admin/docs/api-reference/examples)

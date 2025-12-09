# Webhooks

## Overview

Webhooks enable real-time notifications for campaign events. Configure webhook endpoints to receive HTTP POST requests when events occur.

---

## Webhook Events

- `campaign.created`
- `campaign.mailed`
- `recipient.delivered`
- `recipient.landed`
- `call.completed`
- `gift_card.delivered`
- `form.submitted`

---

## Webhook Payload

```json
{
  "event": "gift_card.delivered",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "gift_card_id": "...",
    "recipient_id": "...",
    "campaign_id": "...",
    "code": "AMZN-1234-5678-90AB",
    "amount": 25.00,
    "brand": "Amazon"
  }
}
```

---

## Signature Verification

```typescript
const signature = req.headers.get('X-Webhook-Signature');
const body = await req.text();

const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(body)
  .digest('hex');

if (signature !== expectedSignature) {
  return new Response('Invalid signature', { status: 401 });
}
```

---

## Best Practices

1. **Verify signatures** - Always validate webhook authenticity
2. **Return 200 quickly** - Process asynchronously if needed
3. **Handle retries** - Webhooks retry on failure
4. **Log payloads** - For debugging and audit
5. **Use HTTPS** - Secure webhook endpoints

---

## Related Documentation

- [REST API](/docs/api-reference/rest-api)
- [Edge Functions](/docs/developer-guide/edge-functions)

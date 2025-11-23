# API Reference - Mobul ACE Platform

## Overview
This document covers the Edge Functions (serverless API endpoints) available in the platform.

## Authentication
Most edge functions use JWT authentication via Supabase. Public endpoints are marked as such.

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## Core Edge Functions

### Campaign Management

#### Generate Recipient Tokens
**Endpoint**: `generate-recipient-tokens`  
**Auth**: Required  
**Method**: POST

Generates unique PURL tokens for recipients in an audience.

**Request:**
```json
{
  "audienceId": "uuid",
  "campaignId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "tokensGenerated": 1000,
  "audienceId": "uuid"
}
```

#### Handle PURL
**Endpoint**: `handle-purl`  
**Auth**: Public  
**Method**: GET/POST

Processes personalized URL visits and tracks engagement.

**URL Pattern**: `/c/:campaignId/:token`

**Response:**
```json
{
  "campaign": { ... },
  "recipient": { ... },
  "eventLogged": "purl_viewed",
  "utmParams": { ... }
}
```

---

### Gift Cards

#### Purchase Gift Cards
**Endpoint**: `purchase-gift-cards`  
**Auth**: Required  
**Method**: POST

Purchase gift cards via Tillo API.

**Request:**
```json
{
  "poolId": "uuid",
  "quantity": 100,
  "brandCode": "AMAZON"
}
```

**Response:**
```json
{
  "success": true,
  "purchaseId": "uuid",
  "cardsOrdered": 100
}
```

#### Check Gift Card Balance
**Endpoint**: `check-gift-card-balance`  
**Auth**: Required  
**Method**: POST

Check balance for gift cards via API provider.

**Request:**
```json
{
  "cardIds": ["uuid1", "uuid2"],
  "poolId": "uuid" // Alternative to cardIds
}
```

**Response:**
```json
{
  "message": "Checked 5 cards",
  "results": [
    {
      "cardId": "uuid",
      "cardCode": "****1234",
      "previousBalance": 25.00,
      "newBalance": 20.00,
      "status": "success"
    }
  ]
}
```

#### Provision Gift Card for Call Center
**Endpoint**: `provision-gift-card-for-call-center`  
**Auth**: Required  
**Method**: POST

Claim and provision a gift card for call center agent.

**Request:**
```json
{
  "poolId": "uuid",
  "recipientId": "uuid",
  "callSessionId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "card": {
    "id": "uuid",
    "cardCode": "ABCD1234",
    "cardValue": 25.00
  }
}
```

#### Validate Gift Card Code
**Endpoint**: `validate-gift-card-code`  
**Auth**: Public  
**Method**: POST

Validate a customer redemption code.

**Request:**
```json
{
  "code": "REDEEM123",
  "campaignId": "uuid" // Optional
}
```

**Response:**
```json
{
  "valid": true,
  "giftCardId": "uuid",
  "value": 25.00,
  "brand": "Amazon",
  "expirationDate": "2025-12-31"
}
```

#### Redeem Gift Card (Embed)
**Endpoint**: `redeem-gift-card-embed`  
**Auth**: Public  
**Method**: POST

Redeem a gift card via embed widget.

**Request:**
```json
{
  "redemptionCode": "REDEEM123",
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-0100"
  }
}
```

**Response:**
```json
{
  "success": true,
  "giftCard": { ... },
  "deliveryMethod": "sms",
  "message": "Gift card sent via SMS"
}
```

---

### Call Center

#### Handle Incoming Call
**Endpoint**: `handle-incoming-call`  
**Auth**: Public (Twilio webhook)  
**Method**: POST

Processes incoming calls from Twilio.

**Request:** (Twilio webhook format)
```
From=+15550100
To=+15550200
CallSid=CA1234567890
```

**Response:** (TwiML)
```xml
<Response>
  <Dial>+15550300</Dial>
</Response>
```

#### Update Call Status
**Endpoint**: `update-call-status`  
**Auth**: Public (Twilio webhook)  
**Method**: POST

Updates call session status from Twilio webhooks.

#### Complete Condition
**Endpoint**: `complete-condition`  
**Auth**: Required  
**Method**: POST

Mark a campaign condition as completed.

**Request:**
```json
{
  "callSessionId": "uuid",
  "conditionNumber": 1,
  "notes": "Customer scheduled appointment"
}
```

---

### Ace Forms

#### Generate Ace Form AI
**Endpoint**: `generate-ace-form-ai`  
**Auth**: Required  
**Method**: POST

Generate form configuration using AI.

**Request:**
```json
{
  "prompt": "Create a lead capture form for a dental office",
  "clientId": "uuid"
}
```

**Response:**
```json
{
  "formConfig": {
    "fields": [...],
    "settings": {...}
  }
}
```

#### Submit Ace Form
**Endpoint**: `submit-ace-form`  
**Auth**: Public  
**Method**: POST

Submit a form entry.

**Request:**
```json
{
  "formId": "uuid",
  "submissionData": {
    "firstName": "Jane",
    "email": "jane@example.com"
  },
  "redemptionToken": "uuid", // Optional
  "ipAddress": "1.2.3.4",
  "userAgent": "..."
}
```

**Response:**
```json
{
  "success": true,
  "submissionId": "uuid",
  "giftCardProvisioned": true
}
```

---

### CRM & Integrations

#### CRM Webhook Receiver
**Endpoint**: `crm-webhook-receiver`  
**Auth**: Public (with webhook secret)  
**Method**: POST

Receives webhooks from integrated CRMs.

**Request:**
```json
{
  "eventType": "deal.won",
  "data": { ... }
}
```

#### Dispatch Zapier Event
**Endpoint**: `dispatch-zapier-event`  
**Auth**: Public  
**Method**: POST

Triggers Zapier webhooks for campaign events.

**Request:**
```json
{
  "event": "gift_card_redeemed",
  "data": { ... },
  "zapierConnectionId": "uuid"
}
```

#### Zapier Incoming Webhook
**Endpoint**: `zapier-incoming-webhook`  
**Auth**: Public  
**Method**: POST

Receives data from Zapier workflows.

---

### Landing Pages

#### Generate Landing Page
**Endpoint**: `generate-landing-page`  
**Auth**: Required  
**Method**: POST

Generate landing page HTML/CSS using AI.

**Request:**
```json
{
  "prompt": "Create a landing page for a dental practice",
  "brandKit": { ... },
  "clientId": "uuid"
}
```

**Response:**
```json
{
  "html": "<html>...</html>",
  "css": "...",
  "preview": "..."
}
```

---

### Templates

#### Generate Template Design
**Endpoint**: `generate-template-design`  
**Auth**: Required  
**Method**: POST

Generate direct mail template design using AI.

**Request:**
```json
{
  "prompt": "Create a 6x9 postcard for a dentist",
  "size": "6x9",
  "brandKit": { ... }
}
```

#### Regenerate Template Element
**Endpoint**: `regenerate-template-element`  
**Auth**: Required  
**Method**: POST

Regenerate a specific element in a template.

**Request:**
```json
{
  "templateId": "uuid",
  "elementId": "uuid",
  "prompt": "Make the headline more attention-grabbing"
}
```

---

### AI Chat

#### Dr Phillip Chat
**Endpoint**: `dr-phillip-chat`  
**Auth**: Public  
**Method**: POST

AI marketing consultant chat interface.

**Request:**
```json
{
  "message": "How can I improve my campaign?",
  "chatId": "uuid",
  "history": [...]
}
```

**Response:**
```json
{
  "response": "Here are some suggestions...",
  "chatId": "uuid"
}
```

#### AI Design Chat
**Endpoint**: `ai-design-chat`  
**Auth**: Required  
**Method**: POST

AI-powered design iteration chat.

**Request:**
```json
{
  "message": "Make the logo bigger",
  "designId": "uuid",
  "designType": "landing_page"
}
```

---

## Rate Limits

Public endpoints have rate limiting:
- **Default**: 10 requests per minute per IP
- **Form submissions**: 5 submissions per hour per IP
- **Gift card operations**: 100 per hour per client

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## Webhooks

### Twilio Webhooks
The platform receives webhooks from Twilio for:
- Incoming calls: `handle-incoming-call`
- Call status updates: `update-call-status`
- SMS status: `send-gift-card-sms`

### CRM Webhooks
Configure webhooks in your CRM to point to:
```
https://[project-id].supabase.co/functions/v1/crm-webhook-receiver
```

Include the webhook secret in the `X-Webhook-Secret` header.

## Testing

Use curl to test endpoints:

```bash
# Public endpoint
curl -X POST https://[project-id].supabase.co/functions/v1/handle-purl \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"uuid","token":"abc123"}'

# Authenticated endpoint
curl -X POST https://[project-id].supabase.co/functions/v1/generate-recipient-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"audienceId":"uuid","campaignId":"uuid"}'
```

## SDK Usage

Use the Supabase JS client to invoke functions:

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ... }
});
```

## Support

For API issues or questions, contact support or refer to the developer guide.

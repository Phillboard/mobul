# Edge Functions API Reference

## Overview

Edge Functions provide server-side API endpoints with authentication, validation, and business logic. All functions follow API-first architecture with centralized security and error handling.

---

## Architecture

### API Gateway Pattern

All edge functions use a unified gateway providing:
- **JWT Authentication** - Validates user tokens
- **Role-Based Authorization** - Enforces permission requirements
- **Request Validation** - Schema-based input validation
- **Error Handling** - Standardized error responses
- **Audit Logging** - Tracks sensitive operations
- **Rate Limiting** - Prevents abuse

### Business Rules Layer

Reusable business logic modules in `_shared/business-rules/`:
- `credit-rules.ts` - Credit allocation and validation
- `gift-card-rules.ts` - Provisioning eligibility
- `campaign-rules.ts` - Campaign lifecycle validation
- `organization-rules.ts` - Hierarchy and permissions

---

## Gift Card Provisioning Functions

### provision-gift-card-unified

Core provisioning with intelligent fallback (inventory → Tillo API).

**Endpoint**: `POST /functions/v1/provision-gift-card-unified`

**Authentication**: Service role (internal use)

**Request**:
```json
{
  "campaignId": "uuid",
  "recipientId": "uuid",
  "brandId": "uuid",
  "denomination": 25,
  "conditionNumber": 1
}
```

**Response**:
```json
{
  "success": true,
  "card": {
    "cardCode": "ABC-1234-XXXX",
    "cardNumber": "1234567890123456",
    "denomination": 25,
    "brandName": "Amazon",
    "brandLogo": "https://...",
    "expirationDate": "2025-12-31",
    "source": "inventory"
  },
  "billing": {
    "ledgerId": "uuid",
    "billedEntity": "Client Name",
    "billedEntityId": "uuid",
    "amountBilled": 25.00,
    "profit": 1.25
  }
}
```

### provision-gift-card-for-call-center

Call center-specific provisioning with SMS opt-in validation and delivery.

**Endpoint**: `POST /functions/v1/provision-gift-card-for-call-center`

**Authentication**: Required (agent/supervisor role)

**Request**:
```json
{
  "redemptionCode": "ABC123",
  "deliveryPhone": "+1234567890",
  "deliveryEmail": "user@example.com",
  "conditionNumber": 1,
  "callSessionId": "uuid"
}
```

**Key Features**:
- SMS opt-in verification (TCPA compliant)
- Automatic delivery via SMS or email
- Call session tracking
- Duplicate prevention

**Response**:
```json
{
  "success": true,
  "card": { /* card details */ },
  "billing": { /* billing info */ },
  "recipient": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "deliveryInfo": {
    "method": "sms",
    "destination": "+1234567890"
  }
}
```

###provision-gift-card-from-api

API testing and diagnostics with test mode support.

**Endpoint**: `POST /functions/v1/provision-gift-card-from-api`

**Authentication**: Required (admin role for test mode)

**Test Mode Request**:
```json
{
  "testMode": true,
  "testConfig": {
    "api_provider": "Tillo",
    "card_value": 25
  }
}
```

**Production Mode Request**:
```json
{
  "testMode": false,
  "campaignId": "uuid",
  "recipientId": "uuid",
  "brandId": "uuid",
  "denomination": 25
}
```

---

## Campaign Validation Functions

### validate-campaign-budget

Real-time budget validation before campaign launch.

**Endpoint**: `POST /functions/v1/validate-campaign-budget`

**Authentication**: Required

**Request**:
```json
{
  "campaignId": "uuid",
  "recipientCount": 100,
  "giftCardDenomination": 25,
  "mailCostPerPiece": 0.55
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "estimatedCost": 2555.00,
    "availableCredits": 5000.00
  }
}
```

**Error Response**:
```json
{
  "success": true,
  "data": {
    "valid": false,
    "estimatedCost": 2555.00,
    "availableCredits": 1000.00,
    "shortfall": 1555.00,
    "error": "Insufficient credits"
  }
}
```

### validate-gift-card-configuration

Validate brand/denomination availability and inventory.

**Endpoint**: `POST /functions/v1/validate-gift-card-configuration`

**Authentication**: Required

**Request**:
```json
{
  "campaignId": "uuid",
  "brandId": "uuid",
  "denomination": 25,
  "conditionNumber": 1
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": ["Low inventory - 5 cards remaining"],
    "inventoryStatus": {
      "availableCount": 5,
      "source": "inventory",
      "message": "5 cards available in inventory"
    }
  }
}
```

---

## Organization Management Functions

### update-organization-status

Update organization status with cascade logic.

**Endpoint**: `POST /functions/v1/update-organization-status`

**Authentication**: Required (admin only)

**Request**:
```json
{
  "organizationId": "uuid",
  "organizationType": "agency",
  "status": "archived",
  "reason": "End of contract",
  "cascadeArchive": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "organizationId": "uuid",
    "newStatus": "archived",
    "cascadeEffects": {
      "archivedClients": 5,
      "disabledUsers": 12,
      "pausedCampaigns": 3
    },
    "warnings": [
      "Users will lose access but can be restored",
      "3 active campaign(s) will be paused"
    ]
  }
}
```

---

## Credit Management Functions

### calculate-credit-requirements

Server-side credit calculation with validation.

**Endpoint**: `POST /functions/v1/calculate-credit-requirements`

**Authentication**: Required

**Request**:
```json
{
  "recipientCount": 100,
  "giftCardDenomination": 25,
  "mailCostPerPiece": 0.55
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "giftCardTotal": 2500.00,
    "mailTotal": 55.00,
    "grandTotal": 2555.00,
    "breakdown": {
      "perRecipient": {
        "giftCard": 25.00,
        "mail": 0.55,
        "total": 25.55
      }
    }
  }
}
```

---

## Testing & Demo Functions

### simulate-mail-tracking

Simulate USPS tracking events for testing.

**Endpoint**: `POST /functions/v1/simulate-mail-tracking`

**Authentication**: Required

**Request**:
```json
{
  "campaignId": "uuid",
  "deliveryRate": 85,
  "returnRate": 5
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "campaignId": "uuid",
    "deliveredCount": 85,
    "returnedCount": 5,
    "inTransitCount": 10,
    "totalRecipients": 100
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR"
}
```

### Common Error Codes

- `UNAUTHORIZED` - No or invalid authentication token
- `INVALID_TOKEN` - Expired or malformed JWT
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {
    "errors": ["Detailed error 1", "Detailed error 2"]
  }
}
```

---

## Authentication

### JWT Token

All requests require Bearer token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Required Roles

| Function | Required Role |
|----------|--------------|
| provision-gift-card-unified | Service (internal) |
| provision-gift-card-for-call-center | Agent/Supervisor |
| provision-gift-card-from-api | Admin (test mode) |
| validate-campaign-budget | Any authenticated |
| validate-gift-card-configuration | Any authenticated |
| update-organization-status | Admin only |
| calculate-credit-requirements | Any authenticated |
| simulate-mail-tracking | Any authenticated |

---

## Rate Limiting

Rate limits apply per user:
- **Default**: 100 requests per minute
- **Burst**: Up to 200 requests per minute
- **Headers**: Rate limit info in response headers

---

## Testing

### Local Testing

```bash
# Serve function locally
supabase functions serve FUNCTION_NAME

# Test with curl
curl -X POST http://localhost:54321/functions/v1/FUNCTION_NAME \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Integration Tests

See `src/test/edge-functions.test.ts` for comprehensive test suite.

---

## Related Documentation

- [Developer Guide: Edge Functions](../4-DEVELOPER-GUIDE/EDGE_FUNCTIONS.md) - Development patterns
- [Implementation Details](../7-IMPLEMENTATION/API_FIRST_IMPLEMENTATION_COMPLETE.md) - Full technical reference
- [Frontend Integration](../7-IMPLEMENTATION/FRONTEND_MIGRATION_GUIDE.md) - Using APIs from React


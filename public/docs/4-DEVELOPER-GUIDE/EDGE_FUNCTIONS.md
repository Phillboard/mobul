# Edge Functions Development Guide

## Overview

Edge Functions implement the API-first architecture for the Mobul ACE Platform. All business logic runs server-side with proper authentication, validation, and audit logging.

---

## API-First Architecture

### Architecture Layers

```
Frontend (React)
      ↓
Edge Functions (Deno)
      ↓
Business Rules Layer
      ↓
Database (PostgreSQL)
```

### Key Principles

1. **All Business Logic Server-Side** - No client-side processing
2. **Authentication Required** - JWT tokens validated on every request
3. **Input Validation** - Schema-based validation before processing
4. **Audit Logging** - All sensitive operations tracked
5. **Error Handling** - Standardized error responses

---

## API Gateway Pattern

### Using the API Gateway

All new edge functions should use the `withApiGateway` wrapper:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withApiGateway } from '../_shared/api-gateway.ts';
import { MyRequestSchema } from '../_shared/schemas/validation.ts';

interface MyRequest {
  campaignId: string;
  amount: number;
}

interface MyResponse {
  success: boolean;
  result: any;
}

serve(
  withApiGateway<MyRequest, MyResponse>(
    async (request, context) => {
      // Your business logic here
      // context.user - authenticated user
      // context.client - Supabase client
      
      const result = await processRequest(request);
      
      return {
        success: true,
        result,
      };
    },
    {
      requireAuth: true,
      requiredRole: 'client_admin',
      validateSchema: MyRequestSchema,
      rateLimitKey: 'my_operation',
      auditAction: 'perform_action',
    }
  )
);
```

### Gateway Features

The API gateway automatically provides:

- ✅ **CORS Handling** - Preflight requests
- ✅ **Authentication** - JWT token validation
- ✅ **Authorization** - Role-based access control
- ✅ **Validation** - Request schema validation
- ✅ **Error Handling** - Standardized responses
- ✅ **Rate Limiting** - Per-user limits
- ✅ **Audit Logging** - Sensitive operation tracking

---

## Business Rules Layer

### Shared Business Logic

Business rules are centralized in `supabase/functions/_shared/business-rules/`:

**credit-rules.ts**:
```typescript
import { validateCreditAllocation } from '../_shared/business-rules/credit-rules.ts';

const validation = validateCreditAllocation(request, fromBalance);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

**gift-card-rules.ts**:
```typescript
import { checkProvisioningEligibility } from '../_shared/business-rules/gift-card-rules.ts';

const eligibility = checkProvisioningEligibility(recipientStatus, 'sms');
if (!eligibility.eligible) {
  throw new Error(eligibility.reason);
}
```

**campaign-rules.ts**:
```typescript
import { validateCampaignBudget } from '../_shared/business-rules/campaign-rules.ts';

const budgetCheck = validateCampaignBudget(
  recipientCount,
  giftCardDenomination,
  mailCost,
  availableCredits
);
```

**organization-rules.ts**:
```typescript
import { canAccessClient } from '../_shared/business-rules/organization-rules.ts';

const access = canAccessClient(
  userRole,
  userClientId,
  userAgencyId,
  targetClientId,
  targetClientAgencyId
);
```

### Creating New Business Rules

1. Add function to appropriate rules file
2. Export from the module
3. Add unit tests
4. Use in edge functions

Example:
```typescript
// In _shared/business-rules/my-rules.ts
export function validateMyOperation(params) {
  if (params.amount < 0) {
    return { valid: false, error: 'Amount must be positive' };
  }
  return { valid: true };
}

// In your edge function
import { validateMyOperation } from '../_shared/business-rules/my-rules.ts';

const validation = validateMyOperation({ amount: request.amount });
if (!validation.valid) {
  throw new Error(validation.error);
}
```

---

## Validation Schemas

### Using Validation Schemas

Schemas are defined in `supabase/functions/_shared/schemas/validation.ts`:

```typescript
export const MyRequestSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, ['campaignId', 'amount']);

    if (!isValidUUID(data.campaignId)) {
      errors.push('campaignId must be a valid UUID');
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('amount must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};
```

### Helper Functions

Available validation helpers:
- `checkRequired(data, fields)` - Check required fields
- `isValidEmail(email)` - Validate email format
- `isValidUUID(uuid)` - Validate UUID format

---

## Service-to-Service Calls

### Calling Other Edge Functions

Use the `callEdgeFunction` helper:

```typescript
import { callEdgeFunction } from '../_shared/api-gateway.ts';

// Call another edge function
const result = await callEdgeFunction<RequestType, ResponseType>(
  'other-function-name',
  {
    key: 'value',
  }
);
```

### Creating Service Client

For direct database access with elevated permissions:

```typescript
import { createServiceClient } from '../_shared/api-gateway.ts';

const supabase = createServiceClient();
// Has service role permissions
```

---

## Local Development

### Running Functions Locally

```bash
# Serve all functions
supabase functions serve

# Serve specific function
supabase functions serve my-function

# With environment variables
supabase functions serve --env-file .env.local
```

### Testing Locally

```bash
# Test with curl
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# Or use Postman/Insomnia
```

### Hot Reload

Functions automatically reload on file changes when using `supabase functions serve`.

---

## Deployment

### Deploy Single Function

```bash
supabase functions deploy my-function
```

### Deploy All Functions

```powershell
# Use our deployment script
.\scripts\deploy-edge-functions.ps1
```

### Deploy with Secrets

```bash
# Set secrets
supabase secrets set TILLO_API_KEY=your_key

# Deploy
supabase functions deploy my-function
```

---

## Testing

### Unit Tests

Test business rules in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { validateCreditAllocation } from './credit-rules.ts';

describe('Credit Rules', () => {
  it('should validate credit allocation', () => {
    const result = validateCreditAllocation(
      { amount: 100, fromEntityType: 'platform', ... },
      500
    );
    expect(result.valid).toBe(true);
  });
});
```

### Integration Tests

Test edge functions end-to-end:

```typescript
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Edge Functions', () => {
  it('should validate budget', async () => {
    const { data, error } = await supabase.functions.invoke(
      'validate-campaign-budget',
      {
        body: {
          campaignId: testId,
          recipientCount: 10,
          giftCardDenomination: 25,
        },
      }
    );

    expect(error).toBeNull();
    expect(data.success).toBe(true);
  });
});
```

See `src/test/edge-functions.test.ts` for comprehensive examples.

---

## Error Handling

### Standard Error Response

```typescript
throw new Error('User-friendly error message');

// Results in:
{
  "success": false,
  "error": "User-friendly error message",
  "code": "INTERNAL_ERROR"
}
```

### Custom Error Codes

```typescript
import { ApiError } from '../_shared/api-gateway.ts';

throw new ApiError(
  'Insufficient credits',
  'INSUFFICIENT_CREDITS',
  400
);

// Results in:
{
  "success": false,
  "error": "Insufficient credits",
  "code": "INSUFFICIENT_CREDITS"
}
```

---

## Best Practices

### Security

1. **Always validate input** - Use validation schemas
2. **Check permissions** - Use role-based authorization
3. **Sanitize data** - Never trust client input
4. **Use service role carefully** - Only when necessary
5. **Log sensitive operations** - Use audit logging

### Performance

1. **Minimize database queries** - Use joins and batching
2. **Cache when possible** - Use React Query on frontend
3. **Avoid N+1 queries** - Use bulk operations
4. **Set timeouts** - Prevent hanging requests
5. **Monitor performance** - Track response times

### Maintainability

1. **Use business rules** - Centralize logic
2. **Write tests** - Cover critical paths
3. **Document functions** - Add JSDoc comments
4. **Handle errors properly** - Provide useful messages
5. **Follow patterns** - Use API gateway consistently

---

## Monitoring

### View Logs

```bash
# Tail logs for all functions
supabase functions logs --tail

# View specific function logs
supabase functions logs my-function --tail

# Filter by error level
supabase functions logs --level error
```

### Check Function Status

```bash
# List all functions
supabase functions list

# Check deployment status
supabase functions status my-function
```

---

## Related Documentation

- [Edge Functions API Reference](../5-API-REFERENCE/EDGE_FUNCTIONS.md)
- [Authentication](../5-API-REFERENCE/AUTHENTICATION.md)
- [API Examples](../5-API-REFERENCE/EXAMPLES.md)
- [Implementation Details](../7-IMPLEMENTATION/API_FIRST_IMPLEMENTATION_COMPLETE.md)
- [Deployment Guide](../7-IMPLEMENTATION/QUICK_START_DEPLOYMENT.md)

# Frontend API Layer

> Centralized API client and hooks for calling Supabase Edge Functions.

## Overview

- **API Client:** `client.ts` - Single entry point for all edge function calls
- **Endpoints Registry:** `endpoints.ts` - Typed endpoint names by domain
- **Domain Hooks:** `hooks/*.ts` - TanStack Query hooks by business domain
- **Error Handling:** `errorHandling.ts`, `errorLogger.ts`, `errorTracking.ts`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ React Components                                            │
│ (UI state, user interactions)                               │
├─────────────────────────────────────────────────────────────┤
│ Feature Hooks (@features/*/hooks/)                          │
│ - Domain-specific business logic                            │
│ - Cache invalidation strategies                             │
│ - Combined queries/mutations                                │
│ - Toast notifications                                       │
├─────────────────────────────────────────────────────────────┤
│ Core API Hooks (@core/api/hooks/)                          │
│ - Generic typed hooks per domain                            │
│ - Direct edge function wrappers                             │
│ - Type definitions (Request/Response)                       │
├─────────────────────────────────────────────────────────────┤
│ API Client (@core/api/client.ts)                           │
│ - callEdgeFunction() - authenticated calls                  │
│ - callPublicEdgeFunction() - public endpoints               │
│ - callEdgeFunctionWithFormData() - file uploads             │
│ - Retry logic, timeout, interceptors                        │
├─────────────────────────────────────────────────────────────┤
│ Supabase Edge Functions                                     │
│ (Backend - see supabase/functions/README.md)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `client.ts` | API client with auth, retry, interceptors |
| `endpoints.ts` | Typed endpoint registry by domain |
| `errorHandling.ts` | User-facing error handling with toasts |
| `errorLogger.ts` | Database error logging |
| `errorTracking.ts` | External error tracking (Sentry) |
| `requestTracer.ts` | Gift card provisioning tracing |
| `hooks/index.ts` | Barrel export for all API hooks |

---

## API Client Usage

### Authenticated Calls

```typescript
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';

// Simple call
const data = await callEdgeFunction(
  Endpoints.giftCards.provision,
  { brandId, denomination, recipientId }
);

// With options
const data = await callEdgeFunction(
  Endpoints.campaigns.validateBudget,
  { campaignId, recipientCount },
  { timeout: 60000, retries: 3 }
);
```

### Public Calls (No Auth)

```typescript
import { callPublicEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';

const data = await callPublicEdgeFunction(
  Endpoints.forms.submit,
  { formId, data: formData }
);
```

### File Uploads

```typescript
import { callEdgeFunctionWithFormData } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';

const formData = new FormData();
formData.append('file', csvFile);
formData.append('client_id', clientId);

const result = await callEdgeFunctionWithFormData(
  Endpoints.imports.audience,
  formData,
  { timeout: 120000 }
);
```

---

## Endpoints Registry

Import from `@core/api/endpoints`:

```typescript
import { Endpoints } from '@core/api/endpoints';

// Instead of hardcoded strings:
// ❌ supabase.functions.invoke('provision-gift-card-unified', ...)

// Use typed endpoints:
// ✅ callEdgeFunction(Endpoints.giftCards.provisionUnified, ...)
```

### Available Domains

| Domain | Example Endpoints |
|--------|-------------------|
| `Endpoints.giftCards` | `provision`, `revoke`, `checkBalance`, `validateCode` |
| `Endpoints.campaigns` | `validateBudget`, `evaluateConditions`, `saveDraft` |
| `Endpoints.messaging` | `sendEmail`, `sendSms`, `sendGiftCardSms` |
| `Endpoints.telephony` | `getStatus`, `updateConfig`, `provisionNumber` |
| `Endpoints.ai` | `openaiChat`, `generateLandingPage`, `designChat` |
| `Endpoints.forms` | `submit`, `submitLead`, `handlePurl` |
| `Endpoints.imports` | `audience`, `contacts`, `giftCards` |
| `Endpoints.exports` | `audience`, `database`, `poolCards` |
| `Endpoints.admin` | `allocateCredit`, `generateApiKey`, `validateEnvironment` |
| `Endpoints.integrations` | `dispatchZapierEvent`, `triggerWebhook` |
| `Endpoints.callCenter` | `completeCondition`, `handleCall` |

---

## Core API Hooks

Import from `@core/api/hooks`:

```typescript
import { 
  useProvisionGiftCard,
  useSendGiftCardEmail,
  useValidateCampaignBudget,
  // ... 50+ hooks
} from '@core/api/hooks';
```

### Hook Files by Domain

| File | Domain | Hooks |
|------|--------|-------|
| `useGiftCardAPI.ts` | Gift Cards | `useProvisionGiftCard`, `useRevokeGiftCard`, `useCheckBalance`, ... |
| `useCampaignAPI.ts` | Campaigns | `useSaveCampaignDraft`, `useValidateCampaignBudget`, ... |
| `useMessagingAPI.ts` | SMS/Email | `useSendGiftCardSms`, `useSendEmail`, ... |
| `useTelephonyAPI.ts` | Twilio | `useTwilioStatus`, `useUpdateTwilioConfig`, ... |
| `useFormAPI.ts` | Forms | `useSubmitForm`, `useHandlePurl`, ... |
| `useAIAPI.ts` | AI | `useOpenAIChat`, `useGenerateLandingPage`, ... |
| `useAdminAPI.ts` | Admin | `useAllocateCredit`, `useDiagnoseProvisioning`, ... |
| `useImportExportAPI.ts` | Import/Export | `useImportAudience`, `useExportDatabase`, ... |
| `useIntegrationsAPI.ts` | Integrations | `useDispatchZapierEvent`, `useApproveCustomerCode`, ... |

---

## Adding a New API Hook

### 1. Add Endpoint

```typescript
// src/core/api/endpoints.ts
export const Endpoints = {
  myDomain: {
    myFunction: 'my-edge-function-name',
  },
  // ...
};
```

### 2. Add Hook

```typescript
// src/core/api/hooks/useMyDomainAPI.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// Types
export interface MyRequest {
  param1: string;
  param2: number;
}

export interface MyResponse {
  success: boolean;
  data: unknown;
}

// Mutation hook
export function useMyFunction() {
  return useMutation({
    mutationFn: (request: MyRequest) =>
      callEdgeFunction<MyResponse>(
        Endpoints.myDomain.myFunction,
        request
      ),
  });
}

// Query hook (for read operations)
export function useMyData(id: string) {
  return useQuery({
    queryKey: ['my-data', id],
    queryFn: () =>
      callEdgeFunction<MyResponse>(
        Endpoints.myDomain.myFunction,
        { id }
      ),
    enabled: !!id,
  });
}
```

### 3. Export from Barrel

```typescript
// src/core/api/hooks/index.ts
export {
  useMyFunction,
  useMyData,
  type MyRequest,
  type MyResponse,
} from './useMyDomainAPI';
```

---

## Error Handling

### User-Facing Errors

```typescript
import { handleApiError, handleSuccess } from '@core/api/errorHandling';

try {
  const result = await callEdgeFunction(...);
  handleSuccess('Operation completed!', 'MyComponent');
} catch (error) {
  await handleApiError(error, 'MyComponent', 'Custom message');
}
```

### Database Logging

```typescript
import { logApiError, createScopedLogger } from '@core/api/errorLogger';

const logger = createScopedLogger('my-component');

try {
  // ...
} catch (error) {
  await logger.error(error, { metadata: 'additional info' });
}
```

---

## Type Safety

All hooks export request/response types:

```typescript
import type {
  ProvisionGiftCardRequest,
  ProvisionGiftCardResponse,
} from '@core/api/hooks';
```

---

## Migration History

| Phase | Description | Files Changed |
|-------|-------------|---------------|
| 19 | Backend API Gateway consolidation | 94 edge functions |
| 20 | Frontend API hooks creation | 10 hook files |
| 21 | Replace all `supabase.functions.invoke` | ~80 frontend files |
| 22 | Remove duplicate services | 3 files deleted |
| 23 | Audit feature hooks (none removed) | Verification only |
| 24 | Final audit and documentation | Documentation |

---

## Rules

1. **NEVER** use `supabase.functions.invoke` directly in components
2. **ALWAYS** use `callEdgeFunction` or hooks from `@core/api/hooks`
3. **ALWAYS** add new endpoints to `endpoints.ts`
4. **ALWAYS** export types with hooks

---

Last updated: February 2026

# API SYSTEMS COMPREHENSIVE AUDIT & FIX PLAN

**Date:** December 10, 2025  
**Scope:** Full API infrastructure review  
**Status:** Multiple inconsistencies identified

---

## EXECUTIVE SUMMARY

### Current State Analysis

| Component | Status | Issues |
|-----------|--------|--------|
| **Edge Functions** | 🟡 Mixed | 98 functions, inconsistent patterns |
| **API Client** | 🟢 Good | Centralized client exists but underused |
| **API Gateway** | 🔴 Underused | Only 4-8 of 98 functions use it |
| **Supabase Client** | 🔴 Duplicated | 2 clients, split usage (192 vs 82) |
| **Response Types** | 🟢 Good | Well-defined in types/api-responses.ts |
| **Error Handling** | 🟡 Inconsistent | No standard pattern |
| **CORS** | 🟡 Manual | Each function defines its own |
| **Authentication** | 🔴 Mixed | SERVICE_ROLE vs ANON_KEY inconsistent |

### Key Statistics

| Metric | Value |
|--------|-------|
| Total Edge Functions | 98 |
| Using API Gateway wrapper | 8 (8%) |
| Using SERVICE_ROLE_KEY | 79 |
| Using ANON_KEY | 20 |
| Using esm.sh imports | 52 |
| Using npm: imports | 33 |
| Using Deno.serve | 41 |
| Using serve from std | 55 |

### Frontend API Usage

| Method | Usage Count |
|--------|-------------|
| supabase.functions.invoke | 125 |
| callEdgeFunction (centralized) | 12 |
| Direct fetch to functions/v1 | 11 |
| TanStack useMutation | 289 |
| TanStack useQuery | 578 |

---

## CRITICAL ISSUE #1: DUPLICATE SUPABASE CLIENTS

### Problem
Two identical Supabase client instances exist:
1. `src/core/services/supabase/client.ts` (192 imports)
2. `src/integrations/supabase/client.ts` (82 imports)

### Impact
- Potential for inconsistent authentication state
- Confusion for developers
- Unnecessary code duplication

### Fix
**Keep:** `src/core/services/supabase/client.ts`  
**Delete:** `src/integrations/supabase/client.ts`  
**Update:** All 82 imports to use `@core/services/supabase`

---

## CRITICAL ISSUE #2: INCONSISTENT EDGE FUNCTION PATTERNS

### Current Patterns (CHAOS)

**Pattern 1: API Gateway (Recommended - only 8 functions)**
```typescript
import { withApiGateway, successResponse, errorResponse } from '../_shared/api-gateway.ts';

export default withApiGateway(handler, { requireAuth: true });
```

**Pattern 2: Manual CORS + Deno.serve (41 functions)**
```typescript
const corsHeaders = { 'Access-Control-Allow-Origin': '*', ... };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  // ...
});
```

**Pattern 3: Manual CORS + serve from std (55 functions)**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = { ... };
serve(async (req) => { ... });
```

### Import Inconsistencies
- **esm.sh:** 52 functions use `https://esm.sh/@supabase/supabase-js@2.39.3`
- **npm:** 33 functions use `npm:@supabase/supabase-js@2`
- Version inconsistency risk!

### Authentication Inconsistencies
- **SERVICE_ROLE_KEY:** 79 functions (admin access)
- **ANON_KEY:** 20 functions (user-scoped access)
- No clear documentation on which to use when

---

## CRITICAL ISSUE #3: FRONTEND API CALL FRAGMENTATION

### Current State
Three different methods to call edge functions:

**Method 1: Centralized API Client (BEST - only 12 uses)**
```typescript
import { callEdgeFunction } from '@core/api/client';
const result = await callEdgeFunction('function-name', body);
```

**Method 2: supabase.functions.invoke (125 uses)**
```typescript
const { data, error } = await supabase.functions.invoke('function-name', { body });
```

**Method 3: Direct fetch (11 uses)**
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/function-name`, { ... });
```

### Problem
- Inconsistent error handling
- Inconsistent timeout handling
- Inconsistent auth token injection
- Harder to add global features (logging, retry, etc.)

---

## RECOMMENDED TARGET ARCHITECTURE

### 1. Single Supabase Client
```
src/core/services/supabase/
├── client.ts           # Single Supabase client
├── index.ts            # Barrel export
└── types.ts            # Database types
```

### 2. Centralized API Layer
```
src/core/api/
├── client.ts           # Edge function caller (existing - expand usage)
├── endpoints.ts        # NEW: Typed endpoint definitions
├── errorHandling.ts    # Error handling utilities
├── hooks.ts            # NEW: Pre-built TanStack Query hooks
├── index.ts            # Barrel export
└── types.ts            # NEW: Request/Response types per endpoint
```

### 3. Standardized Edge Function Pattern
```
supabase/functions/
├── _shared/
│   ├── api-gateway.ts          # MUST USE for all functions
│   ├── cors.ts                 # Shared CORS headers
│   ├── config.ts               # Environment config
│   ├── error-codes.ts          # NEW: Standard error codes
│   ├── schemas/                # Zod validation schemas
│   └── [service]-client.ts     # External service clients
├── [function-name]/
│   ├── index.ts                # Uses withApiGateway wrapper
│   └── handler.ts              # Business logic
```

---

## PHASE-BY-PHASE FIX PLAN

### PHASE 1: Consolidate Supabase Client (Day 1)
**Priority:** 🔴 Critical  
**Effort:** 2 hours

1. Audit all imports from `@/integrations/supabase`
2. Update to `@core/services/supabase`
3. Delete `src/integrations/supabase/` folder
4. Verify app still works

### PHASE 2: Standardize Frontend API Calls (Day 2-3)
**Priority:** 🔴 Critical  
**Effort:** 4-6 hours

1. Expand `callEdgeFunction` to handle all use cases
2. Create typed endpoint definitions
3. Replace `supabase.functions.invoke` calls with `callEdgeFunction`
4. Replace direct `fetch` calls with `callEdgeFunction`
5. Add retry logic and timeout handling globally

### PHASE 3: Create API Hooks Library (Day 3-4)
**Priority:** 🟡 High  
**Effort:** 4 hours

1. Create pre-built TanStack Query hooks for common operations
2. Standardize mutation patterns
3. Add global error handling via QueryClient
4. Add request caching strategies

### PHASE 4: Standardize Edge Function Patterns (Day 5-7)
**Priority:** 🟡 High  
**Effort:** 8-12 hours

1. Define standard edge function template
2. Create migration script to convert functions
3. Standardize imports (pick one: esm.sh or npm:)
4. Standardize authentication approach
5. Migrate high-priority functions first:
   - Gift card provisioning functions
   - Campaign operations
   - Form submissions

### PHASE 5: API Documentation & Types (Day 8-9)
**Priority:** 🟢 Medium  
**Effort:** 4 hours

1. Document all edge function endpoints
2. Create OpenAPI/Swagger spec
3. Generate TypeScript types from spec
4. Add runtime validation with Zod

### PHASE 6: Monitoring & Logging (Day 10)
**Priority:** 🟢 Medium  
**Effort:** 4 hours

1. Add request ID tracking across all calls
2. Standardize error logging format
3. Add performance monitoring
4. Set up alerts for API failures

---

## EDGE FUNCTION CATEGORIZATION

### Category A: Critical Business Functions (Prioritize First)
- `provision-gift-card-unified` ✅ Well-structured
- `claim-and-provision-card`
- `save-campaign-draft` ⚠️ Needs update
- `submit-ace-form`
- `submit-lead-form`
- `send-gift-card-sms`
- `send-gift-card-email`
- `evaluate-conditions`
- `complete-condition`

### Category B: Integration Functions
- `stripe-webhook`
- `zapier-incoming-webhook`
- `crm-webhook-receiver`
- `eztexting-webhook`
- `handle-sms-response`
- `handle-call-webhook`

### Category C: Administrative Functions
- `generate-demo-data`
- `cleanup-demo-data`
- `export-database`
- `seed-documentation`

### Category D: AI Functions
- `ai-design-chat`
- `ai-landing-page-generate`
- `generate-ace-form-ai`
- `dr-phillip-chat`
- `openai-chat`

---

## STANDARD EDGE FUNCTION TEMPLATE

```typescript
/**
 * [Function Name]
 * [Brief description]
 */
import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Request schema
const RequestSchema = z.object({
  // Define your request schema
});

// Response type
interface ResponseData {
  // Define your response type
}

// Handler
async function handler(
  request: z.infer<typeof RequestSchema>,
  context: AuthContext
): Promise<ResponseData> {
  const supabase = createServiceClient();
  
  // Business logic here
  
  return {
    // Response data
  };
}

// Export with middleware
export default withApiGateway(handler, {
  requireAuth: true,
  validateSchema: RequestSchema,
  auditAction: 'function-name-called',
  rateLimitKey: 'function-name',
});
```

---

## FRONTEND API HOOK PATTERN

```typescript
// src/core/api/hooks/useGiftCardProvisioning.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import type { ProvisionRequest, ProvisionResponse } from '../types/gift-cards';

export function useProvisionGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProvisionRequest) => 
      callEdgeFunction<ProvisionResponse>('provision-gift-card-unified', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
    onError: (error) => {
      // Global error handling
      console.error('Gift card provisioning failed:', error);
    },
  });
}
```

---

## SUCCESS CRITERIA

After completing all phases:

- [ ] Single Supabase client used everywhere
- [ ] All edge function calls go through `callEdgeFunction`
- [ ] All edge functions use `withApiGateway` wrapper
- [ ] Consistent error codes and messages
- [ ] Request IDs tracked end-to-end
- [ ] TypeScript types for all API operations
- [ ] API documentation generated
- [ ] Monitoring and alerting in place

---

## ESTIMATED TIMELINE

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Consolidate Supabase client | 2 hours |
| 2 | Standardize frontend API calls | 4-6 hours |
| 3 | Create API hooks library | 4 hours |
| 4 | Standardize edge functions | 8-12 hours |
| 5 | API documentation & types | 4 hours |
| 6 | Monitoring & logging | 4 hours |

**Total: 26-32 hours (5-7 business days)**

---

*Document Created: December 10, 2025*  
*Next Step: See API_FIX_PROMPTS.md for execution prompts*

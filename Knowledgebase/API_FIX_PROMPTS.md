# API SYSTEMS FIX PROMPTS

**Date:** December 10, 2025  
**Prerequisite:** Read API_SYSTEMS_AUDIT.md first

---

## PHASE 1: CONSOLIDATE SUPABASE CLIENT

### Prompt 1.1: Audit Supabase Client Imports

```
# TASK: Find all imports from integrations/supabase

## Context
We have TWO Supabase clients that are identical:
- src/core/services/supabase/client.ts (192 imports - KEEP)
- src/integrations/supabase/client.ts (82 imports - DELETE)

## Step 1: Find all files importing from integrations/supabase
Search for:
- @/integrations/supabase
- integrations/supabase
- ../integrations/supabase

## Step 2: List all affected files
Show me every file that imports from integrations/supabase with the exact import line.

Do NOT make any changes yet - just show me the full list.
```

---

### Prompt 1.2: Update Supabase Client Imports

```
# TASK: Update all Supabase client imports to use @core/services/supabase

## Files to Update
[List from Prompt 1.1]

## Change Pattern
FROM: import { supabase } from '@/integrations/supabase/client'
TO:   import { supabase } from '@core/services/supabase'

FROM: import { supabase } from '../integrations/supabase/client'
TO:   import { supabase } from '@core/services/supabase'

FROM: import type { Database } from '@/integrations/supabase/types'
TO:   import type { Database } from '@core/services/supabase/types'

## Instructions
1. Update ALL imports in the files listed
2. Make sure no file still imports from integrations/supabase
3. Verify TypeScript compiles: npx tsc --noEmit

Execute the updates now.
```

---

### Prompt 1.3: Delete integrations/supabase Folder

```
# TASK: Delete the duplicate integrations/supabase folder

## Prerequisites
1. Verify no files import from integrations/supabase:
   grep -r "integrations/supabase" src/

2. If grep returns results, go back to Prompt 1.2

## If grep is clean, delete:
Remove-Item -Recurse -Force "src/integrations/supabase"

## Also check if integrations folder is now empty
If empty, delete that too:
Remove-Item -Force "src/integrations" (only if empty)

Execute deletion and verify app still works.
```

---

## PHASE 2: STANDARDIZE FRONTEND API CALLS

### Prompt 2.1: Expand API Client

```
# TASK: Enhance the centralized API client

## Current Location
src/core/api/client.ts

## Enhancements Needed
1. Add retry logic for transient failures
2. Add configurable timeout per endpoint
3. Add request ID generation for tracing
4. Add better TypeScript generics
5. Add hooks for request/response interceptors

## Updated client.ts structure:

```typescript
/**
 * Centralized API Client for Edge Functions
 * Version 2.0 - Enhanced with retry, tracing, interceptors
 */

interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

interface RequestContext {
  requestId: string;
  startTime: number;
  functionName: string;
}

// Add request interceptor type
type RequestInterceptor = (config: RequestConfig, context: RequestContext) => RequestConfig;
type ResponseInterceptor = (response: any, context: RequestContext) => any;

// Global interceptors
const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
}

export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
}

// Enhanced callEdgeFunction with retry
export async function callEdgeFunction<TResponse, TBody = any>(
  functionName: string,
  body?: TBody,
  config: RequestConfig = {}
): Promise<TResponse> {
  const { timeout = 30000, retries = 2, retryDelay = 1000 } = config;
  
  const requestId = generateRequestId();
  const context: RequestContext = {
    requestId,
    startTime: Date.now(),
    functionName,
  };
  
  // Run through request interceptors
  let finalConfig = config;
  for (const interceptor of requestInterceptors) {
    finalConfig = interceptor(finalConfig, context);
  }
  
  // Attempt with retries
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await executeRequest(functionName, body, finalConfig, context);
      
      // Run through response interceptors
      let finalResponse = response;
      for (const interceptor of responseInterceptors) {
        finalResponse = interceptor(finalResponse, context);
      }
      
      return finalResponse;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries && isRetryableError(error)) {
        await delay(retryDelay * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
}

function isRetryableError(error: any): boolean {
  // Retry on network errors, 5xx, and 429
  if (error.name === 'AbortError') return false; // Timeout, don't retry
  if (error.statusCode === 429) return true; // Rate limited
  if (error.statusCode >= 500) return true; // Server error
  if (error.message?.includes('network')) return true;
  return false;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

Implement these enhancements to client.ts now.
```

---

### Prompt 2.2: Create Typed Endpoint Registry

```
# TASK: Create a typed endpoint registry

## Create new file: src/core/api/endpoints.ts

```typescript
/**
 * Typed Edge Function Endpoints
 * Provides type safety and documentation for all API calls
 */

import type {
  GiftCardProvisionResponse,
  FormSubmissionResponse,
  ConditionEvaluationResponse,
  // ... other response types from types/api-responses.ts
} from '@/types/api-responses';

// Request types (add new file if needed: src/core/api/types/requests.ts)
export interface ProvisionGiftCardRequest {
  campaignId: string;
  recipientId: string;
  brandId: string;
  denomination: number;
  conditionNumber?: number;
}

export interface SubmitFormRequest {
  formId: string;
  data: Record<string, any>;
  recipientId?: string;
  campaignId?: string;
}

// Endpoint registry with types
export const Endpoints = {
  // Gift Card Operations
  giftCards: {
    provision: 'provision-gift-card-unified' as const,
    checkBalance: 'check-gift-card-balance' as const,
    validateCode: 'validate-gift-card-code' as const,
  },
  
  // Campaign Operations  
  campaigns: {
    saveDraft: 'save-campaign-draft' as const,
    generateTokens: 'generate-recipient-tokens' as const,
    evaluateConditions: 'evaluate-conditions' as const,
  },
  
  // Form Operations
  forms: {
    submit: 'submit-ace-form' as const,
    generateAI: 'generate-ace-form-ai' as const,
  },
  
  // Communication
  messaging: {
    sendSMS: 'send-gift-card-sms' as const,
    sendEmail: 'send-gift-card-email' as const,
    optIn: 'send-sms-opt-in' as const,
  },
  
  // AI Operations
  ai: {
    chat: 'openai-chat' as const,
    drPhillip: 'dr-phillip-chat' as const,
    generateLandingPage: 'ai-landing-page-generate' as const,
  },
} as const;

// Type-safe endpoint caller factory
export function createTypedEndpoint<TRequest, TResponse>(
  endpoint: string
) {
  return {
    endpoint,
    call: (request: TRequest) => 
      callEdgeFunction<TResponse, TRequest>(endpoint, request),
  };
}
```

Create this file now.
```

---

### Prompt 2.3: Replace supabase.functions.invoke Calls

```
# TASK: Replace supabase.functions.invoke with callEdgeFunction

## Context
Currently 125 places use supabase.functions.invoke
We want them all to use callEdgeFunction for consistency

## Search Pattern
Find all files with: supabase.functions.invoke

## Replace Pattern
FROM:
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { ... }
});
if (error) throw error;
```

TO:
```typescript
import { callEdgeFunction } from '@core/api';

const data = await callEdgeFunction('function-name', { ... });
// Error handling is built-in
```

## Instructions
1. Find all files with supabase.functions.invoke
2. For each file:
   a. Add import for callEdgeFunction
   b. Replace the invoke pattern
   c. Remove the manual error check (it's automatic now)
3. Verify TypeScript compiles

Start with the gift-cards feature hooks first, then expand to others.
```

---

### Prompt 2.4: Replace Direct Fetch Calls

```
# TASK: Replace direct fetch calls to edge functions

## Context
11 places use direct fetch to functions/v1

## Search Pattern
Find all: fetch(`${supabaseUrl}/functions/v1
Find all: fetch(.*functions/v1

## Replace Pattern
FROM:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/function-name`, {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
const result = await response.json();
```

TO:
```typescript
import { callEdgeFunction } from '@core/api';

const result = await callEdgeFunction('function-name', data);
```

Find and replace all direct fetch calls.
```

---

## PHASE 3: CREATE API HOOKS LIBRARY

### Prompt 3.1: Create Gift Card API Hooks

```
# TASK: Create standardized API hooks for gift cards

## Create: src/core/api/hooks/useGiftCardAPI.ts

```typescript
/**
 * Gift Card API Hooks
 * Standardized TanStack Query hooks for gift card operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';
import type { GiftCardProvisionResponse, BalanceCheckResponse } from '@/types/api-responses';

// Query keys factory
export const giftCardKeys = {
  all: ['gift-cards'] as const,
  balance: (cardId: string) => ['gift-cards', 'balance', cardId] as const,
  deliveries: (recipientId: string) => ['gift-cards', 'deliveries', recipientId] as const,
};

// Provision gift card
export function useProvisionGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      campaignId: string;
      recipientId: string;
      brandId: string;
      denomination: number;
      conditionNumber?: number;
    }) => callEdgeFunction<GiftCardProvisionResponse>(
      Endpoints.giftCards.provision,
      request
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
    },
  });
}

// Check card balance
export function useCheckBalance(cardId: string, brandCode: string) {
  return useQuery({
    queryKey: giftCardKeys.balance(cardId),
    queryFn: () => callEdgeFunction<BalanceCheckResponse>(
      Endpoints.giftCards.checkBalance,
      { cardId, brandCode }
    ),
    enabled: !!cardId && !!brandCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Validate card code
export function useValidateGiftCardCode() {
  return useMutation({
    mutationFn: (code: string) => callEdgeFunction<{ valid: boolean; error?: string }>(
      Endpoints.giftCards.validateCode,
      { code }
    ),
  });
}
```

Create this file and similar ones for:
- useCampaignAPI.ts
- useFormAPI.ts
- useMessagingAPI.ts
```

---

### Prompt 3.2: Create API Hooks Index

```
# TASK: Create barrel export for API hooks

## Create: src/core/api/hooks/index.ts

```typescript
// Gift Card hooks
export * from './useGiftCardAPI';

// Campaign hooks
export * from './useCampaignAPI';

// Form hooks
export * from './useFormAPI';

// Messaging hooks
export * from './useMessagingAPI';

// Generic hooks
export * from './useEdgeFunctionMutation';
export * from './useEdgeFunctionQuery';
```

## Also create generic hooks:

### useEdgeFunctionMutation.ts
```typescript
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError } from '../client';

export function useEdgeFunctionMutation<TResponse, TRequest>(
  functionName: string,
  options?: Omit<UseMutationOptions<TResponse, EdgeFunctionError, TRequest>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (request: TRequest) => 
      callEdgeFunction<TResponse, TRequest>(functionName, request),
    ...options,
  });
}
```

### useEdgeFunctionQuery.ts
```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { callEdgeFunction, EdgeFunctionError } from '../client';

export function useEdgeFunctionQuery<TResponse, TRequest = void>(
  functionName: string,
  request: TRequest,
  options?: Omit<UseQueryOptions<TResponse, EdgeFunctionError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [functionName, request],
    queryFn: () => callEdgeFunction<TResponse, TRequest>(functionName, request),
    ...options,
  });
}
```

Create these files now.
```

---

## PHASE 4: STANDARDIZE EDGE FUNCTIONS

### Prompt 4.1: Create Edge Function Template

```
# TASK: Create a standard edge function template

## Create: supabase/functions/_shared/template.ts

```typescript
/**
 * EDGE FUNCTION TEMPLATE
 * Copy this file when creating new edge functions
 * 
 * Usage:
 * 1. Copy this file to your new function folder
 * 2. Rename to index.ts
 * 3. Define your request schema
 * 4. Implement your handler
 * 5. Configure the withApiGateway options
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================
// REQUEST SCHEMA
// Define the expected request body structure
// ============================================
const RequestSchema = z.object({
  // Add your fields here
  // Example:
  // userId: z.string().uuid(),
  // data: z.object({ ... }),
});

type RequestBody = z.infer<typeof RequestSchema>;

// ============================================
// RESPONSE TYPE
// Define what this function returns
// ============================================
interface ResponseData {
  success: true;
  // Add your response fields here
}

// ============================================
// HANDLER
// Your business logic goes here
// ============================================
async function handler(
  request: RequestBody,
  context: AuthContext
): Promise<ResponseData> {
  // Get Supabase client
  const supabase = createServiceClient();
  
  // Access authenticated user
  const { user } = context;
  console.log(`[FUNCTION-NAME] Called by user: ${user.id}`);
  
  // Your business logic here
  // ...
  
  // Return response
  return {
    success: true,
    // ... your data
  };
}

// ============================================
// EXPORT WITH MIDDLEWARE
// Configure authentication, validation, etc.
// ============================================
export default withApiGateway(handler, {
  requireAuth: true,           // Require JWT authentication
  // requiredRole: 'admin',    // Optional: require specific role
  validateSchema: RequestSchema, // Validate request body
  auditAction: 'function-called', // Log to audit trail
  rateLimitKey: 'function-name',  // Rate limit identifier
});
```

Create this template file.
```

---

### Prompt 4.2: Create Shared Supabase Helper

```
# TASK: Create shared Supabase client helper for edge functions

## Create: supabase/functions/_shared/supabase.ts

```typescript
/**
 * Shared Supabase Client for Edge Functions
 * Use this instead of creating clients manually
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

let serviceClient: SupabaseClient | null = null;

/**
 * Create a Supabase client with service role (admin) access
 * Use for server-side operations that need full access
 */
export function createServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  
  return serviceClient;
}

/**
 * Create a Supabase client with user's JWT token
 * Use for operations that should respect RLS
 */
export function createUserClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false },
  });
}
```

Create this file now.
```

---

### Prompt 4.3: Migrate save-campaign-draft Function

```
# TASK: Migrate save-campaign-draft to use standard pattern

## Current: Manual pattern with inconsistencies
## Target: Use withApiGateway wrapper

## File: supabase/functions/save-campaign-draft/index.ts

```typescript
/**
 * Save Campaign Draft
 * Saves or updates campaign draft data
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createUserClient } from '../_shared/supabase.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const RequestSchema = z.object({
  draftId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  draftName: z.string().optional(),
  formData: z.record(z.any()),
  currentStep: z.number().optional(),
});

type RequestBody = z.infer<typeof RequestSchema>;

interface DraftResponse {
  draft: {
    id: string;
    draft_name: string;
    current_step: number;
    updated_at: string;
  };
}

async function handler(
  request: RequestBody,
  context: AuthContext
): Promise<DraftResponse> {
  // Use user's context for RLS
  const supabase = context.client!;
  const userId = context.user.id;
  
  const { draftId, clientId, draftName, formData, currentStep } = request;

  if (draftId) {
    // Update existing draft
    const { data, error } = await supabase
      .from('campaign_drafts')
      .update({
        form_data_json: formData,
        current_step: currentStep,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to update draft: ${error.message}`, 'DRAFT_UPDATE_FAILED', 400);
    }

    return { draft: data };
  } else {
    // Create new draft
    if (!clientId) {
      throw new ApiError('clientId is required for new drafts', 'VALIDATION_ERROR', 400);
    }

    const { data, error } = await supabase
      .from('campaign_drafts')
      .insert({
        client_id: clientId,
        user_id: userId,
        draft_name: draftName || 'Untitled Draft',
        form_data_json: formData,
        current_step: currentStep,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to create draft: ${error.message}`, 'DRAFT_CREATE_FAILED', 400);
    }

    return { draft: data };
  }
}

export default withApiGateway(handler, {
  requireAuth: true,
  validateSchema: RequestSchema,
  auditAction: 'campaign_draft_saved',
});
```

Update save-campaign-draft/index.ts with this implementation.
```

---

### Prompt 4.4: Batch Migrate High-Priority Functions

```
# TASK: Migrate critical edge functions to standard pattern

## Priority Functions to Migrate:
1. submit-ace-form
2. submit-lead-form
3. evaluate-conditions
4. complete-condition
5. send-gift-card-sms
6. send-gift-card-email

## For each function:
1. Create request schema with Zod
2. Define response type
3. Move business logic to handler function
4. Wrap with withApiGateway
5. Use createServiceClient or createUserClient appropriately

## Migration checklist for each:
- [ ] Remove manual CORS handling
- [ ] Remove manual auth checking
- [ ] Add Zod validation schema
- [ ] Add proper error codes
- [ ] Add audit logging
- [ ] Test the endpoint

Start with submit-ace-form and show me the updated code.
```

---

## PHASE 5: VERIFICATION

### Prompt 5.1: Verify All API Changes

```
# TASK: Verify all API system changes are working

## Tests to Run

### 1. Supabase Client Consolidation
```bash
# Should return 0 results
grep -r "integrations/supabase" src/

# Should return many results
grep -r "@core/services/supabase" src/
```

### 2. Frontend API Calls
```bash
# Should return 0 results (or minimal)
grep -r "supabase.functions.invoke" src/

# Should return many results
grep -r "callEdgeFunction" src/
```

### 3. TypeScript Compilation
```bash
npx tsc --noEmit
```

### 4. Build Test
```bash
npm run build
```

### 5. Dev Server
```bash
npm run dev
# Test critical flows:
# - Create campaign
# - Submit form
# - Gift card provisioning
```

### 6. Edge Function Tests
Test each migrated function:
- save-campaign-draft
- submit-ace-form
- etc.

Report results for each test.
```

---

## QUICK REFERENCE: IMPORT PATTERNS

After all fixes, these should be the standard imports:

```typescript
// Supabase client
import { supabase } from '@core/services/supabase';

// API client
import { callEdgeFunction } from '@core/api';

// API hooks
import { useProvisionGiftCard, useCheckBalance } from '@core/api/hooks';

// Endpoints
import { Endpoints } from '@core/api/endpoints';

// Types
import type { GiftCardProvisionResponse } from '@/types/api-responses';
```

---

**Document Created:** December 10, 2025  
**Total Prompts:** 15  
**Estimated Time:** 5-7 business days

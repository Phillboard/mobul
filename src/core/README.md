# Core Directory

> Core services, authentication, and API infrastructure for the Mobul platform.

## Structure

```
core/
├── api/              # API client and error handling
│   └── hooks/        # API-specific hooks
├── auth/             # Authentication system
│   ├── components/   # Auth components
│   └── hooks/        # Auth hooks
└── services/         # Core services
    ├── ai/           # AI providers
    ├── performance/  # Performance utilities
    ├── supabase/     # Supabase client
    ├── system/       # System utilities
    └── web/          # Web services
```

---

## API (`api/`)

### Core Files

| File | Purpose |
|------|---------|
| `client.ts` | Edge function client with retry, auth, interceptors |
| `endpoints.ts` | Typed endpoint registry |
| `errorHandling.ts` | Error handling with toast notifications |
| `errorLogger.ts` | Frontend error logging |
| `errorTracking.ts` | Error tracking service |
| `requestTracer.ts` | Request tracing for debugging |

### API Hooks (`api/hooks/`)

| Hook | Purpose |
|------|---------|
| `useCampaignAPI.ts` | Campaign operations |
| `useFormAPI.ts` | Form submissions |
| `useGiftCardAPI.ts` | Gift card operations |
| `useMessagingAPI.ts` | SMS/Email sending |

### Usage

```typescript
import { callEdgeFunction } from '@/core/api/client';

// Call edge function with auth
const { data, error } = await callEdgeFunction('provision-gift-card-unified', {
  recipientId: '123',
  conditionId: '456'
});

// Using hooks
import { useProvisionGiftCard } from '@/core/api/hooks';
const { mutate } = useProvisionGiftCard();
mutate({ recipientId, conditionId });
```

---

## Auth (`auth/`)

### Core Files

| File | Purpose |
|------|---------|
| `AuthProvider.tsx` | Main auth context provider |
| `roles.ts` | Role definitions and hierarchy |
| `permissions.ts` | Permission definitions |
| `roleRequirements.ts` | Role invitation rules |

### Auth Components (`auth/components/`)

| Component | Purpose |
|-----------|---------|
| `ProtectedRoute.tsx` | Route protection with role checks |
| `PermissionGate.tsx` | Permission-based rendering |

### Auth Hooks (`auth/hooks/`)

| Hook | Purpose |
|------|---------|
| `useCurrentUser.ts` | Current authenticated user |
| `useUserRole.ts` | User role checking |
| `usePermissions.ts` | Permission checking |
| `useCanAccessClient.ts` | Client access verification |
| `useInvitableRoles.ts` | Roles user can invite |
| `useManageableUsers.ts` | Users that can be managed |

### Role Hierarchy

```
platform_admin > tech_support > agency_owner > company_owner > call_center > developer
```

### Usage

```typescript
// Check permissions
import { usePermissions } from '@/core/auth/hooks';
const { canView, canEdit } = usePermissions('campaigns');

// Protected route
import { ProtectedRoute } from '@/core/auth/components';
<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>

// Permission gate
import { PermissionGate } from '@/core/auth/components';
<PermissionGate permission="campaigns.create">
  <CreateButton />
</PermissionGate>
```

---

## Services (`services/`)

### AI Services (`services/ai/`)

| File | Purpose |
|------|---------|
| `ai-prompts.ts` | AI prompt engineering |
| `ai-provider-config.ts` | OpenAI/Anthropic configuration |

### System Services (`services/system/`)

| File | Purpose |
|------|---------|
| `env-checker.ts` | Environment variable validation |
| `error-tracking.ts` | Error tracking service |
| `mvp-verification.ts` | MVP readiness verification |
| `retry-logic.ts` | Retry with exponential backoff |

### Web Services (`services/web/`)

| File | Purpose |
|------|---------|
| `ai-page-generator.ts` | AI landing page generation |
| `brandDeepLinks.ts` | Brand-specific deep links |
| `walletDetection.ts` | Platform/wallet detection |

### Supabase (`services/supabase/`)

| File | Purpose |
|------|---------|
| `client.ts` | Supabase client singleton |
| `types.ts` | Database JSONB types |

### Other Services

| File | Purpose |
|------|---------|
| `email.ts` | Email sending service |
| `logger.ts` | Centralized logging |
| `monitoring.ts` | System monitoring |
| `zapier.ts` | Zapier integration |
| `zapierTriggers.ts` | Zapier event dispatching |

### Usage

```typescript
// Environment checking
import { checkEnvironment } from '@/core/services/system/env-checker';
const result = checkEnvironment();

// Retry logic
import { retryOperation } from '@/core/services/system/retry-logic';
const result = await retryOperation(fetchData, { maxAttempts: 3 });

// Email sending
import { sendEmail } from '@/core/services/email';
await sendEmail({ to, subject, html });
```

---

## Importing

```typescript
// API
import { callEdgeFunction } from '@/core/api/client';
import { handleApiError } from '@/core/api/errorHandling';
import { useProvisionGiftCard } from '@/core/api/hooks';

// Auth
import { useAuth } from '@/core/auth';
import { usePermissions, useCurrentUser } from '@/core/auth/hooks';
import { ProtectedRoute, PermissionGate } from '@/core/auth/components';

// Services
import { supabase } from '@/core/services/supabase/client';
import { logger } from '@/core/services/logger';
```

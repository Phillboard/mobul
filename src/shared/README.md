# Shared Directory

> Shared components, hooks, and utilities used across all features.

## Structure

```
shared/
├── components/           # Reusable React components
│   ├── ui/               # Shadcn UI components (60+)
│   ├── layout/           # Layout components
│   ├── error-boundaries/ # Error boundary components
│   └── *.tsx             # Other shared components
├── hooks/                # Shared React hooks
└── utils/                # Utility functions
    └── validation/       # Validation schemas
```

---

## Components

### UI Components (`components/ui/`)

Full Shadcn UI component library:

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Button with variants |
| `card.tsx` | Card container |
| `dialog.tsx` | Modal dialogs |
| `form.tsx` | Form with RHF integration |
| `input.tsx` | Text input |
| `select.tsx` | Select dropdown |
| `table.tsx` | Data table |
| `tabs.tsx` | Tab navigation |
| `toast.tsx` | Toast notifications |
| `data-table.tsx` | Complete data table with sorting/filtering |
| ... | 50+ more components |

### Layout Components (`components/layout/`)

| Component | Purpose |
|-----------|---------|
| `Header.tsx` | Main app header with navigation |
| `Sidebar.tsx` | Collapsible sidebar navigation |
| `Layout.tsx` | Main layout wrapper |
| `MobileBottomNav.tsx` | Mobile navigation |
| `ThemeToggle.tsx` | Dark/light mode toggle |

### Error Boundaries (`components/error-boundaries/`)

| Component | Purpose |
|-----------|---------|
| `CampaignErrorBoundary.tsx` | Campaign feature errors |
| `FormBuilderErrorBoundary.tsx` | Form builder errors |
| `GiftCardErrorBoundary.tsx` | Gift card operation errors |

### Other Components

| Component | Purpose |
|-----------|---------|
| `GlobalSearch.tsx` | Command palette (Cmd+K) |
| `ComingSoon.tsx` | Feature gating wrapper |
| `ComingSoonBadge.tsx` | Feature status badges |
| `CommentsSection.tsx` | Comments with @mentions |
| `TagSelector.tsx` | Tag management |
| `ErrorBoundary.tsx` | Global error boundary |

---

## Hooks

| Hook | Purpose |
|------|---------|
| `use-mobile.tsx` | Mobile viewport detection |
| `use-toast.ts` | Toast notifications |
| `useClientScopedQuery.ts` | Client-scoped TanStack Query |
| `useDebounce.ts` | Value debouncing |
| `useDrPhillipPreference.ts` | AI chat preferences |
| `useFeatureFlags.ts` | Feature flag checking |
| `useFeatureStatus.ts` | Feature availability with roles |
| `useKeyboardShortcuts.ts` | Global keyboard shortcuts |
| `useMenuItemCounts.ts` | Sidebar badge counts |
| `useMenuSearch.ts` | Menu item search |
| `useTablePreferences.ts` | Table column preferences |
| `useTags.ts` | Tag CRUD operations |
| `useUndo.ts` | Undo/redo with Immer |

### Usage Examples

```typescript
// Debounced search
const debouncedSearch = useDebounce(searchTerm, 300);

// Client-scoped queries
const { data } = useClientScopedQuery('campaigns', {
  filters: { status: 'active' }
});

// Feature flags
const { isEnabled } = useFeatureFlags();
if (isEnabled('new-designer')) { ... }
```

---

## Utilities

### Core Utilities

| Utility | Purpose |
|---------|---------|
| `cn.ts` | Class name merging (clsx + tailwind-merge) |
| `date.ts` | Date formatting with date-fns |
| `currency.ts` | Currency formatting |
| `currencyUtils.ts` | Extended currency utilities |
| `csv.ts` | CSV template generation |
| `table.ts` | TanStack Table helpers |
| `terminology.ts` | Platform terminology constants |
| `typeGuards.ts` | Type guard utilities |

### SMS Utilities

| Utility | Purpose |
|---------|---------|
| `sms.ts` | SMS template rendering |
| `smsTemplates.ts` | Extended SMS with custom fields |
| `a2pValidation.ts` | A2P/TCPA compliance validation |

### Validation (`utils/validation/`)

| File | Purpose |
|------|---------|
| `validationSchemas.ts` | Zod schemas (phone, email, etc.) |
| `campaignValidation.ts` | Campaign validation utilities |
| `conditionalLogic.ts` | Form conditional logic |
| `aceFormValidation.ts` | ACE form field validation |

### Usage Examples

```typescript
// Class names
import { cn } from '@/shared/utils/cn';
<div className={cn('base', isActive && 'active')} />

// Currency formatting
import { formatCurrency, formatCents } from '@/shared/utils/currencyUtils';
formatCurrency(1234.56); // "$1,234.56"
formatCents(12345);      // "$123.45"

// Date formatting
import { formatDate, formatRelative } from '@/shared/utils/date';
formatDate(new Date(), 'MMM d, yyyy'); // "Feb 1, 2026"
formatRelative(date); // "3 days ago"

// Validation
import { phoneSchema, emailSchema } from '@/shared/utils/validation/validationSchemas';
phoneSchema.parse('+1234567890');
```

---

## Importing

All exports are available from the root:

```typescript
// Components
import { Button, Card, Dialog } from '@/shared/components/ui';
import { Layout, Sidebar } from '@/shared/components/layout';
import { GlobalSearch, ComingSoon } from '@/shared/components';

// Hooks
import { useDebounce, useFeatureFlags } from '@/shared/hooks';

// Utils
import { cn, formatCurrency, formatDate } from '@/shared/utils';
```

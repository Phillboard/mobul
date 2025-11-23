# Developer Guide - Mobul ACE Platform

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Common Patterns](#common-patterns)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Deployment](#deployment)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- A Supabase account (provided via Lovable Cloud)

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Shadcn UI components
│   ├── campaigns/      # Campaign-specific components
│   ├── gift-cards/     # Gift card components
│   └── ...
├── pages/              # Page components (routes)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and helpers
├── contexts/           # React context providers
├── types/              # TypeScript type definitions
├── integrations/       # External service integrations
│   └── supabase/      # Supabase client and types
└── test/               # Test setup and utilities

supabase/
├── functions/          # Edge functions (serverless)
└── migrations/         # Database migrations (auto-generated)
```

## Common Patterns

### 1. Data Fetching with React Query
```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useCampaigns(clientId: string) {
  return useQuery({
    queryKey: ['campaigns', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId);
      
      if (error) throw error;
      return data;
    },
  });
}
```

### 2. Error Handling
```typescript
import { handleApiError, handleSuccess } from "@/lib/errorHandling";

async function createCampaign(data: CampaignData) {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    
    handleSuccess('Campaign created successfully', 'CreateCampaign');
    return campaign;
  } catch (error) {
    handleApiError(error, 'CreateCampaign');
    throw error;
  }
}
```

### 3. Permission Checks
```typescript
import { usePermissions } from "@/hooks/usePermissions";

function CampaignActions() {
  const { canCreate, canEdit, canDelete } = usePermissions('campaigns');
  
  return (
    <>
      {canCreate && <Button>Create Campaign</Button>}
      {canEdit && <Button>Edit</Button>}
      {canDelete && <Button>Delete</Button>}
    </>
  );
}
```

### 4. Loading & Empty States
```typescript
import { LoadingCard } from "@/components/ui/loading-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FileX } from "lucide-react";

function CampaignsList() {
  const { data, isLoading, error, refetch } = useCampaigns(clientId);
  
  if (isLoading) return <LoadingCard />;
  
  if (error) {
    return (
      <ErrorState
        message="Failed to load campaigns"
        onRetry={refetch}
      />
    );
  }
  
  if (!data?.length) {
    return (
      <EmptyState
        icon={FileX}
        title="No campaigns yet"
        description="Create your first campaign to get started"
        action={{
          label: "Create Campaign",
          onClick: () => navigate('/campaigns/new'),
        }}
      />
    );
  }
  
  return <CampaignGrid campaigns={data} />;
}
```

### 5. Logging
```typescript
import { logger } from "@/lib/logger";

// Development only
logger.info('User logged in:', user);
logger.debug('Query params:', params);
logger.warn('Deprecated API call');

// Always logged (even in production)
logger.error('Failed to save data:', error);
```

## Development Workflow

### Adding a New Feature

1. **Plan the Database Schema**
   - Determine what tables/columns are needed
   - Design RLS policies for data security
   - Create migration via Lovable Cloud UI

2. **Create Types**
   - Types are auto-generated in `src/integrations/supabase/types.ts`
   - Add custom types in `src/types/` if needed

3. **Create Custom Hooks**
   ```typescript
   // src/hooks/useFeature.ts
   export function useFeature() {
     return useQuery({
       queryKey: ['feature'],
       queryFn: async () => {
         // Fetch data
       },
     });
   }
   ```

4. **Build UI Components**
   - Use Shadcn UI components
   - Follow design system tokens
   - Add loading/error/empty states

5. **Add Edge Functions** (if needed)
   ```typescript
   // supabase/functions/my-function/index.ts
   Deno.serve(async (req) => {
     // Function logic
   });
   ```

6. **Write Tests**
   ```typescript
   // src/hooks/__tests__/useFeature.test.ts
   describe('useFeature', () => {
     it('should fetch feature data', async () => {
       // Test implementation
     });
   });
   ```

### Code Review Checklist
- [ ] No console.log statements (use logger)
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Empty states added
- [ ] RLS policies tested
- [ ] Types properly defined
- [ ] Tests written and passing
- [ ] Documentation updated

## Testing Guidelines

### Unit Tests
Focus on utility functions and business logic:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateProfit } from '@/lib/giftCardUtils';

describe('calculateProfit', () => {
  it('should calculate profit correctly', () => {
    expect(calculateProfit(25, 20, 100)).toBe(500);
  });
});
```

### Component Tests
Test user interactions and rendering:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/__tests__/giftCardUtils.test.ts

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Common Gotchas

### 1. RLS Policies
Always test RLS policies with different user roles. Admin role should bypass restrictions.

### 2. React Query Cache
Remember that data is cached. Use `queryClient.invalidateQueries()` after mutations.

### 3. Edge Function Secrets
Use Supabase secrets for API keys, never hardcode them.

### 4. TypeScript Strict Mode
The project uses strict TypeScript. Avoid `any` types when possible.

### 5. Design System
Always use semantic tokens from `index.css` and `tailwind.config.ts`, never hardcode colors.

## Deployment

The application auto-deploys via Lovable Cloud:
- Frontend: Automatically deployed on push
- Edge Functions: Automatically deployed when changed
- Database: Migrations run automatically

## Getting Help

- Check existing documentation in `/docs`
- Review similar components for patterns
- Ask team members for code review
- Use the logger for debugging

## Best Practices

1. **Keep it simple** - Don't over-engineer
2. **Use consistent patterns** - Follow existing code style
3. **Document complex logic** - Add comments for clarity
4. **Test critical paths** - Focus on business logic
5. **Handle errors gracefully** - Always show user-friendly messages
6. **Log appropriately** - Use logger, not console
7. **Follow RLS first** - Security is paramount
8. **Optimize when needed** - Don't premature optimize

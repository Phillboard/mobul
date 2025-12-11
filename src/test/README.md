# Testing Guide

## Overview
This project uses Vitest + Testing Library for unit and integration testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test src/lib/__tests__/giftCardUtils.test.ts

# Run tests matching a pattern
npm test -- --grep "calculateProfit"
```

## Test Structure

```
src/
├── lib/
│   └── __tests__/
│       └── giftCardUtils.test.ts
├── components/
│   └── __tests__/
│       └── Button.test.tsx
├── hooks/
│   └── __tests__/
│       └── usePermissions.test.ts
└── test/
    ├── setup.ts           # Global test setup
    └── README.md          # This file
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { calculateProfit } from '../giftCardUtils';

describe('calculateProfit', () => {
  it('should calculate profit correctly', () => {
    expect(calculateProfit(25, 20, 100)).toBe(500);
  });

  it('should handle zero quantity', () => {
    expect(calculateProfit(25, 20, 0)).toBe(0);
  });
});
```

### Component Test Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Hook Test Example
```typescript
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePermissions } from '../usePermissions';

describe('usePermissions', () => {
  it('should return permission checks', () => {
    const { result } = renderHook(() => usePermissions('campaigns'));
    
    expect(result.current).toHaveProperty('canView');
    expect(result.current).toHaveProperty('canCreate');
    expect(result.current).toHaveProperty('canEdit');
  });
});
```

## Best Practices

### 1. Test Behavior, Not Implementation
❌ **Don't test internal state**
```typescript
expect(component.state.count).toBe(5);
```

✅ **Test what the user sees**
```typescript
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

### 2. Use Descriptive Test Names
❌ **Vague**
```typescript
it('works', () => { ... });
```

✅ **Descriptive**
```typescript
it('should calculate profit margin as percentage', () => { ... });
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should add item to cart', () => {
  // Arrange - Set up test data
  const cart = createCart();
  const item = { id: '1', name: 'Widget', price: 10 };

  // Act - Perform the action
  cart.addItem(item);

  // Assert - Verify the result
  expect(cart.items).toHaveLength(1);
  expect(cart.items[0]).toEqual(item);
});
```

### 4. Mock External Dependencies
```typescript
import { vi } from 'vitest';
import { supabase } from '@core/services/supabase';

// Mock Supabase
vi.mock('@core/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));
```

### 5. Use Testing Library Queries Correctly
**Priority order** (use higher priority first):
1. `getByRole` - Best for accessibility
2. `getByLabelText` - For forms
3. `getByPlaceholderText` - For inputs
4. `getByText` - For non-interactive content
5. `getByTestId` - Last resort only

```typescript
// ✅ Good - accessible and semantic
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email address');

// ❌ Avoid - brittle and not accessible
screen.getByTestId('submit-button');
```

## Mocking Supabase

Global Supabase mock is in `src/test/setup.ts`. For specific tests, override as needed:

```typescript
import { vi } from 'vitest';

// Override for specific test
const mockSelect = vi.fn().mockResolvedValue({
  data: [{ id: '1', name: 'Test Campaign' }],
  error: null,
});

vi.mocked(supabase.from).mockReturnValue({
  select: mockSelect,
  // ... other methods
} as any);
```

## Coverage Goals

**Current Coverage**: ~5%  
**Short-term Goal**: 20% (utilities + critical paths)  
**Medium-term Goal**: 40% (+ components)  
**Long-term Goal**: 60% (+ integration flows)

Focus on:
1. ✅ Utility functions (highest value)
2. ⏳ Business logic hooks
3. ⏳ Critical user flows
4. ⏳ UI components (lower priority)

## Common Issues

### Issue: "Cannot find module '@/...'\"
**Solution**: Check `vitest.config.ts` has correct path alias:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Issue: "window is not defined"
**Solution**: Ensure `environment: 'jsdom'` in `vitest.config.ts`

### Issue: "localStorage is not defined"
**Solution**: Add to `src/test/setup.ts`:
```typescript
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Kent C. Dodds Testing Guide](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Next Steps

1. Add tests for remaining utility functions
2. Test critical hooks (`usePermissions`, `useCampaigns`, etc.)
3. Add integration tests for key user flows
4. Achieve 20% coverage milestone

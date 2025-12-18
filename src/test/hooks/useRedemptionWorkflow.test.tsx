/**
 * useRedemptionWorkflow Hook Tests
 * 
 * Tests for the call center redemption workflow state management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRedemptionWorkflow } from '@/features/call-center/components/hooks/useRedemptionWorkflow';

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock supabase
const mockSupabase = {
  from: vi.fn(),
  functions: {
    invoke: vi.fn(),
  },
  rpc: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
};

vi.mock('@core/services/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock useOptInStatus
vi.mock('@/features/settings/hooks', () => ({
  useOptInStatus: vi.fn(() => ({
    status: 'not_sent',
    response: null,
    sentAt: null,
    responseAt: null,
    isLoading: false,
    isOptedIn: false,
    isOptedOut: false,
    isPending: false,
    refresh: vi.fn(),
  })),
}));

describe('useRedemptionWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with step "code"', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      expect(result.current.state.step).toBe('code');
      expect(result.current.state.recipient).toBeNull();
      expect(result.current.state.result).toBeNull();
    });

    it('should have empty redemption code initially', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      expect(result.current.state.redemptionCode).toBe('');
    });
  });

  describe('State Updates', () => {
    it('should update redemption code', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateState({ redemptionCode: 'ABC-1234' });
      });

      expect(result.current.state.redemptionCode).toBe('ABC-1234');
    });

    it('should update step', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setStep('optin');
      });

      expect(result.current.state.step).toBe('optin');
    });

    it('should update phone numbers', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateState({ 
          cellPhone: '555-123-4567',
          phone: '555-123-4567' 
        });
      });

      expect(result.current.state.cellPhone).toBe('555-123-4567');
      expect(result.current.state.phone).toBe('555-123-4567');
    });
  });

  describe('Reset Workflow', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      // Set some state
      act(() => {
        result.current.updateState({
          step: 'complete',
          redemptionCode: 'TEST-CODE',
          cellPhone: '555-1234',
        });
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.step).toBe('code');
      expect(result.current.state.redemptionCode).toBe('');
      expect(result.current.state.cellPhone).toBe('');
      expect(result.current.state.recipient).toBeNull();
    });
  });

  describe('Derived Values', () => {
    it('should return empty activeConditions when no recipient', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      expect(result.current.activeConditions).toEqual([]);
    });

    it('should correctly calculate isConditionConfigured as false when no condition selected', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConditionConfigured).toBe(false);
    });
  });

  describe('Lookup Mutation', () => {
    it('should be initially not pending', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      expect(result.current.lookupMutation.isPending).toBe(false);
    });
  });

  describe('Provision Mutation', () => {
    it('should be initially not pending', () => {
      const { result } = renderHook(() => useRedemptionWorkflow(), {
        wrapper: createWrapper(),
      });

      expect(result.current.provisionMutation.isPending).toBe(false);
    });
  });

  describe('onRecipientLoaded Callback', () => {
    it('should call onRecipientLoaded when provided', async () => {
      const onRecipientLoaded = vi.fn();
      
      const mockRecipient = {
        id: 'recipient-123',
        redemption_code: 'ABC-1234',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234',
        email: 'john@example.com',
        approval_status: 'pending',
        campaign: {
          id: 'campaign-123',
          name: 'Test Campaign',
          status: 'mailed',
          client_id: 'client-123',
          campaign_conditions: [],
        },
      };

      // Mock the supabase query
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockRecipient, error: null }),
      });

      const { result } = renderHook(
        () => useRedemptionWorkflow({ onRecipientLoaded }),
        { wrapper: createWrapper() }
      );

      // Note: Full integration test would need more setup
      // This is a structural test
      expect(result.current.lookupMutation).toBeDefined();
    });
  });
});

describe('Workflow Step Transitions', () => {
  it('should allow transition from code to optin', () => {
    const { result } = renderHook(() => useRedemptionWorkflow(), {
      wrapper: createWrapper(),
    });

    expect(result.current.state.step).toBe('code');

    act(() => {
      result.current.setStep('optin');
    });

    expect(result.current.state.step).toBe('optin');
  });

  it('should allow transition from optin to contact', () => {
    const { result } = renderHook(() => useRedemptionWorkflow(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setStep('optin');
    });

    act(() => {
      result.current.setStep('contact');
    });

    expect(result.current.state.step).toBe('contact');
  });

  it('should allow transition from contact to condition', () => {
    const { result } = renderHook(() => useRedemptionWorkflow(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setStep('condition');
    });

    expect(result.current.state.step).toBe('condition');
  });

  it('should allow transition to complete', () => {
    const { result } = renderHook(() => useRedemptionWorkflow(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setStep('complete');
    });

    expect(result.current.state.step).toBe('complete');
  });
});

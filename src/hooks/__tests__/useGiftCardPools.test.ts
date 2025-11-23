/**
 * useGiftCardPools Hook Tests
 * 
 * Tests for gift card pools data fetching hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGiftCardPools } from '../useGiftCardPools';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReactNode } from 'react';

vi.mock('@/integrations/supabase/client');

describe('useGiftCardPools', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => {
    return QueryClientProvider({ client: queryClient, children });
  };

  it('should fetch gift card pools successfully', async () => {
    const mockPools = [
      { id: '1', pool_name: 'Pool 1', available_cards: 100 },
      { id: '2', pool_name: 'Pool 2', available_cards: 200 },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockPools, error: null }),
    });
    
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useGiftCardPools('client-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPools);
  });

  it('should handle errors when fetching pools', async () => {
    const mockError = new Error('Failed to fetch');

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    });
    
    (supabase.from as any) = mockFrom;

    const { result } = renderHook(() => useGiftCardPools('client-1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

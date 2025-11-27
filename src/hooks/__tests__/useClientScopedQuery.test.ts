import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClientScopedQuery, useClientScopedSingle, useClientScopedCount } from '../useClientScopedQuery';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { ReactNode } from 'react';

// Mock dependencies
vi.mock('@/contexts/TenantContext');
vi.mock('@/integrations/supabase/client');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useClientScopedQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('useClientScopedQuery', () => {
    it('should fetch data for current client', async () => {
      vi.mocked(useTenant).mockReturnValue({
        currentClient: { id: 'client-1', name: 'Test Client' },
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: '1', name: 'Test' }],
            error: null,
          }),
        }),
      } as any);

      const { result } = renderHook(
        () => useClientScopedQuery('campaigns'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      expect(result.current.data).toEqual([{ id: '1', name: 'Test' }]);
    });

    it('should not fetch when no client selected', () => {
      vi.mocked(useTenant).mockReturnValue({
        currentClient: null,
      } as any);

      const { result } = renderHook(
        () => useClientScopedQuery('campaigns'),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should apply additional filters', async () => {
      vi.mocked(useTenant).mockReturnValue({
        currentClient: { id: 'client-1' },
      } as any);

      const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      renderHook(
        () => useClientScopedQuery('campaigns', {
          additionalFilters: { status: 'active' },
        }),
        { wrapper }
      );

      await waitFor(() => expect(selectMock).toHaveBeenCalled());
      
      // Should have called eq twice: once for client_id, once for status
      expect(eqMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('useClientScopedSingle', () => {
    it('should fetch single record', async () => {
      vi.mocked(useTenant).mockReturnValue({
        currentClient: { id: 'client-1' },
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'campaign-1', name: 'Test Campaign' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(
        () => useClientScopedSingle('campaigns', 'campaign-1'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      expect(result.current.data).toEqual({ id: 'campaign-1', name: 'Test Campaign' });
    });

    it('should return null for missing record', async () => {
      vi.mocked(useTenant).mockReturnValue({
        currentClient: { id: 'client-1' },
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(
        () => useClientScopedSingle('campaigns', 'nonexistent'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      expect(result.current.data).toBeNull();
    });
  });

  describe('useClientScopedCount', () => {
    it('should return count of records', async () => {
      vi.mocked(useTenant).mockReturnValue({
        currentClient: { id: 'client-1' },
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            count: 5,
            error: null,
          }),
        }),
      } as any);

      const { result } = renderHook(
        () => useClientScopedCount('campaigns'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      expect(result.current.data).toBe(5);
    });

    it('should return 0 when no client selected', async () => {
      vi.mocked(useTenant).mockReturnValue({
        currentClient: null,
      } as any);

      const { result } = renderHook(
        () => useClientScopedCount('campaigns'),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      expect(result.current.data).toBe(0);
    });
  });
});


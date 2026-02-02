/**
 * Tillo Brand Sync Hook
 * 
 * React hook for syncing brand data with Tillo API.
 * Uses typed API client for edge function calls.
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import type { TilloBrandSearchResult } from '@/types/giftCards';

export function useTilloBrandSync() {
  const [syncResult, setSyncResult] = useState<TilloBrandSearchResult | null>(null);

  /**
   * Sync brand with Tillo API
   */
  const syncWithTillo = useMutation({
    mutationFn: async (brandName: string): Promise<TilloBrandSearchResult> => {
      try {
        const data = await callEdgeFunction<TilloBrandSearchResult>(
          Endpoints.giftCards.lookupBrand,
          { brandName }
        );

        return data;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn('Tillo sync failed:', errorMessage);
        // Return not found for graceful degradation
        return {
          found: false,
          error: 'Tillo API is currently unavailable',
        };
      }
    },
    onSuccess: (data) => {
      setSyncResult(data);
    },
  });

  /**
   * Reset sync state
   */
  const reset = useCallback(() => {
    setSyncResult(null);
  }, []);

  return {
    syncWithTillo: syncWithTillo.mutate,
    syncWithTilloAsync: syncWithTillo.mutateAsync,
    isSyncing: syncWithTillo.isPending,
    syncResult,
    syncError: syncWithTillo.error,
    reset,
  };
}


/**
 * Tillo Brand Sync Hook
 * 
 * React hook for syncing brand data with Tillo API
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import type { TilloBrandSearchResult } from '@/types/giftCards';

export function useTilloBrandSync() {
  const [syncResult, setSyncResult] = useState<TilloBrandSearchResult | null>(null);

  /**
   * Sync brand with Tillo API
   */
  const syncWithTillo = useMutation({
    mutationFn: async (brandName: string): Promise<TilloBrandSearchResult> => {
      try {
        const { data, error } = await supabase.functions.invoke('lookup-tillo-brand', {
          body: { brandName },
        });

        // Handle Supabase function invocation errors
        if (error) {
          console.warn('Tillo sync failed:', error.message);
          // Return not found instead of throwing
          return {
            found: false,
            error: 'Tillo API is currently unavailable',
          };
        }

        return data as TilloBrandSearchResult;
      } catch (err: any) {
        console.warn('Tillo sync failed:', err);
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


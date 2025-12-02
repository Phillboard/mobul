/**
 * Tillo Brand Sync Hook
 * 
 * React hook for syncing brand data with Tillo API
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TilloBrandSearchResult } from '@/types/giftCards';

export function useTilloBrandSync() {
  const [syncResult, setSyncResult] = useState<TilloBrandSearchResult | null>(null);

  /**
   * Sync brand with Tillo API
   */
  const syncWithTillo = useMutation({
    mutationFn: async (brandName: string): Promise<TilloBrandSearchResult> => {
      const { data, error } = await supabase.functions.invoke('lookup-tillo-brand', {
        body: { brandName },
      });

      if (error) {
        throw new Error(error.message || 'Failed to lookup brand in Tillo');
      }

      return data as TilloBrandSearchResult;
    },
    onSuccess: (data) => {
      setSyncResult(data);
    },
  });

  /**
   * Reset sync state
   */
  const reset = () => {
    setSyncResult(null);
  };

  return {
    syncWithTillo: syncWithTillo.mutate,
    syncWithTilloAsync: syncWithTillo.mutateAsync,
    isSyncing: syncWithTillo.isPending,
    syncResult,
    syncError: syncWithTillo.error,
    reset,
  };
}


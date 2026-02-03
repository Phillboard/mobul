/**
 * useBrandSearch Hook
 * 
 * Combined search hook that queries both local database and Tillo API.
 * Returns merged, deduplicated results with source indicators.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useDebounce } from '@/shared/hooks/useDebounce';

export interface BrandSearchResult {
  id?: string;
  brandName: string;
  brandCode?: string;
  tilloBrandCode?: string;
  logoUrl?: string;
  denominations: number[];
  inventoryCount: number;
  source: 'local' | 'tillo' | 'both';
  isEnabled: boolean;
  category?: string;
}

interface TilloSearchResponse {
  found: boolean;
  tillo_brand_code?: string;
  brand_name?: string;
  denominations?: number[];
  costs?: Array<{ denomination: number; cost: number }>;
  error?: string;
  results?: Array<{
    tillo_brand_code: string;
    brand_name: string;
    denominations: number[];
    logo_url?: string;
  }>;
}

export function useBrandSearch(options?: { enableTillo?: boolean }) {
  const { enableTillo = true } = options || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'local' | 'tillo'>('all');
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  const shouldSearch = debouncedQuery.length >= 2;

  // Query local brands
  const { data: localBrands, isLoading: isLoadingLocal } = useQuery({
    queryKey: ['brand-search-local', debouncedQuery],
    queryFn: async () => {
      const query = supabase
        .from('gift_card_brands')
        .select(`
          id,
          brand_name,
          brand_code,
          tillo_brand_code,
          logo_url,
          is_enabled_by_admin,
          category,
          gift_card_denominations(denomination)
        `)
        .order('brand_name');
      
      if (debouncedQuery) {
        query.ilike('brand_name', `%${debouncedQuery}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: true, // Always fetch local brands
    staleTime: 30000,
  });

  // Query inventory counts
  const { data: inventoryCounts } = useQuery({
    queryKey: ['brand-inventory-counts-search'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_inventory')
        .select('brand_id')
        .eq('status', 'available');
      
      if (error) throw error;
      
      const counts = new Map<string, number>();
      data?.forEach((item) => {
        counts.set(item.brand_id, (counts.get(item.brand_id) || 0) + 1);
      });
      return counts;
    },
    staleTime: 30000,
  });

  // Query Tillo API (only when searching)
  const { data: tilloResults, isLoading: isLoadingTillo, isFetching: isFetchingTillo } = useQuery({
    queryKey: ['brand-search-tillo', debouncedQuery],
    queryFn: async (): Promise<TilloSearchResponse> => {
      try {
        const data = await callEdgeFunction<TilloSearchResponse>(
          Endpoints.giftCards.lookupBrand,
          { brandName: debouncedQuery, search: true }
        );
        return data;
      } catch (err) {
        console.warn('Tillo search failed:', err);
        return { found: false, error: 'Tillo API unavailable' };
      }
    },
    enabled: shouldSearch && enableTillo && filter !== 'local',
    staleTime: 60000, // Cache Tillo results for 1 minute
  });

  // Merge and deduplicate results
  const searchResults = useMemo((): BrandSearchResult[] => {
    const results: BrandSearchResult[] = [];
    const seenBrands = new Set<string>();

    // Add local brands first
    if (filter !== 'tillo' && localBrands) {
      for (const brand of localBrands) {
        const key = brand.brand_name.toLowerCase();
        seenBrands.add(key);
        
        const denominations = (brand.gift_card_denominations as any[] || [])
          .map((d: any) => Number(d.denomination))
          .sort((a, b) => a - b);

        results.push({
          id: brand.id,
          brandName: brand.brand_name,
          brandCode: brand.brand_code,
          tilloBrandCode: brand.tillo_brand_code || undefined,
          logoUrl: brand.logo_url || undefined,
          denominations,
          inventoryCount: inventoryCounts?.get(brand.id) || 0,
          source: brand.tillo_brand_code ? 'both' : 'local',
          isEnabled: brand.is_enabled_by_admin,
          category: brand.category || undefined,
        });
      }
    }

    // Add Tillo results (if not already in local)
    if (filter !== 'local' && tilloResults?.results) {
      for (const brand of tilloResults.results) {
        const key = brand.brand_name.toLowerCase();
        
        // Check if already exists locally
        const existingIndex = results.findIndex(
          r => r.brandName.toLowerCase() === key || r.tilloBrandCode === brand.tillo_brand_code
        );
        
        if (existingIndex >= 0) {
          // Update existing to show it's in both
          results[existingIndex].source = 'both';
          if (!results[existingIndex].tilloBrandCode) {
            results[existingIndex].tilloBrandCode = brand.tillo_brand_code;
          }
        } else if (!seenBrands.has(key)) {
          seenBrands.add(key);
          results.push({
            brandName: brand.brand_name,
            tilloBrandCode: brand.tillo_brand_code,
            logoUrl: brand.logo_url,
            denominations: brand.denominations || [],
            inventoryCount: 0,
            source: 'tillo',
            isEnabled: false,
          });
        }
      }
    }
    
    // Handle single Tillo result (legacy format)
    if (filter !== 'local' && tilloResults?.found && !tilloResults.results) {
      const key = tilloResults.brand_name?.toLowerCase() || '';
      if (key && !seenBrands.has(key)) {
        results.push({
          brandName: tilloResults.brand_name || '',
          tilloBrandCode: tilloResults.tillo_brand_code,
          denominations: tilloResults.denominations || [],
          inventoryCount: 0,
          source: 'tillo',
          isEnabled: false,
        });
      }
    }

    // Sort by relevance (exact match first, then alphabetically)
    const query = debouncedQuery.toLowerCase();
    return results.sort((a, b) => {
      const aExact = a.brandName.toLowerCase() === query;
      const bExact = b.brandName.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Prioritize local brands
      if (a.source !== 'tillo' && b.source === 'tillo') return -1;
      if (a.source === 'tillo' && b.source !== 'tillo') return 1;
      
      return a.brandName.localeCompare(b.brandName);
    });
  }, [localBrands, tilloResults, inventoryCounts, filter, debouncedQuery]);

  // Apply filter
  const filteredResults = useMemo(() => {
    if (filter === 'all') return searchResults;
    if (filter === 'local') return searchResults.filter(r => r.source !== 'tillo');
    if (filter === 'tillo') return searchResults.filter(r => r.source === 'tillo' || r.source === 'both');
    return searchResults;
  }, [searchResults, filter]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    // Search state
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    
    // Results
    results: filteredResults,
    allResults: searchResults,
    
    // Loading states
    isLoading: isLoadingLocal || (isFetchingTillo && shouldSearch),
    isLoadingLocal,
    isLoadingTillo: isFetchingTillo,
    
    // Helpers
    clearSearch,
    hasResults: filteredResults.length > 0,
    totalCount: filteredResults.length,
    localCount: searchResults.filter(r => r.source !== 'tillo').length,
    tilloCount: searchResults.filter(r => r.source === 'tillo').length,
  };
}

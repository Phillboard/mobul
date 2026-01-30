/**
 * useActivityFilters Hook
 * 
 * State management for activity log filters with URL sync.
 */

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActivityFilters, ActivityStatus, ActivitySeverity } from '../types/activity.types';

interface UseActivityFiltersOptions {
  defaultFilters?: Partial<ActivityFilters>;
  syncWithUrl?: boolean;
}

interface UseActivityFiltersReturn {
  filters: ActivityFilters;
  setFilter: <K extends keyof ActivityFilters>(key: K, value: ActivityFilters[K]) => void;
  setFilters: (filters: Partial<ActivityFilters>) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof ActivityFilters) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const DATE_PRESETS = {
  today: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      start: today.toISOString(),
      end: new Date().toISOString(),
    };
  },
  yesterday: () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    return {
      start: yesterday.toISOString(),
      end: yesterdayEnd.toISOString(),
    };
  },
  last_7_days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  },
  last_30_days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  },
  this_month: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  },
  last_month: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  },
};

export type DatePreset = keyof typeof DATE_PRESETS;

export function useActivityFilters({
  defaultFilters = {},
  syncWithUrl = true,
}: UseActivityFiltersOptions = {}): UseActivityFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse initial filters from URL or defaults
  const initialFilters = useMemo((): ActivityFilters => {
    if (!syncWithUrl) return defaultFilters;

    const urlFilters: ActivityFilters = {};
    
    const search = searchParams.get('search');
    if (search) urlFilters.search = search;
    
    const status = searchParams.get('status');
    if (status) urlFilters.status = status.split(',') as ActivityStatus[];
    
    const event_types = searchParams.get('event_types');
    if (event_types) urlFilters.event_types = event_types.split(',');
    
    const date_start = searchParams.get('date_start');
    const date_end = searchParams.get('date_end');
    if (date_start && date_end) {
      urlFilters.date_range = { start: date_start, end: date_end };
    }

    const severity = searchParams.get('severity');
    if (severity) urlFilters.severity = severity.split(',') as ActivitySeverity[];

    return { ...defaultFilters, ...urlFilters };
  }, [searchParams, defaultFilters, syncWithUrl]);

  const [filters, setFiltersState] = useState<ActivityFilters>(initialFilters);

  // Sync to URL when filters change
  const syncFiltersToUrl = useCallback((newFilters: ActivityFilters) => {
    if (!syncWithUrl) return;

    const params = new URLSearchParams(searchParams);
    
    // Preserve tab parameter
    const tab = params.get('tab');
    params.delete('search');
    params.delete('status');
    params.delete('event_types');
    params.delete('date_start');
    params.delete('date_end');
    params.delete('severity');
    
    if (tab) params.set('tab', tab);
    
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.status?.length) params.set('status', newFilters.status.join(','));
    if (newFilters.event_types?.length) params.set('event_types', newFilters.event_types.join(','));
    if (newFilters.date_range) {
      params.set('date_start', newFilters.date_range.start);
      params.set('date_end', newFilters.date_range.end);
    }
    if (newFilters.severity?.length) params.set('severity', newFilters.severity.join(','));

    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams, syncWithUrl]);

  const setFilter = useCallback(<K extends keyof ActivityFilters>(
    key: K, 
    value: ActivityFilters[K]
  ) => {
    setFiltersState(prev => {
      const newFilters = { ...prev, [key]: value };
      syncFiltersToUrl(newFilters);
      return newFilters;
    });
  }, [syncFiltersToUrl]);

  const setFilters = useCallback((newFilters: Partial<ActivityFilters>) => {
    setFiltersState(prev => {
      const merged = { ...prev, ...newFilters };
      syncFiltersToUrl(merged);
      return merged;
    });
  }, [syncFiltersToUrl]);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    syncFiltersToUrl({});
  }, [syncFiltersToUrl]);

  const clearFilter = useCallback((key: keyof ActivityFilters) => {
    setFiltersState(prev => {
      const { [key]: _, ...rest } = prev;
      syncFiltersToUrl(rest);
      return rest;
    });
  }, [syncFiltersToUrl]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status?.length) count++;
    if (filters.event_types?.length) count++;
    if (filters.date_range) count++;
    if (filters.severity?.length) count++;
    if (filters.user_id) count++;
    if (filters.campaign_id) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  };
}

export { DATE_PRESETS };
export default useActivityFilters;

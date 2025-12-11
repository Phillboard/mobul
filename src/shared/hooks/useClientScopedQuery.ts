/**
 * Shared Query Hook for Client-Scoped Data
 * 
 * Reduces duplication across hooks that fetch client-specific data
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useTenant } from "@/contexts/TenantContext";

interface ClientScopedQueryOptions<T> extends Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'> {
  /**
   * Additional conditions to add to the query
   */
  additionalFilters?: Record<string, any>;
  /**
   * Custom select string (default: '*')
   */
  select?: string;
  /**
   * Order by clause
   */
  orderBy?: { column: string; ascending?: boolean };
  /**
   * Limit results
   */
  limit?: number;
}

/**
 * Fetch data scoped to current client
 * 
 * @example
 * const { data: campaigns } = useClientScopedQuery('campaigns', {
 *   select: 'id, name, status',
 *   orderBy: { column: 'created_at', ascending: false }
 * });
 */
export function useClientScopedQuery<T = any>(
  tableName: string,
  options?: ClientScopedQueryOptions<T>
) {
  const { currentClient } = useTenant();
  const {
    additionalFilters = {},
    select = '*',
    orderBy,
    limit,
    ...queryOptions
  } = options || {};

  return useQuery<T[], Error>({
    queryKey: [tableName, currentClient?.id, additionalFilters, select, orderBy, limit],
    queryFn: async () => {
      if (!currentClient?.id) {
        throw new Error('No client selected');
      }

      let query = supabase
        .from(tableName)
        .select(select)
        .eq('client_id', currentClient.id);

      // Apply additional filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!currentClient?.id && (queryOptions.enabled !== false),
    ...queryOptions,
  });
}

/**
 * Fetch a single record scoped to current client
 */
export function useClientScopedSingle<T = any>(
  tableName: string,
  recordId: string | undefined,
  options?: Omit<ClientScopedQueryOptions<T>, 'limit'>
) {
  const { currentClient } = useTenant();
  const { select = '*', ...queryOptions } = options || {};

  return useQuery<T | null, Error>({
    queryKey: [tableName, recordId, currentClient?.id, select],
    queryFn: async () => {
      if (!recordId || !currentClient?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(select)
        .eq('id', recordId)
        .eq('client_id', currentClient.id)
        .maybeSingle();

      if (error) throw error;
      return data as T | null;
    },
    enabled: !!recordId && !!currentClient?.id && (queryOptions.enabled !== false),
    ...queryOptions,
  });
}

/**
 * Count records for current client
 */
export function useClientScopedCount(
  tableName: string,
  filters?: Record<string, any>
) {
  const { currentClient } = useTenant();

  return useQuery<number, Error>({
    queryKey: [tableName, 'count', currentClient?.id, filters],
    queryFn: async () => {
      if (!currentClient?.id) {
        return 0;
      }

      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('client_id', currentClient.id);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentClient?.id,
  });
}


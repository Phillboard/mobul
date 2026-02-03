/**
 * useClientBrandAccess Hook
 * 
 * Manages client-level gift card brand availability.
 * Used by agency owners to control which brands their clients can access.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { toast } from 'sonner';

export interface ClientBrandConfig {
  brandId: string;
  brandName: string;
  logoUrl?: string;
  denominations: Array<{
    denomination: number;
    isEnabled: boolean;
  }>;
}

/**
 * Fetch clients for an agency
 */
export function useAgencyClients(agencyId: string | null) {
  return useQuery({
    queryKey: ['agency-clients', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      // Get clients associated with this agency via agency_client_assignments
      const { data, error } = await supabase
        .from('agency_client_assignments')
        .select(`
          client_id,
          clients (id, name)
        `)
        .eq('agency_org_id', agencyId);
      
      if (error) throw error;
      
      return (data || [])
        .filter((d: any) => d.clients)
        .map((d: any) => ({
          id: d.clients.id,
          name: d.clients.name,
        }));
    },
    enabled: !!agencyId,
  });
}

/**
 * Fetch brand access configuration for a specific client
 * Only shows brands that are enabled for the agency
 */
export function useClientBrandAccessConfig(clientId: string | null, agencyId: string | null) {
  return useQuery({
    queryKey: ['client-brand-access', clientId, agencyId],
    queryFn: async () => {
      if (!clientId || !agencyId) return [];
      
      // Get agency's enabled brands
      const { data: agencyBrands, error: agencyError } = await supabase
        .from('agency_available_gift_cards')
        .select(`
          brand_id,
          denomination,
          is_enabled,
          gift_card_brands (brand_name, logo_url)
        `)
        .eq('agency_id', agencyId)
        .eq('is_enabled', true);
      
      if (agencyError) throw agencyError;
      
      // Get client's enabled brands/denominations
      const { data: clientAccess, error: clientError } = await supabase
        .from('client_available_gift_cards')
        .select('brand_id, denomination, is_enabled')
        .eq('client_id', clientId);
      
      if (clientError) throw clientError;
      
      // Create a map for quick lookup of client access
      const clientAccessMap = new Map<string, boolean>();
      clientAccess?.forEach((item) => {
        const key = `${item.brand_id}-${item.denomination}`;
        clientAccessMap.set(key, item.is_enabled);
      });
      
      // Group by brand
      const brandMap = new Map<string, ClientBrandConfig>();
      
      agencyBrands?.forEach((item: any) => {
        const brandId = item.brand_id;
        const key = `${brandId}-${item.denomination}`;
        
        if (!brandMap.has(brandId)) {
          const brand = item.gift_card_brands;
          brandMap.set(brandId, {
            brandId,
            brandName: brand?.brand_name || "Unknown",
            logoUrl: brand?.logo_url,
            denominations: [],
          });
        }
        
        brandMap.get(brandId)!.denominations.push({
          denomination: Number(item.denomination),
          isEnabled: clientAccessMap.get(key) ?? false,
        });
      });
      
      // Sort denominations
      return Array.from(brandMap.values()).map(brand => ({
        ...brand,
        denominations: brand.denominations.sort((a, b) => a.denomination - b.denomination),
      }));
    },
    enabled: !!clientId && !!agencyId,
  });
}

/**
 * Update brand access for a client
 */
export function useUpdateClientBrandAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      clientId,
      brandId,
      denomination,
      isEnabled,
    }: {
      clientId: string;
      brandId: string;
      denomination: number;
      isEnabled: boolean;
    }) => {
      const { error } = await supabase
        .from('client_available_gift_cards')
        .upsert(
          {
            client_id: clientId,
            brand_id: brandId,
            denomination,
            is_enabled: isEnabled,
          },
          {
            onConflict: 'client_id,brand_id,denomination',
          }
        );
      
      if (error) throw error;
      return { clientId, brandId, denomination, isEnabled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-brand-access', data.clientId] });
    },
    onError: (error) => {
      console.error('Failed to update client brand access:', error);
      toast.error('Failed to update brand access');
    },
  });
}

/**
 * Bulk update brand access for a client
 */
export function useBulkUpdateClientBrandAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      clientId,
      updates,
    }: {
      clientId: string;
      updates: Array<{
        brandId: string;
        denomination: number;
        isEnabled: boolean;
      }>;
    }) => {
      const records = updates.map((u) => ({
        client_id: clientId,
        brand_id: u.brandId,
        denomination: u.denomination,
        is_enabled: u.isEnabled,
      }));
      
      const { error } = await supabase
        .from('client_available_gift_cards')
        .upsert(records, {
          onConflict: 'client_id,brand_id,denomination',
        });
      
      if (error) throw error;
      return { clientId, count: updates.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-brand-access', data.clientId] });
      toast.success(`Updated ${data.count} brand configurations`);
    },
    onError: (error) => {
      console.error('Failed to bulk update client brand access:', error);
      toast.error('Failed to update brand access');
    },
  });
}

/**
 * useAgencyBrandAccess Hook
 * 
 * Manages agency-level gift card brand availability.
 * Used by platform admins to control which brands agencies can access.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { toast } from 'sonner';

export interface AgencyBrandAccess {
  agencyId: string;
  brandId: string;
  denomination: number;
  isEnabled: boolean;
}

export interface AgencyBrandConfig {
  brandId: string;
  brandName: string;
  logoUrl?: string;
  denominations: Array<{
    denomination: number;
    isEnabled: boolean;
  }>;
}

/**
 * Fetch all agencies for selection
 * Tries agencies table first, then falls back to organizations with type='agency'
 */
export function useAgencies() {
  return useQuery({
    queryKey: ['agencies-list'],
    queryFn: async () => {
      // First try the agencies table
      const { data: agenciesData, error: agenciesError } = await supabase
        .from('agencies')
        .select('id, name, slug, gift_card_markup_percentage')
        .order('name');
      
      if (!agenciesError && agenciesData && agenciesData.length > 0) {
        return agenciesData;
      }
      
      // Fallback to organizations table with type='agency'
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, settings_json')
        .eq('type', 'agency')
        .order('name');
      
      if (orgsError) {
        console.error('Error fetching agencies:', orgsError);
        throw orgsError;
      }
      
      // Map organizations to agency format
      return (orgsData || []).map(org => ({
        id: org.id,
        name: org.name,
        slug: org.name.toLowerCase().replace(/\s+/g, '-'),
        gift_card_markup_percentage: org.settings_json?.gift_card_markup_percentage || 0,
      }));
    },
  });
}

/**
 * Fetch brand access configuration for a specific agency
 * Shows ALL brands in the system for admin configuration
 */
export function useAgencyBrandAccessConfig(agencyId: string | null) {
  return useQuery({
    queryKey: ['agency-brand-access', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      // Get ALL brands with their denominations (not filtered by is_enabled_by_admin)
      const { data: brands, error: brandsError } = await supabase
        .from('gift_card_brands')
        .select(`
          id,
          brand_name,
          logo_url,
          is_enabled_by_admin,
          gift_card_denominations(denomination, is_enabled_by_admin)
        `)
        .order('brand_name');
      
      if (brandsError) {
        console.error('Error fetching brands:', brandsError);
        throw brandsError;
      }
      
      console.log('[useAgencyBrandAccessConfig] Fetched brands:', brands?.length || 0);
      
      // If no brands exist, try multiple fallbacks
      if (!brands || brands.length === 0) {
        console.log('[useAgencyBrandAccessConfig] No brands in gift_card_brands table, trying inventory fallback');
        
        // Fallback 1: Get unique brands from inventory
        const { data: inventoryBrands } = await supabase
          .from('gift_card_inventory')
          .select('brand_id, denomination')
          .limit(1000);
        
        console.log('[useAgencyBrandAccessConfig] Inventory items:', inventoryBrands?.length || 0);
        
        if (inventoryBrands && inventoryBrands.length > 0) {
          // Get unique brand IDs
          const brandIds = [...new Set(inventoryBrands.map(i => i.brand_id))];
          const { data: brandDetails } = await supabase
            .from('gift_card_brands')
            .select('id, brand_name, logo_url')
            .in('id', brandIds);
          
          if (brandDetails && brandDetails.length > 0) {
            // Build brands with denominations from inventory
            const brandMap = new Map<string, Set<number>>();
            inventoryBrands.forEach(inv => {
              if (!brandMap.has(inv.brand_id)) {
                brandMap.set(inv.brand_id, new Set());
              }
              brandMap.get(inv.brand_id)!.add(inv.denomination);
            });
            
            // Get agency's enabled brands/denominations
            const { data: agencyAccess } = await supabase
              .from('agency_available_gift_cards')
              .select('brand_id, denomination, is_enabled')
              .eq('agency_id', agencyId);
            
            const accessMap = new Map<string, boolean>();
            agencyAccess?.forEach((item) => {
              const key = `${item.brand_id}-${item.denomination}`;
              accessMap.set(key, item.is_enabled);
            });
            
            return brandDetails.map(brand => ({
              brandId: brand.id,
              brandName: brand.brand_name,
              logoUrl: brand.logo_url || undefined,
              denominations: Array.from(brandMap.get(brand.id) || [])
                .map(d => ({
                  denomination: d,
                  isEnabled: accessMap.get(`${brand.id}-${d}`) ?? false,
                }))
                .sort((a, b) => a.denomination - b.denomination),
            }));
          }
        }
        
        console.log('[useAgencyBrandAccessConfig] No brands found in system');
        return [];
      }
      
      // Get agency's enabled brands/denominations
      const { data: agencyAccess, error: accessError } = await supabase
        .from('agency_available_gift_cards')
        .select('brand_id, denomination, is_enabled')
        .eq('agency_id', agencyId);
      
      if (accessError) throw accessError;
      
      // Create a map for quick lookup
      const accessMap = new Map<string, boolean>();
      agencyAccess?.forEach((item) => {
        const key = `${item.brand_id}-${item.denomination}`;
        accessMap.set(key, item.is_enabled);
      });
      
      // Build the config - include brands even if they have no denominations set up
      const config: AgencyBrandConfig[] = (brands || []).map((brand) => {
        const denoms = brand.gift_card_denominations as any[] || [];
        
        // If no denominations defined, create default ones
        const denominations = denoms.length > 0
          ? denoms
              .filter((d: any) => d.is_enabled_by_admin !== false)
              .map((d: any) => {
                const key = `${brand.id}-${d.denomination}`;
                return {
                  denomination: Number(d.denomination),
                  isEnabled: accessMap.get(key) ?? false,
                };
              })
              .sort((a, b) => a.denomination - b.denomination)
          : [10, 25, 50, 100].map(d => ({
              denomination: d,
              isEnabled: accessMap.get(`${brand.id}-${d}`) ?? false,
            }));
        
        return {
          brandId: brand.id,
          brandName: brand.brand_name,
          logoUrl: brand.logo_url || undefined,
          denominations,
        };
      });
      
      // Filter out brands with no denominations (shouldn't happen now)
      return config.filter(b => b.denominations.length > 0);
    },
    enabled: !!agencyId,
  });
}

/**
 * Update brand access for an agency
 */
export function useUpdateAgencyBrandAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      agencyId,
      brandId,
      denomination,
      isEnabled,
    }: {
      agencyId: string;
      brandId: string;
      denomination: number;
      isEnabled: boolean;
    }) => {
      console.log('[useUpdateAgencyBrandAccess] Updating:', { agencyId, brandId, denomination, isEnabled });
      
      // Check if agency exists in agencies table (required by FK constraint)
      const { data: agencyExists } = await supabase
        .from('agencies')
        .select('id')
        .eq('id', agencyId)
        .single();
      
      // If agency doesn't exist in agencies table, try to create it from organizations
      if (!agencyExists) {
        console.log('[useUpdateAgencyBrandAccess] Agency not in agencies table, checking organizations...');
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', agencyId)
          .single();
        
        if (orgData) {
          // Create agency record
          const { error: createError } = await supabase
            .from('agencies')
            .insert({
              id: orgData.id,
              name: orgData.name,
              slug: orgData.name.toLowerCase().replace(/\s+/g, '-'),
            });
          
          if (createError && !createError.message.includes('duplicate')) {
            console.error('[useUpdateAgencyBrandAccess] Failed to create agency:', createError);
            throw new Error(`Cannot create agency record: ${createError.message}`);
          }
        } else {
          throw new Error('Agency not found in system');
        }
      }
      
      // Upsert the access record
      const { error } = await supabase
        .from('agency_available_gift_cards')
        .upsert(
          {
            agency_id: agencyId,
            brand_id: brandId,
            denomination,
            is_enabled: isEnabled,
          },
          {
            onConflict: 'agency_id,brand_id,denomination',
          }
        );
      
      if (error) {
        console.error('[useUpdateAgencyBrandAccess] Upsert error:', error);
        throw error;
      }
      
      return { agencyId, brandId, denomination, isEnabled };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agency-brand-access', data.agencyId] });
      toast.success('Brand access updated');
    },
    onError: (error: any) => {
      console.error('Failed to update agency brand access:', error);
      toast.error(error.message || 'Failed to update brand access');
    },
  });
}

/**
 * Bulk update brand access for an agency
 */
export function useBulkUpdateAgencyBrandAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      agencyId,
      updates,
    }: {
      agencyId: string;
      updates: Array<{
        brandId: string;
        denomination: number;
        isEnabled: boolean;
      }>;
    }) => {
      console.log('[useBulkUpdateAgencyBrandAccess] Bulk updating:', updates.length, 'items for agency:', agencyId);
      
      // Ensure agency exists in agencies table
      const { data: agencyExists } = await supabase
        .from('agencies')
        .select('id')
        .eq('id', agencyId)
        .single();
      
      if (!agencyExists) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', agencyId)
          .single();
        
        if (orgData) {
          const { error: createError } = await supabase
            .from('agencies')
            .insert({
              id: orgData.id,
              name: orgData.name,
              slug: orgData.name.toLowerCase().replace(/\s+/g, '-'),
            });
          
          if (createError && !createError.message.includes('duplicate')) {
            throw new Error(`Cannot create agency record: ${createError.message}`);
          }
        }
      }
      
      const records = updates.map((u) => ({
        agency_id: agencyId,
        brand_id: u.brandId,
        denomination: u.denomination,
        is_enabled: u.isEnabled,
      }));
      
      const { error } = await supabase
        .from('agency_available_gift_cards')
        .upsert(records, {
          onConflict: 'agency_id,brand_id,denomination',
        });
      
      if (error) {
        console.error('[useBulkUpdateAgencyBrandAccess] Error:', error);
        throw error;
      }
      
      return { agencyId, count: updates.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agency-brand-access', data.agencyId] });
      toast.success(`Updated ${data.count} brand configurations`);
    },
    onError: (error: any) => {
      console.error('Failed to bulk update agency brand access:', error);
      toast.error(error.message || 'Failed to update brand access');
    },
  });
}

// Default brands to enable for new agencies
const DEFAULT_BRANDS = ['starbucks', 'dominos', 'domin'];
const DEFAULT_DENOMINATIONS = [10, 25, 50];

/**
 * Initialize default brand access for a new agency
 * Sets up Starbucks and Dominos with common denominations
 */
export function useInitializeAgencyDefaults() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agencyId: string) => {
      console.log('[useInitializeAgencyDefaults] Initializing for agency:', agencyId);
      
      // Ensure agency exists in agencies table first
      const { data: agencyExists } = await supabase
        .from('agencies')
        .select('id')
        .eq('id', agencyId)
        .single();
      
      if (!agencyExists) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', agencyId)
          .single();
        
        if (orgData) {
          const { error: createError } = await supabase
            .from('agencies')
            .insert({
              id: orgData.id,
              name: orgData.name,
              slug: orgData.name.toLowerCase().replace(/\s+/g, '-'),
            });
          
          if (createError && !createError.message.includes('duplicate')) {
            throw new Error(`Cannot create agency record: ${createError.message}`);
          }
          console.log('[useInitializeAgencyDefaults] Created agency record from organization');
        }
      }
      
      // Find Starbucks and Dominos brands
      const { data: brands, error: brandsError } = await supabase
        .from('gift_card_brands')
        .select('id, brand_name, brand_code')
        .or(`brand_name.ilike.%starbucks%,brand_name.ilike.%domino%,brand_code.ilike.%starbucks%,brand_code.ilike.%domino%`);
      
      if (brandsError) throw brandsError;
      
      if (!brands || brands.length === 0) {
        throw new Error('Default brands (Starbucks, Dominos) not found in system. Please add them first.');
      }
      
      // Get denominations for these brands
      const brandIds = brands.map(b => b.id);
      const { data: denoms } = await supabase
        .from('gift_card_denominations')
        .select('brand_id, denomination')
        .in('brand_id', brandIds);
      
      // Create access records
      const records: Array<{
        agency_id: string;
        brand_id: string;
        denomination: number;
        is_enabled: boolean;
      }> = [];
      
      brands.forEach(brand => {
        const brandDenoms = denoms?.filter(d => d.brand_id === brand.id).map(d => d.denomination) || [];
        // If no denominations defined, use defaults
        const denomsToUse = brandDenoms.length > 0 ? brandDenoms : DEFAULT_DENOMINATIONS;
        
        denomsToUse.forEach(denom => {
          records.push({
            agency_id: agencyId,
            brand_id: brand.id,
            denomination: Number(denom),
            is_enabled: true,
          });
        });
      });
      
      if (records.length === 0) {
        throw new Error('No denominations found for default brands');
      }
      
      console.log('[useInitializeAgencyDefaults] Upserting', records.length, 'records');
      
      const { error: upsertError } = await supabase
        .from('agency_available_gift_cards')
        .upsert(records, {
          onConflict: 'agency_id,brand_id,denomination',
        });
      
      if (upsertError) {
        console.error('[useInitializeAgencyDefaults] Upsert error:', upsertError);
        throw upsertError;
      }
      
      return { agencyId, count: records.length, brands: brands.map(b => b.brand_name) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agency-brand-access', data.agencyId] });
      toast.success(`Enabled ${data.brands.join(', ')} with ${data.count} denomination options`);
    },
    onError: (error) => {
      console.error('Failed to initialize agency defaults:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize defaults');
    },
  });
}

/**
 * Copy brand access from one agency to another
 */
export function useCopyAgencyBrandAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      sourceAgencyId,
      targetAgencyId,
    }: {
      sourceAgencyId: string;
      targetAgencyId: string;
    }) => {
      // Get source agency's access
      const { data: sourceAccess, error: fetchError } = await supabase
        .from('agency_available_gift_cards')
        .select('brand_id, denomination, is_enabled')
        .eq('agency_id', sourceAgencyId);
      
      if (fetchError) throw fetchError;
      
      if (!sourceAccess || sourceAccess.length === 0) {
        throw new Error('Source agency has no brand configurations');
      }
      
      // Create records for target agency
      const records = sourceAccess.map((item) => ({
        agency_id: targetAgencyId,
        brand_id: item.brand_id,
        denomination: item.denomination,
        is_enabled: item.is_enabled,
      }));
      
      const { error: upsertError } = await supabase
        .from('agency_available_gift_cards')
        .upsert(records, {
          onConflict: 'agency_id,brand_id,denomination',
        });
      
      if (upsertError) throw upsertError;
      
      return { targetAgencyId, count: records.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agency-brand-access', data.targetAgencyId] });
      toast.success(`Copied ${data.count} brand configurations`);
    },
    onError: (error) => {
      console.error('Failed to copy agency brand access:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to copy brand access');
    },
  });
}

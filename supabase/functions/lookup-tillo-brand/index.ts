/**
 * Tillo Brand Lookup Edge Function
 * 
 * Securely queries Tillo API to search for brands and retrieve:
 * - Brand codes
 * - Available denominations
 * - Pricing information
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTilloClient } from '../_shared/tillo-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TilloBrandSearchRequest {
  brandName: string;
}

interface TilloBrandSearchResponse {
  found: boolean;
  tillo_brand_code?: string;
  brand_name?: string;
  denominations?: number[];
  costs?: Array<{
    denomination: number;
    cost: number;
  }>;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: userData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userData || userData.role !== 'platform_admin') {
      throw new Error('Insufficient permissions. Admin access required.');
    }

    // Parse request body
    const { brandName }: TilloBrandSearchRequest = await req.json();

    if (!brandName || brandName.trim().length === 0) {
      throw new Error('Brand name is required');
    }

    console.log(`Searching Tillo for brand: ${brandName}`);

    // Initialize Tillo client
    const tilloClient = getTilloClient();

    // Note: Tillo API doesn't have a direct brand search endpoint
    // This is a placeholder for the actual implementation
    // You would need to:
    // 1. Check Tillo API documentation for brand catalog endpoint
    // 2. Implement the actual search logic
    // For now, we'll return a mock response to demonstrate the structure

    // Example implementation (replace with actual Tillo API call):
    const response: TilloBrandSearchResponse = await searchTilloBrand(
      tilloClient,
      brandName
    );

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error in lookup-tillo-brand function:', error);

    // Return 200 with found: false for graceful failure
    // Only return error status codes for auth issues
    const isAuthError = error.message === 'Unauthorized' || error.message.includes('permissions');
    
    return new Response(
      JSON.stringify({
        found: false,
        error: error.message || 'Tillo API unavailable',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isAuthError ? 403 : 200, // Return 200 for non-auth errors to allow graceful handling
      }
    );
  }
});

/**
 * Search for a brand in Tillo's catalog
 * NOTE: This is a mock implementation. Replace with actual Tillo API calls.
 */
async function searchTilloBrand(
  tilloClient: any,
  brandName: string
): Promise<TilloBrandSearchResponse> {
  try {
    // Mock implementation - replace with actual Tillo API endpoint
    // Example: const brands = await tilloClient.request('/brands/search', 'GET', { query: brandName });

    // For demonstration, we'll show how the response should look
    // when a brand is found in Tillo

    const normalizedName = brandName.toLowerCase().trim();

    // Mock brand mappings (replace with actual API call)
    const mockTilloBrands: Record<string, any> = {
      starbucks: {
        tillo_brand_code: 'STARBUCKS',
        brand_name: 'Starbucks',
        denominations: [5, 10, 15, 25, 50, 100],
        costs: [
          { denomination: 5, cost: 4.75 },
          { denomination: 10, cost: 9.5 },
          { denomination: 15, cost: 14.25 },
          { denomination: 25, cost: 23.75 },
          { denomination: 50, cost: 47.5 },
          { denomination: 100, cost: 95 },
        ],
      },
      amazon: {
        tillo_brand_code: 'AMAZON',
        brand_name: 'Amazon',
        denominations: [10, 25, 50, 100],
        costs: [
          { denomination: 10, cost: 9.5 },
          { denomination: 25, cost: 23.75 },
          { denomination: 50, cost: 47.5 },
          { denomination: 100, cost: 95 },
        ],
      },
      target: {
        tillo_brand_code: 'TARGET',
        brand_name: 'Target',
        denominations: [10, 25, 50, 100],
        costs: [
          { denomination: 10, cost: 9.5 },
          { denomination: 25, cost: 23.75 },
          { denomination: 50, cost: 47.5 },
          { denomination: 100, cost: 95 },
        ],
      },
    };

    const mockBrand = mockTilloBrands[normalizedName];

    if (mockBrand) {
      return {
        found: true,
        tillo_brand_code: mockBrand.tillo_brand_code,
        brand_name: mockBrand.brand_name,
        denominations: mockBrand.denominations,
        costs: mockBrand.costs,
      };
    }

    // TODO: Replace above mock logic with actual Tillo API call:
    /*
    const response = await tilloClient.request('/v2/brands', 'GET');
    const brands = response.data || [];
    
    const matchedBrand = brands.find((b: any) => 
      b.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(b.name.toLowerCase())
    );
    
    if (matchedBrand) {
      // Fetch denominations for this brand
      const denomsResponse = await tilloClient.request(
        `/v2/brands/${matchedBrand.code}/products`,
        'GET'
      );
      
      return {
        found: true,
        tillo_brand_code: matchedBrand.code,
        brand_name: matchedBrand.name,
        denominations: denomsResponse.data.map((p: any) => p.face_value.amount),
        costs: denomsResponse.data.map((p: any) => ({
          denomination: p.face_value.amount,
          cost: p.cost.amount,
        })),
      };
    }
    */

    return {
      found: false,
    };
  } catch (error: any) {
    console.error('Error searching Tillo brand:', error);
    throw new Error(`Tillo search failed: ${error.message}`);
  }
}


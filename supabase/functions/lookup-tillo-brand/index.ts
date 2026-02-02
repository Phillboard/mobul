/**
 * Tillo Brand Lookup Edge Function
 * 
 * Securely queries Tillo API to search for brands and retrieve:
 * - Brand codes
 * - Available denominations
 * - Pricing information
 * 
 * Admin-only endpoint (platform_admin role required).
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { getTilloClient } from '../_shared/tillo-client.ts';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Mock Brand Data (Replace with actual Tillo API)
// ============================================================================

const MOCK_TILLO_BRANDS: Record<string, {
  tillo_brand_code: string;
  brand_name: string;
  denominations: number[];
  costs: Array<{ denomination: number; cost: number }>;
}> = {
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

// ============================================================================
// Brand Search
// ============================================================================

async function searchTilloBrand(brandName: string): Promise<TilloBrandSearchResponse> {
  try {
    const normalizedName = brandName.toLowerCase().trim();
    const mockBrand = MOCK_TILLO_BRANDS[normalizedName];

    if (mockBrand) {
      return {
        found: true,
        tillo_brand_code: mockBrand.tillo_brand_code,
        brand_name: mockBrand.brand_name,
        denominations: mockBrand.denominations,
        costs: mockBrand.costs,
      };
    }

    // NOTE: Tillo API integration available via provision-gift-card-unified function
    // Replace this mock with actual Tillo API calls when ready:
    /*
    const tilloClient = getTilloClient();
    const response = await tilloClient.request('/v2/brands', 'GET');
    const brands = response.data || [];
    
    const matchedBrand = brands.find((b: any) => 
      b.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(b.name.toLowerCase())
    );
    
    if (matchedBrand) {
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

    return { found: false };
  } catch (error) {
    console.error('[LOOKUP-TILLO-BRAND] Error searching Tillo brand:', error);
    throw new ApiError(
      `Tillo search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TILLO_ERROR',
      500
    );
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleLookupTilloBrand(
  request: TilloBrandSearchRequest,
  _context: AuthContext
): Promise<TilloBrandSearchResponse> {
  const { brandName } = request;

  if (!brandName || brandName.trim().length === 0) {
    throw new ApiError('Brand name is required', 'VALIDATION_ERROR', 400);
  }

  console.log(`[LOOKUP-TILLO-BRAND] Searching Tillo for brand: ${brandName}`);

  const result = await searchTilloBrand(brandName);

  console.log(`[LOOKUP-TILLO-BRAND] Search result: found=${result.found}`);

  return result;
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleLookupTilloBrand, {
  requireAuth: true,
  requiredRole: 'platform_admin',
  parseBody: true,
  auditAction: 'lookup_tillo_brand',
}));

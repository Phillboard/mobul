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
import { createTilloClientFromEnv } from '../_shared/tillo-client.ts';

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

async function searchTilloBrandViaApi(brandName: string): Promise<TilloBrandSearchResponse | null> {
  try {
    const client = createTilloClientFromEnv();
    const normalizedName = brandName.toLowerCase().trim();

    // Generate HMAC signature for the request
    const timestamp = Date.now();
    const apiKey = Deno.env.get('TILLO_API_KEY')!;
    const secretKey = Deno.env.get('TILLO_SECRET_KEY')!;
    const baseUrl = Deno.env.get('TILLO_BASE_URL') || 'https://api.tillo.tech/v2';

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(`${timestamp}`);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'API-Key': apiKey,
      'Signature': hexSignature,
      'Timestamp': timestamp.toString(),
    };

    // Search Tillo brands catalog
    const response = await fetch(`${baseUrl}/brands`, { method: 'GET', headers });

    if (!response.ok) {
      console.warn(`[LOOKUP-TILLO-BRAND] Tillo API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const brands = data.data || data.brands || [];

    const matchedBrand = brands.find((b: any) =>
      b.name?.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(b.name?.toLowerCase())
    );

    if (!matchedBrand) {
      return { found: false };
    }

    // Get denomination/pricing info for the matched brand
    const timestamp2 = Date.now();
    const messageData2 = encoder.encode(`${timestamp2}`);
    const signature2 = await crypto.subtle.sign('HMAC', key, messageData2);
    const hexSignature2 = Array.from(new Uint8Array(signature2)).map(b => b.toString(16).padStart(2, '0')).join('');

    const denomHeaders = { ...headers, 'Signature': hexSignature2, 'Timestamp': timestamp2.toString() };
    const denomResponse = await fetch(`${baseUrl}/brands/${matchedBrand.code}/products`, { method: 'GET', headers: denomHeaders });

    let denominations: number[] = [];
    let costs: Array<{ denomination: number; cost: number }> = [];

    if (denomResponse.ok) {
      const denomData = await denomResponse.json();
      const products = denomData.data || denomData.products || [];
      denominations = products.map((p: any) => p.face_value?.amount || p.amount).filter(Boolean);
      costs = products.map((p: any) => ({
        denomination: p.face_value?.amount || p.amount,
        cost: p.cost?.amount || (p.face_value?.amount || p.amount) * 0.95,
      })).filter((c: any) => c.denomination);
    }

    return {
      found: true,
      tillo_brand_code: matchedBrand.code,
      brand_name: matchedBrand.name,
      denominations,
      costs,
    };
  } catch (error) {
    console.warn('[LOOKUP-TILLO-BRAND] Tillo API not available:', (error as Error).message);
    return null;
  }
}

async function searchTilloBrand(brandName: string): Promise<TilloBrandSearchResponse> {
  // Try real Tillo API first (if credentials are configured)
  const tilloApiKey = Deno.env.get('TILLO_API_KEY');
  const tilloSecretKey = Deno.env.get('TILLO_SECRET_KEY');

  if (tilloApiKey && tilloSecretKey) {
    console.log('[LOOKUP-TILLO-BRAND] Attempting real Tillo API search');
    const apiResult = await searchTilloBrandViaApi(brandName);
    if (apiResult) {
      return apiResult;
    }
    console.log('[LOOKUP-TILLO-BRAND] Tillo API failed, falling back to mock data');
  }

  // Fallback to mock data when Tillo API is not configured or fails
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

  return { found: false };
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

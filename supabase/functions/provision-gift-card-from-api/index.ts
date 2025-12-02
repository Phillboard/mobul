/**
 * Gift Card API Testing Function
 * 
 * Test wrapper for Tillo API provisioning validation:
 * 1. Supports test mode (no billing)
 * 2. Direct API provider testing
 * 3. Returns detailed API response data
 * 4. Used for admin testing and diagnostics
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getTilloClient } from '../_shared/tillo-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApiTestRequest {
  poolId?: string;
  recipientId?: string | null;
  callSessionId?: string | null;
  testMode: boolean;
  testConfig?: {
    api_provider: string;
    card_value: number;
    api_config?: any;
  };
  // Production mode params
  brandId?: string;
  denomination?: number;
  campaignId?: string;
}

interface ApiTestResult {
  success: boolean;
  card?: {
    cardCode: string;
    cardNumber?: string;
    denomination: number;
    brandName?: string;
    expirationDate?: string;
    source: 'tillo' | 'test';
  };
  apiResponse?: {
    transactionId?: string;
    orderReference?: string;
    provider: string;
    timestamp: string;
    rawResponse?: any;
  };
  testMode: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const {
      poolId,
      recipientId,
      callSessionId,
      testMode,
      testConfig,
      brandId,
      denomination,
      campaignId,
    }: ApiTestRequest = await req.json();

    console.log('[API-TEST] Starting:', { testMode, poolId, brandId });

    // =====================================================
    // TEST MODE: Direct API testing without billing
    // =====================================================
    
    if (testMode && testConfig) {
      console.log('[API-TEST] Test mode - calling Tillo API');

      const { api_provider, card_value, api_config } = testConfig;

      if (!api_provider || !card_value) {
        throw new Error('Test mode requires api_provider and card_value');
      }

      // For test mode, use a test brand or default
      let testBrandCode = 'AMZN'; // Default to Amazon for testing

      if (api_config?.brandCode) {
        testBrandCode = api_config.brandCode;
      }

      try {
        const tilloClient = getTilloClient();
        const tilloCard = await tilloClient.provisionCard(
          testBrandCode,
          card_value,
          'USD'
        );

        console.log('[API-TEST] Tillo API test successful');

        const result: ApiTestResult = {
          success: true,
          testMode: true,
          card: {
            cardCode: tilloCard.cardCode,
            cardNumber: tilloCard.cardNumber,
            denomination: card_value,
            brandName: api_provider,
            expirationDate: tilloCard.expirationDate,
            source: 'tillo',
          },
          apiResponse: {
            transactionId: tilloCard.transactionId,
            orderReference: tilloCard.orderReference,
            provider: 'Tillo',
            timestamp: new Date().toISOString(),
            rawResponse: {
              success: true,
              message: 'Test provisioning successful',
            },
          },
        };

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (tilloError) {
        console.error('[API-TEST] Tillo API test failed:', tilloError);
        
        const errorResult: ApiTestResult = {
          success: false,
          testMode: true,
          error: `Tillo API Error: ${tilloError.message}`,
          apiResponse: {
            provider: 'Tillo',
            timestamp: new Date().toISOString(),
            rawResponse: {
              error: tilloError.message,
            },
          },
        };

        return new Response(JSON.stringify(errorResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    }

    // =====================================================
    // PRODUCTION MODE: Call unified provisioning
    // =====================================================
    
    console.log('[API-TEST] Production mode - delegating to unified provisioning');

    if (!brandId || !denomination || !campaignId || !recipientId) {
      throw new Error('Production mode requires brandId, denomination, campaignId, and recipientId');
    }

    // Call the unified provisioning function
    const provisionRequest = {
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionNumber: 1,
    };

    const provisionResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/provision-gift-card-unified`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify(provisionRequest),
      }
    );

    if (!provisionResponse.ok) {
      const errorText = await provisionResponse.text();
      throw new Error(`Provisioning failed: ${errorText}`);
    }

    const provisionResult = await provisionResponse.json();

    if (!provisionResult.success) {
      throw new Error(provisionResult.error || 'Provisioning failed');
    }

    const result: ApiTestResult = {
      success: true,
      testMode: false,
      card: provisionResult.card,
      apiResponse: {
        provider: provisionResult.card.source === 'tillo' ? 'Tillo' : 'Inventory',
        timestamp: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[API-TEST] Error:', error);

    const result: ApiTestResult = {
      success: false,
      testMode: false,
      error: error.message || 'Unknown error occurred',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


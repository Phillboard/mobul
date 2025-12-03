/**
 * Unified Gift Card Provisioning Function
 * 
 * Handles gift card provisioning with intelligent fallback:
 * 1. Try to claim from uploaded inventory first
 * 2. If no inventory available, purchase from Tillo API
 * 3. Record billing transaction
 * 4. Return card details
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getTilloClient } from '../_shared/tillo-client.ts';
import { createErrorLogger } from '../_shared/error-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProvisionRequest {
  campaignId: string;
  recipientId: string;
  brandId: string;
  denomination: number;
  conditionNumber: number;
}

interface ProvisionResult {
  success: boolean;
  card?: {
    cardCode: string;
    cardNumber?: string;
    denomination: number;
    brandName: string;
    brandLogo?: string;
    expirationDate?: string;
    source: 'inventory' | 'tillo';
  };
  billing?: {
    ledgerId: string;
    billedEntity: string;
    billedEntityId: string;
    amountBilled: number;
    profit: number;
  };
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

  // Initialize error logger
  const errorLogger = createErrorLogger('provision-gift-card-unified');

  // Declare variables at function scope for error logging access
  let campaignId: string | undefined;
  let recipientId: string | undefined;
  let brandId: string | undefined;
  let denomination: number | undefined;
  let conditionNumber: number | undefined;

  try {
    const requestData: ProvisionRequest = await req.json();
    campaignId = requestData.campaignId;
    recipientId = requestData.recipientId;
    brandId = requestData.brandId;
    denomination = requestData.denomination;
    conditionNumber = requestData.conditionNumber;

    console.log('='.repeat(60));
    console.log(`[UNIFIED-PROVISION] [${errorLogger.requestId}] === REQUEST START ===`);
    console.log('[UNIFIED-PROVISION] Request params:', JSON.stringify({
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionNumber,
    }, null, 2));

    // Validate inputs
    if (!campaignId || !recipientId || !brandId || !denomination) {
      console.error('[UNIFIED-PROVISION] Missing required parameters:', {
        hasCampaignId: !!campaignId,
        hasRecipientId: !!recipientId,
        hasBrandId: !!brandId,
        hasDenomination: !!denomination,
      });
      throw new Error('Missing required parameters');
    }

    // =====================================================
    // STEP 1: Get campaign and determine billing entity
    // =====================================================
    
    console.log('[UNIFIED-PROVISION] STEP 1 - Getting billing entity for campaign:', campaignId);
    const { data: billingEntity, error: billingError } = await supabaseClient
      .rpc('get_billing_entity_for_campaign', { p_campaign_id: campaignId });

    console.log('[UNIFIED-PROVISION] Billing entity result:', {
      data: billingEntity,
      error: billingError,
    });

    if (billingError || !billingEntity || billingEntity.length === 0) {
      console.error('[UNIFIED-PROVISION] === BILLING ENTITY ERROR ===');
      console.error('[UNIFIED-PROVISION] Campaign may not have a valid client or billing setup');
      throw new Error(`Failed to determine billing entity: ${billingError?.message || 'No billing entity found'}`);
    }

    const { entity_type, entity_id, entity_name } = billingEntity[0];
    console.log('[UNIFIED-PROVISION] STEP 1 COMPLETE - Billing entity:', { entity_type, entity_id, entity_name });

    // =====================================================
    // STEP 2: Get brand details
    // =====================================================
    
    console.log('[UNIFIED-PROVISION] STEP 2 - Getting brand details for:', brandId);
    const { data: brand, error: brandError } = await supabaseClient
      .from('gift_card_brands')
      .select('brand_name, brand_code, tillo_brand_code, logo_url')
      .eq('id', brandId)
      .single();

    console.log('[UNIFIED-PROVISION] Brand lookup result:', {
      found: !!brand,
      brand_name: brand?.brand_name,
      error: brandError,
    });

    if (brandError || !brand) {
      console.error('[UNIFIED-PROVISION] === BRAND NOT FOUND ===');
      console.error('[UNIFIED-PROVISION] Brand ID:', brandId);
      throw new Error(`Brand not found: ${brandError?.message}`);
    }

    console.log('[UNIFIED-PROVISION] STEP 2 COMPLETE - Brand:', brand.brand_name);

    // =====================================================
    // STEP 3: Try to claim from inventory first
    // =====================================================
    
    console.log('[UNIFIED-PROVISION] STEP 3 - Attempting to claim from inventory');
    console.log('[UNIFIED-PROVISION] Inventory claim params:', {
      brand_id: brandId,
      denomination: denomination,
      recipient_id: recipientId,
      campaign_id: campaignId,
    });
    
    const { data: inventoryCard, error: inventoryError } = await supabaseClient
      .rpc('claim_gift_card_from_inventory', {
        p_brand_id: brandId,
        p_denomination: denomination,
        p_recipient_id: recipientId,
        p_campaign_id: campaignId,
      });

    console.log('[UNIFIED-PROVISION] Inventory claim result:', {
      found: inventoryCard && inventoryCard.length > 0,
      cardCount: inventoryCard?.length || 0,
      error: inventoryError,
      firstCard: inventoryCard?.[0] ? 'present' : 'none',
    });

    let cardResult: any = null;
    let source: 'inventory' | 'tillo' = 'inventory';
    let costBasis: number | null = null;
    let inventoryCardId: string | null = null;
    let tilloTransactionId: string | null = null;
    let tilloOrderReference: string | null = null;

    if (inventoryCard && inventoryCard.length > 0) {
      // SUCCESS: Got card from inventory
      console.log('[UNIFIED-PROVISION] SUCCESS - Claimed card from inventory');
      cardResult = inventoryCard[0];
      console.log('[UNIFIED-PROVISION] Card details:', {
        card_id: cardResult.card_id,
        brand_name: cardResult.brand_name,
      });
      source = 'inventory';
      inventoryCardId = cardResult.card_id;
      
      // Get admin cost from denominations table
      const { data: denomData } = await supabaseClient
        .from('gift_card_denominations')
        .select('cost_basis, use_custom_pricing, client_price, agency_price')
        .eq('brand_id', brandId)
        .eq('denomination', denomination)
        .single();
      
      costBasis = denomData?.cost_basis || denomination * 0.95; // Default 5% discount
    } else {
      // No inventory available, try Tillo API
      console.log('[UNIFIED-PROVISION] No inventory available - checking Tillo fallback');
      
      // Check if Tillo is configured first
      const tilloApiKey = Deno.env.get('TILLO_API_KEY');
      const tilloSecretKey = Deno.env.get('TILLO_SECRET_KEY');
      
      console.log('[UNIFIED-PROVISION] Tillo configuration:', {
        hasApiKey: !!tilloApiKey,
        hasSecretKey: !!tilloSecretKey,
        apiKeyLength: tilloApiKey?.length || 0,
      });
      
      if (!tilloApiKey || !tilloSecretKey) {
        console.error('[UNIFIED-PROVISION] === NO INVENTORY AND NO TILLO ===');
        console.error('[UNIFIED-PROVISION] This is the most common cause of provisioning failures');
        console.error('[UNIFIED-PROVISION] Options: 1) Upload gift card inventory, or 2) Configure Tillo API');
        throw new Error('No gift cards available in inventory and Tillo API is not configured. Please upload gift card inventory or configure Tillo API credentials.');
      }
      
      const tilloBrandCode = brand.tillo_brand_code || brand.brand_code;
      console.log('[UNIFIED-PROVISION] Tillo brand code:', tilloBrandCode);
      
      if (!tilloBrandCode) {
        console.error('[UNIFIED-PROVISION] Brand missing Tillo code:', {
          brand_name: brand.brand_name,
          brand_code: brand.brand_code,
          tillo_brand_code: brand.tillo_brand_code,
        });
        throw new Error('Brand does not have Tillo integration configured. Please add a Tillo brand code to this gift card brand, or upload inventory manually.');
      }

      try {
        const tilloClient = getTilloClient();
        const tilloCard = await tilloClient.provisionCard(
          tilloBrandCode,
          denomination,
          'USD'
        );

        console.log('[PROVISION] Tillo card provisioned:', tilloCard.transactionId);

        // Store Tillo-purchased card in inventory for tracking
        const { data: newCard, error: insertError } = await supabaseClient
          .from('gift_card_inventory')
          .insert({
            brand_id: brandId,
            denomination: denomination,
            card_code: tilloCard.cardCode,
            card_number: tilloCard.cardNumber,
            expiration_date: tilloCard.expirationDate,
            status: 'assigned',
            assigned_to_recipient_id: recipientId,
            assigned_to_campaign_id: campaignId,
            assigned_at: new Date().toISOString(),
            notes: `Purchased from Tillo API - ${tilloCard.transactionId}`,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[PROVISION] Failed to save Tillo card:', insertError);
        } else {
          inventoryCardId = newCard.id;
        }

        cardResult = {
          card_id: newCard?.id,
          card_code: tilloCard.cardCode,
          card_number: tilloCard.cardNumber,
          expiration_date: tilloCard.expirationDate,
          brand_name: brand.brand_name,
          brand_logo_url: brand.logo_url,
        };

        source = 'tillo';
        tilloTransactionId = tilloCard.transactionId;
        tilloOrderReference = tilloCard.orderReference;

        // Get Tillo cost
        const { data: denomData } = await supabaseClient
          .from('gift_card_denominations')
          .select('tillo_cost_per_card')
          .eq('brand_id', brandId)
          .eq('denomination', denomination)
          .single();

        costBasis = denomData?.tillo_cost_per_card || denomination; // Assume face value if not set
      } catch (tilloError) {
        console.error('[PROVISION] Tillo API failed:', tilloError);
        // Log Tillo error
        await errorLogger.logExternalError('Tillo', tilloError, {
          brandId,
          denomination,
          tilloBrandCode,
        });
        throw new Error(`Failed to provision from Tillo: ${tilloError.message}`);
      }
    }

    // =====================================================
    // STEP 4: Get custom pricing and record billing transaction
    // =====================================================
    
    // Get custom pricing configuration
    const { data: pricingData } = await supabaseClient
      .from('gift_card_denominations')
      .select('use_custom_pricing, client_price, agency_price, cost_basis')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .single();

    // Determine the amount to bill based on custom pricing
    const useCustomPricing = pricingData?.use_custom_pricing || false;
    const isAgency = entity_type === 'agency';
    
    let amountBilled = denomination; // Default to face value
    if (useCustomPricing) {
      if (isAgency && pricingData?.agency_price) {
        amountBilled = pricingData.agency_price;
      } else if (pricingData?.client_price) {
        amountBilled = pricingData.client_price;
      }
    }

    console.log('[PROVISION] Billing:', {
      denomination,
      useCustomPricing,
      clientPrice: pricingData?.client_price,
      agencyPrice: pricingData?.agency_price,
      amountBilled,
      costBasis,
    });

    const { data: ledgerId, error: billingRecordError } = await supabaseClient
      .rpc('record_billing_transaction', {
        p_transaction_type: source === 'inventory' ? 'purchase_from_inventory' : 'purchase_from_tillo',
        p_billed_entity_type: entity_type,
        p_billed_entity_id: entity_id,
        p_campaign_id: campaignId,
        p_recipient_id: recipientId,
        p_brand_id: brandId,
        p_denomination: denomination,
        p_amount_billed: amountBilled,
        p_cost_basis: costBasis,
        p_inventory_card_id: inventoryCardId,
        p_tillo_transaction_id: tilloTransactionId,
        p_tillo_order_reference: tilloOrderReference,
        p_metadata: JSON.stringify({
          condition_number: conditionNumber,
          source: source,
        }),
      });

    if (billingRecordError) {
      console.error('[PROVISION] Failed to record billing:', billingRecordError);
      throw new Error(`Failed to record billing: ${billingRecordError.message}`);
    }

    console.log('[PROVISION] Billing recorded:', ledgerId);

    const profit = costBasis ? amountBilled - costBasis : 0;

    // =====================================================
    // STEP 5: Return result
    // =====================================================
    
    const result: ProvisionResult = {
      success: true,
      card: {
        cardCode: cardResult.card_code,
        cardNumber: cardResult.card_number,
        denomination: denomination,
        brandName: cardResult.brand_name || brand.brand_name,
        brandLogo: cardResult.brand_logo_url || brand.logo_url,
        expirationDate: cardResult.expiration_date,
        source: source,
      },
      billing: {
        ledgerId: ledgerId,
        billedEntity: entity_name,
        billedEntityId: entity_id,
        amountBilled: amountBilled,
        profit: profit,
      },
    };

    console.log('[UNIFIED-PROVISION] === SUCCESS ===');
    console.log('[UNIFIED-PROVISION] Result:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('='.repeat(60));
    console.error(`[UNIFIED-PROVISION] [${errorLogger.requestId}] === ERROR ===`);
    console.error('[UNIFIED-PROVISION] Error type:', error?.constructor?.name);
    console.error('[UNIFIED-PROVISION] Error message:', error?.message);
    console.error('[UNIFIED-PROVISION] Error stack:', error?.stack);
    console.error('[UNIFIED-PROVISION] Context:', {
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionNumber,
    });
    console.error('='.repeat(60));

    // Log error to database
    await errorLogger.logError(error, {
      campaignId,
      recipientId,
      metadata: {
        brandId,
        denomination,
        conditionNumber,
      },
    });

    const result: ProvisionResult = {
      success: false,
      error: error.message || 'Unknown error occurred',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


/**
 * Unified Gift Card Provisioning Function
 * 
 * Handles gift card provisioning with intelligent fallback:
 * 1. Try to claim from uploaded inventory first
 * 2. If no inventory available, purchase from Tillo API
 * 3. Record billing transaction
 * 4. Return card details
 * 
 * COMPREHENSIVE LOGGING:
 * - Every step is logged to gift_card_provisioning_trace table
 * - Errors are logged with structured error codes
 * - Full request context is captured for debugging
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getTilloClient } from '../_shared/tillo-client.ts';
import { createErrorLogger, PROVISIONING_ERROR_CODES } from '../_shared/error-logger.ts';
import type { ProvisioningErrorCode } from '../_shared/error-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

interface ProvisionRequest {
  campaignId: string;
  recipientId: string;
  brandId: string;
  denomination: number;
  conditionNumber: number;
  requestId?: string; // Optional client-provided trace ID
}

interface ProvisionResult {
  success: boolean;
  requestId: string; // Always return request ID for tracing
  card?: {
    id?: string;
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
  errorCode?: ProvisioningErrorCode;
  errorDescription?: string;
}

// Step definitions for trace logging
const STEPS = {
  VALIDATE_INPUT: { number: 1, name: 'Validate Input Parameters' },
  GET_BILLING_ENTITY: { number: 2, name: 'Get Billing Entity' },
  CHECK_CREDITS: { number: 3, name: 'Check Entity Credits' },
  GET_BRAND: { number: 4, name: 'Get Brand Details' },
  CHECK_INVENTORY: { number: 5, name: 'Check Inventory Availability' },
  CLAIM_INVENTORY: { number: 6, name: 'Claim from Inventory' },
  CHECK_TILLO_CONFIG: { number: 7, name: 'Check Tillo Configuration' },
  PROVISION_TILLO: { number: 8, name: 'Provision from Tillo API' },
  SAVE_TILLO_CARD: { number: 9, name: 'Save Tillo Card to Inventory' },
  GET_PRICING: { number: 10, name: 'Get Pricing Configuration' },
  RECORD_BILLING: { number: 11, name: 'Record Billing Transaction' },
  FINALIZE: { number: 12, name: 'Finalize and Return Result' },
};

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

  // Initialize error logger with comprehensive tracing
  const logger = createErrorLogger('provision-gift-card-unified');

  // Declare variables at function scope for error logging access
  let campaignId: string | undefined;
  let recipientId: string | undefined;
  let brandId: string | undefined;
  let denomination: number | undefined;
  let conditionNumber: number | undefined;
  let currentStep = STEPS.VALIDATE_INPUT;

  try {
    // =====================================================
    // STEP 1: VALIDATE INPUT PARAMETERS
    // =====================================================
    await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'started');
    
    const requestData: ProvisionRequest = await req.json();
    campaignId = requestData.campaignId;
    recipientId = requestData.recipientId;
    brandId = requestData.brandId;
    denomination = requestData.denomination;
    conditionNumber = requestData.conditionNumber;
    
    // Use client-provided request ID if available
    const clientRequestId = requestData.requestId || req.headers.get('x-request-id');
    
    // Set provisioning context for all subsequent checkpoints
    logger.setProvisioningContext({
      campaignId,
      recipientId,
      brandId,
      denomination,
    });

    console.log('╔' + '═'.repeat(70) + '╗');
    console.log(`║ [UNIFIED-PROVISION] Request ID: ${logger.requestId}`);
    console.log(`║ Client Request ID: ${clientRequestId || 'none'}`);
    console.log('╠' + '═'.repeat(70) + '╣');
    console.log('║ INPUT PARAMETERS:');
    console.log(`║   campaignId: ${campaignId || 'MISSING'}`);
    console.log(`║   recipientId: ${recipientId || 'MISSING'}`);
    console.log(`║   brandId: ${brandId || 'MISSING'}`);
    console.log(`║   denomination: ${denomination || 'MISSING'}`);
    console.log(`║   conditionNumber: ${conditionNumber || 'N/A'}`);
    console.log('╚' + '═'.repeat(70) + '╝');

    // Validate inputs
    const missingParams: string[] = [];
    if (!campaignId) missingParams.push('campaignId');
    if (!recipientId) missingParams.push('recipientId');
    if (!brandId) missingParams.push('brandId');
    if (!denomination) missingParams.push('denomination');
    
    if (missingParams.length > 0) {
      await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'failed', {
        missingParams,
        provided: { campaignId: !!campaignId, recipientId: !!recipientId, brandId: !!brandId, denomination: !!denomination },
      });
      await logger.logProvisioningError('GC-012', new Error(`Missing: ${missingParams.join(', ')}`), STEPS.VALIDATE_INPUT);
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'completed', {
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionNumber,
    });

    // =====================================================
    // STEP 2: GET BILLING ENTITY
    // =====================================================
    currentStep = STEPS.GET_BILLING_ENTITY;
    await logger.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'started');
    
    console.log(`[STEP ${STEPS.GET_BILLING_ENTITY.number}] Getting billing entity for campaign: ${campaignId}`);
    
    const { data: billingEntity, error: billingError } = await supabaseClient
      .rpc('get_billing_entity_for_campaign', { p_campaign_id: campaignId });

    console.log(`[STEP ${STEPS.GET_BILLING_ENTITY.number}] Billing entity result:`, JSON.stringify({
      found: billingEntity && billingEntity.length > 0,
      data: billingEntity?.[0] || null,
      error: billingError?.message || null,
    }));

    if (billingError) {
      await logger.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'failed', {
        error: billingError.message,
        errorCode: billingError.code,
        hint: billingError.hint,
      });
      await logger.logProvisioningError('GC-008', billingError, STEPS.GET_BILLING_ENTITY, {
        rpcError: billingError.message,
      });
      throw new Error(`Failed to get billing entity: ${billingError.message}`);
    }

    if (!billingEntity || billingEntity.length === 0) {
      await logger.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'failed', {
        error: 'No billing entity found',
        campaignId,
      });
      await logger.logProvisioningError('GC-008', new Error('No billing entity configured for campaign'), STEPS.GET_BILLING_ENTITY);
      throw new Error('Campaign does not have a valid client or billing configuration');
    }

    const { entity_type, entity_id, entity_name } = billingEntity[0];
    
    await logger.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'completed', {
      entityType: entity_type,
      entityId: entity_id,
      entityName: entity_name,
    });

    console.log(`[STEP ${STEPS.GET_BILLING_ENTITY.number}] ✓ Billing entity: ${entity_type} - ${entity_name} (${entity_id})`);

    // =====================================================
    // STEP 3: CHECK ENTITY CREDITS
    // =====================================================
    currentStep = STEPS.CHECK_CREDITS;
    await logger.checkpoint(STEPS.CHECK_CREDITS.number, STEPS.CHECK_CREDITS.name, 'started');
    
    console.log(`[STEP ${STEPS.CHECK_CREDITS.number}] Checking ${entity_type} credits...`);
    
    // Get current credit balance
    const creditTable = entity_type === 'agency' ? 'agencies' : 'clients';
    const { data: entityData, error: creditError } = await supabaseClient
      .from(creditTable)
      .select('credits, name')
      .eq('id', entity_id)
      .single();

    const currentCredits = entityData?.credits || 0;
    const creditsNeeded = denomination;
    const hasEnoughCredits = currentCredits >= creditsNeeded;

    console.log(`[STEP ${STEPS.CHECK_CREDITS.number}] Credit check:`, {
      entityType: entity_type,
      currentCredits,
      creditsNeeded,
      hasEnoughCredits,
      error: creditError?.message || null,
    });

    await logger.checkpoint(STEPS.CHECK_CREDITS.number, STEPS.CHECK_CREDITS.name, hasEnoughCredits ? 'completed' : 'failed', {
      entityType: entity_type,
      currentCredits,
      creditsNeeded,
      hasEnoughCredits,
      deficit: hasEnoughCredits ? 0 : creditsNeeded - currentCredits,
    });

    if (!hasEnoughCredits) {
      await logger.logProvisioningError('GC-006', new Error(`Insufficient credits: ${currentCredits} available, ${creditsNeeded} needed`), STEPS.CHECK_CREDITS, {
        currentCredits,
        creditsNeeded,
        deficit: creditsNeeded - currentCredits,
      });
      // Note: We log but don't throw here - billing will handle the credit check
      console.warn(`[STEP ${STEPS.CHECK_CREDITS.number}] ⚠ Warning: ${entity_type} may have insufficient credits`);
    } else {
      console.log(`[STEP ${STEPS.CHECK_CREDITS.number}] ✓ Credits sufficient: $${currentCredits} available, $${creditsNeeded} needed`);
    }

    // =====================================================
    // STEP 4: GET BRAND DETAILS
    // =====================================================
    currentStep = STEPS.GET_BRAND;
    await logger.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'started');
    
    console.log(`[STEP ${STEPS.GET_BRAND.number}] Getting brand details for: ${brandId}`);
    
    const { data: brand, error: brandError } = await supabaseClient
      .from('gift_card_brands')
      .select('id, brand_name, brand_code, tillo_brand_code, logo_url, is_enabled_by_admin')
      .eq('id', brandId)
      .single();

    console.log(`[STEP ${STEPS.GET_BRAND.number}] Brand lookup result:`, {
      found: !!brand,
      brand_name: brand?.brand_name,
      brand_code: brand?.brand_code,
      tillo_brand_code: brand?.tillo_brand_code,
      is_enabled: brand?.is_enabled_by_admin,
      error: brandError?.message || null,
    });

    if (brandError || !brand) {
      await logger.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'failed', {
        error: brandError?.message || 'Brand not found',
        brandId,
      });
      await logger.logProvisioningError('GC-002', brandError || new Error('Brand not found'), STEPS.GET_BRAND, {
        brandId,
        dbError: brandError?.message,
      });
      throw new Error(`Gift card brand not found (ID: ${brandId})`);
    }

    if (!brand.is_enabled_by_admin) {
      await logger.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'failed', {
        error: 'Brand is disabled',
        brandName: brand.brand_name,
      });
      throw new Error(`Gift card brand "${brand.brand_name}" is currently disabled`);
    }

    await logger.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'completed', {
      brandName: brand.brand_name,
      brandCode: brand.brand_code,
      tilloBrandCode: brand.tillo_brand_code,
      hasTilloCode: !!(brand.tillo_brand_code || brand.brand_code),
    });

    console.log(`[STEP ${STEPS.GET_BRAND.number}] ✓ Brand found: ${brand.brand_name}`);

    // =====================================================
    // STEP 5: CHECK INVENTORY AVAILABILITY
    // =====================================================
    currentStep = STEPS.CHECK_INVENTORY;
    await logger.checkpoint(STEPS.CHECK_INVENTORY.number, STEPS.CHECK_INVENTORY.name, 'started');
    
    console.log(`[STEP ${STEPS.CHECK_INVENTORY.number}] Checking inventory for ${brand.brand_name} @ $${denomination}`);
    
    const { data: inventoryCount, error: countError } = await supabaseClient
      .rpc('get_inventory_count', {
        p_brand_id: brandId,
        p_denomination: denomination,
      });

    const availableCards = inventoryCount || 0;
    console.log(`[STEP ${STEPS.CHECK_INVENTORY.number}] Inventory count: ${availableCards} cards available`);

    await logger.checkpoint(STEPS.CHECK_INVENTORY.number, STEPS.CHECK_INVENTORY.name, 'completed', {
      brandId,
      denomination,
      availableCards,
      hasInventory: availableCards > 0,
    });

    // =====================================================
    // STEP 6: CLAIM FROM INVENTORY (if available)
    // =====================================================
    let cardResult: any = null;
    let source: 'inventory' | 'tillo' = 'inventory';
    let costBasis: number | null = null;
    let inventoryCardId: string | null = null;
    let tilloTransactionId: string | null = null;
    let tilloOrderReference: string | null = null;

    if (availableCards > 0) {
      currentStep = STEPS.CLAIM_INVENTORY;
      await logger.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'started', {
        availableCards,
      });
      
      console.log(`[STEP ${STEPS.CLAIM_INVENTORY.number}] Attempting to claim card from inventory...`);
      
      const { data: inventoryCard, error: inventoryError } = await supabaseClient
        .rpc('claim_gift_card_from_inventory', {
          p_brand_id: brandId,
          p_denomination: denomination,
          p_recipient_id: recipientId,
          p_campaign_id: campaignId,
        });

      console.log(`[STEP ${STEPS.CLAIM_INVENTORY.number}] Claim result:`, {
        success: inventoryCard && inventoryCard.length > 0,
        cardId: inventoryCard?.[0]?.card_id || null,
        error: inventoryError?.message || null,
      });

      if (inventoryCard && inventoryCard.length > 0) {
        cardResult = inventoryCard[0];
        source = 'inventory';
        inventoryCardId = cardResult.card_id;
        
        // Get cost from denominations table
        const { data: denomData } = await supabaseClient
          .from('gift_card_denominations')
          .select('cost_basis, use_custom_pricing, client_price, agency_price')
          .eq('brand_id', brandId)
          .eq('denomination', denomination)
          .single();
        
        costBasis = denomData?.cost_basis || denomination * 0.95;
        
        await logger.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'completed', {
          cardId: cardResult.card_id,
          brandName: cardResult.brand_name,
          costBasis,
        });
        
        console.log(`[STEP ${STEPS.CLAIM_INVENTORY.number}] ✓ Claimed card from inventory: ${cardResult.card_id}`);
      } else {
        // Inventory claim failed even though count showed available
        await logger.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'failed', {
          error: inventoryError?.message || 'Race condition - card claimed by another process',
          expectedAvailable: availableCards,
        });
        console.log(`[STEP ${STEPS.CLAIM_INVENTORY.number}] ⚠ Inventory claim failed - falling back to Tillo`);
      }
    }

    // =====================================================
    // STEP 7-9: TILLO FALLBACK (if no inventory)
    // =====================================================
    if (!cardResult) {
      // STEP 7: Check Tillo Configuration
      currentStep = STEPS.CHECK_TILLO_CONFIG;
      await logger.checkpoint(STEPS.CHECK_TILLO_CONFIG.number, STEPS.CHECK_TILLO_CONFIG.name, 'started');
      
      console.log(`[STEP ${STEPS.CHECK_TILLO_CONFIG.number}] No inventory - checking Tillo configuration...`);
      
      const tilloApiKey = Deno.env.get('TILLO_API_KEY');
      const tilloSecretKey = Deno.env.get('TILLO_SECRET_KEY');
      const tilloBaseUrl = Deno.env.get('TILLO_BASE_URL');
      const tilloBrandCode = brand.tillo_brand_code || brand.brand_code;

      const tilloConfig = {
        hasApiKey: !!tilloApiKey,
        hasSecretKey: !!tilloSecretKey,
        apiKeyLength: tilloApiKey?.length || 0,
        secretKeyLength: tilloSecretKey?.length || 0,
        baseUrl: tilloBaseUrl || 'https://api.tillo.tech/v2',
        tilloBrandCode,
        hasBrandCode: !!tilloBrandCode,
      };

      console.log(`[STEP ${STEPS.CHECK_TILLO_CONFIG.number}] Tillo config:`, JSON.stringify({
        ...tilloConfig,
        apiKeyLength: tilloConfig.apiKeyLength, // Don't log actual key
        secretKeyLength: tilloConfig.secretKeyLength,
      }));

      if (!tilloApiKey || !tilloSecretKey) {
        await logger.checkpoint(STEPS.CHECK_TILLO_CONFIG.number, STEPS.CHECK_TILLO_CONFIG.name, 'failed', {
          hasApiKey: !!tilloApiKey,
          hasSecretKey: !!tilloSecretKey,
          error: 'Tillo API credentials not configured',
        });
        await logger.logProvisioningError('GC-004', new Error('Tillo API not configured'), STEPS.CHECK_TILLO_CONFIG, {
          hasApiKey: !!tilloApiKey,
          hasSecretKey: !!tilloSecretKey,
        });
        throw new Error('No gift cards available in inventory and Tillo API is not configured. Please upload gift card inventory or configure Tillo API credentials in Supabase secrets.');
      }

      if (!tilloBrandCode) {
        await logger.checkpoint(STEPS.CHECK_TILLO_CONFIG.number, STEPS.CHECK_TILLO_CONFIG.name, 'failed', {
          error: 'Brand does not have Tillo code',
          brandName: brand.brand_name,
          brandCode: brand.brand_code,
        });
        await logger.logProvisioningError('GC-002', new Error('Brand missing Tillo code'), STEPS.CHECK_TILLO_CONFIG, {
          brandName: brand.brand_name,
        });
        throw new Error(`Brand "${brand.brand_name}" does not have Tillo integration configured. Please add a tillo_brand_code to this gift card brand, or upload inventory manually.`);
      }

      await logger.checkpoint(STEPS.CHECK_TILLO_CONFIG.number, STEPS.CHECK_TILLO_CONFIG.name, 'completed', tilloConfig);
      console.log(`[STEP ${STEPS.CHECK_TILLO_CONFIG.number}] ✓ Tillo configured with brand code: ${tilloBrandCode}`);

      // STEP 8: Provision from Tillo
      currentStep = STEPS.PROVISION_TILLO;
      await logger.checkpoint(STEPS.PROVISION_TILLO.number, STEPS.PROVISION_TILLO.name, 'started', {
        tilloBrandCode,
        denomination,
        currency: 'USD',
      });
      
      console.log(`[STEP ${STEPS.PROVISION_TILLO.number}] Calling Tillo API to provision card...`);
      console.log(`[STEP ${STEPS.PROVISION_TILLO.number}] Request: brand=${tilloBrandCode}, amount=${denomination}, currency=USD`);
      
      const tilloStartTime = Date.now();
      
      try {
        const tilloClient = getTilloClient();
        const tilloCard = await tilloClient.provisionCard(
          tilloBrandCode,
          denomination,
          'USD'
        );

        const tilloDuration = Date.now() - tilloStartTime;
        
        console.log(`[STEP ${STEPS.PROVISION_TILLO.number}] Tillo response received in ${tilloDuration}ms:`, {
          transactionId: tilloCard.transactionId,
          orderReference: tilloCard.orderReference,
          hasCardCode: !!tilloCard.cardCode,
          hasCardNumber: !!tilloCard.cardNumber,
          hasExpiration: !!tilloCard.expirationDate,
        });

        await logger.checkpoint(STEPS.PROVISION_TILLO.number, STEPS.PROVISION_TILLO.name, 'completed', {
          transactionId: tilloCard.transactionId,
          orderReference: tilloCard.orderReference,
          apiDurationMs: tilloDuration,
        });

        console.log(`[STEP ${STEPS.PROVISION_TILLO.number}] ✓ Tillo card provisioned: ${tilloCard.transactionId}`);

        // STEP 9: Save Tillo card to inventory
        currentStep = STEPS.SAVE_TILLO_CARD;
        await logger.checkpoint(STEPS.SAVE_TILLO_CARD.number, STEPS.SAVE_TILLO_CARD.name, 'started');
        
        console.log(`[STEP ${STEPS.SAVE_TILLO_CARD.number}] Saving Tillo card to inventory...`);

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
            notes: `Purchased from Tillo API - Transaction: ${tilloCard.transactionId}, Order: ${tilloCard.orderReference}`,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`[STEP ${STEPS.SAVE_TILLO_CARD.number}] ⚠ Failed to save card:`, insertError.message);
          await logger.checkpoint(STEPS.SAVE_TILLO_CARD.number, STEPS.SAVE_TILLO_CARD.name, 'failed', {
            error: insertError.message,
            // Card still provisioned, just not saved
          });
        } else {
          inventoryCardId = newCard.id;
          await logger.checkpoint(STEPS.SAVE_TILLO_CARD.number, STEPS.SAVE_TILLO_CARD.name, 'completed', {
            inventoryCardId: newCard.id,
          });
          console.log(`[STEP ${STEPS.SAVE_TILLO_CARD.number}] ✓ Card saved to inventory: ${newCard.id}`);
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

        costBasis = denomData?.tillo_cost_per_card || denomination;
        
      } catch (tilloError) {
        const tilloDuration = Date.now() - tilloStartTime;
        console.error(`[STEP ${STEPS.PROVISION_TILLO.number}] ✗ Tillo API failed after ${tilloDuration}ms:`, tilloError);
        
        await logger.checkpoint(STEPS.PROVISION_TILLO.number, STEPS.PROVISION_TILLO.name, 'failed', {
          error: tilloError.message,
          apiDurationMs: tilloDuration,
          tilloBrandCode,
        });
        await logger.logProvisioningError('GC-005', tilloError, STEPS.PROVISION_TILLO, {
          tilloBrandCode,
          denomination,
          apiDurationMs: tilloDuration,
        });
        await logger.logExternalError('Tillo', tilloError, {
          tilloBrandCode,
          denomination,
        });
        
        throw new Error(`Tillo API provisioning failed: ${tilloError.message}`);
      }
    }

    // =====================================================
    // STEP 10: GET PRICING CONFIGURATION
    // =====================================================
    currentStep = STEPS.GET_PRICING;
    await logger.checkpoint(STEPS.GET_PRICING.number, STEPS.GET_PRICING.name, 'started');
    
    console.log(`[STEP ${STEPS.GET_PRICING.number}] Getting pricing configuration...`);
    
    const { data: pricingData, error: pricingError } = await supabaseClient
      .from('gift_card_denominations')
      .select('use_custom_pricing, client_price, agency_price, cost_basis')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .single();

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

    const pricingDetails = {
      useCustomPricing,
      isAgency,
      faceValue: denomination,
      clientPrice: pricingData?.client_price,
      agencyPrice: pricingData?.agency_price,
      amountBilled,
      costBasis,
      expectedProfit: costBasis ? amountBilled - costBasis : 0,
    };

    console.log(`[STEP ${STEPS.GET_PRICING.number}] Pricing:`, pricingDetails);

    await logger.checkpoint(STEPS.GET_PRICING.number, STEPS.GET_PRICING.name, 'completed', pricingDetails);
    console.log(`[STEP ${STEPS.GET_PRICING.number}] ✓ Will bill: $${amountBilled} (cost: $${costBasis})`);

    // =====================================================
    // STEP 11: RECORD BILLING TRANSACTION
    // =====================================================
    currentStep = STEPS.RECORD_BILLING;
    await logger.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'started', {
      transactionType: source === 'inventory' ? 'purchase_from_inventory' : 'purchase_from_tillo',
      entityType: entity_type,
      amountBilled,
    });
    
    console.log(`[STEP ${STEPS.RECORD_BILLING.number}] Recording billing transaction...`);

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
          request_id: logger.requestId,
        }),
      });

    if (billingRecordError) {
      console.error(`[STEP ${STEPS.RECORD_BILLING.number}] ✗ Billing failed:`, billingRecordError);
      await logger.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'failed', {
        error: billingRecordError.message,
        errorCode: billingRecordError.code,
      });
      await logger.logProvisioningError('GC-007', billingRecordError, STEPS.RECORD_BILLING);
      throw new Error(`Failed to record billing transaction: ${billingRecordError.message}`);
    }

    await logger.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'completed', {
      ledgerId,
      amountBilled,
    });
    console.log(`[STEP ${STEPS.RECORD_BILLING.number}] ✓ Billing recorded: ${ledgerId}`);

    const profit = costBasis ? amountBilled - costBasis : 0;

    // =====================================================
    // STEP 12: FINALIZE AND RETURN RESULT
    // =====================================================
    currentStep = STEPS.FINALIZE;
    await logger.checkpoint(STEPS.FINALIZE.number, STEPS.FINALIZE.name, 'started');
    
    const result: ProvisionResult = {
      success: true,
      requestId: logger.requestId,
      card: {
        id: cardResult.card_id,
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

    await logger.checkpoint(STEPS.FINALIZE.number, STEPS.FINALIZE.name, 'completed', {
      source,
      brandName: result.card?.brandName,
      denomination: result.card?.denomination,
      billedEntity: result.billing?.billedEntity,
      amountBilled: result.billing?.amountBilled,
    });

    console.log('╔' + '═'.repeat(70) + '╗');
    console.log(`║ [UNIFIED-PROVISION] ✓ SUCCESS - Request ID: ${logger.requestId}`);
    console.log('╠' + '═'.repeat(70) + '╣');
    console.log(`║   Source: ${source}`);
    console.log(`║   Brand: ${result.card?.brandName}`);
    console.log(`║   Value: $${result.card?.denomination}`);
    console.log(`║   Billed To: ${result.billing?.billedEntity}`);
    console.log(`║   Amount: $${result.billing?.amountBilled}`);
    console.log(`║   Profit: $${result.billing?.profit}`);
    console.log('╚' + '═'.repeat(70) + '╝');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    // Comprehensive error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Determine error code based on message
    let errorCode: ProvisioningErrorCode = 'GC-015';
    if (errorMessage.includes('Missing required')) errorCode = 'GC-012';
    else if (errorMessage.includes('billing entity')) errorCode = 'GC-008';
    else if (errorMessage.includes('Brand not found') || errorMessage.includes('brand')) errorCode = 'GC-002';
    else if (errorMessage.includes('inventory') && errorMessage.includes('Tillo')) errorCode = 'GC-003';
    else if (errorMessage.includes('Tillo API not configured')) errorCode = 'GC-004';
    else if (errorMessage.includes('Tillo')) errorCode = 'GC-005';
    else if (errorMessage.includes('credits') || errorMessage.includes('Insufficient')) errorCode = 'GC-006';
    else if (errorMessage.includes('billing')) errorCode = 'GC-007';

    console.error('╔' + '═'.repeat(70) + '╗');
    console.error(`║ [UNIFIED-PROVISION] ✗ FAILED - Request ID: ${logger.requestId}`);
    console.error('╠' + '═'.repeat(70) + '╣');
    console.error(`║   Error Code: ${errorCode}`);
    console.error(`║   Description: ${PROVISIONING_ERROR_CODES[errorCode]}`);
    console.error(`║   Message: ${errorMessage}`);
    console.error(`║   Failed Step: ${currentStep.number} - ${currentStep.name}`);
    console.error('╠' + '═'.repeat(70) + '╣');
    console.error(`║   Campaign: ${campaignId || 'N/A'}`);
    console.error(`║   Recipient: ${recipientId || 'N/A'}`);
    console.error(`║   Brand: ${brandId || 'N/A'}`);
    console.error(`║   Amount: $${denomination || 'N/A'}`);
    console.error('╚' + '═'.repeat(70) + '╝');
    
    if (errorStack) {
      console.error('[UNIFIED-PROVISION] Stack trace:', errorStack);
    }

    // Log to database
    await logger.logProvisioningError(errorCode, error, currentStep);

    const result: ProvisionResult = {
      success: false,
      requestId: logger.requestId,
      error: errorMessage,
      errorCode,
      errorDescription: PROVISIONING_ERROR_CODES[errorCode],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

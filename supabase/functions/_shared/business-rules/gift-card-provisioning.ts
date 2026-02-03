/**
 * Gift Card Provisioning - Core Business Logic
 * 
 * Extracted from provision-gift-card-unified for reuse across:
 * - Standard provisioning (API/frontend)
 * - Call center provisioning (with SMS delivery)
 * - API testing (direct Tillo calls)
 * 
 * 12-Step Provisioning Flow:
 * 1. Validate Input Parameters
 * 2. Get Billing Entity
 * 3. Check Entity Credits
 * 4. Get Brand Details
 * 5. Check Inventory Availability
 * 6. Claim from Inventory
 * 7. Check Tillo Configuration (if no inventory)
 * 8. Provision from Tillo API (if needed)
 * 9. Save Tillo Card to Inventory
 * 10. Get Pricing Configuration
 * 11. Record Billing Transaction
 * 12. Finalize and Return Result
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createErrorLogger, PROVISIONING_ERROR_CODES } from '../error-logger.ts';
import type { ProvisioningErrorCode } from '../error-logger.ts';
import { getTilloClient, TilloCardResult } from '../tillo-client.ts';

// ============================================================================
// Types
// ============================================================================

export interface ProvisionParams {
  campaignId: string;
  recipientId: string;
  brandId: string;
  denomination: number;
  conditionNumber?: number;
  requestId?: string;
}

export interface ProvisionResult {
  success: boolean;
  requestId: string;
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
    ledgerId: string | null;
    billedEntity: string;
    billedEntityId: string;
    amountBilled: number;
    profit: number;
  };
  error?: string;
  errorCode?: ProvisioningErrorCode;
  errorDescription?: string;
}

export interface ProvisioningLogger {
  requestId: string;
  checkpoint: (stepNumber: number, stepName: string, status: 'started' | 'completed' | 'failed', details?: Record<string, unknown>) => Promise<void>;
  setProvisioningContext: (ctx: { campaignId?: string; recipientId?: string; brandId?: string; denomination?: number }) => void;
  logProvisioningError: (code: ProvisioningErrorCode, error: unknown, step: { number: number; name: string }, metadata?: Record<string, unknown>) => Promise<void>;
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

// ============================================================================
// Main Provisioning Function
// ============================================================================

/**
 * Core gift card provisioning logic
 * 
 * @param supabase - Supabase client with service role access
 * @param params - Provisioning parameters
 * @param logger - Optional logger for checkpoints (creates default if not provided)
 * @returns ProvisionResult with card details or error
 */
export async function provisionGiftCard(
  supabase: SupabaseClient,
  params: ProvisionParams,
  logger?: ProvisioningLogger
): Promise<ProvisionResult> {
  // Create default logger if not provided
  const log = logger || createDefaultLogger();
  
  const { campaignId, recipientId, brandId, denomination, conditionNumber } = params;
  
  // Track current step for error reporting
  let currentStep = STEPS.VALIDATE_INPUT;

  try {
    // =====================================================
    // STEP 1: VALIDATE INPUT PARAMETERS
    // =====================================================
    await log.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'started');
    
    log.setProvisioningContext({ campaignId, recipientId, brandId, denomination });

    console.log(`[PROVISION] Request ID: ${log.requestId}`);
    console.log(`[PROVISION] Params: campaign=${campaignId}, recipient=${recipientId}, brand=${brandId}, denom=$${denomination}`);

    const missingParams: string[] = [];
    if (!campaignId) missingParams.push('campaignId');
    if (!recipientId) missingParams.push('recipientId');
    if (!brandId) missingParams.push('brandId');
    if (!denomination) missingParams.push('denomination');
    
    if (missingParams.length > 0) {
      await log.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'failed', { missingParams });
      await log.logProvisioningError('GC-012', new Error(`Missing: ${missingParams.join(', ')}`), STEPS.VALIDATE_INPUT);
      throw new ProvisioningError(`Missing required parameters: ${missingParams.join(', ')}`, 'GC-012');
    }

    await log.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'completed', {
      campaignId, recipientId, brandId, denomination, conditionNumber,
    });

    // =====================================================
    // STEP 2: GET BILLING ENTITY
    // =====================================================
    currentStep = STEPS.GET_BILLING_ENTITY;
    await log.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'started');
    
    const { data: billingEntity, error: billingError } = await supabase
      .rpc('get_billing_entity_for_campaign', { p_campaign_id: campaignId });

    if (billingError) {
      await log.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'failed', {
        error: billingError.message,
      });
      await log.logProvisioningError('GC-008', billingError, STEPS.GET_BILLING_ENTITY);
      throw new ProvisioningError(`Failed to get billing entity: ${billingError.message}`, 'GC-008');
    }

    if (!billingEntity || billingEntity.length === 0) {
      await log.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'failed', {
        error: 'No billing entity found',
      });
      await log.logProvisioningError('GC-008', new Error('No billing entity configured'), STEPS.GET_BILLING_ENTITY);
      throw new ProvisioningError('Campaign does not have a valid client or billing configuration', 'GC-008');
    }

    const { entity_type, entity_id, entity_name } = billingEntity[0];
    
    await log.checkpoint(STEPS.GET_BILLING_ENTITY.number, STEPS.GET_BILLING_ENTITY.name, 'completed', {
      entityType: entity_type,
      entityId: entity_id,
      entityName: entity_name,
    });

    console.log(`[PROVISION] Billing entity: ${entity_type} - ${entity_name}`);

    // =====================================================
    // STEP 3: CHECK ENTITY CREDITS
    // =====================================================
    currentStep = STEPS.CHECK_CREDITS;
    await log.checkpoint(STEPS.CHECK_CREDITS.number, STEPS.CHECK_CREDITS.name, 'started');
    
    const creditTable = entity_type === 'agency' ? 'agencies' : 'clients';
    const { data: entityData, error: creditError } = await supabase
      .from(creditTable)
      .select('credits, name')
      .eq('id', entity_id)
      .single();

    const currentCredits = entityData?.credits || 0;
    const creditsNeeded = denomination;
    const hasEnoughCredits = currentCredits >= creditsNeeded;

    await log.checkpoint(STEPS.CHECK_CREDITS.number, STEPS.CHECK_CREDITS.name, hasEnoughCredits ? 'completed' : 'failed', {
      currentCredits,
      creditsNeeded,
      hasEnoughCredits,
      deficit: hasEnoughCredits ? 0 : creditsNeeded - currentCredits,
    });

    if (!hasEnoughCredits) {
      await log.logProvisioningError('GC-006', new Error(`Insufficient credits: ${currentCredits} available, ${creditsNeeded} needed`), STEPS.CHECK_CREDITS);
      console.warn(`[PROVISION] Warning: ${entity_type} may have insufficient credits`);
    } else {
      console.log(`[PROVISION] Credits OK: $${currentCredits} available`);
    }

    // =====================================================
    // STEP 4: GET BRAND DETAILS
    // =====================================================
    currentStep = STEPS.GET_BRAND;
    await log.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'started');
    
    const { data: brand, error: brandError } = await supabase
      .from('gift_card_brands')
      .select('id, brand_name, brand_code, tillo_brand_code, logo_url, is_enabled_by_admin')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      await log.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'failed', {
        error: brandError?.message || 'Brand not found',
      });
      await log.logProvisioningError('GC-002', brandError || new Error('Brand not found'), STEPS.GET_BRAND);
      throw new ProvisioningError(`Gift card brand not found (ID: ${brandId})`, 'GC-002');
    }

    if (!brand.is_enabled_by_admin) {
      await log.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'failed', {
        error: 'Brand is disabled',
      });
      throw new ProvisioningError(`Gift card brand "${brand.brand_name}" is currently disabled`, 'GC-002');
    }

    await log.checkpoint(STEPS.GET_BRAND.number, STEPS.GET_BRAND.name, 'completed', {
      brandName: brand.brand_name,
      brandCode: brand.brand_code,
    });

    console.log(`[PROVISION] Brand: ${brand.brand_name}`);

    // =====================================================
    // STEP 5: CHECK INVENTORY AVAILABILITY
    // =====================================================
    currentStep = STEPS.CHECK_INVENTORY;
    await log.checkpoint(STEPS.CHECK_INVENTORY.number, STEPS.CHECK_INVENTORY.name, 'started');
    
    const { data: inventoryCount } = await supabase
      .rpc('get_inventory_count', {
        p_brand_id: brandId,
        p_denomination: denomination,
      });

    const availableCards = inventoryCount || 0;

    await log.checkpoint(STEPS.CHECK_INVENTORY.number, STEPS.CHECK_INVENTORY.name, 'completed', {
      brandId,
      denomination,
      availableCards,
      hasInventory: availableCards > 0,
    });

    console.log(`[PROVISION] Inventory: ${availableCards} cards available`);

    // =====================================================
    // STEP 6: CLAIM FROM INVENTORY
    // =====================================================
    currentStep = STEPS.CLAIM_INVENTORY;
    await log.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'started');
    
    // Find an available card
    const { data: exactMatch, error: exactError } = await supabase
      .from('gift_card_inventory')
      .select('id, brand_id, denomination, status, card_code, card_number, expiration_date')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .eq('status', 'available')
      .is('assigned_to_recipient_id', null)
      .limit(1)
      .single();
    
    if (exactError && exactError.code !== 'PGRST116') {
      await log.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'failed', {
        error: exactError.message,
      });
      throw new ProvisioningError(`Database error finding card: ${exactError.message}`, 'GC-003');
    }
    
    if (!exactMatch) {
      // No inventory - try Tillo API fallback
      await log.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'completed', {
        source: 'no_inventory',
        message: 'No inventory available, attempting Tillo API fallback',
      });
      
      console.log(`[PROVISION] No inventory available, checking Tillo fallback...`);
      
      // =====================================================
      // STEP 7: CHECK TILLO CONFIGURATION
      // =====================================================
      currentStep = STEPS.CHECK_TILLO_CONFIG;
      await log.checkpoint(STEPS.CHECK_TILLO_CONFIG.number, STEPS.CHECK_TILLO_CONFIG.name, 'started');
      
      if (!brand.tillo_brand_code) {
        // Get available denominations for error message
        const { data: allBrandCards } = await supabase
          .from('gift_card_inventory')
          .select('denomination')
          .eq('brand_id', brandId)
          .eq('status', 'available')
          .limit(100);
        
        const availableDenoms = [...new Set(allBrandCards?.map(c => Number(c.denomination)) || [])];
        
        await log.checkpoint(STEPS.CHECK_TILLO_CONFIG.number, STEPS.CHECK_TILLO_CONFIG.name, 'failed', {
          error: 'No Tillo brand code configured',
          availableDenominations: availableDenoms,
        });
        
        throw new ProvisioningError(
          `No $${denomination} cards available for ${brand.brand_name} and Tillo API not configured. Available denominations: ${availableDenoms.length > 0 ? '$' + availableDenoms.join(', $') : 'NONE'}`,
          'GC-003'
        );
      }
      
      await log.checkpoint(STEPS.CHECK_TILLO_CONFIG.number, STEPS.CHECK_TILLO_CONFIG.name, 'completed', {
        tilloBrandCode: brand.tillo_brand_code,
      });
      
      // =====================================================
      // STEP 8: PROVISION FROM TILLO API
      // =====================================================
      currentStep = STEPS.PROVISION_TILLO;
      await log.checkpoint(STEPS.PROVISION_TILLO.number, STEPS.PROVISION_TILLO.name, 'started');
      
      let tilloResult: TilloCardResult;
      let tilloCost: number;
      
      try {
        const tilloClient = getTilloClient();
        tilloResult = await tilloClient.provisionCard(
          brand.tillo_brand_code,
          denomination,
          'USD',
          `mobul-${campaignId}-${recipientId}-${Date.now()}`
        );
        
        // Get Tillo cost from denomination config or estimate
        const { data: tilloConfig } = await supabase
          .from('gift_card_denominations')
          .select('tillo_cost_per_card, cost_basis')
          .eq('brand_id', brandId)
          .eq('denomination', denomination)
          .single();
        
        tilloCost = tilloConfig?.tillo_cost_per_card || tilloConfig?.cost_basis || denomination * 0.95;
        
        await log.checkpoint(STEPS.PROVISION_TILLO.number, STEPS.PROVISION_TILLO.name, 'completed', {
          transactionId: tilloResult.transactionId,
          orderReference: tilloResult.orderReference,
          tilloCost,
        });
        
        console.log(`[PROVISION] Tillo provisioned: ${tilloResult.transactionId} (cost: $${tilloCost})`);
      } catch (tilloError) {
        await log.checkpoint(STEPS.PROVISION_TILLO.number, STEPS.PROVISION_TILLO.name, 'failed', {
          error: tilloError instanceof Error ? tilloError.message : String(tilloError),
        });
        await log.logProvisioningError('GC-004', tilloError, STEPS.PROVISION_TILLO);
        throw new ProvisioningError(
          `Tillo API provisioning failed: ${tilloError instanceof Error ? tilloError.message : String(tilloError)}`,
          'GC-004'
        );
      }
      
      // =====================================================
      // STEP 9: SAVE TILLO CARD TO INVENTORY
      // =====================================================
      currentStep = STEPS.SAVE_TILLO_CARD;
      await log.checkpoint(STEPS.SAVE_TILLO_CARD.number, STEPS.SAVE_TILLO_CARD.name, 'started');
      
      const { data: savedCard, error: saveError } = await supabase
        .from('gift_card_inventory')
        .insert({
          brand_id: brandId,
          denomination: denomination,
          card_code: tilloResult.cardCode,
          card_number: tilloResult.cardNumber,
          expiration_date: tilloResult.expirationDate,
          status: 'assigned',
          assigned_to_recipient_id: recipientId,
          assigned_to_campaign_id: campaignId,
          assigned_at: new Date().toISOString(),
          cost_per_card: tilloCost,
          cost_source: 'tillo_api',
          provider: 'tillo',
        })
        .select('id')
        .single();
      
      if (saveError) {
        console.error(`[PROVISION] Failed to save Tillo card to inventory: ${saveError.message}`);
        // Non-blocking - card was provisioned, just logging failed
      }
      
      await log.checkpoint(STEPS.SAVE_TILLO_CARD.number, STEPS.SAVE_TILLO_CARD.name, 'completed', {
        inventoryId: savedCard?.id,
        tilloCost,
        costSource: 'tillo_api',
      });
      
      // Build result from Tillo card
      const cardResult = {
        card_id: savedCard?.id,
        card_code: tilloResult.cardCode,
        card_number: tilloResult.cardNumber,
        expiration_date: tilloResult.expirationDate,
        brand_name: brand.brand_name,
        brand_logo_url: brand.logo_url,
      };
      const source: 'inventory' | 'tillo' = 'tillo';
      const costBasis = tilloCost;
      
      // Skip to Step 10 (pricing) and continue...
      // =====================================================
      // STEP 10: GET PRICING CONFIGURATION (Tillo path)
      // =====================================================
      currentStep = STEPS.GET_PRICING;
      await log.checkpoint(STEPS.GET_PRICING.number, STEPS.GET_PRICING.name, 'started');
      
      const { data: pricingData } = await supabase
        .from('gift_card_denominations')
        .select('use_custom_pricing, client_price, agency_price, cost_basis')
        .eq('brand_id', brandId)
        .eq('denomination', denomination)
        .single();

      const useCustomPricing = pricingData?.use_custom_pricing || false;
      const isAgency = entity_type === 'agency';
      
      let amountBilled = denomination;
      if (useCustomPricing) {
        if (isAgency && pricingData?.agency_price) {
          amountBilled = pricingData.agency_price;
        } else if (pricingData?.client_price) {
          amountBilled = pricingData.client_price;
        }
      }

      await log.checkpoint(STEPS.GET_PRICING.number, STEPS.GET_PRICING.name, 'completed', {
        useCustomPricing,
        isAgency,
        faceValue: denomination,
        amountBilled,
        costBasis,
      });

      console.log(`[PROVISION] Pricing (Tillo): bill $${amountBilled} (cost $${costBasis})`);

      // =====================================================
      // STEP 11: RECORD BILLING TRANSACTION (Tillo path)
      // =====================================================
      currentStep = STEPS.RECORD_BILLING;
      await log.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'started');

      let ledgerId: string | null = null;
      try {
        const { data: ledgerEntry, error: ledgerError } = await supabase
          .from('gift_card_billing_ledger')
          .insert({
            transaction_type: 'purchase_from_tillo',
            billed_entity_type: entity_type,
            billed_entity_id: entity_id,
            campaign_id: campaignId,
            recipient_id: recipientId,
            brand_id: brandId,
            denomination: denomination,
            amount_billed: amountBilled,
            cost_basis: costBasis,
            inventory_card_id: savedCard?.id,
            metadata: { 
              source: 'tillo', 
              request_id: log.requestId,
              tillo_transaction_id: tilloResult.transactionId,
              tillo_order_reference: tilloResult.orderReference,
            },
            billed_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (ledgerError) {
          console.error(`[PROVISION] Billing failed (non-blocking): ${ledgerError.message}`);
          await log.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'failed', {
            error: ledgerError.message,
          });
        } else {
          ledgerId = ledgerEntry?.id;
          await log.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'completed', {
            ledgerId,
            amountBilled,
          });
          console.log(`[PROVISION] Billing recorded: ${ledgerId}`);
        }
      } catch (billingErr) {
        console.error(`[PROVISION] Billing exception (non-blocking):`, billingErr);
      }

      const profit = costBasis ? amountBilled - costBasis : 0;

      // =====================================================
      // STEP 12: FINALIZE AND RETURN RESULT (Tillo path)
      // =====================================================
      currentStep = STEPS.FINALIZE;
      await log.checkpoint(STEPS.FINALIZE.number, STEPS.FINALIZE.name, 'completed', {
        source,
        brandName: cardResult.brand_name,
        denomination,
        amountBilled,
      });

      console.log(`[PROVISION] SUCCESS: ${brand.brand_name} $${denomination} from ${source}`);

      return {
        success: true,
        requestId: log.requestId,
        card: {
          id: cardResult.card_id,
          cardCode: cardResult.card_code,
          cardNumber: cardResult.card_number,
          denomination: denomination,
          brandName: cardResult.brand_name,
          brandLogo: cardResult.brand_logo_url,
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
    }
    
    // Claim the card
    const { data: claimedCard, error: claimError } = await supabase
      .from('gift_card_inventory')
      .update({
        status: 'assigned',
        assigned_to_recipient_id: recipientId,
        assigned_to_campaign_id: campaignId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', exactMatch.id)
      .eq('status', 'available')
      .select('id, card_code, card_number, expiration_date')
      .single();
    
    if (claimError || !claimedCard) {
      await log.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'failed', {
        error: claimError?.message || 'Race condition',
      });
      throw new ProvisioningError(`Failed to claim card: ${claimError?.message || 'Card was claimed by another process'}`, 'GC-003');
    }
    
    const cardResult = {
      card_id: claimedCard.id,
      card_code: claimedCard.card_code,
      card_number: claimedCard.card_number,
      expiration_date: claimedCard.expiration_date,
      brand_name: brand.brand_name,
      brand_logo_url: brand.logo_url,
    };
    const source: 'inventory' | 'tillo' = 'inventory';
    const inventoryCardId = claimedCard.id;
    
    // Get cost basis
    const { data: denomData } = await supabase
      .from('gift_card_denominations')
      .select('cost_basis')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .single();
    
    const costBasis = denomData?.cost_basis || denomination * 0.95;
    
    await log.checkpoint(STEPS.CLAIM_INVENTORY.number, STEPS.CLAIM_INVENTORY.name, 'completed', {
      cardId: cardResult.card_id,
      brandName: cardResult.brand_name,
      costBasis,
    });
    
    console.log(`[PROVISION] Claimed card: ${cardResult.card_id}`);

    // =====================================================
    // STEP 10: GET PRICING CONFIGURATION
    // =====================================================
    currentStep = STEPS.GET_PRICING;
    await log.checkpoint(STEPS.GET_PRICING.number, STEPS.GET_PRICING.name, 'started');
    
    const { data: pricingData } = await supabase
      .from('gift_card_denominations')
      .select('use_custom_pricing, client_price, agency_price, cost_basis')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .single();

    const useCustomPricing = pricingData?.use_custom_pricing || false;
    const isAgency = entity_type === 'agency';
    
    let amountBilled = denomination;
    if (useCustomPricing) {
      if (isAgency && pricingData?.agency_price) {
        amountBilled = pricingData.agency_price;
      } else if (pricingData?.client_price) {
        amountBilled = pricingData.client_price;
      }
    }

    await log.checkpoint(STEPS.GET_PRICING.number, STEPS.GET_PRICING.name, 'completed', {
      useCustomPricing,
      isAgency,
      faceValue: denomination,
      amountBilled,
      costBasis,
    });

    console.log(`[PROVISION] Pricing: bill $${amountBilled} (cost $${costBasis})`);

    // =====================================================
    // STEP 11: RECORD BILLING TRANSACTION
    // =====================================================
    currentStep = STEPS.RECORD_BILLING;
    await log.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'started');

    let ledgerId: string | null = null;
    try {
      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from('gift_card_billing_ledger')
        .insert({
          transaction_type: 'purchase_from_inventory',
          billed_entity_type: entity_type,
          billed_entity_id: entity_id,
          campaign_id: campaignId,
          recipient_id: recipientId,
          brand_id: brandId,
          denomination: denomination,
          amount_billed: amountBilled,
          cost_basis: costBasis,
          inventory_card_id: inventoryCardId,
          metadata: { source: 'inventory', request_id: log.requestId },
          billed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (ledgerError) {
        console.error(`[PROVISION] Billing failed (non-blocking): ${ledgerError.message}`);
        await log.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'failed', {
          error: ledgerError.message,
        });
      } else {
        ledgerId = ledgerEntry?.id;
        await log.checkpoint(STEPS.RECORD_BILLING.number, STEPS.RECORD_BILLING.name, 'completed', {
          ledgerId,
          amountBilled,
        });
        console.log(`[PROVISION] Billing recorded: ${ledgerId}`);
      }
    } catch (billingErr) {
      console.error(`[PROVISION] Billing exception (non-blocking):`, billingErr);
    }

    const profit = costBasis ? amountBilled - costBasis : 0;

    // =====================================================
    // STEP 12: FINALIZE AND RETURN RESULT
    // =====================================================
    currentStep = STEPS.FINALIZE;
    await log.checkpoint(STEPS.FINALIZE.number, STEPS.FINALIZE.name, 'completed', {
      source,
      brandName: cardResult.brand_name,
      denomination,
      amountBilled,
    });

    console.log(`[PROVISION] SUCCESS: ${brand.brand_name} $${denomination} from ${source}`);

    return {
      success: true,
      requestId: log.requestId,
      card: {
        id: cardResult.card_id,
        cardCode: cardResult.card_code,
        cardNumber: cardResult.card_number,
        denomination: denomination,
        brandName: cardResult.brand_name,
        brandLogo: cardResult.brand_logo_url,
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

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Determine error code
    let errorCode: ProvisioningErrorCode = 'GC-015';
    if (error instanceof ProvisioningError) {
      errorCode = error.code;
    } else if (errorMessage.includes('Missing required')) {
      errorCode = 'GC-012';
    } else if (errorMessage.includes('billing entity')) {
      errorCode = 'GC-008';
    } else if (errorMessage.includes('Brand not found') || errorMessage.includes('brand')) {
      errorCode = 'GC-002';
    } else if (errorMessage.includes('inventory') || errorMessage.includes('cards available')) {
      errorCode = 'GC-003';
    } else if (errorMessage.includes('credits') || errorMessage.includes('Insufficient')) {
      errorCode = 'GC-006';
    } else if (errorMessage.includes('billing')) {
      errorCode = 'GC-007';
    }

    console.error(`[PROVISION] FAILED: ${errorCode} - ${errorMessage}`);
    console.error(`[PROVISION] Step: ${currentStep.number} - ${currentStep.name}`);

    await log.logProvisioningError(errorCode, error, currentStep);

    return {
      success: false,
      requestId: log.requestId,
      error: errorMessage,
      errorCode,
      errorDescription: PROVISIONING_ERROR_CODES[errorCode],
    };
  }
}

// ============================================================================
// Helper Classes
// ============================================================================

/**
 * Custom error class for provisioning failures
 */
export class ProvisioningError extends Error {
  constructor(
    message: string,
    public code: ProvisioningErrorCode = 'GC-015'
  ) {
    super(message);
    this.name = 'ProvisioningError';
  }
}

/**
 * Create a default logger when none is provided
 */
function createDefaultLogger(): ProvisioningLogger {
  const errorLogger = createErrorLogger('gift-card-provisioning');
  
  return {
    requestId: errorLogger.requestId,
    checkpoint: async (stepNumber, stepName, status, details) => {
      await errorLogger.checkpoint(stepNumber, stepName, status, details as Record<string, any>);
    },
    setProvisioningContext: (ctx) => {
      errorLogger.setProvisioningContext(ctx);
    },
    logProvisioningError: async (code, error, step, metadata) => {
      await errorLogger.logProvisioningError(code, error, step, metadata as Record<string, any>);
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export { STEPS as PROVISIONING_STEPS };
export type { ProvisioningErrorCode };

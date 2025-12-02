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

  try {
    const {
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionNumber,
    }: ProvisionRequest = await req.json();

    console.log('[PROVISION] Starting:', {
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionNumber,
    });

    // Validate inputs
    if (!campaignId || !recipientId || !brandId || !denomination) {
      throw new Error('Missing required parameters');
    }

    // =====================================================
    // STEP 1: Get campaign and determine billing entity
    // =====================================================
    
    const { data: billingEntity, error: billingError } = await supabaseClient
      .rpc('get_billing_entity_for_campaign', { p_campaign_id: campaignId });

    if (billingError || !billingEntity || billingEntity.length === 0) {
      throw new Error(`Failed to determine billing entity: ${billingError?.message}`);
    }

    const { entity_type, entity_id, entity_name } = billingEntity[0];
    console.log('[PROVISION] Billing entity:', { entity_type, entity_id, entity_name });

    // =====================================================
    // STEP 2: Get brand details
    // =====================================================
    
    const { data: brand, error: brandError } = await supabaseClient
      .from('gift_card_brands')
      .select('brand_name, brand_code, tillo_brand_code, logo_url')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      throw new Error(`Brand not found: ${brandError?.message}`);
    }

    console.log('[PROVISION] Brand:', brand.brand_name);

    // =====================================================
    // STEP 3: Try to claim from inventory first
    // =====================================================
    
    const { data: inventoryCard, error: inventoryError } = await supabaseClient
      .rpc('claim_gift_card_from_inventory', {
        p_brand_id: brandId,
        p_denomination: denomination,
        p_recipient_id: recipientId,
        p_campaign_id: campaignId,
      });

    let cardResult: any = null;
    let source: 'inventory' | 'tillo' = 'inventory';
    let costBasis: number | null = null;
    let inventoryCardId: string | null = null;
    let tilloTransactionId: string | null = null;
    let tilloOrderReference: string | null = null;

    if (inventoryCard && inventoryCard.length > 0) {
      // SUCCESS: Got card from inventory
      console.log('[PROVISION] Claimed from inventory');
      cardResult = inventoryCard[0];
      source = 'inventory';
      inventoryCardId = cardResult.card_id;
      
      // Get admin cost from denominations table
      const { data: denomData } = await supabaseClient
        .from('gift_card_denominations')
        .select('admin_cost_per_card')
        .eq('brand_id', brandId)
        .eq('denomination', denomination)
        .single();
      
      costBasis = denomData?.admin_cost_per_card || denomination * 0.95; // Default 5% discount
    } else {
      // No inventory available, try Tillo API
      console.log('[PROVISION] No inventory, purchasing from Tillo');
      
      const tilloBrandCode = brand.tillo_brand_code || brand.brand_code;
      if (!tilloBrandCode) {
        throw new Error('Brand does not have Tillo integration configured');
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
        throw new Error(`Failed to provision from Tillo: ${tilloError.message}`);
      }
    }

    // =====================================================
    // STEP 4: Record billing transaction
    // =====================================================
    
    const amountBilled = denomination; // Bill face value for now (can add markup later)

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

    console.log('[PROVISION] Success:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[PROVISION] Error:', error);

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


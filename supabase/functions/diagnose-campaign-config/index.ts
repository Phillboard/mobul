/**
 * Diagnostic Edge Function for Campaign Configuration
 * 
 * Returns the ACTUAL data that the provision function will see.
 * Useful for debugging campaign configuration issues and verifying RLS access.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DiagnosticRequest {
  campaignId?: string;
  conditionId?: string;
  redemptionCode?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { campaignId, conditionId, redemptionCode }: DiagnosticRequest = await req.json();

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      serviceRoleConfigured: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      checks: {},
    };

    // =====================================================
    // Check 1: Can we read from campaign_conditions?
    // =====================================================
    if (conditionId) {
      const { data: condition, error: conditionError } = await supabaseClient
        .from('campaign_conditions')
        .select('id, campaign_id, condition_number, condition_name, brand_id, card_value, sms_template, is_active')
        .eq('id', conditionId)
        .single();

      diagnostics.checks.conditionById = {
        success: !!condition,
        data: condition,
        error: conditionError,
        hasBrandId: !!condition?.brand_id,
        hasCardValue: !!condition?.card_value,
      };
    }

    // =====================================================
    // Check 2: Can we read conditions by campaign_id?
    // =====================================================
    if (campaignId) {
      const { data: conditions, error: campaignConditionsError } = await supabaseClient
        .from('campaign_conditions')
        .select('id, condition_number, condition_name, brand_id, card_value, sms_template, is_active')
        .eq('campaign_id', campaignId)
        .order('condition_number');

      diagnostics.checks.conditionsByCampaign = {
        success: !!conditions,
        count: conditions?.length || 0,
        data: conditions,
        error: campaignConditionsError,
        allHaveBrandId: conditions?.every(c => !!c.brand_id) || false,
        allHaveCardValue: conditions?.every(c => !!c.card_value) || false,
      };
    }

    // =====================================================
    // Check 3: Can we look up a recipient?
    // =====================================================
    if (redemptionCode) {
      const { data: recipient, error: recipientError } = await supabaseClient
        .from('recipients')
        .select(`
          id,
          first_name,
          last_name,
          redemption_code,
          sms_opt_in_status,
          verification_method,
          disposition,
          audiences!inner(
            campaign_id,
            campaigns!inner(
              id,
              name,
              client_id
            )
          )
        `)
        .eq('redemption_code', redemptionCode)
        .single();

      diagnostics.checks.recipientLookup = {
        success: !!recipient,
        hasRecipient: !!recipient,
        hasCampaign: !!recipient?.audiences?.[0]?.campaign_id,
        campaignId: recipient?.audiences?.[0]?.campaign_id,
        error: recipientError,
        data: recipient ? {
          id: recipient.id,
          name: `${recipient.first_name} ${recipient.last_name}`,
          sms_opt_in_status: recipient.sms_opt_in_status,
          verification_method: recipient.verification_method,
          disposition: recipient.disposition,
        } : null,
      };

      // If we found a recipient, also check their campaign's conditions
      if (recipient?.audiences?.[0]?.campaign_id) {
        const recipientCampaignId = recipient.audiences[0].campaign_id;
        
        const { data: recipientConditions, error: recipientConditionsError } = await supabaseClient
          .from('campaign_conditions')
          .select('id, condition_number, condition_name, brand_id, card_value, is_active')
          .eq('campaign_id', recipientCampaignId);

        diagnostics.checks.recipientCampaignConditions = {
          success: !!recipientConditions,
          count: recipientConditions?.length || 0,
          data: recipientConditions,
          error: recipientConditionsError,
          hasGiftCardConfig: recipientConditions?.some(c => c.brand_id && c.card_value) || false,
        };
      }
    }

    // =====================================================
    // Check 4: Can we read gift_card_brands?
    // =====================================================
    const { data: brands, error: brandsError } = await supabaseClient
      .from('gift_card_brands')
      .select('id, brand_name, is_enabled_by_admin')
      .limit(5);

    diagnostics.checks.giftCardBrands = {
      success: !!brands,
      count: brands?.length || 0,
      error: brandsError,
    };

    // =====================================================
    // Check 5: Can we read gift_card_inventory?
    // =====================================================
    const { data: inventory, error: inventoryError } = await supabaseClient
      .from('gift_card_inventory')
      .select('id, status, brand_id')
      .eq('status', 'available')
      .limit(5);

    diagnostics.checks.giftCardInventory = {
      success: !!inventory,
      availableCount: inventory?.length || 0,
      error: inventoryError,
    };

    // =====================================================
    // Summary
    // =====================================================
    const allChecksPass = Object.values(diagnostics.checks).every((check: any) => check.success !== false);
    
    diagnostics.summary = {
      allChecksPass,
      rlsWorking: allChecksPass,
      recommendations: [],
    };

    if (!diagnostics.checks.conditionsByCampaign?.allHaveBrandId) {
      diagnostics.summary.recommendations.push('Campaign conditions are missing brand_id - gift card selection not configured');
    }
    if (!diagnostics.checks.conditionsByCampaign?.allHaveCardValue) {
      diagnostics.summary.recommendations.push('Campaign conditions are missing card_value - denomination not set');
    }
    if (diagnostics.checks.giftCardInventory?.availableCount === 0) {
      diagnostics.summary.recommendations.push('No gift cards available in inventory - upload cards or configure Tillo API');
    }

    return new Response(JSON.stringify(diagnostics, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[DIAGNOSE] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});


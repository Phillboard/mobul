import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * validate-redemption-code
 * 
 * Comprehensive validation endpoint for redemption codes.
 * Used by call center before attempting gift card provision.
 * 
 * Returns detailed validation result with existing card assignments.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { redemptionCode, campaignId } = await req.json();
    
    if (!redemptionCode) {
      return Response.json(
        { valid: false, reason: 'MISSING_CODE', message: 'Redemption code is required' },
        { headers: corsHeaders, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(
      supabase,
      req,
      { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
      'validate-redemption-code'
    );

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // 1. Check if code exists - now using direct campaign_id
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select(`
        id,
        redemption_code,
        approval_status,
        rejection_reason,
        sms_opt_in_status,
        gift_card_assigned_id,
        first_name,
        last_name,
        phone,
        email,
        audience_id,
        campaign_id,
        campaign:campaigns(
          id,
          name,
          client_id,
          status
        ),
        audience:audiences(
          id,
          name
        )
      `)
      .eq('redemption_code', redemptionCode.trim().toUpperCase())
      .single();

    if (recipientError || !recipient) {
      console.log('[VALIDATE] Code not found:', redemptionCode);
      return Response.json({
        valid: false,
        reason: 'CODE_NOT_FOUND',
        message: 'This redemption code does not exist',
        recipient: null,
        existingCards: [],
        canRedeem: false
      }, { headers: corsHeaders, status: 404 });
    }

    // 2. Check if code belongs to specified campaign (if provided)
    if (campaignId) {
      // Direct check using campaign_id on recipient
      const matchesCampaign = recipient.campaign_id === campaignId || 
                              recipient.campaign?.id === campaignId;

      if (!matchesCampaign) {
        // Fallback: try to find campaign via audience if campaign_id not set
        if (!recipient.campaign_id && recipient.audience_id) {
          const { data: audienceCampaign } = await supabase
            .from('campaigns')
            .select('id')
            .eq('audience_id', recipient.audience_id)
            .eq('id', campaignId)
            .maybeSingle();
          
          if (audienceCampaign) {
            // Update recipient for future lookups (backfill)
            await supabase
              .from('recipients')
              .update({ campaign_id: campaignId })
              .eq('id', recipient.id);
          } else {
            return Response.json({
              valid: false,
              reason: 'CAMPAIGN_MISMATCH',
              message: 'This code is not valid for the specified campaign',
              recipient: null,
              existingCards: [],
              canRedeem: false
            }, { headers: corsHeaders, status: 400 });
          }
        } else {
          return Response.json({
            valid: false,
            reason: 'CAMPAIGN_MISMATCH',
            message: 'This code is not valid for the specified campaign',
            recipient: null,
            existingCards: [],
            canRedeem: false
          }, { headers: corsHeaders, status: 400 });
        }
      }
    }

    // 3. Check recipient status
    let canRedeem = false;
    let statusMessage = '';

    switch (recipient.approval_status) {
      case 'pending':
        statusMessage = 'This code needs approval before it can be redeemed';
        canRedeem = false;
        break;
      case 'rejected':
        statusMessage = `This code has been rejected${recipient.rejection_reason ? ': ' + recipient.rejection_reason : ''}`;
        canRedeem = false;
        break;
      case 'approved':
        statusMessage = 'Code is approved and ready for redemption';
        canRedeem = true;
        break;
      case 'redeemed':
        statusMessage = 'This code has already been redeemed';
        canRedeem = false; // Will check existing cards below
        break;
      default:
        statusMessage = 'Unknown status';
        canRedeem = false;
    }

    // 4. Check SMS opt-in status
    if (recipient.sms_opt_in_status && recipient.sms_opt_in_status !== 'opted_in' && recipient.sms_opt_in_status !== 'not_sent') {
      if (recipient.sms_opt_in_status === 'opted_out') {
        return Response.json({
          valid: true,
          reason: 'OPT_OUT',
          message: 'Customer has opted out of marketing messages',
          recipient: {
            id: recipient.id,
            firstName: recipient.first_name,
            lastName: recipient.last_name,
            status: recipient.approval_status,
            smsOptInStatus: recipient.sms_opt_in_status
          },
          existingCards: [],
          canRedeem: false
        }, { headers: corsHeaders });
      }
      
      if (recipient.sms_opt_in_status === 'pending') {
        return Response.json({
          valid: true,
          reason: 'OPT_IN_PENDING',
          message: 'Customer has not yet confirmed opt-in',
          recipient: {
            id: recipient.id,
            firstName: recipient.first_name,
            lastName: recipient.last_name,
            status: recipient.approval_status,
            smsOptInStatus: recipient.sms_opt_in_status
          },
          existingCards: [],
          canRedeem: false
        }, { headers: corsHeaders });
      }
    }

    // 5. Check for existing gift card assignments
    const { data: existingAssignments } = await supabase
      .from('recipient_gift_cards')
      .select(`
        id,
        gift_card_id,
        condition_id,
        assigned_at,
        delivered_at,
        delivery_status,
        delivery_method,
        campaign_conditions(
          condition_name,
          brand_id,
          card_value
        ),
        gift_cards(
          card_code,
          card_number,
          card_value,
          gift_card_pools(
            pool_name,
            gift_card_brands(
              brand_name,
              logo_url
            )
          )
        )
      `)
      .eq('recipient_id', recipient.id);

    const existingCards = existingAssignments?.map((assignment: any) => {
      const card = assignment.gift_cards;
      const condition = assignment.campaign_conditions;
      const pool = card?.gift_card_pools;
      const brand = pool?.gift_card_brands;

      return {
        giftCardId: assignment.gift_card_id,
        conditionId: assignment.condition_id,
        conditionName: condition?.condition_name,
        cardCode: card?.card_code,
        cardValue: card?.card_value,
        brandName: brand?.brand_name || pool?.pool_name,
        brandLogo: brand?.logo_url,
        assignedAt: assignment.assigned_at,
        deliveredAt: assignment.delivered_at,
        deliveryStatus: assignment.delivery_status,
        deliveryMethod: assignment.delivery_method
      };
    }) || [];

    // If recipient is redeemed but has cards, they can view existing cards
    if (recipient.approval_status === 'redeemed' && existingCards.length > 0) {
      canRedeem = false;
      statusMessage = `Code already redeemed with ${existingCards.length} gift card(s)`;
    }

    // 6. Get available conditions for this recipient's campaign
    // Use direct campaign_id, fallback to audience-based lookup
    let effectiveCampaignId = recipient.campaign_id || recipient.campaign?.id;

    // If still no campaign_id, try audience lookup
    if (!effectiveCampaignId && recipient.audience_id) {
      const { data: audienceCampaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('audience_id', recipient.audience_id)
        .maybeSingle();
      
      effectiveCampaignId = audienceCampaign?.id;
      
      // Backfill the recipient's campaign_id
      if (effectiveCampaignId) {
        await supabase
          .from('recipients')
          .update({ campaign_id: effectiveCampaignId })
          .eq('id', recipient.id);
      }
    }

    let availableConditions: any[] = [];
    if (effectiveCampaignId) {
      const { data } = await supabase
        .from('campaign_conditions')
        .select('id, condition_name, brand_id, card_value')
        .eq('campaign_id', effectiveCampaignId)
        .not('brand_id', 'is', null);
      
      availableConditions = data || [];
    }

    const conditions = availableConditions.map((c: any) => ({
      id: c.id,
      name: c.condition_name,
      hasAssignment: existingCards.some((ec: any) => ec.conditionId === c.id)
    }));

    console.log('[VALIDATE] Validation successful:', {
      recipientId: recipient.id,
      status: recipient.approval_status,
      canRedeem,
      existingCardsCount: existingCards.length
    });

    return Response.json({
      valid: true,
      reason: recipient.approval_status,
      message: statusMessage,
      recipient: {
        id: recipient.id,
        firstName: recipient.first_name,
        lastName: recipient.last_name,
        phone: recipient.phone,
        email: recipient.email,
        status: recipient.approval_status,
        smsOptInStatus: recipient.sms_opt_in_status,
        audienceName: recipient.audience?.name,
        campaignId: effectiveCampaignId,
        campaignName: recipient.campaign?.name,
        campaigns: effectiveCampaignId ? [{ id: effectiveCampaignId, name: recipient.campaign?.name }] : []
      },
      existingCards,
      availableConditions: conditions,
      canRedeem
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[VALIDATE] Error:', error);
    return Response.json(
      { 
        valid: false, 
        reason: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        recipient: null,
        existingCards: [],
        canRedeem: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
});




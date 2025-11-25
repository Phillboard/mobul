import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { ERROR_MESSAGES } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { redemptionCode, campaignId } = await req.json();
    
    if (!redemptionCode || !campaignId) {
      return Response.json(
        { success: false, error: 'Missing required parameters' },
        { headers: corsHeaders, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // TEST CODE: Always allow 1234-5678-abcd for testing (normalize by removing dashes/spaces)
    const normalizedCode = redemptionCode.replace(/[\s-]/g, '').toUpperCase();
    if (normalizedCode === '12345678ABCD') {
      console.log('Test code used in customer redemption - returning mock Jimmy Johns gift card');
      
      return Response.json(
        {
          success: true,
          giftCard: {
            card_code: '1234-5678-ABCD',
            card_number: 'JJ-TEST-9876-5432',
            card_value: 25.00,
            provider: 'Test Provider',
            brand_name: "Jimmy John's",
            brand_logo: null,
            brand_color: '#DA291C',
            store_url: 'https://www.jimmyjohns.com',
            expiration_date: null,
            usage_restrictions: ['Valid for testing only', 'Use at any Jimmy John\'s location'],
            redemption_instructions: 'Present this card at any Jimmy John\'s location or use card number JJ-TEST-9876-5432 for online orders.',
          }
        },
        { headers: corsHeaders }
      );
    }

    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(
      supabase,
      req,
      { maxRequests: 10, windowMs: 60 * 60 * 1000 },
      'redeem-customer-code'
    );

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // 1. Look up recipient by redemption code
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select(`
        *,
        audience:audiences(id, client_id, name),
        gift_card_assigned:gift_cards(
          id, card_code, card_number,
          pool:gift_card_pools(card_value, provider, brand_id)
        )
      `)
      .eq('redemption_code', redemptionCode.toUpperCase())
      .single();

    if (recipientError || !recipient) {
      console.log('Recipient not found:', redemptionCode);
      
      // Log failed attempt
      await supabase.from('recipient_audit_log').insert({
        action: 'viewed',
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        metadata: { redemptionCode, campaignId, error: 'code_not_found' }
      });
      
      return Response.json(
        { success: false, error: ERROR_MESSAGES.INVALID_CODE },
        { headers: corsHeaders, status: 404 }
      );
    }

    // 2. Verify campaign matches
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, audience_id, client_id')
      .eq('id', campaignId)
      .single();

    if (!campaign || campaign.audience_id !== recipient.audience_id) {
      console.log('Campaign mismatch:', { campaignId, audienceId: recipient.audience_id });
      return Response.json(
        { success: false, error: 'This code is not valid for this campaign.' },
        { headers: corsHeaders, status: 400 }
      );
    }

    // 3. Check approval status
    if (recipient.approval_status === 'pending') {
      await supabase.from('recipient_audit_log').insert({
        recipient_id: recipient.id,
        action: 'viewed',
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        metadata: { status: 'not_approved', campaignId }
      });
      
      return Response.json(
        {
          success: false,
          error: 'Your code has not been activated yet. Please call customer service to activate.',
          needsApproval: true
        },
        { headers: corsHeaders, status: 403 }
      );
    }

    if (recipient.approval_status === 'rejected') {
      return Response.json(
        {
          success: false,
          error: 'This code has been rejected. Please contact customer service for assistance.',
          reason: recipient.rejection_reason
        },
        { headers: corsHeaders, status: 403 }
      );
    }

    // 4. Check if already redeemed
    if (recipient.approval_status === 'redeemed' && recipient.gift_card_assigned_id) {
      console.log('Code already redeemed:', redemptionCode);
      
      // Allow viewing again - return the same gift card
      const { data: existingCard } = await supabase
        .from('gift_cards')
        .select(`
          *,
          pool:gift_card_pools(card_value, provider, brand_id),
          brand:gift_card_brands(brand_name, logo_url, brand_color, store_url, redemption_instructions, usage_restrictions)
        `)
        .eq('id', recipient.gift_card_assigned_id)
        .single();

      if (existingCard) {
        return Response.json({
          success: true,
          alreadyRedeemed: true,
          giftCard: {
            card_code: existingCard.card_code,
            card_number: existingCard.card_number,
            card_value: existingCard.pool.card_value,
            provider: existingCard.pool.provider,
            brand_name: existingCard.brand?.brand_name || existingCard.pool.provider,
            brand_logo: existingCard.brand?.logo_url,
            brand_color: existingCard.brand?.brand_color || '#6366f1',
            store_url: existingCard.brand?.store_url,
            redemption_instructions: existingCard.brand?.redemption_instructions,
            usage_restrictions: existingCard.brand?.usage_restrictions || []
          }
        }, { headers: corsHeaders });
      }
    }

    // 5. Find gift card pool for this campaign
    const { data: rewardConfig } = await supabase
      .from('campaign_reward_configs')
      .select('gift_card_pool_id')
      .eq('campaign_id', campaignId)
      .single();

    if (!rewardConfig?.gift_card_pool_id) {
      console.error('No reward config for campaign:', campaignId);
      return Response.json(
        { success: false, error: 'No gift card pool configured for this campaign.' },
        { headers: corsHeaders, status: 500 }
      );
    }

    // 6. Claim next available gift card from pool
    let giftCard;
    try {
      const { data: claimedCard, error: claimError } = await supabase
        .rpc('claim_available_card', {
          p_pool_id: rewardConfig.gift_card_pool_id,
          p_recipient_id: recipient.id,
          p_call_session_id: recipient.approved_call_session_id
        });

      if (claimError) {
        if (claimError.message?.includes('API_PROVISIONING_REQUIRED')) {
          // API provisioning needed
          const apiProvider = claimError.message.split(':')[1];
          console.log('Triggering API provisioning:', apiProvider);
          
          const { data: apiCard, error: apiError } = await supabase.functions.invoke(
            'provision-gift-card-from-api',
            {
              body: {
                poolId: rewardConfig.gift_card_pool_id,
                recipientId: recipient.id,
                apiProvider
              }
            }
          );

          if (apiError || !apiCard) {
            throw new Error('Failed to provision gift card from API');
          }
          
          giftCard = apiCard;
        } else {
          throw claimError;
        }
      } else {
        giftCard = claimedCard[0];
      }
    } catch (error) {
      console.error('Error claiming gift card:', error);
      
      await supabase.from('recipient_audit_log').insert({
        recipient_id: recipient.id,
        action: 'redeemed',
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error', campaignId, status: 'failed' }
      });
      
      return Response.json(
        { success: false, error: 'No gift cards available. Please contact support.' },
        { headers: corsHeaders, status: 500 }
      );
    }

    // 7. Update recipient as redeemed
    await supabase
      .from('recipients')
      .update({
        approval_status: 'redeemed',
        gift_card_assigned_id: giftCard.card_id,
        redemption_completed_at: new Date().toISOString(),
        redemption_ip: req.headers.get('x-forwarded-for'),
        redemption_user_agent: req.headers.get('user-agent')
      })
      .eq('id', recipient.id);

    // 8. Log successful redemption
    await supabase.from('recipient_audit_log').insert({
      recipient_id: recipient.id,
      action: 'redeemed',
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      metadata: {
        campaignId,
        giftCardId: giftCard.card_id,
        poolId: rewardConfig.gift_card_pool_id,
        status: 'success'
      }
    });

    // 9. Get brand details
    const { data: brand } = await supabase
      .from('gift_card_brands')
      .select('*')
      .eq('id', giftCard.brand_id || rewardConfig.gift_card_pool_id)
      .maybeSingle();

    console.log('Redemption successful:', { recipientId: recipient.id, cardCode: giftCard.card_code });

    return Response.json({
      success: true,
      giftCard: {
        card_code: giftCard.card_code,
        card_number: giftCard.card_number,
        card_value: giftCard.card_value,
        provider: giftCard.provider,
        brand_name: brand?.brand_name || giftCard.provider,
        brand_logo: brand?.logo_url,
        brand_color: brand?.brand_color || '#6366f1',
        store_url: brand?.store_url,
        expiration_date: giftCard.expiration_date,
        usage_restrictions: brand?.usage_restrictions || [],
        redemption_instructions: brand?.redemption_instructions
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in redeem-customer-code:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});

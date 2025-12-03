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

    // Normalize redemption code early (remove dashes and spaces)
    const normalizedCode = redemptionCode.replace(/[\s-]/g, '').toUpperCase();

    // TEST CODE: Only allow test code in development environment
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' || Deno.env.get('SUPABASE_URL')?.includes('localhost');
    
    if (isDevelopment && normalizedCode === '12345678ABCD') {
      console.log('[DEV] Test code used in customer redemption - returning mock Jimmy Johns gift card');
      
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
      .eq('redemption_code', normalizedCode)
      .single();

    if (recipientError || !recipient) {
      console.log('Recipient not found:', normalizedCode);
      
      // Log failed attempt
      await supabase.from('recipient_audit_log').insert({
        action: 'viewed',
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        metadata: { redemptionCode: normalizedCode, campaignId, error: 'code_not_found' }
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
      
      // Allow viewing again - return existing gift cards for all conditions
      const { data: assignedCards } = await supabase
        .from('recipient_gift_cards')
        .select(`
          gift_card_id,
          campaign_conditions(condition_name),
          gift_cards(
            card_code,
            card_number,
            card_value,
            expiration_date,
            gift_card_pools(
              card_value,
              provider,
              gift_card_brands(
                brand_name,
                logo_url,
                brand_color,
                store_url,
                redemption_instructions,
                usage_restrictions
              )
            )
          )
        `)
        .eq('recipient_id', recipient.id)
        .eq('campaign_id', campaignId);

      if (assignedCards && assignedCards.length > 0) {
        const cards = assignedCards.map((ac: any) => {
          const gc = ac.gift_cards;
          const pool = gc.gift_card_pools;
          const brand = pool?.gift_card_brands;
          
          return {
            card_code: gc.card_code,
            card_number: gc.card_number,
            card_value: pool?.card_value || gc.card_value,
            provider: pool?.provider,
            brand_name: brand?.brand_name || pool?.provider,
            brand_logo: brand?.logo_url,
            brand_color: brand?.brand_color || '#6366f1',
            store_url: brand?.store_url,
            redemption_instructions: brand?.redemption_instructions,
            usage_restrictions: brand?.usage_restrictions || [],
            expiration_date: gc.expiration_date,
            condition_name: ac.campaign_conditions?.condition_name
          };
        });

        return Response.json({
          success: true,
          alreadyRedeemed: true,
          giftCard: cards[0], // Primary card for backward compatibility
          giftCards: cards // All cards for multi-condition support
        }, { headers: corsHeaders });
      }
    }

    // 5. Get campaign conditions with gift card rewards
    const { data: conditions, error: conditionsError } = await supabase
      .from('campaign_conditions')
      .select('id, condition_name, brand_id, card_value, gift_card_pool_id')
      .eq('campaign_id', campaignId)
      .not('brand_id', 'is', null);

    if (conditionsError || !conditions || conditions.length === 0) {
      console.error('No gift card conditions for campaign:', campaignId, conditionsError);
      return Response.json(
        { success: false, error: 'No gift cards configured for this campaign.' },
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log(`[REDEEM] Found ${conditions.length} gift card condition(s)`);

    // 6. Claim gift cards for each condition
    const claimedCards: any[] = [];
    for (const condition of conditions) {
      try {
        let brandId = condition.brand_id;
        let cardValue = condition.card_value;

        // If condition doesn't have brand_id yet (legacy), try to get from pool
        if (!brandId && condition.gift_card_pool_id) {
          const { data: pool } = await supabase
            .from('gift_card_pools')
            .select('brand_id, card_value')
            .eq('id', condition.gift_card_pool_id)
            .single();
          
          if (pool) {
            brandId = pool.brand_id;
            cardValue = pool.card_value;
          }
        }

        if (!brandId || !cardValue) {
          console.error(`[REDEEM] No brand/value for condition ${condition.id}`);
          continue;
        }

        const { data: claimedCard, error: claimError } = await supabase
          .rpc('claim_card_atomic', {
            p_brand_id: brandId,
            p_card_value: cardValue,
            p_client_id: campaign.client_id,
            p_recipient_id: recipient.id,
            p_campaign_id: campaignId,
            p_condition_id: condition.id,
            p_agent_id: null,
            p_source: 'landing_page'
          });

        if (claimError) {
          // If already assigned, get existing card
          if (claimError.message?.includes('ALREADY_ASSIGNED')) {
            console.log(`[REDEEM] Card already assigned for condition ${condition.id}`);
            const { data: existingCard } = await supabase
              .rpc('get_recipient_gift_card_for_condition', {
                p_recipient_id: recipient.id,
                p_condition_id: condition.id
              });

            if (existingCard && existingCard.length > 0) {
              claimedCards.push({ ...existingCard[0], condition_name: condition.condition_name });
            }
          } else {
            console.error(`[REDEEM] Failed to claim card for condition ${condition.id}:`, claimError);
          }
        } else if (claimedCard && claimedCard.length > 0) {
          claimedCards.push({ ...claimedCard[0], condition_name: condition.condition_name });
        }
      } catch (error) {
        console.error(`[REDEEM] Error processing condition ${condition.id}:`, error);
      }
    }

    if (claimedCards.length === 0) {
      console.error('[REDEEM] No cards could be claimed');
      return Response.json(
        { success: false, error: 'No gift cards available. Please contact support.' },
        { headers: corsHeaders, status: 500 }
      );
    }

    // 7. Update recipient as redeemed with first card
    await supabase
      .from('recipients')
      .update({
        approval_status: 'redeemed',
        gift_card_assigned_id: claimedCards[0].card_id,
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
        giftCardIds: claimedCards.map(c => c.card_id),
        conditionCount: claimedCards.length,
        status: 'success'
      }
    });

    // 9. Get full details for all claimed cards
    const fullCards = await Promise.all(
      claimedCards.map(async (card) => {
        const { data: fullCard } = await supabase
          .from('gift_cards')
          .select(`
            *,
            gift_card_pools(
              card_value,
              provider,
              gift_card_brands(
                brand_name,
                logo_url,
                brand_color,
                store_url,
                redemption_instructions,
                usage_restrictions
              )
            )
          `)
          .eq('id', card.card_id)
          .single();

        if (!fullCard) return null;

        const pool = fullCard.gift_card_pools;
        const brand = pool?.gift_card_brands;

        return {
          card_code: fullCard.card_code,
          card_number: fullCard.card_number,
          card_value: pool?.card_value || fullCard.card_value,
          provider: pool?.provider,
          brand_name: brand?.brand_name || pool?.provider,
          brand_logo: brand?.logo_url,
          brand_color: brand?.brand_color || '#6366f1',
          store_url: brand?.store_url,
          expiration_date: fullCard.expiration_date,
          usage_restrictions: brand?.usage_restrictions || [],
          redemption_instructions: brand?.redemption_instructions,
          condition_name: card.condition_name
        };
      })
    );

    const validCards = fullCards.filter(c => c !== null);

    console.log('Redemption successful:', { recipientId: recipient.id, cardCount: validCards.length });

    return Response.json({
      success: true,
      giftCard: validCards[0], // Primary card for backward compatibility
      giftCards: validCards // All cards for multi-condition support
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in redeem-customer-code:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});

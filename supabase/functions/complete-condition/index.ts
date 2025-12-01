import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteConditionRequest {
  callSessionId: string;
  campaignId: string;
  recipientId: string;
  conditionNumber: number;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { callSessionId, campaignId, recipientId, conditionNumber, notes }: CompleteConditionRequest = await req.json();

    console.log(`Completing condition ${conditionNumber} for call session:`, callSessionId);

    // Check if condition already completed
    const { data: existingCondition } = await supabaseClient
      .from('call_conditions_met')
      .select('id')
      .eq('call_session_id', callSessionId)
      .eq('condition_number', conditionNumber)
      .single();

    if (existingCondition) {
      return new Response(
        JSON.stringify({ error: 'Condition already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the condition configuration
    const { data: condition, error: conditionError } = await supabaseClient
      .from('campaign_conditions')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('condition_number', conditionNumber)
      .single();

    if (conditionError || !condition) {
      throw new Error('Condition not found');
    }

    let giftCardData = null;

    // If condition has gift card configured, claim a card using atomic system
    if (condition.brand_id && condition.card_value) {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get campaign client_id
      const { data: campaign } = await serviceClient
        .from('campaigns')
        .select('client_id')
        .eq('id', campaignId)
        .single();

      if (!campaign?.client_id) {
        throw new Error('Could not determine campaign client');
      }

      // Use atomic claim with brand+denomination
      const { data: claimedCard, error: claimError } = await serviceClient
        .rpc('claim_card_atomic', {
          p_brand_id: condition.brand_id,
          p_card_value: condition.card_value,
          p_client_id: campaign.client_id,
          p_recipient_id: recipientId,
          p_campaign_id: campaignId,
          p_condition_id: condition.id,
          p_agent_id: user.id,
          p_source: 'call_center'
        });

      if (claimError) {
        console.error('Failed to claim gift card:', claimError);
        
        // Check if already assigned
        if (claimError.message?.includes('ALREADY_ASSIGNED')) {
          console.log('Card already assigned for this condition');
          // Get existing card
          const { data: existing } = await serviceClient
            .rpc('get_recipient_gift_card_for_condition', {
              p_recipient_id: recipientId,
              p_condition_id: condition.id
            });

          if (existing && existing.length > 0) {
            const existingCard = existing[0];
            giftCardData = {
              id: existingCard.gift_card_id,
              code: existingCard.card_code,
              value: existingCard.card_value,
              provider: existingCard.provider || 'Gift Card',
              deliveryStatus: existingCard.delivery_status || 'pending',
              alreadyAssigned: true
            };
          }
        } else if (claimError.message?.includes('NO_CARDS_AVAILABLE')) {
          throw new Error('No gift cards available for this condition');
        } else {
          throw claimError;
        }
      } else if (claimedCard && claimedCard.length > 0) {
        const card = claimedCard[0];
        giftCardData = {
          id: card.card_id,
          code: card.card_code,
          value: card.card_value_amount,
          provider: card.provider,
          brand_name: card.brand_name,
          deliveryStatus: 'pending',
          alreadyAssigned: card.already_assigned
        };

        // Update delivery status in recipient_gift_cards if not already assigned
        if (!card.already_assigned) {
          // Get recipient phone for SMS delivery
          const { data: recipient } = await supabaseClient
            .from('recipients')
            .select('phone, email')
            .eq('id', recipientId)
            .single();

          if (recipient?.phone || recipient?.email) {
            const deliveryMethod = recipient.phone ? 'sms' : 'email';
            const deliveryAddress = recipient.phone || recipient.email;

            // Update delivery info
            await serviceClient
              .rpc('update_gift_card_delivery_status', {
                p_recipient_id: recipientId,
                p_condition_id: condition.id,
                p_delivery_status: 'pending',
                p_delivery_method: deliveryMethod,
                p_delivery_address: deliveryAddress
              });

            // Optionally trigger SMS/email delivery here
            if (deliveryMethod === 'sms' && recipient.phone) {
              const smsMessage = condition.sms_template || 
                `Congratulations! You've earned a $${giftCardData.value} ${giftCardData.brand_name} gift card. Code: ${giftCardData.code}`;

              const { error: smsError } = await serviceClient.functions.invoke('send-gift-card-sms', {
                body: {
                  recipientPhone: recipient.phone,
                  giftCardCode: giftCardData.code,
                  giftCardValue: giftCardData.value,
                  brandName: giftCardData.brand_name,
                  customMessage: condition.sms_template,
                }
              });

              if (smsError) {
                console.error('Failed to send SMS:', smsError);
              } else {
                giftCardData.deliveryStatus = 'sent';
                
                // Update to 'sent' status
                await serviceClient
                  .rpc('update_gift_card_delivery_status', {
                    p_recipient_id: recipientId,
                    p_condition_id: condition.id,
                    p_delivery_status: 'sent'
                  });
              }
            }
          }
        }
      }
    } else if (condition.gift_card_pool_id) {
      // Legacy support: condition still has pool_id but no brand_id
      console.warn('Legacy pool_id detected, migrating to brand+denomination');
      
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get brand and value from pool
      const { data: pool } = await serviceClient
        .from('gift_card_pools')
        .select('brand_id, card_value, client_id')
        .eq('id', condition.gift_card_pool_id)
        .single();

      if (pool?.brand_id && pool.card_value) {
        // Use atomic claim with extracted values
        const { data: claimedCard } = await serviceClient
          .rpc('claim_card_atomic', {
            p_brand_id: pool.brand_id,
            p_card_value: pool.card_value,
            p_client_id: pool.client_id,
            p_recipient_id: recipientId,
            p_campaign_id: campaignId,
            p_condition_id: condition.id,
            p_agent_id: user.id,
            p_source: 'call_center'
          });

        if (claimedCard && claimedCard.length > 0) {
          const card = claimedCard[0];
          giftCardData = {
            id: card.card_id,
            code: card.card_code,
            value: card.card_value_amount,
            provider: card.provider,
            brand_name: card.brand_name,
            deliveryStatus: 'pending'
          };
        }
      }
    }

    // Record the condition as met
    const { error: insertError } = await supabaseClient
      .from('call_conditions_met')
      .insert({
        call_session_id: callSessionId,
        campaign_id: campaignId,
        recipient_id: recipientId,
        condition_number: conditionNumber,
        met_by_agent_id: user.id,
        notes,
        gift_card_id: giftCardData?.id || null,
        delivery_status: giftCardData?.deliveryStatus || null,
      });

    if (insertError) throw insertError;

    // Log event
    await supabaseClient
      .from('events')
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: 'condition_completed',
        source: 'agent_manual',
        event_data_json: {
          condition_number: conditionNumber,
          call_session_id: callSessionId,
          agent_id: user.id,
          notes,
        },
      });

    console.log(`Condition ${conditionNumber} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        giftCard: giftCardData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error completing condition:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formId, data } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get form config with campaign linkage
    const { data: form, error: formError } = await supabase
      .from('ace_forms')
      .select(`
        *,
        clients(id),
        campaigns(
          id,
          name,
          rewards_enabled,
          reward_pool_id,
          reward_condition
        )
      `)
      .eq('id', formId)
      .single();

    if (formError) {
      console.error('Form error:', formError);
      throw formError;
    }

    console.log('[FORM-SUBMIT] Form loaded, campaign linked:', !!form.campaigns);

    // Extract email from form data for contact enrichment
    const email = data.email?.toLowerCase().trim();
    let contactId: string | null = null;

    // Phase 1: Contact Enrichment - Find or create contact
    if (email && form.clients?.id) {
      try {
        // Try to find existing contact
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', email)
          .eq('client_id', form.clients.id)
          .single();

        if (existingContact) {
          // Update existing contact with new data
          const updateData: any = {
            last_interaction_date: new Date().toISOString(),
          };
          
          if (data.first_name) updateData.first_name = data.first_name;
          if (data.last_name) updateData.last_name = data.last_name;
          if (data.phone) updateData.phone = data.phone;
          if (data.company) updateData.company = data.company;

          const { error: updateError } = await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', existingContact.id);

          if (updateError) {
            console.error('Contact enrichment update failed:', updateError);
            // Continue even if update fails
          }

          contactId = existingContact.id;
          console.log('Updated existing contact:', contactId);
        } else {
          // Create new contact
          const { data: newContact, error: createError } = await supabase
            .from('contacts')
            .insert({
              client_id: form.clients.id,
              email: email,
              first_name: data.first_name || null,
              last_name: data.last_name || null,
              phone: data.phone || null,
              company: data.company || null,
              source: 'ace_form',
              lifecycle_stage: 'lead',
              last_interaction_date: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Failed to create contact:', createError);
          } else if (newContact) {
            contactId = newContact.id;
            console.log('Created new contact:', contactId);
          }
        }
      } catch (contactError) {
        console.error('Contact enrichment error:', contactError);
        // Continue even if contact enrichment fails
      }
    }

    // Check if gift card code is provided - find the gift-card-code field dynamically
    const giftCardField = form.form_config.fields.find((f: any) => f.type === 'gift-card-code');
    const giftCardCode = giftCardField ? data[giftCardField.id] : null;
    
    // NEW: Validate code belongs to campaign if form is campaign-linked
    let recipientId: string | null = null;
    if (form.campaigns && form.campaign_id) {
      if (!giftCardCode) {
        return new Response(
          JSON.stringify({ success: false, error: 'Gift card code is required for this campaign' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Validate code belongs to this campaign
      const { data: recipient, error: recipientError } = await supabase
        .from('recipients')
        .select('id, campaign_id, gift_card_claimed')
        .eq('redemption_code', giftCardCode.trim().toUpperCase())
        .eq('campaign_id', form.campaign_id)
        .single();

      if (recipientError || !recipient) {
        console.error('[FORM-SUBMIT] Invalid code for campaign:', recipientError);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid redemption code for this campaign' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      recipientId = recipient.id;

      // Check for duplicate submission
      const { data: existingSubmission } = await supabase
        .from('ace_form_submissions')
        .select('id')
        .eq('form_id', formId)
        .eq('recipient_id', recipient.id)
        .single();

      if (existingSubmission) {
        return new Response(
          JSON.stringify({ success: false, error: 'You have already submitted this form' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('[FORM-SUBMIT] Valid recipient found:', recipientId);
    } else if (!giftCardCode) {
      console.error('No gift card code provided. Field ID:', giftCardField?.id, 'Data keys:', Object.keys(data));
      return new Response(
        JSON.stringify({ success: false, error: 'Gift card code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // TEST CODE: Only allow test code in development environment
    const normalizedCode = giftCardCode.replace(/[\s-]/g, '').toUpperCase();
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' || Deno.env.get('SUPABASE_URL')?.includes('localhost');
    
    if (isDevelopment && normalizedCode === '12345678ABCD') {
      console.log('[DEV] Test code used - returning mock Jimmy Johns gift card');
      
      // Create mock submission record
      await supabase
        .from('ace_form_submissions')
        .insert({
          form_id: formId,
          contact_id: contactId,
          submission_data: data,
          ip_address: req.headers.get('x-forwarded-for') || 'test',
          user_agent: req.headers.get('user-agent') || 'test',
        });

      // Increment form stats
      await supabase.rpc('increment_form_stat', {
        p_form_id: formId,
        p_stat_name: 'total_submissions'
      });

      return new Response(
        JSON.stringify({
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
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NEW: Check if should provision gift cards (campaign-linked forms with conditions)
    let provisionedGiftCards: any[] = [];
    if (form.campaigns && recipientId && form.campaign_id) {
      console.log('[FORM-SUBMIT] Checking for gift card conditions for recipient:', recipientId);
      
      // Get campaign conditions with gift card rewards
      const { data: conditions, error: conditionsError } = await supabase
        .from('campaign_conditions')
        .select('id, condition_name, brand_id, card_value, gift_card_pool_id, trigger_event')
        .eq('campaign_id', form.campaign_id)
        .eq('trigger_event', 'form_submission')
        .not('brand_id', 'is', null);

      if (conditionsError) {
        console.error('[FORM-SUBMIT] Error fetching conditions:', conditionsError);
      } else if (conditions && conditions.length > 0) {
        console.log(`[FORM-SUBMIT] Found ${conditions.length} gift card condition(s)`);

        // Get client_id for pool selection
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('client_id')
          .eq('id', form.campaign_id)
          .single();

        if (!campaign?.client_id) {
          console.error('[FORM-SUBMIT] Could not determine campaign client');
        } else {
          // Process each condition
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
                console.error(`[FORM-SUBMIT] No brand/value for condition ${condition.id}`);
                continue;
              }

              console.log(`[FORM-SUBMIT] Claiming card for condition: ${condition.condition_name}`);

              const { data: claimedCard, error: claimError } = await supabase
                .rpc('claim_card_atomic', {
                  p_brand_id: brandId,
                  p_card_value: cardValue,
                  p_client_id: campaign.client_id,
                  p_recipient_id: recipientId,
                  p_campaign_id: form.campaign_id,
                  p_condition_id: condition.id,
                  p_agent_id: null,
                  p_source: 'form_submission'
                });

              if (claimError) {
                console.error(`[FORM-SUBMIT] Failed to claim card for condition ${condition.id}:`, claimError);
                
                // If card already assigned, retrieve existing
                if (claimError.message?.includes('ALREADY_ASSIGNED')) {
                  console.log(`[FORM-SUBMIT] Card already assigned for condition ${condition.id}, retrieving...`);
                  const { data: existingCard } = await supabase
                    .rpc('get_recipient_gift_card_for_condition', {
                      p_recipient_id: recipientId,
                      p_condition_id: condition.id
                    });

                  if (existingCard && existingCard.length > 0) {
                    provisionedGiftCards.push(existingCard[0]);
                  }
                } else if (claimError.message?.includes('NO_CARDS_AVAILABLE')) {
                  console.log(`[FORM-SUBMIT] No cards available for condition ${condition.id}`);
                }
              } else if (claimedCard && claimedCard.length > 0) {
                const card = claimedCard[0];
                console.log(`[FORM-SUBMIT] Card claimed: ${card.card_id}, already_assigned: ${card.already_assigned}`);

                // Get full card details with brand info
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

                if (fullCard) {
                  provisionedGiftCards.push(fullCard);
                }

                // Update recipient status if first card
                if (provisionedGiftCards.length === 1) {
                  await supabase
                    .from('recipients')
                    .update({
                      gift_card_claimed: true,
                      gift_card_claimed_at: new Date().toISOString(),
                      gift_card_assigned_id: card.card_id,
                      approval_status: 'redeemed'
                    })
                    .eq('id', recipientId);
                }
              }
            } catch (conditionError) {
              console.error(`[FORM-SUBMIT] Error processing condition ${condition.id}:`, conditionError);
              // Continue with other conditions
            }
          }
        }
      }
    }

    // Save submission
    const { data: submission, error: submissionError } = await supabase
      .from('ace_form_submissions')
      .insert({
        form_id: formId,
        recipient_id: recipientId,
        contact_id: contactId,
        gift_card_id: provisionedGiftCards.length > 0 ? provisionedGiftCards[0].id : null,
        submission_data: data,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
      })
      .select()
      .single();

    if (submissionError) {
      console.error('[FORM-SUBMIT] Submission error:', submissionError);
      throw submissionError;
    }

    console.log('[FORM-SUBMIT] Submission saved:', submission.id);

    // Increment form stats
    await supabase.rpc('increment_form_stat', {
      p_form_id: formId,
      p_stat_name: 'total_submissions'
    });

    // If gift cards were provisioned, return them
    if (provisionedGiftCards.length > 0) {
      const cards = provisionedGiftCards.map(card => ({
        card_code: card.card_code,
        card_number: card.card_number,
        card_value: card.gift_card_pools?.card_value || card.card_value,
        provider: card.gift_card_pools?.provider,
        brand_name: card.gift_card_pools?.gift_card_brands?.brand_name,
        brand_logo: card.gift_card_pools?.gift_card_brands?.logo_url,
        brand_color: card.gift_card_pools?.gift_card_brands?.brand_color,
        store_url: card.gift_card_pools?.gift_card_brands?.store_url,
        redemption_instructions: card.gift_card_pools?.gift_card_brands?.redemption_instructions,
        usage_restrictions: card.gift_card_pools?.gift_card_brands?.usage_restrictions || [],
        expiration_date: card.expiration_date
      }));

      return new Response(
        JSON.stringify({
          success: true,
          submission_id: submission.id,
          gift_card_provisioned: true,
          giftCard: cards[0], // Primary card for backward compatibility
          giftCards: cards // All cards for multi-condition support
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No gift card provisioned, return success
    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission.id,
        gift_card_provisioned: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

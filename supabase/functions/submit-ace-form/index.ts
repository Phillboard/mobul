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

          await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', existingContact.id);

          contactId = existingContact.id;
          console.log('Updated existing contact:', contactId);
        } else {
          // Create new contact
          const { data: newContact } = await supabase
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

          if (newContact) {
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

    // TEST CODE: Always allow 1234-5678-abcd for testing (normalize by removing dashes/spaces)
    const normalizedCode = giftCardCode.replace(/[\s-]/g, '').toUpperCase();
    if (normalizedCode === '12345678ABCD') {
      console.log('Test code used - returning mock Jimmy Johns gift card');
      
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

    // NEW: Check if should provision gift card (campaign-linked forms with form_submission condition)
    let provisionedGiftCard = null;
    if (form.campaigns && recipientId && form.campaigns.rewards_enabled && form.campaigns.reward_condition === 'form_submission') {
      console.log('[FORM-SUBMIT] Provisioning gift card for recipient:', recipientId);
      
      try {
        const { data: claimedCard, error: claimError } = await supabase
          .rpc('claim_card_atomic', {
            p_pool_id: form.campaigns.reward_pool_id,
            p_recipient_id: recipientId,
            p_campaign_id: form.campaign_id,
            p_agent_id: null // Form submission, no agent
          });

        if (claimError) {
          console.error('[FORM-SUBMIT] Failed to claim card:', claimError);
          
          // If pool empty, notify admin but don't fail submission
          if (claimError.message?.includes('NO_CARDS_AVAILABLE')) {
            await supabase.rpc('notify_pool_empty', {
              p_pool_id: form.campaigns.reward_pool_id,
              p_campaign_id: form.campaign_id,
              p_recipient_id: recipientId
            });
            console.log('[FORM-SUBMIT] Pool empty, admin notified');
          }
        } else if (claimedCard && claimedCard.length > 0) {
          provisionedGiftCard = claimedCard[0];
          console.log('[FORM-SUBMIT] Gift card provisioned:', provisionedGiftCard.card_id);

          // Update recipient to mark gift card as claimed
          await supabase
            .from('recipients')
            .update({
              gift_card_claimed: true,
              gift_card_claimed_at: new Date().toISOString(),
              gift_card_assigned_id: provisionedGiftCard.card_id
            })
            .eq('id', recipientId);

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
            .eq('id', provisionedGiftCard.card_id)
            .single();

          if (fullCard) {
            provisionedGiftCard = fullCard;
          }
        }
      } catch (provisionError) {
        console.error('[FORM-SUBMIT] Provision error:', provisionError);
        // Continue with submission even if provisioning fails
      }
    }

    // Save submission
    const { data: submission, error: submissionError } = await supabase
      .from('ace_form_submissions')
      .insert({
        form_id: formId,
        recipient_id: recipientId,
        contact_id: contactId,
        gift_card_id: provisionedGiftCard?.id || null,
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

    // If gift card was provisioned, return it
    if (provisionedGiftCard) {
      return new Response(
        JSON.stringify({
          success: true,
          submission_id: submission.id,
          gift_card_provisioned: true,
          giftCard: {
            card_code: provisionedGiftCard.card_code,
            card_number: provisionedGiftCard.card_number,
            card_value: provisionedGiftCard.gift_card_pools?.card_value || provisionedGiftCard.card_value,
            provider: provisionedGiftCard.gift_card_pools?.provider,
            brand_name: provisionedGiftCard.gift_card_pools?.gift_card_brands?.brand_name,
            brand_logo: provisionedGiftCard.gift_card_pools?.gift_card_brands?.logo_url,
            brand_color: provisionedGiftCard.gift_card_pools?.gift_card_brands?.brand_color,
            store_url: provisionedGiftCard.gift_card_pools?.gift_card_brands?.store_url,
            redemption_instructions: provisionedGiftCard.gift_card_pools?.gift_card_brands?.redemption_instructions,
            usage_restrictions: provisionedGiftCard.gift_card_pools?.gift_card_brands?.usage_restrictions || [],
            expiration_date: provisionedGiftCard.expiration_date
          }
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
        submissionData: data,
        userEmail: email,
        giftCardDetails: {
          card_code: giftCard.card_code,
          card_value: giftCard.gift_card_pools.card_value,
          brand_name: brand?.brand_name || giftCard.gift_card_pools.provider,
          redemption_instructions: brand?.redemption_instructions,
        },
      },
    }).catch(err => console.error('Failed to send notification:', err));

    console.log('Form submission completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        giftCard: {
          card_code: giftCard.card_code,
          card_number: giftCard.card_number,
          card_value: giftCard.gift_card_pools.card_value,
          provider: giftCard.gift_card_pools.provider,
          brand_name: brand?.brand_name || giftCard.gift_card_pools.provider,
          brand_logo: brand?.logo_url,
          brand_color: brand?.brand_color || '#6366f1',
          store_url: brand?.store_url || brand?.balance_check_url,
          expiration_date: giftCard.expiration_date,
          usage_restrictions: brand?.usage_restrictions || [],
          redemption_instructions: brand?.redemption_instructions,
        }
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

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

    // Get form config
    const { data: form, error: formError } = await supabase
      .from('ace_forms')
      .select('*, clients(id)')
      .eq('id', formId)
      .single();

    if (formError) {
      console.error('Form error:', formError);
      throw formError;
    }

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
    
    if (!giftCardCode) {
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

    // Validate gift card
    const { data: giftCard, error: cardError } = await supabase
      .from('gift_cards')
      .select(`
        *,
        gift_card_pools!inner(
          card_value,
          provider,
          brand_id,
          client_id
        )
      `)
      .eq('card_code', giftCardCode.toUpperCase())
      .eq('status', 'available')
      .single();

    if (cardError || !giftCard) {
      console.error('Gift card error:', cardError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or already claimed gift card code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get brand info
    const { data: brand } = await supabase
      .from('gift_card_brands')
      .select('*')
      .eq('id', giftCard.gift_card_pools.brand_id)
      .single();

    // Find recipient if this card was assigned to someone
    let recipientId: string | null = null;
    const { data: recipient } = await supabase
      .from('recipients')
      .select('id')
      .eq('gift_card_id', giftCard.id)
      .single();

    if (recipient) {
      recipientId = recipient.id;
      
      // Update recipient with contact info if we have it
      if (contactId) {
        await supabase
          .from('recipients')
          .update({
            email: email,
            first_name: data.first_name || null,
            last_name: data.last_name || null,
            phone: data.phone || null,
          })
          .eq('id', recipient.id);
        
        console.log('Updated recipient with contact data');
      }
    }

    // Mark card as claimed
    await supabase
      .from('gift_cards')
      .update({ 
        status: 'claimed', 
        claimed_at: new Date().toISOString(),
        claimed_by_email: email || null,
      })
      .eq('id', giftCard.id);

    // Save submission with contact and enrichment data
    await supabase
      .from('ace_form_submissions')
      .insert({
        form_id: formId,
        gift_card_id: giftCard.id,
        recipient_id: recipientId,
        contact_id: contactId,
        submission_data: data,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        enrichment_status: contactId ? 'completed' : 'no_email',
      });

    // Update form stats using the new RPC function
    await supabase.rpc('increment_form_stat', {
      form_id: formId,
      stat_name: 'submissions'
    });

    // Send notifications (async, don't block response)
    supabase.functions.invoke('send-form-notification', {
      body: {
        type: 'user_confirmation',
        formId,
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

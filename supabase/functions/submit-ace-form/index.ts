/**
 * ACE Form Submission Handler
 * 
 * This form DOES NOT provision gift cards.
 * It only looks up and displays cards that were already assigned by the call center.
 * 
 * Flow:
 * 1. Call center agent enters code → Provisions gift card → Assigns to recipient
 * 2. Customer enters code on this form → Form looks up their existing card → Displays it
 */

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

  const requestId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    // =====================================================
    // STEP 1: PARSE REQUEST
    // =====================================================
    const { formId, data } = await req.json();
    
    console.log('╔' + '═'.repeat(60) + '╗');
    console.log(`║ [ACE-FORM] Request ID: ${requestId}`);
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log(`║   formId: ${formId || 'MISSING'}`);
    console.log(`║   dataKeys: ${Object.keys(data || {}).join(', ')}`);
    console.log('╚' + '═'.repeat(60) + '╝');

    if (!formId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Form ID is required', requestId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // =====================================================
    // STEP 2: LOAD FORM CONFIG
    // =====================================================
    const { data: form, error: formError } = await supabase
      .from('ace_forms')
      .select('id, name, form_config')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      console.error('[ACE-FORM] Form not found:', formError);
      return new Response(
        JSON.stringify({ success: false, error: 'Form not found', requestId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`[STEP 2] ✓ Form loaded: ${form.name}`);

    // =====================================================
    // STEP 3: EXTRACT REDEMPTION CODE
    // =====================================================
    // Find the gift card code field dynamically
    const giftCardField = form.form_config?.fields?.find((f: any) => 
      f.type === 'gift-card-code' || f.id === 'gift_card_code' || f.id === 'code'
    );
    
    // Try multiple field names for the code
    const rawCode = giftCardField ? data[giftCardField.id] : 
                    data.gift_card_code || data.code || data.redemption_code || data.giftCardCode;
    
    // IMPORTANT: Just uppercase - DO NOT remove dashes!
    // Codes are stored with dashes (e.g., "AB6-1061") - call center does it this way
    const code = rawCode ? rawCode.toUpperCase() : null;

    console.log(`[STEP 3] Code: "${code}"`);

    if (!code) {
      console.error('[ACE-FORM] No redemption code provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Please enter your gift card code',
          requestId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // =====================================================
    // STEP 4: FIND RECIPIENT BY REDEMPTION CODE
    // =====================================================
    // Same query as call center - just uppercase, keep dashes
    console.log(`[STEP 4] Looking up recipient by code: ${code}`);

    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id, first_name, last_name, email, redemption_code')
      .eq('redemption_code', code)
      .maybeSingle();

    if (recipientError) {
      console.error('[ACE-FORM] Recipient lookup error:', recipientError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to verify code. Please try again.',
          requestId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!recipient) {
      console.log(`[STEP 4] ✗ No recipient found for code: ${code}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid redemption code. Please check your code and try again.',
          requestId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[STEP 4] ✓ Recipient found: ${recipient.first_name} ${recipient.last_name} (${recipient.id})`);

    // =====================================================
    // STEP 5: LOOKUP ASSIGNED GIFT CARD
    // =====================================================
    const { data: assignedCard, error: cardError } = await supabase
      .from('gift_card_inventory')
      .select(`
        id,
        card_code,
        card_number,
        denomination,
        expiration_date,
        status,
        gift_card_brands (
          id,
          brand_name,
          logo_url,
          brand_color,
          balance_check_url,
          redemption_instructions
        )
      `)
      .eq('assigned_to_recipient_id', recipient.id)
      .eq('status', 'assigned')
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cardError) {
      console.error('[ACE-FORM] Card lookup error:', cardError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to retrieve your gift card. Please try again.',
          requestId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!assignedCard) {
      console.log(`[STEP 5] ✗ No assigned card found for recipient: ${recipient.id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Your gift card is not yet available. Please contact support or try again later.',
          requestId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[STEP 5] ✓ Found assigned card: ${assignedCard.id}`);
    console.log(`[STEP 5]   Brand: ${assignedCard.gift_card_brands?.brand_name}`);
    console.log(`[STEP 5]   Value: $${assignedCard.denomination}`);

    // =====================================================
    // STEP 6: RETURN CARD DETAILS
    // =====================================================
    const brand = assignedCard.gift_card_brands;

    console.log('╔' + '═'.repeat(60) + '╗');
    console.log(`║ [ACE-FORM] ✓ SUCCESS - Returning card to customer`);
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log(`║   Recipient: ${recipient.first_name} ${recipient.last_name}`);
    console.log(`║   Card: ${brand?.brand_name || 'Gift Card'} $${assignedCard.denomination}`);
    console.log('╚' + '═'.repeat(60) + '╝');

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        gift_card_provisioned: true, // For backward compatibility with UI
        giftCard: {
          card_code: assignedCard.card_code,
          card_number: assignedCard.card_number,
          card_value: assignedCard.denomination,
          brand_name: brand?.brand_name || 'Gift Card',
          brand_logo: brand?.logo_url || null,
          brand_color: brand?.brand_color || null,
          balance_check_url: brand?.balance_check_url || null,
          redemption_instructions: brand?.redemption_instructions || null,
          expiration_date: assignedCard.expiration_date,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('╔' + '═'.repeat(60) + '╗');
    console.error(`║ [ACE-FORM] ✗ UNEXPECTED ERROR`);
    console.error('╠' + '═'.repeat(60) + '╣');
    console.error(`║   Error: ${errorMessage}`);
    console.error('╚' + '═'.repeat(60) + '╝');

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred. Please try again.',
        requestId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

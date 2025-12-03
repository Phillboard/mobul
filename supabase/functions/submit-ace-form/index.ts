/**
 * ACE Form Submission Handler
 * 
 * This form DOES NOT provision gift cards.
 * It only looks up and displays cards that were already assigned by the call center.
 * 
 * Flow:
 * 1. Call center agent enters code → Provisions gift card → Assigns to recipient
 * 2. Customer enters code on this form → Form looks up their existing card → Displays it
 * 
 * Uses a SECURITY DEFINER database function to bypass RLS and ensure consistent
 * results regardless of calling context.
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
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
    const giftCardField = form.form_config?.fields?.find((f: any) => 
      f.type === 'gift-card-code' || f.id === 'gift_card_code' || f.id === 'code'
    );
    
    const rawCode = giftCardField ? data[giftCardField.id] : 
                    data.gift_card_code || data.code || data.redemption_code || data.giftCardCode;
    
    // Just uppercase - keep dashes (codes stored as "AB6-1061")
    const code = rawCode ? rawCode.toUpperCase() : null;

    console.log(`[STEP 3] Code: "${code}"`);

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter your gift card code', requestId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // =====================================================
    // STEP 4: LOOKUP CARD VIA DATABASE FUNCTION
    // =====================================================
    // This uses a SECURITY DEFINER function that:
    // 1. Joins recipients → gift_card_inventory → gift_card_brands
    // 2. Finds cards where the recipient has the matching redemption code
    // 3. Bypasses RLS to avoid ID mismatch issues
    console.log(`[STEP 4] Looking up card via RPC for code: ${code}`);

    const { data: cardData, error: rpcError } = await supabase
      .rpc('lookup_gift_card_by_redemption_code', { p_code: code });

    if (rpcError) {
      console.error('[ACE-FORM] RPC error:', rpcError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to retrieve your gift card. Please try again.', 
          requestId,
          debug: rpcError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!cardData || cardData.length === 0) {
      console.log(`[STEP 4] ✗ No card found for code: ${code}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Your gift card is not yet available. Please contact support or try again later.', 
          requestId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // =====================================================
    // STEP 5: SUCCESS - RETURN CARD DETAILS
    // =====================================================
    const card = cardData[0];
    
    console.log('╔' + '═'.repeat(60) + '╗');
    console.log(`║ [ACE-FORM] ✓ SUCCESS`);
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log(`║   ${card.recipient_first_name} ${card.recipient_last_name}`);
    console.log(`║   ${card.brand_name || 'Gift Card'} $${card.denomination}`);
    console.log(`║   Card: ${card.card_code}`);
    console.log('╚' + '═'.repeat(60) + '╝');

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        gift_card_provisioned: true,
        giftCard: {
          card_code: card.card_code,
          card_number: card.card_number,
          card_value: Number(card.denomination),
          provider: card.brand_name || 'Gift Card', // Required by GiftCardRedemption type
          brand_name: card.brand_name || 'Gift Card',
          brand_logo: card.brand_logo_url || null,
          brand_color: card.brand_color || null,
          store_url: card.balance_check_url || null,
          redemption_instructions: card.redemption_instructions || null,
          expiration_date: card.expiration_date,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ACE-FORM] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.', requestId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

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
      .select('*')
      .eq('id', formId)
      .single();

    if (formError) throw formError;

    // Check if gift card code is provided
    const giftCardCode = data.code;
    if (!giftCardCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Gift card code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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
          brand_id
        )
      `)
      .eq('card_code', giftCardCode.toUpperCase())
      .eq('status', 'available')
      .single();

    if (cardError || !giftCard) {
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

    // Mark card as claimed
    await supabase
      .from('gift_cards')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', giftCard.id);

    // Save submission
    await supabase
      .from('ace_form_submissions')
      .insert({
        form_id: formId,
        gift_card_id: giftCard.id,
        submission_data: data,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
      });

    // Update form stats
    await supabase.rpc('increment', {
      table_name: 'ace_forms',
      row_id: formId,
      column_name: 'total_submissions'
    });

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

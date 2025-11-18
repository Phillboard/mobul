import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for failed SMS deliveries to retry...');

    // Find failed SMS deliveries with retry count < 3
    const { data: failedDeliveries, error: fetchError } = await supabaseClient
      .from('gift_card_deliveries')
      .select(`
        *,
        gift_cards!inner(card_code, card_number, gift_card_pools!inner(card_value)),
        recipients!inner(phone, first_name, last_name)
      `)
      .eq('sms_status', 'failed')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching failed deliveries:', fetchError);
      throw fetchError;
    }

    if (!failedDeliveries || failedDeliveries.length === 0) {
      console.log('No failed deliveries to retry');
      return new Response(
        JSON.stringify({ success: true, message: 'No deliveries to retry' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${failedDeliveries.length} failed deliveries to retry`);

    const retryResults = [];

    for (const delivery of failedDeliveries) {
      try {
        console.log(`Retrying delivery ${delivery.id}...`);

        // Increment retry count
        await supabaseClient
          .from('gift_card_deliveries')
          .update({
            retry_count: delivery.retry_count + 1,
            sms_status: 'pending',
          })
          .eq('id', delivery.id);

        // Retry SMS send
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gift-card-sms`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              deliveryId: delivery.id,
              giftCardCode: delivery.gift_cards.card_code,
              giftCardValue: delivery.gift_cards.gift_card_pools.card_value,
              recipientPhone: delivery.recipients.phone,
              recipientName: delivery.recipients.first_name,
              customMessage: delivery.sms_message,
            }),
          }
        );

        const result = await response.json();
        
        retryResults.push({
          deliveryId: delivery.id,
          success: response.ok,
          result,
        });

        console.log(`Retry result for ${delivery.id}:`, result);
      } catch (error) {
        console.error(`Failed to retry delivery ${delivery.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        retryResults.push({
          deliveryId: delivery.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        retriedCount: failedDeliveries.length,
        results: retryResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in retry-failed-sms:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

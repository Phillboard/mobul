import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base provider interface
interface GiftCardProvider {
  provisionCard(amount: number, config: any): Promise<{
    cardCode: string;
    cardNumber?: string;
    expirationDate?: string;
    transactionId: string;
  }>;
}

// Tango Card provider
class TangoCardProvider implements GiftCardProvider {
  async provisionCard(amount: number, config: any) {
    const { username, password, platformName } = config;
    const auth = btoa(`${username}:${password}`);
    
    const response = await fetch('https://integration-api.tangocard.com/raas/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountIdentifier: platformName,
        amount: amount,
        utid: `UTID-${Date.now()}`,
        sendEmail: false
      })
    });

    if (!response.ok) {
      throw new Error(`Tango Card API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      cardCode: data.reward.credentials.redemptionUrl,
      cardNumber: data.reward.credentials.cardNumber,
      transactionId: data.referenceOrderID,
      expirationDate: undefined
    };
  }
}

// Giftbit provider
class GiftbitProvider implements GiftCardProvider {
  async provisionCard(amount: number, config: any) {
    const { apiKey } = config;
    
    const response = await fetch('https://api.giftbit.com/v2/gifts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gift: {
          price_in_cents: amount * 100,
          delivery_date: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Giftbit API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      cardCode: data.gift.code,
      transactionId: data.gift.id,
      expirationDate: undefined
    };
  }
}

// Rybbon provider
class RybbonProvider implements GiftCardProvider {
  async provisionCard(amount: number, config: any) {
    const { apiKey } = config;
    
    const response = await fetch('https://api.rybbon.net/v1/rewards', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'USD'
      })
    });

    if (!response.ok) {
      throw new Error(`Rybbon API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      cardCode: data.code,
      transactionId: data.id,
      expirationDate: data.expires_at
    };
  }
}

// Provider factory
function getProvider(providerName: string): GiftCardProvider {
  switch (providerName) {
    case 'tango_card':
      return new TangoCardProvider();
    case 'giftbit':
      return new GiftbitProvider();
    case 'rybbon':
      return new RybbonProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { poolId, recipientId, callSessionId } = await req.json();
    
    if (!poolId) {
      throw new Error("poolId is required");
    }

    console.log(`[PROVISION-API] Starting for pool: ${poolId}`);

    // Get pool configuration
    const { data: pool, error: poolError } = await supabaseClient
      .from('gift_card_pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (poolError || !pool) {
      throw new Error(`Pool not found: ${poolError?.message}`);
    }

    if (!pool.api_provider || !pool.api_config) {
      throw new Error('Pool does not have API provisioning configured');
    }

    console.log(`[PROVISION-API] Using provider: ${pool.api_provider}`);

    // Record purchase attempt
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('gift_card_api_purchases')
      .insert({
        pool_id: poolId,
        api_provider: pool.api_provider,
        quantity: 1,
        card_value: pool.card_value,
        total_cost_cents: pool.card_value * 100,
        status: 'pending'
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to record purchase: ${purchaseError.message}`);
    }

    try {
      // Provision card from API
      const provider = getProvider(pool.api_provider);
      const result = await provider.provisionCard(pool.card_value, pool.api_config);

      console.log(`[PROVISION-API] Card provisioned: ${result.transactionId}`);

      // Insert gift card into database
      const { data: giftCard, error: insertError } = await supabaseClient
        .from('gift_cards')
        .insert({
          pool_id: poolId,
          card_code: result.cardCode,
          card_number: result.cardNumber,
          expiration_date: result.expirationDate,
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          claimed_by_recipient_id: recipientId,
          claimed_by_call_session_id: callSessionId
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to insert card: ${insertError.message}`);
      }

      // Update pool statistics
      await supabaseClient
        .from('gift_card_pools')
        .update({
          total_cards: pool.total_cards + 1,
          claimed_cards: pool.claimed_cards + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', poolId);

      // Update purchase record
      await supabaseClient
        .from('gift_card_api_purchases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          api_transaction_id: result.transactionId,
          api_response: result
        })
        .eq('id', purchase.id);

      return new Response(JSON.stringify({
        success: true,
        card: {
          id: giftCard.id,
          cardCode: giftCard.card_code,
          cardNumber: giftCard.card_number,
          cardValue: pool.card_value,
          provider: pool.provider,
          provisionedViaApi: true
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (provisionError) {
      // Update purchase record with error
      await supabaseClient
        .from('gift_card_api_purchases')
        .update({
          status: 'failed',
          error_message: provisionError instanceof Error ? provisionError.message : 'Unknown error'
        })
        .eq('id', purchase.id);

      throw provisionError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PROVISION-API] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
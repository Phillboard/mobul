import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { code } = await req.json();

    // Input validation
    if (!code || typeof code !== "string") {
      return Response.json(
        { valid: false, message: "Invalid code format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize and validate code
    const sanitizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,50}$/.test(sanitizedCode)) {
      return Response.json(
        { valid: false, message: "Code must be 4-50 characters and contain only letters, numbers, and hyphens" },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Redeeming gift card code:", sanitizedCode);

    // Find the gift card
    const { data: giftCard, error: giftCardError } = await supabase
      .from("gift_cards")
      .select(`
        *,
        pool:gift_card_pools(
          card_value,
          provider,
          pool_name
        )
      `)
      .eq("card_code", sanitizedCode)
      .single();

    if (giftCardError || !giftCard) {
      console.log("Gift card not found:", giftCardError);
      return Response.json(
        { valid: false, message: "Invalid code. Please check and try again." },
        { status: 200, headers: corsHeaders }
      );
    }

    // Check if already claimed
    if (giftCard.status === "claimed" || giftCard.status === "redeemed") {
      return Response.json(
        { valid: false, message: "This code has already been claimed." },
        { status: 200, headers: corsHeaders }
      );
    }

    // Mark as claimed
    const { error: updateError } = await supabase
      .from("gift_cards")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
      })
      .eq("id", giftCard.id);

    if (updateError) {
      console.error("Error marking gift card as claimed:", updateError);
    }

    // Dispatch Zapier event
    try {
      const { data: pool } = await supabase
        .from('gift_card_pools')
        .select('client_id')
        .eq('id', giftCard.pool_id)
        .single();

      if (pool) {
        await supabase.functions.invoke('dispatch-zapier-event', {
          body: {
            event_type: 'gift_card.redeemed',
            client_id: pool.client_id,
            data: {
              gift_card_id: giftCard.id,
              card_code: giftCard.card_code,
              value: giftCard.pool?.card_value || 0,
              provider: giftCard.pool?.provider || 'Gift Card',
              redeemed_at: new Date().toISOString(),
            }
          }
        });
        console.log('Zapier event dispatched for gift card redemption');
      }
    } catch (zapierError) {
      console.error('Failed to dispatch Zapier event:', zapierError);
    }

    return Response.json(
      {
        valid: true,
        giftCard: {
          card_code: giftCard.card_code,
          card_number: giftCard.card_number,
          value: giftCard.pool?.card_value || 0,
          provider: giftCard.pool?.provider || "Gift Card",
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Redemption error:", error);
    return Response.json(
      { valid: false, message: "An error occurred. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
});

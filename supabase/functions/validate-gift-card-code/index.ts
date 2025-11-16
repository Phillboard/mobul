import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, campaignId } = await req.json();

    if (!code || !campaignId) {
      return Response.json(
        { valid: false, message: "Missing required parameters" },
        { headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Look up recipient by token (code)
    const { data: recipient, error: recipientError } = await supabase
      .from("recipients")
      .select("*, audience:audiences(client_id)")
      .eq("token", code)
      .single();

    if (recipientError || !recipient) {
      console.log("Recipient not found:", code);
      return Response.json(
        {
          valid: false,
          message: "Code not found. Please check and try again.",
        },
        { headers: corsHeaders }
      );
    }

    // 2. Check if campaign matches and belongs to same client
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, audience:audiences!inner(id, client_id)")
      .eq("id", campaignId)
      .eq("audiences.id", recipient.audience_id)
      .single();

    if (campaignError || !campaign) {
      console.log("Campaign not found or doesn't match:", campaignId);
      return Response.json(
        {
          valid: false,
          message: "This code is not valid for this campaign.",
        },
        { headers: corsHeaders }
      );
    }

    // 3. Check if gift card has been delivered to this recipient
    const { data: delivery, error: deliveryError } = await supabase
      .from("gift_card_deliveries")
      .select(
        `
        *,
        gift_card:gift_cards(
          *,
          pool:gift_card_pools(*)
        )
      `
      )
      .eq("recipient_id", recipient.id)
      .eq("campaign_id", campaignId)
      .in("delivery_status", ["sent", "delivered"])
      .maybeSingle();

    if (deliveryError) {
      console.error("Error fetching delivery:", deliveryError);
      return Response.json(
        {
          valid: false,
          message: "Error checking gift card status. Please try again.",
        },
        { headers: corsHeaders }
      );
    }

    if (!delivery) {
      console.log("No delivery found for recipient:", recipient.id);
      return Response.json(
        {
          valid: false,
          message:
            "No gift card has been approved for this code yet. Please contact support if you believe this is an error.",
        },
        { headers: corsHeaders }
      );
    }

    // 4. Check if already redeemed/viewed
    const { data: existingRedemption } = await supabase
      .from("gift_card_redemptions")
      .select("*")
      .eq("recipient_id", recipient.id)
      .eq("campaign_id", campaignId)
      .eq("redemption_status", "viewed")
      .maybeSingle();

    if (existingRedemption) {
      // Allow viewing again
      console.log("Redemption already exists, allowing re-view");
      return Response.json(
        {
          valid: true,
          alreadyViewed: true,
          redemptionToken: existingRedemption.id,
        },
        { headers: corsHeaders }
      );
    }

    // 5. Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from("gift_card_redemptions")
      .insert({
        campaign_id: campaignId,
        recipient_id: recipient.id,
        gift_card_delivery_id: delivery.id,
        code_entered: code,
        redemption_status: "pending",
        redemption_ip: req.headers.get("x-forwarded-for"),
        redemption_user_agent: req.headers.get("user-agent"),
      })
      .select()
      .single();

    if (redemptionError) {
      console.error("Error creating redemption:", redemptionError);
      return Response.json(
        {
          valid: false,
          message: "Error processing redemption. Please try again.",
        },
        { headers: corsHeaders }
      );
    }

    // 6. Log event
    await supabase.from("events").insert({
      campaign_id: campaignId,
      recipient_id: recipient.id,
      event_type: "gift_card_code_entered",
      source: "landing_page",
      event_data_json: { code, valid: true },
    });

    console.log("Code validated successfully:", code);
    return Response.json(
      {
        valid: true,
        redemptionToken: redemption.id,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in validate-gift-card-code:", error);
    return Response.json(
      { valid: false, message: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { ERROR_MESSAGES } from '../_shared/config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apply rate limiting: 5 attempts per IP per 5 minutes
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const tempSupabase = createClient(supabaseUrl, supabaseKey);
    
    const rateLimitResult = await checkRateLimit(
      tempSupabase,
      req,
      { maxRequests: 5, windowMs: 5 * 60 * 1000 },
      'provision-gift-card-call-center'
    );

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Get auth header to verify agent
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid user");
    }

    // Verify user has call_center or admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["call_center", "admin"])
      .single();

    if (roleError || !roleData) {
      throw new Error("Unauthorized: User does not have call_center or admin role");
    }

    console.log(`[PROVISION-CC] Agent ${user.id} (${roleData.role}) initiating redemption`);

    const { redemptionCode, agentNotes } = await req.json();
    
    if (!redemptionCode) {
      throw new Error("Redemption code is required");
    }

    // Use service role for data operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Look up recipient by redemption code
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from("recipients")
      .select(`
        *,
        audiences!inner(
          id,
          name,
          campaigns!inner(
            id,
            name,
            campaign_reward_configs(gift_card_pool_id)
          )
        )
      `)
      .eq("redemption_code", redemptionCode.trim().toUpperCase())
      .single();

    if (recipientError || !recipient) {
      console.error("[PROVISION-CC] Recipient not found:", recipientError);
      return new Response(JSON.stringify({ 
        error: "INVALID_CODE",
        message: ERROR_MESSAGES.INVALID_CODE
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    console.log(`[PROVISION-CC] Found recipient: ${recipient.id}, status: ${recipient.approval_status}`);

    // Check if already redeemed
    if (recipient.approval_status === "redeemed" && recipient.gift_card_assigned_id) {
      console.log("[PROVISION-CC] Code already redeemed, returning existing card");
      
      // Fetch existing gift card details
      const { data: existingCard, error: cardError } = await supabaseAdmin
        .from("gift_cards")
        .select(`
          *,
          gift_card_pools!inner(
            pool_name,
            card_value,
            provider,
            gift_card_brands(
              brand_name,
              logo_url,
              balance_check_url
            )
          )
        `)
        .eq("id", recipient.gift_card_assigned_id)
        .single();

      if (!cardError && existingCard) {
        return new Response(JSON.stringify({
          success: true,
          alreadyRedeemed: true,
          recipient: {
            id: recipient.id,
            firstName: recipient.first_name,
            lastName: recipient.last_name,
            phone: recipient.phone,
            email: recipient.email,
            status: recipient.approval_status,
          },
          giftCard: existingCard,
          redeemedAt: recipient.updated_at,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Validate recipient status
    if (recipient.approval_status === "rejected") {
      return new Response(JSON.stringify({ 
        error: "REJECTED",
        message: ERROR_MESSAGES.REJECTED
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (recipient.approval_status === "pending") {
      return new Response(JSON.stringify({
        error: "PENDING_APPROVAL",
        message: "This code needs approval first. Contact your supervisor." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the gift card pool from campaign reward configs
    const campaign = recipient.audiences.campaigns[0];
    if (!campaign || !campaign.campaign_reward_configs || campaign.campaign_reward_configs.length === 0) {
      throw new Error("No gift card pool configured for this campaign");
    }

    const poolId = campaign.campaign_reward_configs[0].gift_card_pool_id;
    if (!poolId) {
      throw new Error("No gift card pool assigned to this campaign");
    }

    console.log(`[PROVISION-CC] Claiming card from pool: ${poolId}`);

    // PRE-CHECK: Verify pool has inventory before claiming
    const { data: poolCheck, error: poolCheckError } = await supabaseAdmin
      .from('gift_card_pools')
      .select('available_cards, pool_name, low_stock_threshold')
      .eq('id', poolId)
      .single();

    if (poolCheckError) {
      console.error("[PROVISION-CC] Error checking pool:", poolCheckError);
      throw poolCheckError;
    }

    // Critical: Pool empty - alert immediately
    if (poolCheck.available_cards === 0) {
      console.error(`[PROVISION-CC] Pool ${poolCheck.pool_name} is EMPTY`);
      
      // Send critical alert (async, don't wait)
      supabaseAdmin.functions.invoke('send-inventory-alert', {
        body: {
          severity: 'critical',
          poolId,
          poolName: poolCheck.pool_name,
          availableCards: 0
        }
      }).catch(err => console.error('Failed to send alert:', err));
      
      return new Response(JSON.stringify({ 
        error: "POOL_EMPTY",
        message: ERROR_MESSAGES.POOL_EMPTY
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Warning: Low stock - alert but continue
    const lowStockThreshold = poolCheck.low_stock_threshold || 20;
    if (poolCheck.available_cards <= lowStockThreshold) {
      console.warn(`[PROVISION-CC] Pool ${poolCheck.pool_name} low: ${poolCheck.available_cards} cards`);
      
      // Send warning alert (async, don't block redemption)
      supabaseAdmin.functions.invoke('send-inventory-alert', {
        body: {
          severity: 'warning',
          poolId,
          poolName: poolCheck.pool_name,
          availableCards: poolCheck.available_cards
        }
      }).catch(err => console.error('Failed to send alert:', err));
    }

    // Claim a gift card
    const { data: claimData, error: claimError } = await supabaseAdmin.rpc('claim_available_card', {
      p_pool_id: poolId,
      p_recipient_id: recipient.id,
      p_call_session_id: null
    });

    if (claimError) {
      console.error("[PROVISION-CC] Claim error:", claimError);
      
      if (claimError.message?.includes('No available cards')) {
        return new Response(JSON.stringify({ 
          error: "POOL_EMPTY",
          message: ERROR_MESSAGES.POOL_EMPTY
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      throw claimError;
    }

    const claimedCard = claimData[0];
    console.log(`[PROVISION-CC] Claimed card: ${claimedCard.id}`);

    // Update recipient status to redeemed
    const { error: updateError } = await supabaseAdmin
      .from("recipients")
      .update({
        approval_status: "redeemed",
        gift_card_assigned_id: claimedCard.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);

    if (updateError) {
      console.error("[PROVISION-CC] Failed to update recipient:", updateError);
    }

    // Log the action in audit log
    await supabaseAdmin
      .from("recipient_audit_log")
      .insert({
        recipient_id: recipient.id,
        action: "redeemed_by_agent",
        user_id: user.id,
        notes: agentNotes || `Redeemed by call center agent`,
        metadata: { 
          gift_card_id: claimedCard.id,
          redemption_code: redemptionCode 
        }
      });

    // Fetch full gift card details
    const { data: giftCard, error: giftCardError } = await supabaseAdmin
      .from("gift_cards")
      .select(`
        *,
        gift_card_pools!inner(
          pool_name,
          card_value,
          provider,
          gift_card_brands(
            brand_name,
            logo_url,
            balance_check_url
          )
        )
      `)
      .eq("id", claimedCard.id)
      .single();

    if (giftCardError) {
      console.error("[PROVISION-CC] Error fetching gift card details:", giftCardError);
    }

    console.log(`[PROVISION-CC] Successfully provisioned card for recipient ${recipient.id}`);

    // Auto-send SMS if phone number is available (Phase 4: Automated Delivery)
    if (recipient.phone && giftCard) {
      try {
        console.log(`[PROVISION-CC] Auto-sending SMS to ${recipient.phone}`);
        const brand = giftCard.gift_card_pools?.gift_card_brands;
        const pool = giftCard.gift_card_pools;
        const value = pool?.card_value || 0;
        
        const smsMessage = `Your ${brand?.brand_name || pool?.provider || "Gift Card"} is ready!\n\nCode: ${giftCard.card_code}\n${giftCard.card_number ? `Card: ${giftCard.card_number}\n` : ""}Value: $${value}\n\nRedeem at the store`;
        
        // Create SMS delivery log entry
        const { data: smsLogEntry } = await supabaseAdmin
          .from('sms_delivery_log')
          .insert({
            recipient_id: recipient.id,
            gift_card_id: giftCard.id,
            campaign_id: campaign.id,
            phone_number: recipient.phone,
            message_body: smsMessage,
            delivery_status: 'pending',
            retry_count: 0
          })
          .select()
          .single();

        const { error: smsError } = await supabaseAdmin.functions.invoke("send-gift-card-sms", {
          body: {
            deliveryId: smsLogEntry?.id,
            phone: recipient.phone,
            message: smsMessage,
            recipientId: recipient.id,
            giftCardId: giftCard.id,
          },
        });

        if (smsError) {
          console.error("[PROVISION-CC] SMS auto-send failed:", smsError);
          // Update log to failed
          if (smsLogEntry) {
            await supabaseAdmin
              .from('sms_delivery_log')
              .update({ 
                delivery_status: 'failed',
                error_message: smsError.message 
              })
              .eq('id', smsLogEntry.id);
          }
        } else {
          console.log("[PROVISION-CC] SMS auto-sent successfully");
        }
      } catch (smsError) {
        console.error("[PROVISION-CC] SMS auto-send error:", smsError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      alreadyRedeemed: false,
      recipient: {
        id: recipient.id,
        firstName: recipient.first_name,
        lastName: recipient.last_name,
        phone: recipient.phone,
        email: recipient.email,
        status: "redeemed",
        audienceName: recipient.audiences.name,
        campaignName: campaign.name,
      },
      giftCard: giftCard || claimedCard,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[PROVISION-CC] Error:", errorMessage);
    return new Response(JSON.stringify({ 
      error: "INTERNAL_ERROR",
      message: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

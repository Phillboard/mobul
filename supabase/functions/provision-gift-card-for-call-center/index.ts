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

    const { redemptionCode, deliveryPhone, deliveryEmail, conditionNumber, conditionId, agentNotes } = await req.json();
    
    if (!redemptionCode) {
      throw new Error("Redemption code is required");
    }

    // Validate that at least one contact method is provided
    if (!deliveryPhone && !deliveryEmail) {
      throw new Error("Must provide phone number OR email address for gift card delivery");
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

    // VALIDATION: Check SMS opt-in status
    const smsOptInStatus = recipient.sms_opt_in_status;
    console.log(`[PROVISION-CC] SMS opt-in status: ${smsOptInStatus}`);

    // Block provisioning if recipient has not opted in (unless status is not_sent which means opt-in wasn't required)
    if (smsOptInStatus && smsOptInStatus !== 'opted_in' && smsOptInStatus !== 'not_sent') {
      if (smsOptInStatus === 'opted_out') {
        console.warn(`[PROVISION-CC] Recipient ${recipient.id} opted out, blocking provisioning`);
        return new Response(JSON.stringify({ 
          error: "OPT_OUT",
          message: "This customer has opted out of marketing messages and cannot receive a gift card."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      if (smsOptInStatus === 'pending') {
        console.warn(`[PROVISION-CC] Recipient ${recipient.id} opt-in pending, blocking provisioning`);
        return new Response(JSON.stringify({ 
          error: "OPT_IN_PENDING",
          message: "Customer has not yet confirmed opt-in. Please wait for them to reply YES to the opt-in SMS."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (smsOptInStatus === 'invalid_response') {
        console.warn(`[PROVISION-CC] Recipient ${recipient.id} invalid opt-in response`);
        return new Response(JSON.stringify({ 
          error: "OPT_IN_INVALID",
          message: "Customer did not respond correctly to opt-in. Ask them to reply YES to continue."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

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

    // Get campaign and check direct reward configuration
    const campaign = recipient.audiences.campaigns[0];
    if (!campaign) {
      throw new Error("No campaign found for this recipient");
    }

    console.log(`[PROVISION-CC] Campaign: ${campaign.id}, condition: ${conditionId}`);

    // NEW: Get condition details with brand_id and card_value
    let brandId: string | null = null;
    let cardValue: number | null = null;
    let conditionInfo: any = null;

    if (conditionId) {
      const { data: condition, error: conditionError } = await supabaseAdmin
        .from('campaign_conditions')
        .select('id, brand_id, card_value, gift_card_pool_id, condition_name')
        .eq('id', conditionId)
        .single();

      if (conditionError || !condition) {
        throw new Error("Invalid condition ID");
      }

      conditionInfo = condition;
      brandId = condition.brand_id;
      cardValue = condition.card_value;

      console.log(`[PROVISION-CC] Condition: ${condition.condition_name}, brand_id: ${brandId}, value: ${cardValue}`);

      // If condition doesn't have brand_id yet (legacy), try to get from pool
      if (!brandId && condition.gift_card_pool_id) {
        const { data: pool } = await supabaseAdmin
          .from('gift_card_pools')
          .select('brand_id, card_value')
          .eq('id', condition.gift_card_pool_id)
          .single();
        
        if (pool) {
          brandId = pool.brand_id;
          cardValue = pool.card_value;
          console.log(`[PROVISION-CC] Got brand/value from legacy pool: ${brandId}, $${cardValue}`);
        }
      }
    }

    // Get client_id for pool selection
    const { data: campaignClient } = await supabaseAdmin
      .from('campaigns')
      .select('client_id')
      .eq('id', campaign.id)
      .single();

    if (!campaignClient?.client_id) {
      throw new Error("Could not determine campaign client");
    }

    if (!brandId || !cardValue) {
      throw new Error("No gift card configured for this condition. Please contact support.");
    }

    console.log(`[PROVISION-CC] Claiming card: brand=${brandId}, value=$${cardValue}, client=${campaignClient.client_id}`);

    // NEW: Use atomic claiming function with brand+denomination
    let claimedCard;
    try {
      const { data: atomicResult, error: claimError } = await supabaseAdmin
        .rpc('claim_card_atomic', {
          p_brand_id: brandId,
          p_card_value: cardValue,
          p_client_id: campaignClient.client_id,
          p_recipient_id: recipient.id,
          p_campaign_id: campaign.id,
          p_condition_id: conditionId,
          p_agent_id: user.id,
          p_source: 'call_center'
        });

      if (claimError) {
        console.error("[PROVISION-CC] Atomic claim error:", claimError);
        
        // Check if it's a pool empty error
        if (claimError.message?.includes('NO_CARDS_AVAILABLE')) {
          return new Response(JSON.stringify({ 
            error: "NO_CARDS_AVAILABLE",
            message: `No ${conditionInfo?.condition_name || 'gift cards'} available. An administrator has been notified.`
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        throw claimError;
      }

      if (!atomicResult || atomicResult.length === 0) {
        throw new Error('No card returned from atomic claim');
      }

      claimedCard = atomicResult[0];
      
      // Check if this was an existing assignment
      if (claimedCard.already_assigned) {
        console.log(`[PROVISION-CC] Returning existing assignment: ${claimedCard.card_id}`);
        
        // Return the existing card info
        return new Response(JSON.stringify({
          success: true,
          alreadyAssigned: true,
          recipient: {
            id: recipient.id,
            firstName: recipient.first_name,
            lastName: recipient.last_name,
            phone: deliveryPhone || recipient.phone,
            email: deliveryEmail || recipient.email,
          },
          giftCard: {
            id: claimedCard.card_id,
            card_code: claimedCard.card_code,
            card_number: claimedCard.card_number,
            card_value: claimedCard.card_value_amount,
            provider: claimedCard.provider,
            brand_name: claimedCard.brand_name,
            gift_card_pools: {
              id: claimedCard.pool_id,
              pool_name: claimedCard.pool_name,
              card_value: claimedCard.card_value_amount,
              provider: claimedCard.provider,
            }
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log(`[PROVISION-CC] Successfully claimed new card: ${claimedCard.card_id}`);

    } catch (claimError) {
      console.error("[PROVISION-CC] Failed to claim card:", claimError);
      throw new Error(`Failed to claim gift card: ${claimError.message}`);
    }

    // Update recipient status to redeemed AND update contact information
    const { error: updateError } = await supabaseAdmin
      .from("recipients")
      .update({
        approval_status: "redeemed",
        gift_card_assigned_id: claimedCard.card_id,
        // Update contact info with agent-provided data
        phone: deliveryPhone || recipient.phone,
        email: deliveryEmail || recipient.email,
        approved_by_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);

    if (updateError) {
      console.error("[PROVISION-CC] Failed to update recipient:", updateError);
    }

    console.log(`[PROVISION-CC] Updated recipient with contact: ${deliveryPhone ? 'phone' : 'email'}`);

    // Log the action in audit log
    await supabaseAdmin
      .from("recipient_audit_log")
      .insert({
        recipient_id: recipient.id,
        action: "redeemed_by_agent",
        user_id: user.id,
        notes: agentNotes || `Redeemed by call center agent. Condition: ${conditionNumber || 'default'}`,
        metadata: { 
          gift_card_id: claimedCard.id,
          redemption_code: redemptionCode,
          condition_number: conditionNumber,
          contact_method: deliveryPhone ? 'sms' : 'email'
        }
      });

    // If conditionNumber was provided, log it in call_conditions_met
    if (conditionNumber && conditionId) {
      await supabaseAdmin
        .from("call_conditions_met")
        .insert({
          campaign_id: campaign.id,
          recipient_id: recipient.id,
          condition_number: conditionNumber,
          met_by_agent_id: user.id,
          gift_card_id: claimedCard.id,
          delivery_status: 'pending',
          call_session_id: null, // No call session for manual call center redemption
        });

      console.log(`[PROVISION-CC] Logged condition ${conditionNumber} as met`);
    }

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

    // Auto-send SMS/Email based on delivery method chosen by agent
    const deliveryContact = deliveryPhone || deliveryEmail;
    if (deliveryContact && giftCard) {
      try {
        const brand = giftCard.gift_card_pools?.gift_card_brands;
        const pool = giftCard.gift_card_pools;
        const value = pool?.card_value || 0;

        if (deliveryPhone) {
          console.log(`[PROVISION-CC] Auto-sending SMS to ${deliveryPhone}`);
          const smsMessage = `Your ${brand?.brand_name || pool?.provider || "Gift Card"} is ready!\n\nCode: ${giftCard.card_code}\n${giftCard.card_number ? `Card: ${giftCard.card_number}\n` : ""}Value: $${value}\n\nRedeem at the store`;
          
          // Create SMS delivery log entry
          const { data: smsLogEntry } = await supabaseAdmin
            .from('sms_delivery_log')
            .insert({
              recipient_id: recipient.id,
              gift_card_id: giftCard.id,
              campaign_id: campaign.id,
              phone_number: deliveryPhone,
              message_body: smsMessage,
              delivery_status: 'pending',
              retry_count: 0
            })
            .select()
            .single();

          const { error: smsError } = await supabaseAdmin.functions.invoke("send-gift-card-sms", {
            body: {
              deliveryId: smsLogEntry?.id,
              phone: deliveryPhone,
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
            console.log("[PROVISION-CC] SMS sent successfully");
            if (smsLogEntry) {
              await supabaseAdmin
                .from('sms_delivery_log')
                .update({ delivery_status: 'delivered' })
                .eq('id', smsLogEntry.id);
            }
          }
        } else if (deliveryEmail) {
          console.log(`[PROVISION-CC] Sending email to ${deliveryEmail}`);
          
          try {
            const { error: emailError } = await supabaseAdmin.functions.invoke('send-gift-card-email', {
              body: {
                giftCardId: giftCard.id,
                recipientEmail: deliveryEmail,
                recipientName: recipient.first_name || recipientData.name,
                giftCardCode: giftCard.card_code,
                giftCardValue: value,
                brandName: brand?.brand_name,
                brandLogoUrl: brand?.logo_url,
                redemptionInstructions: brand?.redemption_instructions,
                balanceCheckUrl: brand?.balance_check_url,
                recipientId: recipient.id,
                campaignId: campaign.id,
              },
            });

            if (emailError) {
              console.error('[PROVISION-CC] Email delivery error:', emailError);
              // Don't fail the whole request if email fails, just log it
            } else {
              console.log('[PROVISION-CC] Email sent successfully');
            }
          } catch (emailErr) {
            console.error('[PROVISION-CC] Email delivery exception:', emailErr);
            // Continue even if email fails
          }
        }
      } catch (deliveryError) {
        console.error("[PROVISION-CC] Delivery error:", deliveryError);
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

/**
 * send-sms-opt-in
 * 
 * Triggered when call center rep enters a cell phone number.
 * Sends opt-in request SMS via configured provider (Infobip/Twilio).
 * 
 * Request body:
 * {
 *   recipient_id: string,
 *   campaign_id: string,
 *   call_session_id: string,
 *   phone: string,
 *   client_name: string // For personalized message
 * }
 * 
 * Flow:
 * 1. Validate phone number format
 * 2. Send SMS via configured provider: "This is {client_name}. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out."
 * 3. Update recipient.sms_opt_in_status = 'pending'
 * 4. Update recipient.sms_opt_in_sent_at = now()
 * 5. Log to sms_opt_in_log
 * 6. Broadcast status update via Supabase Realtime
 * 
 * Response:
 * { success: true, message_id: string, provider: string }
 * or
 * { success: false, error: string }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { sendSMS, formatPhoneE164 } from "../_shared/sms-provider.ts";
import { createErrorLogger } from "../_shared/error-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phone number validation regex (US numbers)
const PHONE_REGEX = /^\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize error logger
  const errorLogger = createErrorLogger('send-sms-opt-in');

  // Declare variables at function scope for error logging
  let recipient_id: string | undefined;
  let campaign_id: string | undefined;

  try {
    const requestData = await req.json();
    recipient_id = requestData.recipient_id;
    campaign_id = requestData.campaign_id;
    const call_session_id = requestData.call_session_id;
    const phone = requestData.phone;
    const client_name = requestData.client_name;
    const custom_message = requestData.custom_message; // Optional: custom opt-in message template

    // Validate required fields
    if (!recipient_id) {
      throw new Error("recipient_id is required");
    }
    if (!campaign_id) {
      throw new Error("campaign_id is required");
    }
    if (!phone) {
      throw new Error("phone is required");
    }
    if (!client_name) {
      throw new Error("client_name is required");
    }

    // Validate phone format
    if (!PHONE_REGEX.test(phone)) {
      throw new Error("Invalid phone number format");
    }

    const formattedPhone = formatPhoneE164(phone);
    console.log(`[SEND-SMS-OPT-IN] Sending opt-in to ${formattedPhone} for recipient ${recipient_id}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Check if opt-in was already sent for this recipient
    const { data: existingRecipient, error: checkError } = await supabaseAdmin
      .from("recipients")
      .select("sms_opt_in_status, sms_opt_in_sent_at")
      .eq("id", recipient_id)
      .single();

    if (checkError) {
      console.error("[SEND-SMS-OPT-IN] Error checking recipient:", checkError);
      throw new Error("Failed to verify recipient status");
    }

    // If already opted in, return success
    if (existingRecipient?.sms_opt_in_status === 'opted_in') {
      return new Response(JSON.stringify({
        success: true,
        already_opted_in: true,
        message: "Recipient has already opted in"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If SMS was already sent and pending, check if it was recent (within 5 minutes)
    if (existingRecipient?.sms_opt_in_status === 'pending' && existingRecipient?.sms_opt_in_sent_at) {
      const sentAt = new Date(existingRecipient.sms_opt_in_sent_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (sentAt > fiveMinutesAgo) {
        return new Response(JSON.stringify({
          success: true,
          already_pending: true,
          message: "Opt-in SMS was recently sent. Waiting for response."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Prepare opt-in message
    // Priority: 1) custom_message from request, 2) campaign setting, 3) default
    let optInMessage: string;
    let clientId: string | undefined;
    
    if (custom_message) {
      // Use custom message from request, replace placeholders
      optInMessage = custom_message
        .replace(/\{client_name\}/gi, client_name)
        .replace(/\{company\}/gi, client_name);
      
      // Still need to fetch client_id for hierarchical Twilio
      const { data: campaignData } = await supabaseAdmin
        .from("campaigns")
        .select("client_id")
        .eq("id", campaign_id)
        .single();
      clientId = campaignData?.client_id || undefined;
    } else {
      // Try to fetch campaign-level opt-in message setting AND client_id for Twilio hierarchy
      const { data: campaignSettings } = await supabaseAdmin
        .from("campaigns")
        .select("sms_opt_in_message, client_id")
        .eq("id", campaign_id)
        .single();
      
      clientId = campaignSettings?.client_id || undefined;
      
      if (campaignSettings?.sms_opt_in_message) {
        optInMessage = campaignSettings.sms_opt_in_message
          .replace(/\{client_name\}/gi, client_name)
          .replace(/\{company\}/gi, client_name);
      } else {
        // Default message
        optInMessage = `This is ${client_name}. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out.`;
      }
    }
    
    console.log(`[SEND-SMS-OPT-IN] Client ID for Twilio hierarchy: ${clientId || 'none (will use fallback)'}`)
    
    console.log(`[SEND-SMS-OPT-IN] Opt-in message: ${optInMessage}`);

    // Send SMS using provider abstraction (handles Infobip/Twilio selection and fallback)
    // Pass clientId for hierarchical Twilio resolution (Client -> Agency -> Admin)
    console.log(`[SEND-SMS-OPT-IN] Sending SMS to ${formattedPhone}...`);
    const smsResult = await sendSMS(formattedPhone, optInMessage, supabaseAdmin, clientId);

    if (!smsResult.success) {
      console.error("[SEND-SMS-OPT-IN] SMS send failed:", smsResult.error);
      throw new Error(smsResult.error || "Failed to send SMS");
    }

    const messageId = smsResult.messageId || `sms_${Date.now()}`;
    const now = new Date().toISOString();

    console.log(`[SEND-SMS-OPT-IN] SMS sent successfully via ${smsResult.provider}, ID: ${messageId}`);
    
    if (smsResult.fallbackUsed) {
      console.log('[SEND-SMS-OPT-IN] Note: Fallback provider was used');
    }
    
    // Log Twilio hierarchy info if available
    if (smsResult.twilioLevelUsed) {
      console.log(`[SEND-SMS-OPT-IN] Twilio level used: ${smsResult.twilioLevelUsed} (${smsResult.twilioEntityName || 'N/A'})`);
      if (smsResult.twilioFallbackOccurred) {
        console.log(`[SEND-SMS-OPT-IN] Twilio fallback reason: ${smsResult.twilioFallbackReason}`);
      }
    }

    // Update recipient status
    const { error: updateError } = await supabaseAdmin
      .from("recipients")
      .update({
        sms_opt_in_status: "pending",
        sms_opt_in_sent_at: now,
        phone: formattedPhone, // Enrich with formatted cell phone
      })
      .eq("id", recipient_id);

    if (updateError) {
      console.error("[SEND-SMS-OPT-IN] Failed to update recipient:", updateError);
    }

    // Log the SMS
    const { error: logError } = await supabaseAdmin.from("sms_opt_in_log").insert({
      recipient_id,
      campaign_id,
      call_session_id: call_session_id || null,
      phone: formattedPhone,
      message_sid: messageId,
      direction: "outbound",
      message_text: optInMessage,
      status: "sent",
      provider_used: smsResult.provider,
    });

    if (logError) {
      console.error("[SEND-SMS-OPT-IN] Failed to log SMS:", logError);
    }

    // Broadcast real-time update if we have a call session
    if (call_session_id) {
      try {
        const channel = supabaseAdmin.channel(`opt_in_status:${call_session_id}`);
        await channel.subscribe();
        await channel.send({
          type: "broadcast",
          event: "status_update",
          payload: {
            recipient_id,
            status: "pending",
            sent_at: now,
          },
        });
        await supabaseAdmin.removeChannel(channel);
      } catch (broadcastError) {
        console.error("[SEND-SMS-OPT-IN] Broadcast error:", broadcastError);
        // Don't fail the request if broadcast fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: messageId,
      provider: smsResult.provider,
      status: smsResult.status || "pending",
      sent_at: now,
      fallback_used: smsResult.fallbackUsed || false,
      // Twilio hierarchy info
      twilio_level_used: smsResult.twilioLevelUsed || null,
      twilio_entity_name: smsResult.twilioEntityName || null,
      twilio_from_number: smsResult.twilioFromNumber || null,
      twilio_fallback_occurred: smsResult.twilioFallbackOccurred || false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[SEND-SMS-OPT-IN] [${errorLogger.requestId}] Error:`, errorMessage);
    
    // Log error to database
    await errorLogger.logError(error, {
      recipientId: recipient_id,
      campaignId: campaign_id,
      metadata: {
        errorMessage,
      },
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

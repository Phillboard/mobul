/**
 * send-sms-opt-in
 * 
 * Triggered when call center rep enters a cell phone number.
 * Sends opt-in request SMS via EZ Texting API.
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
 * 2. Send SMS via EZ Texting: "This is {client_name}. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out."
 * 3. Update recipient.sms_opt_in_status = 'pending'
 * 4. Update recipient.sms_opt_in_sent_at = now()
 * 5. Log to sms_opt_in_log
 * 6. Broadcast status update via Supabase Realtime
 * 
 * Response:
 * { success: true, message_id: string }
 * or
 * { success: false, error: string }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phone number validation regex (US numbers)
const PHONE_REGEX = /^\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

// Format phone for EZ Texting (10 digits, no country code)
function formatPhoneForEZTexting(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If 11 digits starting with 1, remove the leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  
  // If 10 digits, return as-is
  if (digits.length === 10) {
    return digits;
  }
  
  // Otherwise return last 10 digits
  return digits.slice(-10);
}

// Format phone to E.164 for storage
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      recipient_id, 
      campaign_id, 
      call_session_id, 
      phone, 
      client_name,
      custom_message // Optional: custom opt-in message template
    } = await req.json();

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

    const ezTextingPhone = formatPhoneForEZTexting(phone);
    const formattedPhone = formatPhoneE164(phone);
    console.log(`[SEND-SMS-OPT-IN] Sending opt-in to ${ezTextingPhone} for recipient ${recipient_id}`);

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
    
    if (custom_message) {
      // Use custom message from request, replace placeholders
      optInMessage = custom_message
        .replace(/\{client_name\}/gi, client_name)
        .replace(/\{company\}/gi, client_name);
    } else {
      // Try to fetch campaign-level opt-in message setting
      const { data: campaignSettings } = await supabaseAdmin
        .from("campaigns")
        .select("sms_opt_in_message")
        .eq("id", campaign_id)
        .single();
      
      if (campaignSettings?.sms_opt_in_message) {
        optInMessage = campaignSettings.sms_opt_in_message
          .replace(/\{client_name\}/gi, client_name)
          .replace(/\{company\}/gi, client_name);
      } else {
        // Default message
        optInMessage = `This is ${client_name}. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out.`;
      }
    }
    
    console.log(`[SEND-SMS-OPT-IN] Opt-in message: ${optInMessage}`);

    // Get EZ Texting credentials
    const ezTextingUsername = Deno.env.get("EZTEXTING_USERNAME");
    const ezTextingPassword = Deno.env.get("EZTEXTING_PASSWORD");

    if (!ezTextingUsername || !ezTextingPassword) {
      console.error("[SEND-SMS-OPT-IN] Missing EZ Texting credentials");
      throw new Error("SMS service not configured");
    }

    console.log(`[SEND-SMS-OPT-IN] Sending SMS to ${ezTextingPhone} via EZ Texting...`);

    // EZ Texting uses HTTP Basic Authentication
    const authHeader = btoa(`${ezTextingUsername}:${ezTextingPassword}`);

    // Send SMS via EZ Texting REST API
    // Docs: https://www.eztexting.com/developers/sms-api-documentation/rest
    const ezTextingResponse = await fetch("https://app.eztexting.com/sending/messages?format=json", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        User: ezTextingUsername,
        Password: ezTextingPassword,
        PhoneNumbers: ezTextingPhone,
        Message: optInMessage,
        MessageTypeID: "1", // 1 = Express (immediate delivery)
      }),
    });

    let ezTextingData;
    const responseText = await ezTextingResponse.text();
    console.log(`[SEND-SMS-OPT-IN] EZ Texting response status: ${ezTextingResponse.status}`);
    console.log(`[SEND-SMS-OPT-IN] EZ Texting response body: ${responseText}`);
    
    try {
      ezTextingData = JSON.parse(responseText);
    } catch {
      ezTextingData = { raw: responseText };
    }

    if (!ezTextingResponse.ok) {
      console.error("[SEND-SMS-OPT-IN] EZ Texting error:", ezTextingData);
      throw new Error(ezTextingData.Error || ezTextingData.message || `EZ Texting API error: ${ezTextingResponse.status}`);
    }

    // EZ Texting returns message ID in the response
    const messageId = ezTextingData.Response?.Entry?.ID || ezTextingData.ID || `ez_${Date.now()}`;
    const now = new Date().toISOString();

    console.log(`[SEND-SMS-OPT-IN] SMS sent successfully via EZ Texting, ID: ${messageId}`);

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
      status: "pending",
      sent_at: now,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SEND-SMS-OPT-IN] Error:", errorMessage);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


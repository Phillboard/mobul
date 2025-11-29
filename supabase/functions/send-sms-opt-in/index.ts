/**
 * send-sms-opt-in
 * 
 * Triggered when call center rep enters a cell phone number.
 * Immediately sends opt-in request SMS via Twilio.
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
 * 2. Send SMS via Twilio: "This is {client_name}. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out."
 * 3. Update recipient.sms_opt_in_status = 'pending'
 * 4. Update recipient.sms_opt_in_sent_at = now()
 * 5. Log to sms_opt_in_log
 * 6. Broadcast status update via Supabase Realtime
 * 
 * Response:
 * { success: true, message_sid: string }
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

// Format phone to E.164
function formatPhoneE164(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If 10 digits, assume US and add country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If 11 digits starting with 1, format as +1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Otherwise return with + prefix
  return `+${digits}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_id, campaign_id, call_session_id, phone, client_name } = await req.json();

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
    const optInMessage = `This is ${client_name}. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out.`;

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("[SEND-SMS-OPT-IN] Missing Twilio credentials");
      throw new Error("SMS service not configured");
    }

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Build status callback URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/handle-sms-status`;

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhoneNumber,
        Body: optInMessage,
        StatusCallback: statusCallbackUrl,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("[SEND-SMS-OPT-IN] Twilio error:", twilioData);
      throw new Error(twilioData.message || "Failed to send SMS");
    }

    const messageSid = twilioData.sid;
    const now = new Date().toISOString();

    console.log(`[SEND-SMS-OPT-IN] SMS sent successfully, SID: ${messageSid}`);

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
      message_sid: messageSid,
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
      message_sid: messageSid,
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


/**
 * eztexting-webhook
 * 
 * Webhook handler for incoming SMS from EZ Texting.
 * Receives forwarded messages when customers reply to opt-in requests.
 * 
 * EZ Texting Forwarding API sends data in this format:
 * Query params or form data:
 * - PhoneNumber: sender's phone number
 * - Message: the message text
 * - MessageID: unique message identifier
 * - InboundID: inbound message ID
 * 
 * Logic:
 * - "YES", "Y", "yes", "y" → opted_in
 * - "STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT" → opted_out
 * - Anything else → invalid_response
 * 
 * After updating, broadcast real-time update to call center dashboard.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

// Opt-in keywords (case-insensitive)
const OPT_IN_KEYWORDS = ['YES', 'Y', 'YEA', 'YEAH', 'YEP', 'YUP', 'OK', 'OKAY', 'SURE', 'ACCEPT'];

// Opt-out keywords (case-insensitive) - Standard carrier keywords
const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'NO', 'OPTOUT', 'OPT OUT', 'STOP ALL'];

serve(async (req) => {
  console.log(`[EZTEXTING-WEBHOOK] Received ${req.method} request`);
  
  let phoneNumber: string = "";
  let message: string = "";
  let messageId: string = "";
  
  try {
    // EZ Texting can send data in multiple formats depending on configuration
    const contentType = req.headers.get("content-type") || "";
    const url = new URL(req.url);
    
    // Check query parameters first (EZ Texting sometimes sends via query string)
    if (url.searchParams.get("PhoneNumber")) {
      phoneNumber = url.searchParams.get("PhoneNumber") || "";
      message = url.searchParams.get("Message") || "";
      messageId = url.searchParams.get("MessageID") || url.searchParams.get("InboundID") || "";
      console.log("[EZTEXTING-WEBHOOK] Parsed from query params");
    }
    // Check form data
    else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      phoneNumber = formData.get("PhoneNumber") as string || 
                    formData.get("phonenumber") as string || 
                    formData.get("From") as string || "";
      message = formData.get("Message") as string || 
                formData.get("message") as string || 
                formData.get("Body") as string || "";
      messageId = formData.get("MessageID") as string || 
                  formData.get("InboundID") as string || "";
      console.log("[EZTEXTING-WEBHOOK] Parsed from form data");
    }
    // Check JSON body
    else if (contentType.includes("application/json")) {
      const json = await req.json();
      phoneNumber = json.PhoneNumber || json.phonenumber || json.From || json.from || "";
      message = json.Message || json.message || json.Body || json.body || "";
      messageId = json.MessageID || json.InboundID || json.messageId || "";
      console.log("[EZTEXTING-WEBHOOK] Parsed from JSON body");
    }
    // Try to parse as JSON anyway (some webhooks don't set content-type properly)
    else {
      try {
        const text = await req.text();
        if (text.startsWith('{')) {
          const json = JSON.parse(text);
          phoneNumber = json.PhoneNumber || json.phonenumber || json.From || "";
          message = json.Message || json.message || json.Body || "";
          messageId = json.MessageID || json.InboundID || "";
          console.log("[EZTEXTING-WEBHOOK] Parsed from raw JSON text");
        } else {
          // Try URL-encoded format
          const params = new URLSearchParams(text);
          phoneNumber = params.get("PhoneNumber") || params.get("From") || "";
          message = params.get("Message") || params.get("Body") || "";
          messageId = params.get("MessageID") || params.get("InboundID") || "";
          console.log("[EZTEXTING-WEBHOOK] Parsed from URL-encoded text");
        }
      } catch (parseError) {
        console.error("[EZTEXTING-WEBHOOK] Failed to parse body:", parseError);
      }
    }

    message = message.trim();
    console.log(`[EZTEXTING-WEBHOOK] Received from ${phoneNumber}: "${message}" (ID: ${messageId})`);

    if (!phoneNumber || !message) {
      console.log("[EZTEXTING-WEBHOOK] Missing phone number or message");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing phone number or message" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Normalize phone number for lookup (last 10 digits)
    const normalizedPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    
    if (!normalizedPhone || normalizedPhone.length !== 10) {
      console.log("[EZTEXTING-WEBHOOK] Invalid phone number:", phoneNumber);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Invalid phone number format" 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Find recipient by phone number with pending status
    // Use LIKE to match the phone number regardless of formatting
    const { data: recipients, error: lookupError } = await supabaseAdmin
      .from("recipients")
      .select("id, campaign_id, sms_opt_in_status")
      .eq("sms_opt_in_status", "pending")
      .or(`phone.ilike.%${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}`)
      .order("sms_opt_in_sent_at", { ascending: false })
      .limit(5);

    if (lookupError) {
      console.error("[EZTEXTING-WEBHOOK] Lookup error:", lookupError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Database error" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!recipients || recipients.length === 0) {
      console.log("[EZTEXTING-WEBHOOK] No pending recipient found for phone:", phoneNumber);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No pending opt-in found" 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use the most recent pending recipient
    const recipient = recipients[0];
    console.log(`[EZTEXTING-WEBHOOK] Found recipient: ${recipient.id}`);

    // Determine status based on response
    const upperMessage = message.toUpperCase().trim();
    let newStatus: 'opted_in' | 'opted_out' | 'invalid_response';
    let replyMessage: string | null = null;

    if (OPT_IN_KEYWORDS.includes(upperMessage)) {
      newStatus = "opted_in";
      replyMessage = "Thanks! You're all set to receive your gift card.";
      console.log(`[EZTEXTING-WEBHOOK] Recipient ${recipient.id} OPTED IN`);
    } else if (OPT_OUT_KEYWORDS.includes(upperMessage)) {
      newStatus = "opted_out";
      replyMessage = "You have been unsubscribed. No further messages will be sent.";
      console.log(`[EZTEXTING-WEBHOOK] Recipient ${recipient.id} OPTED OUT`);
    } else {
      newStatus = "invalid_response";
      replyMessage = "We didn't understand your response. Please reply YES to opt in or STOP to opt out.";
      console.log(`[EZTEXTING-WEBHOOK] Recipient ${recipient.id} INVALID RESPONSE: "${message}"`);
    }

    const now = new Date().toISOString();

    // Update recipient
    const { error: updateError } = await supabaseAdmin
      .from("recipients")
      .update({
        sms_opt_in_status: newStatus,
        sms_opt_in_response: message,
        sms_opt_in_response_at: now,
      })
      .eq("id", recipient.id);

    if (updateError) {
      console.error("[EZTEXTING-WEBHOOK] Update error:", updateError);
    }

    // Log the response
    const { error: logError } = await supabaseAdmin.from("sms_opt_in_log").insert({
      recipient_id: recipient.id,
      campaign_id: recipient.campaign_id,
      phone: phoneNumber,
      message_sid: messageId || `ez_inbound_${Date.now()}`,
      direction: "inbound",
      message_text: message,
      status: "received",
    });

    if (logError) {
      console.error("[EZTEXTING-WEBHOOK] Log error:", logError);
    }

    // Find active call session for this recipient to broadcast update
    const { data: callSession } = await supabaseAdmin
      .from("call_sessions")
      .select("id")
      .eq("recipient_id", recipient.id)
      .eq("call_status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (callSession) {
      // Broadcast real-time update to call center dashboard
      try {
        const channel = supabaseAdmin.channel(`opt_in_status:${callSession.id}`);
        await channel.subscribe();
        await channel.send({
          type: "broadcast",
          event: "status_update",
          payload: {
            recipient_id: recipient.id,
            status: newStatus,
            response: message,
            response_at: now,
          },
        });
        await supabaseAdmin.removeChannel(channel);
        console.log(`[EZTEXTING-WEBHOOK] Broadcast to call session ${callSession.id}`);
      } catch (broadcastError) {
        console.error("[EZTEXTING-WEBHOOK] Broadcast error:", broadcastError);
      }
    }

    // Also broadcast using recipient_id channel for direct polling
    try {
      const recipientChannel = supabaseAdmin.channel(`opt_in_recipient:${recipient.id}`);
      await recipientChannel.subscribe();
      await recipientChannel.send({
        type: "broadcast",
        event: "status_update",
        payload: {
          recipient_id: recipient.id,
          status: newStatus,
          response: message,
          response_at: now,
        },
      });
      await supabaseAdmin.removeChannel(recipientChannel);
      console.log(`[EZTEXTING-WEBHOOK] Broadcast to recipient channel`);
    } catch (broadcastError) {
      console.error("[EZTEXTING-WEBHOOK] Recipient broadcast error:", broadcastError);
    }

    // EZ Texting expects a 200 OK response
    // If you want to send an auto-reply, you can return a specific format
    // but typically the reply is handled by EZ Texting's auto-responder
    return new Response(JSON.stringify({
      success: true,
      recipient_id: recipient.id,
      status: newStatus,
      reply: replyMessage,
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[EZTEXTING-WEBHOOK] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});


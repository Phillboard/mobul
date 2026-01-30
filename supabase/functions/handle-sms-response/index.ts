/**
 * handle-sms-response
 * 
 * Twilio webhook handler for incoming SMS responses.
 * Parses YES/STOP/other and updates recipient status in real-time.
 * 
 * Expected Twilio webhook data:
 * - From: sender phone number
 * - Body: message text
 * - MessageSid: unique message ID
 * 
 * Logic:
 * - "YES", "Y", "yes", "y" → opted_in
 * - "STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT" → opted_out
 * - Anything else → invalid_response
 * 
 * Opt-In Confirmation Message:
 * - Fetches client's opt_in_confirmation template from message_templates
 * - If template body is empty, confirmation is disabled (no SMS sent)
 * - If enabled, uses client's template or system default
 * 
 * After updating, broadcast real-time update to call center dashboard.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { SYSTEM_DEFAULT_TEMPLATES, renderSmsTemplate } from '../_shared/a2p-validation.ts';

// Opt-in keywords (case-insensitive)
const OPT_IN_KEYWORDS = ['YES', 'Y', 'YEA', 'YEAH', 'YEP', 'YUP', 'OK', 'OKAY', 'SURE', 'ACCEPT'];

// Opt-out keywords (case-insensitive) - Standard carrier keywords
const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'NO', 'OPTOUT', 'OPT OUT', 'STOP ALL'];

serve(async (req) => {
  // Initialize activity logger
  const activityLogger = createActivityLogger('handle-sms-response', req);

  // Twilio webhooks come as form-encoded data
  const contentType = req.headers.get("content-type") || "";
  
  let from: string;
  let body: string;
  let messageSid: string;
  
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    from = formData.get("From") as string || "";
    body = (formData.get("Body") as string || "").trim();
    messageSid = formData.get("MessageSid") as string || "";
  } else {
    // Also support JSON for testing
    const json = await req.json();
    from = json.From || "";
    body = (json.Body || "").trim();
    messageSid = json.MessageSid || "";
  }

  console.log(`[HANDLE-SMS-RESPONSE] Received from ${from}: "${body}"`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Normalize phone number for lookup (last 10 digits)
  const normalizedPhone = from.replace(/\D/g, "").slice(-10);
  
  if (!normalizedPhone || normalizedPhone.length !== 10) {
    console.log("[HANDLE-SMS-RESPONSE] Invalid phone number:", from);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "text/xml" },
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
    console.error("[HANDLE-SMS-RESPONSE] Lookup error:", lookupError);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "text/xml" },
    });
  }

  if (!recipients || recipients.length === 0) {
    console.log("[HANDLE-SMS-RESPONSE] No pending recipient found for phone:", from);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Use the most recent pending recipient
  const recipient = recipients[0];
  console.log(`[HANDLE-SMS-RESPONSE] Found recipient: ${recipient.id}`);

  // Determine status based on response
  const upperBody = body.toUpperCase().trim();
  let newStatus: 'opted_in' | 'opted_out' | 'invalid_response';
  let replyMessage: string | null = null;

  if (OPT_IN_KEYWORDS.includes(upperBody)) {
    newStatus = "opted_in";
    console.log(`[HANDLE-SMS-RESPONSE] Recipient ${recipient.id} OPTED IN`);
    
    // Fetch opt-in confirmation template from client settings
    // First get the client_id from campaign
    let clientId: string | null = null;
    if (recipient.campaign_id) {
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('client_id')
        .eq('id', recipient.campaign_id)
        .single();
      clientId = campaign?.client_id || null;
    }
    
    // Look up client's opt_in_confirmation template
    if (clientId) {
      const { data: clientTemplate } = await supabaseAdmin
        .from('message_templates')
        .select('body_template')
        .eq('client_id', clientId)
        .eq('template_type', 'sms')
        .eq('name', 'opt_in_confirmation')
        .eq('is_default', true)
        .single();
      
      if (clientTemplate) {
        // Empty body means confirmation is disabled
        if (clientTemplate.body_template === '') {
          console.log('[HANDLE-SMS-RESPONSE] Opt-in confirmation disabled for this client');
          replyMessage = null;
        } else {
          // Use client's custom template
          replyMessage = renderSmsTemplate(clientTemplate.body_template, {
            first_name: '', // Could fetch from recipient if needed
          });
          console.log('[HANDLE-SMS-RESPONSE] Using client opt-in confirmation template');
        }
      } else {
        // No custom template - use system default
        replyMessage = SYSTEM_DEFAULT_TEMPLATES.opt_in_confirmation;
        console.log('[HANDLE-SMS-RESPONSE] Using system default opt-in confirmation');
      }
    } else {
      // No client context - use system default
      replyMessage = SYSTEM_DEFAULT_TEMPLATES.opt_in_confirmation;
      console.log('[HANDLE-SMS-RESPONSE] No client context, using system default');
    }
  } else if (OPT_OUT_KEYWORDS.includes(upperBody)) {
    newStatus = "opted_out";
    replyMessage = "You have been unsubscribed. No further messages will be sent.";
    console.log(`[HANDLE-SMS-RESPONSE] Recipient ${recipient.id} OPTED OUT`);
  } else {
    newStatus = "invalid_response";
    replyMessage = "We didn't understand your response. Please reply YES to opt in or STOP to opt out.";
    console.log(`[HANDLE-SMS-RESPONSE] Recipient ${recipient.id} INVALID RESPONSE: "${body}"`);
  }

  const now = new Date().toISOString();

  // Update recipient
  const { error: updateError } = await supabaseAdmin
    .from("recipients")
    .update({
      sms_opt_in_status: newStatus,
      sms_opt_in_response: body,
      sms_opt_in_response_at: now,
    })
    .eq("id", recipient.id);

  if (updateError) {
    console.error("[HANDLE-SMS-RESPONSE] Update error:", updateError);
  }

  // Log the response
  const { error: logError } = await supabaseAdmin.from("sms_opt_in_log").insert({
    recipient_id: recipient.id,
    campaign_id: recipient.campaign_id,
    phone: from,
    message_sid: messageSid,
    direction: "inbound",
    message_text: body,
    status: "received",
  });

  if (logError) {
    console.error("[HANDLE-SMS-RESPONSE] Log error:", logError);
  }

  // Log SMS response activity
  const eventType = newStatus === 'opted_in' ? 'opt_in' : 
                    newStatus === 'opted_out' ? 'opt_out' : 'sms_inbound';
  await activityLogger.communication(eventType, 'success',
    `SMS ${newStatus === 'opted_in' ? 'opt-in' : newStatus === 'opted_out' ? 'opt-out' : 'response'} from ${from}`,
    {
      recipientId: recipient.id,
      campaignId: recipient.campaign_id,
      direction: 'inbound',
      fromNumber: from,
      metadata: {
        message_sid: messageSid,
        response_text: body,
        new_status: newStatus,
      },
    }
  );

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
          response: body,
          response_at: now,
        },
      });
      await supabaseAdmin.removeChannel(channel);
      console.log(`[HANDLE-SMS-RESPONSE] Broadcast to call session ${callSession.id}`);
    } catch (broadcastError) {
      console.error("[HANDLE-SMS-RESPONSE] Broadcast error:", broadcastError);
    }
  }

  // Also try to broadcast using recipient_id channel for direct polling
  try {
    const recipientChannel = supabaseAdmin.channel(`opt_in_recipient:${recipient.id}`);
    await recipientChannel.subscribe();
    await recipientChannel.send({
      type: "broadcast",
      event: "status_update",
      payload: {
        recipient_id: recipient.id,
        status: newStatus,
        response: body,
        response_at: now,
      },
    });
    await supabaseAdmin.removeChannel(recipientChannel);
  } catch (broadcastError) {
    console.error("[HANDLE-SMS-RESPONSE] Recipient broadcast error:", broadcastError);
  }

  // Return TwiML response
  let twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  if (replyMessage) {
    twimlResponse += `<Message>${replyMessage}</Message>`;
  }
  twimlResponse += '</Response>';

  return new Response(twimlResponse, {
    headers: { "Content-Type": "text/xml" },
  });
});


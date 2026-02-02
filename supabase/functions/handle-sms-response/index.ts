/**
 * Handle SMS Response Edge Function
 * 
 * Twilio webhook handler for incoming SMS responses.
 * Parses YES/STOP and updates recipient status in real-time.
 * 
 * NOTE: This function receives form-encoded data from Twilio webhooks,
 * so it cannot use withApiGateway (which expects JSON).
 * 
 * Opt-in keywords: YES, Y, YEA, YEAH, YEP, YUP, OK, OKAY, SURE, ACCEPT
 * Opt-out keywords: STOP, UNSUBSCRIBE, CANCEL, END, QUIT, NO, OPTOUT
 */

import { createServiceClient } from '../_shared/supabase.ts';
import { handleCORS } from '../_shared/cors.ts';
import { 
  resolveTemplate, 
  renderTemplate, 
  SYSTEM_DEFAULT_TEMPLATES 
} from '../_shared/sms-templates.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// Opt-in keywords (case-insensitive)
const OPT_IN_KEYWORDS = ['YES', 'Y', 'YEA', 'YEAH', 'YEP', 'YUP', 'OK', 'OKAY', 'SURE', 'ACCEPT'];

// Opt-out keywords (case-insensitive) - Standard carrier keywords
const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'NO', 'OPTOUT', 'OPT OUT', 'STOP ALL'];

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('handle-sms-response', req);

  // Parse Twilio webhook data (form-encoded or JSON for testing)
  const contentType = req.headers.get('content-type') || '';
  
  let from: string;
  let body: string;
  let messageSid: string;
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await req.formData();
    from = (formData.get('From') as string) || '';
    body = ((formData.get('Body') as string) || '').trim();
    messageSid = (formData.get('MessageSid') as string) || '';
  } else {
    const json = await req.json();
    from = json.From || '';
    body = (json.Body || '').trim();
    messageSid = json.MessageSid || '';
  }

  console.log(`[SMS-RESPONSE] From ${from}: "${body}"`);

  // Normalize phone number (last 10 digits)
  const normalizedPhone = from.replace(/\D/g, '').slice(-10);
  
  if (!normalizedPhone || normalizedPhone.length !== 10) {
    console.log('[SMS-RESPONSE] Invalid phone number:', from);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  // Find pending recipient by phone
  const { data: recipients, error: lookupError } = await supabase
    .from('recipients')
    .select('id, campaign_id, sms_opt_in_status')
    .eq('sms_opt_in_status', 'pending')
    .or(`phone.ilike.%${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}`)
    .order('sms_opt_in_sent_at', { ascending: false })
    .limit(5);

  if (lookupError || !recipients || recipients.length === 0) {
    console.log('[SMS-RESPONSE] No pending recipient found for:', from);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  const recipient = recipients[0];
  console.log(`[SMS-RESPONSE] Found recipient: ${recipient.id}`);

  // Determine status based on response
  const upperBody = body.toUpperCase().trim();
  let newStatus: 'opted_in' | 'opted_out' | 'invalid_response';
  let replyMessage: string | null = null;

  if (OPT_IN_KEYWORDS.includes(upperBody)) {
    newStatus = 'opted_in';
    console.log(`[SMS-RESPONSE] Recipient ${recipient.id} OPTED IN`);
    
    // Get client ID for template resolution
    let clientId: string | null = null;
    if (recipient.campaign_id) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('client_id')
        .eq('id', recipient.campaign_id)
        .single();
      clientId = campaign?.client_id || null;
    }
    
    // Resolve opt-in confirmation template
    if (clientId) {
      const { template, source } = await resolveTemplate(supabase, {
        templateType: 'opt_in_confirmation',
        clientId,
      });
      
      // Empty template means confirmation disabled
      if (template === '') {
        console.log('[SMS-RESPONSE] Opt-in confirmation disabled for client');
        replyMessage = null;
      } else {
        replyMessage = renderTemplate(template, {});
        console.log(`[SMS-RESPONSE] Using ${source} opt-in confirmation template`);
      }
    } else {
      replyMessage = SYSTEM_DEFAULT_TEMPLATES.opt_in_confirmation;
    }
    
  } else if (OPT_OUT_KEYWORDS.includes(upperBody)) {
    newStatus = 'opted_out';
    replyMessage = 'You have been unsubscribed. No further messages will be sent.';
    console.log(`[SMS-RESPONSE] Recipient ${recipient.id} OPTED OUT`);
    
  } else {
    newStatus = 'invalid_response';
    replyMessage = "We didn't understand your response. Please reply YES to opt in or STOP to opt out.";
    console.log(`[SMS-RESPONSE] Recipient ${recipient.id} INVALID: "${body}"`);
  }

  const now = new Date().toISOString();

  // Update recipient
  await supabase
    .from('recipients')
    .update({
      sms_opt_in_status: newStatus,
      sms_opt_in_response: body,
      sms_opt_in_response_at: now,
    })
    .eq('id', recipient.id);

  // Log the response
  await supabase.from('sms_opt_in_log').insert({
    recipient_id: recipient.id,
    campaign_id: recipient.campaign_id,
    phone: from,
    message_sid: messageSid,
    direction: 'inbound',
    message_text: body,
    status: 'received',
  });

  // Log activity
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

  // Broadcast real-time updates
  const { data: callSession } = await supabase
    .from('call_sessions')
    .select('id')
    .eq('recipient_id', recipient.id)
    .eq('call_status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (callSession) {
    try {
      const channel = supabase.channel(`opt_in_status:${callSession.id}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'status_update',
        payload: { recipient_id: recipient.id, status: newStatus, response: body, response_at: now },
      });
      await supabase.removeChannel(channel);
    } catch (e) {
      console.error('[SMS-RESPONSE] Broadcast error:', e);
    }
  }

  // Also broadcast to recipient channel
  try {
    const recipientChannel = supabase.channel(`opt_in_recipient:${recipient.id}`);
    await recipientChannel.subscribe();
    await recipientChannel.send({
      type: 'broadcast',
      event: 'status_update',
      payload: { recipient_id: recipient.id, status: newStatus, response: body, response_at: now },
    });
    await supabase.removeChannel(recipientChannel);
  } catch (e) {
    console.error('[SMS-RESPONSE] Recipient broadcast error:', e);
  }

  // Return TwiML response
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  if (replyMessage) {
    twiml += `<Message>${replyMessage}</Message>`;
  }
  twiml += '</Response>';

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
});

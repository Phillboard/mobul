/**
 * Send Marketing SMS Edge Function
 * 
 * Sends individual marketing SMS messages and tracks delivery.
 * Uses the existing sms-provider.ts for actual sending.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSMS } from '../_shared/sms-provider.ts';
import { logError } from '../_shared/error-logger.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface MarketingSMSRequest {
  campaignId: string;
  messageId: string;
  contactId?: string;
  phone: string;
  body: string;
  mergeData?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const activityLogger = createActivityLogger(req);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { 
      campaignId, 
      messageId, 
      contactId, 
      phone, 
      body, 
      mergeData = {} 
    }: MarketingSMSRequest = await req.json();

    if (!campaignId || !messageId || !phone || !body) {
      throw new Error('Missing required fields: campaignId, messageId, phone, body');
    }

    // Render merge tags
    let renderedBody = body;
    Object.entries(mergeData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      renderedBody = renderedBody.replace(regex, String(value || ''));
    });
    // Remove any unreplaced tags
    renderedBody = renderedBody.replace(/{{[^}]+}}/g, '');

    // Create send record
    const { data: sendRecord, error: insertError } = await supabase
      .from('marketing_sends')
      .insert({
        campaign_id: campaignId,
        message_id: messageId,
        contact_id: contactId,
        message_type: 'sms',
        recipient_phone: phone,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create send record: ${insertError.message}`);
    }

    // Send SMS using existing provider
    const result = await sendSMS({
      to: phone,
      message: renderedBody,
    }, supabase);

    // Update send record with result
    const updateData: any = {
      sent_at: new Date().toISOString(),
      provider_message_id: result.messageId,
    };

    if (result.success) {
      updateData.status = 'sent';
    } else {
      updateData.status = 'failed';
      updateData.error_message = result.error;
    }

    await supabase
      .from('marketing_sends')
      .update(updateData)
      .eq('id', sendRecord.id);

    console.log(`[MARKETING-SMS] Sent to ${phone}: ${result.success ? 'success' : 'failed'}`);

    // Log activity
    await activityLogger.communication(
      result.success ? 'sms_outbound' : 'sms_failed',
      result.success ? 'success' : 'failed',
      {
        campaignId,
        recipientId: contactId || undefined,
        description: result.success ? `Marketing SMS sent to ${phone}` : `Marketing SMS failed to ${phone}: ${result.error}`,
        metadata: {
          send_id: sendRecord.id,
          message_id: result.messageId,
          phone,
          error: result.error,
        },
      }
    );

    return new Response(
      JSON.stringify({
        success: result.success,
        sendId: sendRecord.id,
        messageId: result.messageId,
        error: result.error,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MARKETING-SMS] Error:', error);
    await logError(supabase, {
      function_name: 'send-marketing-sms',
      error_message: error.message,
      error_stack: error.stack,
      severity: 'error',
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

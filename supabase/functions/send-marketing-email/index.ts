/**
 * Send Marketing Email Edge Function
 * 
 * Sends individual marketing emails and tracks delivery.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { logError } from '../_shared/error-logger.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface MarketingEmailRequest {
  campaignId: string;
  messageId: string;
  contactId?: string;
  email: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
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
      email, 
      subject,
      bodyHtml,
      bodyText,
      mergeData = {} 
    }: MarketingEmailRequest = await req.json();

    if (!campaignId || !messageId || !email || !subject) {
      throw new Error('Missing required fields: campaignId, messageId, email, subject');
    }

    // Render merge tags
    const renderTemplate = (template: string) => {
      let rendered = template;
      Object.entries(mergeData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, String(value || ''));
      });
      return rendered.replace(/{{[^}]+}}/g, '');
    };

    const renderedSubject = renderTemplate(subject);
    const renderedHtml = bodyHtml ? renderTemplate(bodyHtml) : undefined;
    const renderedText = bodyText ? renderTemplate(bodyText) : renderedHtml?.replace(/<[^>]*>/g, '');

    // Create send record
    const { data: sendRecord, error: insertError } = await supabase
      .from('marketing_sends')
      .insert({
        campaign_id: campaignId,
        message_id: messageId,
        contact_id: contactId,
        message_type: 'email',
        recipient_email: email,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create send record: ${insertError.message}`);
    }

    // Send email using existing send-email function
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'resend';
    const apiKey = Deno.env.get('EMAIL_API_KEY') || Deno.env.get('RESEND_API_KEY');
    
    let result = { success: false, messageId: '', error: '' };

    if (!apiKey) {
      // Mock send for development
      console.log('[MARKETING-EMAIL] No API key - mock sending to:', email);
      result = { 
        success: true, 
        messageId: `mock-${crypto.randomUUID()}`, 
        error: '' 
      };
    } else {
      // Send via Resend (or other provider)
      try {
        const fromEmail = Deno.env.get('EMAIL_FROM') || 'noreply@mobul.com';
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: renderedSubject,
            html: renderedHtml,
            text: renderedText,
            tags: [
              { name: 'campaign_id', value: campaignId },
              { name: 'message_id', value: messageId },
            ],
          }),
        });

        const data = await response.json();

        if (response.ok) {
          result = { success: true, messageId: data.id, error: '' };
        } else {
          result = { success: false, messageId: '', error: data.message || 'Email send failed' };
        }
      } catch (err: any) {
        result = { success: false, messageId: '', error: err.message };
      }
    }

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

    console.log(`[MARKETING-EMAIL] Sent to ${email}: ${result.success ? 'success' : 'failed'}`);

    // Log activity
    await activityLogger.communication(
      result.success ? 'email_sent' : 'email_failed',
      result.success ? 'success' : 'failed',
      {
        campaignId,
        description: result.success ? `Marketing email sent to ${email}` : `Marketing email failed to ${email}: ${result.error}`,
        metadata: {
          send_id: sendRecord.id,
          message_id: result.messageId,
          email,
          subject: renderedSubject,
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
    console.error('[MARKETING-EMAIL] Error:', error);
    await logError(supabase, {
      function_name: 'send-marketing-email',
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

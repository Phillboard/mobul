/**
 * Send Marketing Campaign Edge Function
 * 
 * Orchestrates sending email/SMS marketing campaigns.
 * Handles batch processing and updates campaign statistics.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { logError } from '../_shared/error-logger.ts';

const BATCH_SIZE = 50;

interface CampaignSendRequest {
  campaignId: string;
  batchSize?: number;
  dryRun?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { campaignId, batchSize = BATCH_SIZE, dryRun = false }: CampaignSendRequest = await req.json();

    if (!campaignId) {
      throw new Error('campaignId is required');
    }

    console.log(`[MARKETING] Starting campaign send: ${campaignId}, batchSize: ${batchSize}, dryRun: ${dryRun}`);

    // Get campaign with messages
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select(`
        *,
        marketing_campaign_messages (*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Validate campaign status
    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      throw new Error(`Cannot send campaign in ${campaign.status} status`);
    }

    if (!campaign.marketing_campaign_messages || campaign.marketing_campaign_messages.length === 0) {
      throw new Error('Campaign has no messages configured');
    }

    // Get recipients based on audience config
    const recipients = await getRecipients(supabase, campaign);
    console.log(`[MARKETING] Found ${recipients.length} recipients`);

    // Update campaign with total recipients and status
    await supabase
      .from('marketing_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
        total_recipients: recipients.length,
      })
      .eq('id', campaignId);

    // Get already sent recipients (to avoid duplicates)
    const { data: existingSends } = await supabase
      .from('marketing_sends')
      .select('contact_id, recipient_email, recipient_phone')
      .eq('campaign_id', campaignId);

    const sentContactIds = new Set(existingSends?.map(s => s.contact_id) || []);
    const sentEmails = new Set(existingSends?.map(s => s.recipient_email).filter(Boolean) || []);
    const sentPhones = new Set(existingSends?.map(s => s.recipient_phone).filter(Boolean) || []);

    // Filter out already sent
    const pendingRecipients = recipients.filter(r => {
      if (r.id && sentContactIds.has(r.id)) return false;
      if (r.email && sentEmails.has(r.email)) return false;
      if (r.phone && sentPhones.has(r.phone)) return false;
      return true;
    });

    console.log(`[MARKETING] ${pendingRecipients.length} pending recipients (${recipients.length - pendingRecipients.length} already sent)`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          totalRecipients: recipients.length,
          pendingRecipients: pendingRecipients.length,
          messages: campaign.marketing_campaign_messages.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process batch
    const batch = pendingRecipients.slice(0, batchSize);
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of batch) {
      for (const message of campaign.marketing_campaign_messages) {
        try {
          if (message.message_type === 'email' && recipient.email) {
            // Send email
            const { error: emailError } = await supabase.functions.invoke('send-marketing-email', {
              body: {
                campaignId,
                messageId: message.id,
                contactId: recipient.id,
                email: recipient.email,
                subject: message.subject,
                bodyHtml: message.body_html,
                bodyText: message.body_text,
                mergeData: {
                  first_name: recipient.first_name,
                  last_name: recipient.last_name,
                  email: recipient.email,
                  company: recipient.company,
                },
              },
            });

            if (emailError) {
              console.error(`[MARKETING] Email send error:`, emailError);
              failedCount++;
            } else {
              sentCount++;
            }
          }

          if (message.message_type === 'sms' && recipient.phone) {
            // Send SMS
            const { error: smsError } = await supabase.functions.invoke('send-marketing-sms', {
              body: {
                campaignId,
                messageId: message.id,
                contactId: recipient.id,
                phone: recipient.phone,
                body: message.body_text,
                mergeData: {
                  first_name: recipient.first_name,
                  last_name: recipient.last_name,
                  phone: recipient.phone,
                  company: recipient.company,
                },
              },
            });

            if (smsError) {
              console.error(`[MARKETING] SMS send error:`, smsError);
              failedCount++;
            } else {
              sentCount++;
            }
          }
        } catch (error) {
          console.error(`[MARKETING] Send error for ${recipient.id}:`, error);
          failedCount++;
        }
      }
    }

    // Check if more batches needed
    const remainingCount = pendingRecipients.length - batch.length;
    
    if (remainingCount > 0) {
      // Schedule next batch (using a short delay to avoid rate limits)
      console.log(`[MARKETING] ${remainingCount} recipients remaining, scheduling next batch`);
      
      // In production, use a queue or scheduled function
      // For now, we'll let the client poll and continue
    } else {
      // Mark campaign as sent
      await supabase
        .from('marketing_campaigns')
        .update({
          status: 'sent',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      console.log(`[MARKETING] Campaign completed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: batch.length,
        sent: sentCount,
        failed: failedCount,
        remaining: remainingCount,
        completed: remainingCount === 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MARKETING] Campaign send error:', error);
    await logError(supabase, {
      function_name: 'send-marketing-campaign',
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

/**
 * Get recipients based on campaign audience configuration
 */
async function getRecipients(supabase: any, campaign: any) {
  const { audience_type, audience_config, client_id } = campaign;
  let recipients: any[] = [];

  switch (audience_type) {
    case 'all_contacts':
      const { data: allContacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company, sms_opt_out, email_opt_out')
        .eq('client_id', client_id)
        .eq('do_not_contact', false);
      recipients = allContacts || [];
      break;

    case 'contact_list':
      if (audience_config.listIds?.length > 0) {
        const { data: listMembers } = await supabase
          .from('contact_list_members')
          .select(`
            contacts:contact_id (
              id, first_name, last_name, email, phone, company, sms_opt_out, email_opt_out
            )
          `)
          .in('list_id', audience_config.listIds);
        recipients = listMembers?.map((m: any) => m.contacts).filter(Boolean) || [];
      }
      break;

    case 'manual':
      if (audience_config.contactIds?.length > 0) {
        const { data: manualContacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, company, sms_opt_out, email_opt_out')
          .in('id', audience_config.contactIds)
          .eq('do_not_contact', false);
        recipients = manualContacts || [];
      }
      break;

    case 'segment':
      // TODO: Implement segment evaluation
      console.log('[MARKETING] Segment audience not yet implemented');
      break;
  }

  // Filter out opted-out contacts based on campaign type
  return recipients.filter(r => {
    if (campaign.campaign_type === 'email' && r.email_opt_out) return false;
    if (campaign.campaign_type === 'sms' && r.sms_opt_out) return false;
    if (campaign.campaign_type === 'both' && r.email_opt_out && r.sms_opt_out) return false;
    return true;
  });
}

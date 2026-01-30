import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';
import { createActivityLogger } from '../_shared/activity-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MailDeliveryEvent {
  trackingCode: string;
  status: 'in_transit' | 'delivered' | 'returned';
  timestamp?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize activity logger
  const activityLogger = createActivityLogger('track-mail-delivery', req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const event: MailDeliveryEvent = await req.json();
    console.log('Processing mail delivery event:', event);

    // Look up recipient by tracking code
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id, audience_id, audiences(client_id)')
      .eq('token', event.trackingCode)
      .single();

    if (recipientError || !recipient) {
      console.error('Recipient lookup failed:', recipientError);
      return new Response(
        JSON.stringify({ error: 'Invalid tracking code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the campaign associated with this recipient
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('audience_id', recipient.audience_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign lookup failed:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update recipient delivery status
    const { error: updateError } = await supabase
      .from('recipients')
      .update({
        delivery_status: event.status,
      })
      .eq('id', recipient.id);

    if (updateError) {
      console.error('Failed to update recipient:', updateError);
      throw new Error('Failed to update delivery status');
    }

    // Log delivery event
    await supabase
      .from('events')
      .insert({
        campaign_id: campaign.id,
        recipient_id: recipient.id,
        event_type: `mail_${event.status}`,
        source: 'mail_tracking',
        event_data_json: event.metadata || {},
        occurred_at: event.timestamp || new Date().toISOString(),
      });

    console.log(`Logged mail_${event.status} event for recipient ${recipient.id}`);

    // Log mail delivery activity
    const eventType = event.status === 'delivered' ? 'mail_delivered' : 
                      event.status === 'returned' ? 'mail_returned' : 'mail_sent';
    await activityLogger.campaign(eventType, 'success',
      `Mail ${event.status}: ${event.trackingCode}`,
      {
        recipientId: recipient.id,
        campaignId: campaign.id,
        clientId: (recipient.audiences as any)?.client_id,
        metadata: {
          tracking_code: event.trackingCode,
          status: event.status,
          ...event.metadata,
        },
      }
    );

    // If delivered, evaluate campaign conditions
    if (event.status === 'delivered') {
      try {
        await supabase.functions.invoke('evaluate-conditions', {
          body: {
            recipientId: recipient.id,
            campaignId: campaign.id,
            eventType: 'mail_delivered',
            metadata: event.metadata || {},
          }
        });
        console.log('Triggered condition evaluation for mail delivery');
      } catch (evalError) {
        console.error('Failed to evaluate conditions:', evalError);
        // Don't fail the request if condition evaluation fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recipientId: recipient.id,
        status: event.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Mail delivery tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process delivery event' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

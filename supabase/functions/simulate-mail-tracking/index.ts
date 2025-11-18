import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimulateTrackingRequest {
  campaignId: string;
}

const EVENT_SEQUENCE = [
  'imb_injected',
  'imb_in_transit',
  'imb_out_for_delivery',
  'imb_delivered'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { campaignId } = await req.json() as SimulateTrackingRequest;

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Simulating mail tracking for campaign: ${campaignId}`);

    // Get campaign details with authorization check
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, client_id, audience_id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign fetch error:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all recipients for the campaign's audience
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('id, address1, city, state, zip')
      .eq('audience_id', campaign.audience_id);

    if (recipientsError || !recipients) {
      console.error('Recipients fetch error:', recipientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing tracking for ${recipients.length} recipients`);

    let deliveredCount = 0;
    let returnedCount = 0;

    // Process each recipient
    for (const recipient of recipients) {
      const random = Math.random();
      
      // 3% return rate
      if (random < 0.03) {
        // Mail returned
        const occurredAt = new Date();
        occurredAt.setDate(occurredAt.getDate() + Math.floor(Math.random() * 7) + 1);

        await supabase.from('events').insert({
          campaign_id: campaignId,
          recipient_id: recipient.id,
          event_type: 'mail_returned',
          event_data_json: {
            reason: 'Undeliverable as addressed',
            return_code: 'UTF',
          },
          occurred_at: occurredAt.toISOString(),
          source: 'usps',
        });

        // Update recipient status
        await supabase
          .from('recipients')
          .update({ 
            validation_status: 'suppressed',
            delivery_status: 'returned'
          })
          .eq('id', recipient.id);

        // Add to suppression list
        await supabase.from('suppressed_addresses').insert({
          client_id: campaign.client_id,
          address1: recipient.address1,
          city: recipient.city,
          state: recipient.state,
          zip: recipient.zip,
          reason: 'returned',
          notes: `Returned from campaign ${campaign.name}`,
        });

        returnedCount++;
      } else if (random < 0.83) {
        // 80% delivery rate - create full event sequence
        const baseDate = new Date();
        
        for (let i = 0; i < EVENT_SEQUENCE.length; i++) {
          const eventDate = new Date(baseDate);
          eventDate.setDate(eventDate.getDate() + i + Math.floor(Math.random() * 2));
          
          await supabase.from('events').insert({
            campaign_id: campaignId,
            recipient_id: recipient.id,
            event_type: EVENT_SEQUENCE[i],
            event_data_json: {
              tracking_code: `IMB${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
              facility: i === 0 ? 'Origin Facility' : i === EVENT_SEQUENCE.length - 1 ? 'Delivered' : 'In Transit',
            },
            occurred_at: eventDate.toISOString(),
            source: 'usps',
          });
        }

        // Update recipient with delivered status
        await supabase
          .from('recipients')
          .update({ delivery_status: 'delivered' })
          .eq('id', recipient.id);

        deliveredCount++;
      }
      // Remaining 17% get no tracking events (still in transit or processing)
    }

    console.log(`Tracking simulation complete: ${deliveredCount} delivered, ${returnedCount} returned`);

    return new Response(
      JSON.stringify({
        success: true,
        totalRecipients: recipients.length,
        deliveredCount,
        returnedCount,
        inTransitCount: recipients.length - deliveredCount - returnedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in simulate-mail-tracking:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

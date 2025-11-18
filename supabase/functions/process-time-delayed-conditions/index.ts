import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Scheduled function to process time-delayed campaign conditions
 * This should be triggered periodically (e.g., every hour) via Supabase cron or external scheduler
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing time-delayed conditions...');

    // Get all active campaigns with time-delayed conditions
    const { data: conditions, error: conditionsError } = await supabase
      .from('campaign_conditions')
      .select('*, campaigns!inner(id, status)')
      .eq('trigger_type', 'time_delayed')
      .eq('campaigns.status', 'active')
      .not('time_delay_hours', 'is', null);

    if (conditionsError) {
      throw conditionsError;
    }

    if (!conditions || conditions.length === 0) {
      console.log('No time-delayed conditions to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No conditions to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${conditions.length} time-delayed conditions to check`);

    let processedCount = 0;
    let errorCount = 0;

    // Process each condition
    for (const condition of conditions) {
      try {
        console.log(`Checking condition ${condition.id} (delay: ${condition.time_delay_hours}h)`);

        // Get recipient statuses where prerequisite is met but this condition isn't
        const { data: statuses, error: statusError } = await supabase
          .from('recipient_condition_status')
          .select('*, recipients!inner(id)')
          .eq('campaign_id', condition.campaign_id)
          .eq('condition_number', condition.condition_number - 1) // Previous condition
          .eq('is_met', true)
          .is('triggered_at', null);

        if (statusError) {
          console.error(`Error fetching statuses for condition ${condition.id}:`, statusError);
          errorCount++;
          continue;
        }

        if (!statuses || statuses.length === 0) {
          console.log(`No recipients ready for condition ${condition.id}`);
          continue;
        }

        console.log(`Checking ${statuses.length} recipients for condition ${condition.id}`);

        // For each recipient, check if enough time has passed
        for (const status of statuses) {
          const metAt = new Date(status.met_at);
          const now = new Date();
          const hoursSinceMet = (now.getTime() - metAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceMet >= condition.time_delay_hours) {
            console.log(`Triggering time-delayed condition for recipient ${status.recipient_id}`);

            // Trigger the condition via evaluate-conditions
            try {
              await supabase.functions.invoke('evaluate-conditions', {
                body: {
                  recipientId: status.recipient_id,
                  campaignId: condition.campaign_id,
                  eventType: 'time_delayed_trigger',
                  metadata: {
                    condition_number: condition.condition_number,
                    hours_delayed: condition.time_delay_hours,
                    prerequisite_met_at: status.met_at,
                  }
                }
              });

              processedCount++;
              console.log(`Successfully triggered condition for recipient ${status.recipient_id}`);
            } catch (evalError) {
              console.error(`Failed to evaluate condition for recipient ${status.recipient_id}:`, evalError);
              errorCount++;
            }
          } else {
            const hoursRemaining = condition.time_delay_hours - hoursSinceMet;
            console.log(`Recipient ${status.recipient_id} needs ${hoursRemaining.toFixed(1)}h more`);
          }
        }

      } catch (conditionError) {
        console.error(`Error processing condition ${condition.id}:`, conditionError);
        errorCount++;
      }
    }

    console.log(`Time-delayed condition processing complete: ${processedCount} triggered, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        totalConditions: conditions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing time-delayed conditions:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process time-delayed conditions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

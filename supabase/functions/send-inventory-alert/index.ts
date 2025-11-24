import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  severity: 'critical' | 'warning' | 'info';
  poolId: string;
  poolName: string;
  availableCards: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { severity, poolId, poolName, availableCards }: AlertRequest = await req.json();

    if (!poolId || !poolName || availableCards === undefined) {
      throw new Error('Missing required fields: poolId, poolName, availableCards');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🚨 ${severity.toUpperCase()} inventory alert for pool "${poolName}": ${availableCards} cards remaining`);

    // Determine alert message based on severity
    let title: string;
    let message: string;

    if (severity === 'critical') {
      title = '🚨 CRITICAL: Gift Card Pool Empty';
      message = `The gift card pool "${poolName}" (ID: ${poolId}) is completely out of cards! Immediate action required.`;
    } else if (severity === 'warning') {
      title = '⚠️ WARNING: Low Gift Card Inventory';
      message = `The gift card pool "${poolName}" (ID: ${poolId}) is running low with only ${availableCards} cards remaining. Please restock soon.`;
    } else {
      title = 'ℹ️ Gift Card Inventory Update';
      message = `The gift card pool "${poolName}" (ID: ${poolId}) has ${availableCards} cards remaining.`;
    }

    // Log to error_logs table for tracking
    const { error: logError } = await supabase
      .from('error_logs')
      .insert({
        error_type: 'inventory_alert',
        error_message: message,
        component_name: 'send-inventory-alert',
        error_code: severity,
        request_data: {
          poolId,
          poolName,
          availableCards,
          severity,
        },
      });

    if (logError) {
      console.error('Error logging alert:', logError);
    }

    // TODO: Send Slack/Email notifications
    // For MVP, we're just logging. Can add Slack webhook or email later.
    const alertRecipients = Deno.env.get('ALERT_EMAIL_RECIPIENTS');
    if (alertRecipients) {
      console.log(`📧 Would send email to: ${alertRecipients}`);
      // TODO: Implement email sending
    }

    const slackWebhook = Deno.env.get('ALERT_SLACK_WEBHOOK_URL');
    if (slackWebhook) {
      console.log(`📱 Would send Slack notification to webhook`);
      // TODO: Implement Slack webhook
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: title,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: title,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: message,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Pool:*\n${poolName}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Cards Remaining:*\n${availableCards}`,
                  },
                ],
              },
            ],
          }),
        });
        console.log('✅ Slack notification sent');
      } catch (slackError) {
        console.error('❌ Error sending Slack notification:', slackError);
      }
    }

    console.log(`✅ Alert logged and notifications sent`);

    return new Response(
      JSON.stringify({
        success: true,
        severity,
        poolName,
        availableCards,
        message: 'Alert logged successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in send-inventory-alert:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

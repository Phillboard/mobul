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

    // Send email notifications to admins
    const alertRecipients = Deno.env.get('ALERT_EMAIL_RECIPIENTS');
    if (alertRecipients) {
      console.log(`📧 Sending email alerts to: ${alertRecipients}`);
      
      try {
        const { Resend } = await import('npm:resend@latest');
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const emailsArray = alertRecipients.split(',').map(e => e.trim());
          
          // Build inventory alert email HTML
          const emailHtml = buildInventoryAlertEmailHtml({
            alertLevel: level,
            poolName,
            brandName: poolData.gift_card_brands?.brand_name || 'Unknown',
            availableCards,
            totalCards: poolData.total_cards || 0,
            cardValue: Number(poolData.card_value || 0),
            poolId,
            dashboardUrl: 'https://app.mobul.com/gift-cards',
          });

          await resend.emails.send({
            from: `${Deno.env.get('FROM_NAME') || 'Mobul'} <${Deno.env.get('FROM_EMAIL') || 'noreply@mobul.com'}>`,
            to: emailsArray,
            subject: `${level.toUpperCase()}: ${title}`,
            html: emailHtml,
          });

          console.log('✅ Email alert sent successfully');
        } else {
          console.log('⚠️ RESEND_API_KEY not configured, skipping email');
        }
      } catch (emailError) {
        console.error('❌ Error sending email alert:', emailError);
        // Don't fail the function if email fails
      }
    }

    const slackWebhook = Deno.env.get('ALERT_SLACK_WEBHOOK_URL');
    if (slackWebhook) {
      console.log(`📱 Sending Slack notification to webhook`);
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

// Helper function to build inventory alert email HTML
function buildInventoryAlertEmailHtml({ alertLevel, poolName, brandName, availableCards, totalCards, cardValue, poolId, dashboardUrl }: any): string {
  const alertConfig = {
    warning: { icon: '⚠️', title: 'Low Inventory Warning', color: '#ffc107', bgColor: '#fff3cd', textColor: '#856404' },
    critical: { icon: '🚨', title: 'Critical Inventory Alert', color: '#dc3545', bgColor: '#f8d7da', textColor: '#721c24' },
    empty: { icon: '❌', title: 'Inventory Depleted', color: '#dc3545', bgColor: '#f8d7da', textColor: '#721c24' },
  };

  const config = alertConfig[alertLevel as keyof typeof alertConfig] || alertConfig.warning;
  const utilization = totalCards > 0 ? ((totalCards - availableCards) / totalCards * 100).toFixed(1) : '0';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inventory Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="padding: 40px 30px; color: #333333; line-height: 1.6;">
          <div style="background-color: ${config.bgColor}; border-left: 4px solid ${config.color}; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: ${config.textColor}; margin-top: 0; font-size: 24px;">
              ${config.icon} ${config.title}
            </h2>
          </div>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">Pool Details</h3>
            <p><strong>Pool:</strong> ${poolName}</p>
            <p><strong>Brand:</strong> ${brandName}</p>
            <p><strong>Card Value:</strong> $${cardValue}</p>
            <p><strong>Available:</strong> ${availableCards} / ${totalCards}</p>
            <p><strong>Utilization:</strong> ${utilization}%</p>
          </div>

          <p style="text-align: center; margin-top: 30px;">
            <a href="${dashboardUrl}/pools/${poolId}" style="display: inline-block; padding: 14px 28px; background-color: ${config.color}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Pool Details
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

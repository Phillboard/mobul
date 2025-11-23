import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface AlertNotificationRequest {
  alertId: string;
  recipientEmails: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { alertId, recipientEmails }: AlertNotificationRequest = await req.json();

    console.log("Fetching alert details for:", alertId);

    // Fetch alert details
    const { data: alert, error: alertError } = await supabase
      .from("system_alerts")
      .select("*")
      .eq("id", alertId)
      .single();

    if (alertError || !alert) {
      console.error("Error fetching alert:", alertError);
      throw new Error("Alert not found");
    }

    console.log("Alert details:", alert);

    // Determine email priority based on severity
    const emailSubject = `[${alert.severity.toUpperCase()}] System Alert: ${alert.title}`;
    const severityColor = alert.severity === "critical" ? "#ef4444" : 
                          alert.severity === "warning" ? "#f59e0b" : "#3b82f6";

    // Send email to each recipient using fetch
    const emailPromises = recipientEmails.map(email =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Mobul ACE Alerts <alerts@updates.mobul.io>",
          to: [email],
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .alert-box { background: white; padding: 20px; border-left: 4px solid ${severityColor}; margin: 20px 0; }
                  .badge { display: inline-block; padding: 4px 12px; background: ${severityColor}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
                  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">⚠️ System Alert</h1>
                  </div>
                  <div class="content">
                    <div class="alert-box">
                      <div style="margin-bottom: 12px;">
                        <span class="badge">${alert.severity}</span>
                        <span style="margin-left: 8px; color: #6b7280; font-size: 14px;">${alert.alert_type}</span>
                      </div>
                      <h2 style="margin: 12px 0;">${alert.title}</h2>
                      <p style="margin: 16px 0; color: #4b5563;">${alert.message}</p>
                      <p style="margin: 16px 0; font-size: 14px; color: #6b7280;">
                        <strong>Occurred at:</strong> ${new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p style="margin-top: 20px;">
                      Please log in to the Mobul ACE platform to acknowledge and resolve this alert.
                    </p>
                  </div>
                  <div class="footer">
                    <p>This is an automated alert from Mobul ACE Platform</p>
                    <p>Do not reply to this email</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      }).then(res => res.json())
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failureCount = results.filter(r => r.status === "rejected").length;

    console.log(`Email notification sent: ${successCount} succeeded, ${failureCount} failed`);

    // Log the notification
    await supabase.from("system_alerts").update({
      notification_sent_at: new Date().toISOString(),
      notification_recipients: recipientEmails,
    }).eq("id", alertId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failureCount 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-alert-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

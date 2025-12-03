/**
 * send-admin-alert
 * 
 * Sends alert emails to admin@mopads.com for important events that require oversight.
 * Currently used when an agent skips SMS verification but gives a positive disposition.
 * 
 * Request body:
 * {
 *   type: 'skipped_verification_positive' | 'suspicious_activity' | 'high_value_redemption',
 *   recipient_id: string,
 *   campaign_id: string,
 *   disposition: string,
 *   agent_id?: string,
 *   customer_name?: string,
 *   customer_code?: string,
 *   additional_info?: object
 * }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Admin email for alerts
const ADMIN_EMAIL = "admin@mopads.com";

interface AlertRequest {
  type: string;
  recipient_id: string;
  campaign_id: string;
  disposition?: string;
  agent_id?: string;
  customer_name?: string;
  customer_code?: string;
  additional_info?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const alertData: AlertRequest = await req.json();

    // Validate required fields
    if (!alertData.type) {
      throw new Error("Alert type is required");
    }
    if (!alertData.recipient_id) {
      throw new Error("recipient_id is required");
    }
    if (!alertData.campaign_id) {
      throw new Error("campaign_id is required");
    }

    console.log(`[SEND-ADMIN-ALERT] Processing ${alertData.type} alert for recipient ${alertData.recipient_id}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Get additional context
    let agentName = "Unknown Agent";
    let campaignName = "Unknown Campaign";
    let clientName = "Unknown Client";

    // Get agent info if available
    if (alertData.agent_id) {
      const { data: agent } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", alertData.agent_id)
        .single();
      
      if (agent) {
        agentName = agent.full_name || agent.email || "Unknown Agent";
      }
    }

    // Get campaign and client info
    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select(`
        name,
        clients (
          name
        )
      `)
      .eq("id", alertData.campaign_id)
      .single();

    if (campaign) {
      campaignName = campaign.name || "Unknown Campaign";
      clientName = (campaign.clients as any)?.name || "Unknown Client";
    }

    // Build email content based on alert type
    let subject = "";
    let alertTitle = "";
    let alertDescription = "";
    let alertColor = "#f59e0b"; // Warning yellow

    switch (alertData.type) {
      case "skipped_verification_positive":
        subject = `⚠️ Alert: Verification Skipped with Positive Disposition`;
        alertTitle = "Skipped Verification - Positive Disposition";
        alertDescription = `An agent skipped SMS verification but marked the call with a positive disposition (gift card will be sent).`;
        alertColor = "#f59e0b";
        break;

      case "suspicious_activity":
        subject = `🚨 Alert: Suspicious Activity Detected`;
        alertTitle = "Suspicious Activity";
        alertDescription = `Potential suspicious activity has been detected that requires review.`;
        alertColor = "#ef4444";
        break;

      case "high_value_redemption":
        subject = `💰 Alert: High Value Redemption`;
        alertTitle = "High Value Redemption";
        alertDescription = `A high-value gift card redemption has been processed.`;
        alertColor = "#3b82f6";
        break;

      default:
        subject = `📢 Alert: ${alertData.type}`;
        alertTitle = alertData.type;
        alertDescription = `An alert of type "${alertData.type}" has been triggered.`;
    }

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6;">
  <div style="background: ${alertColor}; padding: 20px 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">🔔 ${alertTitle}</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px; color: #4b5563;">${alertDescription}</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 40%;">Agent</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${agentName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Customer</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${alertData.customer_name || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Customer Code</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-family: monospace; font-size: 14px;">${alertData.customer_code || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Disposition</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${alertData.disposition || 'N/A'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Campaign</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${campaignName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Client</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${clientName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; font-weight: 600; color: #374151;">Timestamp</td>
        <td style="padding: 12px; color: #4b5563;">${timestamp} ET</td>
      </tr>
    </table>

    ${alertData.additional_info ? `
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #374151;">Additional Information</h3>
      <pre style="margin: 0; font-size: 12px; color: #4b5563; white-space: pre-wrap; word-break: break-word;">${JSON.stringify(alertData.additional_info, null, 2)}</pre>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${Deno.env.get("APP_URL") || ''}/call-center" 
         style="background: #374151; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600;
                font-size: 14px;
                display: inline-block;">
        View in Call Center
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0; text-align: center;">
      This is an automated alert from the Mobul ACE Marketing Platform.
    </p>
  </div>
</body>
</html>
    `;

    // Send email via the send-email function (non-blocking)
    let emailSent = false;
    try {
      const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: ADMIN_EMAIL,
          subject: subject,
          html: emailHtml,
          from: Deno.env.get("EMAIL_FROM") || 'alerts@mopads.com',
        }
      });

      if (emailError) {
        console.warn("[SEND-ADMIN-ALERT] Email send warning:", emailError);
      } else {
        emailSent = true;
        console.log("[SEND-ADMIN-ALERT] Email sent successfully");
      }
    } catch (emailErr) {
      console.warn("[SEND-ADMIN-ALERT] Email send failed (non-critical):", emailErr);
    }

    // Log the alert to database
    const { error: logError } = await supabaseAdmin.from("admin_alerts").insert({
      alert_type: alertData.type,
      recipient_id: alertData.recipient_id,
      campaign_id: alertData.campaign_id,
      agent_id: alertData.agent_id || null,
      disposition: alertData.disposition || null,
      customer_name: alertData.customer_name || null,
      customer_code: alertData.customer_code || null,
      additional_info: alertData.additional_info || null,
      sent_to: ADMIN_EMAIL,
    });

    // Don't fail if logging fails, just warn
    if (logError) {
      console.warn("[SEND-ADMIN-ALERT] Failed to log alert (table may not exist):", logError);
    }

    console.log(`[SEND-ADMIN-ALERT] Alert processed for ${ADMIN_EMAIL} (email_sent: ${emailSent})`);

    return new Response(JSON.stringify({
      success: true,
      message: emailSent ? "Admin alert sent" : "Admin alert logged (email service unavailable)",
      sent_to: ADMIN_EMAIL,
      email_sent: emailSent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SEND-ADMIN-ALERT] Error:", errorMessage);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


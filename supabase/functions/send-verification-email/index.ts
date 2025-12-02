/**
 * send-verification-email
 * 
 * Sends a verification email with a link for the customer to verify their identity.
 * Alternative to SMS opt-in for customers who prefer email.
 * 
 * Request body:
 * {
 *   recipient_id: string,
 *   campaign_id: string,
 *   email: string,
 *   client_name: string,
 *   recipient_name?: string
 * }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_id, campaign_id, email, client_name, recipient_name } = await req.json();

    // Validate required fields
    if (!recipient_id) {
      throw new Error("recipient_id is required");
    }
    if (!campaign_id) {
      throw new Error("campaign_id is required");
    }
    if (!email) {
      throw new Error("email is required");
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new Error("Invalid email format");
    }

    console.log(`[SEND-VERIFICATION-EMAIL] Sending verification to ${email} for recipient ${recipient_id}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Generate a unique verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Get the app URL for verification link
    const appUrl = Deno.env.get("APP_URL") || Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '');
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}&recipient=${recipient_id}`;

    // Update recipient with verification token
    const { error: updateError } = await supabaseAdmin
      .from("recipients")
      .update({
        email_verification_token: verificationToken,
        email_verification_sent_at: new Date().toISOString(),
        verification_method: 'email',
      })
      .eq("id", recipient_id);

    if (updateError) {
      console.error("[SEND-VERIFICATION-EMAIL] Failed to update recipient:", updateError);
      throw new Error("Failed to save verification token");
    }

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Email Verification</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 18px; margin-bottom: 10px;">Hi ${recipient_name || 'there'},</p>
    
    <p>You're receiving this email from <strong>${client_name || 'our team'}</strong> to verify your identity and proceed with your gift card reward.</p>
    
    <p>Please click the button below to verify your email address:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 14px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600;
                font-size: 16px;
                display: inline-block;">
        Verify My Email
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verificationLink}" style="color: #667eea; word-break: break-all;">${verificationLink}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    
    <p style="font-size: 12px; color: #999; margin-bottom: 0;">
      This verification link expires in 24 hours. If you didn't request this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>
    `;

    // Send email via the send-email function
    const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: email,
        subject: `Verify Your Email - ${client_name || 'Gift Card Reward'}`,
        html: emailHtml,
        from: Deno.env.get("EMAIL_FROM") || 'noreply@mopads.com',
      }
    });

    if (emailError) {
      console.error("[SEND-VERIFICATION-EMAIL] Email send error:", emailError);
      throw new Error("Failed to send verification email");
    }

    console.log(`[SEND-VERIFICATION-EMAIL] Email sent successfully to ${email}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Verification email sent",
      email: email,
      expires_at: expiresAt,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SEND-VERIFICATION-EMAIL] Error:", errorMessage);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, // 'admin_notification' | 'user_confirmation'
      formId, 
      submissionData,
      userEmail,
      giftCardDetails 
    } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get form and client details
    const { data: form } = await supabase
      .from('ace_forms')
      .select(`
        *,
        clients (
          id,
          name,
          logo_url
        )
      `)
      .eq('id', formId)
      .single();

    if (!form) {
      throw new Error('Form not found');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured, skipping email notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Email notifications not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'user_confirmation' && userEmail) {
      // Send confirmation email to user
      const emailContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
            ${form.clients?.logo_url ? `<img src="${form.clients.logo_url}" alt="${form.clients.name}" style="max-width: 120px; margin-bottom: 20px;">` : ''}
            <h1 style="color: white; margin: 0;">Thank You!</h1>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Your submission has been received</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for submitting the form "${form.name}". We've received your information and will get back to you soon.
            </p>
            
            ${giftCardDetails ? `
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">🎁 Your Gift Card</h3>
                <p style="color: #666; margin: 10px 0;"><strong>Code:</strong> ${giftCardDetails.card_code}</p>
                <p style="color: #666; margin: 10px 0;"><strong>Value:</strong> $${giftCardDetails.card_value}</p>
                <p style="color: #666; margin: 10px 0;"><strong>Brand:</strong> ${giftCardDetails.brand_name}</p>
                ${giftCardDetails.redemption_instructions ? `
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                    <p style="color: #666; font-size: 14px; margin: 0;">${giftCardDetails.redemption_instructions}</p>
                  </div>
                ` : ''}
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="color: #999; font-size: 14px; margin: 0;">
                This is an automated message from ${form.clients?.name || 'our system'}
              </p>
            </div>
          </div>
        </div>
      `;

      // Send email via Resend
      try {
        const { Resend } = await import('npm:resend@latest');
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        
        if (!resendApiKey) {
          console.log('RESEND_API_KEY not configured, skipping email');
          return new Response(
            JSON.stringify({ success: true, message: 'Email not sent - provider not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const resend = new Resend(resendApiKey);
        const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@mobulace.com';
        const fromName = form.clients?.name || 'Mobul ACE';

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [userEmail],
          subject: `Thank you for submitting ${form.name}`,
          html: emailContent,
        });

        if (emailError) {
          console.error('Failed to send email:', emailError);
        } else {
          console.log('✅ Confirmation email sent successfully:', emailResult);
          
          // Log email delivery
          await supabase.from('email_delivery_logs').insert({
            recipient_email: userEmail,
            subject: `Thank you for submitting ${form.name}`,
            template_name: 'form-submission-confirmation',
            delivery_status: 'sent',
            provider_message_id: emailResult?.id,
            form_id: formId,
            client_id: form.client_id,
            metadata_json: { giftCardIncluded: !!giftCardDetails },
          });
        }
      } catch (emailSendError) {
        console.error('Error sending email:', emailSendError);
        // Continue even if email fails
      }
    }

    if (type === 'admin_notification') {
      // Send notification to admin/client owner
      // In a real implementation, you'd get admin emails from the client settings
      console.log('Would send admin notification for form:', formId);
      console.log('Submission data:', submissionData);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

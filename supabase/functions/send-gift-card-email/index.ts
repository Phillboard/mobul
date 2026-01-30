import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@latest';
import { createActivityLogger } from '../_shared/activity-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendGiftCardEmailRequest {
  giftCardId: string;
  recipientEmail: string;
  recipientName?: string;
  giftCardCode?: string;
  giftCardValue?: number;
  brandName?: string;
  brandLogoUrl?: string;
  redemptionInstructions?: string;
  balanceCheckUrl?: string;
  clientId?: string;
  recipientId?: string;
  campaignId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const activityLogger = createActivityLogger(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);

    const {
      giftCardId,
      recipientEmail,
      recipientName,
      giftCardCode: providedCode,
      giftCardValue: providedValue,
      brandName: providedBrandName,
      brandLogoUrl: providedLogoUrl,
      redemptionInstructions: providedInstructions,
      balanceCheckUrl: providedBalanceUrl,
      clientId,
      recipientId,
      campaignId,
    }: SendGiftCardEmailRequest = await req.json();

    console.log('Sending gift card email:', { giftCardId, recipientEmail });

    // Fetch gift card details if not provided
    let giftCardCode = providedCode;
    let giftCardValue = providedValue;
    let brandName = providedBrandName;
    let brandLogoUrl = providedLogoUrl;
    let redemptionInstructions = providedInstructions;
    let balanceCheckUrl = providedBalanceUrl;
    let finalClientId = clientId;

    if (!giftCardCode || !giftCardValue) {
      const { data: giftCard, error: giftCardError } = await supabaseClient
        .from('gift_cards')
        .select(`
          *,
          gift_card_pools!inner(
            card_value,
            provider,
            client_id,
            gift_card_brands(
              brand_name,
              logo_url,
              balance_check_url,
              redemption_instructions
            )
          )
        `)
        .eq('id', giftCardId)
        .single();

      if (giftCardError || !giftCard) {
        throw new Error(`Gift card not found: ${giftCardError?.message || 'Unknown error'}`);
      }

      giftCardCode = giftCard.card_code;
      giftCardValue = Number(giftCard.gift_card_pools.card_value);
      brandName = giftCard.gift_card_pools.gift_card_brands?.brand_name || giftCard.gift_card_pools.provider;
      brandLogoUrl = giftCard.gift_card_pools.gift_card_brands?.logo_url;
      balanceCheckUrl = giftCard.gift_card_pools.gift_card_brands?.balance_check_url;
      redemptionInstructions = giftCard.gift_card_pools.gift_card_brands?.redemption_instructions;
      finalClientId = giftCard.gift_card_pools.client_id;
    }

    // Get client details for branding
    let clientName = 'Mobul ACE';
    let clientLogoUrl;

    if (finalClientId) {
      const { data: client } = await supabaseClient
        .from('clients')
        .select('name, logo_url')
        .eq('id', finalClientId)
        .single();

      if (client) {
        clientName = client.name;
        clientLogoUrl = client.logo_url;
      }
    }

    // Build email HTML using template
    const emailHtml = buildGiftCardEmailHtml({
      recipientName,
      giftCardCode,
      giftCardValue,
      brandName,
      brandLogoUrl,
      redemptionInstructions,
      balanceCheckUrl,
      clientName,
      clientLogoUrl,
    });

    // Get from email settings
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@mobulace.com';
    const fromName = Deno.env.get('FROM_NAME') || clientName;

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject: `Your $${giftCardValue} ${brandName} Gift Card`,
      html: emailHtml,
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log('Email sent successfully:', emailResult);

    // Log activity
    await activityLogger.giftCard('email_sent', 'success', {
      clientId: finalClientId || undefined,
      campaignId: campaignId || undefined,
      recipientId: recipientId || undefined,
      description: `Gift card email sent to ${recipientEmail}`,
      metadata: {
        gift_card_id: giftCardId,
        brand_name: brandName,
        card_value: giftCardValue,
        email_id: emailResult?.id,
      },
    });

    // Log email delivery
    const { error: logError } = await supabaseClient
      .from('email_delivery_logs')
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject: `Your $${giftCardValue} ${brandName} Gift Card`,
        template_name: 'gift-card-delivery',
        delivery_status: 'sent',
        provider_message_id: emailResult?.id,
        gift_card_id: giftCardId,
        recipient_id: recipientId,
        campaign_id: campaignId,
        client_id: finalClientId,
        email_body_html: emailHtml,
        metadata_json: {
          brandName,
          giftCardValue,
          resendId: emailResult?.id,
        },
      });

    if (logError) {
      console.error('Failed to log email delivery:', logError);
    }

    // Update gift card deliveries table if exists
    if (recipientId) {
      const { error: deliveryError } = await supabaseClient
        .from('gift_card_deliveries')
        .insert({
          gift_card_id: giftCardId,
          recipient_id: recipientId,
          campaign_id: campaignId,
          delivery_method: 'email',
          delivery_address: recipientEmail,
          delivery_status: 'sent',
          delivered_at: new Date().toISOString(),
        });

      if (deliveryError) {
        console.error('Failed to log gift card delivery:', deliveryError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: emailResult?.id,
        recipientEmail,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending gift card email:', error);

    // Log failure
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const requestData = await req.json();
      await supabaseClient.from('email_delivery_logs').insert({
        recipient_email: requestData.recipientEmail,
        subject: `Gift Card Delivery - Failed`,
        template_name: 'gift-card-delivery',
        delivery_status: 'failed',
        error_message: error.message,
        gift_card_id: requestData.giftCardId,
        metadata_json: { error: error.message },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Email HTML template builder
function buildGiftCardEmailHtml({
  recipientName,
  giftCardCode,
  giftCardValue,
  brandName,
  brandLogoUrl,
  redemptionInstructions,
  balanceCheckUrl,
  clientName,
  clientLogoUrl,
}: any): string {
  const greeting = recipientName ? `Dear ${recipientName}` : 'Hello';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${clientName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <div style="display: none; max-height: 0; overflow: hidden;">Your $${giftCardValue} ${brandName} gift card is here!</div>
      
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          ${clientLogoUrl ? `<img src="${clientLogoUrl}" alt="${clientName}" style="max-width: 150px; margin-bottom: 20px;" />` : ''}
          <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0;">${clientName}</h1>
        </div>
        
        <div style="padding: 40px 30px; color: #333333; line-height: 1.6;">
          <h2 style="color: #333; margin-top: 0;">🎁 Your Gift Card is Ready!</h2>
          
          <p style="font-size: 16px; color: #555;">
            ${greeting},<br><br>
            Congratulations! You've received a <strong>$${giftCardValue} ${brandName}</strong> gift card.
          </p>

          ${brandLogoUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <img src="${brandLogoUrl}" alt="${brandName}" style="max-width: 200px; height: auto;" />
            </div>
          ` : ''}

          <div style="background-color: #e9ecef; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; margin: 20px 0;">
            ${giftCardCode}
          </div>

          <p style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 10px;">
            Your Gift Card Code
          </p>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">Gift Card Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6c757d;">Brand:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">${brandName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d;">Value:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #333;">$${giftCardValue}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d;">Code:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #667eea; font-family: monospace;">${giftCardCode}</td>
              </tr>
            </table>
          </div>

          ${redemptionInstructions ? `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404; font-size: 16px;">📋 How to Redeem</h3>
              <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
                ${redemptionInstructions}
              </p>
            </div>
          ` : ''}

          ${balanceCheckUrl ? `
            <p style="text-align: center; margin-top: 30px;">
              <a href="${balanceCheckUrl}" style="display: inline-block; padding: 14px 28px; background-color: #28a745; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
                Check Balance
              </a>
            </p>
          ` : ''}

          <p style="font-size: 14px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
            <strong>Important:</strong> Keep this code safe. Anyone with this code can use your gift card.
            Take a screenshot or save this email for your records.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 14px; margin: 5px 0;">© ${new Date().getFullYear()} ${clientName}. All rights reserved.</p>
          <p style="color: #6c757d; font-size: 14px; margin: 5px 0;">This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}


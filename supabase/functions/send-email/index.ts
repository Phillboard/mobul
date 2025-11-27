import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailOptions: EmailOptions = await req.json();
    
    // Get email provider from environment
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'resend'; // resend, sendgrid, ses
    const apiKey = Deno.env.get('EMAIL_API_KEY') || Deno.env.get('RESEND_API_KEY');
    
    if (!apiKey) {
      console.error('❌ No email API key configured');
      // For now, log the email instead of failing
      console.log('📧 Email would be sent:', {
        to: emailOptions.to,
        subject: emailOptions.subject,
        preview: emailOptions.text?.substring(0, 100) || emailOptions.html?.substring(0, 100),
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          messageId: `mock-${crypto.randomUUID()}`,
          note: 'Email API not configured - logged instead',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    // Send via configured provider
    switch (emailProvider) {
      case 'resend':
        result = await sendViaResend(emailOptions, apiKey);
        break;
      case 'sendgrid':
        result = await sendViaSendGrid(emailOptions, apiKey);
        break;
      case 'ses':
        result = await sendViaSES(emailOptions, apiKey);
        break;
      default:
        throw new Error(`Unknown email provider: ${emailProvider}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Send email via Resend
 */
async function sendViaResend(options: EmailOptions, apiKey: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from || 'noreply@your-domain.com',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Resend API error');
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    provider: 'resend',
  };
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(options: EmailOptions, apiKey: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: Array.isArray(options.to) 
          ? options.to.map(email => ({ email }))
          : [{ email: options.to }],
      }],
      from: { email: options.from || 'noreply@your-domain.com' },
      subject: options.subject,
      content: [
        { type: 'text/html', value: options.html || '' },
        { type: 'text/plain', value: options.text || '' },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.message || 'SendGrid API error');
  }

  return {
    success: true,
    messageId: response.headers.get('x-message-id'),
    provider: 'sendgrid',
  };
}

/**
 * Send email via AWS SES
 */
async function sendViaSES(options: EmailOptions, apiKey: string) {
  // AWS SES implementation would go here
  // Requires AWS SDK and more complex setup
  throw new Error('AWS SES not yet implemented');
}


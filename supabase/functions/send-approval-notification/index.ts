import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { approvalId, action, notes } = await req.json();

    console.log('Processing approval notification:', { approvalId, action });

    // Get approval details with campaign and user info
    const { data: approval, error: approvalError } = await supabase
      .from('campaign_approvals')
      .select(`
        *,
        campaign:campaigns(name, created_by_user_id),
        user:profiles(full_name, email)
      `)
      .eq('id', approvalId)
      .single();

    if (approvalError) throw approvalError;

    // Get campaign owner profile
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', approval.campaign.created_by_user_id)
      .single();

    if (ownerError) throw ownerError;

    // Log notification event (in production, send actual email here)
    console.log('Approval notification would be sent:', {
      to: ownerProfile.email,
      subject: `Campaign ${action}: ${approval.campaign.name}`,
      approver: approval.user.full_name,
      action,
      notes,
    });

    // In production, integrate with email service like Resend
    // Example:
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    // await resend.emails.send({
    //   from: 'notifications@yourdomain.com',
    //   to: ownerProfile.email,
    //   subject: `Campaign ${action}: ${approval.campaign.name}`,
    //   html: `...email template...`
    // });

    return new Response(
      JSON.stringify({ success: true, notificationSent: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending approval notification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

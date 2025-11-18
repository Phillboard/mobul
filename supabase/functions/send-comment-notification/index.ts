import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { campaignId, comment, mentions } = await req.json();

    console.log('Processing comment notification:', { campaignId, mentions });

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('name, created_by_user_id')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;

    // Get commenter profile
    const { data: commenter, error: commenterError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (commenterError) throw commenterError;

    // Process @mentions and get mentioned users
    const mentionedEmails: string[] = [];
    if (mentions && mentions.length > 0) {
      // Extract usernames from mentions (remove @ symbol)
      const usernames = mentions.map((m: string) => m.replace('@', ''));
      
      // In production, you'd look up users by username/email
      console.log('Mentioned users:', usernames);
      
      // For now, just log (in production, fetch actual user emails)
    }

    // Log notification event (in production, send actual emails here)
    console.log('Comment notification would be sent:', {
      campaign: campaign.name,
      commenter: commenter.full_name,
      comment,
      mentions: mentionedEmails,
    });

    // In production, integrate with email service like Resend
    // Example:
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    // for (const email of mentionedEmails) {
    //   await resend.emails.send({
    //     from: 'notifications@yourdomain.com',
    //     to: email,
    //     subject: `${commenter.full_name} mentioned you in ${campaign.name}`,
    //     html: `...email template with comment...`
    //   });
    // }

    return new Response(
      JSON.stringify({ success: true, notificationsSent: mentionedEmails.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending comment notification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

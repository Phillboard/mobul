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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phoneNumberId } = await req.json();

    console.log('Releasing Twilio number:', phoneNumberId);

    // Get the tracked number
    const { data: trackedNumber, error: fetchError } = await supabaseClient
      .from('tracked_phone_numbers')
      .select('*')
      .eq('id', phoneNumberId)
      .single();

    if (fetchError || !trackedNumber) {
      throw new Error('Phone number not found');
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Release the number from Twilio
    const releaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${trackedNumber.twilio_sid}.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const releaseResponse = await fetch(releaseUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!releaseResponse.ok && releaseResponse.status !== 404) {
      const errorData = await releaseResponse.json();
      console.error('Twilio release error:', errorData);
      throw new Error(`Failed to release number from Twilio: ${errorData.message}`);
    }

    console.log('Number released from Twilio');

    // Update database status
    const { error: updateError } = await supabaseClient
      .from('tracked_phone_numbers')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        campaign_id: null,
      })
      .eq('id', phoneNumberId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error releasing Twilio number:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

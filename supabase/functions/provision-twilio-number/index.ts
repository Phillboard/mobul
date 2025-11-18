import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProvisionNumberRequest {
  areaCode?: string;
  campaignId?: string;
  friendlyName?: string;
  forwardToNumber?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      areaCode,
      campaignId,
      friendlyName,
      forwardToNumber,
    }: ProvisionNumberRequest = await req.json();

    console.log('Provisioning Twilio number:', { areaCode, campaignId });

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Search for available phone numbers
    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/US/Local.json?${areaCode ? `AreaCode=${areaCode}` : 'Limit=1'}`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok || !searchData.available_phone_numbers?.length) {
      throw new Error(`No available phone numbers found${areaCode ? ` for area code ${areaCode}` : ''}`);
    }

    const availableNumber = searchData.available_phone_numbers[0];
    console.log('Found available number:', availableNumber.phone_number);

    // Purchase the phone number
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;
    
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-incoming-call`;
    const statusCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-call-status`;

    const purchaseResponse = await fetch(purchaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        PhoneNumber: availableNumber.phone_number,
        FriendlyName: friendlyName || `ACE Marketing - ${availableNumber.phone_number}`,
        VoiceUrl: webhookUrl,
        VoiceMethod: 'POST',
        StatusCallback: statusCallbackUrl,
        StatusCallbackMethod: 'POST',
      }),
    });

    const purchaseData = await purchaseResponse.json();

    if (!purchaseResponse.ok) {
      console.error('Twilio purchase error:', purchaseData);
      throw new Error(`Failed to purchase number: ${purchaseData.message}`);
    }

    console.log('Number purchased successfully:', purchaseData.sid);

    // Get campaign's client_id if campaignId provided
    let clientId = null;
    if (campaignId) {
      const { data: campaign } = await supabaseClient
        .from('campaigns')
        .select('client_id')
        .eq('id', campaignId)
        .single();
      
      clientId = campaign?.client_id;
    }

    // Store in database
    const { data: trackedNumber, error: dbError } = await supabaseClient
      .from('tracked_phone_numbers')
      .insert({
        phone_number: purchaseData.phone_number,
        twilio_sid: purchaseData.sid,
        campaign_id: campaignId || null,
        client_id: clientId,
        status: campaignId ? 'assigned' : 'available',
        friendly_name: friendlyName || purchaseData.friendly_name,
        forward_to_number: forwardToNumber || null,
        recording_enabled: true,
        monthly_cost: 1.15, // Twilio's standard local number cost
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        phoneNumber: trackedNumber,
        twilioData: purchaseData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error provisioning Twilio number:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignNumberRequest {
  campaignId: string;
  clientId: string;
  provisionNew?: boolean;
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

    const { campaignId, clientId, provisionNew = false }: AssignNumberRequest = await req.json();

    console.log('Assigning tracked number for campaign:', campaignId);

    // Check if Twilio is configured
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPoolSid = Deno.env.get('TWILIO_PHONE_NUMBER_POOL_SID');

    if (!twilioSid || !twilioToken) {
      console.warn('Twilio credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Twilio credentials not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets.',
          requiresSetup: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (provisionNew && twilioPoolSid) {
      // Provision a new number from Twilio
      console.log('Provisioning new number from Twilio pool');
      
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            PhoneNumberSid: twilioPoolSid,
            VoiceUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-incoming-call`,
            VoiceMethod: 'POST',
            StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-call-status`,
            StatusCallbackMethod: 'POST',
          }).toString(),
        }
      );

      if (!twilioResponse.ok) {
        const error = await twilioResponse.text();
        console.error('Twilio provisioning error:', error);
        throw new Error(`Failed to provision number from Twilio: ${error}`);
      }

      const twilioData = await twilioResponse.json();
      
      // Store the new number in database
      const { data: newNumber, error: insertError } = await supabaseClient
        .from('tracked_phone_numbers')
        .insert({
          client_id: clientId,
          phone_number: twilioData.phone_number,
          twilio_sid: twilioData.sid,
          campaign_id: campaignId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log('New number provisioned and assigned:', newNumber.phone_number);
      return new Response(
        JSON.stringify({ success: true, number: newNumber }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Assign an existing available number
      const { data: availableNumber, error: fetchError } = await supabaseClient
        .from('tracked_phone_numbers')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'available')
        .limit(1)
        .single();

      if (fetchError || !availableNumber) {
        console.log('No available numbers found');
        return new Response(
          JSON.stringify({ 
            error: 'No available phone numbers. Please provision a new number.',
            requiresProvisioning: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Update number status to assigned
      const { data: assignedNumber, error: updateError } = await supabaseClient
        .from('tracked_phone_numbers')
        .update({
          campaign_id: campaignId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .eq('id', availableNumber.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Update Twilio webhook URLs if Twilio is configured
      if (twilioSid && twilioToken && assignedNumber.twilio_sid) {
        console.log('Updating Twilio webhooks for number:', assignedNumber.phone_number);
        
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers/${assignedNumber.twilio_sid}.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              VoiceUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-incoming-call`,
              VoiceMethod: 'POST',
              StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-call-status`,
              StatusCallbackMethod: 'POST',
            }).toString(),
          }
        );
      }

      console.log('Number assigned to campaign:', assignedNumber.phone_number);
      return new Response(
        JSON.stringify({ success: true, number: assignedNumber }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in assign-tracked-numbers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

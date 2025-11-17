import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingWebhookPayload {
  action: string;
  data: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get('client_id');
    const secret = url.searchParams.get('secret');

    if (!clientId || !secret) {
      return new Response(
        JSON.stringify({ error: 'Missing client_id or secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify client and secret
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, api_key_hash')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client verification failed:', clientError);
      return new Response(
        JSON.stringify({ error: 'Invalid client' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple secret verification (in production, use HMAC signature)
    const expectedSecret = client.api_key_hash?.substring(0, 32);
    if (secret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json() as IncomingWebhookPayload;
    console.log('Incoming webhook action:', payload.action);

    let result;

    switch (payload.action) {
      case 'create_contact': {
        const { data: contact, error } = await supabase
          .from('recipients')
          .insert({
            client_id: clientId,
            first_name: payload.data.first_name,
            last_name: payload.data.last_name,
            email: payload.data.email,
            phone: payload.data.phone,
            address1: payload.data.address1,
            city: payload.data.city,
            state: payload.data.state,
            zip: payload.data.zip,
          })
          .select()
          .single();

        if (error) throw error;
        result = { contact_id: contact.id };
        break;
      }

      case 'update_contact': {
        if (!payload.data.contact_id) {
          throw new Error('contact_id is required');
        }

        const { error } = await supabase
          .from('recipients')
          .update({
            first_name: payload.data.first_name,
            last_name: payload.data.last_name,
            email: payload.data.email,
            phone: payload.data.phone,
          })
          .eq('id', payload.data.contact_id)
          .eq('client_id', clientId);

        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'add_to_audience': {
        if (!payload.data.audience_id || !payload.data.contact_id) {
          throw new Error('audience_id and contact_id are required');
        }

        const { error } = await supabase
          .from('recipients')
          .update({ audience_id: payload.data.audience_id })
          .eq('id', payload.data.contact_id)
          .eq('client_id', clientId);

        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'log_activity': {
        const { error } = await supabase
          .from('events')
          .insert({
            campaign_id: payload.data.campaign_id,
            recipient_id: payload.data.recipient_id,
            event_type: 'zapier_action',
            source: 'zapier',
            event_data_json: payload.data,
          });

        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${payload.action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('Incoming webhook processed successfully');

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing incoming webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

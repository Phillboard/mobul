import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadFormData {
  campaignId: string;
  recipientId: string;
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  appointmentRequested?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.json() as LeadFormData;
    
    const { campaignId, recipientId, fullName, email, phone, message, appointmentRequested } = formData;

    if (!campaignId || !recipientId || !fullName || !email) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID, recipient ID, full name, and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing lead form submission: campaign=${campaignId}, recipient=${recipientId}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipient) {
      console.error('Recipient verification error:', recipientError);
      return new Response(
        JSON.stringify({ error: 'Invalid recipient' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert lead record
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        full_name: fullName,
        email: email,
        phone: phone || null,
        message: message || null,
        appointment_requested: appointmentRequested || false,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead insert error:', leadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save lead' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log form submission event
    const { error: eventError } = await supabase.from('events').insert({
      campaign_id: campaignId,
      recipient_id: recipientId,
      event_type: 'form_submitted',
      event_data_json: {
        full_name: fullName,
        email: email,
        phone: phone || null,
        appointment_requested: appointmentRequested || false,
        lead_id: lead.id,
      },
      source: 'form',
    });

    if (eventError) {
      console.error('Event logging error:', eventError);
    }

    console.log(`Lead form submitted successfully: lead_id=${lead.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        message: 'Thank you for your interest! We will contact you shortly.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-lead-form:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

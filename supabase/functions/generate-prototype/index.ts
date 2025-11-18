import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    const { campaignId } = await req.json();

    // Get campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        templates (*),
        audiences (*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;

    // Generate prototype configuration
    const prototypeConfig = {
      campaignName: campaign.name,
      size: campaign.size,
      template: campaign.templates,
      lpMode: campaign.lp_mode,
      baseLpUrl: campaign.base_lp_url,
      utmParams: {
        source: campaign.utm_source,
        medium: campaign.utm_medium,
        campaign: campaign.utm_campaign,
      },
      sampleRecipient: {
        firstName: 'John',
        lastName: 'Doe',
        company: 'Sample Company',
        address: '123 Main St, Anytown, CA 12345',
      },
      generatedAt: new Date().toISOString(),
    };

    // Save or update prototype
    const { data: existing } = await supabase
      .from('campaign_prototypes')
      .select('id')
      .eq('campaign_id', campaignId)
      .single();

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('campaign_prototypes')
        .update({
          prototype_config_json: prototypeConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, prototype: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Insert
      const { data, error } = await supabase
        .from('campaign_prototypes')
        .insert({
          campaign_id: campaignId,
          prototype_config_json: prototypeConfig,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, prototype: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error generating prototype:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

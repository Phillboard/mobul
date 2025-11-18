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

    const { campaignId, changeDescription } = await req.json();

    // Get current campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;

    // Get current max version number
    const { data: versions, error: versionsError } = await supabase
      .from('campaign_versions')
      .select('version_number')
      .eq('campaign_id', campaignId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionsError) throw versionsError;

    const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

    // Save version
    const { data, error } = await supabase
      .from('campaign_versions')
      .insert({
        campaign_id: campaignId,
        version_number: nextVersion,
        snapshot_json: campaign,
        created_by_user_id: user.id,
        change_description: changeDescription,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Campaign version ${nextVersion} saved for campaign ${campaignId}`);

    return new Response(JSON.stringify({ success: true, version: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving version:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

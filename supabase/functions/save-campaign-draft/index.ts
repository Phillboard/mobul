import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const { draftId, clientId, draftName, formData, currentStep } = await req.json();

    if (draftId) {
      // Update existing draft
      const { data, error } = await supabase
        .from('campaign_drafts')
        .update({
          form_data_json: formData,
          current_step: currentStep,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, draft: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('campaign_drafts')
        .insert({
          client_id: clientId,
          user_id: user.id,
          draft_name: draftName || 'Untitled Draft',
          form_data_json: formData,
          current_step: currentStep,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, draft: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

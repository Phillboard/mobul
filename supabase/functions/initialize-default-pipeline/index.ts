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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { client_id } = await req.json();

    if (!client_id) {
      throw new Error('client_id is required');
    }

    // Check if client already has a pipeline
    const { data: existingPipelines } = await supabase
      .from('pipelines')
      .select('id')
      .eq('client_id', client_id)
      .limit(1);

    if (existingPipelines && existingPipelines.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Pipeline already exists', pipeline_id: existingPipelines[0].id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create default sales pipeline
    const defaultStages = [
      { id: 'lead', name: 'Lead', probability: 10, order: 0 },
      { id: 'qualified', name: 'Qualified', probability: 25, order: 1 },
      { id: 'proposal', name: 'Proposal', probability: 50, order: 2 },
      { id: 'negotiation', name: 'Negotiation', probability: 75, order: 3 },
      { id: 'closed_won', name: 'Closed Won', probability: 100, order: 4 },
    ];

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .insert([{
        client_id,
        pipeline_name: 'Sales Pipeline',
        entity_type: 'deal',
        is_default: true,
        stages: defaultStages,
        sync_enabled: false,
      }])
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, pipeline }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

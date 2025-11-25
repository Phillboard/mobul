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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchId, deleteAll } = await req.json();

    console.log('🗑️ Starting cleanup:', { batchId, deleteAll });

    let deletedCount = 0;

    const tables = [
      'call_conditions_met',
      'gift_card_deliveries',
      'call_sessions',
      'campaign_reward_configs',
      'campaign_conditions',
      'tracked_phone_numbers',
      'recipients',
      'gift_cards',
      'gift_card_pools',
      'contacts',
    ];

    for (const table of tables) {
      let query = supabase.from(table).delete();

      if (batchId) {
        query = query.eq('simulation_batch_id', batchId);
      } else if (deleteAll) {
        query = query.eq('is_simulated', true);
      }

      const { error, count } = await query;
      
      if (!error && count) {
        deletedCount += count;
        console.log(`  ✓ Deleted ${count} records from ${table}`);
      }
    }

    // Delete batch record if specific batch
    if (batchId) {
      await supabase.from('simulation_batches').delete().eq('id', batchId);
    } else if (deleteAll) {
      await supabase.from('simulation_batches').delete().eq('status', 'completed');
    }

    console.log(`✅ Cleanup complete: ${deletedCount} records deleted`);

    return new Response(JSON.stringify({ deletedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

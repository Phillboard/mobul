import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

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

    console.log('🧹 Starting stuck gift cards cleanup...');

    // Call the database function to cleanup stuck cards
    const { data, error } = await supabase.rpc('cleanup_stuck_gift_cards');

    if (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }

    const cleanedCount = data?.[0]?.cleaned_count || 0;
    const cardIds = data?.[0]?.card_ids || [];

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} stuck gift cards`);
      console.log('Card IDs:', cardIds);
    } else {
      console.log('✅ No stuck gift cards found');
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleanedCount,
        cardIds,
        message: cleanedCount > 0 
          ? `Successfully released ${cleanedCount} stuck cards back to pool`
          : 'No stuck cards found',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in cleanup-stuck-gift-cards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

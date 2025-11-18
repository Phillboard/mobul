import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { poolId, recipientId, callSessionId } = await req.json();
    
    if (!poolId) {
      throw new Error("poolId is required");
    }

    console.log(`[CLAIM-AND-PROVISION] Attempting to claim card for pool: ${poolId}`);

    // Try to claim from CSV inventory first
    try {
      const { data, error } = await supabaseClient.rpc('claim_available_card', {
        p_pool_id: poolId,
        p_recipient_id: recipientId,
        p_call_session_id: callSessionId
      });

      if (error) {
        // Check if error indicates API provisioning needed
        if (error.message && error.message.includes('API_PROVISIONING_REQUIRED')) {
          console.log('[CLAIM-AND-PROVISION] CSV empty, using API fallback');
          const apiProvider = error.message.split(':')[1];
          
          // Call provision-gift-card-from-api function
          const provisionResponse = await supabaseClient.functions.invoke('provision-gift-card-from-api', {
            body: { poolId, recipientId, callSessionId }
          });

          if (provisionResponse.error) {
            throw new Error(`API provisioning failed: ${provisionResponse.error.message}`);
          }

          return new Response(JSON.stringify(provisionResponse.data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        throw error;
      }

      // Successfully claimed from CSV
      console.log('[CLAIM-AND-PROVISION] Claimed from CSV inventory');
      return new Response(JSON.stringify({
        success: true,
        card: data[0]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (claimError) {
      throw claimError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CLAIM-AND-PROVISION] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
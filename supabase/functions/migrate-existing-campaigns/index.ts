import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-time migration function to grandfather existing campaigns
 * This allows existing campaigns to continue working without the new requirements
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify user has admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Unauthorized: Only admins can run migration");
    }

    console.log(`[MIGRATE-CAMPAIGNS] Admin ${user.id} starting migration`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all existing campaigns
    const { data: campaigns, error: fetchError } = await supabaseAdmin
      .from("campaigns")
      .select("id, name, audience_id, created_at, requires_codes, reward_pool_id");

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[MIGRATE-CAMPAIGNS] Found ${campaigns?.length || 0} campaigns`);

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const campaign of campaigns || []) {
      try {
        // Skip if already migrated
        if (campaign.requires_codes === false) {
          skippedCount++;
          continue;
        }

        const updates: any = {
          requires_codes: false, // Grandfather them - don't require codes
          editable_after_publish: true, // Allow editing
          codes_uploaded: !!campaign.audience_id, // Set based on whether audience exists
        };

        // Try to set reward pool from campaign_reward_configs if not already set
        if (!campaign.reward_pool_id) {
          const { data: rewardConfig } = await supabaseAdmin
            .from("campaign_reward_configs")
            .select("gift_card_pool_id")
            .eq("campaign_id", campaign.id)
            .order("condition_number")
            .limit(1)
            .single();

          if (rewardConfig?.gift_card_pool_id) {
            updates.reward_pool_id = rewardConfig.gift_card_pool_id;
            updates.rewards_enabled = true;
            updates.reward_condition = "call_completed"; // Default for legacy campaigns
          }
        }

        // Update campaign
        const { error: updateError } = await supabaseAdmin
          .from("campaigns")
          .update(updates)
          .eq("id", campaign.id);

        if (updateError) {
          errors.push(`${campaign.name}: ${updateError.message}`);
        } else {
          migratedCount++;
          console.log(`[MIGRATE-CAMPAIGNS] Migrated: ${campaign.name}`);
        }
      } catch (err) {
        errors.push(`${campaign.name}: ${err.message}`);
      }
    }

    const result = {
      success: true,
      total_campaigns: campaigns?.length || 0,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors,
      message: `Migration complete. ${migratedCount} campaigns grandfathered, ${skippedCount} already migrated.`,
    };

    console.log("[MIGRATE-CAMPAIGNS] Result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[MIGRATE-CAMPAIGNS] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});


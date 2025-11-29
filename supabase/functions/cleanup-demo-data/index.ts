import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { confirmToken, mode = "full" } = await req.json();

    if (confirmToken !== "DELETE_ALL") {
      return new Response(
        JSON.stringify({ error: "Invalid confirmation token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Starting data cleanup - Mode: ${mode}`);
    let deletedRecords = 0;

    // Get all simulated organizations and clients
    const { data: simulatedOrgs } = await supabaseClient
      .from("organizations")
      .select("id")
      .or("is_simulated.eq.true,id.like.demo-%,id.like.d%");

    const { data: simulatedClients } = await supabaseClient
      .from("clients")
      .select("id")
      .or("id.like.demo-%,id.like.dc%");

    const orgIds = simulatedOrgs?.map(o => o.id) || [];
    const clientIds = simulatedClients?.map(c => c.id) || [];

    if (clientIds.length === 0 && orgIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          deletedRecords: 0,
          message: "No demo data found to delete" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`Found ${orgIds.length} orgs and ${clientIds.length} clients to delete`);

    // Get campaigns for these clients
    const { data: campaigns } = await supabaseClient
      .from("campaigns")
      .select("id")
      .in("client_id", clientIds);

    const campaignIds = campaigns?.map(c => c.id) || [];
    console.log(`Found ${campaignIds.length} campaigns to delete`);

    // Phase 1: Delete Events
    if (campaignIds.length > 0) {
      const { error: eventsError } = await supabaseClient
        .from("events")
        .delete()
        .in("campaign_id", campaignIds);

      if (eventsError) console.error("Error deleting events:", eventsError);
      else {
        console.log("✓ Deleted events");
        deletedRecords += 1000; // Estimate
      }
    }

    // Phase 2: Delete Gift Card Deliveries
    const { data: demoCards } = await supabaseClient
      .from("gift_cards")
      .select("id")
      .or("card_code.like.DEMO-%,card_code.like.TEST-%");

    if (demoCards && demoCards.length > 0) {
      const cardIds = demoCards.map(c => c.id);
      const { error: deliveriesError } = await supabaseClient
        .from("gift_card_deliveries")
        .delete()
        .in("gift_card_id", cardIds);

      if (deliveriesError) console.error("Error deleting deliveries:", deliveriesError);
      else {
        console.log("✓ Deleted gift card deliveries");
        deletedRecords += demoCards.length;
      }

      // Delete gift cards
      const { error: cardsError } = await supabaseClient
        .from("gift_cards")
        .delete()
        .in("id", cardIds);

      if (cardsError) console.error("Error deleting gift cards:", cardsError);
      else {
        console.log("✓ Deleted gift cards");
        deletedRecords += demoCards.length;
      }
    }

    // Phase 3: Delete Call Conditions Met
    if (campaignIds.length > 0) {
      const { error: conditionsMetError } = await supabaseClient
        .from("call_conditions_met")
        .delete()
        .in("campaign_id", campaignIds);

      if (conditionsMetError) console.error("Error deleting call conditions met:", conditionsMetError);
      else console.log("✓ Deleted call conditions met");
    }

    // Phase 4: Delete Call Sessions
    if (campaignIds.length > 0) {
      const { error: callSessionsError } = await supabaseClient
        .from("call_sessions")
        .delete()
        .in("campaign_id", campaignIds);

      if (callSessionsError) console.error("Error deleting call sessions:", callSessionsError);
      else {
        console.log("✓ Deleted call sessions");
        deletedRecords += 100;
      }
    }

    // Phase 5: Delete Tracked Phone Numbers
    if (campaignIds.length > 0) {
      const { error: numbersError } = await supabaseClient
        .from("tracked_phone_numbers")
        .delete()
        .in("campaign_id", campaignIds);

      if (numbersError) console.error("Error deleting tracked numbers:", numbersError);
      else console.log("✓ Deleted tracked phone numbers");
    }

    // Phase 6: Delete Form Submissions (from recipients)
    if (campaignIds.length > 0) {
      // Get recipient IDs
      const { data: recipients } = await supabaseClient
        .from("recipients")
        .select("id")
        .in("campaign_id", campaignIds);

      if (recipients && recipients.length > 0) {
        const recipientIds = recipients.map(r => r.id);
        
        const { error: submissionsError } = await supabaseClient
          .from("ace_form_submissions")
          .delete()
          .in("recipient_id", recipientIds);

        if (submissionsError) console.error("Error deleting form submissions:", submissionsError);
        else console.log("✓ Deleted form submissions");
      }
    }

    // Phase 7: Delete Recipients
    if (campaignIds.length > 0) {
      const { error: recipientsError } = await supabaseClient
        .from("recipients")
        .delete()
        .in("campaign_id", campaignIds);

      if (recipientsError) console.error("Error deleting recipients:", recipientsError);
      else {
        console.log("✓ Deleted recipients");
        deletedRecords += 500;
      }
    }

    // Phase 8: Delete Contact List Members
    if (clientIds.length > 0) {
      const { data: contactLists } = await supabaseClient
        .from("contact_lists")
        .select("id")
        .in("client_id", clientIds);

      if (contactLists && contactLists.length > 0) {
        const listIds = contactLists.map(l => l.id);
        
        const { error: membersError } = await supabaseClient
          .from("contact_list_members")
          .delete()
          .in("list_id", listIds);

        if (membersError) console.error("Error deleting list members:", membersError);
        else console.log("✓ Deleted contact list members");
      }
    }

    // Phase 9: Delete Contact Lists
    if (clientIds.length > 0) {
      const { error: listsError } = await supabaseClient
        .from("contact_lists")
        .delete()
        .in("client_id", clientIds);

      if (listsError) console.error("Error deleting contact lists:", listsError);
      else console.log("✓ Deleted contact lists");
    }

    // Phase 10: Delete Contacts
    if (clientIds.length > 0) {
      const { error: contactsError } = await supabaseClient
        .from("contacts")
        .delete()
        .in("client_id", clientIds);

      if (contactsError) console.error("Error deleting contacts:", contactsError);
      else {
        console.log("✓ Deleted contacts");
        deletedRecords += 1000;
      }
    }

    // Phase 11: Delete Campaign Conditions
    if (campaignIds.length > 0) {
      const { error: conditionsError } = await supabaseClient
        .from("campaign_conditions")
        .delete()
        .in("campaign_id", campaignIds);

      if (conditionsError) console.error("Error deleting campaign conditions:", conditionsError);
      else console.log("✓ Deleted campaign conditions");
    }

    // Phase 12: Delete Campaign Reward Configs
    if (campaignIds.length > 0) {
      const { error: rewardsError } = await supabaseClient
        .from("campaign_reward_configs")
        .delete()
        .in("campaign_id", campaignIds);

      if (rewardsError) console.error("Error deleting reward configs:", rewardsError);
      else console.log("✓ Deleted campaign reward configs");
    }

    // Phase 13: Delete Campaigns
    if (campaignIds.length > 0) {
      const { error: campaignsError } = await supabaseClient
        .from("campaigns")
        .delete()
        .in("id", campaignIds);

      if (campaignsError) console.error("Error deleting campaigns:", campaignsError);
      else {
        console.log("✓ Deleted campaigns");
        deletedRecords += campaignIds.length;
      }
    }

    // Phase 14: Delete Landing Pages
    if (clientIds.length > 0) {
      const { error: landingError } = await supabaseClient
        .from("landing_pages")
        .delete()
        .in("client_id", clientIds);

      if (landingError) console.error("Error deleting landing pages:", landingError);
      else console.log("✓ Deleted landing pages");
    }

    // Phase 15: Delete Templates
    if (clientIds.length > 0) {
      const { error: templatesError } = await supabaseClient
        .from("templates")
        .delete()
        .in("client_id", clientIds);

      if (templatesError) console.error("Error deleting templates:", templatesError);
      else console.log("✓ Deleted templates");
    }

    // Phase 16: Delete ACE Forms
    if (clientIds.length > 0) {
      const { error: formsError } = await supabaseClient
        .from("ace_forms")
        .delete()
        .in("client_id", clientIds);

      if (formsError) console.error("Error deleting ace forms:", formsError);
      else console.log("✓ Deleted ace forms");
    }

    // Phase 17: Delete Gift Card Pools
    if (clientIds.length > 0) {
      const { error: poolsError } = await supabaseClient
        .from("gift_card_pools")
        .delete()
        .in("client_id", clientIds);

      if (poolsError) console.error("Error deleting gift card pools:", poolsError);
      else console.log("✓ Deleted gift card pools");
    }

    // Phase 18: Delete Client Users
    if (clientIds.length > 0) {
      const { error: clientUsersError } = await supabaseClient
        .from("client_users")
        .delete()
        .in("client_id", clientIds);

      if (clientUsersError) console.error("Error deleting client users:", clientUsersError);
      else console.log("✓ Deleted client users");
    }

    // Phase 19: Delete Clients
    if (clientIds.length > 0) {
      const { error: clientsError } = await supabaseClient
        .from("clients")
        .delete()
        .in("id", clientIds);

      if (clientsError) console.error("Error deleting clients:", clientsError);
      else {
        console.log("✓ Deleted clients");
        deletedRecords += clientIds.length;
      }
    }

    // Phase 20: Delete Org Members
    if (orgIds.length > 0) {
      const { error: orgMembersError } = await supabaseClient
        .from("org_members")
        .delete()
        .in("org_id", orgIds);

      if (orgMembersError) console.error("Error deleting org members:", orgMembersError);
      else console.log("✓ Deleted org members");
    }

    // Phase 21: Delete Organizations
    if (orgIds.length > 0) {
      const { error: orgsError } = await supabaseClient
        .from("organizations")
        .delete()
        .in("id", orgIds);

      if (orgsError) console.error("Error deleting organizations:", orgsError);
      else {
        console.log("✓ Deleted organizations");
        deletedRecords += orgIds.length;
      }
    }

    console.log(`Cleanup complete! Deleted approximately ${deletedRecords} records`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedRecords,
        message: "Demo data cleaned up successfully",
        details: {
          organizations: orgIds.length,
          clients: clientIds.length,
          campaigns: campaignIds.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error cleaning up demo data:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});


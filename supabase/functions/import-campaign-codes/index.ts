import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CodeRow {
  code: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ImportRequest {
  campaignId: string;
  clientId: string;
  campaignName: string;
  codes: CodeRow[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { campaignId, clientId, campaignName, codes } = await req.json() as ImportRequest;

    console.log(`[IMPORT-CODES] Starting import for campaign ${campaignId}: ${codes.length} codes`);

    // ====================================================================
    // Step 1: Check for existing codes in database
    // ====================================================================
    const codesToCheck = codes.map(c => c.code.toUpperCase());
    
    const { data: existingCodes, error: checkError } = await supabaseClient
      .from('recipients')
      .select('redemption_code')
      .in('redemption_code', codesToCheck);

    if (checkError) {
      console.error('[IMPORT-CODES] Error checking existing codes:', checkError);
      throw new Error(`Failed to check existing codes: ${checkError.message}`);
    }

    const existingCodeSet = new Set(existingCodes?.map(r => r.redemption_code) || []);
    const uniqueCodes = codes.filter(c => !existingCodeSet.has(c.code.toUpperCase()));

    console.log(`[IMPORT-CODES] ${uniqueCodes.length} unique codes (${codes.length - uniqueCodes.length} duplicates skipped)`);

    if (uniqueCodes.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'All codes already exist in the system. Please use unique codes.',
          duplicates_skipped: codes.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // ====================================================================
    // Step 2: Create or match contacts
    // ====================================================================
    const contactsToUpsert = uniqueCodes
      .filter(c => c.email) // Only upsert if email is provided
      .map(c => ({
        client_id: clientId,
        email: c.email!.toLowerCase(),
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        phone: c.phone || null,
        address: c.address || null,
        city: c.city || null,
        state: c.state || null,
        zip: c.zip || null,
      }));

    let contactIdMap = new Map<string, string>();
    let contactsCreated = 0;
    let contactsMatched = 0;

    if (contactsToUpsert.length > 0) {
      console.log(`[IMPORT-CODES] Upserting ${contactsToUpsert.length} contacts`);

      const { data: upsertedContacts, error: contactError } = await supabaseClient
        .from('contacts')
        .upsert(contactsToUpsert, {
          onConflict: 'client_id,email',
          ignoreDuplicates: false
        })
        .select('id, email');

      if (contactError) {
        console.error('[IMPORT-CODES] Error upserting contacts:', contactError);
        throw new Error(`Failed to create contacts: ${contactError.message}`);
      }

      // Build map of email -> contact_id
      upsertedContacts?.forEach(contact => {
        contactIdMap.set(contact.email.toLowerCase(), contact.id);
      });

      // Check which were new vs existing
      const { data: existingContacts } = await supabaseClient
        .from('contacts')
        .select('email')
        .eq('client_id', clientId)
        .in('email', contactsToUpsert.map(c => c.email));

      contactsMatched = existingContacts?.length || 0;
      contactsCreated = upsertedContacts!.length - contactsMatched;

      console.log(`[IMPORT-CODES] Contacts: ${contactsCreated} created, ${contactsMatched} matched`);
    }

    // ====================================================================
    // Step 3: Create audience for this campaign
    // ====================================================================
    const audienceName = `${campaignName} - Recipients`;
    
    const { data: audience, error: audienceError } = await supabaseClient
      .from('audiences')
      .insert({
        client_id: clientId,
        campaign_id: campaignId,
        name: audienceName,
        total_count: uniqueCodes.length,
        source_type: 'csv_upload'
      })
      .select('id')
      .single();

    if (audienceError) {
      console.error('[IMPORT-CODES] Error creating audience:', audienceError);
      throw new Error(`Failed to create audience: ${audienceError.message}`);
    }

    console.log(`[IMPORT-CODES] Created audience ${audience.id}`);

    // ====================================================================
    // Step 4: Create recipients with codes
    // ====================================================================
    const recipients = uniqueCodes.map(c => ({
      audience_id: audience.id,
      campaign_id: campaignId,
      contact_id: c.email ? contactIdMap.get(c.email.toLowerCase()) || null : null,
      redemption_code: c.code.toUpperCase(),
      first_name: c.first_name || null,
      last_name: c.last_name || null,
      email: c.email || null,
      phone: c.phone || null,
      address: c.address || null,
      city: c.city || null,
      state: c.state || null,
      zip: c.zip || null,
      status: 'pending',
      approval_status: 'approved' // Auto-approve for CSV imports
    }));

    const { error: recipientsError } = await supabaseClient
      .from('recipients')
      .insert(recipients);

    if (recipientsError) {
      console.error('[IMPORT-CODES] Error creating recipients:', recipientsError);
      throw new Error(`Failed to create recipients: ${recipientsError.message}`);
    }

    console.log(`[IMPORT-CODES] Created ${recipients.length} recipients`);

    // ====================================================================
    // Step 5: Link audience to campaign
    // ====================================================================
    const { error: updateError } = await supabaseClient
      .from('campaigns')
      .update({
        audience_id: audience.id,
        codes_uploaded: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('[IMPORT-CODES] Error updating campaign:', updateError);
      throw new Error(`Failed to link audience to campaign: ${updateError.message}`);
    }

    // ====================================================================
    // Step 6: Return success summary
    // ====================================================================
    const result = {
      success: true,
      audience_id: audience.id,
      recipients_created: recipients.length,
      contacts_created: contactsCreated,
      contacts_matched: contactsMatched,
      duplicates_skipped: codes.length - uniqueCodes.length
    };

    console.log('[IMPORT-CODES] Import complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[IMPORT-CODES] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});


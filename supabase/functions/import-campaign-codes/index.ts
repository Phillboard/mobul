/**
 * Import Campaign Codes Edge Function
 * 
 * Imports redemption codes for a campaign, creating recipients and
 * optionally linking to contacts. Creates an audience automatically.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { type ImportResult } from '../_shared/import-export-utils.ts';

// ============================================================================
// Types
// ============================================================================

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

interface ImportCampaignCodesRequest {
  campaignId: string;
  clientId: string;
  campaignName: string;
  codes: CodeRow[];
}

interface ImportCampaignCodesResponse extends ImportResult {
  audience_id?: string;
  recipients_created: number;
  contacts_created: number;
  contacts_matched: number;
  duplicates_skipped: number;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleImportCampaignCodes(
  request: ImportCampaignCodesRequest,
  context: AuthContext
): Promise<ImportCampaignCodesResponse> {
  const supabase = createServiceClient();

  const { campaignId, clientId, campaignName, codes } = request;

  if (!campaignId || !clientId || !codes || !Array.isArray(codes)) {
    throw new ApiError('campaignId, clientId, and codes array are required', 'VALIDATION_ERROR', 400);
  }

  console.log(`[IMPORT-CODES] Starting import for campaign ${campaignId}: ${codes.length} codes`);

  // Check for existing codes in database
  const codesToCheck = codes.map(c => c.code.toUpperCase());

  const { data: existingCodes, error: checkError } = await supabase
    .from('recipients')
    .select('redemption_code')
    .in('redemption_code', codesToCheck);

  if (checkError) {
    console.error('[IMPORT-CODES] Error checking existing codes:', checkError);
    throw new ApiError(`Failed to check existing codes: ${checkError.message}`, 'DATABASE_ERROR', 500);
  }

  const existingCodeSet = new Set(existingCodes?.map(r => r.redemption_code) || []);
  const uniqueCodes = codes.filter(c => !existingCodeSet.has(c.code.toUpperCase()));
  const duplicatesSkipped = codes.length - uniqueCodes.length;

  console.log(`[IMPORT-CODES] ${uniqueCodes.length} unique codes (${duplicatesSkipped} duplicates skipped)`);

  if (uniqueCodes.length === 0) {
    return {
      success: false,
      imported: 0,
      failed: codes.length,
      skipped: duplicatesSkipped,
      errors: [{
        row: 0,
        message: 'All codes already exist in the system. Please use unique codes.',
      }],
      recipients_created: 0,
      contacts_created: 0,
      contacts_matched: 0,
      duplicates_skipped: duplicatesSkipped,
    };
  }

  // Create or match contacts for codes with email
  const contactsToUpsert = uniqueCodes
    .filter(c => c.email)
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

  const contactIdMap = new Map<string, string>();
  let contactsCreated = 0;
  let contactsMatched = 0;

  if (contactsToUpsert.length > 0) {
    console.log(`[IMPORT-CODES] Upserting ${contactsToUpsert.length} contacts`);

    const { data: upsertedContacts, error: contactError } = await supabase
      .from('contacts')
      .upsert(contactsToUpsert, {
        onConflict: 'client_id,email',
        ignoreDuplicates: false,
      })
      .select('id, email');

    if (contactError) {
      console.error('[IMPORT-CODES] Error upserting contacts:', contactError);
      throw new ApiError(`Failed to create contacts: ${contactError.message}`, 'DATABASE_ERROR', 500);
    }

    // Build map of email -> contact_id
    upsertedContacts?.forEach(contact => {
      contactIdMap.set(contact.email.toLowerCase(), contact.id);
    });

    // Check which were new vs existing
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('email')
      .eq('client_id', clientId)
      .in('email', contactsToUpsert.map(c => c.email));

    contactsMatched = existingContacts?.length || 0;
    contactsCreated = (upsertedContacts?.length || 0) - contactsMatched;

    console.log(`[IMPORT-CODES] Contacts: ${contactsCreated} created, ${contactsMatched} matched`);
  }

  // Create audience for this campaign
  const audienceName = `${campaignName} - Recipients`;

  const { data: audience, error: audienceError } = await supabase
    .from('audiences')
    .insert({
      client_id: clientId,
      name: audienceName,
      total_count: uniqueCodes.length,
      source: 'csv',
      status: 'ready',
    })
    .select('id')
    .single();

  if (audienceError) {
    console.error('[IMPORT-CODES] Error creating audience:', audienceError);
    throw new ApiError(`Failed to create audience: ${audienceError.message}`, 'DATABASE_ERROR', 500);
  }

  console.log(`[IMPORT-CODES] Created audience ${audience.id}`);

  // Create recipients with codes
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
    approval_status: 'approved', // Auto-approve for CSV imports
  }));

  const { error: recipientsError } = await supabase
    .from('recipients')
    .insert(recipients);

  if (recipientsError) {
    console.error('[IMPORT-CODES] Error creating recipients:', recipientsError);
    throw new ApiError(`Failed to create recipients: ${recipientsError.message}`, 'DATABASE_ERROR', 500);
  }

  console.log(`[IMPORT-CODES] Created ${recipients.length} recipients`);

  // Link audience to campaign
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      audience_id: audience.id,
      codes_uploaded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (updateError) {
    console.error('[IMPORT-CODES] Error updating campaign:', updateError);
    throw new ApiError(`Failed to link audience to campaign: ${updateError.message}`, 'DATABASE_ERROR', 500);
  }

  console.log('[IMPORT-CODES] Import complete');

  return {
    success: true,
    imported: recipients.length,
    failed: 0,
    skipped: duplicatesSkipped,
    errors: [],
    audience_id: audience.id,
    recipients_created: recipients.length,
    contacts_created: contactsCreated,
    contacts_matched: contactsMatched,
    duplicates_skipped: duplicatesSkipped,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleImportCampaignCodes, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'import_campaign_codes',
}));

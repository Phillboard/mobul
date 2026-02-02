/**
 * Import Contacts Edge Function
 * 
 * Imports contacts from a JSON array with unique code validation.
 * Supports optional list and tag assignments.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  validators,
  type ValidationError,
  type ImportResult,
} from '../_shared/import-export-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface ContactImportRow {
  unique_code: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  company?: string;
  job_title?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lifecycle_stage?: string;
  lead_source?: string;
  lead_score?: number;
  do_not_contact?: boolean;
  email_opt_out?: boolean;
  sms_opt_out?: boolean;
  notes?: string;
  [key: string]: unknown;
}

interface ImportContactsRequest {
  client_id: string;
  contacts: ContactImportRow[];
  list_id?: string;
  tags?: string[];
}

interface ImportContactsResponse extends ImportResult {
  successful: number;
  skipped: number;
  imported_count: number;
  first_errors?: Array<{ row: number; error: string; code?: string }>;
  total_errors?: number;
}

// ============================================================================
// Constants
// ============================================================================

const STANDARD_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'mobile_phone',
  'company', 'job_title', 'address', 'address2', 'city', 'state',
  'zip', 'country', 'lifecycle_stage', 'lead_source', 'lead_score',
  'do_not_contact', 'email_opt_out', 'sms_opt_out', 'notes'
];

// ============================================================================
// Main Handler
// ============================================================================

async function handleImportContacts(
  request: ImportContactsRequest,
  context: AuthContext
): Promise<ImportContactsResponse> {
  const supabase = createServiceClient();

  const { client_id, contacts, list_id, tags } = request;

  // Validate required fields
  if (!client_id || !contacts || !Array.isArray(contacts)) {
    throw new ApiError('client_id and contacts array required', 'VALIDATION_ERROR', 400);
  }

  // Verify user has access
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('user_can_access_client', {
      _user_id: context.user.id,
      _client_id: client_id,
    });

  if (accessError || !hasAccess) {
    throw new ApiError('No access to this client', 'FORBIDDEN', 403);
  }

  console.log(`[IMPORT-CONTACTS] Starting import of ${contacts.length} contacts`);

  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const errors: ValidationError[] = [];
  const importedContactIds: string[] = [];

  // Process each contact
  for (let i = 0; i < contacts.length; i++) {
    const row = contacts[i];
    const rowNumber = i + 1;

    try {
      // Validate unique code
      const codeError = validators.uniqueCode(row.unique_code, rowNumber);
      if (codeError) {
        errors.push(codeError);
        failed++;
        continue;
      }

      const uniqueCode = String(row.unique_code).trim().toUpperCase();

      // Check if contact already exists
      const { data: existingContact, error: checkError } = await supabase
        .from('contacts')
        .select('id')
        .eq('client_id', client_id)
        .eq('customer_code', uniqueCode)
        .maybeSingle();

      if (checkError) {
        errors.push({
          row: rowNumber,
          message: checkError.message,
          code: uniqueCode,
        });
        failed++;
        continue;
      }

      if (existingContact) {
        console.log(`[IMPORT-CONTACTS] Skipping existing code: ${uniqueCode}`);
        skipped++;
        continue;
      }

      // Prepare contact data
      const contactData: Record<string, unknown> = {
        client_id,
        customer_code: uniqueCode,
        created_by_user_id: context.user.id,
        country: 'US',
        lifecycle_stage: 'lead',
        lead_score: 0,
      };

      // Extract standard fields
      for (const field of STANDARD_FIELDS) {
        if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
          let value = row[field];

          // Convert string booleans
          if (field.includes('opt_out') || field === 'do_not_contact') {
            if (typeof value === 'string') {
              value = value.toLowerCase() === 'true' || value === '1';
            }
          }

          // Convert lead_score to number
          if (field === 'lead_score' && typeof value === 'string') {
            const parsed = parseInt(value, 10);
            value = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
          }

          contactData[field] = value;
        }
      }

      // Extract custom fields
      const customFields: Record<string, unknown> = {};
      for (const key of Object.keys(row)) {
        if (key !== 'unique_code' && !STANDARD_FIELDS.includes(key)) {
          customFields[key] = row[key];
        }
      }

      if (Object.keys(customFields).length > 0) {
        contactData.custom_fields = customFields;
      }

      // Insert contact
      const { data: insertedContact, error: insertError } = await supabase
        .from('contacts')
        .insert(contactData)
        .select('id')
        .single();

      if (insertError) {
        let friendlyError = insertError.message;
        if (insertError.message.includes('customer_code_format_check')) {
          friendlyError = 'Invalid code format';
        } else if (insertError.message.includes('duplicate key')) {
          friendlyError = `Duplicate code: "${uniqueCode}"`;
        }

        errors.push({
          row: rowNumber,
          message: friendlyError,
          code: uniqueCode,
        });
        failed++;
        continue;
      }

      if (insertedContact) {
        importedContactIds.push(insertedContact.id);
      }
      successful++;

      // Progress logging
      if (rowNumber % 100 === 0) {
        console.log(`[IMPORT-CONTACTS] Processed ${rowNumber}/${contacts.length}...`);
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  // Add contacts to list if specified
  if (list_id && importedContactIds.length > 0) {
    console.log(`[IMPORT-CONTACTS] Adding ${importedContactIds.length} contacts to list ${list_id}`);

    const listMembers = importedContactIds.map(contactId => ({
      contact_id: contactId,
      list_id,
      added_by_user_id: context.user.id,
    }));

    const { error: listError } = await supabase
      .from('contact_list_members')
      .insert(listMembers);

    if (listError) {
      console.error('[IMPORT-CONTACTS] Error adding to list:', listError);
    } else {
      await supabase.rpc('update_list_contact_count', { list_id });
    }
  }

  // Add tags if specified
  if (tags && Array.isArray(tags) && tags.length > 0 && importedContactIds.length > 0) {
    console.log(`[IMPORT-CONTACTS] Adding tags to ${importedContactIds.length} contacts`);

    const tagRecords = importedContactIds.flatMap(contactId =>
      tags.map(tag => ({
        contact_id: contactId,
        tag,
        created_by_user_id: context.user.id,
      }))
    );

    const { error: tagError } = await supabase
      .from('contact_tags')
      .insert(tagRecords);

    if (tagError) {
      console.error('[IMPORT-CONTACTS] Error adding tags:', tagError);
    }
  }

  console.log(`[IMPORT-CONTACTS] Complete: ${successful} success, ${failed} failed, ${skipped} skipped`);

  const result: ImportContactsResponse = {
    success: successful > 0 || errors.length === 0,
    imported: successful,
    failed,
    skipped,
    errors: errors.slice(0, 100),
    successful,
    imported_count: importedContactIds.length,
  };

  if (errors.length > 0) {
    result.first_errors = errors.slice(0, 5).map(e => ({
      row: e.row,
      error: e.message,
      code: e.code,
    }));
    result.total_errors = errors.length;
  }

  return result;
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleImportContacts, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'import_contacts',
}));

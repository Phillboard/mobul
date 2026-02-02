/**
 * Import Audience Edge Function
 * 
 * Imports recipients from a CSV file to create an audience.
 * Validates addresses, generates unique tokens, and processes in batches.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import {
  parseCSV,
  validateRows,
  validators,
  generateUniqueTokens,
  validateFileSize,
  FILE_SIZE_LIMITS,
  type ValidationError,
  type ImportResult,
} from '../_shared/import-export-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface RecipientRow {
  first_name?: string;
  last_name?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  email?: string;
  phone?: string;
}

interface ImportAudienceResponse extends ImportResult {
  audience_id?: string;
  audience_name?: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
}

// ============================================================================
// Validation
// ============================================================================

function validateRecipientRow(row: RecipientRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  const address1Error = validators.required(row.address1, 'address1', rowNumber);
  if (address1Error) errors.push(address1Error);

  const cityError = validators.required(row.city, 'city', rowNumber);
  if (cityError) errors.push(cityError);

  const stateError = validators.required(row.state, 'state', rowNumber);
  if (stateError) errors.push(stateError);

  const zipError = validators.required(row.zip, 'zip', rowNumber);
  if (zipError) {
    errors.push(zipError);
  } else {
    const zipFormatError = validators.zipCode(row.zip, rowNumber);
    if (zipFormatError) errors.push(zipFormatError);
  }

  if (row.email) {
    const emailError = validators.email(row.email, rowNumber);
    if (emailError) errors.push(emailError);
  }

  return errors;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleImportAudience(
  _request: unknown,
  context: AuthContext,
  rawRequest: Request
): Promise<ImportAudienceResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('import-audience', rawRequest);

  // Parse multipart form data
  const formData = await rawRequest.formData();
  const file = formData.get('file') as File | null;
  const clientId = formData.get('client_id') as string;
  const audienceName = formData.get('audience_name') as string;

  // Validate required fields
  if (!file) {
    throw new ApiError('Missing required file', 'VALIDATION_ERROR', 400);
  }

  if (!clientId) {
    throw new ApiError('Missing client_id', 'VALIDATION_ERROR', 400);
  }

  if (!audienceName || audienceName.trim().length === 0) {
    throw new ApiError('Audience name is required', 'VALIDATION_ERROR', 400);
  }

  if (audienceName.length > 100) {
    throw new ApiError('Audience name must be less than 100 characters', 'VALIDATION_ERROR', 400);
  }

  // Validate file size
  const sizeError = validateFileSize(file.size, FILE_SIZE_LIMITS.CSV_IMPORT);
  if (sizeError) {
    throw new ApiError(sizeError.message, 'FILE_TOO_LARGE', 400);
  }

  // Verify user has access to this client
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('user_can_access_client', {
      _user_id: context.user.id,
      _client_id: clientId,
    });

  if (accessError || !hasAccess) {
    throw new ApiError('No access to this client', 'FORBIDDEN', 403);
  }

  console.log(`[IMPORT-AUDIENCE] Processing: ${file.name} (${file.size} bytes)`);

  // Read and parse CSV
  const content = await file.text();
  const { rows, errors: parseErrors } = parseCSV<RecipientRow>(content, {
    requiredHeaders: ['address1', 'city', 'state', 'zip'],
  });

  if (parseErrors.length > 0) {
    return {
      success: false,
      imported: 0,
      failed: rows.length,
      skipped: 0,
      errors: parseErrors,
      total_rows: rows.length,
      valid_rows: 0,
      invalid_rows: rows.length,
    };
  }

  if (rows.length === 0) {
    throw new ApiError('No data found in file', 'VALIDATION_ERROR', 400);
  }

  // Validate all rows
  const { validRows, errors: validationErrors } = validateRows(rows, validateRecipientRow);

  // Create audience record
  const { data: audience, error: audienceError } = await supabase
    .from('audiences')
    .insert({
      client_id: clientId,
      name: audienceName.trim(),
      source: 'import',
      total_count: rows.length,
      valid_count: validRows.length,
      invalid_count: rows.length - validRows.length,
      status: 'processing',
      hygiene_json: {
        file_name: file.name,
        file_size: file.size,
        imported_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (audienceError || !audience) {
    console.error('[IMPORT-AUDIENCE] Error creating audience:', audienceError);
    throw new ApiError(`Failed to create audience: ${audienceError?.message}`, 'DATABASE_ERROR', 500);
  }

  // Generate unique tokens
  const tokens = generateUniqueTokens(validRows.length);

  // Insert recipients in batches
  const batchSize = 1000;
  let insertedCount = 0;
  const insertErrors: ValidationError[] = [];

  for (let i = 0; i < validRows.length; i += batchSize) {
    const batch = validRows.slice(i, i + batchSize);
    const batchTokens = tokens.slice(i, i + batchSize);

    const recipients = batch.map((row, index) => ({
      audience_id: audience.id,
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      company: row.company || null,
      address1: row.address1,
      address2: row.address2 || null,
      city: row.city,
      state: row.state,
      zip: row.zip,
      email: row.email || null,
      phone: row.phone || null,
      token: batchTokens[index],
      validation_status: 'valid',
    }));

    const { error: insertError } = await supabase
      .from('recipients')
      .insert(recipients);

    if (insertError) {
      console.error(`[IMPORT-AUDIENCE] Batch insert error:`, insertError);
      insertErrors.push({
        row: i + 2,
        message: `Batch insert failed: ${insertError.message}`,
      });
    } else {
      insertedCount += recipients.length;
    }
  }

  // Update audience status
  await supabase
    .from('audiences')
    .update({
      status: 'ready',
      valid_count: insertedCount,
    })
    .eq('id', audience.id);

  // Log activity
  await activityLogger.campaign('recipient_imported', 'success',
    `Imported audience "${audienceName}" with ${insertedCount} recipients`,
    {
      userId: context.user.id,
      clientId,
      recipientsAffected: insertedCount,
      metadata: {
        audience_id: audience.id,
        file_name: file.name,
        file_size: file.size,
        total_rows: rows.length,
        valid_rows: insertedCount,
        invalid_rows: rows.length - insertedCount,
      },
    }
  );

  console.log(`[IMPORT-AUDIENCE] Complete: ${insertedCount} imported, ${validationErrors.length} validation errors`);

  return {
    success: insertedCount > 0,
    imported: insertedCount,
    failed: rows.length - validRows.length + insertErrors.length,
    skipped: 0,
    errors: [...validationErrors, ...insertErrors].slice(0, 100),
    audience_id: audience.id,
    audience_name: audienceName,
    total_rows: rows.length,
    valid_rows: insertedCount,
    invalid_rows: rows.length - insertedCount,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleImportAudience, {
  requireAuth: true,
  parseBody: false, // We handle multipart form data manually
  auditAction: 'import_audience',
}));

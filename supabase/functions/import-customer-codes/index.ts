/**
 * Import Customer Codes Edge Function
 * 
 * Imports customer redemption codes with tracking, validation,
 * and optional campaign/audience linking.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { type ValidationError, type ImportResult } from '../_shared/import-export-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface CustomerCodeRow {
  redemption_code: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  zip4?: string;
  [key: string]: unknown;
}

interface ImportCustomerCodesRequest {
  clientId: string;
  campaignId?: string;
  audienceId?: string;
  fileName?: string;
  codes: CustomerCodeRow[];
}

interface ImportCustomerCodesResponse extends ImportResult {
  uploadId?: string;
  audienceId?: string;
  summary: {
    total: number;
    successful: number;
    duplicates: number;
    errors: number;
  };
  errorLog: ValidationError[];
}

// ============================================================================
// Constants
// ============================================================================

const STANDARD_FIELDS = [
  'redemption_code', 'first_name', 'last_name',
  'email', 'phone', 'company', 'address1', 'address2',
  'city', 'state', 'zip', 'zip4'
];

const BATCH_SIZE = 100;

// ============================================================================
// Main Handler
// ============================================================================

async function handleImportCustomerCodes(
  request: ImportCustomerCodesRequest,
  context: AuthContext,
  rawRequest: Request
): Promise<ImportCustomerCodesResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('import-customer-codes', rawRequest);

  const { clientId, campaignId, audienceId, fileName, codes } = request;

  if (!clientId || !codes || !Array.isArray(codes)) {
    throw new ApiError('Missing required parameters', 'VALIDATION_ERROR', 400);
  }

  // Verify user has access
  const { data: hasAccess } = await supabase
    .rpc('user_can_access_client', {
      _user_id: context.user.id,
      _client_id: clientId,
    });

  if (!hasAccess) {
    throw new ApiError('Unauthorized to upload codes for this client', 'FORBIDDEN', 403);
  }

  // Create upload tracking record
  const { data: upload, error: uploadError } = await supabase
    .from('bulk_code_uploads')
    .insert({
      client_id: clientId,
      campaign_id: campaignId,
      audience_id: audienceId,
      uploaded_by_user_id: context.user.id,
      file_name: fileName,
      total_codes: codes.length,
      upload_status: 'processing',
    })
    .select()
    .single();

  if (uploadError || !upload) {
    console.error('[IMPORT-CUSTOMER-CODES] Error creating upload record:', uploadError);
    throw new ApiError('Failed to initialize upload', 'DATABASE_ERROR', 500);
  }

  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const errorLog: ValidationError[] = [];

  // Get or create audience
  let targetAudienceId = audienceId;
  if (!targetAudienceId) {
    const audienceName = campaignId
      ? `Campaign ${campaignId} - Customer Codes`
      : `Bulk Upload ${new Date().toISOString().split('T')[0]}`;

    const { data: newAudience, error: audienceError } = await supabase
      .from('audiences')
      .insert({
        client_id: clientId,
        name: audienceName,
        source: 'csv',
        status: 'processing',
      })
      .select()
      .single();

    if (audienceError || !newAudience) {
      console.error('[IMPORT-CUSTOMER-CODES] Error creating audience:', audienceError);
      throw new ApiError('Failed to create audience', 'DATABASE_ERROR', 500);
    }

    targetAudienceId = newAudience.id;
  }

  // Process codes in batches
  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = codes.slice(i, i + BATCH_SIZE);
    const recipientsToInsert: Record<string, unknown>[] = [];

    for (const code of batch) {
      const rowNumber = i + batch.indexOf(code) + 2;

      try {
        // Validate required fields
        if (!code.redemption_code) {
          errorCount++;
          errorLog.push({
            row: rowNumber,
            message: 'Missing redemption_code',
            data: code,
          });
          continue;
        }

        const normalizedCode = code.redemption_code.toUpperCase();

        // Check for duplicate in this batch
        const isDuplicateInBatch = recipientsToInsert.some(
          r => r.redemption_code === normalizedCode
        );

        if (isDuplicateInBatch) {
          duplicateCount++;
          continue;
        }

        // Check for existing code in database
        const { data: existing } = await supabase
          .from('recipients')
          .select('id')
          .eq('redemption_code', normalizedCode)
          .maybeSingle();

        if (existing) {
          duplicateCount++;
          errorLog.push({
            row: rowNumber,
            message: 'Duplicate code already exists in database',
            code: normalizedCode,
          });
          continue;
        }

        // Extract custom fields
        const customFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(code)) {
          if (!STANDARD_FIELDS.includes(key) && value !== null && value !== undefined) {
            customFields[key] = value;
          }
        }

        recipientsToInsert.push({
          audience_id: targetAudienceId,
          campaign_id: campaignId || null,
          redemption_code: normalizedCode,
          first_name: code.first_name || null,
          last_name: code.last_name || null,
          phone: code.phone || null,
          email: code.email?.toLowerCase() || null,
          company: code.company || null,
          address1: code.address1 || null,
          address2: code.address2 || null,
          city: code.city || null,
          state: code.state || null,
          zip: code.zip || null,
          approval_status: 'pending',
          custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
        });
      } catch (error) {
        errorCount++;
        errorLog.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: code,
        });
      }
    }

    // Insert batch
    if (recipientsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('recipients')
        .insert(recipientsToInsert);

      if (insertError) {
        console.error('[IMPORT-CUSTOMER-CODES] Batch insert error:', insertError);
        errorCount += recipientsToInsert.length;
        errorLog.push({
          row: i + 1,
          message: `Batch insert failed: ${insertError.message}`,
        });
      } else {
        successCount += recipientsToInsert.length;

        // Log uploads in audit log
        for (const recipient of recipientsToInsert) {
          await supabase.from('recipient_audit_log').insert({
            action: 'uploaded',
            performed_by_user_id: context.user.id,
            ip_address: rawRequest.headers.get('x-forwarded-for'),
            user_agent: rawRequest.headers.get('user-agent'),
            metadata: {
              uploadId: upload.id,
              redemption_code: recipient.redemption_code,
            },
          });
        }
      }
    }
  }

  // Update upload record with results
  await supabase
    .from('bulk_code_uploads')
    .update({
      successful_codes: successCount,
      duplicate_codes: duplicateCount,
      error_codes: errorCount,
      upload_status: errorCount === codes.length ? 'failed' : 'completed',
      error_log: errorLog.length > 0 ? errorLog : null,
    })
    .eq('id', upload.id);

  // Update audience counts
  if (targetAudienceId) {
    await supabase
      .from('audiences')
      .update({
        total_count: successCount,
        valid_count: successCount,
        status: 'ready',
      })
      .eq('id', targetAudienceId);
  }

  // Link audience to campaign if provided
  if (campaignId && targetAudienceId) {
    await supabase
      .from('campaigns')
      .update({ audience_id: targetAudienceId })
      .eq('id', campaignId);
  }

  console.log('[IMPORT-CUSTOMER-CODES] Complete:', {
    uploadId: upload.id,
    total: codes.length,
    success: successCount,
    duplicates: duplicateCount,
    errors: errorCount,
  });

  // Log activity
  await activityLogger.campaign('recipient_imported', successCount > 0 ? 'success' : 'failed',
    `Imported ${successCount} customer codes from ${fileName || 'CSV'}`,
    {
      userId: context.user.id,
      clientId,
      campaignId,
      recipientsAffected: successCount,
      metadata: {
        upload_id: upload.id,
        audience_id: targetAudienceId,
        file_name: fileName,
        total_codes: codes.length,
        successful: successCount,
        duplicates: duplicateCount,
        errors: errorCount,
      },
    }
  );

  return {
    success: successCount > 0 || errorCount === 0,
    imported: successCount,
    failed: errorCount,
    skipped: duplicateCount,
    errors: errorLog.slice(0, 100),
    uploadId: upload.id,
    audienceId: targetAudienceId,
    summary: {
      total: codes.length,
      successful: successCount,
      duplicates: duplicateCount,
      errors: errorCount,
    },
    errorLog: errorLog.slice(0, 100),
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleImportCustomerCodes, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'import_customer_codes',
}));

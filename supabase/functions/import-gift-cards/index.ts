/**
 * Import Gift Cards Edge Function
 * 
 * Imports gift cards from CSV content into a pool.
 * Admin access required.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { parseCSV, type ValidationError, type ImportResult } from '../_shared/import-export-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface ImportGiftCardsRequest {
  pool_id: string;
  csv_content: string;
}

interface ImportGiftCardsResponse extends ImportResult {
  duplicates: number;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleImportGiftCards(
  request: ImportGiftCardsRequest,
  context: AuthContext
): Promise<ImportGiftCardsResponse> {
  const supabase = createServiceClient();

  const { pool_id, csv_content } = request;

  if (!pool_id || !csv_content) {
    throw new ApiError('Missing required fields: pool_id, csv_content', 'VALIDATION_ERROR', 400);
  }

  // Check if user is admin
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', context.user.id);

  const isAdmin = roles?.some(r => r.role === 'admin');
  if (!isAdmin) {
    throw new ApiError('Admin access required', 'FORBIDDEN', 403);
  }

  console.log(`[IMPORT-GIFT-CARDS] Importing gift cards for pool: ${pool_id}`);

  // Parse CSV
  const { rows, headers, errors: parseErrors } = parseCSV<{
    card_code: string;
    card_number?: string;
    expiration_date?: string;
  }>(csv_content, {
    requiredHeaders: ['card_code'],
  });

  if (parseErrors.length > 0) {
    return {
      success: false,
      imported: 0,
      failed: rows.length,
      skipped: 0,
      errors: parseErrors,
      duplicates: 0,
    };
  }

  // Get existing card codes to check for duplicates
  const { data: existingCards } = await supabase
    .from('gift_cards')
    .select('card_code')
    .eq('pool_id', pool_id);

  const existingCodes = new Set(existingCards?.map(c => c.card_code) || []);

  const cardsToInsert: Array<{
    pool_id: string;
    card_code: string;
    card_number?: string;
    expiration_date?: string;
    status: string;
  }> = [];
  const duplicates: string[] = [];
  const errors: ValidationError[] = [];

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // Account for header row and 1-indexing

    const cardCode = row.card_code?.trim();
    if (!cardCode) {
      errors.push({
        row: rowNumber,
        field: 'card_code',
        message: 'Missing card_code',
      });
      continue;
    }

    // Check for duplicates
    if (existingCodes.has(cardCode)) {
      duplicates.push(cardCode);
      continue;
    }

    const card: {
      pool_id: string;
      card_code: string;
      card_number?: string;
      expiration_date?: string;
      status: string;
    } = {
      pool_id,
      card_code: cardCode,
      status: 'available',
    };

    if (row.card_number) {
      card.card_number = row.card_number.trim();
    }

    if (row.expiration_date) {
      card.expiration_date = row.expiration_date.trim();
    }

    cardsToInsert.push(card);
    existingCodes.add(cardCode); // Track to prevent duplicates within this import
  }

  console.log(`[IMPORT-GIFT-CARDS] Inserting ${cardsToInsert.length} gift cards`);

  // Bulk insert cards
  let successCount = 0;
  if (cardsToInsert.length > 0) {
    const { data, error: insertError } = await supabase
      .from('gift_cards')
      .insert(cardsToInsert)
      .select();

    if (insertError) {
      console.error('[IMPORT-GIFT-CARDS] Insert error:', insertError);
      throw new ApiError(`Failed to insert cards: ${insertError.message}`, 'DATABASE_ERROR', 500);
    }

    successCount = data?.length || 0;

    // Update pool statistics
    const { data: poolData } = await supabase
      .from('gift_card_pools')
      .select('total_cards, available_cards')
      .eq('id', pool_id)
      .single();

    if (poolData) {
      await supabase
        .from('gift_card_pools')
        .update({
          total_cards: (poolData.total_cards || 0) + successCount,
          available_cards: (poolData.available_cards || 0) + successCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pool_id);
    }
  }

  console.log(`[IMPORT-GIFT-CARDS] Complete: ${successCount} success, ${duplicates.length} duplicates, ${errors.length} errors`);

  return {
    success: successCount > 0 || errors.length === 0,
    imported: successCount,
    failed: errors.length,
    skipped: duplicates.length,
    errors: errors.slice(0, 100),
    duplicates: duplicates.length,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleImportGiftCards, {
  requireAuth: true,
  requiredRole: 'admin',
  parseBody: true,
  auditAction: 'import_gift_cards',
}));

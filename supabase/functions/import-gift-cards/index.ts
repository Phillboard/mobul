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
  pool_id?: string;
  csv_content: string;
  // Auto-pool creation fields (used when pool_id is not provided)
  brand_id?: string;
  card_value?: number;
  pool_name?: string;
  provider?: string;
  // Cost tracking (optional)
  default_cost_per_card?: number;
  import_notes?: string;
}

interface ImportGiftCardsResponse extends ImportResult {
  duplicates: number;
  pool_id?: string;
  batch_id?: string;
  total_cost?: number;
  average_cost?: number;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleImportGiftCards(
  request: ImportGiftCardsRequest,
  context: AuthContext
): Promise<ImportGiftCardsResponse> {
  const supabase = createServiceClient();

  const { csv_content, brand_id, card_value, pool_name, provider, default_cost_per_card, import_notes } = request;
  let pool_id = request.pool_id;
  
  // Generate a batch ID for this import
  const batchId = crypto.randomUUID();

  if (!csv_content) {
    throw new ApiError('Missing required field: csv_content', 'VALIDATION_ERROR', 400);
  }

  // Auto-create pool if pool_id is not provided
  if (!pool_id) {
    const autoPoolName = pool_name || `Import_${new Date().toISOString().split('T')[0]}`;

    const { data: newPool, error: poolError } = await supabase
      .from('gift_card_pools')
      .insert({
        pool_name: autoPoolName,
        brand_id: brand_id || null,
        card_value: card_value || 0,
        provider: provider || 'CSV Import',
        is_master_pool: true,
        total_cards: 0,
        available_cards: 0,
        pool_type: 'csv',
        is_active: true,
      })
      .select('id')
      .single();

    if (poolError || !newPool) {
      throw new ApiError(
        `Failed to auto-create pool: ${poolError?.message || 'Unknown error'}`,
        'DATABASE_ERROR',
        500
      );
    }

    pool_id = newPool.id;
    console.log(`[IMPORT-GIFT-CARDS] Auto-created pool: ${pool_id} (${autoPoolName})`);
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

  // Parse CSV - now supports optional 'cost' column
  const { rows, headers, errors: parseErrors } = parseCSV<{
    card_code: string;
    card_number?: string;
    expiration_date?: string;
    cost?: string;
  }>(csv_content, {
    requiredHeaders: ['card_code'],
  });
  
  const hasCostColumn = headers.includes('cost');

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

  // Get existing card codes to check for duplicates (check both tables)
  const { data: existingInventory } = await supabase
    .from('gift_card_inventory')
    .select('card_code');

  const { data: existingLegacy } = await supabase
    .from('gift_cards')
    .select('card_code')
    .eq('pool_id', pool_id);

  const existingCodes = new Set([
    ...(existingInventory?.map(c => c.card_code) || []),
    ...(existingLegacy?.map(c => c.card_code) || []),
  ]);

  // Get pool details to resolve brand_id and denomination
  const { data: poolData } = await supabase
    .from('gift_card_pools')
    .select('brand_id, card_value')
    .eq('id', pool_id)
    .single();

  const resolvedBrandId = brand_id || poolData?.brand_id;
  const resolvedDenomination = card_value || poolData?.card_value || 0;

  const cardsToInsert: Array<{
    brand_id: string;
    denomination: number;
    card_code: string;
    card_number?: string;
    expiration_date?: string;
    status: string;
    legacy_pool_id: string;
    provider?: string;
    cost_per_card?: number;
    cost_source: string;
    upload_batch_id: string;
  }> = [];
  const duplicates: string[] = [];
  const errors: ValidationError[] = [];
  let totalCost = 0;

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

    if (!resolvedBrandId) {
      errors.push({
        row: rowNumber,
        field: 'brand_id',
        message: 'No brand_id resolved for pool - cannot import to inventory',
      });
      continue;
    }

    // Parse cost from CSV or use default
    let cardCost: number | undefined;
    if (hasCostColumn && row.cost) {
      const parsedCost = parseFloat(row.cost.trim());
      if (!isNaN(parsedCost) && parsedCost >= 0) {
        cardCost = parsedCost;
      }
    } else if (default_cost_per_card !== undefined) {
      cardCost = default_cost_per_card;
    }
    
    if (cardCost !== undefined) {
      totalCost += cardCost;
    }

    const card: {
      brand_id: string;
      denomination: number;
      card_code: string;
      card_number?: string;
      expiration_date?: string;
      status: string;
      legacy_pool_id: string;
      provider?: string;
      cost_per_card?: number;
      cost_source: string;
      upload_batch_id: string;
    } = {
      brand_id: resolvedBrandId,
      denomination: resolvedDenomination,
      card_code: cardCode,
      status: 'available',
      legacy_pool_id: pool_id,
      provider: provider || undefined,
      cost_per_card: cardCost,
      cost_source: 'csv',
      upload_batch_id: batchId,
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

  // Bulk insert cards into unified gift_card_inventory table
  let successCount = 0;
  if (cardsToInsert.length > 0) {
    const { data, error: insertError } = await supabase
      .from('gift_card_inventory')
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

  // Create batch record for tracking
  const averageCost = successCount > 0 ? totalCost / successCount : undefined;
  
  if (successCount > 0) {
    try {
      await supabase
        .from('gift_card_upload_batches')
        .insert({
          id: batchId,
          uploaded_by_user_id: context.user.id,
          brand_id: resolvedBrandId || null,
          denomination: resolvedDenomination || null,
          total_cards: successCount,
          total_cost: totalCost > 0 ? totalCost : null,
          average_cost_per_card: averageCost,
          source: 'csv',
          notes: import_notes || null,
        });
      console.log(`[IMPORT-GIFT-CARDS] Created batch record: ${batchId}`);
    } catch (batchError) {
      console.warn('[IMPORT-GIFT-CARDS] Failed to create batch record (non-blocking):', batchError);
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
    pool_id,
    batch_id: successCount > 0 ? batchId : undefined,
    total_cost: totalCost > 0 ? totalCost : undefined,
    average_cost: averageCost,
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

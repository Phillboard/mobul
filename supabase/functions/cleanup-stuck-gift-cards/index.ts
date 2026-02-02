/**
 * Cleanup Stuck Gift Cards Edge Function
 * 
 * Maintenance function that releases gift cards stuck in intermediate states
 * back to the available pool. Typically called by scheduled cron jobs.
 * 
 * No authentication required (service function for scheduled tasks).
 * Should be called with service role key.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';

// ============================================================================
// Types
// ============================================================================

interface CleanupRequest {
  // Optional: dry run mode - just report what would be cleaned
  dryRun?: boolean;
  // Optional: max age in minutes for "stuck" cards (default: 60)
  maxAgeMinutes?: number;
}

interface CleanupResponse {
  cleanedCount: number;
  cardIds: string[];
  message: string;
  dryRun?: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleCleanupStuckCards(
  request: CleanupRequest | null,
  _context: PublicContext
): Promise<CleanupResponse> {
  const supabase = createServiceClient();
  
  const dryRun = request?.dryRun || false;
  const maxAgeMinutes = request?.maxAgeMinutes || 60;

  console.log(`🧹 Starting stuck gift cards cleanup (dryRun: ${dryRun}, maxAge: ${maxAgeMinutes}min)...`);

  // Call the database function to cleanup stuck cards
  const { data, error } = await supabase.rpc('cleanup_stuck_gift_cards', {
    p_dry_run: dryRun,
    p_max_age_minutes: maxAgeMinutes,
  });

  if (error) {
    console.error('❌ Error during cleanup:', error);
    
    // Try simpler version without parameters (backwards compatibility)
    const { data: fallbackData, error: fallbackError } = await supabase.rpc('cleanup_stuck_gift_cards');
    
    if (fallbackError) {
      throw new ApiError(`Cleanup failed: ${fallbackError.message}`, 'DATABASE_ERROR', 500);
    }
    
    const cleanedCount = fallbackData?.[0]?.cleaned_count || 0;
    const cardIds = fallbackData?.[0]?.card_ids || [];

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} stuck gift cards (fallback mode)`);
      console.log('Card IDs:', cardIds);
    } else {
      console.log('✅ No stuck gift cards found');
    }

    return {
      cleanedCount,
      cardIds,
      message: cleanedCount > 0 
        ? `Successfully released ${cleanedCount} stuck cards back to pool`
        : 'No stuck cards found',
    };
  }

  const cleanedCount = data?.[0]?.cleaned_count || data?.cleaned_count || 0;
  const cardIds = data?.[0]?.card_ids || data?.card_ids || [];

  if (cleanedCount > 0) {
    console.log(`✅ ${dryRun ? 'Would clean' : 'Cleaned up'} ${cleanedCount} stuck gift cards`);
    console.log('Card IDs:', cardIds);
  } else {
    console.log('✅ No stuck gift cards found');
  }

  return {
    cleanedCount,
    cardIds,
    message: cleanedCount > 0 
      ? dryRun 
        ? `Would release ${cleanedCount} stuck cards back to pool`
        : `Successfully released ${cleanedCount} stuck cards back to pool`
      : 'No stuck cards found',
    dryRun: dryRun || undefined,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleCleanupStuckCards, {
  requireAuth: false, // Service function called by cron/scheduler
  parseBody: true,
  auditAction: 'cleanup_stuck_gift_cards',
}));

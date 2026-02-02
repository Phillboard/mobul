/**
 * Export Pool Cards Edge Function
 * 
 * Exports gift cards from a pool to CSV format.
 * Supports sensitive data masking based on user role.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { handleCORS } from '../_shared/cors.ts';
import {
  generateCSV,
  createCSVResponse,
  maskSensitiveData,
  formatDateForExport,
} from '../_shared/import-export-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface ExportPoolCardsRequest {
  poolId: string;
  includeSensitiveData?: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleExportPoolCards(
  request: ExportPoolCardsRequest,
  context: AuthContext
): Promise<Response> {
  const supabase = createServiceClient();

  const { poolId, includeSensitiveData = false } = request;

  if (!poolId) {
    throw new ApiError('Pool ID is required', 'VALIDATION_ERROR', 400);
  }

  // Check if user is admin
  const isAdmin = context.user.role === 'admin' || context.user.role === 'platform_admin';

  // Get pool to validate access
  const { data: pool, error: poolError } = await supabase
    .from('gift_card_pools')
    .select('pool_name, client_id, is_master_pool, gift_card_brands(brand_name)')
    .eq('id', poolId)
    .single();

  if (poolError || !pool) {
    throw new ApiError('Pool not found', 'NOT_FOUND', 404);
  }

  // Validate access: admin can access all, users can only access their client's pools
  if (!isAdmin && pool.client_id) {
    const { data: clientUser } = await supabase
      .from('client_users')
      .select('id')
      .eq('client_id', pool.client_id)
      .eq('user_id', context.user.id)
      .single();

    if (!clientUser) {
      throw new ApiError('Access denied: You do not have permission to access this pool', 'FORBIDDEN', 403);
    }
  }

  console.log(`[EXPORT-POOL-CARDS] Exporting pool: ${poolId}`);

  // Fetch all cards from the pool
  const { data: cards, error: cardsError } = await supabase
    .from('gift_cards')
    .select('*')
    .eq('pool_id', poolId)
    .order('created_at', { ascending: false });

  if (cardsError) {
    throw new ApiError(`Failed to fetch cards: ${cardsError.message}`, 'DATABASE_ERROR', 500);
  }

  if (!cards || cards.length === 0) {
    throw new ApiError('No cards found in this pool', 'NOT_FOUND', 404);
  }

  // Only include sensitive data if user is admin AND explicitly requested it
  const shouldMask = !isAdmin || !includeSensitiveData;

  // Transform data for export
  const exportData = cards.map(card => ({
    card_code: shouldMask ? maskSensitiveData(card.card_code, 4) : card.card_code,
    card_number: shouldMask ? maskSensitiveData(card.card_number, 4) : (card.card_number || ''),
    status: card.status,
    current_balance: card.current_balance ? `$${Number(card.current_balance).toFixed(2)}` : '',
    created_at: formatDateForExport(card.created_at),
    last_balance_check: formatDateForExport(card.last_balance_check),
    balance_check_status: card.balance_check_status || '',
    delivered_at: formatDateForExport(card.delivered_at),
    expires_at: formatDateForExport(card.expires_at),
  }));

  // Generate CSV
  const csv = generateCSV(exportData, {
    headers: [
      'card_code',
      'card_number',
      'status',
      'current_balance',
      'created_at',
      'last_balance_check',
      'balance_check_status',
      'delivered_at',
      'expires_at',
    ],
    headerLabels: {
      card_code: 'Card Code',
      card_number: 'Card Number',
      status: 'Status',
      current_balance: 'Current Balance',
      created_at: 'Created Date',
      last_balance_check: 'Last Balance Check',
      balance_check_status: 'Balance Check Status',
      delivered_at: 'Delivered Date',
      expires_at: 'Expires Date',
    },
  });

  console.log(`[EXPORT-POOL-CARDS] Exported ${cards.length} cards`);

  // Generate filename
  const brandInfo = pool.gift_card_brands as { brand_name?: string } | null;
  const brandName = brandInfo?.brand_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Cards';
  const poolName = pool.pool_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Pool';
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${brandName}_${poolName}_${timestamp}.csv`;

  return createCSVResponse(csv, filename, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  });
}

// ============================================================================
// Custom handler to return Response directly
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const supabase = createServiceClient();

    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new ApiError('No authorization header', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email || '',
        role: roleData?.role || 'user',
      },
      organization_id: roleData?.organization_id || null,
      client: supabase,
    };

    const body = await req.json();
    return await handleExportPoolCards(body, context);

  } catch (error) {
    console.error('[EXPORT-POOL-CARDS] Error:', error);

    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: error.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Export failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

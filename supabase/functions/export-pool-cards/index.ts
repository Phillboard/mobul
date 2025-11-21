/**
 * Edge Function: export-pool-cards
 * 
 * Purpose: Export gift cards from a pool to CSV format
 * Called by: PoolDetailDialog component
 * 
 * Permissions: Requires authentication, validates user access to pool
 * 
 * Request Body:
 * - poolId: string (UUID) - ID of the pool to export
 * - includeSensitiveData: boolean - Whether to include full card codes (admin only)
 * 
 * Response:
 * - CSV file download with card details
 * 
 * Database Tables:
 * - gift_cards (READ): Fetch cards for export
 * - gift_card_pools (READ): Validate pool access
 * 
 * CSV Columns:
 * - Card Code (masked or full based on permissions)
 * - Status
 * - Balance
 * - Created Date
 * - Last Balance Check
 * - Delivered Date
 * 
 * Security:
 * - Validates user has access to the pool's client
 * - Only admins can export with full card codes
 * - Client users get masked codes
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Masks a card code for security, showing only last 4 characters
 */
function maskCardCode(code: string): string {
  if (code.length <= 4) return code;
  return '•'.repeat(code.length - 4) + code.slice(-4);
}

/**
 * Formats a date to readable string
 */
function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Escapes CSV field values to prevent injection and formatting issues
 */
function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { poolId, includeSensitiveData = false } = await req.json();

    if (!poolId) {
      throw new Error('Pool ID is required');
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    // Get pool to validate access
    const { data: pool, error: poolError } = await supabaseAdmin
      .from('gift_card_pools')
      .select('pool_name, client_id, is_master_pool, gift_card_brands(brand_name)')
      .eq('id', poolId)
      .single();

    if (poolError || !pool) {
      throw new Error('Pool not found');
    }

    // Validate access: admin can access all, users can only access their client's pools
    if (!isAdmin && pool.client_id) {
      const { data: clientUser } = await supabaseAdmin
        .from('client_users')
        .select('id')
        .eq('client_id', pool.client_id)
        .eq('user_id', user.id)
        .single();

      if (!clientUser) {
        throw new Error('Access denied: You do not have permission to access this pool');
      }
    }

    // Fetch all cards from the pool
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('gift_cards')
      .select('*')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: false });

    if (cardsError) throw cardsError;

    if (!cards || cards.length === 0) {
      throw new Error('No cards found in this pool');
    }

    // Build CSV
    const headers = [
      'Card Code',
      'Card Number',
      'Status',
      'Current Balance',
      'Created Date',
      'Last Balance Check',
      'Balance Check Status',
      'Delivered Date',
      'Expires Date'
    ];

    // Only include sensitive data if user is admin AND explicitly requested it
    const shouldMask = !isAdmin || !includeSensitiveData;

    const rows = cards.map(card => [
      escapeCsvField(shouldMask ? maskCardCode(card.card_code) : card.card_code),
      escapeCsvField(shouldMask && card.card_number ? maskCardCode(card.card_number) : card.card_number || ''),
      escapeCsvField(card.status),
      escapeCsvField(card.current_balance ? `$${Number(card.current_balance).toFixed(2)}` : ''),
      escapeCsvField(formatDate(card.created_at)),
      escapeCsvField(formatDate(card.last_balance_check)),
      escapeCsvField(card.balance_check_status || ''),
      escapeCsvField(formatDate(card.delivered_at)),
      escapeCsvField(formatDate(card.expires_at))
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const brandName = pool.gift_card_brands?.brand_name || 'Cards';
    const filename = `${brandName}_${pool.pool_name}_${timestamp}.csv`;

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting pool cards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Revoke Gift Card Edge Function
 * 
 * Allows admins to revoke (take back) gift cards from recipients.
 * - Validates admin role
 * - Updates recipient_gift_cards status to 'revoked'
 * - Returns card to inventory if applicable
 * - Creates audit log entry with full snapshot
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevokeRequest {
  assignmentId: string;
  reason: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json(
        { success: false, error: 'Unauthorized - No authorization header' },
        { headers: corsHeaders, status: 401 }
      );
    }

    // Create service role client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create user client to get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return Response.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { headers: corsHeaders, status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRole) {
      console.log(`User ${user.id} attempted revoke without admin role`);
      return Response.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { headers: corsHeaders, status: 403 }
      );
    }

    // Parse request body
    const body: RevokeRequest = await req.json();
    const { assignmentId, reason } = body;

    // Validate required fields
    if (!assignmentId) {
      return Response.json(
        { success: false, error: 'Missing required field: assignmentId' },
        { headers: corsHeaders, status: 400 }
      );
    }

    if (!reason || reason.trim().length < 10) {
      return Response.json(
        { success: false, error: 'Reason is required and must be at least 10 characters' },
        { headers: corsHeaders, status: 400 }
      );
    }

    // Fetch the gift card assignment with related data
    const { data: assignment, error: fetchError } = await supabase
      .from('recipient_gift_cards')
      .select(`
        *,
        recipient:recipients(
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        campaign:campaigns(
          id,
          name
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      console.error('Assignment fetch error:', fetchError);
      return Response.json(
        { success: false, error: 'Gift card assignment not found' },
        { headers: corsHeaders, status: 404 }
      );
    }

    // Check if already revoked
    if (assignment.delivery_status === 'revoked') {
      return Response.json(
        { success: false, error: 'This gift card has already been revoked' },
        { headers: corsHeaders, status: 400 }
      );
    }

    const now = new Date().toISOString();
    const originalStatus = assignment.delivery_status;

    // Get card details for snapshot
    let cardValue: number | null = null;
    let brandName: string | null = null;

    // Try to get card info from gift_card_inventory if there's a card_id
    if (assignment.gift_card_id) {
      const { data: inventoryCard } = await supabase
        .from('gift_card_inventory')
        .select(`
          denomination,
          gift_card_brands(brand_name)
        `)
        .eq('id', assignment.gift_card_id)
        .single();

      if (inventoryCard) {
        cardValue = inventoryCard.denomination;
        brandName = (inventoryCard.gift_card_brands as any)?.brand_name || null;
      }
    }

    // Try billing ledger if we don't have card value yet
    if (!cardValue) {
      const { data: billingEntry } = await supabase
        .from('gift_card_billing_ledger')
        .select(`
          denomination,
          gift_card_brands(brand_name)
        `)
        .eq('recipient_id', assignment.recipient_id)
        .eq('campaign_id', assignment.campaign_id)
        .order('billed_at', { ascending: false })
        .limit(1)
        .single();

      if (billingEntry) {
        cardValue = billingEntry.denomination;
        brandName = (billingEntry.gift_card_brands as any)?.brand_name || brandName;
      }
    }

    // 1. Update recipient_gift_cards status to 'revoked'
    const { error: updateError } = await supabase
      .from('recipient_gift_cards')
      .update({
        delivery_status: 'revoked',
        revoked_at: now,
        revoked_by: user.id,
        revoke_reason: reason.trim()
      })
      .eq('id', assignmentId);

    if (updateError) {
      console.error('Error updating recipient_gift_cards:', updateError);
      return Response.json(
        { success: false, error: 'Failed to revoke gift card' },
        { headers: corsHeaders, status: 500 }
      );
    }

    // 2. Return card to inventory if applicable
    if (assignment.gift_card_id) {
      const { error: inventoryError } = await supabase
        .from('gift_card_inventory')
        .update({
          status: 'available',
          assigned_to_recipient_id: null,
          assigned_to_campaign_id: null,
          assigned_at: null
        })
        .eq('id', assignment.gift_card_id);

      if (inventoryError) {
        console.warn('Failed to return card to inventory:', inventoryError);
        // Don't fail the whole operation - the revoke is still valid
      } else {
        console.log(`Card ${assignment.gift_card_id} returned to inventory`);
      }
    }

    // 3. Create audit log entry
    const recipient = assignment.recipient as any;
    const recipientName = recipient 
      ? `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
      : 'Unknown';

    const { error: logError } = await supabase
      .from('gift_card_revoke_log')
      .insert({
        recipient_gift_card_id: assignmentId,
        inventory_card_id: assignment.gift_card_id,
        recipient_id: assignment.recipient_id,
        campaign_id: assignment.campaign_id,
        condition_id: assignment.condition_id,
        revoked_by: user.id,
        revoked_at: now,
        reason: reason.trim(),
        recipient_name: recipientName,
        recipient_phone: recipient?.phone || null,
        recipient_email: recipient?.email || null,
        card_value: cardValue,
        brand_name: brandName,
        original_delivery_status: originalStatus
      });

    if (logError) {
      console.error('Failed to create audit log:', logError);
      // Don't fail - the revoke already happened
    }

    console.log(`Gift card revoked: assignment=${assignmentId}, by=${user.id}, reason="${reason}"`);

    return Response.json({
      success: true,
      message: 'Gift card successfully revoked',
      data: {
        assignmentId,
        recipientName,
        cardValue,
        brandName,
        originalStatus,
        revokedAt: now,
        revokedBy: user.id,
        cardReturnedToInventory: !!assignment.gift_card_id
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in revoke-gift-card:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});

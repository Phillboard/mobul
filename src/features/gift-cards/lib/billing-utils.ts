/**
 * Gift Card Billing Utilities
 * Handles billing ledger entries with custom pricing and profit tracking
 */

import { supabase } from "@/integrations/supabase/client";

export interface BillingEntry {
  transaction_type: 'purchase_from_inventory' | 'purchase_from_tillo' | 'refund';
  billed_entity_type: 'client' | 'agency';
  billed_entity_id: string;
  campaign_id?: string;
  recipient_id?: string;
  brand_id: string;
  denomination: number;
  amount_billed: number;
  cost_basis?: number;
  inventory_card_id?: string;
  tillo_transaction_id?: string;
  tillo_order_reference?: string;
  metadata?: Record<string, any>;
  notes?: string;
}

/**
 * Record a billing entry in the gift_card_billing_ledger
 */
export async function recordBillingEntry(entry: BillingEntry): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('gift_card_billing_ledger')
      .insert({
        transaction_type: entry.transaction_type,
        billed_entity_type: entry.billed_entity_type,
        billed_entity_id: entry.billed_entity_id,
        campaign_id: entry.campaign_id,
        recipient_id: entry.recipient_id,
        brand_id: entry.brand_id,
        denomination: entry.denomination,
        amount_billed: entry.amount_billed,
        cost_basis: entry.cost_basis,
        inventory_card_id: entry.inventory_card_id,
        tillo_transaction_id: entry.tillo_transaction_id,
        tillo_order_reference: entry.tillo_order_reference,
        metadata: entry.metadata || {},
        notes: entry.notes,
      });

    if (error) {
      console.error('Billing entry error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to record billing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown billing error',
    };
  }
}

/**
 * Get billing entity for a campaign (client or agency)
 */
export async function getBillingEntityForCampaign(
  campaignId: string
): Promise<{ type: 'client' | 'agency'; id: string } | null> {
  try {
    // Call the database function to determine billing entity
    const { data, error } = await supabase.rpc('get_billing_entity_for_campaign', {
      p_campaign_id: campaignId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting billing entity:', error);
    return null;
  }
}

/**
 * Get custom pricing for a brand-denomination
 */
export async function getCustomPricing(
  brandId: string,
  denomination: number,
  forAgency: boolean = false
): Promise<{ price: number; cost_basis?: number; use_custom: boolean }> {
  try {
    const { data, error } = await supabase
      .from('gift_card_denominations')
      .select('use_custom_pricing, client_price, agency_price, cost_basis')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .single();

    if (error || !data) {
      // No custom pricing configured, use face value
      return {
        price: denomination,
        use_custom: false,
      };
    }

    // Use custom pricing if enabled
    if (data.use_custom_pricing) {
      const price = forAgency && data.agency_price 
        ? data.agency_price 
        : data.client_price || denomination;

      return {
        price,
        cost_basis: data.cost_basis,
        use_custom: true,
      };
    }

    // Use face value
    return {
      price: denomination,
      cost_basis: data.cost_basis,
      use_custom: false,
    };
  } catch (error) {
    console.error('Error getting custom pricing:', error);
    return {
      price: denomination,
      use_custom: false,
    };
  }
}

/**
 * Record billing for CSV inventory card
 */
export async function recordCSVBilling(
  cardId: string,
  brandId: string,
  denomination: number,
  campaignId: string,
  recipientId: string,
  billingEntity: { type: 'client' | 'agency'; id: string }
): Promise<{ success: boolean; error?: string }> {
  // Get custom pricing
  const pricing = await getCustomPricing(
    brandId,
    denomination,
    billingEntity.type === 'agency'
  );

  return recordBillingEntry({
    transaction_type: 'purchase_from_inventory',
    billed_entity_type: billingEntity.type,
    billed_entity_id: billingEntity.id,
    campaign_id: campaignId,
    recipient_id: recipientId,
    brand_id: brandId,
    denomination,
    amount_billed: pricing.price,
    cost_basis: pricing.cost_basis,
    inventory_card_id: cardId,
    metadata: {
      source: 'csv',
      custom_pricing_used: pricing.use_custom,
    },
  });
}

/**
 * Record billing for Tillo API purchase
 */
export async function recordTilloBilling(
  brandId: string,
  denomination: number,
  campaignId: string,
  recipientId: string,
  billingEntity: { type: 'client' | 'agency'; id: string },
  tilloTransactionId?: string,
  tilloOrderRef?: string,
  tilloCost?: number
): Promise<{ success: boolean; error?: string }> {
  // Get custom pricing
  const pricing = await getCustomPricing(
    brandId,
    denomination,
    billingEntity.type === 'agency'
  );

  return recordBillingEntry({
    transaction_type: 'purchase_from_tillo',
    billed_entity_type: billingEntity.type,
    billed_entity_id: billingEntity.id,
    campaign_id: campaignId,
    recipient_id: recipientId,
    brand_id: brandId,
    denomination,
    amount_billed: pricing.price,
    cost_basis: tilloCost || denomination, // Use actual Tillo cost if available
    tillo_transaction_id: tilloTransactionId,
    tillo_order_reference: tilloOrderRef,
    metadata: {
      source: 'tillo',
      custom_pricing_used: pricing.use_custom,
    },
  });
}

/**
 * Get profit summary for a time period
 */
export async function getProfitSummary(
  startDate: Date,
  endDate: Date,
  entityType?: 'client' | 'agency',
  entityId?: string
): Promise<{
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin_percent: number;
  transaction_count: number;
}> {
  try {
    let query = supabase
      .from('gift_card_billing_ledger')
      .select('amount_billed, cost_basis, profit')
      .gte('billed_at', startDate.toISOString())
      .lte('billed_at', endDate.toISOString())
      .neq('transaction_type', 'refund');

    if (entityType && entityId) {
      query = query
        .eq('billed_entity_type', entityType)
        .eq('billed_entity_id', entityId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary = data?.reduce(
      (acc, entry) => {
        acc.total_revenue += entry.amount_billed || 0;
        acc.total_cost += entry.cost_basis || 0;
        acc.total_profit += entry.profit || 0;
        acc.transaction_count++;
        return acc;
      },
      { total_revenue: 0, total_cost: 0, total_profit: 0, transaction_count: 0 }
    );

    const profit_margin_percent = summary?.total_revenue > 0
      ? (summary.total_profit / summary.total_revenue) * 100
      : 0;

    return {
      ...summary,
      profit_margin_percent,
    };
  } catch (error) {
    console.error('Error getting profit summary:', error);
    return {
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      profit_margin_percent: 0,
      transaction_count: 0,
    };
  }
}

/**
 * Get billing history for an entity
 */
export async function getBillingHistory(
  entityType: 'client' | 'agency',
  entityId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('gift_card_billing_ledger')
      .select(`
        *,
        gift_card_brands (
          brand_name,
          logo_url
        ),
        campaigns (
          name
        ),
        recipients (
          first_name,
          last_name
        )
      `)
      .eq('billed_entity_type', entityType)
      .eq('billed_entity_id', entityId)
      .order('billed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting billing history:', error);
    return [];
  }
}


/**
 * Gift Card Billing Hooks
 * 
 * React Query hooks for billing ledger and financial reporting
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';

export interface BillingTransaction {
  id: string;
  transaction_type: string;
  billed_entity_type: string;
  billed_entity_id: string;
  campaign_id?: string;
  recipient_id?: string;
  brand_id: string;
  denomination: number;
  amount_billed: number;
  cost_basis?: number;
  profit: number;
  billed_at: string;
  metadata?: any;
}

export interface SpendingSummary {
  total_spent: number;
  total_cards: number;
  total_profit: number;
  by_brand: Record<string, { count: number; total: number }>;
}

/**
 * Fetch billing transactions for a specific entity
 */
export function useBillingTransactions({
  entityType,
  entityId,
  startDate,
  endDate,
  limit = 100,
}: {
  entityType: 'client' | 'agency';
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [
      'gift-card-billing',
      entityType,
      entityId,
      startDate,
      endDate,
      limit,
    ],
    queryFn: async () => {
      if (!entityId) return [];

      let query = supabase
        .from('gift_card_billing_ledger')
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url
          ),
          campaigns (
            name
          )
        `)
        .eq('billed_entity_type', entityType)
        .eq('billed_entity_id', entityId)
        .order('billed_at', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('billed_at', startDate);
      }
      if (endDate) {
        query = query.lte('billed_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BillingTransaction[];
    },
    enabled: !!entityId,
  });
}

/**
 * Get spending summary for a client
 */
export function useClientSpendingSummary({
  clientId,
  startDate,
  endDate,
}: {
  clientId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['client-spending-summary', clientId, startDate, endDate],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase.rpc(
        'get_client_spending_summary',
        {
          p_client_id: clientId,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        }
      );

      if (error) throw error;
      return data?.[0] as SpendingSummary | null;
    },
    enabled: !!clientId,
  });
}

/**
 * Get billing transactions for a specific campaign
 */
export function useCampaignBilling(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign-billing', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('gift_card_billing_ledger')
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url
          )
        `)
        .eq('campaign_id', campaignId)
        .order('billed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}

/**
 * Get aggregated billing stats for admin dashboard
 */
export function useAdminBillingStats({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
} = {}) {
  return useQuery({
    queryKey: ['admin-billing-stats', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('gift_card_billing_ledger')
        .select('amount_billed, profit, transaction_type');

      if (startDate) {
        query = query.gte('billed_at', startDate);
      }
      if (endDate) {
        query = query.lte('billed_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate the results
      const stats = {
        totalRevenue: 0,
        totalProfit: 0,
        totalCards: data.length,
        fromInventory: 0,
        fromTillo: 0,
      };

      data.forEach((transaction: any) => {
        stats.totalRevenue += parseFloat(transaction.amount_billed || 0);
        stats.totalProfit += parseFloat(transaction.profit || 0);
        if (transaction.transaction_type === 'purchase_from_inventory') {
          stats.fromInventory++;
        } else if (transaction.transaction_type === 'purchase_from_tillo') {
          stats.fromTillo++;
        }
      });

      return stats;
    },
  });
}

/**
 * Get top spending clients
 */
export function useTopSpendingClients(limit: number = 10) {
  return useQuery({
    queryKey: ['top-spending-clients', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_billing_ledger')
        .select(`
          billed_entity_id,
          amount_billed,
          billed_entity_type
        `)
        .eq('billed_entity_type', 'client');

      if (error) throw error;

      // Aggregate by client
      const clientSpending: Record<string, number> = {};
      data.forEach((t: any) => {
        if (!clientSpending[t.billed_entity_id]) {
          clientSpending[t.billed_entity_id] = 0;
        }
        clientSpending[t.billed_entity_id] += parseFloat(t.amount_billed || 0);
      });

      // Get client names
      const clientIds = Object.keys(clientSpending);
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      if (clientError) throw clientError;

      // Combine and sort
      const topClients = clients
        .map((client: any) => ({
          id: client.id,
          name: client.name,
          total_spent: clientSpending[client.id] || 0,
        }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, limit);

      return topClients;
    },
  });
}


import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

/**
 * Hook to get reward statistics for a specific campaign.
 * Returns gift card delivery stats, timeline, and recent deliveries.
 */
export function useRewardStats(campaignId: string | null) {
  return useQuery({
    queryKey: ['reward-stats', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      // Get gift card billing data (replaces deliveries)
      const { data: billing, error: billingError } = await supabase
        .from('gift_card_billing_ledger')
        .select('*, gift_card_brands(brand_name), gift_card_inventory(status, card_code)')
        .eq('campaign_id', campaignId);

      if (billingError) {
        console.error('Billing ledger query error:', billingError);
        return null;
      }

      // Get revoked count from recipient_gift_cards
      const { count: revokedCount } = await supabase
        .from('recipient_gift_cards')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('delivery_status', 'revoked');

      // Calculate total value directly from billing ledger (excluding revoked)
      const activeEntries = billing?.filter(b => 
        b.gift_card_inventory?.status !== 'revoked'
      ) || [];
      const totalValue = activeEntries.reduce((sum, entry) => sum + (Number(entry.denomination) || 0), 0);
      const totalDelivered = activeEntries.length;
      
      // Count by status
      const deliveredCount = billing?.filter(b => 
        b.gift_card_inventory?.status === 'delivered' || b.gift_card_inventory?.status === 'sent'
      ).length || 0;
      const pendingCount = billing?.filter(b => 
        b.gift_card_inventory?.status === 'assigned' || b.gift_card_inventory?.status === 'pending'
      ).length || 0;
      const failedCount = billing?.filter(b => 
        b.gift_card_inventory?.status === 'failed'
      ).length || 0;

      // Group by date for timeline (exclude revoked)
      const billingByDate = activeEntries.reduce((acc, entry) => {
        const date = new Date(entry.billed_at).toLocaleDateString();
        if (!acc[date]) acc[date] = { count: 0, value: 0 };
        acc[date].count++;
        acc[date].value += Number(entry.denomination) || 0;
        return acc;
      }, {} as Record<string, { count: number; value: number }>);

      // Create a default condition entry for display
      const byCondition: Record<number, { count: number; totalValue: number; delivered: number; failed: number; pending: number; revoked: number }> = {};
      if (totalDelivered > 0 || (revokedCount || 0) > 0) {
        byCondition[1] = {
          count: totalDelivered,
          totalValue,
          delivered: deliveredCount,
          failed: failedCount,
          pending: pendingCount,
          revoked: revokedCount || 0,
        };
      }

      return {
        byCondition,
        totalValue,
        totalDelivered,
        totalFailed: failedCount,
        totalRevoked: revokedCount || 0,
        timeline: Object.entries(billingByDate).map(([date, data]) => ({
          date,
          count: data.count,
          value: data.value,
        })),
        recentDeliveries: billing?.slice(0, 10) || [],
      };
    },
    enabled: !!campaignId,
  });
}

/**
 * Hook to get reward summary statistics for a client's dashboard.
 * Returns total delivered, today's count, trend, and values.
 */
export function useRewardSummary(clientId: string | null, dateRange: number) {
  return useQuery({
    queryKey: ['reward-summary', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get billing ledger entries for this client
      const { data: billing, error } = await supabase
        .from('gift_card_billing_ledger')
        .select('id, denomination, billed_at')
        .eq('billed_entity_type', 'client')
        .eq('billed_entity_id', clientId)
        .gte('billed_at', startDate.toISOString());

      if (error) {
        console.error('Reward summary query error:', error);
        return { totalDelivered: 0, todayCount: 0, todayTrend: 0, totalValue: 0, pendingCount: 0, revokedCount: 0 };
      }

      const totalDelivered = billing?.length || 0;
      
      // Calculate total value
      const totalValue = billing?.reduce((sum, b) => sum + (Number(b.denomination) || 0), 0) || 0;
      
      // Count today's rewards
      const todayCount = billing?.filter(b => 
        new Date(b.billed_at) >= today
      ).length || 0;
      
      // Count yesterday's rewards for trend
      const yesterdayCount = billing?.filter(b => {
        const d = new Date(b.billed_at);
        return d >= yesterday && d < today;
      }).length || 0;
      
      // Calculate trend
      const todayTrend = yesterdayCount > 0 
        ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 
        : 0;

      // Get pending count (gift cards assigned but not yet delivered)
      const { count: pendingCount } = await supabase
        .from('gift_card_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'assigned');

      // Get revoked count for this client's campaigns
      const { data: clientCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', clientId);

      let revokedCount = 0;
      if (clientCampaigns && clientCampaigns.length > 0) {
        const campaignIds = clientCampaigns.map(c => c.id);
        const { count } = await supabase
          .from('recipient_gift_cards')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds)
          .eq('delivery_status', 'revoked');
        revokedCount = count || 0;
      }

      return {
        totalDelivered,
        todayCount,
        todayTrend,
        totalValue,
        pendingCount: pendingCount || 0,
        revokedCount,
      };
    },
    enabled: !!clientId,
  });
}

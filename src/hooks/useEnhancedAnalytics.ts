/**
 * Enhanced Analytics Hook
 * Provides comprehensive campaign analytics including costs, ROI, and geographic data
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CampaignCosts {
  mailCost: number;
  giftCardCost: number;
  totalCost: number;
  costPerLead: number;
  costPerConversion: number;
}

interface GeographicMetrics {
  state: string;
  total: number;
  responses: number;
  conversions: number;
  responseRate: number;
  conversionRate: number;
}

export function useEnhancedCampaignAnalytics(campaignId: string) {
  const query = useQuery({
    queryKey: ['enhanced-campaign-analytics', campaignId],
    queryFn: async () => {
      // Fetch campaign with all related data
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          audiences(
            id,
            total_count,
            valid_count,
            recipients(
              id,
              state,
              approval_status,
              gift_card_assigned_id
            )
          ),
          events(
            id,
            event_type,
            recipient_id,
            occurred_at
          ),
          campaign_conditions(
            id,
            brand_id,
            card_value
          )
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      // Calculate costs
      const totalRecipients = campaign.audiences?.total_count || 0;
      const mailCostPerPiece = 0.60; // $0.40 production + $0.20 postage
      const giftCardWholesale = 23.50; // Wholesale cost for $25 card
      
      const redemptions = campaign.events?.filter(
        (e: any) => e.event_type === 'gift_card_redeemed'
      ).length || 0;

      const responses = campaign.events?.filter(
        (e: any) => e.event_type === 'purl_viewed' || e.event_type === 'qr_scanned'
      ).length || 0;

      const mailCost = totalRecipients * mailCostPerPiece;
      const giftCardCost = redemptions * giftCardWholesale;
      const totalCost = mailCost + giftCardCost;

      const costs: CampaignCosts = {
        mailCost,
        giftCardCost,
        totalCost,
        costPerLead: responses > 0 ? totalCost / responses : 0,
        costPerConversion: redemptions > 0 ? totalCost / redemptions : 0,
      };

      // Geographic analysis
      const stateMap = new Map<string, GeographicMetrics>();
      
      campaign.audiences?.recipients?.forEach((r: any) => {
        const state = r.state?.toUpperCase();
        if (!state) return;

        if (!stateMap.has(state)) {
          stateMap.set(state, {
            state,
            total: 0,
            responses: 0,
            conversions: 0,
            responseRate: 0,
            conversionRate: 0,
          });
        }

        const metrics = stateMap.get(state)!;
        metrics.total++;

        const hasResponse = campaign.events?.some(
          (e: any) => e.recipient_id === r.id && 
            (e.event_type === 'purl_viewed' || e.event_type === 'qr_scanned')
        );
        if (hasResponse) metrics.responses++;

        if (r.approval_status === 'redeemed') metrics.conversions++;
      });

      // Calculate rates
      const geographic: GeographicMetrics[] = Array.from(stateMap.values()).map(m => ({
        ...m,
        responseRate: m.total > 0 ? (m.responses / m.total * 100) : 0,
        conversionRate: m.responses > 0 ? (m.conversions / m.responses * 100) : 0,
      }));

      // Funnel stages
      const totalMailed = totalRecipients;
      const delivered = campaign.events?.filter(e => e.event_type === 'imb_delivered').length || 0;
      const landed = responses;
      const called = campaign.events?.filter(e => e.event_type === 'call_started').length || 0;
      const qualified = campaign.events?.filter(e => e.event_type === 'condition_completed').length || 0;
      const redeemed = redemptions;

      return {
        campaign,
        costs,
        geographic,
        funnel: {
          totalMailed,
          delivered,
          landed,
          called,
          qualified,
          redeemed,
          deliveryRate: totalMailed > 0 ? (delivered / totalMailed * 100) : 0,
          responseRate: delivered > 0 ? (landed / delivered * 100) : 0,
          callRate: landed > 0 ? (called / landed * 100) : 0,
          qualificationRate: called > 0 ? (qualified / called * 100) : 0,
          redemptionRate: qualified > 0 ? (redeemed / qualified * 100) : 0,
        },
      };
    },
    enabled: !!campaignId,
  });

  return query;
}

export function useCampaignComparison(campaignIds: string[]) {
  return useQuery({
    queryKey: ['campaign-comparison', ...campaignIds],
    queryFn: async () => {
      const comparisons = await Promise.all(
        campaignIds.map(async (id) => {
          const { data } = await supabase
            .from('campaigns')
            .select(`
              id,
              name,
              audiences(total_count),
              events(event_type)
            `)
            .eq('id', id)
            .single();

          if (!data) return null;

          const totalMailed = data.audiences?.total_count || 0;
          const responses = data.events?.filter(
            (e: any) => e.event_type === 'purl_viewed' || e.event_type === 'qr_scanned'
          ).length || 0;
          const redemptions = data.events?.filter(
            (e: any) => e.event_type === 'gift_card_redeemed'
          ).length || 0;

          return {
            id: data.id,
            name: data.name,
            totalMailed,
            responses,
            redemptions,
            responseRate: totalMailed > 0 ? (responses / totalMailed * 100) : 0,
            redemptionRate: responses > 0 ? (redemptions / responses * 100) : 0,
          };
        })
      );

      return comparisons.filter(c => c !== null);
    },
    enabled: campaignIds.length > 0,
  });
}


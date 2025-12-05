/**
 * useGiftCardCostEstimate - Calculate estimated gift card costs for a campaign
 * 
 * Fetches card values from linked gift card pools and calculates:
 * - Base card cost (based on estimated redemption rate)
 * - Redemption fee (default 20%)
 * - Combined total
 * 
 * Default redemption rate is 5% based on historical campaign data.
 * This is an estimate - actual redemption rates vary by campaign type and audience.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

// Default 5% redemption rate based on historical data
const DEFAULT_REDEMPTION_RATE = 5;

interface Condition {
  id: string;
  gift_card_pool_id?: string; // Legacy
  brand_id?: string; // New system
  card_value?: number; // New system
  is_active?: boolean;
}

interface GiftCardCostParams {
  conditions: Condition[];
  recipientCount: number; // Total recipients in campaign
  redemptionRatePercentage?: number; // Expected % that will redeem (default 5%)
  redemptionFeePercentage?: number; // ACE fee percentage (default 20%)
  clientId?: string;
}

interface GiftCardCostBreakdown {
  baseCardCost: number;
  redemptionFee: number;
  totalCost: number;
  cardValue: number;
  feePercentage: number;
  redemptionRate: number;
  estimatedRedemptions: number;
  formattedBaseCardCost: string;
  formattedRedemptionFee: string;
  formattedTotalCost: string;
  poolDetails: Array<{
    poolId: string;
    poolName: string;
    cardValue: number;
    provider: string;
  }>;
}

export function useGiftCardCostEstimate({
  conditions,
  recipientCount,
  redemptionRatePercentage = DEFAULT_REDEMPTION_RATE,
  redemptionFeePercentage,
  clientId,
}: GiftCardCostParams) {
  // Get unique pool IDs from active conditions (legacy support)
  const activePoolIds = conditions
    .filter(c => c.is_active !== false && c.gift_card_pool_id)
    .map(c => c.gift_card_pool_id!)
    .filter((id, index, arr) => arr.indexOf(id) === index);
  
  // Get brand_id + card_value combinations from active conditions (new system)
  const activeBrandValues = conditions
    .filter(c => c.is_active !== false && c.brand_id && c.card_value)
    .map(c => ({ brand_id: c.brand_id!, card_value: c.card_value! }));
  
  // Check if we have any gift card data at all
  const hasGiftCardData = activePoolIds.length > 0 || activeBrandValues.length > 0;

  // Fetch pool details (for legacy conditions)
  const { data: pools, isLoading: loadingPools } = useQuery({
    queryKey: ["gift-card-pools-cost", activePoolIds],
    queryFn: async () => {
      if (activePoolIds.length === 0) return [];

      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, pool_name, card_value, provider")
        .in("id", activePoolIds);

      if (error) throw error;
      return data;
    },
    enabled: activePoolIds.length > 0,
  });

  // Fetch redemption fee from organization/client if not provided
  const { data: feeConfig, isLoading: loadingFee } = useQuery({
    queryKey: ["redemption-fee", clientId],
    queryFn: async () => {
      if (!clientId) return { feePercentage: 20 };

      // First get client's org_id and any fee override
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("org_id, redemption_fee_override")
        .eq("id", clientId)
        .single();

      if (clientError) {
        console.error("Error fetching client fee:", clientError);
        return { feePercentage: 20 };
      }

      // If client has override, use it
      if (client.redemption_fee_override !== null) {
        return { feePercentage: client.redemption_fee_override };
      }

      // Otherwise get org's default fee
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("redemption_fee_percentage")
        .eq("id", client.org_id)
        .single();

      if (orgError) {
        console.error("Error fetching org fee:", orgError);
        return { feePercentage: 20 };
      }

      return { feePercentage: org.redemption_fee_percentage ?? 20 };
    },
    enabled: !!clientId && redemptionFeePercentage === undefined,
  });

  // Calculate costs
  const isLoading = loadingPools || (clientId && !redemptionFeePercentage && loadingFee);

  if (isLoading || recipientCount === 0 || !hasGiftCardData) {
    return {
      data: null,
      isLoading,
    };
  }

  // Use provided fee or fetched fee or default 20%
  const feePercentage = redemptionFeePercentage ?? feeConfig?.feePercentage ?? 20;

  // Calculate estimated redemptions based on redemption rate (default 5%)
  const estimatedRedemptions = Math.ceil(recipientCount * (redemptionRatePercentage / 100));

  // Calculate card values from BOTH new system (brand_id + card_value) AND legacy (pools)
  const newSystemValues = activeBrandValues.map(bv => bv.card_value);
  const legacyValues = pools?.map(pool => pool.card_value || 0) || [];
  const allCardValues = [...newSystemValues, ...legacyValues];
  
  if (allCardValues.length === 0) {
    return {
      data: null,
      isLoading: false,
    };
  }

  // Calculate average card value across all conditions
  const totalCardValue = allCardValues.reduce((sum, value) => sum + value, 0);
  const avgCardValue = totalCardValue / allCardValues.length;

  // Calculate costs based on estimated redemptions
  const baseCardCost = avgCardValue * estimatedRedemptions;
  const redemptionFee = baseCardCost * (feePercentage / 100);
  const totalCost = baseCardCost + redemptionFee;

  const breakdown: GiftCardCostBreakdown = {
    baseCardCost,
    redemptionFee,
    totalCost,
    cardValue: avgCardValue,
    feePercentage,
    redemptionRate: redemptionRatePercentage,
    estimatedRedemptions,
    formattedBaseCardCost: formatCurrency(baseCardCost),
    formattedRedemptionFee: formatCurrency(redemptionFee),
    formattedTotalCost: formatCurrency(totalCost),
    poolDetails: [
      // New system details
      ...activeBrandValues.map((bv, idx) => ({
        poolId: `brand-${bv.brand_id}-${bv.card_value}`,
        poolName: `Brand Card $${bv.card_value}`,
        cardValue: bv.card_value,
        provider: "Gift Card",
      })),
      // Legacy pool details
      ...(pools?.map(pool => ({
        poolId: pool.id,
        poolName: pool.pool_name,
        cardValue: pool.card_value,
        provider: pool.provider || "Unknown",
      })) || [])
    ],
  };

  return {
    data: breakdown,
    isLoading: false,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Simple hook to get redemption fee percentage for a client
 */
export function useRedemptionFee(clientId?: string) {
  return useQuery({
    queryKey: ["redemption-fee-simple", clientId],
    queryFn: async () => {
      if (!clientId) return 20;

      const { data: client } = await supabase
        .from("clients")
        .select("org_id, redemption_fee_override")
        .eq("id", clientId)
        .single();

      if (!client) return 20;

      if (client.redemption_fee_override !== null) {
        return client.redemption_fee_override;
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("redemption_fee_percentage")
        .eq("id", client.org_id)
        .single();

      return org?.redemption_fee_percentage ?? 20;
    },
    enabled: !!clientId,
  });
}

import { useMemo } from "react";

interface CostBreakdown {
  printing: number;
  postage: number;
  total: number;
  formattedPrinting: string;
  formattedPostage: string;
  formattedTotal: string;
}

interface CostEstimateParams {
  size?: string;
  postage?: string;
  recipientCount: number;
}

const PRINTING_COSTS: Record<string, number> = {
  "4x6": 0.35,
  "6x9": 0.55,
  "6x11": 0.75,
  "letter": 0.45,
  "trifold": 0.85,
};

const POSTAGE_COSTS: Record<string, number> = {
  "first_class": 0.73,
  "standard": 0.48,
};

export function useCampaignCostEstimate({ size, postage, recipientCount }: CostEstimateParams): CostBreakdown | null {
  return useMemo(() => {
    if (!size || !postage || recipientCount === 0) return null;

    const printingCost = (PRINTING_COSTS[size] || 0.35) * recipientCount;
    const postageCost = (POSTAGE_COSTS[postage] || 0.48) * recipientCount;
    const totalCost = printingCost + postageCost;

    return {
      printing: printingCost,
      postage: postageCost,
      total: totalCost,
      formattedPrinting: `$${printingCost.toFixed(2)}`,
      formattedPostage: `$${postageCost.toFixed(2)}`,
      formattedTotal: `$${totalCost.toFixed(2)}`,
    };
  }, [size, postage, recipientCount]);
}

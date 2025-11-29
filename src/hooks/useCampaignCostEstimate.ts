/**
 * useCampaignCostEstimate - Calculate print/postage costs for campaigns
 * 
 * Updated to support mailing method:
 * - Self-mailers: No print/postage costs (they handle their own)
 * - ACE fulfillment: Full print + postage costs
 */

import { useMemo } from "react";
import type { MailingMethod } from "@/types/campaigns";

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
  mailingMethod?: MailingMethod;
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

export function useCampaignCostEstimate({ 
  size, 
  postage, 
  recipientCount,
  mailingMethod 
}: CostEstimateParams): CostBreakdown | null {
  return useMemo(() => {
    // Self-mailers don't get print costs - they handle their own mailing
    if (mailingMethod === 'self') {
      return null;
    }

    // For ACE fulfillment, calculate print + postage costs
    if (!size || !postage || recipientCount === 0) return null;

    const printingCost = (PRINTING_COSTS[size] || 0.35) * recipientCount;
    const postageCost = (POSTAGE_COSTS[postage] || 0.48) * recipientCount;
    const totalCost = printingCost + postageCost;

    return {
      printing: printingCost,
      postage: postageCost,
      total: totalCost,
      formattedPrinting: formatCurrency(printingCost),
      formattedPostage: formatCurrency(postageCost),
      formattedTotal: formatCurrency(totalCost),
    };
  }, [size, postage, recipientCount, mailingMethod]);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

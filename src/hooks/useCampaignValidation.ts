/**
 * Campaign Validation Hooks - New API-First Implementation
 * 
 * Server-side validation for campaigns using edge functions
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BudgetValidationResult {
  valid: boolean;
  estimatedCost: number;
  availableCredits: number;
  shortfall?: number;
  error?: string;
}

interface GiftCardConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  inventoryStatus: {
    availableCount: number;
    source: 'inventory' | 'tillo' | 'insufficient';
    message: string;
  };
}

/**
 * Validate campaign budget before launch
 * Uses server-side validation with business rules
 */
export function useValidateCampaignBudget() {
  return useMutation({
    mutationFn: async ({
      campaignId,
      recipientCount,
      giftCardDenomination,
      mailCostPerPiece = 0.55,
    }: {
      campaignId: string;
      recipientCount: number;
      giftCardDenomination: number;
      mailCostPerPiece?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'validate-campaign-budget',
        {
          body: {
            campaignId,
            recipientCount,
            giftCardDenomination,
            mailCostPerPiece,
          },
        }
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Validation failed');

      return data.data as BudgetValidationResult;
    },
  });
}

/**
 * Validate gift card configuration
 * Checks brand availability, denominations, and inventory
 */
export function useValidateGiftCardConfiguration() {
  return useMutation({
    mutationFn: async ({
      campaignId,
      brandId,
      denomination,
      conditionNumber,
    }: {
      campaignId: string;
      brandId: string;
      denomination: number;
      conditionNumber: number;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'validate-gift-card-configuration',
        {
          body: {
            campaignId,
            brandId,
            denomination,
            conditionNumber,
          },
        }
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Validation failed');

      return data.data as GiftCardConfigValidation;
    },
  });
}

/**
 * Real-time budget check for campaign wizard
 * Validates as user types/changes values
 */
export function useCampaignBudgetCheck(
  campaignId: string | undefined,
  recipientCount: number,
  giftCardDenomination: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['campaign-budget-check', campaignId, recipientCount, giftCardDenomination],
    queryFn: async () => {
      if (!campaignId) return null;

      const { data, error } = await supabase.functions.invoke(
        'validate-campaign-budget',
        {
          body: {
            campaignId,
            recipientCount,
            giftCardDenomination,
          },
        }
      );

      if (error) throw error;
      return data.data as BudgetValidationResult;
    },
    enabled: enabled && !!campaignId && recipientCount > 0 && giftCardDenomination > 0,
    staleTime: 10000, // Cache for 10 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Real-time gift card availability check
 */
export function useGiftCardAvailabilityCheck(
  campaignId: string | undefined,
  brandId: string | undefined,
  denomination: number,
  conditionNumber: number = 1,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['gift-card-availability', campaignId, brandId, denomination, conditionNumber],
    queryFn: async () => {
      if (!campaignId || !brandId) return null;

      const { data, error } = await supabase.functions.invoke(
        'validate-gift-card-configuration',
        {
          body: {
            campaignId,
            brandId,
            denomination,
            conditionNumber,
          },
        }
      );

      if (error) throw error;
      return data.data as GiftCardConfigValidation;
    },
    enabled: enabled && !!campaignId && !!brandId && denomination > 0,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every minute for inventory updates
  });
}

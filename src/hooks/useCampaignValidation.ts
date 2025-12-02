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

interface ValidationCheck {
  id: string;
  label: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message?: string;
}

interface CampaignValidationResult {
  isValid: boolean;
  checks: ValidationCheck[];
}

/**
 * Client-side campaign validation for wizard
 * Performs basic validation checks before campaign creation
 */
export function useCampaignValidation(
  formData: any,
  clientId: string
): CampaignValidationResult {
  const checks: ValidationCheck[] = [];

  // Basic campaign details
  checks.push({
    id: 'campaign-name',
    label: 'Campaign Name',
    status: formData.name?.trim() ? 'success' : 'error',
    message: formData.name?.trim() ? undefined : 'Campaign name is required',
  });

  // Mailing method check
  checks.push({
    id: 'mailing-method',
    label: 'Mailing Method',
    status: formData.mailing_method ? 'success' : 'error',
    message: formData.mailing_method ? undefined : 'Select a mailing method',
  });

  // For ACE fulfillment, check size and postage
  if (formData.mailing_method === 'ace') {
    checks.push({
      id: 'mail-size',
      label: 'Mail Size',
      status: formData.size ? 'success' : 'error',
      message: formData.size ? undefined : 'Select a mail size',
    });

    checks.push({
      id: 'postage',
      label: 'Postage Class',
      status: formData.postage ? 'success' : 'error',
      message: formData.postage ? undefined : 'Select a postage class',
    });
  }

  // Audience validation
  const hasAudience = formData.contact_list_id || formData.codes_uploaded;
  checks.push({
    id: 'audience',
    label: 'Audience',
    status: hasAudience ? 'success' : 'error',
    message: hasAudience ? undefined : 'Upload codes or select a contact list',
  });

  // Conditions validation
  const activeConditions = (formData.conditions || []).filter((c: any) => c.is_active);
  checks.push({
    id: 'conditions',
    label: 'Reward Conditions',
    status: activeConditions.length > 0 ? 'success' : 'warning',
    message: activeConditions.length > 0 ? undefined : 'No active reward conditions',
  });

  // Check if conditions have gift card rewards configured (brand_id + card_value)
  const conditionsWithRewards = activeConditions.filter((c: any) => c.brand_id && c.card_value);
  if (activeConditions.length > 0) {
    checks.push({
      id: 'gift-card-rewards',
      label: 'Gift Card Rewards',
      status: conditionsWithRewards.length === activeConditions.length ? 'success' : 
              conditionsWithRewards.length > 0 ? 'warning' : 'warning',
      message: conditionsWithRewards.length === activeConditions.length ? 
        undefined : 'Some conditions do not have gift cards configured',
    });
  }

  // Landing page or form (optional but recommended)
  const hasLandingOrForm = formData.landing_page_id || 
    (formData.selected_form_ids && formData.selected_form_ids.length > 0);
  checks.push({
    id: 'landing-page',
    label: 'Landing Page/Form',
    status: hasLandingOrForm ? 'success' : 'warning',
    message: hasLandingOrForm ? undefined : 'No landing page or form selected (can be added later)',
  });

  // Calculate overall validity - only errors block creation
  const hasErrors = checks.some(c => c.status === 'error');

  return {
    isValid: !hasErrors,
    checks,
  };
}
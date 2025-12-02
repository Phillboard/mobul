/**
 * Validate Campaign Budget Edge Function
 * 
 * Server-side validation for campaign budget and credit availability
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withApiGateway } from '../_shared/api-gateway.ts';
import { CampaignBudgetSchema } from '../_shared/schemas/validation.ts';
import { validateCampaignBudget } from '../_shared/business-rules/campaign-rules.ts';

interface ValidateBudgetRequest {
  campaignId: string;
  recipientCount: number;
  giftCardDenomination: number;
  mailCostPerPiece?: number;
}

interface ValidateBudgetResponse {
  valid: boolean;
  estimatedCost: number;
  availableCredits: number;
  shortfall?: number;
  error?: string;
}

serve(
  withApiGateway<ValidateBudgetRequest, ValidateBudgetResponse>(
    async (request, context) => {
      const {
        campaignId,
        recipientCount,
        giftCardDenomination,
        mailCostPerPiece = 0.55,
      } = request;

      console.log('[VALIDATE-BUDGET] Checking budget for campaign:', campaignId);

      // Get campaign details to determine billing entity
      const { data: campaign, error: campaignError } = await context.client!
        .from('campaigns')
        .select('client_id, clients!inner(id, agency_id)')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      // Get entity credits
      const { data: billingEntity, error: billingError } = await context.client!
        .rpc('get_billing_entity_for_campaign', { p_campaign_id: campaignId });

      if (billingError || !billingEntity || billingEntity.length === 0) {
        throw new Error('Failed to determine billing entity');
      }

      const availableCredits = billingEntity[0].available_credits || 0;

      // Validate budget using business rules
      const validation = validateCampaignBudget(
        recipientCount,
        giftCardDenomination,
        mailCostPerPiece,
        availableCredits
      );

      const response: ValidateBudgetResponse = {
        valid: validation.valid,
        estimatedCost: validation.estimatedCost!,
        availableCredits: validation.availableBudget!,
        shortfall: validation.valid ? undefined : validation.estimatedCost! - validation.availableBudget!,
        error: validation.error,
      };

      return response;
    },
    {
      requireAuth: true,
      validateSchema: CampaignBudgetSchema,
      auditAction: 'validate_campaign_budget',
      rateLimitKey: 'validate_budget',
    }
  )
);


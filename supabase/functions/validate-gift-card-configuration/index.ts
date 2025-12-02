/**
 * Validate Gift Card Configuration Edge Function
 * 
 * Server-side validation for campaign gift card configuration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withApiGateway } from '../_shared/api-gateway.ts';
import { GiftCardConfigSchema } from '../_shared/schemas/validation.ts';
import { 
  validateGiftCardDenomination,
  checkClientBrandAvailability,
  validateInventoryAvailability,
} from '../_shared/business-rules/gift-card-rules.ts';

interface ValidateConfigRequest {
  campaignId: string;
  brandId: string;
  denomination: number;
  conditionNumber: number;
}

interface ValidateConfigResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  inventoryStatus: {
    availableCount: number;
    source: 'inventory' | 'tillo' | 'insufficient';
    message: string;
  };
}

serve(
  withApiGateway<ValidateConfigRequest, ValidateConfigResponse>(
    async (request, context) => {
      const { campaignId, brandId, denomination, conditionNumber } = request;

      console.log('[VALIDATE-CONFIG] Validating gift card config:', {
        campaignId,
        brandId,
        denomination,
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Get campaign and client details
      const { data: campaign, error: campaignError } = await context.client!
        .from('campaigns')
        .select('client_id')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        errors.push('Campaign not found');
        return {
          valid: false,
          errors,
          warnings,
          inventoryStatus: {
            availableCount: 0,
            source: 'insufficient',
            message: 'Campaign not found',
          },
        };
      }

      // Check if client has access to this brand/denomination
      const { data: clientAvailable, error: availableError } = await context.client!
        .from('client_available_gift_cards')
        .select('*')
        .eq('client_id', campaign.client_id)
        .eq('brand_id', brandId)
        .eq('denomination', denomination)
        .eq('is_enabled', true);

      if (availableError || !clientAvailable || clientAvailable.length === 0) {
        errors.push('This gift card is not available for your account');
      }

      // Get available denominations for brand
      const { data: denominations, error: denomError } = await context.client!
        .from('gift_card_denominations')
        .select('denomination')
        .eq('brand_id', brandId)
        .eq('is_enabled_by_admin', true);

      if (denomError) {
        errors.push('Failed to fetch available denominations');
      } else {
        const availableDenominations = denominations.map((d) => d.denomination);
        const denomValidation = validateGiftCardDenomination(denomination, availableDenominations);
        
        if (!denomValidation.valid) {
          errors.push(denomValidation.error!);
        }
      }

      // Check inventory availability
      const { data: inventoryCount, error: inventoryError } = await context.client!
        .rpc('get_inventory_count', {
          p_brand_id: brandId,
          p_denomination: denomination,
        });

      let inventoryStatus = {
        availableCount: 0,
        source: 'insufficient' as const,
        message: 'No inventory available',
      };

      if (!inventoryError && inventoryCount !== null) {
        // Check if Tillo is enabled for this brand
        const { data: brand } = await context.client!
          .from('gift_card_brands')
          .select('tillo_brand_code')
          .eq('id', brandId)
          .single();

        const tilloEnabled = !!brand?.tillo_brand_code;

        const availability = validateInventoryAvailability(1, inventoryCount, tilloEnabled);
        
        inventoryStatus = {
          availableCount: inventoryCount,
          source: availability.source,
          message: availability.message,
        };

        if (!availability.sufficient) {
          warnings.push(availability.message);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        inventoryStatus,
      };
    },
    {
      requireAuth: true,
      validateSchema: GiftCardConfigSchema,
      auditAction: 'validate_gift_card_config',
      rateLimitKey: 'validate_config',
    }
  )
);


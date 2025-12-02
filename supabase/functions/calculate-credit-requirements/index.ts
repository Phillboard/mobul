/**
 * Calculate Credit Requirements Edge Function
 * 
 * Server-side credit calculation for campaigns and operations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withApiGateway } from '../_shared/api-gateway.ts';
import { calculateCampaignCreditRequirement } from '../_shared/business-rules/credit-rules.ts';

interface CalculateCreditsRequest {
  recipientCount: number;
  giftCardDenomination: number;
  mailCostPerPiece?: number;
}

interface CalculateCreditsResponse {
  giftCardTotal: number;
  mailTotal: number;
  grandTotal: number;
  breakdown: {
    perRecipient: {
      giftCard: number;
      mail: number;
      total: number;
    };
  };
}

serve(
  withApiGateway<CalculateCreditsRequest, CalculateCreditsResponse>(
    async (request, _context) => {
      const {
        recipientCount,
        giftCardDenomination,
        mailCostPerPiece = 0.55,
      } = request;

      console.log('[CALCULATE-CREDITS] Calculating requirements:', {
        recipientCount,
        giftCardDenomination,
        mailCostPerPiece,
      });

      const requirements = calculateCampaignCreditRequirement(
        recipientCount,
        giftCardDenomination,
        mailCostPerPiece
      );

      return {
        ...requirements,
        breakdown: {
          perRecipient: {
            giftCard: giftCardDenomination,
            mail: mailCostPerPiece,
            total: giftCardDenomination + mailCostPerPiece,
          },
        },
      };
    },
    {
      requireAuth: true,
      rateLimitKey: 'calculate_credits',
    }
  )
);


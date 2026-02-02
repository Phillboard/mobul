/**
 * Calculate Credit Requirements Edge Function
 * 
 * Server-side credit calculation for campaigns and operations.
 */

import { withApiGateway, type AuthContext } from '../_shared/api-gateway.ts';
import { calculateCampaignCreditRequirement } from '../_shared/business-rules/credit-rules.ts';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Main Handler
// ============================================================================

async function handleCalculateCredits(
  request: CalculateCreditsRequest,
  _context: AuthContext
): Promise<CalculateCreditsResponse> {
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
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleCalculateCredits, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'calculate_credit_requirements',
}));

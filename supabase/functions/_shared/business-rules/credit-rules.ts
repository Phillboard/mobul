/**
 * Credit Management Business Rules
 * 
 * Centralized business logic for credit allocation and validation
 */

export interface CreditAllocationRequest {
  fromEntityType: 'platform' | 'agency' | 'client';
  fromEntityId: string;
  toEntityType: 'agency' | 'client';
  toEntityId: string;
  amount: number;
  reason?: string;
}

export interface CreditValidationResult {
  valid: boolean;
  error?: string;
  availableBalance?: number;
  requiredAmount?: number;
}

/**
 * Validate credit allocation request
 */
export function validateCreditAllocation(
  request: CreditAllocationRequest,
  fromBalance: number
): CreditValidationResult {
  // Validate amount
  if (request.amount <= 0) {
    return {
      valid: false,
      error: 'Amount must be greater than zero',
    };
  }

  // Check sufficient balance
  if (fromBalance < request.amount) {
    return {
      valid: false,
      error: 'Insufficient credit balance',
      availableBalance: fromBalance,
      requiredAmount: request.amount,
    };
  }

  // Validate hierarchy rules
  if (request.fromEntityType === 'client') {
    return {
      valid: false,
      error: 'Clients cannot allocate credits (only receive)',
    };
  }

  if (request.fromEntityType === 'agency' && request.toEntityType === 'agency') {
    return {
      valid: false,
      error: 'Agencies cannot allocate credits to other agencies',
    };
  }

  if (request.fromEntityType === 'platform' && request.toEntityType === 'client') {
    return {
      valid: false,
      error: 'Platform can only allocate to agencies directly',
    };
  }

  return {
    valid: true,
    availableBalance: fromBalance,
  };
}

/**
 * Calculate campaign credit requirements
 */
export function calculateCampaignCreditRequirement(
  recipientCount: number,
  giftCardDenomination: number,
  mailCostPerPiece: number = 0.55
): {
  giftCardTotal: number;
  mailTotal: number;
  grandTotal: number;
} {
  const giftCardTotal = recipientCount * giftCardDenomination;
  const mailTotal = recipientCount * mailCostPerPiece;
  const grandTotal = giftCardTotal + mailTotal;

  return {
    giftCardTotal,
    mailTotal,
    grandTotal,
  };
}

/**
 * Check if entity has sufficient credits for campaign
 */
export function hasS ufficientCreditsForCampaign(
  entityBalance: number,
  recipientCount: number,
  giftCardDenomination: number,
  mailCostPerPiece: number = 0.55
): CreditValidationResult {
  const requirements = calculateCampaignCreditRequirement(
    recipientCount,
    giftCardDenomination,
    mailCostPerPiece
  );

  if (entityBalance < requirements.grandTotal) {
    return {
      valid: false,
      error: `Insufficient credits. Required: $${requirements.grandTotal.toFixed(2)}, Available: $${entityBalance.toFixed(2)}`,
      availableBalance: entityBalance,
      requiredAmount: requirements.grandTotal,
    };
  }

  return {
    valid: true,
    availableBalance: entityBalance,
    requiredAmount: requirements.grandTotal,
  };
}

/**
 * Validate credit transfer between entities
 */
export function validateCreditTransfer(
  fromType: string,
  toType: string,
  amount: number,
  fromBalance: number
): CreditValidationResult {
  // Check minimum transfer amount
  const MIN_TRANSFER = 10;
  if (amount < MIN_TRANSFER) {
    return {
      valid: false,
      error: `Minimum transfer amount is $${MIN_TRANSFER}`,
    };
  }

  // Check maximum transfer amount (prevent fat-finger errors)
  const MAX_TRANSFER = 100000;
  if (amount > MAX_TRANSFER) {
    return {
      valid: false,
      error: `Maximum single transfer is $${MAX_TRANSFER}. Please contact support for larger transfers.`,
    };
  }

  // Validate balance
  if (fromBalance < amount) {
    return {
      valid: false,
      error: 'Insufficient balance for transfer',
      availableBalance: fromBalance,
      requiredAmount: amount,
    };
  }

  return {
    valid: true,
    availableBalance: fromBalance,
  };
}


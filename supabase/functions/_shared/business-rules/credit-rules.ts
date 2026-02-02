/**
 * Credit Management Business Rules
 * 
 * Centralized business logic for credit allocation and validation
 */

// ============================================================================
// Types
// ============================================================================

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

export interface CreditAccount {
  id: string;
  account_type: 'platform' | 'agency' | 'client' | 'campaign';
  owner_id: string;
  parent_account_id: string | null;
  total_purchased: number;
  total_allocated: number;
  total_used: number;
  total_remaining: number;
  status: 'active' | 'suspended' | 'depleted';
}

export interface AllocationValidationParams {
  fromAccount: CreditAccount;
  toAccount: CreditAccount;
  amount: number;
}

// ============================================================================
// Constants
// ============================================================================

export const CREDIT_LIMITS = {
  MIN_TRANSFER: 10,
  MAX_TRANSFER: 100000,
  MIN_ALLOCATION: 1,
} as const;

/**
 * Credit hierarchy - money can only flow DOWN
 * platform → agency → client → campaign
 */
export const CREDIT_HIERARCHY = ['platform', 'agency', 'client', 'campaign'] as const;

// ============================================================================
// Basic Validation
// ============================================================================

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

// ============================================================================
// Account-Based Validation (Extended)
// ============================================================================

/**
 * Validate allocation between credit accounts
 * Extracted from allocate-credit function
 */
export function validateAccountAllocation(params: AllocationValidationParams): CreditValidationResult {
  const { fromAccount, toAccount, amount } = params;

  // Validate amount
  if (amount <= 0) {
    return {
      valid: false,
      error: 'Allocation amount must be positive',
    };
  }

  // Check minimum allocation
  if (amount < CREDIT_LIMITS.MIN_ALLOCATION) {
    return {
      valid: false,
      error: `Minimum allocation is $${CREDIT_LIMITS.MIN_ALLOCATION}`,
    };
  }

  // Ensure parent-child relationship
  if (toAccount.parent_account_id !== fromAccount.id) {
    return {
      valid: false,
      error: 'Can only allocate credit from parent to direct child account',
    };
  }

  // Validate account status
  if (fromAccount.status === 'suspended') {
    return {
      valid: false,
      error: 'Cannot allocate from suspended account',
    };
  }

  if (toAccount.status === 'suspended') {
    return {
      valid: false,
      error: 'Cannot allocate to suspended account',
    };
  }

  // Validate hierarchy (money flows down only)
  const fromLevel = CREDIT_HIERARCHY.indexOf(fromAccount.account_type);
  const toLevel = CREDIT_HIERARCHY.indexOf(toAccount.account_type);

  if (fromLevel === -1 || toLevel === -1) {
    return {
      valid: false,
      error: 'Invalid account type',
    };
  }

  if (fromLevel >= toLevel) {
    return {
      valid: false,
      error: `Invalid allocation: money can only flow DOWN the hierarchy (${CREDIT_HIERARCHY.join(' → ')})`,
    };
  }

  // Check sufficient balance
  if (fromAccount.total_remaining < amount) {
    return {
      valid: false,
      error: `Insufficient credit in parent account. Available: $${fromAccount.total_remaining}, Required: $${amount}`,
      availableBalance: fromAccount.total_remaining,
      requiredAmount: amount,
    };
  }

  return {
    valid: true,
    availableBalance: fromAccount.total_remaining,
  };
}

/**
 * Check if account type can allocate to another type
 */
export function canAllocateTo(
  fromType: CreditAccount['account_type'],
  toType: CreditAccount['account_type']
): boolean {
  const fromLevel = CREDIT_HIERARCHY.indexOf(fromType);
  const toLevel = CREDIT_HIERARCHY.indexOf(toType);

  return fromLevel !== -1 && toLevel !== -1 && fromLevel < toLevel;
}

/**
 * Get allowed allocation targets for an account type
 */
export function getAllowedTargets(
  fromType: CreditAccount['account_type']
): CreditAccount['account_type'][] {
  const fromLevel = CREDIT_HIERARCHY.indexOf(fromType);
  if (fromLevel === -1) return [];
  return CREDIT_HIERARCHY.slice(fromLevel + 1) as CreditAccount['account_type'][];
}

// ============================================================================
// Campaign Credit Calculations
// ============================================================================

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
export function hasSufficientCreditsForCampaign(
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

// ============================================================================
// Transfer Validation
// ============================================================================

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
  if (amount < CREDIT_LIMITS.MIN_TRANSFER) {
    return {
      valid: false,
      error: `Minimum transfer amount is $${CREDIT_LIMITS.MIN_TRANSFER}`,
    };
  }

  // Check maximum transfer amount (prevent fat-finger errors)
  if (amount > CREDIT_LIMITS.MAX_TRANSFER) {
    return {
      valid: false,
      error: `Maximum single transfer is $${CREDIT_LIMITS.MAX_TRANSFER}. Please contact support for larger transfers.`,
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

// ============================================================================
// Transaction Helpers
// ============================================================================

export interface TransactionParams {
  accountId: string;
  type: 'allocation_out' | 'allocation_in' | 'purchase' | 'usage' | 'refund' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  relatedTransactionId?: string;
  notes?: string;
  createdByUserId?: string;
}

/**
 * Create transaction record object
 */
export function createTransactionRecord(params: TransactionParams) {
  return {
    account_id: params.accountId,
    transaction_type: params.type,
    amount: params.amount,
    balance_before: params.balanceBefore,
    balance_after: params.balanceAfter,
    related_transaction_id: params.relatedTransactionId || null,
    notes: params.notes || null,
    created_by_user_id: params.createdByUserId || null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Calculate new balance after allocation
 */
export function calculateAllocationBalances(
  fromAccount: CreditAccount,
  toAccount: CreditAccount,
  amount: number
): {
  fromBalanceAfter: number;
  toBalanceAfter: number;
  fromAllocatedAfter: number;
  toPurchasedAfter: number;
} {
  return {
    fromBalanceAfter: fromAccount.total_remaining - amount,
    toBalanceAfter: toAccount.total_remaining + amount,
    fromAllocatedAfter: fromAccount.total_allocated + amount,
    toPurchasedAfter: toAccount.total_purchased + amount,
  };
}

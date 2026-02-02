/**
 * Gift Card Business Rules
 * 
 * Centralized business logic for:
 * - Provisioning eligibility
 * - Redemption validation
 * - Balance checking
 * - Revocation rules
 * - Code validation
 */

// ============================================================================
// Types
// ============================================================================

export interface GiftCardProvisioningEligibility {
  eligible: boolean;
  reason?: string;
  requirements?: string[];
}

export interface RecipientStatus {
  smsOptInStatus: string;
  smsOptInDate?: string;
  emailVerified?: boolean;
  conditionsMet: boolean;
  alreadyProvisioned: boolean;
}

export interface RedemptionValidationResult {
  valid: boolean;
  reason: RedemptionFailureReason | null;
  message: string;
  canRetry: boolean;
}

export type RedemptionFailureReason =
  | 'CODE_NOT_FOUND'
  | 'CODE_ALREADY_REDEEMED'
  | 'CODE_EXPIRED'
  | 'CAMPAIGN_MISMATCH'
  | 'CAMPAIGN_INACTIVE'
  | 'APPROVAL_PENDING'
  | 'APPROVAL_REJECTED'
  | 'OPT_OUT'
  | 'OPT_IN_PENDING'
  | 'NO_CARDS_AVAILABLE'
  | 'INVALID_FORMAT';

export interface RevocationValidationResult {
  canRevoke: boolean;
  reason?: string;
  warnings?: string[];
}

export interface BalanceCheckConfig {
  method: 'tillo_api' | 'other_api' | 'manual' | 'none';
  brandCode?: string;
  apiEndpoint?: string;
  apiConfig?: Record<string, unknown>;
}

export interface BalanceCheckResult {
  balance: number | null;
  status: 'success' | 'error' | 'manual_required' | 'not_supported';
  error?: string;
}

// ============================================================================
// Provisioning Eligibility Rules
// ============================================================================

/**
 * Check if recipient is eligible for gift card provisioning
 */
export function checkProvisioningEligibility(
  recipientStatus: RecipientStatus,
  deliveryMethod: 'sms' | 'email'
): GiftCardProvisioningEligibility {
  const requirements: string[] = [];

  // Check if already provisioned
  if (recipientStatus.alreadyProvisioned) {
    return {
      eligible: false,
      reason: 'Gift card has already been provisioned for this recipient',
    };
  }

  // Check conditions met
  if (!recipientStatus.conditionsMet) {
    requirements.push('Complete all required campaign conditions');
    return {
      eligible: false,
      reason: 'Recipient has not completed all required conditions',
      requirements,
    };
  }

  // Check SMS opt-in for SMS delivery
  if (deliveryMethod === 'sms') {
    if (recipientStatus.smsOptInStatus !== 'opted_in') {
      requirements.push('SMS opt-in required');
      return {
        eligible: false,
        reason: 'Recipient must opt-in to receive SMS',
        requirements,
      };
    }

    // Check opt-in recency (within 180 days for compliance)
    if (recipientStatus.smsOptInDate) {
      const optInDate = new Date(recipientStatus.smsOptInDate);
      const daysSinceOptIn = (Date.now() - optInDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceOptIn > 180) {
        requirements.push('Recent SMS opt-in required (within 180 days)');
        return {
          eligible: false,
          reason: 'SMS opt-in has expired. Please collect fresh opt-in.',
          requirements,
        };
      }
    }
  }

  // Check email verification for email delivery
  if (deliveryMethod === 'email' && !recipientStatus.emailVerified) {
    requirements.push('Valid email address required');
    return {
      eligible: false,
      reason: 'Recipient email is not verified',
      requirements,
    };
  }

  return {
    eligible: true,
  };
}

// ============================================================================
// Redemption Code Validation Rules
// ============================================================================

/**
 * Validate redemption code format
 * Codes should be alphanumeric with optional dashes, 4-50 characters
 */
export function validateRedemptionCodeFormat(code: string): RedemptionValidationResult {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      reason: 'INVALID_FORMAT',
      message: 'Redemption code is required',
      canRetry: true,
    };
  }

  const sanitizedCode = code.trim().toUpperCase();
  
  if (sanitizedCode.length < 4 || sanitizedCode.length > 50) {
    return {
      valid: false,
      reason: 'INVALID_FORMAT',
      message: 'Code must be between 4 and 50 characters',
      canRetry: true,
    };
  }

  // Allow alphanumeric with dashes and spaces
  if (!/^[A-Z0-9\s-]+$/.test(sanitizedCode)) {
    return {
      valid: false,
      reason: 'INVALID_FORMAT',
      message: 'Code must contain only letters, numbers, dashes, and spaces',
      canRetry: true,
    };
  }

  return {
    valid: true,
    reason: null,
    message: 'Code format is valid',
    canRetry: false,
  };
}

/**
 * Normalize a redemption code (remove dashes, spaces, uppercase)
 */
export function normalizeRedemptionCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Check recipient approval status for redemption eligibility
 */
export function checkRecipientApprovalStatus(
  approvalStatus: string,
  rejectionReason?: string | null
): RedemptionValidationResult {
  switch (approvalStatus) {
    case 'pending':
      return {
        valid: false,
        reason: 'APPROVAL_PENDING',
        message: 'Your code has not been activated yet. Please call customer service to activate.',
        canRetry: false,
      };
    
    case 'rejected':
      return {
        valid: false,
        reason: 'APPROVAL_REJECTED',
        message: rejectionReason 
          ? `This code has been rejected: ${rejectionReason}`
          : 'This code has been rejected. Please contact customer service for assistance.',
        canRetry: false,
      };
    
    case 'approved':
    case 'redeemed':
      return {
        valid: true,
        reason: null,
        message: approvalStatus === 'redeemed' ? 'Code already redeemed' : 'Code is approved',
        canRetry: false,
      };
    
    default:
      return {
        valid: false,
        reason: 'INVALID_FORMAT',
        message: 'Unknown approval status',
        canRetry: false,
      };
  }
}

/**
 * Check SMS opt-in status for redemption
 */
export function checkSmsOptInForRedemption(
  smsOptInStatus: string | null
): RedemptionValidationResult {
  if (!smsOptInStatus || smsOptInStatus === 'not_sent' || smsOptInStatus === 'opted_in') {
    return {
      valid: true,
      reason: null,
      message: 'SMS opt-in status OK',
      canRetry: false,
    };
  }

  if (smsOptInStatus === 'opted_out') {
    return {
      valid: false,
      reason: 'OPT_OUT',
      message: 'Customer has opted out of marketing messages',
      canRetry: false,
    };
  }

  if (smsOptInStatus === 'pending') {
    return {
      valid: false,
      reason: 'OPT_IN_PENDING',
      message: 'Customer has not yet confirmed opt-in',
      canRetry: true,
    };
  }

  return {
    valid: true,
    reason: null,
    message: 'SMS opt-in status OK',
    canRetry: false,
  };
}

// ============================================================================
// Revocation Rules
// ============================================================================

/**
 * Validate if a gift card assignment can be revoked
 */
export function validateRevocation(
  deliveryStatus: string,
  cardSource: 'inventory' | 'tillo' | null,
  hasBeenUsed: boolean
): RevocationValidationResult {
  const warnings: string[] = [];

  // Already revoked
  if (deliveryStatus === 'revoked') {
    return {
      canRevoke: false,
      reason: 'This gift card has already been revoked',
    };
  }

  // Card has been used - warn but allow
  if (hasBeenUsed) {
    warnings.push('Warning: This card appears to have been used. The balance may be reduced or zero.');
  }

  // Tillo cards - warn about non-reversibility
  if (cardSource === 'tillo') {
    warnings.push('Note: This is an API-provisioned card. Revocation will not refund the Tillo transaction.');
  }

  return {
    canRevoke: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Minimum reason length for revocation audit trail
 */
export const REVOCATION_MIN_REASON_LENGTH = 10;

/**
 * Validate revocation reason
 */
export function validateRevocationReason(reason: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!reason || reason.trim().length < REVOCATION_MIN_REASON_LENGTH) {
    return {
      valid: false,
      error: `Reason is required and must be at least ${REVOCATION_MIN_REASON_LENGTH} characters`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Balance Check Rules
// ============================================================================

/**
 * Determine balance check method for a brand
 * Uses smart detection: If not explicitly set, auto-detects based on brand configuration
 */
export function determineBalanceCheckMethod(
  explicitMethod: string | null,
  provider: string | null,
  tilloBrandCode: string | null
): BalanceCheckConfig['method'] {
  if (explicitMethod) {
    return explicitMethod as BalanceCheckConfig['method'];
  }

  // Auto-detect: Use Tillo API if provider is 'tillo' or tillo_brand_code is set
  const isTilloBrand = provider === 'tillo' || !!tilloBrandCode;
  return isTilloBrand ? 'tillo_api' : 'manual';
}

/**
 * Validate balance check can be performed
 */
export function validateBalanceCheckRequest(
  cardCode: string | null,
  brandCode: string | null,
  method: BalanceCheckConfig['method']
): { valid: boolean; error?: string } {
  if (!cardCode) {
    return {
      valid: false,
      error: 'Card code is required for balance check',
    };
  }

  if (method === 'tillo_api' && !brandCode) {
    return {
      valid: false,
      error: 'Brand code is required for Tillo balance check',
    };
  }

  if (method === 'other_api') {
    // Would need endpoint validation
    return { valid: true };
  }

  if (method === 'none') {
    return {
      valid: false,
      error: 'Balance checking not supported for this brand',
    };
  }

  return { valid: true };
}

/**
 * Validate gift card denomination
 */
export function validateGiftCardDenomination(
  denomination: number,
  availableDenominations: number[]
): { valid: boolean; error?: string } {
  if (denomination <= 0) {
    return {
      valid: false,
      error: 'Denomination must be greater than zero',
    };
  }

  if (!availableDenominations.includes(denomination)) {
    return {
      valid: false,
      error: `Invalid denomination. Available: ${availableDenominations.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Calculate gift card profit margin
 */
export function calculateGiftCardProfit(
  faceValue: number,
  costBasis: number,
  markup: number = 0
): {
  faceValue: number;
  costBasis: number;
  markup: number;
  sellingPrice: number;
  profit: number;
  marginPercent: number;
} {
  const sellingPrice = faceValue + markup;
  const profit = sellingPrice - costBasis;
  const marginPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

  return {
    faceValue,
    costBasis,
    markup,
    sellingPrice,
    profit,
    marginPercent,
  };
}

/**
 * Validate gift card inventory availability
 */
export function validateInventoryAvailability(
  requiredQuantity: number,
  availableInventory: number,
  tilloEnabled: boolean
): {
  sufficient: boolean;
  source: 'inventory' | 'tillo' | 'insufficient';
  message: string;
} {
  if (availableInventory >= requiredQuantity) {
    return {
      sufficient: true,
      source: 'inventory',
      message: `${availableInventory} cards available in inventory`,
    };
  }

  if (tilloEnabled) {
    return {
      sufficient: true,
      source: 'tillo',
      message: `Will provision from Tillo API (${availableInventory} in inventory, ${requiredQuantity - availableInventory} from API)`,
    };
  }

  return {
    sufficient: false,
    source: 'insufficient',
    message: `Insufficient inventory (${availableInventory} available, ${requiredQuantity} required) and Tillo API not enabled`,
  };
}

/**
 * Check brand-denomination availability for client
 */
export function checkClientBrandAvailability(
  clientAvailableBrands: Array<{ brandId: string; denomination: number }>,
  requestedBrandId: string,
  requestedDenomination: number
): { available: boolean; reason?: string } {
  const hasAccess = clientAvailableBrands.some(
    b => b.brandId === requestedBrandId && b.denomination === requestedDenomination
  );

  if (!hasAccess) {
    return {
      available: false,
      reason: 'This brand/denomination combination is not available for your account. Please contact your account manager.',
    };
  }

  return { available: true };
}

// ============================================================================
// Transfer/Purchase Rules
// ============================================================================

/**
 * Validate admin card transfer request
 */
export function validateAdminTransfer(
  availableCards: number,
  requestedQuantity: number,
  clientCredits: number,
  totalAmount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (requestedQuantity <= 0) {
    errors.push('Quantity must be greater than zero');
  }

  if (availableCards < requestedQuantity) {
    errors.push(`Insufficient cards in master pool. Available: ${availableCards}, Requested: ${requestedQuantity}`);
  }

  if (clientCredits < totalAmount) {
    errors.push(`Insufficient client balance. Available: ${clientCredits}, Required: ${totalAmount}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Monitoring Thresholds
// ============================================================================

export const MONITORING_THRESHOLDS = {
  CSV_HEALTHY: 50,
  CSV_LOW: 10,
  CSV_EMPTY: 0,
  AGENCY_LOW_CREDIT: 1000,
  CLIENT_LOW_CREDIT: 500,
  CAMPAIGN_LOW_CREDIT: 100,
} as const;

/**
 * Determine alert severity for inventory levels
 */
export function getInventoryAlertSeverity(
  availableCards: number,
  customThreshold?: number
): 'critical' | 'warning' | 'info' | null {
  if (availableCards === 0) {
    return 'critical';
  }
  
  if (availableCards < MONITORING_THRESHOLDS.CSV_LOW) {
    return 'warning';
  }
  
  if (customThreshold && availableCards < customThreshold) {
    return 'info';
  }

  return null;
}

/**
 * Determine alert severity for credit levels
 */
export function getCreditAlertSeverity(
  remainingCredit: number,
  entityType: 'agency' | 'client' | 'campaign'
): 'critical' | 'warning' | 'info' | null {
  const thresholds = {
    agency: MONITORING_THRESHOLDS.AGENCY_LOW_CREDIT,
    client: MONITORING_THRESHOLDS.CLIENT_LOW_CREDIT,
    campaign: MONITORING_THRESHOLDS.CAMPAIGN_LOW_CREDIT,
  };

  const threshold = thresholds[entityType];

  if (remainingCredit <= 0) {
    return 'critical';
  }
  
  if (remainingCredit < threshold) {
    return entityType === 'agency' ? 'warning' : 'info';
  }

  return null;
}


/**
 * Gift Card Business Rules
 * 
 * Centralized business logic for gift card provisioning eligibility
 */

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
  const marginPercent = (profit / costBasis) * 100;

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


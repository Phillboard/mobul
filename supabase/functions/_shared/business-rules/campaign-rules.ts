/**
 * Campaign Business Rules
 * 
 * Centralized business logic for campaign lifecycle and validation
 */

export interface CampaignBudgetValidation {
  valid: boolean;
  error?: string;
  estimatedCost?: number;
  availableBudget?: number;
}

export interface CampaignStatus {
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  canEdit: boolean;
  canLaunch: boolean;
  canPause: boolean;
  canCancel: boolean;
}

/**
 * Validate campaign budget before launch
 */
export function validateCampaignBudget(
  recipientCount: number,
  giftCardDenomination: number,
  mailCostPerPiece: number,
  availableCredits: number
): CampaignBudgetValidation {
  if (recipientCount <= 0) {
    return {
      valid: false,
      error: 'Campaign must have at least one recipient',
    };
  }

  const estimatedMailCost = recipientCount * mailCostPerPiece;
  const estimatedGiftCardCost = recipientCount * giftCardDenomination;
  const totalEstimatedCost = estimatedMailCost + estimatedGiftCardCost;

  if (availableCredits < totalEstimatedCost) {
    return {
      valid: false,
      error: `Insufficient credits. Required: $${totalEstimatedCost.toFixed(2)}, Available: $${availableCredits.toFixed(2)}`,
      estimatedCost: totalEstimatedCost,
      availableBudget: availableCredits,
    };
  }

  return {
    valid: true,
    estimatedCost: totalEstimatedCost,
    availableBudget: availableCredits,
  };
}

/**
 * Get allowed operations for campaign status
 */
export function getCampaignStatusOperations(status: string): CampaignStatus {
  const campaignStatus = status as CampaignStatus['status'];

  switch (campaignStatus) {
    case 'draft':
      return {
        status: 'draft',
        canEdit: true,
        canLaunch: true,
        canPause: false,
        canCancel: true,
      };

    case 'scheduled':
      return {
        status: 'scheduled',
        canEdit: true,
        canLaunch: false,
        canPause: false,
        canCancel: true,
      };

    case 'active':
      return {
        status: 'active',
        canEdit: false,
        canLaunch: false,
        canPause: true,
        canCancel: true,
      };

    case 'paused':
      return {
        status: 'paused',
        canEdit: false,
        canLaunch: true,
        canPause: false,
        canCancel: true,
      };

    case 'completed':
      return {
        status: 'completed',
        canEdit: false,
        canLaunch: false,
        canPause: false,
        canCancel: false,
      };

    case 'cancelled':
      return {
        status: 'cancelled',
        canEdit: false,
        canLaunch: false,
        canPause: false,
        canCancel: false,
      };

    default:
      return {
        status: 'draft',
        canEdit: true,
        canLaunch: true,
        canPause: false,
        canCancel: true,
      };
  }
}

/**
 * Validate audience eligibility for campaign
 */
export function validateAudienceEligibility(
  audienceSize: number,
  hasRequiredFields: boolean,
  duplicateEmails: number,
  invalidAddresses: number
): {
  eligible: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (audienceSize === 0) {
    errors.push('Audience has no recipients');
  }

  if (audienceSize < 10) {
    warnings.push('Small audience size (less than 10 recipients)');
  }

  if (!hasRequiredFields) {
    errors.push('Audience missing required fields (first_name, last_name, address)');
  }

  if (duplicateEmails > 0) {
    warnings.push(`${duplicateEmails} duplicate email addresses detected`);
  }

  if (invalidAddresses > 0) {
    warnings.push(`${invalidAddresses} recipients have invalid or incomplete addresses`);
  }

  const invalidPercent = (invalidAddresses / audienceSize) * 100;
  if (invalidPercent > 20) {
    errors.push(`Too many invalid addresses (${invalidPercent.toFixed(1)}%). Please clean your data.`);
  }

  return {
    eligible: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Validate gift card configuration for campaign
 */
export function validateGiftCardConfiguration(
  conditions: Array<{
    conditionNumber: number;
    brandId?: string;
    denomination?: number;
  }>,
  requiresGiftCards: boolean
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!requiresGiftCards) {
    return { valid: true, errors: [] };
  }

  if (conditions.length === 0) {
    errors.push('Campaign requires at least one condition with gift card reward');
    return { valid: false, errors };
  }

  conditions.forEach((condition) => {
    if (!condition.brandId) {
      errors.push(`Condition ${condition.conditionNumber} missing gift card brand`);
    }

    if (!condition.denomination || condition.denomination <= 0) {
      errors.push(`Condition ${condition.conditionNumber} missing or invalid gift card denomination`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate campaign completion percentage
 */
export function calculateCampaignProgress(
  totalRecipients: number,
  mailDelivered: number,
  cardsProvisioned: number,
  conditionsCompleted: number
): {
  mailDeliveryPercent: number;
  provisioningPercent: number;
  completionPercent: number;
  overallProgress: number;
} {
  const mailDeliveryPercent = totalRecipients > 0 ? (mailDelivered / totalRecipients) * 100 : 0;
  const provisioningPercent = totalRecipients > 0 ? (cardsProvisioned / totalRecipients) * 100 : 0;
  const completionPercent = totalRecipients > 0 ? (conditionsCompleted / totalRecipients) * 100 : 0;
  
  // Overall progress is weighted average
  const overallProgress = (mailDeliveryPercent * 0.3) + (provisioningPercent * 0.4) + (completionPercent * 0.3);

  return {
    mailDeliveryPercent,
    provisioningPercent,
    completionPercent,
    overallProgress,
  };
}


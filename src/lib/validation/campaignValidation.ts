// Validation utilities for campaign system

export const CAMPAIGN_ERRORS = {
  NO_CODES: 'Please upload customer codes before proceeding, or skip for testing purposes.',
  NO_LANDING_PAGE: 'You must select or create a landing page for this campaign.',
  NO_REWARD_POOL: 'Please select a gift card pool to enable rewards for this campaign.',
  INSUFFICIENT_CARDS: 'The selected pool doesn\'t have enough cards for all recipients.',
  INVALID_CODE: 'This redemption code is not valid for this campaign. Please verify the code and try again.',
  ALREADY_REDEEMED: 'This code has already been redeemed.',
  NO_CARDS_AVAILABLE: 'All gift cards in this pool have been claimed. Please add more cards to the pool.',
  POOL_EMPTY: 'The gift card pool is empty. An administrator has been notified.',
  FORM_NOT_LINKED: 'This form must be linked to a campaign before it can be published.',
  CAMPAIGN_NOT_FOUND: 'Campaign not found or you do not have access to it.',
  RECIPIENT_NOT_FOUND: 'No recipient found with this redemption code.',
  DUPLICATE_SUBMISSION: 'This form has already been submitted with this code.',
} as const;

export type CampaignError = keyof typeof CAMPAIGN_ERRORS;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface CampaignData {
  name?: string;
  audience_id?: string;
  landing_page_id?: string;
  reward_pool_id?: string;
  rewards_enabled?: boolean;
  codes_uploaded?: boolean;
  requires_codes?: boolean;
  recipient_count?: number;
  pool_available_cards?: number;
  status?: string;
}

/**
 * Validates campaign data at different steps of creation
 */
export function validateCampaign(
  campaign: CampaignData,
  step: 'basics' | 'codes' | 'landing-page' | 'rewards' | 'publish'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (step) {
    case 'basics':
      if (!campaign.name || campaign.name.trim() === '') {
        errors.push('Campaign name is required');
      }
      break;

    case 'codes':
      if (campaign.requires_codes !== false && !campaign.codes_uploaded) {
        errors.push(CAMPAIGN_ERRORS.NO_CODES);
      }
      if (campaign.recipient_count === 0 && campaign.codes_uploaded) {
        errors.push('Campaign must have at least 1 recipient');
      }
      if (!campaign.codes_uploaded && campaign.requires_codes !== false) {
        warnings.push('No codes uploaded. This campaign will require testing mode.');
      }
      break;

    case 'landing-page':
      if (!campaign.landing_page_id) {
        errors.push(CAMPAIGN_ERRORS.NO_LANDING_PAGE);
      }
      break;

    case 'rewards':
      if (campaign.rewards_enabled) {
        if (!campaign.reward_pool_id) {
          errors.push(CAMPAIGN_ERRORS.NO_REWARD_POOL);
        }

        if (
          campaign.reward_pool_id &&
          campaign.pool_available_cards !== undefined &&
          campaign.recipient_count !== undefined &&
          campaign.pool_available_cards < campaign.recipient_count
        ) {
          errors.push(
            `Pool has only ${campaign.pool_available_cards} cards but campaign has ${campaign.recipient_count} recipients. Add more cards or choose a different pool.`
          );
        }

        if (
          campaign.pool_available_cards !== undefined &&
          campaign.recipient_count !== undefined &&
          campaign.pool_available_cards < campaign.recipient_count * 1.1
        ) {
          warnings.push(
            `Pool has minimal buffer. Consider adding more cards (${campaign.pool_available_cards} available vs ${campaign.recipient_count} recipients).`
          );
        }
      }
      break;

    case 'publish':
      // Check all requirements for publishing
      if (!campaign.landing_page_id && campaign.requires_codes !== false) {
        errors.push(CAMPAIGN_ERRORS.NO_LANDING_PAGE);
      }
      if (!campaign.codes_uploaded && campaign.requires_codes !== false) {
        errors.push('Campaign must have codes uploaded before publishing (or skip for testing)');
      }
      if (campaign.rewards_enabled && !campaign.reward_pool_id) {
        errors.push(CAMPAIGN_ERRORS.NO_REWARD_POOL);
      }
      if (
        campaign.rewards_enabled &&
        campaign.reward_pool_id &&
        campaign.pool_available_cards !== undefined &&
        campaign.recipient_count !== undefined &&
        campaign.pool_available_cards < campaign.recipient_count
      ) {
        errors.push(CAMPAIGN_ERRORS.INSUFFICIENT_CARDS);
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that a pool has sufficient cards for a campaign
 */
export function validatePoolInventory(
  poolAvailableCards: number,
  recipientCount: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (poolAvailableCards === 0) {
    errors.push('Pool has no available cards');
  } else if (poolAvailableCards < recipientCount) {
    errors.push(
      `Insufficient cards: ${poolAvailableCards} available, ${recipientCount} needed (short by ${recipientCount - poolAvailableCards})`
    );
  } else if (poolAvailableCards < recipientCount * 1.1) {
    warnings.push(
      `Low buffer: Only ${poolAvailableCards - recipientCount} extra cards available`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates form configuration before save/publish
 */
export function validateFormConfig(formConfig: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!formConfig.campaign_id) {
    errors.push(CAMPAIGN_ERRORS.FORM_NOT_LINKED);
  }

  if (!formConfig.fields || formConfig.fields.length === 0) {
    errors.push('Form must have at least one field');
  }

  // Check if gift-card-code field exists when linked to campaign
  if (formConfig.campaign_id) {
    const hasCodeField = formConfig.fields?.some(
      (f: any) => f.type === 'gift-card-code' || f.type === 'text' && f.id?.includes('code')
    );
    if (!hasCodeField) {
      warnings.push(
        'Consider adding a redemption code field to validate customer codes'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets a user-friendly error message for a campaign error code
 */
export function getCampaignErrorMessage(errorCode: CampaignError, context?: any): string {
  const baseMessage = CAMPAIGN_ERRORS[errorCode];

  // Add context if provided
  if (context) {
    switch (errorCode) {
      case 'INSUFFICIENT_CARDS':
        if (context.available && context.needed) {
          return `Pool has only ${context.available} cards but campaign has ${context.needed} recipients. Add more cards or choose a different pool.`;
        }
        break;
      case 'ALREADY_REDEEMED':
        if (context.date) {
          return `This code has already been redeemed on ${new Date(context.date).toLocaleDateString()}.`;
        }
        break;
    }
  }

  return baseMessage;
}

/**
 * Checks if campaign can be edited based on status and field
 */
export function canEditCampaignField(
  campaignStatus: string,
  field: string,
  editableAfterPublish: boolean = true
): { canEdit: boolean; reason?: string } {
  // Can always edit drafts
  if (campaignStatus === 'draft') {
    return { canEdit: true };
  }

  // Check if editing is allowed after publish
  if (!editableAfterPublish) {
    return {
      canEdit: false,
      reason: 'This campaign is locked and cannot be edited',
    };
  }

  // Cannot edit codes/recipients after creation
  if (field === 'codes' || field === 'recipients' || field === 'audience_id') {
    return {
      canEdit: false,
      reason: 'Cannot modify customer codes or recipients after campaign creation',
    };
  }

  // Cannot change certain fields after mailed
  if (campaignStatus === 'mailed') {
    const restrictedFields = ['mail_date', 'postage', 'vendor', 'size'];
    if (restrictedFields.includes(field)) {
      return {
        canEdit: false,
        reason: 'Cannot modify mail settings after campaign has been mailed',
      };
    }
  }

  // Can edit other fields
  return { canEdit: true };
}


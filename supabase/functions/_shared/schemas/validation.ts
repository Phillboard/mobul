/**
 * Validation Schemas
 * 
 * Centralized request validation schemas for edge functions
 */

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Base validator interface
 */
export interface Validator {
  validate: (data: any) => ValidationResult;
}

/**
 * Helper: Validate required fields
 */
function checkRequired(data: any, fields: string[]): string[] {
  const errors: string[] = [];
  
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field} is required`);
    }
  }
  
  return errors;
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Gift Card Provisioning Request Schema
 */
export const GiftCardProvisionSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, [
      'campaignId',
      'recipientId',
      'brandId',
      'denomination',
    ]);

    if (!isValidUUID(data.campaignId)) {
      errors.push('campaignId must be a valid UUID');
    }

    if (!isValidUUID(data.recipientId)) {
      errors.push('recipientId must be a valid UUID');
    }

    if (!isValidUUID(data.brandId)) {
      errors.push('brandId must be a valid UUID');
    }

    if (typeof data.denomination !== 'number' || data.denomination <= 0) {
      errors.push('denomination must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * Call Center Provisioning Request Schema
 */
export const CallCenterProvisionSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, ['redemptionCode']);

    if (!data.deliveryPhone && !data.deliveryEmail) {
      errors.push('Either deliveryPhone or deliveryEmail is required');
    }

    if (data.deliveryPhone && typeof data.deliveryPhone !== 'string') {
      errors.push('deliveryPhone must be a string');
    }

    if (data.deliveryEmail && !isValidEmail(data.deliveryEmail)) {
      errors.push('deliveryEmail must be a valid email address');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * Credit Allocation Request Schema
 */
export const CreditAllocationSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, [
      'fromEntityType',
      'fromEntityId',
      'toEntityType',
      'toEntityId',
      'amount',
    ]);

    const validEntityTypes = ['platform', 'agency', 'client'];
    
    if (!validEntityTypes.includes(data.fromEntityType)) {
      errors.push(`fromEntityType must be one of: ${validEntityTypes.join(', ')}`);
    }

    if (!validEntityTypes.includes(data.toEntityType)) {
      errors.push(`toEntityType must be one of: ${validEntityTypes.join(', ')}`);
    }

    if (!isValidUUID(data.fromEntityId)) {
      errors.push('fromEntityId must be a valid UUID');
    }

    if (!isValidUUID(data.toEntityId)) {
      errors.push('toEntityId must be a valid UUID');
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push('amount must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * Campaign Budget Validation Request Schema
 */
export const CampaignBudgetSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, [
      'campaignId',
      'recipientCount',
      'giftCardDenomination',
    ]);

    if (!isValidUUID(data.campaignId)) {
      errors.push('campaignId must be a valid UUID');
    }

    if (typeof data.recipientCount !== 'number' || data.recipientCount < 0) {
      errors.push('recipientCount must be a non-negative number');
    }

    if (typeof data.giftCardDenomination !== 'number' || data.giftCardDenomination <= 0) {
      errors.push('giftCardDenomination must be a positive number');
    }

    if (data.mailCostPerPiece !== undefined) {
      if (typeof data.mailCostPerPiece !== 'number' || data.mailCostPerPiece < 0) {
        errors.push('mailCostPerPiece must be a non-negative number');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * Organization Update Request Schema
 */
export const OrganizationUpdateSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, ['organizationId', 'status']);

    if (!isValidUUID(data.organizationId)) {
      errors.push('organizationId must be a valid UUID');
    }

    const validStatuses = ['active', 'suspended', 'archived', 'pending', 'rejected'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * User Invitation Request Schema
 */
export const UserInvitationSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, ['email', 'role']);

    if (!isValidEmail(data.email)) {
      errors.push('email must be a valid email address');
    }

    const validRoles = [
      'admin',
      'platform_admin',
      'agency_owner',
      'agency_user',
      'client_admin',
      'client_user',
      'call_center_agent',
      'call_center_supervisor',
    ];

    if (!validRoles.includes(data.role)) {
      errors.push(`role must be one of: ${validRoles.join(', ')}`);
    }

    if (data.clientId && !isValidUUID(data.clientId)) {
      errors.push('clientId must be a valid UUID');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * Simulate Tracking Request Schema
 */
export const SimulateTrackingSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, ['campaignId']);

    if (!isValidUUID(data.campaignId)) {
      errors.push('campaignId must be a valid UUID');
    }

    if (data.deliveryRate !== undefined) {
      if (typeof data.deliveryRate !== 'number' || data.deliveryRate < 0 || data.deliveryRate > 100) {
        errors.push('deliveryRate must be a number between 0 and 100');
      }
    }

    if (data.returnRate !== undefined) {
      if (typeof data.returnRate !== 'number' || data.returnRate < 0 || data.returnRate > 100) {
        errors.push('returnRate must be a number between 0 and 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * Gift Card Configuration Request Schema
 */
export const GiftCardConfigSchema: Validator = {
  validate: (data): ValidationResult => {
    const errors = checkRequired(data, [
      'campaignId',
      'brandId',
      'denomination',
      'conditionNumber',
    ]);

    if (!isValidUUID(data.campaignId)) {
      errors.push('campaignId must be a valid UUID');
    }

    if (!isValidUUID(data.brandId)) {
      errors.push('brandId must be a valid UUID');
    }

    if (typeof data.denomination !== 'number' || data.denomination <= 0) {
      errors.push('denomination must be a positive number');
    }

    if (typeof data.conditionNumber !== 'number' || data.conditionNumber < 1) {
      errors.push('conditionNumber must be a positive integer');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};


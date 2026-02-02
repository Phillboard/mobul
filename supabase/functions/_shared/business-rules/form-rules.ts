/**
 * Form Business Rules
 * 
 * Centralized business logic for form validation and processing.
 */

// ============================================================================
// Types
// ============================================================================

export interface FormValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

export interface AceFormConfig {
  id: string;
  name: string;
  form_config: {
    fields: AceFormField[];
    settings?: {
      title?: string;
      description?: string;
      submitButtonText?: string;
      successMessage?: string;
      primaryColor?: string;
    };
  };
  is_draft: boolean;
  is_active: boolean;
}

export interface AceFormField {
  id: string;
  type: 'gift-card-code' | 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date';
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

export interface LeadFormData {
  campaignId: string;
  recipientId: string;
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  appointmentRequested?: boolean;
}

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\d\s\-\+\(\)]{10,20}$/,
  CODE_MIN_LENGTH: 3,
  CODE_MAX_LENGTH: 20,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
} as const;

// ============================================================================
// Form State Validation
// ============================================================================

/**
 * Validate ACE form is ready for submissions
 */
export function validateFormState(form: AceFormConfig | null): FormValidationResult {
  if (!form) {
    return {
      valid: false,
      error: 'Form not found',
    };
  }

  if (form.is_draft) {
    return {
      valid: false,
      error: 'This form is not yet published',
    };
  }

  if (form.is_active === false) {
    return {
      valid: false,
      error: 'This form is no longer accepting submissions',
    };
  }

  return { valid: true };
}

// ============================================================================
// Field Validation
// ============================================================================

/**
 * Validate email format
 */
export function validateEmail(email: string | undefined): FormValidationResult {
  if (!email || !email.trim()) {
    return {
      valid: false,
      error: 'Email is required',
      field: 'email',
    };
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
      field: 'email',
    };
  }

  return { valid: true };
}

/**
 * Validate phone format (optional field)
 */
export function validatePhone(phone: string | undefined): FormValidationResult {
  if (!phone || !phone.trim()) {
    return { valid: true }; // Phone is typically optional
  }

  // Remove common formatting characters for validation
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      valid: false,
      error: 'Please enter a valid phone number',
      field: 'phone',
    };
  }

  return { valid: true };
}

/**
 * Validate name field
 */
export function validateName(name: string | undefined, fieldName: string = 'name'): FormValidationResult {
  if (!name || !name.trim()) {
    return {
      valid: false,
      error: `${fieldName} is required`,
      field: fieldName,
    };
  }

  if (name.length < VALIDATION.NAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `${fieldName} is too short`,
      field: fieldName,
    };
  }

  if (name.length > VALIDATION.NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `${fieldName} is too long`,
      field: fieldName,
    };
  }

  return { valid: true };
}

/**
 * Validate redemption code format
 */
export function validateRedemptionCode(code: string | undefined): FormValidationResult {
  if (!code || !code.trim()) {
    return {
      valid: false,
      error: 'Please enter your gift card code',
      field: 'code',
    };
  }

  const cleaned = code.trim();

  if (cleaned.length < VALIDATION.CODE_MIN_LENGTH) {
    return {
      valid: false,
      error: 'Code is too short',
      field: 'code',
    };
  }

  if (cleaned.length > VALIDATION.CODE_MAX_LENGTH) {
    return {
      valid: false,
      error: 'Code is too long',
      field: 'code',
    };
  }

  return { valid: true };
}

// ============================================================================
// Lead Form Validation
// ============================================================================

/**
 * Validate lead form submission data
 */
export function validateLeadFormData(data: Partial<LeadFormData>): FormValidationResult {
  // Required: campaignId
  if (!data.campaignId) {
    return {
      valid: false,
      error: 'Campaign ID is required',
      field: 'campaignId',
    };
  }

  // Required: recipientId
  if (!data.recipientId) {
    return {
      valid: false,
      error: 'Recipient ID is required',
      field: 'recipientId',
    };
  }

  // Required: fullName
  const nameValidation = validateName(data.fullName, 'Full name');
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // Required: email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Optional: phone
  if (data.phone) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.valid) {
      return phoneValidation;
    }
  }

  return { valid: true };
}

// ============================================================================
// Code Processing
// ============================================================================

/**
 * Normalize redemption code for lookup
 * - Uppercase
 * - Trim whitespace
 * - Keep dashes (codes stored as "AB6-1061")
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Extract redemption code from form data
 */
export function extractRedemptionCode(
  formConfig: AceFormConfig['form_config'],
  data: Record<string, unknown>
): string | null {
  // Try to find gift card field in form config
  const giftCardField = formConfig?.fields?.find(
    (f) => f.type === 'gift-card-code' || f.id === 'gift_card_code' || f.id === 'code'
  );

  // Get code from field or common field names
  const rawCode = giftCardField
    ? (data[giftCardField.id] as string)
    : (data.gift_card_code as string) ||
      (data.code as string) ||
      (data.redemption_code as string) ||
      (data.giftCardCode as string);

  if (!rawCode || typeof rawCode !== 'string') {
    return null;
  }

  return normalizeCode(rawCode);
}

// ============================================================================
// Response Builders
// ============================================================================

export interface GiftCardDisplayData {
  card_code: string;
  card_number: string | null;
  card_value: number;
  provider: string;
  brand_name: string;
  brand_logo: string | null;
  brand_color: string | null;
  store_url: string | null;
  redemption_instructions: string | null;
  expiration_date: string | null;
}

/**
 * Build gift card response object for display
 */
export function buildGiftCardResponse(cardData: {
  card_code: string;
  card_number?: string | null;
  denomination: number | string;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  brand_color?: string | null;
  balance_check_url?: string | null;
  redemption_instructions?: string | null;
  expiration_date?: string | null;
}): GiftCardDisplayData {
  return {
    card_code: cardData.card_code,
    card_number: cardData.card_number || null,
    card_value: Number(cardData.denomination),
    provider: cardData.brand_name || 'Gift Card',
    brand_name: cardData.brand_name || 'Gift Card',
    brand_logo: cardData.brand_logo_url || null,
    brand_color: cardData.brand_color || null,
    store_url: cardData.balance_check_url || null,
    redemption_instructions: cardData.redemption_instructions || null,
    expiration_date: cardData.expiration_date || null,
  };
}

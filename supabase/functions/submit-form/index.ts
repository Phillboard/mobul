/**
 * ACE Form Submission Handler
 * 
 * This form DOES NOT provision gift cards.
 * It only looks up and displays cards that were already assigned by the call center.
 * 
 * Flow:
 * 1. Call center agent enters code → Provisions gift card → Assigns to recipient
 * 2. Customer enters code on this form → Form looks up their existing card → Displays it
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  validateFormState,
  validateRedemptionCode,
  extractRedemptionCode,
  buildGiftCardResponse,
  type AceFormConfig,
} from '../_shared/business-rules/form-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface SubmitFormRequest {
  formId: string;
  data: Record<string, unknown>;
}

interface SubmitFormResponse {
  success: boolean;
  requestId: string;
  gift_card_provisioned: boolean;
  giftCard?: ReturnType<typeof buildGiftCardResponse>;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleSubmitForm(
  request: SubmitFormRequest,
  _context: PublicContext
): Promise<SubmitFormResponse> {
  const requestId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const { formId, data } = request;

  console.log('╔' + '═'.repeat(60) + '╗');
  console.log(`║ [ACE-FORM] Request ID: ${requestId}`);
  console.log('╠' + '═'.repeat(60) + '╣');
  console.log(`║   formId: ${formId || 'MISSING'}`);
  console.log(`║   dataKeys: ${Object.keys(data || {}).join(', ')}`);
  console.log('╚' + '═'.repeat(60) + '╝');

  if (!formId) {
    throw new ApiError('Form ID is required', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();

  // =====================================================
  // STEP 1: LOAD FORM CONFIG
  // =====================================================
  const { data: form, error: formError } = await supabase
    .from('ace_forms')
    .select('id, name, form_config, is_draft, is_active')
    .eq('id', formId)
    .single();

  if (formError) {
    console.error('[ACE-FORM] Form not found:', formError);
    throw new ApiError('Form not found', 'NOT_FOUND', 404);
  }

  // Validate form state using shared rules
  const formValidation = validateFormState(form as AceFormConfig);
  if (!formValidation.valid) {
    throw new ApiError(formValidation.error!, 'FORM_INACTIVE', 404);
  }

  console.log(`[STEP 1] ✓ Form loaded: ${form.name}`);

  // =====================================================
  // STEP 2: EXTRACT AND VALIDATE REDEMPTION CODE
  // =====================================================
  const code = extractRedemptionCode(form.form_config, data);

  const codeValidation = validateRedemptionCode(code || undefined);
  if (!codeValidation.valid) {
    throw new ApiError(codeValidation.error!, 'VALIDATION_ERROR', 400);
  }

  console.log(`[STEP 2] ✓ Code validated: "${code}"`);

  // =====================================================
  // STEP 3: LOOKUP CARD VIA DATABASE FUNCTION
  // =====================================================
  console.log(`[STEP 3] Looking up card via RPC for code: ${code}`);

  const { data: cardData, error: rpcError } = await supabase
    .rpc('lookup_gift_card_by_redemption_code', { p_code: code });

  if (rpcError) {
    console.error('[ACE-FORM] RPC error:', rpcError);
    throw new ApiError(
      'Unable to retrieve your gift card. Please try again.',
      'LOOKUP_ERROR',
      500
    );
  }

  if (!cardData || cardData.length === 0) {
    console.log(`[STEP 3] ✗ No card found for code: ${code}`);
    throw new ApiError(
      'Your gift card is not yet available. Please contact support or try again later.',
      'CARD_NOT_FOUND',
      400
    );
  }

  // =====================================================
  // STEP 4: SUCCESS - RETURN CARD DETAILS
  // =====================================================
  const card = cardData[0];

  console.log('╔' + '═'.repeat(60) + '╗');
  console.log(`║ [ACE-FORM] ✓ SUCCESS`);
  console.log('╠' + '═'.repeat(60) + '╣');
  console.log(`║   ${card.recipient_first_name} ${card.recipient_last_name}`);
  console.log(`║   ${card.brand_name || 'Gift Card'} $${card.denomination}`);
  console.log(`║   Card: ${card.card_code}`);
  console.log('╚' + '═'.repeat(60) + '╝');

  // Track submission for analytics
  await supabase.rpc('increment_form_stat', { form_id: formId, stat_name: 'submissions' }).catch(() => {
    // Ignore stat tracking errors
  });

  return {
    success: true,
    requestId,
    gift_card_provisioned: true,
    giftCard: buildGiftCardResponse(card),
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleSubmitForm, {
  requireAuth: false, // Public endpoint
  parseBody: true,
  auditAction: 'submit_form',
}));

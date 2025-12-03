/**
 * Call Center Gift Card Provisioning Function
 * 
 * Specialized wrapper for call center gift card provisioning with:
 * 1. Redemption code lookup
 * 2. SMS opt-in validation
 * 3. Call session tracking
 * 4. Delivery method handling (SMS/Email)
 * 5. Delegates actual provisioning to unified function
 * 
 * COMPREHENSIVE LOGGING:
 * - Every step is logged to gift_card_provisioning_trace table
 * - Errors are logged with structured error codes
 * - Full request context is captured for debugging
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createErrorLogger, PROVISIONING_ERROR_CODES } from '../_shared/error-logger.ts';
import type { ProvisioningErrorCode } from '../_shared/error-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CallCenterProvisionRequest {
  // Direct IDs - recipient already identified on frontend
  recipientId: string;
  campaignId: string;
  brandId: string;
  denomination: number;
  conditionId?: string;
  deliveryPhone?: string | null;
  deliveryEmail?: string | null;
  skipSmsDelivery?: boolean;
  requestId?: string; // Optional client-provided trace ID
}

interface ProvisionResult {
  success: boolean;
  requestId: string; // Always return for tracing
  card?: {
    id?: string;
    cardCode: string;
    cardNumber?: string;
    denomination: number;
    brandName: string;
    brandLogo?: string;
    expirationDate?: string;
    source: 'inventory' | 'tillo';
  };
  billing?: {
    ledgerId: string;
    billedEntity: string;
    billedEntityId: string;
    amountBilled: number;
    profit: number;
  };
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  deliveryInfo?: {
    method: 'sms' | 'email';
    destination: string;
    status?: 'sent' | 'skipped' | 'failed';
  };
  error?: string;
  message?: string;
  errorCode?: ProvisioningErrorCode;
  errorDescription?: string;
  canRetry?: boolean;
  requiresCampaignEdit?: boolean;
}

// Step definitions for trace logging
// Note: Recipient lookup removed - frontend passes recipientId directly
const STEPS = {
  VALIDATE_INPUT: { number: 1, name: 'Validate Input Parameters' },
  FETCH_RECIPIENT: { number: 2, name: 'Fetch Recipient Details' },
  VERIFY_RECIPIENT: { number: 3, name: 'Verify Recipient Status' },
  CHECK_ALREADY_PROVISIONED: { number: 4, name: 'Check if Already Provisioned' },
  CALL_UNIFIED_PROVISION: { number: 5, name: 'Claim Gift Card from Inventory/Tillo' },
  SEND_DELIVERY: { number: 6, name: 'Send Gift Card to Recipient' },
  FINALIZE: { number: 7, name: 'Finalize and Return Result' },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // Initialize error logger with comprehensive tracing
  const logger = createErrorLogger('provision-gift-card-for-call-center');

  // Declare variables at function scope for error logging access
  let recipientId: string | undefined;
  let campaignId: string | undefined;
  let brandId: string | undefined;
  let denomination: number | undefined;
  let currentStep = STEPS.VALIDATE_INPUT;

  try {
    // =====================================================
    // STEP 1: VALIDATE INPUT PARAMETERS
    // All IDs are passed directly from frontend - no redundant lookups
    // =====================================================
    await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'started');
    
    const requestData: CallCenterProvisionRequest = await req.json();
    recipientId = requestData.recipientId;
    campaignId = requestData.campaignId;
    brandId = requestData.brandId;
    denomination = requestData.denomination;
    const conditionId = requestData.conditionId;
    const deliveryPhone = requestData.deliveryPhone;
    const deliveryEmail = requestData.deliveryEmail;
    const skipSmsDelivery = requestData.skipSmsDelivery || false;

    console.log('╔' + '═'.repeat(70) + '╗');
    console.log(`║ [CALL-CENTER-PROVISION] Request ID: ${logger.requestId}`);
    console.log('╠' + '═'.repeat(70) + '╣');
    console.log('║ INPUT PARAMETERS (Direct IDs - no lookup needed):');
    console.log(`║   recipientId: ${recipientId || 'MISSING'}`);
    console.log(`║   campaignId: ${campaignId || 'MISSING'}`);
    console.log(`║   brandId: ${brandId || 'MISSING'}`);
    console.log(`║   denomination: $${denomination || 'MISSING'}`);
    console.log(`║   conditionId: ${conditionId || 'N/A'}`);
    console.log(`║   deliveryPhone: ${deliveryPhone ? '***' + deliveryPhone.slice(-4) : 'none'}`);
    console.log(`║   deliveryEmail: ${deliveryEmail ? '***@***' : 'none'}`);
    console.log(`║   skipSmsDelivery: ${skipSmsDelivery}`);
    console.log('╚' + '═'.repeat(70) + '╝');

    // Validate required inputs
    const validationErrors: string[] = [];
    if (!recipientId) validationErrors.push('recipientId is required');
    if (!campaignId) validationErrors.push('campaignId is required');
    if (!brandId) validationErrors.push('brandId is required (configure gift card in campaign)');
    if (!denomination) validationErrors.push('denomination is required (configure gift card value in campaign)');
    if (!deliveryPhone && !deliveryEmail) validationErrors.push('Either phone or email delivery method is required');

    if (validationErrors.length > 0) {
      await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'failed', {
        errors: validationErrors,
      });
      await logger.logProvisioningError('GC-012', new Error(validationErrors.join(', ')), STEPS.VALIDATE_INPUT);
      throw new Error(validationErrors.join('. '));
    }

    // Set logger context immediately since we have all IDs
    logger.setProvisioningContext({
      campaignId,
      recipientId,
      brandId,
      denomination,
    });

    await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'completed', {
      recipientId,
      campaignId,
      brandId,
      denomination,
      hasPhone: !!deliveryPhone,
      hasEmail: !!deliveryEmail,
    });

    // =====================================================
    // STEP 2: FETCH RECIPIENT DETAILS (by ID - no lookup needed)
    // Frontend already identified the recipient, just fetch details
    // =====================================================
    currentStep = STEPS.FETCH_RECIPIENT;
    await logger.checkpoint(STEPS.FETCH_RECIPIENT.number, STEPS.FETCH_RECIPIENT.name, 'started', {
      recipientId,
    });
    
    console.log(`[STEP ${STEPS.FETCH_RECIPIENT.number}] Fetching recipient details by ID: ${recipientId}`);

    const { data: recipient, error: recipientError } = await supabaseClient
      .from('recipients')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        sms_opt_in_status,
        sms_opt_in_date,
        verification_method,
        disposition
      `)
      .eq('id', recipientId)
      .single();

    console.log(`[STEP ${STEPS.FETCH_RECIPIENT.number}] Recipient fetch result:`, {
      found: !!recipient,
      name: recipient ? `${recipient.first_name} ${recipient.last_name}` : null,
      error: recipientError?.message || null,
    });

    if (recipientError || !recipient) {
      await logger.checkpoint(STEPS.FETCH_RECIPIENT.number, STEPS.FETCH_RECIPIENT.name, 'failed', {
        error: recipientError?.message || 'Recipient not found',
        code: recipientError?.code,
      });
      await logger.logProvisioningError('GC-011', recipientError || new Error('Recipient not found'), STEPS.FETCH_RECIPIENT);
      throw new Error('Recipient not found. Please try looking up the customer again.');
    }

    await logger.checkpoint(STEPS.FETCH_RECIPIENT.number, STEPS.FETCH_RECIPIENT.name, 'completed', {
      recipientId,
      recipientName: `${recipient.first_name} ${recipient.last_name}`,
      smsOptInStatus: recipient.sms_opt_in_status,
      verificationMethod: recipient.verification_method,
      disposition: recipient.disposition,
    });

    console.log(`[STEP ${STEPS.FETCH_RECIPIENT.number}] ✓ Recipient: ${recipient.first_name} ${recipient.last_name}`);

    // =====================================================
    // STEP 3: VERIFY RECIPIENT STATUS (for SMS delivery)
    // =====================================================
    currentStep = STEPS.VERIFY_RECIPIENT;
    await logger.checkpoint(STEPS.VERIFY_RECIPIENT.number, STEPS.VERIFY_RECIPIENT.name, 'started', {
      smsOptInStatus: recipient.sms_opt_in_status,
      verificationMethod: recipient.verification_method,
      disposition: recipient.disposition,
    });
    
    console.log(`[STEP ${STEPS.VERIFY_RECIPIENT.number}] Verifying recipient status...`);

    if (deliveryPhone) {
      const isOptedIn = recipient.sms_opt_in_status === 'opted_in';
      const positiveDispositions = ['verified_verbally', 'already_opted_in', 'vip_customer'];
      const hasSkippedVerification = recipient.verification_method === 'skipped' && 
        positiveDispositions.includes(recipient.disposition || '');
      const hasEmailVerification = recipient.verification_method === 'email';
      
      const verificationDetails = {
        isOptedIn,
        hasSkippedVerification,
        hasEmailVerification,
        verificationMethod: recipient.verification_method,
        disposition: recipient.disposition,
        smsOptInStatus: recipient.sms_opt_in_status,
      };

      console.log(`[STEP ${STEPS.VERIFY_RECIPIENT.number}] Verification check:`, verificationDetails);

      if (!isOptedIn && !hasSkippedVerification && !hasEmailVerification) {
        await logger.checkpoint(STEPS.VERIFY_RECIPIENT.number, STEPS.VERIFY_RECIPIENT.name, 'failed', {
          ...verificationDetails,
          error: 'No valid verification method found',
        });
        await logger.logProvisioningError('GC-009', new Error('Recipient verification required'), STEPS.VERIFY_RECIPIENT, verificationDetails);
        throw new Error('Recipient verification required. Customer must opt-in via SMS, verify via email, or be marked with a valid disposition.');
      }

      // Log which verification method was used
      let verificationUsed = 'unknown';
      if (isOptedIn) verificationUsed = 'sms_opt_in';
      else if (hasSkippedVerification) verificationUsed = 'skipped_with_disposition';
      else if (hasEmailVerification) verificationUsed = 'email';

      await logger.checkpoint(STEPS.VERIFY_RECIPIENT.number, STEPS.VERIFY_RECIPIENT.name, 'completed', {
        verificationUsed,
        ...verificationDetails,
      });
      
      console.log(`[STEP ${STEPS.VERIFY_RECIPIENT.number}] ✓ Verified via: ${verificationUsed}`);
    } else {
      // Email delivery - skip SMS verification
      await logger.checkpoint(STEPS.VERIFY_RECIPIENT.number, STEPS.VERIFY_RECIPIENT.name, 'skipped', {
        reason: 'Email delivery - SMS verification not required',
      });
      console.log(`[STEP ${STEPS.VERIFY_RECIPIENT.number}] ✓ Skipped (email delivery)`);
    }

    // brandId and denomination are passed directly from frontend - no lookup needed!
    console.log(`[READY] Gift card config: brand=${brandId}, value=$${denomination}`);

    // =====================================================
    // STEP 4: CHECK IF ALREADY PROVISIONED
    // =====================================================
    currentStep = STEPS.CHECK_ALREADY_PROVISIONED;
    await logger.checkpoint(STEPS.CHECK_ALREADY_PROVISIONED.number, STEPS.CHECK_ALREADY_PROVISIONED.name, 'started');
    
    console.log(`[STEP ${STEPS.CHECK_ALREADY_PROVISIONED.number}] Checking for existing provisioning...`);

    const { data: existingLedger, error: ledgerCheckError } = await supabaseClient
      .from('gift_card_billing_ledger')
      .select('id, created_at')
      .eq('recipient_id', recipient.id)
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)
      .limit(1);

    if (existingLedger && existingLedger.length > 0) {
      const existingEntry = existingLedger[0];
      await logger.checkpoint(STEPS.CHECK_ALREADY_PROVISIONED.number, STEPS.CHECK_ALREADY_PROVISIONED.name, 'failed', {
        error: 'Already provisioned',
        existingLedgerId: existingEntry.id,
        provisionedAt: existingEntry.created_at,
      });
      await logger.logProvisioningError('GC-010', new Error('Gift card already provisioned'), STEPS.CHECK_ALREADY_PROVISIONED, {
        existingLedgerId: existingEntry.id,
      });
      throw new Error('Gift card has already been provisioned for this recipient and condition');
    }

    await logger.checkpoint(STEPS.CHECK_ALREADY_PROVISIONED.number, STEPS.CHECK_ALREADY_PROVISIONED.name, 'completed', {
      alreadyProvisioned: false,
    });
    
    console.log(`[STEP ${STEPS.CHECK_ALREADY_PROVISIONED.number}] ✓ No existing provisioning found`);

    // =====================================================
    // STEP 5: CALL UNIFIED PROVISIONING (Claim from Inventory/Tillo)
    // =====================================================
    currentStep = STEPS.CALL_UNIFIED_PROVISION;
    await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'started', {
      campaignId,
      recipientId,
      brandId,
      denomination,
    });
    
    console.log(`[STEP ${STEPS.CALL_UNIFIED_PROVISION.number}] Claiming gift card from inventory/Tillo...`);

    const provisionRequest = {
      campaignId: campaignId,
      recipientId: recipient.id,
      brandId: brandId,
      denomination: denomination,
      conditionId: conditionId, // Pass condition ID for tracking
      requestId: logger.requestId, // Pass trace ID for correlation
    };

    console.log(`[STEP ${STEPS.CALL_UNIFIED_PROVISION.number}] Request:`, JSON.stringify(provisionRequest, null, 2));

    const unifiedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/provision-gift-card-unified`;
    const provisionStartTime = Date.now();
    
    const provisionResponse = await fetch(unifiedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'x-request-id': logger.requestId,
      },
      body: JSON.stringify(provisionRequest),
    });

    const provisionDuration = Date.now() - provisionStartTime;
    console.log(`[STEP ${STEPS.CALL_UNIFIED_PROVISION.number}] Response received in ${provisionDuration}ms, status: ${provisionResponse.status}`);

    if (!provisionResponse.ok) {
      const errorText = await provisionResponse.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'failed', {
        httpStatus: provisionResponse.status,
        error: errorData.error || errorText,
        errorCode: errorData.errorCode,
        durationMs: provisionDuration,
      });

      // Use the error code from unified function if available
      if (errorData.errorCode) {
        await logger.logProvisioningError(errorData.errorCode, new Error(errorData.error || errorText), STEPS.CALL_UNIFIED_PROVISION);
      } else {
        await logger.logProvisioningError('GC-015', new Error(errorData.error || errorText), STEPS.CALL_UNIFIED_PROVISION);
      }

      throw new Error(errorData.error || `Unified provisioning failed: ${errorText}`);
    }

    const provisionResult = await provisionResponse.json();
    console.log(`[STEP ${STEPS.CALL_UNIFIED_PROVISION.number}] Result:`, JSON.stringify({
      success: provisionResult.success,
      hasCard: !!provisionResult.card,
      source: provisionResult.card?.source,
      hasBilling: !!provisionResult.billing,
    }));

    if (!provisionResult.success) {
      await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'failed', {
        error: provisionResult.error,
        errorCode: provisionResult.errorCode,
        durationMs: provisionDuration,
      });
      throw new Error(provisionResult.error || 'Provisioning failed');
    }

    await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'completed', {
      source: provisionResult.card?.source,
      brandName: provisionResult.card?.brandName,
      denomination: provisionResult.card?.denomination,
      billedEntity: provisionResult.billing?.billedEntity,
      durationMs: provisionDuration,
    });

    console.log(`[STEP ${STEPS.CALL_UNIFIED_PROVISION.number}] ✓ Card provisioned from ${provisionResult.card?.source}`);

    // =====================================================
    // STEP 6: SEND GIFT CARD TO RECIPIENT
    // =====================================================
    currentStep = STEPS.SEND_DELIVERY;
    const deliveryMethod = deliveryPhone ? 'sms' : 'email';
    const deliveryDestination = deliveryPhone || deliveryEmail;
    let deliveryStatus: 'sent' | 'skipped' | 'failed' = 'skipped';

    await logger.checkpoint(STEPS.SEND_DELIVERY.number, STEPS.SEND_DELIVERY.name, 'started', {
      method: deliveryMethod,
      destination: deliveryMethod === 'sms' ? '***' + deliveryDestination!.slice(-4) : '***@***',
      skipSmsDelivery,
    });

    console.log(`[STEP ${STEPS.SEND_DELIVERY.number}] Sending ${deliveryMethod} notification...`);

    try {
      if (deliveryMethod === 'sms' && deliveryPhone) {
        if (skipSmsDelivery) {
          console.log(`[STEP ${STEPS.SEND_DELIVERY.number}] Simulation mode - skipping SMS`);
          deliveryStatus = 'skipped';
        } else {
          // Send SMS with gift card details
          const smsResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gift-card-sms`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                deliveryId: `call_center_${Date.now()}`,
                giftCardCode: provisionResult.card.cardCode,
                giftCardValue: provisionResult.card.denomination,
                recipientPhone: deliveryPhone,
                recipientName: `${recipient.first_name} ${recipient.last_name}`,
                recipientId: recipient.id,
                giftCardId: provisionResult.card.id || null,
                brandName: provisionResult.card.brandName,
              }),
            }
          );

          deliveryStatus = smsResponse.ok ? 'sent' : 'failed';
          console.log(`[STEP ${STEPS.SEND_DELIVERY.number}] SMS result: ${deliveryStatus}`);
        }
      } else if (deliveryMethod === 'email' && deliveryEmail) {
        const emailResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gift-card-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              to: deliveryEmail,
              recipientName: `${recipient.first_name} ${recipient.last_name}`,
              cardCode: provisionResult.card.cardCode,
              brandName: provisionResult.card.brandName,
              amount: provisionResult.card.denomination,
              campaignId: campaignId,
            }),
          }
        );

        deliveryStatus = emailResponse.ok ? 'sent' : 'failed';
        console.log(`[STEP ${STEPS.SEND_DELIVERY.number}] Email result: ${deliveryStatus}`);
      }

      await logger.checkpoint(STEPS.SEND_DELIVERY.number, STEPS.SEND_DELIVERY.name, 
        deliveryStatus === 'failed' ? 'failed' : 'completed', {
        method: deliveryMethod,
        status: deliveryStatus,
      });

      if (deliveryStatus === 'sent') {
        console.log(`[STEP ${STEPS.SEND_DELIVERY.number}] ✓ ${deliveryMethod.toUpperCase()} sent successfully`);
      } else if (deliveryStatus === 'skipped') {
        console.log(`[STEP ${STEPS.SEND_DELIVERY.number}] ⚠ Delivery skipped (simulation mode)`);
      } else {
        console.log(`[STEP ${STEPS.SEND_DELIVERY.number}] ⚠ Delivery failed - card still provisioned`);
      }
    } catch (deliveryError) {
      console.error(`[STEP ${STEPS.SEND_DELIVERY.number}] Delivery error:`, deliveryError);
      deliveryStatus = 'failed';
      await logger.checkpoint(STEPS.SEND_DELIVERY.number, STEPS.SEND_DELIVERY.name, 'failed', {
        error: deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
      });
      await logger.logProvisioningError('GC-014', deliveryError, STEPS.SEND_DELIVERY);
      // Don't throw - card is already provisioned
    }

    // =====================================================
    // STEP 7: FINALIZE AND RETURN RESULT
    // =====================================================
    currentStep = STEPS.FINALIZE;
    await logger.checkpoint(STEPS.FINALIZE.number, STEPS.FINALIZE.name, 'started');

    const result: ProvisionResult = {
      success: true,
      requestId: logger.requestId,
      card: provisionResult.card,
      billing: provisionResult.billing,
      recipient: {
        id: recipient.id,
        firstName: recipient.first_name,
        lastName: recipient.last_name,
        email: recipient.email,
        phone: recipient.phone,
      },
      deliveryInfo: {
        method: deliveryMethod,
        destination: deliveryDestination!,
        status: deliveryStatus,
      },
    };

    await logger.checkpoint(STEPS.FINALIZE.number, STEPS.FINALIZE.name, 'completed', {
      success: true,
      source: result.card?.source,
      deliveryStatus,
    });

    console.log('╔' + '═'.repeat(70) + '╗');
    console.log(`║ [CALL-CENTER-PROVISION] ✓ SUCCESS - Request ID: ${logger.requestId}`);
    console.log('╠' + '═'.repeat(70) + '╣');
    console.log(`║   Recipient: ${result.recipient?.firstName} ${result.recipient?.lastName}`);
    console.log(`║   Brand: ${result.card?.brandName}`);
    console.log(`║   Value: $${result.card?.denomination}`);
    console.log(`║   Source: ${result.card?.source}`);
    console.log(`║   Delivery: ${result.deliveryInfo?.method} (${result.deliveryInfo?.status})`);
    console.log('╚' + '═'.repeat(70) + '╝');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Comprehensive error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Determine error code based on message
    let errorCode: ProvisioningErrorCode = 'GC-015';
    let canRetry = false;
    let requiresCampaignEdit = false;

    if (errorMessage.includes('Missing') || errorMessage.includes('required')) {
      errorCode = 'GC-012';
    } else if (errorMessage.includes('Recipient not found') || errorMessage.includes('not found')) {
      errorCode = 'GC-011';
      canRetry = true;
    } else if (errorMessage.includes('verification required') || errorMessage.includes('opt-in')) {
      errorCode = 'GC-009';
      canRetry = true;
    } else if (errorMessage.includes('already been provisioned')) {
      errorCode = 'GC-010';
    } else if (errorMessage.includes('Gift card not configured') || errorMessage.includes('brand_id')) {
      errorCode = 'GC-001';
      requiresCampaignEdit = true;
    } else if (errorMessage.includes('Campaign') && errorMessage.includes('billing')) {
      errorCode = 'GC-008';
      requiresCampaignEdit = true;
    } else if (errorMessage.includes('Brand not found') || errorMessage.includes('brand')) {
      errorCode = 'GC-002';
      requiresCampaignEdit = true;
    } else if (errorMessage.includes('inventory') && errorMessage.includes('Tillo')) {
      errorCode = 'GC-003';
      canRetry = true;
    } else if (errorMessage.includes('Tillo API not configured')) {
      errorCode = 'GC-004';
    } else if (errorMessage.includes('Tillo')) {
      errorCode = 'GC-005';
      canRetry = true;
    } else if (errorMessage.includes('credits') || errorMessage.includes('Insufficient')) {
      errorCode = 'GC-006';
    } else if (errorMessage.includes('billing')) {
      errorCode = 'GC-007';
    }

    console.error('╔' + '═'.repeat(70) + '╗');
    console.error(`║ [CALL-CENTER-PROVISION] ✗ FAILED - Request ID: ${logger.requestId}`);
    console.error('╠' + '═'.repeat(70) + '╣');
    console.error(`║   Error Code: ${errorCode}`);
    console.error(`║   Description: ${PROVISIONING_ERROR_CODES[errorCode]}`);
    console.error(`║   Message: ${errorMessage.substring(0, 60)}${errorMessage.length > 60 ? '...' : ''}`);
    console.error(`║   Failed Step: ${currentStep.number} - ${currentStep.name}`);
    console.error(`║   Can Retry: ${canRetry}`);
    console.error(`║   Requires Edit: ${requiresCampaignEdit}`);
    console.error('╠' + '═'.repeat(70) + '╣');
    console.error(`║   Recipient: ${recipientId || 'N/A'}`);
    console.error(`║   Campaign: ${campaignId || 'N/A'}`);
    console.error(`║   Brand: ${brandId || 'N/A'}`);
    console.error(`║   Denomination: $${denomination || 'N/A'}`);
    console.error('╚' + '═'.repeat(70) + '╝');

    if (errorStack) {
      console.error('[CALL-CENTER-PROVISION] Stack trace:', errorStack);
    }

    // Log to database
    await logger.logProvisioningError(errorCode, error, currentStep);

    // Build helpful error message
    let helpfulHint = '';
    if (errorCode === 'GC-001') {
      helpfulHint = ' → Edit the campaign and configure a gift card brand and value for all conditions.';
    } else if (errorCode === 'GC-003' || errorCode === 'GC-004') {
      helpfulHint = ' → Upload gift cards to inventory OR configure Tillo API credentials in Settings.';
    } else if (errorCode === 'GC-006') {
      helpfulHint = ' → Add credits to the client/agency account.';
    } else if (errorCode === 'GC-009') {
      helpfulHint = ' → Customer must opt-in via SMS, verify via email, or select a valid disposition.';
    } else if (errorCode === 'GC-011') {
      helpfulHint = ' → Verify the redemption code and ensure customer is in an active campaign.';
    }

    const result: ProvisionResult = {
      success: false,
      requestId: logger.requestId,
      error: errorMessage + helpfulHint,
      message: errorMessage + helpfulHint,
      errorCode,
      errorDescription: PROVISIONING_ERROR_CODES[errorCode],
      canRetry,
      requiresCampaignEdit,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

/**
 * Call Center Gift Card Provisioning Function
 * 
 * FLOW:
 * 1. Validate input parameters (recipientId, campaignId, brandId, denomination)
 * 2. Call unified provisioning to claim card from inventory/Tillo and assign to recipient
 * 3. Auto-send SMS with gift card details to recipient
 * 4. Return card details for display
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createErrorLogger, PROVISIONING_ERROR_CODES } from '../_shared/error-logger.ts';
import type { ProvisioningErrorCode } from '../_shared/error-logger.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

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
  // Optional recipient info from frontend
  recipientName?: string;
  // Phone number updated by call center rep (for SMS delivery)
  phone?: string | null;
}

interface ProvisionResult {
  success: boolean;
  requestId: string;
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
  sms?: {
    sent: boolean;
    error?: string;
  };
  error?: string;
  message?: string;
  errorCode?: ProvisioningErrorCode;
  errorDescription?: string;
  canRetry?: boolean;
  requiresCampaignEdit?: boolean;
}

// Step definitions
const STEPS = {
  VALIDATE_INPUT: { number: 1, name: 'Validate Input Parameters' },
  CALL_UNIFIED_PROVISION: { number: 2, name: 'Claim Gift Card from Inventory/Tillo' },
  SEND_SMS: { number: 3, name: 'Send Gift Card SMS' },
  FINALIZE: { number: 4, name: 'Return Result' },
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

  // Initialize error logger
  const logger = createErrorLogger('provision-gift-card-for-call-center');
  
  // Initialize activity logger
  const activityLogger = createActivityLogger('provision-gift-card-for-call-center', req);

  // Variables for error logging
  let recipientId: string | undefined;
  let campaignId: string | undefined;
  let brandId: string | undefined;
  let denomination: number | undefined;
  let currentStep = STEPS.VALIDATE_INPUT;

  try {
    // =====================================================
    // STEP 1: VALIDATE INPUT PARAMETERS
    // =====================================================
    await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'started');
    
    const requestData: CallCenterProvisionRequest = await req.json();
    recipientId = requestData.recipientId;
    campaignId = requestData.campaignId;
    brandId = requestData.brandId;
    denomination = requestData.denomination;
    const conditionId = requestData.conditionId;
    const phone = requestData.phone;

    console.log('╔' + '═'.repeat(60) + '╗');
    console.log(`║ [PROVISION] Request ID: ${logger.requestId}`);
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log(`║   recipientId: ${recipientId || 'MISSING'}`);
    console.log(`║   campaignId: ${campaignId || 'MISSING'}`);
    console.log(`║   brandId: ${brandId || 'MISSING'}`);
    console.log(`║   denomination: $${denomination || 'MISSING'}`);
    console.log(`║   phone: ${phone || 'not provided'}`);
    console.log('╚' + '═'.repeat(60) + '╝');

    // Validate required inputs
    const errors: string[] = [];
    if (!recipientId) errors.push('recipientId is required');
    if (!campaignId) errors.push('campaignId is required');
    if (!brandId) errors.push('brandId is required');
    if (!denomination) errors.push('denomination is required');

    if (errors.length > 0) {
      await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'failed', { errors });
      throw new Error(errors.join('. '));
    }

    // Set logger context
    logger.setProvisioningContext({ campaignId, recipientId, brandId, denomination });

    await logger.checkpoint(STEPS.VALIDATE_INPUT.number, STEPS.VALIDATE_INPUT.name, 'completed', {
      recipientId, campaignId, brandId, denomination,
    });

    console.log(`[STEP 1] ✓ Input validated`);

    // If phone was provided by call center rep, update the recipient record
    if (phone && recipientId) {
      console.log(`[STEP 1.5] Updating recipient phone to: ${phone}`);
      const { error: phoneUpdateError } = await supabaseClient
        .from('recipients')
        .update({ phone: phone })
        .eq('id', recipientId);

      if (phoneUpdateError) {
        console.error(`[STEP 1.5] Failed to update recipient phone:`, phoneUpdateError);
        // Non-fatal - continue with provisioning even if phone update fails
      } else {
        console.log(`[STEP 1.5] ✓ Recipient phone updated`);
      }
    }

    // =====================================================
    // STEP 2: CALL UNIFIED PROVISIONING
    // This is the core step - claims card from pool/Tillo and assigns to recipient
    // =====================================================
    currentStep = STEPS.CALL_UNIFIED_PROVISION;
    await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'started', {
      campaignId, recipientId, brandId, denomination,
    });

    console.log(`[STEP 2] Calling unified provisioning...`);

    const provisionRequest = {
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionId,
      requestId: logger.requestId,
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing environment variables');
    }
    
    const unifiedUrl = `${supabaseUrl}/functions/v1/provision-gift-card-unified`;
    const startTime = Date.now();
    
    console.log(`[STEP 2] Calling unified function at: ${unifiedUrl}`);
    
    // JWT verification is now disabled for provision-gift-card-unified
    const response = await fetch(unifiedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'x-request-id': logger.requestId,
      },
      body: JSON.stringify(provisionRequest),
    });

    const duration = Date.now() - startTime;
    console.log(`[STEP 2] Response in ${duration}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'failed', {
        httpStatus: response.status,
        error: errorData.error || errorText,
        durationMs: duration,
      });

      throw new Error(errorData.error || errorData.message || `Provisioning failed: ${errorText}`);
    }

    const provisionResult = await response.json();

    if (!provisionResult.success) {
      await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'failed', {
        error: provisionResult.error,
        durationMs: duration,
      });
      throw new Error(provisionResult.error || 'Provisioning failed');
    }

    await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'completed', {
      source: provisionResult.card?.source,
      brandName: provisionResult.card?.brandName,
      denomination: provisionResult.card?.denomination,
      durationMs: duration,
    });

    console.log(`[STEP 2] ✓ Card claimed from ${provisionResult.card?.source}`);

    // =====================================================
    // STEP 3: SEND SMS WITH GIFT CARD DETAILS
    // =====================================================
    currentStep = STEPS.SEND_SMS;
    await logger.checkpoint(STEPS.SEND_SMS.number, STEPS.SEND_SMS.name, 'started');

    // Get recipient details for SMS
    let recipientPhone = phone; // Use phone from request if provided
    let recipientName = '';
    let clientId: string | undefined;

    if (!recipientPhone || recipientPhone.trim() === '') {
      // Fetch phone from recipient record
      const { data: recipientData, error: recipientError } = await supabaseClient
        .from('recipients')
        .select('phone, first_name, last_name, campaign:campaigns(client_id)')
        .eq('id', recipientId)
        .single();

      if (recipientError) {
        console.error('[STEP 3] Failed to fetch recipient:', recipientError);
      } else {
        recipientPhone = recipientData?.phone;
        recipientName = [recipientData?.first_name, recipientData?.last_name].filter(Boolean).join(' ');
        clientId = (recipientData?.campaign as any)?.client_id;
      }
    } else {
      // Just fetch name and client_id
      const { data: recipientData } = await supabaseClient
        .from('recipients')
        .select('first_name, last_name, campaign:campaigns(client_id)')
        .eq('id', recipientId)
        .single();
      
      if (recipientData) {
        recipientName = [recipientData?.first_name, recipientData?.last_name].filter(Boolean).join(' ');
        clientId = (recipientData?.campaign as any)?.client_id;
      }
    }

    let smsResult: { success: boolean; error?: string; provider?: string } = { success: false, error: 'No phone number available' };

    if (recipientPhone && recipientPhone.trim() !== '') {
      console.log(`[STEP 3] Sending SMS to ${recipientPhone}...`);
      
      try {
        // Call send-gift-card-sms function
        const smsUrl = `${supabaseUrl}/functions/v1/send-gift-card-sms`;
        const smsResponse = await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            deliveryId: provisionResult.card?.id || logger.requestId, // Use card ID or request ID
            giftCardCode: provisionResult.card?.cardCode,
            giftCardValue: provisionResult.card?.denomination,
            recipientPhone: recipientPhone,
            recipientName: recipientName,
            recipientId: recipientId,
            giftCardId: provisionResult.card?.id,
            clientId: clientId,
          }),
        });

        if (smsResponse.ok) {
          smsResult = await smsResponse.json();
          console.log(`[STEP 3] ✓ SMS sent successfully via ${smsResult.provider || 'provider'}`);
        } else {
          const errorText = await smsResponse.text();
          console.error('[STEP 3] SMS send failed:', errorText);
          smsResult = { success: false, error: errorText };
        }
      } catch (smsError) {
        console.error('[STEP 3] SMS send error:', smsError);
        smsResult = { success: false, error: smsError instanceof Error ? smsError.message : String(smsError) };
      }
    } else {
      console.log('[STEP 3] No phone number available, skipping SMS');
    }

    await logger.checkpoint(STEPS.SEND_SMS.number, STEPS.SEND_SMS.name, smsResult.success ? 'completed' : 'failed', {
      smsSuccess: smsResult.success,
      smsError: smsResult.error,
    });

    // =====================================================
    // STEP 4: RETURN RESULT
    // Card is assigned - return details for display in UI
    // =====================================================
    currentStep = STEPS.FINALIZE;
    await logger.checkpoint(STEPS.FINALIZE.number, STEPS.FINALIZE.name, 'completed', {
      success: true,
      source: provisionResult.card?.source,
    });

    const result: ProvisionResult = {
      success: true,
      requestId: logger.requestId,
      card: provisionResult.card,
      billing: provisionResult.billing,
      sms: {
        sent: smsResult.success,
        error: smsResult.success ? undefined : smsResult.error,
      },
    };

    console.log('╔' + '═'.repeat(60) + '╗');
    console.log(`║ [PROVISION] ✓ SUCCESS`);
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log(`║   Card Code: ${result.card?.cardCode}`);
    console.log(`║   Brand: ${result.card?.brandName}`);
    console.log(`║   Value: $${result.card?.denomination}`);
    console.log(`║   Source: ${result.card?.source}`);
    console.log(`║   SMS Sent: ${result.sms?.sent ? '✓' : '✗ ' + (result.sms?.error || 'No')}`);
    console.log('╚' + '═'.repeat(60) + '╝');

    // Log successful provisioning via call center
    await activityLogger.giftCard('card_provisioned', 'success',
      `Gift card provisioned via call center: ${result.card?.brandName} $${result.card?.denomination}`,
      {
        recipientId,
        campaignId,
        clientId,
        brandName: result.card?.brandName,
        amount: result.card?.denomination,
        metadata: {
          source: 'call_center',
          card_source: result.card?.source,
          sms_sent: result.sms?.sent,
          ledger_id: result.billing?.ledgerId,
        },
      }
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Determine error code
    let errorCode: ProvisioningErrorCode = 'GC-015';
    let canRetry = false;
    let requiresCampaignEdit = false;

    if (errorMessage.includes('required')) {
      errorCode = 'GC-012';
    } else if (errorMessage.includes('inventory') || errorMessage.includes('Tillo')) {
      errorCode = 'GC-003';
      canRetry = true;
    } else if (errorMessage.includes('credits') || errorMessage.includes('Insufficient')) {
      errorCode = 'GC-006';
    } else if (errorMessage.includes('brand')) {
      errorCode = 'GC-002';
      requiresCampaignEdit = true;
    }

    console.error('╔' + '═'.repeat(60) + '╗');
    console.error(`║ [PROVISION] ✗ FAILED`);
    console.error('╠' + '═'.repeat(60) + '╣');
    console.error(`║   Error: ${errorMessage.substring(0, 50)}`);
    console.error(`║   Step: ${currentStep.name}`);
    console.error('╚' + '═'.repeat(60) + '╝');

    await logger.logProvisioningError(errorCode, error, currentStep);
    
    // Log failed provisioning via call center
    await activityLogger.giftCard('card_provisioned', 'failed',
      `Call center gift card provisioning failed: ${errorMessage}`,
      {
        recipientId,
        campaignId,
        metadata: {
          error_code: errorCode,
          failed_step: currentStep.name,
          source: 'call_center',
        },
      }
    );

    const result: ProvisionResult = {
      success: false,
      requestId: logger.requestId,
      error: errorMessage,
      message: errorMessage,
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

/**
 * Call Center Gift Card Provisioning Function
 * 
 * SIMPLIFIED FLOW:
 * 1. Validate input parameters (recipientId, campaignId, brandId, denomination)
 * 2. Call unified provisioning to claim card from inventory/Tillo and assign to recipient
 * 3. Return card details for display
 * 
 * NOTE: Delivery (SMS/Email) is skipped for now as SMS is not working.
 * The card is assigned to the recipient in the database and can be manually communicated.
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
  // Optional recipient info from frontend
  recipientName?: string;
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
  error?: string;
  message?: string;
  errorCode?: ProvisioningErrorCode;
  errorDescription?: string;
  canRetry?: boolean;
  requiresCampaignEdit?: boolean;
}

// Simplified step definitions
const STEPS = {
  VALIDATE_INPUT: { number: 1, name: 'Validate Input Parameters' },
  CALL_UNIFIED_PROVISION: { number: 2, name: 'Claim Gift Card from Inventory/Tillo' },
  FINALIZE: { number: 3, name: 'Return Result' },
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

    console.log('╔' + '═'.repeat(60) + '╗');
    console.log(`║ [PROVISION] Request ID: ${logger.requestId}`);
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log(`║   recipientId: ${recipientId || 'MISSING'}`);
    console.log(`║   campaignId: ${campaignId || 'MISSING'}`);
    console.log(`║   brandId: ${brandId || 'MISSING'}`);
    console.log(`║   denomination: $${denomination || 'MISSING'}`);
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

    const startTime = Date.now();
    
    // Use supabaseClient.functions.invoke for proper auth handling
    console.log(`[STEP 2] Invoking unified function via supabase client...`);
    
    const { data: provisionResult, error: invokeError } = await supabaseClient.functions.invoke(
      'provision-gift-card-unified',
      {
        body: provisionRequest,
        headers: {
          'x-request-id': logger.requestId,
        },
      }
    );

    const duration = Date.now() - startTime;
    console.log(`[STEP 2] Response in ${duration}ms`, { 
      hasData: !!provisionResult, 
      hasError: !!invokeError,
      errorMessage: invokeError?.message,
    });

    if (invokeError) {
      await logger.checkpoint(STEPS.CALL_UNIFIED_PROVISION.number, STEPS.CALL_UNIFIED_PROVISION.name, 'failed', {
        error: invokeError.message,
        durationMs: duration,
      });

      throw new Error(invokeError.message || 'Provisioning failed');
    }

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
    // STEP 3: RETURN RESULT
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
    };

    console.log('╔' + '═'.repeat(60) + '╗');
    console.log(`║ [PROVISION] ✓ SUCCESS`);
    console.log('╠' + '═'.repeat(60) + '╣');
    console.log(`║   Card Code: ${result.card?.cardCode}`);
    console.log(`║   Brand: ${result.card?.brandName}`);
    console.log(`║   Value: $${result.card?.denomination}`);
    console.log(`║   Source: ${result.card?.source}`);
    console.log('╚' + '═'.repeat(60) + '╝');

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

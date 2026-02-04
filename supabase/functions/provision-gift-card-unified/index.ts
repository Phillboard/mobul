/**
 * Unified Gift Card Provisioning Function
 * 
 * Single entry point for all gift card provisioning scenarios:
 * - Standard: Direct provisioning from frontend/API
 * - Call Center: Provisioning + automatic SMS delivery
 * - API Test: Direct Tillo API testing (no billing)
 * 
 * Entry Points:
 * - "standard" (default): Normal provisioning flow
 * - "call_center": Provision + send SMS to recipient
 * - "api_test": Test Tillo API directly (testMode: true) or delegate to standard
 * 
 * Backward Compatible: Existing callers without entryPoint default to "standard"
 */

import { withApiGateway, ApiError, successResponse, errorResponse } from '../_shared/api-gateway.ts';
import { handleCORS } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { provisionGiftCard, ProvisioningError, PROVISIONING_STEPS } from '../_shared/business-rules/gift-card-provisioning.ts';
import type { ProvisionParams, ProvisionResult } from '../_shared/business-rules/gift-card-provisioning.ts';
import { createErrorLogger, PROVISIONING_ERROR_CODES } from '../_shared/error-logger.ts';
import type { ProvisioningErrorCode } from '../_shared/error-logger.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { getTilloClient } from '../_shared/tillo-client.ts';

// ============================================================================
// Types
// ============================================================================

type EntryPoint = 'standard' | 'call_center' | 'api_test';

interface UnifiedProvisionRequest {
  // Entry point determines behavior
  entryPoint?: EntryPoint;
  
  // Standard provisioning params
  campaignId?: string;
  recipientId?: string;
  brandId?: string;
  denomination?: number;
  conditionNumber?: number;
  requestId?: string;
  
  // Call center specific
  phone?: string | null;
  deliveryPhone?: string | null;
  deliveryEmail?: string | null;
  recipientName?: string;
  conditionId?: string;
  
  // API test specific
  testMode?: boolean;
  testConfig?: {
    api_provider: string;
    card_value: number;
    api_config?: {
      brandCode?: string;
    };
  };
  poolId?: string;
  callSessionId?: string | null;
}

interface UnifiedProvisionResponse extends ProvisionResult {
  sms?: {
    sent: boolean;
    error?: string;
    provider?: string;
  };
  apiResponse?: {
    transactionId?: string;
    orderReference?: string;
    provider: string;
    timestamp: string;
    rawResponse?: unknown;
  };
  testMode?: boolean;
  canRetry?: boolean;
  requiresCampaignEdit?: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Unified provisioning handler
 * Routes to appropriate logic based on entryPoint
 */
async function handleProvision(
  request: UnifiedProvisionRequest,
  _context: unknown,
  rawRequest: Request
): Promise<UnifiedProvisionResponse> {
  const supabase = createServiceClient();
  const logger = createErrorLogger('provision-gift-card-unified');
  const activityLogger = createActivityLogger('provision-gift-card-unified', rawRequest);
  
  const entryPoint: EntryPoint = request.entryPoint || 'standard';
  
  console.log(`[UNIFIED-PROVISION] Entry point: ${entryPoint}, Request ID: ${logger.requestId}`);
  
  // Route based on entry point
  switch (entryPoint) {
    case 'api_test':
      return handleApiTest(request, supabase, logger);
      
    case 'call_center':
      return handleCallCenter(request, supabase, logger, activityLogger);
      
    case 'standard':
    default:
      return handleStandard(request, supabase, logger, activityLogger);
  }
}

// ============================================================================
// Entry Point Handlers
// ============================================================================

/**
 * Standard provisioning flow
 */
async function handleStandard(
  request: UnifiedProvisionRequest,
  supabase: ReturnType<typeof createServiceClient>,
  logger: ReturnType<typeof createErrorLogger>,
  activityLogger: ReturnType<typeof createActivityLogger>
): Promise<UnifiedProvisionResponse> {
  const { campaignId, recipientId, brandId, denomination, conditionNumber, requestId } = request;
  
  // Validate required params
  if (!campaignId || !recipientId || !brandId || !denomination) {
    throw new ApiError(
      'Missing required parameters: campaignId, recipientId, brandId, denomination',
      'VALIDATION_ERROR',
      400
    );
  }
  
  const params: ProvisionParams = {
    campaignId,
    recipientId,
    brandId,
    denomination,
    conditionNumber,
    requestId: requestId || logger.requestId,
  };
  
  // Create a provisioning logger adapter
  const provisionLogger = {
    requestId: logger.requestId,
    checkpoint: logger.checkpoint.bind(logger),
    setProvisioningContext: logger.setProvisioningContext.bind(logger),
    logProvisioningError: logger.logProvisioningError.bind(logger),
  };
  
  const result = await provisionGiftCard(supabase, params, provisionLogger);
  
  // Log activity
  if (result.success) {
    await activityLogger.giftCard('card_provisioned', 'success',
      `Gift card provisioned: ${result.card?.brandName} $${result.card?.denomination}`,
      {
        campaignId,
        recipientId,
        brandName: result.card?.brandName,
        amount: result.card?.denomination,
        metadata: {
          source: result.card?.source,
          billed_entity: result.billing?.billedEntity,
          amount_billed: result.billing?.amountBilled,
          ledger_id: result.billing?.ledgerId,
        },
      }
    );
  } else {
    await activityLogger.giftCard('card_provisioned', 'failed',
      `Gift card provisioning failed: ${result.error}`,
      {
        campaignId,
        recipientId,
        metadata: {
          error_code: result.errorCode,
        },
      }
    );
  }
  
  if (!result.success) {
    throw new ApiError(result.error || 'Provisioning failed', result.errorCode || 'GC-015', 400);
  }
  
  return result;
}

/**
 * Call center provisioning with SMS delivery
 */
async function handleCallCenter(
  request: UnifiedProvisionRequest,
  supabase: ReturnType<typeof createServiceClient>,
  logger: ReturnType<typeof createErrorLogger>,
  activityLogger: ReturnType<typeof createActivityLogger>
): Promise<UnifiedProvisionResponse> {
  const { campaignId, recipientId, brandId, denomination, phone, conditionNumber, conditionId } = request;
  
  // Validate required params
  if (!campaignId || !recipientId || !brandId || !denomination) {
    throw new ApiError(
      'Missing required parameters: campaignId, recipientId, brandId, denomination',
      'VALIDATION_ERROR',
      400
    );
  }
  
  // Update recipient phone if provided
  if (phone && recipientId) {
    console.log(`[CALL-CENTER] Updating recipient phone: ${phone}`);
    const { error: phoneError } = await supabase
      .from('recipients')
      .update({ phone })
      .eq('id', recipientId);
    
    if (phoneError) {
      console.error(`[CALL-CENTER] Phone update failed (non-fatal): ${phoneError.message}`);
    }
  }
  
  // Run standard provisioning
  const params: ProvisionParams = {
    campaignId,
    recipientId,
    brandId,
    denomination,
    conditionNumber,
    requestId: logger.requestId,
  };
  
  const provisionLogger = {
    requestId: logger.requestId,
    checkpoint: logger.checkpoint.bind(logger),
    setProvisioningContext: logger.setProvisioningContext.bind(logger),
    logProvisioningError: logger.logProvisioningError.bind(logger),
  };
  
  const result = await provisionGiftCard(supabase, params, provisionLogger);
  
  if (!result.success) {
    // Determine if error is retryable
    const canRetry = result.errorCode === 'GC-003'; // Inventory issues
    const requiresCampaignEdit = result.errorCode === 'GC-002'; // Brand issues
    
    await activityLogger.giftCard('card_provisioned', 'failed',
      `Call center provisioning failed: ${result.error}`,
      {
        campaignId,
        recipientId,
        metadata: {
          error_code: result.errorCode,
          source: 'call_center',
        },
      }
    );
    
    return {
      ...result,
      canRetry,
      requiresCampaignEdit,
    };
  }
  
  // Send SMS with gift card details
  let smsResult: { sent: boolean; error?: string; provider?: string } = {
    sent: false,
    error: 'No phone number available',
  };
  
  // Get recipient details for SMS
  let recipientPhone = phone;
  let recipientName = request.recipientName || '';
  let clientId: string | undefined;
  
  if (!recipientPhone) {
    const { data: recipientData } = await supabase
      .from('recipients')
      .select('phone, first_name, last_name, campaign:campaigns(client_id)')
      .eq('id', recipientId)
      .single();
    
    if (recipientData) {
      recipientPhone = recipientData.phone;
      recipientName = [recipientData.first_name, recipientData.last_name].filter(Boolean).join(' ');
      clientId = (recipientData.campaign as any)?.client_id;
    }
  }
  
  if (recipientPhone?.trim()) {
    console.log(`[CALL-CENTER] Sending SMS to ${recipientPhone}...`);
    
    try {
      const smsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gift-card-sms`;
      const smsResponse = await fetch(smsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          deliveryId: result.card?.id || logger.requestId,
          giftCardCode: result.card?.cardCode,
          giftCardValue: result.card?.denomination,
          recipientPhone,
          recipientName,
          recipientId,
          giftCardId: result.card?.id,
          clientId,
          conditionId,
        }),
      });
      
      if (smsResponse.ok) {
        smsResult = await smsResponse.json();
        console.log(`[CALL-CENTER] SMS sent via ${smsResult.provider || 'provider'}`);
      } else {
        const errorText = await smsResponse.text();
        console.error(`[CALL-CENTER] SMS failed: ${errorText}`);
        smsResult = { sent: false, error: errorText };
      }
    } catch (smsError) {
      console.error(`[CALL-CENTER] SMS exception:`, smsError);
      smsResult = {
        sent: false,
        error: smsError instanceof Error ? smsError.message : String(smsError),
      };
    }
  }
  
  // Log successful provisioning
  await activityLogger.giftCard('card_provisioned', 'success',
    `Gift card provisioned via call center: ${result.card?.brandName} $${result.card?.denomination}`,
    {
      campaignId,
      recipientId,
      clientId,
      brandName: result.card?.brandName,
      amount: result.card?.denomination,
      metadata: {
        source: 'call_center',
        card_source: result.card?.source,
        sms_sent: smsResult.sent,
        ledger_id: result.billing?.ledgerId,
      },
    }
  );
  
  return {
    ...result,
    sms: {
      sent: smsResult.sent,
      error: smsResult.sent ? undefined : smsResult.error,
      provider: smsResult.provider,
    },
  };
}

/**
 * API test mode - direct Tillo testing or delegate to standard
 */
async function handleApiTest(
  request: UnifiedProvisionRequest,
  supabase: ReturnType<typeof createServiceClient>,
  logger: ReturnType<typeof createErrorLogger>
): Promise<UnifiedProvisionResponse> {
  const { testMode, testConfig, campaignId, recipientId, brandId, denomination } = request;
  
  // Test mode: Direct Tillo API call (no billing)
  if (testMode && testConfig) {
    console.log('[API-TEST] Test mode - calling Tillo API directly');
    
    const { api_provider, card_value, api_config } = testConfig;
    
    if (!api_provider || !card_value) {
      throw new ApiError('Test mode requires api_provider and card_value', 'VALIDATION_ERROR', 400);
    }
    
    const testBrandCode = api_config?.brandCode || 'AMZN';
    
    try {
      const tilloClient = getTilloClient();
      const tilloCard = await tilloClient.provisionCard(testBrandCode, card_value, 'USD');
      
      console.log('[API-TEST] Tillo API test successful');
      
      return {
        success: true,
        requestId: logger.requestId,
        testMode: true,
        card: {
          cardCode: tilloCard.cardCode,
          cardNumber: tilloCard.cardNumber,
          denomination: card_value,
          brandName: api_provider,
          expirationDate: tilloCard.expirationDate,
          source: 'tillo',
        },
        apiResponse: {
          transactionId: tilloCard.transactionId,
          orderReference: tilloCard.orderReference,
          provider: 'Tillo',
          timestamp: new Date().toISOString(),
          rawResponse: { success: true, message: 'Test provisioning successful' },
        },
      };
    } catch (tilloError) {
      console.error('[API-TEST] Tillo API test failed:', tilloError);
      
      return {
        success: false,
        requestId: logger.requestId,
        testMode: true,
        error: `Tillo API Error: ${tilloError instanceof Error ? tilloError.message : String(tilloError)}`,
        apiResponse: {
          provider: 'Tillo',
          timestamp: new Date().toISOString(),
          rawResponse: { error: tilloError instanceof Error ? tilloError.message : String(tilloError) },
        },
      };
    }
  }
  
  // Production mode: delegate to standard provisioning
  console.log('[API-TEST] Production mode - delegating to standard provisioning');
  
  if (!campaignId || !recipientId || !brandId || !denomination) {
    throw new ApiError(
      'Production mode requires campaignId, recipientId, brandId, and denomination',
      'VALIDATION_ERROR',
      400
    );
  }
  
  // Create minimal loggers for delegation
  const activityLogger = createActivityLogger('provision-gift-card-unified-api');
  
  const result = await handleStandard(
    { ...request, entryPoint: 'standard' },
    supabase,
    logger,
    activityLogger
  );
  
  return {
    ...result,
    testMode: false,
    apiResponse: {
      provider: result.card?.source === 'tillo' ? 'Tillo' : 'Inventory',
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Serve
// ============================================================================

/**
 * Main entry point using withApiGateway wrapper
 * 
 * Note: requireAuth is false because this function needs to be called:
 * - By authenticated users (frontend)
 * - By other edge functions (service role)
 * - The authorization header is still used for user context when present
 */
Deno.serve(withApiGateway(handleProvision, {
  requireAuth: false, // Called by both users and service-to-service
  parseBody: true,
  auditAction: 'gift_card_provision',
}));

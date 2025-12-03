/**
 * Call Center Gift Card Provisioning Function
 * 
 * Specialized wrapper for call center gift card provisioning with:
 * 1. Redemption code lookup
 * 2. SMS opt-in validation
 * 3. Call session tracking
 * 4. Delivery method handling (SMS/Email)
 * 5. Delegates actual provisioning to unified function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createErrorLogger } from '../_shared/error-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CallCenterProvisionRequest {
  redemptionCode: string;
  deliveryPhone?: string | null;
  deliveryEmail?: string | null;
  conditionNumber?: number;
  conditionId?: string;
  callSessionId?: string;
  skipSmsDelivery?: boolean; // For simulation mode - skip actual SMS sending
}

interface ProvisionResult {
  success: boolean;
  card?: {
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
  };
  error?: string;
  message?: string;
}

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
  const errorLogger = createErrorLogger('provision-gift-card-for-call-center');

  // Declare variables at function scope for error logging access
  let redemptionCode: string | undefined;
  let recipientId: string | undefined;
  let campaignId: string | undefined;

  try {
    const requestData: CallCenterProvisionRequest = await req.json();
    redemptionCode = requestData.redemptionCode;
    const deliveryPhone = requestData.deliveryPhone;
    const deliveryEmail = requestData.deliveryEmail;
    const conditionNumber = requestData.conditionNumber;
    const conditionId = requestData.conditionId;
    const callSessionId = requestData.callSessionId;
    const skipSmsDelivery = requestData.skipSmsDelivery || false;

    console.log('='.repeat(60));
    console.log(`[CALL-CENTER-PROVISION] [${errorLogger.requestId}] === REQUEST START ===`);
    console.log('[CALL-CENTER-PROVISION] Request body:', JSON.stringify({
      redemptionCode,
      deliveryPhone: deliveryPhone ? '***' + deliveryPhone.slice(-4) : null,
      deliveryEmail: deliveryEmail ? '***@***' : null,
      conditionNumber,
      conditionId,
      callSessionId,
      skipSmsDelivery,
    }, null, 2));

    // Validate inputs
    if (!redemptionCode) {
      throw new Error('Redemption code is required');
    }

    if (!deliveryPhone && !deliveryEmail) {
      throw new Error('Either phone or email delivery method is required');
    }

    // =====================================================
    // STEP 1: Look up recipient by redemption code
    // =====================================================
    
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('recipients')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        redemption_code,
        sms_opt_in_status,
        sms_opt_in_date,
        verification_method,
        disposition,
        audiences!inner(
          campaign_id,
          campaigns!inner(
            id,
            campaign_name,
            client_id
          )
        )
      `)
      .eq('redemption_code', redemptionCode)
      .single();

    if (recipientError || !recipient) {
      console.error('[CALL-CENTER-PROVISION] Recipient lookup failed:', {
        error: recipientError,
        code: redemptionCode,
      });
      throw new Error('Invalid redemption code');
    }

    // Store recipient and campaign IDs for error logging
    recipientId = recipient.id;
    campaignId = recipient.audiences[0]?.campaign_id;

    console.log('[CALL-CENTER-PROVISION] STEP 1 - Recipient found:', {
      id: recipient.id,
      name: `${recipient.first_name} ${recipient.last_name}`,
      sms_opt_in_status: recipient.sms_opt_in_status,
      verification_method: recipient.verification_method,
      disposition: recipient.disposition,
      campaign_id: campaignId,
    });

    // =====================================================
    // STEP 2: Validate verification status for SMS delivery
    // Accepts: SMS opt-in, skipped with positive disposition, or email verification
    // =====================================================
    
    if (deliveryPhone) {
      // Check all valid verification methods
      const isOptedIn = recipient.sms_opt_in_status === 'opted_in';
      const positiveDispositions = ['verified_verbally', 'already_opted_in', 'vip_customer'];
      const hasSkippedVerification = recipient.verification_method === 'skipped' && 
        positiveDispositions.includes(recipient.disposition || '');
      const hasEmailVerification = recipient.verification_method === 'email';
      
      if (!isOptedIn && !hasSkippedVerification && !hasEmailVerification) {
        console.log('[CALL-CENTER-PROVISION] Verification check failed:', {
          sms_opt_in_status: recipient.sms_opt_in_status,
          verification_method: recipient.verification_method,
          disposition: recipient.disposition,
        });
        throw new Error('Recipient verification required. Use SMS opt-in, email verification, or skip with valid disposition.');
      }
      
      // Log which verification method was used
      if (isOptedIn) {
        console.log('[CALL-CENTER-PROVISION] Verified via SMS opt-in');
      } else if (hasSkippedVerification) {
        console.log('[CALL-CENTER-PROVISION] Verified via skipped verification with disposition:', recipient.disposition);
      } else if (hasEmailVerification) {
        console.log('[CALL-CENTER-PROVISION] Verified via email verification');
      }
    }

    // =====================================================
    // STEP 3: Get campaign and condition details
    // =====================================================
    
    const campaignId = recipient.audiences[0]?.campaign_id;
    if (!campaignId) {
      throw new Error('Recipient is not associated with a campaign');
    }

    // Get gift card configuration for this condition
    let giftCardConfig: any = null;
    if (conditionId) {
      const { data: config, error: configError } = await supabaseClient
        .from('campaign_gift_card_config')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('condition_number', conditionNumber || 1)
        .single();

      if (configError) {
        console.warn('[CALL-CENTER-PROVISION] No gift card config found:', configError);
      } else {
        giftCardConfig = config;
      }
    }

    // If no config found, try to get from campaign_conditions (new schema)
    // Use specific conditionId if provided, otherwise fall back to first active condition
    if (!giftCardConfig) {
      console.log('[CALL-CENTER-PROVISION] STEP 3b - No legacy config, checking campaign_conditions table');
      let conditionData: any = null;
      let conditionError: any = null;

      if (conditionId) {
        // Query specific condition by ID (include sms_template for delivery message)
        console.log('[CALL-CENTER-PROVISION] Querying condition by ID:', conditionId);
        const result = await supabaseClient
          .from('campaign_conditions')
          .select('id, brand_id, card_value, condition_number, sms_template, condition_name, is_active')
          .eq('id', conditionId)
          .single();
        conditionData = result.data;
        conditionError = result.error;
        console.log('[CALL-CENTER-PROVISION] Condition query result:', {
          found: !!result.data,
          data: result.data,
          error: result.error,
        });
      } else {
        // Fallback to first active condition for this campaign (include sms_template)
        console.log('[CALL-CENTER-PROVISION] Querying first active condition for campaign:', campaignId);
        const result = await supabaseClient
          .from('campaign_conditions')
          .select('id, brand_id, card_value, condition_number, sms_template, condition_name, is_active')
          .eq('campaign_id', campaignId)
          .eq('is_active', true)
          .order('condition_number')
          .limit(1)
          .single();
        conditionData = result.data;
        conditionError = result.error;
        console.log('[CALL-CENTER-PROVISION] Condition query result:', {
          found: !!result.data,
          data: result.data,
          error: result.error,
        });
      }

      // Log detailed diagnostic info - COMPREHENSIVE LOGGING
      console.log('[CALL-CENTER-PROVISION] === CONDITION ANALYSIS START ===');
      console.log('[CALL-CENTER-PROVISION] Campaign ID:', campaignId);
      console.log('[CALL-CENTER-PROVISION] Condition ID requested:', conditionId || 'not specified (using first active)');
      console.log('[CALL-CENTER-PROVISION] Full condition data:', JSON.stringify(conditionData, null, 2));
      console.log('[CALL-CENTER-PROVISION] Condition analysis:', {
        hasConditionData: !!conditionData,
        brand_id: conditionData?.brand_id || 'NULL/MISSING',
        card_value: conditionData?.card_value || 'NULL/MISSING',
        condition_name: conditionData?.condition_name,
        has_brand_id: !!conditionData?.brand_id,
        has_card_value: !!conditionData?.card_value,
        is_active: conditionData?.is_active,
        raw_brand_id_type: typeof conditionData?.brand_id,
        raw_card_value_type: typeof conditionData?.card_value,
      });
      console.log('[CALL-CENTER-PROVISION] === CONDITION ANALYSIS END ===');

      if (conditionError || !conditionData?.brand_id) {
        console.error('[CALL-CENTER-PROVISION] === GIFT CARD CONFIG ERROR ===');
        console.error('[CALL-CENTER-PROVISION] Campaign ID:', campaignId);
        console.error('[CALL-CENTER-PROVISION] Condition ID requested:', conditionId || 'not specified (using first active)');
        console.error('[CALL-CENTER-PROVISION] Query error:', conditionError);
        console.error('[CALL-CENTER-PROVISION] Condition data found:', JSON.stringify(conditionData, null, 2));
        console.error('[CALL-CENTER-PROVISION] Likely cause: brand_id and card_value were not saved during campaign creation');
        
<<<<<<< Current (Your changes)
        // Try the RPC function as a fallback
        if (conditionId) {
          console.log('[CALL-CENTER-PROVISION] Trying RPC fallback for condition:', conditionId);
          const { data: rpcResult, error: rpcError } = await supabaseClient
            .rpc('get_condition_gift_card_config', { p_condition_id: conditionId });
          
          if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].brand_id) {
            console.log('[CALL-CENTER-PROVISION] RPC fallback succeeded:', rpcResult[0]);
            conditionData = {
              id: rpcResult[0].condition_id,
              brand_id: rpcResult[0].brand_id,
              card_value: rpcResult[0].card_value,
              condition_number: rpcResult[0].condition_number,
              sms_template: rpcResult[0].sms_template,
              condition_name: rpcResult[0].condition_name,
            };
          } else {
            console.error('[CALL-CENTER-PROVISION] RPC fallback also failed:', rpcError);
            throw new Error(`No gift card configured for campaign ${campaignId}, condition ${conditionId || 'first active'}. Please configure a gift card brand and value in campaign settings.`);
          }
        } else {
          throw new Error(`No gift card configured for campaign ${campaignId}. Please configure a gift card brand and value in campaign settings.`);
=======
        // ENHANCED: Try to find ALL conditions for this campaign for diagnostic purposes
        console.log('[CALL-CENTER-PROVISION] === DIAGNOSTIC: Fetching ALL conditions for campaign ===');
        const { data: allConditions, error: allCondError } = await supabaseClient
          .from('campaign_conditions')
          .select('id, brand_id, card_value, condition_number, condition_name, is_active')
          .eq('campaign_id', campaignId);
        
        console.log('[CALL-CENTER-PROVISION] All conditions for campaign:', JSON.stringify(allConditions, null, 2));
        console.log('[CALL-CENTER-PROVISION] All conditions error:', allCondError);
        
        // Check if any condition has brand_id set
        const conditionWithBrand = allConditions?.find(c => c.brand_id && c.card_value);
        if (conditionWithBrand) {
          console.log('[CALL-CENTER-PROVISION] Found condition with valid config:', conditionWithBrand);
          conditionData = conditionWithBrand;
        } else {
          // Try the RPC function as a fallback
          if (conditionId) {
            console.log('[CALL-CENTER-PROVISION] Trying RPC fallback for condition:', conditionId);
            const { data: rpcResult, error: rpcError } = await supabaseClient
              .rpc('get_condition_gift_card_config', { p_condition_id: conditionId });
            
            if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].brand_id) {
              console.log('[CALL-CENTER-PROVISION] RPC fallback succeeded:', rpcResult[0]);
              conditionData = {
                id: rpcResult[0].condition_id,
                brand_id: rpcResult[0].brand_id,
                card_value: rpcResult[0].card_value,
                condition_number: rpcResult[0].condition_number,
                sms_template: rpcResult[0].sms_template,
                condition_name: rpcResult[0].condition_name,
              };
            } else {
              console.error('[CALL-CENTER-PROVISION] RPC fallback also failed:', rpcError);
              
              // Provide detailed error about what we found
              const conditionCount = allConditions?.length || 0;
              const activeCount = allConditions?.filter(c => c.is_active)?.length || 0;
              const withBrandCount = allConditions?.filter(c => c.brand_id)?.length || 0;
              
              throw new Error(`No gift card configured for campaign ${campaignId}, condition ${conditionId || 'first active'}. ` +
                `Found ${conditionCount} total conditions, ${activeCount} active, ${withBrandCount} with brand_id. ` +
                `Please edit the campaign and configure a gift card brand and value for each condition.`);
            }
          } else {
            // Provide detailed error about what we found
            const conditionCount = allConditions?.length || 0;
            const activeCount = allConditions?.filter(c => c.is_active)?.length || 0;
            const withBrandCount = allConditions?.filter(c => c.brand_id)?.length || 0;
            
            throw new Error(`No gift card configured for campaign ${campaignId}. ` +
              `Found ${conditionCount} total conditions, ${activeCount} active, ${withBrandCount} with brand_id. ` +
              `Please edit the campaign and configure a gift card brand and value for each condition.`);
          }
>>>>>>> Incoming (Background Agent changes)
        }
      }

      giftCardConfig = {
        brand_id: conditionData.brand_id,
        denomination: conditionData.card_value || 25,
        sms_template: conditionData.sms_template || null,
      };
      
      console.log('[CALL-CENTER-PROVISION] STEP 3 COMPLETE - Gift card config:', giftCardConfig);
    }

    console.log('[CALL-CENTER-PROVISION] Final gift card config:', {
      brand_id: giftCardConfig.brand_id,
      denomination: giftCardConfig.denomination,
      has_sms_template: !!giftCardConfig.sms_template,
    });

    // =====================================================
    // STEP 4: Check if already provisioned for this condition
    // =====================================================
    
    const { data: existingLedger, error: ledgerCheckError } = await supabaseClient
      .from('gift_card_billing_ledger')
      .select('id')
      .eq('recipient_id', recipient.id)
      .eq('campaign_id', campaignId)
      .eq('brand_id', giftCardConfig.brand_id)
      .limit(1);

    if (existingLedger && existingLedger.length > 0) {
      console.warn('[CALL-CENTER-PROVISION] Gift card already provisioned');
      throw new Error('Gift card has already been provisioned for this recipient and condition');
    }

    // =====================================================
    // STEP 5: Call unified provisioning function
    // =====================================================
    
    const provisionRequest = {
      campaignId: campaignId,
      recipientId: recipient.id,
      brandId: giftCardConfig.brand_id,
      denomination: giftCardConfig.denomination,
      conditionNumber: conditionNumber || 1,
    };

    console.log('[CALL-CENTER-PROVISION] STEP 5 - Calling unified provisioning');
    console.log('[CALL-CENTER-PROVISION] Provision request:', JSON.stringify(provisionRequest, null, 2));

    // Use Supabase Functions invoke internally (server-to-server)
    const unifiedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/provision-gift-card-unified`;
    console.log('[CALL-CENTER-PROVISION] Calling:', unifiedUrl);
    
    const provisionResponse = await fetch(unifiedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(provisionRequest),
    });

    console.log('[CALL-CENTER-PROVISION] Unified response status:', provisionResponse.status);

    if (!provisionResponse.ok) {
      const errorText = await provisionResponse.text();
      console.error('[CALL-CENTER-PROVISION] === UNIFIED FUNCTION FAILED ===');
      console.error('[CALL-CENTER-PROVISION] Status:', provisionResponse.status);
      console.error('[CALL-CENTER-PROVISION] Response:', errorText);
      throw new Error(`Provisioning failed: ${errorText}`);
    }

    const provisionResult = await provisionResponse.json();
    console.log('[CALL-CENTER-PROVISION] Unified response:', JSON.stringify(provisionResult, null, 2));

    if (!provisionResult.success) {
      console.error('[CALL-CENTER-PROVISION] Unified function returned error:', provisionResult.error);
      throw new Error(provisionResult.error || 'Provisioning failed');
    }

    console.log('[CALL-CENTER-PROVISION] STEP 5 COMPLETE - Provisioning successful');

    // =====================================================
    // STEP 6: Send delivery notification (SMS or Email)
    // =====================================================
    
    const deliveryMethod = deliveryPhone ? 'sms' : 'email';
    const deliveryDestination = deliveryPhone || deliveryEmail;

    try {
      if (deliveryMethod === 'sms' && deliveryPhone) {
        // Check if we should skip SMS delivery (simulation mode)
        if (skipSmsDelivery) {
          console.log('[CALL-CENTER-PROVISION] SIMULATION MODE - Skipping SMS delivery');
          console.log('[CALL-CENTER-PROVISION] Would have sent SMS to:', deliveryPhone);
          console.log('[CALL-CENTER-PROVISION] Gift card code:', provisionResult.card.cardCode);
        } else {
          // Prepare SMS message from template
          let customMessage = giftCardConfig?.sms_template;
          
          // Replace template variables if we have a template
          if (customMessage) {
            customMessage = customMessage
              .replace(/\{first_name\}/gi, recipient.first_name || '')
              .replace(/\{last_name\}/gi, recipient.last_name || '')
              .replace(/\{value\}/g, provisionResult.card.denomination.toString())
              .replace(/\$\{value\}/g, provisionResult.card.denomination.toString())
              .replace(/\{provider\}/gi, provisionResult.card.brandName || 'Gift Card')
              .replace(/\{company\}/gi, provisionResult.card.brandName || 'us')
              .replace(/\{link\}/gi, provisionResult.card.cardCode); // Simplified - replace with actual redemption link if available
          }
          
          // Send SMS with correct parameters
          const smsResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gift-card-sms`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                deliveryId: `call_center_${Date.now()}`, // Temporary ID for logging
                giftCardCode: provisionResult.card.cardCode,
                giftCardValue: provisionResult.card.denomination,
                recipientPhone: deliveryPhone,
                recipientName: `${recipient.first_name} ${recipient.last_name}`,
                customMessage: customMessage || undefined,
                recipientId: recipient.id,
                giftCardId: provisionResult.card.id || null,
              }),
            }
          );

          if (!smsResponse.ok) {
            const errorText = await smsResponse.text();
            console.error('[CALL-CENTER-PROVISION] SMS delivery failed:', errorText);
          } else {
            console.log('[CALL-CENTER-PROVISION] SMS sent successfully');
          }
        }
      } else if (deliveryMethod === 'email' && deliveryEmail) {
        // Send Email
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

        if (!emailResponse.ok) {
          console.error('[CALL-CENTER-PROVISION] Email delivery failed');
        } else {
          console.log('[CALL-CENTER-PROVISION] Email sent successfully');
        }
      }
    } catch (deliveryError) {
      console.error('[CALL-CENTER-PROVISION] Delivery notification error:', deliveryError);
      // Don't fail the entire request if delivery fails - card is already provisioned
    }

    // =====================================================
    // STEP 7: Update call session if provided
    // =====================================================
    
    if (callSessionId) {
      await supabaseClient
        .from('call_sessions')
        .update({
          gift_card_provisioned: true,
          gift_card_provisioned_at: new Date().toISOString(),
          notes: `Gift card provisioned: ${provisionResult.card.brandName} $${provisionResult.card.denomination}`,
        })
        .eq('id', callSessionId);
    }

    // =====================================================
    // STEP 8: Return comprehensive result
    // =====================================================
    
    const result: ProvisionResult = {
      success: true,
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
      },
    };

    console.log('[CALL-CENTER-PROVISION] Complete success');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('='.repeat(60));
    console.error(`[CALL-CENTER-PROVISION] [${errorLogger.requestId}] === ERROR ===`);
    console.error('[CALL-CENTER-PROVISION] Error type:', error?.constructor?.name);
    console.error('[CALL-CENTER-PROVISION] Error message:', error?.message);
    console.error('[CALL-CENTER-PROVISION] Error stack:', error?.stack);
    console.error('[CALL-CENTER-PROVISION] Context:', {
      redemptionCode,
      recipientId,
      campaignId,
    });
    console.error('='.repeat(60));

    // Log error to database
    await errorLogger.logError(error, {
      recipientId,
      campaignId,
      metadata: {
        redemptionCode,
      },
    });

    // Provide helpful error messages based on the error type
    let errorMessage = error.message || 'Unknown error occurred';
    let helpfulHint = '';

    if (errorMessage.includes('No gift card configured')) {
      helpfulHint = ' → Please configure a gift card brand and value in the campaign settings.';
    } else if (errorMessage.includes('Provisioning failed')) {
      helpfulHint = ' → Check that you have gift cards in inventory OR Tillo API configured. Go to Settings → Gift Cards to manage inventory.';
    } else if (errorMessage.includes('not configured')) {
      helpfulHint = ' → Please contact your administrator to configure the required API credentials.';
    } else if (errorMessage.includes('Recipient verification required')) {
      helpfulHint = ' → Customer must opt-in via SMS, verify via email, or you must skip verification with a valid disposition.';
    } else if (errorMessage.includes('already been provisioned')) {
      helpfulHint = ' → This customer has already received a gift card for this campaign.';
    } else if (errorMessage.includes('Invalid redemption code')) {
      helpfulHint = ' → Please verify the redemption code and ensure the customer is in an active campaign.';
    }

    const result: ProvisionResult = {
      success: false,
      error: errorMessage + helpfulHint,
      message: errorMessage + helpfulHint,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


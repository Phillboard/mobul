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

  try {
    const {
      redemptionCode,
      deliveryPhone,
      deliveryEmail,
      conditionNumber,
      conditionId,
      callSessionId,
    }: CallCenterProvisionRequest = await req.json();

    console.log('[CALL-CENTER-PROVISION] Starting:', {
      redemptionCode,
      hasPhone: !!deliveryPhone,
      hasEmail: !!deliveryEmail,
      conditionNumber,
    });

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
      console.error('[CALL-CENTER-PROVISION] Recipient not found:', recipientError);
      throw new Error('Invalid redemption code');
    }

    console.log('[CALL-CENTER-PROVISION] Recipient found:', recipient.id);

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
      let conditionData: any = null;
      let conditionError: any = null;

      if (conditionId) {
        // Query specific condition by ID
        const result = await supabaseClient
          .from('campaign_conditions')
          .select('brand_id, card_value, condition_number')
          .eq('id', conditionId)
          .single();
        conditionData = result.data;
        conditionError = result.error;
        console.log('[CALL-CENTER-PROVISION] Querying condition by ID:', conditionId);
      } else {
        // Fallback to first active condition for this campaign
        const result = await supabaseClient
          .from('campaign_conditions')
          .select('brand_id, card_value, condition_number')
          .eq('campaign_id', campaignId)
          .eq('is_active', true)
          .order('condition_number')
          .limit(1)
          .single();
        conditionData = result.data;
        conditionError = result.error;
        console.log('[CALL-CENTER-PROVISION] Querying first active condition for campaign');
      }

      if (conditionError || !conditionData?.brand_id) {
        console.error('[CALL-CENTER-PROVISION] No gift card config in conditions:', conditionError);
        console.error('[CALL-CENTER-PROVISION] Condition data:', conditionData);
        throw new Error('No gift card configured for this campaign condition. Please set up a gift card brand and value in the campaign settings.');
      }

      giftCardConfig = {
        brand_id: conditionData.brand_id,
        denomination: conditionData.card_value || 25,
      };
      
      console.log('[CALL-CENTER-PROVISION] Using config from campaign_conditions:', giftCardConfig);
    }

    console.log('[CALL-CENTER-PROVISION] Gift card config:', giftCardConfig);

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

    console.log('[CALL-CENTER-PROVISION] Calling unified provisioning:', provisionRequest);

    // Use Supabase Functions invoke internally (server-to-server)
    const provisionResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/provision-gift-card-unified`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify(provisionRequest),
      }
    );

    if (!provisionResponse.ok) {
      const errorText = await provisionResponse.text();
      console.error('[CALL-CENTER-PROVISION] Provisioning failed:', errorText);
      throw new Error(`Provisioning failed: ${errorText}`);
    }

    const provisionResult = await provisionResponse.json();

    if (!provisionResult.success) {
      throw new Error(provisionResult.error || 'Provisioning failed');
    }

    console.log('[CALL-CENTER-PROVISION] Provisioning successful');

    // =====================================================
    // STEP 6: Send delivery notification (SMS or Email)
    // =====================================================
    
    const deliveryMethod = deliveryPhone ? 'sms' : 'email';
    const deliveryDestination = deliveryPhone || deliveryEmail;

    try {
      if (deliveryMethod === 'sms' && deliveryPhone) {
        // Send SMS
        const smsResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gift-card-sms`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              to: deliveryPhone,
              recipientName: `${recipient.first_name} ${recipient.last_name}`,
              cardCode: provisionResult.card.cardCode,
              brandName: provisionResult.card.brandName,
              amount: provisionResult.card.denomination,
              campaignId: campaignId,
            }),
          }
        );

        if (!smsResponse.ok) {
          console.error('[CALL-CENTER-PROVISION] SMS delivery failed');
        } else {
          console.log('[CALL-CENTER-PROVISION] SMS sent successfully');
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
    console.error('[CALL-CENTER-PROVISION] Error:', error);

    const result: ProvisionResult = {
      success: false,
      error: error.message || 'Unknown error occurred',
      message: error.message || 'Provisioning failed',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


/**
 * Provision Twilio Number Edge Function
 * 
 * Searches for and purchases a phone number from Twilio.
 * Configures webhooks and stores in tracked_phone_numbers.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface ProvisionNumberRequest {
  areaCode?: string;
  campaignId?: string;
  friendlyName?: string;
  forwardToNumber?: string;
}

interface ProvisionNumberResponse {
  success: boolean;
  phoneNumber?: unknown;
  twilioData?: unknown;
}

async function handleProvisionNumber(
  request: ProvisionNumberRequest,
  _context: unknown,
  rawRequest: Request
): Promise<ProvisionNumberResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('provision-twilio-number', rawRequest);
  
  const { areaCode, campaignId, friendlyName, forwardToNumber } = request;

  console.log('[PROVISION-NUMBER] Provisioning:', { areaCode, campaignId });

  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!twilioAccountSid || !twilioAuthToken) {
    throw new ApiError('Twilio credentials not configured', 'TWILIO_NOT_CONFIGURED', 400);
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  // Search for available phone numbers
  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/US/Local.json?${areaCode ? `AreaCode=${areaCode}` : 'Limit=1'}`;

  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const searchData = await searchResponse.json();

  if (!searchResponse.ok || !searchData.available_phone_numbers?.length) {
    throw new ApiError(
      `No available phone numbers found${areaCode ? ` for area code ${areaCode}` : ''}`,
      'NO_NUMBERS_AVAILABLE',
      404
    );
  }

  const availableNumber = searchData.available_phone_numbers[0];
  console.log('[PROVISION-NUMBER] Found:', availableNumber.phone_number);

  // Purchase the phone number
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const webhookUrl = `${supabaseUrl}/functions/v1/handle-incoming-call`;
  const statusCallbackUrl = `${supabaseUrl}/functions/v1/update-call-status`;

  const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;

  const purchaseResponse = await fetch(purchaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      PhoneNumber: availableNumber.phone_number,
      FriendlyName: friendlyName || `ACE Marketing - ${availableNumber.phone_number}`,
      VoiceUrl: webhookUrl,
      VoiceMethod: 'POST',
      StatusCallback: statusCallbackUrl,
      StatusCallbackMethod: 'POST',
    }),
  });

  const purchaseData = await purchaseResponse.json();

  if (!purchaseResponse.ok) {
    console.error('[PROVISION-NUMBER] Twilio error:', purchaseData);
    throw new ApiError(
      `Failed to purchase number: ${purchaseData.message}`,
      'PURCHASE_FAILED',
      500
    );
  }

  console.log('[PROVISION-NUMBER] Purchased:', purchaseData.sid);

  // Get campaign's client_id if provided
  let clientId = null;
  if (campaignId) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('client_id')
      .eq('id', campaignId)
      .single();
    clientId = campaign?.client_id;
  }

  // Store in database
  const { data: trackedNumber, error: dbError } = await supabase
    .from('tracked_phone_numbers')
    .insert({
      phone_number: purchaseData.phone_number,
      twilio_sid: purchaseData.sid,
      campaign_id: campaignId || null,
      client_id: clientId,
      status: campaignId ? 'assigned' : 'available',
      friendly_name: friendlyName || purchaseData.friendly_name,
      forward_to_number: forwardToNumber || null,
      recording_enabled: true,
      monthly_cost: 1.15,
      purchased_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) {
    console.error('[PROVISION-NUMBER] DB error:', dbError);
    throw new ApiError('Failed to store phone number', 'DATABASE_ERROR', 500);
  }

  await activityLogger.system('phone_provisioned', 'success',
    `Provisioned Twilio number ${purchaseData.phone_number}`,
    {
      clientId,
      campaignId,
      metadata: {
        phone_number: purchaseData.phone_number,
        twilio_sid: purchaseData.sid,
        area_code: areaCode,
      },
    }
  );

  return {
    success: true,
    phoneNumber: trackedNumber,
    twilioData: purchaseData,
  };
}

Deno.serve(withApiGateway(handleProvisionNumber, {
  requireAuth: false, // Service-to-service call
  parseBody: true,
}));

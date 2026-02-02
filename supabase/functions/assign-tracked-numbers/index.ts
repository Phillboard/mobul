/**
 * Assign Tracked Numbers Edge Function
 * 
 * Assigns an available phone number to a campaign, or provisions a new one.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface AssignNumberRequest {
  campaignId: string;
  clientId: string;
  provisionNew?: boolean;
}

interface AssignNumberResponse {
  success: boolean;
  number?: unknown;
  error?: string;
  requiresSetup?: boolean;
  requiresProvisioning?: boolean;
}

async function handleAssignNumber(
  request: AssignNumberRequest,
  _context: unknown,
  rawRequest: Request
): Promise<AssignNumberResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('assign-tracked-numbers', rawRequest);

  const { campaignId, clientId, provisionNew = false } = request;

  console.log('[ASSIGN-NUMBER] Assigning for campaign:', campaignId);

  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPoolSid = Deno.env.get('TWILIO_PHONE_NUMBER_POOL_SID');

  if (!twilioSid || !twilioToken) {
    throw new ApiError(
      'Twilio credentials not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets.',
      'TWILIO_NOT_CONFIGURED',
      400
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const auth = btoa(`${twilioSid}:${twilioToken}`);

  // Provision new number if requested
  if (provisionNew && twilioPoolSid) {
    console.log('[ASSIGN-NUMBER] Provisioning new number from pool');

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          PhoneNumberSid: twilioPoolSid,
          VoiceUrl: `${supabaseUrl}/functions/v1/handle-incoming-call`,
          VoiceMethod: 'POST',
          StatusCallback: `${supabaseUrl}/functions/v1/update-call-status`,
          StatusCallbackMethod: 'POST',
        }).toString(),
      }
    );

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('[ASSIGN-NUMBER] Twilio error:', error);
      throw new ApiError(`Failed to provision number: ${error}`, 'PROVISION_FAILED', 500);
    }

    const twilioData = await twilioResponse.json();

    const { data: newNumber, error: insertError } = await supabase
      .from('tracked_phone_numbers')
      .insert({
        client_id: clientId,
        phone_number: twilioData.phone_number,
        twilio_sid: twilioData.sid,
        campaign_id: campaignId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ASSIGN-NUMBER] DB error:', insertError);
      throw new ApiError('Failed to store number', 'DATABASE_ERROR', 500);
    }

    console.log('[ASSIGN-NUMBER] Provisioned:', newNumber.phone_number);

    await activityLogger.system('phone_provisioned', 'success',
      `Provisioned and assigned number ${newNumber.phone_number}`,
      {
        clientId,
        campaignId,
        metadata: { phone_number: newNumber.phone_number },
      }
    );

    return { success: true, number: newNumber };
  }

  // Assign existing available number
  const { data: availableNumber, error: fetchError } = await supabase
    .from('tracked_phone_numbers')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'available')
    .limit(1)
    .single();

  if (fetchError || !availableNumber) {
    console.log('[ASSIGN-NUMBER] No available numbers');
    return {
      success: false,
      error: 'No available phone numbers. Please provision a new number.',
      requiresProvisioning: true,
    };
  }

  // Update number status
  const { data: assignedNumber, error: updateError } = await supabase
    .from('tracked_phone_numbers')
    .update({
      campaign_id: campaignId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', availableNumber.id)
    .select()
    .single();

  if (updateError) {
    console.error('[ASSIGN-NUMBER] Update error:', updateError);
    throw new ApiError('Failed to assign number', 'DATABASE_ERROR', 500);
  }

  // Update Twilio webhooks
  if (twilioSid && twilioToken && assignedNumber.twilio_sid) {
    console.log('[ASSIGN-NUMBER] Updating webhooks for:', assignedNumber.phone_number);

    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers/${assignedNumber.twilio_sid}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          VoiceUrl: `${supabaseUrl}/functions/v1/handle-incoming-call`,
          VoiceMethod: 'POST',
          StatusCallback: `${supabaseUrl}/functions/v1/update-call-status`,
          StatusCallbackMethod: 'POST',
        }).toString(),
      }
    );
  }

  console.log('[ASSIGN-NUMBER] Assigned:', assignedNumber.phone_number);

  await activityLogger.system('phone_assigned', 'success',
    `Assigned number ${assignedNumber.phone_number} to campaign`,
    {
      clientId,
      campaignId,
      metadata: { phone_number: assignedNumber.phone_number },
    }
  );

  return { success: true, number: assignedNumber };
}

Deno.serve(withApiGateway(handleAssignNumber, {
  requireAuth: false,
  parseBody: true,
}));

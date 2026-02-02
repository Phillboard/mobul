/**
 * Release Twilio Number Edge Function
 * 
 * Releases a phone number from Twilio and updates database status.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface ReleaseNumberRequest {
  phoneNumberId: string;
}

interface ReleaseNumberResponse {
  success: boolean;
}

async function handleReleaseNumber(
  request: ReleaseNumberRequest,
  _context: unknown,
  rawRequest: Request
): Promise<ReleaseNumberResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('release-twilio-number', rawRequest);

  const { phoneNumberId } = request;

  console.log('[RELEASE-NUMBER] Releasing:', phoneNumberId);

  // Get the tracked number
  const { data: trackedNumber, error: fetchError } = await supabase
    .from('tracked_phone_numbers')
    .select('*')
    .eq('id', phoneNumberId)
    .single();

  if (fetchError || !trackedNumber) {
    throw new ApiError('Phone number not found', 'NOT_FOUND', 404);
  }

  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!twilioAccountSid || !twilioAuthToken) {
    throw new ApiError('Twilio credentials not configured', 'TWILIO_NOT_CONFIGURED', 400);
  }

  // Release the number from Twilio
  const releaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${trackedNumber.twilio_sid}.json`;
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const releaseResponse = await fetch(releaseUrl, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!releaseResponse.ok && releaseResponse.status !== 404) {
    const errorData = await releaseResponse.json();
    console.error('[RELEASE-NUMBER] Twilio error:', errorData);
    throw new ApiError(
      `Failed to release number from Twilio: ${errorData.message}`,
      'TWILIO_ERROR',
      500
    );
  }

  console.log('[RELEASE-NUMBER] Released from Twilio');

  // Update database status
  const { error: updateError } = await supabase
    .from('tracked_phone_numbers')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      campaign_id: null,
    })
    .eq('id', phoneNumberId);

  if (updateError) {
    console.error('[RELEASE-NUMBER] DB error:', updateError);
    throw new ApiError('Failed to update database', 'DATABASE_ERROR', 500);
  }

  await activityLogger.system('phone_released', 'success',
    `Released Twilio number ${trackedNumber.phone_number}`,
    {
      clientId: trackedNumber.client_id,
      metadata: {
        phone_number: trackedNumber.phone_number,
        twilio_sid: trackedNumber.twilio_sid,
      },
    }
  );

  return { success: true };
}

Deno.serve(withApiGateway(handleReleaseNumber, {
  requireAuth: false,
  parseBody: true,
}));

/**
 * Fetch Twilio Numbers Edge Function
 * 
 * Fetches available phone numbers from a Twilio account.
 * Rate limited to prevent abuse.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

interface FetchNumbersRequest {
  accountSid: string;
  authToken: string;
}

interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: { sms: boolean; mms: boolean; voice: boolean };
}

interface FetchNumbersResponse {
  success: boolean;
  numbers: TwilioPhoneNumber[];
  totalCount?: number;
  message?: string;
}

async function handleFetchNumbers(
  request: FetchNumbersRequest,
  context: AuthContext
): Promise<FetchNumbersResponse> {
  const { accountSid, authToken } = request;

  // Rate limiting
  const rateLimitResult = await checkRateLimit(context.user.id, 'fetch-twilio-numbers', 10, 60);
  if (!rateLimitResult.allowed) {
    throw new ApiError(
      'Too many requests. Please wait a moment and try again.',
      'RATE_LIMITED',
      429
    );
  }

  if (!accountSid || !authToken) {
    throw new ApiError('Account SID and Auth Token are required', 'MISSING_CREDENTIALS', 400);
  }

  console.log(`[FETCH-NUMBERS] Fetching for account ${accountSid.slice(-4)}`);

  const auth = btoa(`${accountSid}:${authToken}`);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`;

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new ApiError(
        'Authentication failed. Please check your credentials.',
        'AUTH_FAILED',
        400
      );
    }

    throw new ApiError(
      `Twilio API error: ${errorData.message || response.status}`,
      'TWILIO_ERROR',
      400
    );
  }

  const data = await response.json();

  // Filter to SMS-capable numbers
  const numbers: TwilioPhoneNumber[] = (data.incoming_phone_numbers || [])
    .filter((num: { capabilities?: { sms?: boolean } }) => num.capabilities?.sms)
    .map((num: { sid: string; phone_number: string; friendly_name?: string; capabilities?: { sms?: boolean; mms?: boolean; voice?: boolean } }) => ({
      sid: num.sid,
      phoneNumber: num.phone_number,
      friendlyName: num.friendly_name || num.phone_number,
      capabilities: {
        sms: num.capabilities?.sms ?? false,
        mms: num.capabilities?.mms ?? false,
        voice: num.capabilities?.voice ?? false,
      },
    }));

  console.log(`[FETCH-NUMBERS] Found ${numbers.length} SMS-capable numbers`);

  if (numbers.length === 0) {
    return {
      success: true,
      numbers: [],
      message: 'No SMS-capable phone numbers found. Purchase numbers at twilio.com/console/phone-numbers',
    };
  }

  return {
    success: true,
    numbers,
    totalCount: numbers.length,
  };
}

Deno.serve(withApiGateway(handleFetchNumbers, {
  requireAuth: true,
  parseBody: true,
}));

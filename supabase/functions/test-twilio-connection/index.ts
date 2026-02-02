/**
 * Test Twilio Connection Edge Function
 * 
 * Tests Twilio credentials without saving them.
 * Rate limited to prevent abuse.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { testTwilioCredentials, validateTwilioAccountSid } from '../_shared/twilio-auth.ts';

interface TestTwilioRequest {
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
}

interface TestTwilioResponse {
  success: boolean;
  accountName?: string;
  accountStatus?: string;
  accountType?: string;
  phoneCapabilities?: { sms: boolean; mms: boolean; voice: boolean };
  phoneFriendlyName?: string;
  balance?: number;
  error?: string;
  errorCode?: string;
}

async function handleTestTwilio(
  request: TestTwilioRequest,
  context: AuthContext
): Promise<TestTwilioResponse> {
  const { accountSid, authToken, phoneNumber } = request;

  // Rate limiting
  const rateLimitResult = await checkRateLimit(context.user.id, 'test-twilio-connection', 5, 60);
  if (!rateLimitResult.allowed) {
    throw new ApiError(
      'Too many test attempts. Please wait a moment and try again.',
      'RATE_LIMITED',
      429
    );
  }

  console.log(`[TEST-TWILIO] Testing for user ${context.user.id}`);

  // Validate inputs
  if (!accountSid || !validateTwilioAccountSid(accountSid)) {
    throw new ApiError(
      "Invalid Twilio Account SID format. Should start with 'AC' and be 34 characters.",
      'INVALID_SID_FORMAT',
      400
    );
  }

  if (!authToken || authToken.length < 10) {
    throw new ApiError('Auth token is required.', 'INVALID_AUTH_TOKEN', 400);
  }

  // Test credentials
  const testResult = await testTwilioCredentials(accountSid, authToken, phoneNumber);

  if (!testResult.success) {
    throw new ApiError(testResult.error!, testResult.errorCode!, 400);
  }

  // Fetch additional account info
  const auth = btoa(`${accountSid}:${authToken}`);
  const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
  const accountResponse = await fetch(accountUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const accountData = await accountResponse.json();

  // Fetch phone capabilities if provided
  let phoneCapabilities: { sms: boolean; mms: boolean; voice: boolean } | undefined;
  let phoneFriendlyName: string | undefined;

  if (phoneNumber) {
    const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
    const phoneUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;
    const phoneResponse = await fetch(phoneUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const phoneData = await phoneResponse.json();
    
    if (phoneData.incoming_phone_numbers?.length) {
      const phoneInfo = phoneData.incoming_phone_numbers[0];
      phoneCapabilities = phoneInfo.capabilities;
      phoneFriendlyName = phoneInfo.friendly_name;
    }
  }

  // Try to get balance
  let balance: number | undefined;
  try {
    const balanceUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`;
    const balanceResponse = await fetch(balanceUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      balance = parseFloat(balanceData.balance);
    }
  } catch {
    // Balance is optional
  }

  console.log(`[TEST-TWILIO] Success for account ${accountSid.slice(-4)}`);

  return {
    success: true,
    accountName: accountData.friendly_name,
    accountStatus: accountData.status,
    accountType: accountData.type,
    phoneCapabilities,
    phoneFriendlyName,
    balance,
  };
}

Deno.serve(withApiGateway(handleTestTwilio, {
  requireAuth: true,
  parseBody: true,
}));

/**
 * Test Twilio Connection Edge Function
 * 
 * Tests Twilio credentials without saving them.
 * Validates:
 * - Account SID format
 * - Auth token authentication
 * - Phone number exists in account
 * - Phone number has SMS capability
 * - Account status (not suspended)
 * 
 * Rate limited to 5 attempts per minute per user.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TestTwilioRequest {
  accountSid: string;
  authToken: string;
  phoneNumber?: string; // Optional - if provided, validates it exists in account
}

interface TwilioAccountResponse {
  sid: string;
  friendly_name: string;
  status: string;
  type: string;
}

interface TwilioPhoneNumberResponse {
  sid: string;
  phone_number: string;
  friendly_name: string;
  capabilities: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
}

// Rate limiting map (in-memory, per instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many test attempts. Please wait a moment and try again.', 
          errorCode: 'RATE_LIMITED' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: TestTwilioRequest = await req.json();
    const { accountSid, authToken, phoneNumber } = body;

    console.log(`[TEST-TWILIO] Testing connection for user ${user.id}`);

    // Validate Account SID format
    if (!accountSid || !accountSid.startsWith('AC') || accountSid.length !== 34) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid Twilio Account SID format. Should start with 'AC' and be 34 characters.",
          errorCode: 'INVALID_SID_FORMAT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate auth token is provided
    if (!authToken || authToken.length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Auth token is required.',
          errorCode: 'INVALID_AUTH_TOKEN'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test authentication by fetching account info
    const auth = btoa(`${accountSid}:${authToken}`);
    const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;

    let accountResponse: Response;
    try {
      accountResponse = await fetch(accountUrl, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
    } catch (networkError) {
      console.error('[TEST-TWILIO] Network error:', networkError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not connect to Twilio. Please check your network and try again.',
          errorCode: 'NETWORK_ERROR'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!accountResponse.ok) {
      const errorData = await accountResponse.json().catch(() => ({}));
      console.error('[TEST-TWILIO] Twilio auth failed:', errorData);
      
      if (accountResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication failed. Please check your Auth Token.',
            errorCode: 'AUTH_FAILED'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Twilio API error: ${errorData.message || accountResponse.status}`,
          errorCode: 'TWILIO_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountData: TwilioAccountResponse = await accountResponse.json();

    // Check account status
    if (accountData.status === 'suspended') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This Twilio account is suspended. Please contact Twilio support.',
          errorCode: 'ACCOUNT_SUSPENDED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If phone number provided, validate it exists and has SMS capability
    let phoneCapabilities: { sms: boolean; mms: boolean; voice: boolean } | undefined;
    let phoneFriendlyName: string | undefined;

    if (phoneNumber) {
      // Normalize phone number for API lookup
      const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
      
      // Fetch phone numbers from account
      const phoneUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;
      
      const phoneResponse = await fetch(phoneUrl, {
        headers: { 'Authorization': `Basic ${auth}` },
      });

      if (!phoneResponse.ok) {
        console.error('[TEST-TWILIO] Failed to fetch phone numbers');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Could not verify phone number in account.',
            errorCode: 'PHONE_LOOKUP_FAILED'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const phoneData = await phoneResponse.json();
      
      if (!phoneData.incoming_phone_numbers || phoneData.incoming_phone_numbers.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Phone number ${phoneNumber} not found in this Twilio account.`,
            errorCode: 'PHONE_NOT_FOUND'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const phoneInfo: TwilioPhoneNumberResponse = phoneData.incoming_phone_numbers[0];
      phoneCapabilities = phoneInfo.capabilities;
      phoneFriendlyName = phoneInfo.friendly_name;

      // Check SMS capability
      if (!phoneInfo.capabilities.sms) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Phone number ${phoneNumber} cannot send SMS. Please select a different number.`,
            errorCode: 'PHONE_NOT_SMS_CAPABLE'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Optional: Get account balance
    let balance: number | undefined;
    try {
      const balanceUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`;
      const balanceResponse = await fetch(balanceUrl, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        balance = parseFloat(balanceData.balance);
      }
    } catch {
      // Balance fetch is optional, ignore errors
    }

    console.log(`[TEST-TWILIO] Connection test successful for account ${accountSid.slice(-4)}`);

    return new Response(
      JSON.stringify({
        success: true,
        accountName: accountData.friendly_name,
        accountStatus: accountData.status,
        accountType: accountData.type,
        phoneCapabilities,
        phoneFriendlyName,
        balance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TEST-TWILIO] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred.',
        errorCode: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

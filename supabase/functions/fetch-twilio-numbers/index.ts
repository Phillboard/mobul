/**
 * Fetch Twilio Numbers Edge Function
 * 
 * Fetches available phone numbers from a Twilio account.
 * Used when user wants to select from their existing Twilio numbers.
 * Only returns numbers with SMS capability.
 * 
 * Rate limited to 10 requests per minute per user.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface FetchNumbersRequest {
  accountSid: string;
  authToken: string;
}

interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
}

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
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
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many requests. Please wait a moment and try again.'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: FetchNumbersRequest = await req.json();
    const { accountSid, authToken } = body;

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account SID and Auth Token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[FETCH-TWILIO-NUMBERS] Fetching numbers for account ${accountSid.slice(-4)}`);

    // Fetch phone numbers from Twilio
    const auth = btoa(`${accountSid}:${authToken}`);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication failed. Please check your credentials.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Twilio API error: ${errorData.message || response.status}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Filter to only SMS-capable numbers and format response
    const numbers: TwilioPhoneNumber[] = (data.incoming_phone_numbers || [])
      .filter((num: any) => num.capabilities?.sms)
      .map((num: any) => ({
        sid: num.sid,
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name || num.phone_number,
        capabilities: {
          sms: num.capabilities?.sms ?? false,
          mms: num.capabilities?.mms ?? false,
          voice: num.capabilities?.voice ?? false,
        },
      }));

    console.log(`[FETCH-TWILIO-NUMBERS] Found ${numbers.length} SMS-capable numbers`);

    if (numbers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          numbers: [],
          message: 'No SMS-capable phone numbers found in this Twilio account. Purchase numbers at twilio.com/console/phone-numbers',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        numbers,
        totalCount: numbers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FETCH-TWILIO-NUMBERS] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

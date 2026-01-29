/**
 * Configure Twilio Webhooks Edge Function
 * 
 * Sets up SMS and Voice webhook URLs for a Twilio phone number.
 * Reads credentials from database - no need to provide them in request.
 * 
 * This function is useful for:
 * - Configuring webhooks for existing Twilio configurations
 * - Fixing webhook URLs after migration
 * - Setting up webhooks for numbers configured via SQL
 * 
 * Request body:
 * {
 *   level: 'client' | 'agency' | 'admin',
 *   entityId?: string  // Required for client/agency, not needed for admin
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message?: string,
 *   phoneNumber?: string,
 *   webhooks?: { smsUrl, voiceUrl, statusCallback }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { decryptAuthToken } from '../_shared/twilio-encryption.ts';

type TwilioLevel = 'client' | 'agency' | 'admin';

interface ConfigureWebhooksRequest {
  level: TwilioLevel;
  entityId?: string;
}

interface TwilioConfig {
  accountSid: string;
  authTokenEncrypted: string;
  phoneNumber: string;
  entityName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Parse request body
    const body: ConfigureWebhooksRequest = await req.json();
    const { level, entityId } = body;

    console.log(`[CONFIGURE-WEBHOOKS] Request for level: ${level}, entityId: ${entityId || 'N/A'}`);

    // Validate level
    if (!level || !['client', 'agency', 'admin'].includes(level)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid level. Must be client, agency, or admin.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate entityId for client/agency
    if ((level === 'client' || level === 'agency') && !entityId) {
      return new Response(
        JSON.stringify({ success: false, error: 'entityId is required for client and agency levels.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Twilio config from database
    const config = await getTwilioConfig(supabase, level, entityId);
    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: `No Twilio configuration found for ${level}${entityId ? ` (${entityId})` : ''}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CONFIGURE-WEBHOOKS] Found config for ${config.entityName}, phone: ${config.phoneNumber}`);

    // Decrypt auth token
    let authToken: string;
    try {
      authToken = await decryptAuthToken(config.authTokenEncrypted);
    } catch (decryptError) {
      console.error('[CONFIGURE-WEBHOOKS] Failed to decrypt auth token:', decryptError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to decrypt Twilio auth token. Configuration may be corrupted.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure webhooks on Twilio
    const webhookResult = await configureTwilioWebhooks(
      config.accountSid,
      authToken,
      config.phoneNumber
    );

    if (!webhookResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: webhookResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CONFIGURE-WEBHOOKS] Successfully configured webhooks for ${config.phoneNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Webhooks configured successfully for ${config.entityName}`,
        phoneNumber: config.phoneNumber,
        webhooks: webhookResult.webhooks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CONFIGURE-WEBHOOKS] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Get Twilio configuration from database based on level
 */
async function getTwilioConfig(
  supabase: ReturnType<typeof createClient>,
  level: TwilioLevel,
  entityId?: string
): Promise<TwilioConfig | null> {
  
  if (level === 'admin') {
    const { data, error } = await supabase
      .from('sms_provider_settings')
      .select(`
        admin_twilio_account_sid,
        admin_twilio_auth_token_encrypted,
        admin_twilio_phone_number,
        admin_twilio_friendly_name
      `)
      .limit(1)
      .single();

    if (error || !data) {
      console.error('[CONFIGURE-WEBHOOKS] Admin config not found:', error);
      return null;
    }

    if (!data.admin_twilio_account_sid || !data.admin_twilio_auth_token_encrypted || !data.admin_twilio_phone_number) {
      console.error('[CONFIGURE-WEBHOOKS] Admin config incomplete');
      return null;
    }

    return {
      accountSid: data.admin_twilio_account_sid,
      authTokenEncrypted: data.admin_twilio_auth_token_encrypted,
      phoneNumber: data.admin_twilio_phone_number,
      entityName: data.admin_twilio_friendly_name || 'Platform Master',
    };
  }

  if (level === 'client') {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        twilio_account_sid,
        twilio_auth_token_encrypted,
        twilio_phone_number,
        name
      `)
      .eq('id', entityId)
      .single();

    if (error || !data) {
      console.error('[CONFIGURE-WEBHOOKS] Client config not found:', error);
      return null;
    }

    if (!data.twilio_account_sid || !data.twilio_auth_token_encrypted || !data.twilio_phone_number) {
      console.error('[CONFIGURE-WEBHOOKS] Client config incomplete');
      return null;
    }

    return {
      accountSid: data.twilio_account_sid,
      authTokenEncrypted: data.twilio_auth_token_encrypted,
      phoneNumber: data.twilio_phone_number,
      entityName: data.name,
    };
  }

  if (level === 'agency') {
    const { data, error } = await supabase
      .from('agencies')
      .select(`
        twilio_account_sid,
        twilio_auth_token_encrypted,
        twilio_phone_number,
        name
      `)
      .eq('id', entityId)
      .single();

    if (error || !data) {
      console.error('[CONFIGURE-WEBHOOKS] Agency config not found:', error);
      return null;
    }

    if (!data.twilio_account_sid || !data.twilio_auth_token_encrypted || !data.twilio_phone_number) {
      console.error('[CONFIGURE-WEBHOOKS] Agency config incomplete');
      return null;
    }

    return {
      accountSid: data.twilio_account_sid,
      authTokenEncrypted: data.twilio_auth_token_encrypted,
      phoneNumber: data.twilio_phone_number,
      entityName: data.name,
    };
  }

  return null;
}

/**
 * Configure Twilio phone number webhooks
 */
async function configureTwilioWebhooks(
  accountSid: string,
  authToken: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string; webhooks?: { smsUrl: string; voiceUrl: string; statusCallback: string } }> {
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    return { success: false, error: 'SUPABASE_URL not configured' };
  }

  console.log(`[CONFIGURE-WEBHOOKS] Configuring webhooks for ${phoneNumber}`);
  console.log(`[CONFIGURE-WEBHOOKS] Using Supabase URL: ${supabaseUrl}`);

  try {
    // First, get the phone number's SID
    const auth = btoa(`${accountSid}:${authToken}`);
    const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
    const lookupUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;
    
    console.log(`[CONFIGURE-WEBHOOKS] Looking up phone SID...`);
    
    const lookupResponse = await fetch(lookupUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    
    if (!lookupResponse.ok) {
      const errorText = await lookupResponse.text();
      console.error('[CONFIGURE-WEBHOOKS] Phone lookup failed:', lookupResponse.status, errorText);
      return { success: false, error: `Failed to look up phone number: ${lookupResponse.status}` };
    }
    
    const lookupData = await lookupResponse.json();
    if (!lookupData.incoming_phone_numbers?.length) {
      console.error('[CONFIGURE-WEBHOOKS] Phone number not found in Twilio account');
      return { success: false, error: `Phone number ${phoneNumber} not found in this Twilio account` };
    }
    
    const phoneSid = lookupData.incoming_phone_numbers[0].sid;
    console.log(`[CONFIGURE-WEBHOOKS] Found phone SID: ${phoneSid}`);
    
    // Build webhook URLs
    const webhooks = {
      smsUrl: `${supabaseUrl}/functions/v1/handle-sms-response`,
      voiceUrl: `${supabaseUrl}/functions/v1/handle-incoming-call`,
      statusCallback: `${supabaseUrl}/functions/v1/update-call-status`,
    };
    
    // Update the phone number's webhook URLs
    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneSid}.json`;
    
    const webhookParams = new URLSearchParams({
      SmsUrl: webhooks.smsUrl,
      SmsMethod: 'POST',
      VoiceUrl: webhooks.voiceUrl,
      VoiceMethod: 'POST',
      StatusCallback: webhooks.statusCallback,
      StatusCallbackMethod: 'POST',
    });

    console.log(`[CONFIGURE-WEBHOOKS] Setting webhooks:
  - SmsUrl: ${webhooks.smsUrl}
  - VoiceUrl: ${webhooks.voiceUrl}
  - StatusCallback: ${webhooks.statusCallback}`);
    
    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: webhookParams.toString(),
    });
    
    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('[CONFIGURE-WEBHOOKS] Webhook update failed:', errorData);
      return { success: false, error: `Failed to configure webhooks: ${errorData.message || 'Unknown error'}` };
    }
    
    const updatedPhone = await updateResponse.json();
    console.log(`[CONFIGURE-WEBHOOKS] Webhooks configured successfully for ${updatedPhone.phone_number}`);
    
    return { success: true, webhooks };
    
  } catch (error) {
    console.error('[CONFIGURE-WEBHOOKS] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

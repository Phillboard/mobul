/**
 * Configure Twilio Webhooks Edge Function
 * 
 * Sets up SMS and Voice webhook URLs for a Twilio phone number.
 * Reads credentials from database.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { decryptAuthToken } from '../_shared/twilio-encryption.ts';
import { 
  checkTwilioAuthorization, 
  validateTwilioLevelRequest,
  type TwilioLevel 
} from '../_shared/twilio-auth.ts';

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

interface ConfigureWebhooksResponse {
  success: boolean;
  message?: string;
  phoneNumber?: string;
  webhooks?: { smsUrl: string; voiceUrl: string; statusCallback: string };
  error?: string;
}

async function handleConfigureWebhooks(
  request: ConfigureWebhooksRequest,
  context: AuthContext
): Promise<ConfigureWebhooksResponse> {
  const supabase = createServiceClient();
  const { level, entityId } = request;

  console.log(`[CONFIGURE-WEBHOOKS] Level: ${level}, entityId: ${entityId || 'N/A'}`);

  // Validate request
  const validation = validateTwilioLevelRequest(level, entityId);
  if (!validation.valid) {
    throw new ApiError(validation.error!, validation.errorCode!, 400);
  }

  // Check authorization
  const authResult = await checkTwilioAuthorization(supabase, context.user.id, level, entityId);
  if (!authResult.authorized) {
    throw new ApiError(authResult.reason || 'Unauthorized', 'UNAUTHORIZED', 403);
  }

  // Get Twilio config from database
  const config = await getTwilioConfig(supabase, level, entityId);
  if (!config) {
    throw new ApiError(
      `No Twilio configuration found for ${level}${entityId ? ` (${entityId})` : ''}`,
      'NOT_CONFIGURED',
      404
    );
  }

  console.log(`[CONFIGURE-WEBHOOKS] Found config for ${config.entityName}`);

  // Decrypt auth token
  let authToken: string;
  try {
    authToken = await decryptAuthToken(config.authTokenEncrypted);
  } catch {
    throw new ApiError(
      'Failed to decrypt Twilio auth token. Configuration may be corrupted.',
      'DECRYPT_FAILED',
      500
    );
  }

  // Configure webhooks
  const webhookResult = await configureTwilioWebhooks(
    config.accountSid,
    authToken,
    config.phoneNumber
  );

  if (!webhookResult.success) {
    throw new ApiError(webhookResult.error!, 'WEBHOOK_CONFIG_FAILED', 500);
  }

  console.log(`[CONFIGURE-WEBHOOKS] Success for ${config.phoneNumber}`);

  return {
    success: true,
    message: `Webhooks configured successfully for ${config.entityName}`,
    phoneNumber: config.phoneNumber,
    webhooks: webhookResult.webhooks,
  };
}

async function getTwilioConfig(
  supabase: ReturnType<typeof createServiceClient>,
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

    if (error || !data?.admin_twilio_account_sid) return null;

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
      .select('twilio_account_sid, twilio_auth_token_encrypted, twilio_phone_number, name')
      .eq('id', entityId)
      .single();

    if (error || !data?.twilio_account_sid) return null;

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
      .select('twilio_account_sid, twilio_auth_token_encrypted, twilio_phone_number, name')
      .eq('id', entityId)
      .single();

    if (error || !data?.twilio_account_sid) return null;

    return {
      accountSid: data.twilio_account_sid,
      authTokenEncrypted: data.twilio_auth_token_encrypted,
      phoneNumber: data.twilio_phone_number,
      entityName: data.name,
    };
  }

  return null;
}

async function configureTwilioWebhooks(
  accountSid: string,
  authToken: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string; webhooks?: { smsUrl: string; voiceUrl: string; statusCallback: string } }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    return { success: false, error: 'SUPABASE_URL not configured' };
  }

  try {
    const auth = btoa(`${accountSid}:${authToken}`);
    const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
    const lookupUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;

    const lookupResponse = await fetch(lookupUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!lookupResponse.ok) {
      return { success: false, error: `Failed to look up phone number: ${lookupResponse.status}` };
    }

    const lookupData = await lookupResponse.json();
    if (!lookupData.incoming_phone_numbers?.length) {
      return { success: false, error: `Phone number ${phoneNumber} not found in Twilio account` };
    }

    const phoneSid = lookupData.incoming_phone_numbers[0].sid;

    const webhooks = {
      smsUrl: `${supabaseUrl}/functions/v1/handle-sms-response`,
      voiceUrl: `${supabaseUrl}/functions/v1/handle-incoming-call`,
      statusCallback: `${supabaseUrl}/functions/v1/update-call-status`,
    };

    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneSid}.json`;

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        SmsUrl: webhooks.smsUrl,
        SmsMethod: 'POST',
        VoiceUrl: webhooks.voiceUrl,
        VoiceMethod: 'POST',
        StatusCallback: webhooks.statusCallback,
        StatusCallbackMethod: 'POST',
      }).toString(),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return { success: false, error: `Failed to configure webhooks: ${errorData.message || 'Unknown error'}` };
    }

    return { success: true, webhooks };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(withApiGateway(handleConfigureWebhooks, {
  requireAuth: true,
  parseBody: true,
}));

/**
 * Update Twilio Configuration Edge Function
 * 
 * Saves Twilio configuration for client, agency, or admin level.
 * Validates credentials before saving.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { encryptAuthToken } from '../_shared/twilio-encryption.ts';
import { 
  checkTwilioAuthorization, 
  validateTwilioLevelRequest,
  validateE164PhoneNumber,
  testTwilioCredentials,
  type TwilioLevel 
} from '../_shared/twilio-auth.ts';

interface UpdateTwilioRequest {
  level: TwilioLevel;
  entityId?: string;
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  enabled: boolean;
  friendlyName?: string;
  monthlyLimit?: number;
  skipValidation?: boolean;
  expectedVersion?: number;
}

interface UpdateTwilioResponse {
  success: boolean;
  message?: string;
  validated?: boolean;
  entityId?: string | null;
}

async function handleUpdateTwilio(
  request: UpdateTwilioRequest,
  context: AuthContext
): Promise<UpdateTwilioResponse> {
  const supabase = createServiceClient();
  const { 
    level, entityId, accountSid, authToken, phoneNumber, 
    enabled, friendlyName, monthlyLimit, skipValidation, expectedVersion 
  } = request;

  console.log(`[UPDATE-TWILIO] User ${context.user.id} updating ${level}${entityId ? ` ${entityId}` : ''}`);

  // Validate request
  const levelValidation = validateTwilioLevelRequest(level, entityId);
  if (!levelValidation.valid) {
    throw new ApiError(levelValidation.error!, levelValidation.errorCode!, 400);
  }

  if (!accountSid || !authToken || !phoneNumber) {
    throw new ApiError('Account SID, Auth Token, and Phone Number are required', 'MISSING_FIELDS', 400);
  }

  if (!validateE164PhoneNumber(phoneNumber)) {
    throw new ApiError('Phone number must be in E.164 format (e.g., +12025551234)', 'INVALID_PHONE_FORMAT', 400);
  }

  // Check authorization
  const authResult = await checkTwilioAuthorization(supabase, context.user.id, level, entityId);
  if (!authResult.authorized) {
    throw new ApiError(authResult.reason || 'Unauthorized', 'UNAUTHORIZED', 403);
  }

  // Check optimistic locking
  if (expectedVersion !== undefined) {
    const versionValid = await checkVersion(supabase, level, entityId, expectedVersion);
    if (!versionValid) {
      throw new ApiError(
        'Configuration was modified by another user. Please refresh and try again.',
        'VERSION_CONFLICT',
        409
      );
    }
  }

  // Validate credentials (unless admin bypasses)
  if (!skipValidation || !authResult.isAdmin) {
    const testResult = await testTwilioCredentials(accountSid, authToken, phoneNumber);
    if (!testResult.success) {
      throw new ApiError(testResult.error!, testResult.errorCode!, 400);
    }
  }

  // Configure webhooks (non-blocking)
  await configureTwilioWebhooks(accountSid, authToken, phoneNumber);

  // Encrypt and save
  const encryptedToken = await encryptAuthToken(authToken);
  const now = new Date().toISOString();
  const revalidateAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let updateResult;

  if (level === 'client') {
    const { data: current } = await supabase
      .from('clients')
      .select('twilio_config_version')
      .eq('id', entityId)
      .single();

    updateResult = await supabase
      .from('clients')
      .update({
        twilio_account_sid: accountSid,
        twilio_auth_token_encrypted: encryptedToken,
        twilio_phone_number: phoneNumber,
        twilio_enabled: enabled,
        twilio_validated_at: now,
        twilio_configured_by: context.user.id,
        twilio_configured_at: now,
        twilio_friendly_name: friendlyName || null,
        twilio_monthly_limit: monthlyLimit || null,
        twilio_revalidate_after: revalidateAfter,
        twilio_failure_count: 0,
        twilio_circuit_open_until: null,
        twilio_last_error: null,
        twilio_last_error_at: null,
        twilio_validation_error: null,
        twilio_config_version: (current?.twilio_config_version || 0) + 1,
      })
      .eq('id', entityId)
      .select('id')
      .single();
  } else if (level === 'agency') {
    const { data: current } = await supabase
      .from('agencies')
      .select('twilio_config_version')
      .eq('id', entityId)
      .single();

    updateResult = await supabase
      .from('agencies')
      .update({
        twilio_account_sid: accountSid,
        twilio_auth_token_encrypted: encryptedToken,
        twilio_phone_number: phoneNumber,
        twilio_enabled: enabled,
        twilio_validated_at: now,
        twilio_configured_by: context.user.id,
        twilio_configured_at: now,
        twilio_friendly_name: friendlyName || null,
        twilio_monthly_limit: monthlyLimit || null,
        twilio_revalidate_after: revalidateAfter,
        twilio_failure_count: 0,
        twilio_circuit_open_until: null,
        twilio_last_error: null,
        twilio_last_error_at: null,
        twilio_validation_error: null,
        twilio_config_version: (current?.twilio_config_version || 0) + 1,
      })
      .eq('id', entityId)
      .select('id')
      .single();
  } else {
    updateResult = await supabase
      .from('sms_provider_settings')
      .update({
        admin_twilio_account_sid: accountSid,
        admin_twilio_auth_token_encrypted: encryptedToken,
        admin_twilio_phone_number: phoneNumber,
        admin_twilio_enabled: enabled,
        admin_twilio_validated_at: now,
        admin_twilio_friendly_name: friendlyName || 'Platform Master',
        admin_twilio_last_error: null,
        admin_twilio_last_error_at: null,
      })
      .select('id')
      .single();
  }

  if (updateResult.error) {
    throw new ApiError('Failed to save configuration', 'UPDATE_FAILED', 500);
  }

  // Audit log
  await supabase
    .from('twilio_config_audit_log')
    .insert({
      entity_type: level,
      entity_id: entityId || null,
      action: 'updated',
      changed_by: context.user.id,
      new_values: {
        account_sid_last4: accountSid.slice(-4),
        phone_number: phoneNumber,
        enabled,
        friendly_name: friendlyName,
        monthly_limit: monthlyLimit,
      },
    });

  console.log(`[UPDATE-TWILIO] Success for ${level}`);

  return {
    success: true,
    message: `Twilio configuration saved successfully for ${level}`,
    validated: true,
    entityId: entityId || null,
  };
}

async function checkVersion(
  supabase: ReturnType<typeof createServiceClient>,
  level: TwilioLevel,
  entityId: string | undefined,
  expectedVersion: number
): Promise<boolean> {
  if (level === 'client' && entityId) {
    const { data } = await supabase.from('clients').select('twilio_config_version').eq('id', entityId).single();
    return (data?.twilio_config_version || 0) === expectedVersion;
  }
  if (level === 'agency' && entityId) {
    const { data } = await supabase.from('agencies').select('twilio_config_version').eq('id', entityId).single();
    return (data?.twilio_config_version || 0) === expectedVersion;
  }
  return true;
}

async function configureTwilioWebhooks(accountSid: string, authToken: string, phoneNumber: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) return;

  try {
    const auth = btoa(`${accountSid}:${authToken}`);
    const normalizedPhone = phoneNumber.replace(/[^+\d]/g, '');
    const lookupUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(normalizedPhone)}`;

    const lookupResponse = await fetch(lookupUrl, { headers: { Authorization: `Basic ${auth}` } });
    if (!lookupResponse.ok) return;

    const lookupData = await lookupResponse.json();
    if (!lookupData.incoming_phone_numbers?.length) return;

    const phoneSid = lookupData.incoming_phone_numbers[0].sid;
    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneSid}.json`;

    await fetch(updateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        SmsUrl: `${supabaseUrl}/functions/v1/handle-sms-response`,
        SmsMethod: 'POST',
        VoiceUrl: `${supabaseUrl}/functions/v1/handle-incoming-call`,
        VoiceMethod: 'POST',
        StatusCallback: `${supabaseUrl}/functions/v1/update-call-status`,
        StatusCallbackMethod: 'POST',
      }).toString(),
    });
  } catch {
    // Non-fatal - webhooks can be configured later
  }
}

Deno.serve(withApiGateway(handleUpdateTwilio, {
  requireAuth: true,
  parseBody: true,
}));

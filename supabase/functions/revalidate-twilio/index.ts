/**
 * Revalidate Twilio Configuration Edge Function
 * 
 * Re-tests existing Twilio credentials and updates validation status.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { decryptAuthToken } from '../_shared/twilio-encryption.ts';
import { 
  checkTwilioAuthorization, 
  validateTwilioLevelRequest,
  testTwilioCredentials,
  type TwilioLevel 
} from '../_shared/twilio-auth.ts';

interface RevalidateRequest {
  level: TwilioLevel;
  entityId?: string;
}

interface RevalidateResponse {
  success: boolean;
  message?: string;
}

async function handleRevalidate(
  request: RevalidateRequest,
  context: AuthContext
): Promise<RevalidateResponse> {
  const supabase = createServiceClient();
  const { level, entityId } = request;

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

  const now = new Date();
  const revalidateAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const retryAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get existing credentials
  let accountSid: string | null = null;
  let authTokenEncrypted: string | null = null;
  let phoneNumber: string | null = null;
  let failureCount = 0;

  if (level === 'client') {
    const { data } = await supabase
      .from('clients')
      .select('twilio_account_sid, twilio_auth_token_encrypted, twilio_phone_number, twilio_failure_count')
      .eq('id', entityId)
      .single();

    accountSid = data?.twilio_account_sid || null;
    authTokenEncrypted = data?.twilio_auth_token_encrypted || null;
    phoneNumber = data?.twilio_phone_number || null;
    failureCount = data?.twilio_failure_count || 0;
  } else if (level === 'agency') {
    const { data } = await supabase
      .from('agencies')
      .select('twilio_account_sid, twilio_auth_token_encrypted, twilio_phone_number, twilio_failure_count')
      .eq('id', entityId)
      .single();

    accountSid = data?.twilio_account_sid || null;
    authTokenEncrypted = data?.twilio_auth_token_encrypted || null;
    phoneNumber = data?.twilio_phone_number || null;
    failureCount = data?.twilio_failure_count || 0;
  } else {
    const { data } = await supabase
      .from('sms_provider_settings')
      .select('admin_twilio_account_sid, admin_twilio_auth_token_encrypted, admin_twilio_phone_number')
      .single();

    accountSid = data?.admin_twilio_account_sid || null;
    authTokenEncrypted = data?.admin_twilio_auth_token_encrypted || null;
    phoneNumber = data?.admin_twilio_phone_number || null;
  }

  if (!accountSid || !authTokenEncrypted || !phoneNumber) {
    throw new ApiError('Twilio credentials not configured', 'NOT_CONFIGURED', 400);
  }

  // Decrypt and test
  const authToken = await decryptAuthToken(authTokenEncrypted);
  const testResult = await testTwilioCredentials(accountSid, authToken, phoneNumber);

  if (!testResult.success) {
    // Update failure status
    if (level === 'client') {
      await supabase
        .from('clients')
        .update({
          twilio_last_error: testResult.error || 'Validation failed',
          twilio_last_error_at: now.toISOString(),
          twilio_validation_error: testResult.error || 'Validation failed',
          twilio_failure_count: failureCount + 1,
          twilio_revalidate_after: retryAfter,
        })
        .eq('id', entityId);
    } else if (level === 'agency') {
      await supabase
        .from('agencies')
        .update({
          twilio_last_error: testResult.error || 'Validation failed',
          twilio_last_error_at: now.toISOString(),
          twilio_validation_error: testResult.error || 'Validation failed',
          twilio_failure_count: failureCount + 1,
          twilio_revalidate_after: retryAfter,
        })
        .eq('id', entityId);
    } else {
      await supabase
        .from('sms_provider_settings')
        .update({
          admin_twilio_last_error: testResult.error || 'Validation failed',
          admin_twilio_last_error_at: now.toISOString(),
        });
    }

    throw new ApiError(testResult.error || 'Validation failed', testResult.errorCode!, 400);
  }

  // Update success status
  if (level === 'client') {
    await supabase
      .from('clients')
      .update({
        twilio_validated_at: now.toISOString(),
        twilio_revalidate_after: revalidateAfter,
        twilio_last_error: null,
        twilio_last_error_at: null,
        twilio_validation_error: null,
        twilio_failure_count: 0,
        twilio_circuit_open_until: null,
      })
      .eq('id', entityId);
  } else if (level === 'agency') {
    await supabase
      .from('agencies')
      .update({
        twilio_validated_at: now.toISOString(),
        twilio_revalidate_after: revalidateAfter,
        twilio_last_error: null,
        twilio_last_error_at: null,
        twilio_validation_error: null,
        twilio_failure_count: 0,
        twilio_circuit_open_until: null,
      })
      .eq('id', entityId);
  } else {
    await supabase
      .from('sms_provider_settings')
      .update({
        admin_twilio_validated_at: now.toISOString(),
        admin_twilio_last_error: null,
        admin_twilio_last_error_at: null,
      });
  }

  // Audit log
  await supabase
    .from('twilio_config_audit_log')
    .insert({
      entity_type: level,
      entity_id: entityId || null,
      action: 'revalidated',
      changed_by: context.user.id,
      new_values: { validated: true },
    });

  return { success: true, message: 'Twilio credentials validated' };
}

Deno.serve(withApiGateway(handleRevalidate, {
  requireAuth: true,
  parseBody: true,
}));

/**
 * Remove Twilio Configuration Edge Function
 * 
 * Removes Twilio credentials entirely for a client/agency/admin.
 * Requires explicit confirmation.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { 
  checkTwilioAuthorization, 
  validateTwilioLevelRequest,
  type TwilioLevel 
} from '../_shared/twilio-auth.ts';

interface RemoveTwilioRequest {
  level: TwilioLevel;
  entityId?: string;
  confirmRemoval?: boolean;
}

interface RemoveTwilioResponse {
  success: boolean;
  message?: string;
}

async function handleRemoveTwilio(
  request: RemoveTwilioRequest,
  context: AuthContext
): Promise<RemoveTwilioResponse> {
  const supabase = createServiceClient();
  const { level, entityId, confirmRemoval } = request;

  if (!confirmRemoval) {
    throw new ApiError('Removal confirmation required', 'CONFIRM_REQUIRED', 400);
  }

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
        twilio_account_sid: null,
        twilio_auth_token_encrypted: null,
        twilio_phone_number: null,
        twilio_enabled: false,
        twilio_validated_at: null,
        twilio_friendly_name: null,
        twilio_monthly_limit: null,
        twilio_revalidate_after: null,
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
        twilio_account_sid: null,
        twilio_auth_token_encrypted: null,
        twilio_phone_number: null,
        twilio_enabled: false,
        twilio_validated_at: null,
        twilio_friendly_name: null,
        twilio_monthly_limit: null,
        twilio_revalidate_after: null,
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
        admin_twilio_account_sid: null,
        admin_twilio_auth_token_encrypted: null,
        admin_twilio_phone_number: null,
        admin_twilio_enabled: false,
        admin_twilio_validated_at: null,
        admin_twilio_friendly_name: null,
        admin_twilio_last_error: null,
        admin_twilio_last_error_at: null,
      })
      .select('id')
      .single();
  }

  if (updateResult?.error) {
    throw new ApiError('Failed to remove Twilio config', 'UPDATE_FAILED', 500);
  }

  // Audit log
  await supabase
    .from('twilio_config_audit_log')
    .insert({
      entity_type: level,
      entity_id: entityId || null,
      action: 'removed',
      changed_by: context.user.id,
      new_values: { removed: true },
    });

  return { success: true, message: 'Twilio configuration removed' };
}

Deno.serve(withApiGateway(handleRemoveTwilio, {
  requireAuth: true,
  parseBody: true,
}));

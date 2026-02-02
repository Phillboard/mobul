/**
 * Disable Twilio Configuration Edge Function
 * 
 * Disables Twilio without removing credentials.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { 
  checkTwilioAuthorization, 
  validateTwilioLevelRequest,
  type TwilioLevel 
} from '../_shared/twilio-auth.ts';

interface DisableTwilioRequest {
  level: TwilioLevel;
  entityId?: string;
}

interface DisableTwilioResponse {
  success: boolean;
  message?: string;
}

async function handleDisableTwilio(
  request: DisableTwilioRequest,
  context: AuthContext
): Promise<DisableTwilioResponse> {
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
        twilio_enabled: false,
        twilio_last_error: null,
        twilio_last_error_at: null,
        twilio_circuit_open_until: null,
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
        twilio_enabled: false,
        twilio_last_error: null,
        twilio_last_error_at: null,
        twilio_circuit_open_until: null,
        twilio_config_version: (current?.twilio_config_version || 0) + 1,
      })
      .eq('id', entityId)
      .select('id')
      .single();
  } else {
    updateResult = await supabase
      .from('sms_provider_settings')
      .update({
        admin_twilio_enabled: false,
        admin_twilio_last_error: null,
        admin_twilio_last_error_at: null,
      })
      .select('id')
      .single();
  }

  if (updateResult?.error) {
    throw new ApiError('Failed to disable Twilio', 'UPDATE_FAILED', 500);
  }

  // Audit log
  await supabase
    .from('twilio_config_audit_log')
    .insert({
      entity_type: level,
      entity_id: entityId || null,
      action: 'disabled',
      changed_by: context.user.id,
      new_values: { enabled: false },
    });

  return { success: true, message: 'Twilio configuration disabled' };
}

Deno.serve(withApiGateway(handleDisableTwilio, {
  requireAuth: true,
  parseBody: true,
}));

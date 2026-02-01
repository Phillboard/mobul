/**
 * Disable Twilio Configuration Edge Function
 *
 * Disables Twilio without removing credentials.
 * Authorization:
 * - Admin: Can modify any level
 * - Agency Owner: Can modify own agency and their clients
 * - Client Owner: Can only modify own client
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

type TwilioLevel = 'client' | 'agency' | 'admin';

interface DisableTwilioRequest {
  level: TwilioLevel;
  entityId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
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

    const body: DisableTwilioRequest = await req.json();
    const { level, entityId } = body;

    if (!level || !['client', 'agency', 'admin'].includes(level)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid level', errorCode: 'INVALID_LEVEL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((level === 'client' || level === 'agency') && !entityId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Entity ID required', errorCode: 'MISSING_ENTITY_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authResult = await checkAuthorization(supabase, user.id, level, entityId);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.reason, errorCode: 'UNAUTHORIZED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to disable Twilio', errorCode: 'UPDATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('twilio_config_audit_log')
      .insert({
        entity_type: level,
        entity_id: entityId || null,
        action: 'disabled',
        changed_by: user.id,
        new_values: { enabled: false },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Twilio configuration disabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkAuthorization(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  level: TwilioLevel,
  entityId?: string
): Promise<{ authorized: boolean; isAdmin: boolean; reason?: string }> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const isAdmin = roles?.some(r => r.role === 'admin') ?? false;

  if (isAdmin) {
    return { authorized: true, isAdmin: true };
  }

  if (level === 'admin') {
    return {
      authorized: false,
      isAdmin: false,
      reason: 'Only platform admins can modify admin-level Twilio configuration',
    };
  }

  if (level === 'agency') {
    const { data: agencyRole } = await supabase
      .from('user_agencies')
      .select('role')
      .eq('user_id', userId)
      .eq('agency_id', entityId)
      .single();

    if (agencyRole?.role === 'owner') {
      return { authorized: true, isAdmin: false };
    }

    return {
      authorized: false,
      isAdmin: false,
      reason: 'Only agency owners can modify agency Twilio configuration',
    };
  }

  if (level === 'client') {
    const { data: client } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', entityId)
      .single();

    if (client?.agency_id) {
      const { data: agencyRole } = await supabase
        .from('user_agencies')
        .select('role')
        .eq('user_id', userId)
        .eq('agency_id', client.agency_id)
        .single();

      if (agencyRole?.role === 'owner') {
        return { authorized: true, isAdmin: false };
      }
    }

    const { data: clientUser } = await supabase
      .from('client_users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('client_id', entityId)
      .single();

    const isCompanyOwner = roles?.some(r => r.role === 'company_owner') ?? false;

    if (clientUser && isCompanyOwner) {
      return { authorized: true, isAdmin: false };
    }

    return {
      authorized: false,
      isAdmin: false,
      reason: 'Not authorized to modify this client\'s Twilio configuration',
    };
  }

  return { authorized: false, isAdmin: false, reason: 'Invalid level' };
}

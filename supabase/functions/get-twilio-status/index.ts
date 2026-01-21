/**
 * Get Twilio Status Edge Function
 * 
 * Returns the full Twilio configuration status for a client or agency.
 * Includes:
 * - Own configuration details
 * - Active configuration (which level is being used)
 * - Full fallback chain status
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

type TwilioLevel = 'client' | 'agency' | 'admin' | 'env';

interface GetStatusRequest {
  level: 'client' | 'agency';
  entityId: string;
}

interface OwnConfig {
  configured: boolean;
  enabled: boolean;
  validated: boolean;
  validatedAt: string | null;
  phoneNumber: string | null;
  accountSidLast4: string | null;
  friendlyName: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  needsRevalidation: boolean;
  circuitOpen: boolean;
  circuitOpensAt: string | null;
  monthlyLimit: number | null;
  currentMonthUsage: number;
  configVersion: number;
}

interface ActiveConfig {
  level: TwilioLevel;
  entityId: string | null;
  entityName: string;
  phoneNumber: string;
  reason: string;
}

interface FallbackChainItem {
  level: TwilioLevel;
  name: string;
  available: boolean;
  reason: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
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

    // Parse request body
    const body: GetStatusRequest = await req.json();
    const { level, entityId } = body;

    if (!level || !['client', 'agency'].includes(level) || !entityId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Level and entityId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check authorization
    const isAuthorized = await checkViewAuthorization(supabase, user.id, level, entityId);
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authorized to view this configuration' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const fallbackChain: FallbackChainItem[] = [];
    let activeConfig: ActiveConfig | null = null;

    if (level === 'client') {
      // Get client data
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          id, name, agency_id,
          twilio_account_sid,
          twilio_phone_number,
          twilio_enabled,
          twilio_validated_at,
          twilio_friendly_name,
          twilio_last_error,
          twilio_last_error_at,
          twilio_failure_count,
          twilio_circuit_open_until,
          twilio_monthly_limit,
          twilio_current_month_usage,
          twilio_config_version,
          twilio_revalidate_after
        `)
        .eq('id', entityId)
        .single();

      if (clientError || !client) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientCircuitOpen = client.twilio_circuit_open_until && new Date(client.twilio_circuit_open_until) > now;
      const clientNeedsRevalidation = client.twilio_revalidate_after && new Date(client.twilio_revalidate_after) < now;
      const clientValidated = client.twilio_validated_at != null;
      const clientEnabled = client.twilio_enabled ?? false;
      const clientConfigured = client.twilio_account_sid != null;
      const clientAvailable = clientConfigured && clientEnabled && clientValidated && !clientCircuitOpen;

      // Build own config response
      const ownConfig: OwnConfig = {
        configured: clientConfigured,
        enabled: clientEnabled,
        validated: clientValidated,
        validatedAt: client.twilio_validated_at,
        phoneNumber: client.twilio_phone_number,
        accountSidLast4: client.twilio_account_sid ? client.twilio_account_sid.slice(-4) : null,
        friendlyName: client.twilio_friendly_name,
        lastError: client.twilio_last_error,
        lastErrorAt: client.twilio_last_error_at,
        needsRevalidation: clientNeedsRevalidation ?? false,
        circuitOpen: clientCircuitOpen ?? false,
        circuitOpensAt: client.twilio_circuit_open_until,
        monthlyLimit: client.twilio_monthly_limit,
        currentMonthUsage: client.twilio_current_month_usage ?? 0,
        configVersion: client.twilio_config_version ?? 0,
      };

      // Add client to fallback chain
      fallbackChain.push({
        level: 'client',
        name: client.twilio_friendly_name || client.name,
        available: clientAvailable,
        reason: clientAvailable 
          ? 'Own config active' 
          : !clientConfigured 
            ? 'Not configured'
            : !clientEnabled 
              ? 'Disabled'
              : !clientValidated 
                ? 'Not validated'
                : clientCircuitOpen 
                  ? 'Circuit breaker open'
                  : 'Unknown',
      });

      if (clientAvailable) {
        activeConfig = {
          level: 'client',
          entityId: client.id,
          entityName: client.twilio_friendly_name || client.name,
          phoneNumber: client.twilio_phone_number,
          reason: 'Own config',
        };
      }

      // Check agency fallback if client not available
      if (!activeConfig && client.agency_id) {
        const { data: agency } = await supabase
          .from('agencies')
          .select(`
            id, name,
            twilio_account_sid,
            twilio_phone_number,
            twilio_enabled,
            twilio_validated_at,
            twilio_friendly_name,
            twilio_circuit_open_until
          `)
          .eq('id', client.agency_id)
          .single();

        if (agency) {
          const agencyCircuitOpen = agency.twilio_circuit_open_until && new Date(agency.twilio_circuit_open_until) > now;
          const agencyValidated = agency.twilio_validated_at != null;
          const agencyEnabled = agency.twilio_enabled ?? false;
          const agencyConfigured = agency.twilio_account_sid != null;
          const agencyAvailable = agencyConfigured && agencyEnabled && agencyValidated && !agencyCircuitOpen;

          fallbackChain.push({
            level: 'agency',
            name: agency.twilio_friendly_name || agency.name,
            available: agencyAvailable,
            reason: agencyAvailable 
              ? 'Available as fallback' 
              : !agencyConfigured 
                ? 'Not configured'
                : !agencyEnabled 
                  ? 'Disabled'
                  : !agencyValidated 
                    ? 'Not validated'
                    : agencyCircuitOpen 
                      ? 'Circuit breaker open'
                      : 'Unknown',
          });

          if (agencyAvailable) {
            activeConfig = {
              level: 'agency',
              entityId: agency.id,
              entityName: agency.twilio_friendly_name || agency.name,
              phoneNumber: agency.twilio_phone_number,
              reason: 'Fallback - client not configured',
            };
          }
        }
      }

      // Check admin fallback
      if (!activeConfig) {
        const { data: settings } = await supabase
          .from('sms_provider_settings')
          .select(`
            admin_twilio_account_sid,
            admin_twilio_phone_number,
            admin_twilio_enabled,
            admin_twilio_validated_at,
            admin_twilio_friendly_name
          `)
          .limit(1)
          .single();

        if (settings) {
          const adminValidated = settings.admin_twilio_validated_at != null;
          const adminEnabled = settings.admin_twilio_enabled ?? false;
          const adminConfigured = settings.admin_twilio_account_sid != null;
          const adminAvailable = adminConfigured && adminEnabled && adminValidated;

          fallbackChain.push({
            level: 'admin',
            name: settings.admin_twilio_friendly_name || 'Platform Master',
            available: adminAvailable,
            reason: adminAvailable 
              ? 'Available as fallback' 
              : !adminConfigured 
                ? 'Not configured'
                : !adminEnabled 
                  ? 'Disabled'
                  : !adminValidated 
                    ? 'Not validated'
                    : 'Unknown',
          });

          if (adminAvailable) {
            activeConfig = {
              level: 'admin',
              entityId: null,
              entityName: settings.admin_twilio_friendly_name || 'Platform Master',
              phoneNumber: settings.admin_twilio_phone_number,
              reason: 'Fallback - using platform default',
            };
          }
        }
      }

      // Check env var fallback
      if (!activeConfig) {
        const envPhone = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
        const envConfigured = !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') && envPhone);

        fallbackChain.push({
          level: 'env',
          name: 'Environment Variables (Legacy)',
          available: envConfigured,
          reason: envConfigured ? 'Legacy fallback' : 'Not configured',
        });

        if (envConfigured) {
          activeConfig = {
            level: 'env',
            entityId: null,
            entityName: 'Environment Variables (Legacy)',
            phoneNumber: envPhone!,
            reason: 'Fallback - using legacy environment variables',
          };
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          ownConfig,
          activeConfig,
          fallbackChain,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For agency level
    if (level === 'agency') {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select(`
          id, name,
          twilio_account_sid,
          twilio_phone_number,
          twilio_enabled,
          twilio_validated_at,
          twilio_friendly_name,
          twilio_last_error,
          twilio_last_error_at,
          twilio_failure_count,
          twilio_circuit_open_until,
          twilio_monthly_limit,
          twilio_current_month_usage,
          twilio_config_version,
          twilio_revalidate_after
        `)
        .eq('id', entityId)
        .single();

      if (agencyError || !agency) {
        return new Response(
          JSON.stringify({ success: false, error: 'Agency not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const agencyCircuitOpen = agency.twilio_circuit_open_until && new Date(agency.twilio_circuit_open_until) > now;
      const agencyNeedsRevalidation = agency.twilio_revalidate_after && new Date(agency.twilio_revalidate_after) < now;
      const agencyValidated = agency.twilio_validated_at != null;
      const agencyEnabled = agency.twilio_enabled ?? false;
      const agencyConfigured = agency.twilio_account_sid != null;
      const agencyAvailable = agencyConfigured && agencyEnabled && agencyValidated && !agencyCircuitOpen;

      const ownConfig: OwnConfig = {
        configured: agencyConfigured,
        enabled: agencyEnabled,
        validated: agencyValidated,
        validatedAt: agency.twilio_validated_at,
        phoneNumber: agency.twilio_phone_number,
        accountSidLast4: agency.twilio_account_sid ? agency.twilio_account_sid.slice(-4) : null,
        friendlyName: agency.twilio_friendly_name,
        lastError: agency.twilio_last_error,
        lastErrorAt: agency.twilio_last_error_at,
        needsRevalidation: agencyNeedsRevalidation ?? false,
        circuitOpen: agencyCircuitOpen ?? false,
        circuitOpensAt: agency.twilio_circuit_open_until,
        monthlyLimit: agency.twilio_monthly_limit,
        currentMonthUsage: agency.twilio_current_month_usage ?? 0,
        configVersion: agency.twilio_config_version ?? 0,
      };

      fallbackChain.push({
        level: 'agency',
        name: agency.twilio_friendly_name || agency.name,
        available: agencyAvailable,
        reason: agencyAvailable 
          ? 'Own config active' 
          : !agencyConfigured 
            ? 'Not configured'
            : !agencyEnabled 
              ? 'Disabled'
              : !agencyValidated 
                ? 'Not validated'
                : agencyCircuitOpen 
                  ? 'Circuit breaker open'
                  : 'Unknown',
      });

      if (agencyAvailable) {
        activeConfig = {
          level: 'agency',
          entityId: agency.id,
          entityName: agency.twilio_friendly_name || agency.name,
          phoneNumber: agency.twilio_phone_number,
          reason: 'Own config',
        };
      }

      // Check admin fallback
      if (!activeConfig) {
        const { data: settings } = await supabase
          .from('sms_provider_settings')
          .select(`
            admin_twilio_account_sid,
            admin_twilio_phone_number,
            admin_twilio_enabled,
            admin_twilio_validated_at,
            admin_twilio_friendly_name
          `)
          .limit(1)
          .single();

        if (settings) {
          const adminValidated = settings.admin_twilio_validated_at != null;
          const adminEnabled = settings.admin_twilio_enabled ?? false;
          const adminConfigured = settings.admin_twilio_account_sid != null;
          const adminAvailable = adminConfigured && adminEnabled && adminValidated;

          fallbackChain.push({
            level: 'admin',
            name: settings.admin_twilio_friendly_name || 'Platform Master',
            available: adminAvailable,
            reason: adminAvailable 
              ? 'Available as fallback' 
              : !adminConfigured 
                ? 'Not configured'
                : !adminEnabled 
                  ? 'Disabled'
                  : !adminValidated 
                    ? 'Not validated'
                    : 'Unknown',
          });

          if (adminAvailable) {
            activeConfig = {
              level: 'admin',
              entityId: null,
              entityName: settings.admin_twilio_friendly_name || 'Platform Master',
              phoneNumber: settings.admin_twilio_phone_number,
              reason: 'Fallback - using platform default',
            };
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          ownConfig,
          activeConfig,
          fallbackChain,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid level' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GET-TWILIO-STATUS] Error:', error);
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
 * Check if user can view Twilio status
 */
async function checkViewAuthorization(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  level: string,
  entityId: string
): Promise<boolean> {
  // Get user roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const isAdmin = roles?.some(r => r.role === 'admin') ?? false;
  if (isAdmin) return true;

  if (level === 'agency') {
    const { data: agencyRole } = await supabase
      .from('user_agencies')
      .select('role')
      .eq('user_id', userId)
      .eq('agency_id', entityId)
      .single();

    return agencyRole?.role === 'owner';
  }

  if (level === 'client') {
    // Check if user's agency owns this client
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

      if (agencyRole?.role === 'owner') return true;
    }

    // Check if user is client owner
    const { data: clientUser } = await supabase
      .from('client_users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('client_id', entityId)
      .single();

    return !!clientUser;
  }

  return false;
}

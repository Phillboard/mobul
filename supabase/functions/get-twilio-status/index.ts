/**
 * Get Twilio Status Edge Function
 * 
 * Returns the full Twilio configuration status for a client or agency,
 * including own config, active config, and fallback chain.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { checkTwilioViewAuthorization, type TwilioLevel } from '../_shared/twilio-auth.ts';

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
  level: TwilioLevel | 'env';
  entityId: string | null;
  entityName: string;
  phoneNumber: string;
  reason: string;
}

interface FallbackChainItem {
  level: TwilioLevel | 'env';
  name: string;
  available: boolean;
  reason: string;
}

interface GetStatusResponse {
  success: boolean;
  ownConfig?: OwnConfig;
  activeConfig?: ActiveConfig | null;
  fallbackChain?: FallbackChainItem[];
}

async function handleGetStatus(
  request: GetStatusRequest,
  context: AuthContext
): Promise<GetStatusResponse> {
  const supabase = createServiceClient();
  const { level, entityId } = request;

  if (!level || !['client', 'agency'].includes(level) || !entityId) {
    throw new ApiError('Level and entityId are required', 'MISSING_PARAMS', 400);
  }

  // Check authorization
  const isAuthorized = await checkTwilioViewAuthorization(supabase, context.user.id, level, entityId);
  if (!isAuthorized) {
    throw new ApiError('Not authorized to view this configuration', 'UNAUTHORIZED', 403);
  }

  const now = new Date();
  const fallbackChain: FallbackChainItem[] = [];
  let activeConfig: ActiveConfig | null = null;

  if (level === 'client') {
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        id, name, agency_id,
        twilio_account_sid, twilio_phone_number, twilio_enabled,
        twilio_validated_at, twilio_friendly_name, twilio_last_error,
        twilio_last_error_at, twilio_failure_count, twilio_circuit_open_until,
        twilio_monthly_limit, twilio_current_month_usage, twilio_config_version,
        twilio_revalidate_after
      `)
      .eq('id', entityId)
      .single();

    if (error || !client) {
      throw new ApiError('Client not found', 'NOT_FOUND', 404);
    }

    const clientCircuitOpen = client.twilio_circuit_open_until && new Date(client.twilio_circuit_open_until) > now;
    const clientNeedsRevalidation = client.twilio_revalidate_after && new Date(client.twilio_revalidate_after) < now;
    const clientValidated = client.twilio_validated_at != null;
    const clientEnabled = client.twilio_enabled ?? false;
    const clientConfigured = client.twilio_account_sid != null;
    const clientAvailable = clientConfigured && clientEnabled && clientValidated && !clientCircuitOpen;

    const ownConfig: OwnConfig = {
      configured: clientConfigured,
      enabled: clientEnabled,
      validated: clientValidated,
      validatedAt: client.twilio_validated_at,
      phoneNumber: client.twilio_phone_number,
      accountSidLast4: client.twilio_account_sid?.slice(-4) || null,
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

    fallbackChain.push({
      level: 'client',
      name: client.twilio_friendly_name || client.name,
      available: clientAvailable,
      reason: getAvailabilityReason(clientConfigured, clientEnabled, clientValidated, clientCircuitOpen),
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

    // Check agency fallback
    if (!activeConfig && client.agency_id) {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name, twilio_account_sid, twilio_phone_number, twilio_enabled, twilio_validated_at, twilio_friendly_name, twilio_circuit_open_until')
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
          reason: getAvailabilityReason(agencyConfigured, agencyEnabled, agencyValidated, agencyCircuitOpen, true),
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
      const adminResult = await checkAdminFallback(supabase);
      fallbackChain.push(adminResult.chainItem);
      if (adminResult.activeConfig) activeConfig = adminResult.activeConfig;
    }

    // Check env fallback
    if (!activeConfig) {
      const envResult = checkEnvFallback();
      fallbackChain.push(envResult.chainItem);
      if (envResult.activeConfig) activeConfig = envResult.activeConfig;
    }

    return { success: true, ownConfig, activeConfig, fallbackChain };
  }

  // Agency level
  const { data: agency, error } = await supabase
    .from('agencies')
    .select(`
      id, name, twilio_account_sid, twilio_phone_number, twilio_enabled,
      twilio_validated_at, twilio_friendly_name, twilio_last_error,
      twilio_last_error_at, twilio_failure_count, twilio_circuit_open_until,
      twilio_monthly_limit, twilio_current_month_usage, twilio_config_version,
      twilio_revalidate_after
    `)
    .eq('id', entityId)
    .single();

  if (error || !agency) {
    throw new ApiError('Agency not found', 'NOT_FOUND', 404);
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
    accountSidLast4: agency.twilio_account_sid?.slice(-4) || null,
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
    reason: getAvailabilityReason(agencyConfigured, agencyEnabled, agencyValidated, agencyCircuitOpen),
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
    const adminResult = await checkAdminFallback(supabase);
    fallbackChain.push(adminResult.chainItem);
    if (adminResult.activeConfig) activeConfig = adminResult.activeConfig;
  }

  return { success: true, ownConfig, activeConfig, fallbackChain };
}

function getAvailabilityReason(
  configured: boolean, enabled: boolean, validated: boolean, 
  circuitOpen: boolean | null | undefined, isFallback = false
): string {
  if (!configured) return 'Not configured';
  if (!enabled) return 'Disabled';
  if (!validated) return 'Not validated';
  if (circuitOpen) return 'Circuit breaker open';
  return isFallback ? 'Available as fallback' : 'Own config active';
}

async function checkAdminFallback(supabase: ReturnType<typeof createServiceClient>): Promise<{
  chainItem: FallbackChainItem;
  activeConfig: ActiveConfig | null;
}> {
  const { data: settings } = await supabase
    .from('sms_provider_settings')
    .select('admin_twilio_account_sid, admin_twilio_phone_number, admin_twilio_enabled, admin_twilio_validated_at, admin_twilio_friendly_name')
    .limit(1)
    .single();

  const adminValidated = settings?.admin_twilio_validated_at != null;
  const adminEnabled = settings?.admin_twilio_enabled ?? false;
  const adminConfigured = settings?.admin_twilio_account_sid != null;
  const adminAvailable = adminConfigured && adminEnabled && adminValidated;

  const chainItem: FallbackChainItem = {
    level: 'admin',
    name: settings?.admin_twilio_friendly_name || 'Platform Master',
    available: adminAvailable,
    reason: getAvailabilityReason(adminConfigured, adminEnabled, adminValidated, false, true),
  };

  if (adminAvailable) {
    return {
      chainItem,
      activeConfig: {
        level: 'admin',
        entityId: null,
        entityName: settings!.admin_twilio_friendly_name || 'Platform Master',
        phoneNumber: settings!.admin_twilio_phone_number,
        reason: 'Fallback - using platform default',
      },
    };
  }

  return { chainItem, activeConfig: null };
}

function checkEnvFallback(): { chainItem: FallbackChainItem; activeConfig: ActiveConfig | null } {
  const envPhone = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  const envConfigured = !!(Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') && envPhone);

  const chainItem: FallbackChainItem = {
    level: 'env',
    name: 'Environment Variables (Legacy)',
    available: envConfigured,
    reason: envConfigured ? 'Legacy fallback' : 'Not configured',
  };

  if (envConfigured) {
    return {
      chainItem,
      activeConfig: {
        level: 'env',
        entityId: null,
        entityName: 'Environment Variables (Legacy)',
        phoneNumber: envPhone!,
        reason: 'Fallback - using legacy environment variables',
      },
    };
  }

  return { chainItem, activeConfig: null };
}

Deno.serve(withApiGateway(handleGetStatus, {
  requireAuth: true,
  parseBody: true,
}));

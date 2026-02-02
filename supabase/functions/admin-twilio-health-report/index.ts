/**
 * Admin Twilio Health Report Edge Function
 * 
 * Returns aggregate stats for Twilio configuration across agencies and clients.
 * Admin-only.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { isUserAdmin } from '../_shared/twilio-auth.ts';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface HealthReportResponse {
  success: boolean;
  summary: {
    totalAgencies: number;
    agenciesWithOwnTwilio: number;
    totalClients: number;
    clientsWithOwnTwilio: number;
    clientsUsingAgencyFallback: number;
    clientsUsingAdminFallback: number;
    staleValidationCount: number;
    recentFailureCount: number;
    openCircuitCount: number;
  };
}

async function handleHealthReport(
  _request: unknown,
  context: AuthContext
): Promise<HealthReportResponse> {
  const supabase = createServiceClient();

  // Check admin access
  const isAdmin = await isUserAdmin(supabase, context.user.id);
  if (!isAdmin) {
    throw new ApiError('Admin access required', 'FORBIDDEN', 403);
  }

  const now = new Date();
  const recentFailureCutoff = new Date(Date.now() - ONE_WEEK_MS);

  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('id, twilio_account_sid, twilio_enabled, twilio_revalidate_after, twilio_last_error_at, twilio_circuit_open_until');

  if (agenciesError) throw agenciesError;

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, agency_id, twilio_account_sid, twilio_enabled, twilio_revalidate_after, twilio_last_error_at, twilio_circuit_open_until');

  if (clientsError) throw clientsError;

  const { data: adminSettings } = await supabase
    .from('sms_provider_settings')
    .select('admin_twilio_account_sid, admin_twilio_enabled')
    .single();

  const totalAgencies = agencies?.length || 0;
  const totalClients = clients?.length || 0;

  const agenciesWithOwnTwilio = agencies?.filter(a => a.twilio_account_sid && a.twilio_enabled).length || 0;
  const clientsWithOwnTwilio = clients?.filter(c => c.twilio_account_sid && c.twilio_enabled).length || 0;

  const agencyTwilioIds = new Set(
    (agencies || [])
      .filter(a => a.twilio_account_sid && a.twilio_enabled)
      .map(a => a.id)
  );

  const clientsUsingAgencyFallback = (clients || []).filter(c => {
    const clientHasTwilio = !!c.twilio_account_sid && !!c.twilio_enabled;
    const agencyHasTwilio = c.agency_id && agencyTwilioIds.has(c.agency_id);
    return !clientHasTwilio && agencyHasTwilio;
  }).length;

  const adminTwilioAvailable = !!adminSettings?.admin_twilio_account_sid && !!adminSettings?.admin_twilio_enabled;

  const clientsUsingAdminFallback = adminTwilioAvailable
    ? (clients || []).filter(c => {
        const clientHasTwilio = !!c.twilio_account_sid && !!c.twilio_enabled;
        const agencyHasTwilio = c.agency_id && agencyTwilioIds.has(c.agency_id);
        return !clientHasTwilio && !agencyHasTwilio;
      }).length
    : 0;

  const staleValidationCount = [
    ...(agencies || []).map(a => a.twilio_revalidate_after).filter(Boolean),
    ...(clients || []).map(c => c.twilio_revalidate_after).filter(Boolean),
  ].filter(date => new Date(date as string) < now).length;

  const recentFailureCount = [
    ...(agencies || []).map(a => a.twilio_last_error_at).filter(Boolean),
    ...(clients || []).map(c => c.twilio_last_error_at).filter(Boolean),
  ].filter(date => new Date(date as string) >= recentFailureCutoff).length;

  const openCircuitCount = [
    ...(agencies || []).map(a => a.twilio_circuit_open_until).filter(Boolean),
    ...(clients || []).map(c => c.twilio_circuit_open_until).filter(Boolean),
  ].filter(date => new Date(date as string) > now).length;

  return {
    success: true,
    summary: {
      totalAgencies,
      agenciesWithOwnTwilio,
      totalClients,
      clientsWithOwnTwilio,
      clientsUsingAgencyFallback,
      clientsUsingAdminFallback,
      staleValidationCount,
      recentFailureCount,
      openCircuitCount,
    },
  };
}

Deno.serve(withApiGateway(handleHealthReport, {
  requireAuth: true,
  parseBody: false,
}));

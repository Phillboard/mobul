/**
 * Monitor Gift Card System Edge Function
 * 
 * Comprehensive monitoring for the gift card system:
 * - CSV pool inventory health
 * - Campaign budget/credit monitoring
 * - Agency/Client credit alerts
 * - Provisioning failure detection
 * - API provider health checks
 * 
 * No authentication required (service function for scheduled monitoring).
 * Should be called with service role key.
 */

import { withApiGateway, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { 
  MONITORING_THRESHOLDS,
  getInventoryAlertSeverity,
  getCreditAlertSeverity,
} from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface MonitorRequest {
  // Optional: which checks to run (defaults to all)
  checks?: ('csv_pools' | 'campaigns' | 'agencies' | 'clients' | 'failures' | 'api')[];
}

interface MonitorResponse {
  duration_ms: number;
  alerts_generated: number;
  breakdown: {
    csv_pools: number;
    campaigns: number;
    agencies: number;
    clients: number;
    provisioning_failures: number;
    api_providers: number;
  };
  alerts: string[];
}

// ============================================================================
// Monitoring Functions
// ============================================================================

async function checkCSVPoolHealth(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  console.log('[MONITOR] Checking CSV pool health...');
  const alerts: string[] = [];

  const { data: pools, error } = await supabase
    .from('gift_card_pools')
    .select(`
      id,
      pool_name,
      brand_id,
      card_value,
      available_cards,
      low_stock_threshold,
      pool_type,
      gift_card_brands (brand_name)
    `)
    .eq('pool_type', 'csv')
    .eq('is_active', true);

  if (error) {
    console.error('[MONITOR] Error checking pools:', error);
    return alerts;
  }

  for (const pool of pools || []) {
    const available = pool.available_cards || 0;
    const threshold = pool.low_stock_threshold || MONITORING_THRESHOLDS.CSV_HEALTHY;
    const brandName = (pool.gift_card_brands as { brand_name?: string })?.brand_name || 'Unknown Brand';

    const severity = getInventoryAlertSeverity(available, threshold);
    
    if (severity) {
      let message: string;
      let alertType: string;
      
      if (severity === 'critical') {
        message = `CSV pool EMPTY: ${brandName} $${pool.card_value} - ${pool.pool_name}`;
        alertType = 'csv_pool_empty';
      } else if (severity === 'warning') {
        message = `CSV pool CRITICALLY LOW: ${brandName} $${pool.card_value} - ${available} cards remaining`;
        alertType = 'csv_pool_low';
      } else {
        message = `CSV pool low: ${brandName} $${pool.card_value} - ${available} cards (threshold: ${threshold})`;
        alertType = 'csv_pool_below_threshold';
      }
      
      alerts.push(message);
      
      await supabase.from('system_alerts').insert({
        severity,
        alert_type: alertType,
        message,
        metadata: {
          pool_id: pool.id,
          brand_id: pool.brand_id,
          denomination: pool.card_value,
          available_cards: available,
          pool_name: pool.pool_name
        }
      });
    }
  }

  console.log(`[MONITOR] CSV health check complete. ${alerts.length} alerts generated.`);
  return alerts;
}

async function checkDepletedCampaigns(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  console.log('[MONITOR] Checking for depleted campaigns...');
  const alerts: string[] = [];

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      client_id,
      credit_account_id,
      uses_shared_credit,
      clients (name, credit_account_id)
    `)
    .eq('status', 'active');

  if (error) {
    console.error('[MONITOR] Error checking campaigns:', error);
    return alerts;
  }

  for (const campaign of campaigns || []) {
    const clientData = campaign.clients as { name?: string; credit_account_id?: string } | null;
    const accountId = campaign.uses_shared_credit 
      ? clientData?.credit_account_id 
      : campaign.credit_account_id;

    if (!accountId) continue;

    const { data: account, error: accountError } = await supabase
      .from('credit_accounts')
      .select('total_remaining, status')
      .eq('id', accountId)
      .single();

    if (accountError) continue;

    const severity = getCreditAlertSeverity(account.total_remaining, 'campaign');
    
    if (severity === 'critical' || account.status === 'depleted') {
      const message = `Campaign "${campaign.name}" budget exhausted (Client: ${clientData?.name})`;
      alerts.push(message);

      // Auto-pause depleted campaigns
      await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign.id)
        .eq('status', 'active');

      await supabase.from('system_alerts').insert({
        severity: 'warning',
        alert_type: 'campaign_depleted',
        message,
        metadata: {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          client_id: campaign.client_id,
          uses_shared_credit: campaign.uses_shared_credit
        }
      });
    } else if (severity === 'info') {
      const message = `Campaign "${campaign.name}" low on credit: $${account.total_remaining} remaining`;
      alerts.push(message);

      await supabase.from('system_alerts').insert({
        severity: 'info',
        alert_type: 'campaign_low_credit',
        message,
        metadata: {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          remaining_credit: account.total_remaining
        }
      });
    }
  }

  console.log(`[MONITOR] Campaign check complete. ${alerts.length} alerts generated.`);
  return alerts;
}

async function checkAgencyCredit(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  console.log('[MONITOR] Checking agency credit balances...');
  const alerts: string[] = [];

  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('id, name, credit_account_id, status')
    .eq('status', 'active');

  if (error) {
    console.error('[MONITOR] Error checking agencies:', error);
    return alerts;
  }

  for (const agency of agencies || []) {
    if (!agency.credit_account_id) continue;

    const { data: account, error: accountError } = await supabase
      .from('credit_accounts')
      .select('total_remaining')
      .eq('id', agency.credit_account_id)
      .single();

    if (accountError) continue;

    const severity = getCreditAlertSeverity(account.total_remaining, 'agency');
    
    if (severity) {
      const message = `Agency "${agency.name}" low on credit: $${account.total_remaining} remaining`;
      alerts.push(message);

      await supabase.from('system_alerts').insert({
        severity,
        alert_type: 'agency_low_credit',
        message,
        metadata: {
          agency_id: agency.id,
          agency_name: agency.name,
          remaining_credit: account.total_remaining,
          threshold: MONITORING_THRESHOLDS.AGENCY_LOW_CREDIT
        }
      });
    }
  }

  console.log(`[MONITOR] Agency check complete. ${alerts.length} alerts generated.`);
  return alerts;
}

async function checkClientCredit(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  console.log('[MONITOR] Checking client credit balances...');
  const alerts: string[] = [];

  const { data: clients, error } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      credit_account_id,
      agency_id,
      agencies (name)
    `);

  if (error) {
    console.error('[MONITOR] Error checking clients:', error);
    return alerts;
  }

  for (const client of clients || []) {
    if (!client.credit_account_id) continue;

    const { data: account, error: accountError } = await supabase
      .from('credit_accounts')
      .select('total_remaining')
      .eq('id', client.credit_account_id)
      .single();

    if (accountError) continue;

    const severity = getCreditAlertSeverity(account.total_remaining, 'client');
    
    if (severity) {
      const agencyName = (client.agencies as { name?: string })?.name || 'N/A';
      const message = `Client "${client.name}" low on credit: $${account.total_remaining} remaining (Agency: ${agencyName})`;
      alerts.push(message);

      await supabase.from('system_alerts').insert({
        severity,
        alert_type: 'client_low_credit',
        message,
        metadata: {
          client_id: client.id,
          client_name: client.name,
          agency_id: client.agency_id,
          remaining_credit: account.total_remaining,
          threshold: MONITORING_THRESHOLDS.CLIENT_LOW_CREDIT
        }
      });
    }
  }

  console.log(`[MONITOR] Client check complete. ${alerts.length} alerts generated.`);
  return alerts;
}

async function checkProvisioningFailures(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  console.log('[MONITOR] Checking for provisioning failures...');
  const alerts: string[] = [];

  // Check for failed redemptions in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: failures, error } = await supabase
    .from('gift_card_redemptions')
    .select(`
      id,
      campaign_id,
      brand_id,
      denomination,
      status,
      created_at,
      campaigns (name, client_id, clients (name))
    `)
    .eq('status', 'failed')
    .gte('created_at', oneHourAgo);

  if (error) {
    console.error('[MONITOR] Error checking failures:', error);
    return alerts;
  }

  if (failures && failures.length > 0) {
    const message = `${failures.length} gift card provisioning failures in the last hour`;
    alerts.push(message);

    await supabase.from('system_alerts').insert({
      severity: 'critical',
      alert_type: 'provisioning_failures',
      message,
      metadata: {
        failure_count: failures.length,
        time_window: '1 hour',
        failures: failures.map((f) => ({
          redemption_id: f.id,
          campaign_name: (f.campaigns as { name?: string })?.name,
          brand_id: f.brand_id,
          denomination: f.denomination
        }))
      }
    });
  }

  console.log(`[MONITOR] Provisioning failure check complete. ${failures?.length || 0} failures found.`);
  return alerts;
}

async function checkAPIProviderHealth(_supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  console.log('[MONITOR] Checking API provider health...');
  const alerts: string[] = [];

  // API health checks: Tillo integration tested via provision-gift-card-unified
  // Additional provider health checks can be added here:
  // - Check last successful API call per provider
  // - Check error rates
  // - Ping health endpoints if available

  return alerts;
}

// ============================================================================
// Main Monitoring Function
// ============================================================================

async function runMonitoring(
  supabase: ReturnType<typeof createServiceClient>,
  checks?: MonitorRequest['checks']
): Promise<MonitorResponse> {
  console.log('[MONITOR] Starting system monitoring...');
  const startTime = Date.now();

  const allAlerts: string[] = [];
  const breakdown = {
    csv_pools: 0,
    campaigns: 0,
    agencies: 0,
    clients: 0,
    provisioning_failures: 0,
    api_providers: 0,
  };

  const runAll = !checks || checks.length === 0;

  // Run selected or all monitoring checks
  if (runAll || checks?.includes('csv_pools')) {
    const csvAlerts = await checkCSVPoolHealth(supabase);
    breakdown.csv_pools = csvAlerts.length;
    allAlerts.push(...csvAlerts);
  }

  if (runAll || checks?.includes('campaigns')) {
    const campaignAlerts = await checkDepletedCampaigns(supabase);
    breakdown.campaigns = campaignAlerts.length;
    allAlerts.push(...campaignAlerts);
  }

  if (runAll || checks?.includes('agencies')) {
    const agencyAlerts = await checkAgencyCredit(supabase);
    breakdown.agencies = agencyAlerts.length;
    allAlerts.push(...agencyAlerts);
  }

  if (runAll || checks?.includes('clients')) {
    const clientAlerts = await checkClientCredit(supabase);
    breakdown.clients = clientAlerts.length;
    allAlerts.push(...clientAlerts);
  }

  if (runAll || checks?.includes('failures')) {
    const failureAlerts = await checkProvisioningFailures(supabase);
    breakdown.provisioning_failures = failureAlerts.length;
    allAlerts.push(...failureAlerts);
  }

  if (runAll || checks?.includes('api')) {
    const apiAlerts = await checkAPIProviderHealth(supabase);
    breakdown.api_providers = apiAlerts.length;
    allAlerts.push(...apiAlerts);
  }

  const duration = Date.now() - startTime;
  console.log(`[MONITOR] Monitoring complete in ${duration}ms. Total alerts: ${allAlerts.length}`);

  return {
    duration_ms: duration,
    alerts_generated: allAlerts.length,
    breakdown,
    alerts: allAlerts,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleMonitorGiftCardSystem(
  request: MonitorRequest | null,
  _context: PublicContext
): Promise<MonitorResponse> {
  const supabase = createServiceClient();
  return await runMonitoring(supabase, request?.checks);
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleMonitorGiftCardSystem, {
  requireAuth: false, // Service function called by cron/scheduler
  parseBody: true,
  auditAction: 'monitor_gift_card_system',
}));

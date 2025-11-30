import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// THRESHOLDS
// ============================================================================

const THRESHOLDS = {
  CSV_HEALTHY: 50,
  CSV_LOW: 10,
  CSV_EMPTY: 0,
  AGENCY_LOW_CREDIT: 1000,
  CLIENT_LOW_CREDIT: 500,
  CAMPAIGN_LOW_CREDIT: 100,
};

// ============================================================================
// MONITORING FUNCTIONS
// ============================================================================

/**
 * Check CSV pool health and alert on low stock
 */
async function checkCSVPoolHealth(supabase: any): Promise<string[]> {
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
    const threshold = pool.low_stock_threshold || THRESHOLDS.CSV_HEALTHY;
    const brandName = pool.gift_card_brands?.brand_name || 'Unknown Brand';

    if (available === 0) {
      // CRITICAL: Pool empty
      const message = `CSV pool EMPTY: ${brandName} $${pool.card_value} - ${pool.pool_name}`;
      alerts.push(message);
      
      await supabase.from('system_alerts').insert({
        severity: 'critical',
        alert_type: 'csv_pool_empty',
        message: message,
        metadata: {
          pool_id: pool.id,
          brand_id: pool.brand_id,
          denomination: pool.card_value,
          pool_name: pool.pool_name
        }
      });
    } else if (available < THRESHOLDS.CSV_LOW) {
      // WARNING: Pool critically low
      const message = `CSV pool CRITICALLY LOW: ${brandName} $${pool.card_value} - ${available} cards remaining`;
      alerts.push(message);
      
      await supabase.from('system_alerts').insert({
        severity: 'warning',
        alert_type: 'csv_pool_low',
        message: message,
        metadata: {
          pool_id: pool.id,
          brand_id: pool.brand_id,
          denomination: pool.card_value,
          available_cards: available,
          pool_name: pool.pool_name
        }
      });
    } else if (available < threshold) {
      // INFO: Pool below custom threshold
      const message = `CSV pool low: ${brandName} $${pool.card_value} - ${available} cards (threshold: ${threshold})`;
      alerts.push(message);
      
      await supabase.from('system_alerts').insert({
        severity: 'info',
        alert_type: 'csv_pool_below_threshold',
        message: message,
        metadata: {
          pool_id: pool.id,
          available_cards: available,
          threshold: threshold
        }
      });
    }
  }

  console.log(`[MONITOR] CSV health check complete. ${alerts.length} alerts generated.`);
  return alerts;
}

/**
 * Check for depleted campaigns
 */
async function checkDepletedCampaigns(supabase: any): Promise<string[]> {
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
    // Determine which account to check
    const accountId = campaign.uses_shared_credit 
      ? campaign.clients?.credit_account_id 
      : campaign.credit_account_id;

    if (!accountId) continue;

    const { data: account, error: accountError } = await supabase
      .from('credit_accounts')
      .select('total_remaining, status')
      .eq('id', accountId)
      .single();

    if (accountError) continue;

    if (account.status === 'depleted' || account.total_remaining <= 0) {
      const message = `Campaign "${campaign.name}" budget exhausted (Client: ${campaign.clients?.name})`;
      alerts.push(message);

      // Mark campaign as paused if not already
      await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign.id)
        .eq('status', 'active');

      await supabase.from('system_alerts').insert({
        severity: 'warning',
        alert_type: 'campaign_depleted',
        message: message,
        metadata: {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          client_id: campaign.client_id,
          uses_shared_credit: campaign.uses_shared_credit
        }
      });
    } else if (account.total_remaining < THRESHOLDS.CAMPAIGN_LOW_CREDIT) {
      const message = `Campaign "${campaign.name}" low on credit: $${account.total_remaining} remaining`;
      alerts.push(message);

      await supabase.from('system_alerts').insert({
        severity: 'info',
        alert_type: 'campaign_low_credit',
        message: message,
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

/**
 * Check for agencies with low credit
 */
async function checkAgencyCredit(supabase: any): Promise<string[]> {
  console.log('[MONITOR] Checking agency credit balances...');
  const alerts: string[] = [];

  const { data: agencies, error } = await supabase
    .from('agencies')
    .select(`
      id,
      name,
      credit_account_id,
      status
    `)
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

    if (account.total_remaining < THRESHOLDS.AGENCY_LOW_CREDIT) {
      const message = `Agency "${agency.name}" low on credit: $${account.total_remaining} remaining`;
      alerts.push(message);

      await supabase.from('system_alerts').insert({
        severity: 'warning',
        alert_type: 'agency_low_credit',
        message: message,
        metadata: {
          agency_id: agency.id,
          agency_name: agency.name,
          remaining_credit: account.total_remaining,
          threshold: THRESHOLDS.AGENCY_LOW_CREDIT
        }
      });
    }
  }

  console.log(`[MONITOR] Agency check complete. ${alerts.length} alerts generated.`);
  return alerts;
}

/**
 * Check for clients with low credit
 */
async function checkClientCredit(supabase: any): Promise<string[]> {
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

    if (account.total_remaining < THRESHOLDS.CLIENT_LOW_CREDIT) {
      const message = `Client "${client.name}" low on credit: $${account.total_remaining} remaining (Agency: ${client.agencies?.name || 'N/A'})`;
      alerts.push(message);

      await supabase.from('system_alerts').insert({
        severity: 'info',
        alert_type: 'client_low_credit',
        message: message,
        metadata: {
          client_id: client.id,
          client_name: client.name,
          agency_id: client.agency_id,
          remaining_credit: account.total_remaining,
          threshold: THRESHOLDS.CLIENT_LOW_CREDIT
        }
      });
    }
  }

  console.log(`[MONITOR] Client check complete. ${alerts.length} alerts generated.`);
  return alerts;
}

/**
 * Check for recent provisioning failures
 */
async function checkProvisioningFailures(supabase: any): Promise<string[]> {
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
      message: message,
      metadata: {
        failure_count: failures.length,
        time_window: '1 hour',
        failures: failures.map((f: any) => ({
          redemption_id: f.id,
          campaign_name: f.campaigns?.name,
          brand_id: f.brand_id,
          denomination: f.denomination
        }))
      }
    });
  }

  console.log(`[MONITOR] Provisioning failure check complete. ${failures?.length || 0} failures found.`);
  return alerts;
}

/**
 * Check API provider health (placeholder for future implementation)
 */
async function checkAPIProviderHealth(supabase: any): Promise<string[]> {
  console.log('[MONITOR] Checking API provider health...');
  const alerts: string[] = [];

  // TODO: Implement API health checks
  // - Check last successful API call per provider
  // - Check error rates
  // - Ping health endpoints if available

  return alerts;
}

// ============================================================================
// MAIN MONITORING FUNCTION
// ============================================================================

async function runMonitoring(supabase: any): Promise<any> {
  console.log('[MONITOR] Starting system monitoring...');
  const startTime = Date.now();

  const allAlerts: string[] = [];

  // Run all monitoring checks
  const csvAlerts = await checkCSVPoolHealth(supabase);
  const campaignAlerts = await checkDepletedCampaigns(supabase);
  const agencyAlerts = await checkAgencyCredit(supabase);
  const clientAlerts = await checkClientCredit(supabase);
  const failureAlerts = await checkProvisioningFailures(supabase);
  const apiAlerts = await checkAPIProviderHealth(supabase);

  allAlerts.push(...csvAlerts, ...campaignAlerts, ...agencyAlerts, ...clientAlerts, ...failureAlerts, ...apiAlerts);

  const duration = Date.now() - startTime;
  console.log(`[MONITOR] Monitoring complete in ${duration}ms. Total alerts: ${allAlerts.length}`);

  return {
    success: true,
    duration_ms: duration,
    alerts_generated: allAlerts.length,
    breakdown: {
      csv_pools: csvAlerts.length,
      campaigns: campaignAlerts.length,
      agencies: agencyAlerts.length,
      clients: clientAlerts.length,
      provisioning_failures: failureAlerts.length,
      api_providers: apiAlerts.length
    },
    alerts: allAlerts
  };
}

// ============================================================================
// HTTP HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const result = await runMonitoring(supabaseClient);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MONITOR-SYSTEM] Error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


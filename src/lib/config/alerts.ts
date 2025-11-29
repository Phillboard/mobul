/**
 * System Alerts Management
 * 
 * Functions for creating and managing system alerts for operational monitoring.
 */

import { supabase } from "@/integrations/supabase/client";

export type AlertType = 
  | 'low_inventory'
  | 'high_error_rate'
  | 'slow_api_response'
  | 'failed_sms_delivery'
  | 'payment_failure'
  | 'security_incident';

export type AlertSeverity = 'info' | 'warning' | 'critical';

interface CreateAlertParams {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Create a system alert
 */
export async function createSystemAlert(params: CreateAlertParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_system_alert', {
      p_alert_type: params.type,
      p_severity: params.severity,
      p_title: params.title,
      p_message: params.message,
      p_metadata: params.metadata || {},
    });

    if (error) {
      console.error('Failed to create system alert:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating system alert:', error);
    return null;
  }
}

/**
 * Check gift card pool inventory and create alerts if low
 */
export async function checkGiftCardInventory(threshold: number = 100): Promise<void> {
  try {
    const { data: pools, error } = await supabase
      .from('gift_card_pools')
      .select('id, pool_name, available_cards, client_id')
      .lt('available_cards', threshold)
      .gt('available_cards', 0);

    if (error) {
      console.error('Failed to check gift card inventory:', error);
      return;
    }

    for (const pool of pools || []) {
      await createSystemAlert({
        type: 'low_inventory',
        severity: pool.available_cards < 50 ? 'critical' : 'warning',
        title: `Low Gift Card Inventory: ${pool.pool_name}`,
        message: `Pool "${pool.pool_name}" has only ${pool.available_cards} cards remaining. Consider restocking soon.`,
        metadata: {
          pool_id: pool.id,
          pool_name: pool.pool_name,
          available_cards: pool.available_cards,
          client_id: pool.client_id,
        },
      });
    }
  } catch (error) {
    console.error('Error checking gift card inventory:', error);
  }
}

/**
 * Check for high error rates and create alerts
 */
export async function checkErrorRates(thresholdPerHour: number = 10): Promise<void> {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { count: errorCount, error } = await supabase
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('occurred_at', oneHourAgo.toISOString())
      .eq('resolved', false);

    if (error) {
      console.error('Failed to check error rates:', error);
      return;
    }

    const count = errorCount || 0;

    if (count >= thresholdPerHour) {
      await createSystemAlert({
        type: 'high_error_rate',
        severity: count >= thresholdPerHour * 2 ? 'critical' : 'warning',
        title: 'High Error Rate Detected',
        message: `${count} errors occurred in the last hour, exceeding threshold of ${thresholdPerHour}.`,
        metadata: {
          error_count: count,
          threshold: thresholdPerHour,
          time_window: '1 hour',
        },
      });
    }
  } catch (error) {
    console.error('Error checking error rates:', error);
  }
}

/**
 * Get unresolved alerts
 */
export async function getUnresolvedAlerts() {
  const { data, error } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('resolved', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch unresolved alerts:', error);
    return [];
  }

  return data || [];
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('User not authenticated');
    return false;
  }

  const { error } = await supabase
    .from('system_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Failed to acknowledge alert:', error);
    return false;
  }

  return true;
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<boolean> {
  const { error } = await supabase
    .from('system_alerts')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Failed to resolve alert:', error);
    return false;
  }

  return true;
}

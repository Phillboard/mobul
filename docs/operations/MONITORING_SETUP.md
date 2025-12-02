# Production Monitoring Setup Guide

## Overview

Configure alerts and monitoring for production deployment of ACE Engage platform.

---

## Alert Channels

### Email Alerts

**Configuration**:
```bash
# Add to Supabase Dashboard → Edge Functions → Environment Variables
ALERT_EMAIL_RECIPIENTS=ops@company.com,admin@company.com,engineering@company.com
RESEND_API_KEY=re_... # Your Resend API key
FROM_EMAIL=alerts@mobulace.com
FROM_NAME=ACE Engage Alerts
```

**Test Email Alerts**:
```typescript
// Test script
const { data, error } = await supabase.functions.invoke(
  'send-alert-notification',
  {
    body: {
      severity: 'info',
      title: 'Test Alert',
      message: 'Testing email alert system',
      category: 'system_test'
    }
  }
);

if (error) {
  console.error('Alert test failed:', error);
} else {
  console.log('✅ Test alert sent successfully');
}
```

### Slack Alerts (Optional)

**Setup**:
1. Create Slack incoming webhook:
   - Go to https://api.slack.com/apps
   - Create new app
   - Add "Incoming Webhooks" feature
   - Create webhook for #alerts channel
   - Copy webhook URL

2. Configure in Supabase:
```bash
# Add to environment variables
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

3. Test Slack alerts:
```bash
curl -X POST ALERT_SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Test alert from ACE Engage",
    "blocks": [{
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "🧪 *Test Alert*\n\nThis is a test of the alerting system."
      }
    }]
  }'
```

---

## Alert Thresholds

### Critical Alerts (Immediate Response)

```typescript
// File: scripts/alert-config.ts

export const ALERT_THRESHOLDS = {
  // Error thresholds
  critical_errors_per_hour: 5,
  high_errors_per_hour: 20,
  error_rate_percentage: 5, // 5% of requests
  
  // Performance thresholds
  slow_response_time_ms: 3000, // 3 seconds
  very_slow_response_time_ms: 10000, // 10 seconds
  
  // Communication thresholds
  failed_sms_per_hour: 10,
  failed_emails_per_hour: 20,
  sms_bounce_rate: 10, // 10% bounce rate
  
  // System health thresholds
  database_size_gb: 8, // 80% of 10GB free tier
  function_calls_per_day: 400000, // 80% of 500k limit
  bandwidth_gb_per_month: 40, // 80% of 50GB limit
  
  // Business thresholds
  low_credit_balance: 100,
  failed_gift_card_provisions: 5,
  
  // User experience
  concurrent_users_threshold: 100,
  page_load_time_ms: 5000
};
```

### Alert Types

| Alert Type | Severity | Response Time | Notification Channel |
|-----------|----------|---------------|---------------------|
| Database Down | Critical | Immediate | Email + Slack + SMS |
| High Error Rate | Critical | 15 minutes | Email + Slack |
| Slow Performance | High | 1 hour | Email + Slack |
| Low Inventory | High | 2 hours | Email |
| Failed SMS | Medium | 4 hours | Email |
| High Usage | Info | Daily digest | Email |

---

## Monitoring Dashboard

### System Health Page

**Location**: `/admin/system-health`

**Features**:
- Real-time error count
- Performance metrics charts
- Active users count
- Function health status
- Database size monitoring
- API usage tracking

**Enhancement**: Add alert widgets

```typescript
// File: src/pages/SystemHealth.tsx
// Add to existing component

function AlertWidget() {
  const { data: alerts } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
  const warningAlerts = alerts?.filter(a => a.severity === 'warning').length || 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Active Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {criticalAlerts > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{criticalAlerts} Critical Alert(s)</AlertTitle>
            <AlertDescription>
              Immediate attention required
            </AlertDescription>
          </Alert>
        )}
        
        {warningAlerts > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{warningAlerts} Warning(s)</AlertTitle>
            <AlertDescription>
              Review within 2 hours
            </AlertDescription>
          </Alert>
        )}
        
        {alerts?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>All systems operational</p>
          </div>
        )}
        
        <div className="mt-4 space-y-2">
          {alerts?.slice(0, 5).map(alert => (
            <div key={alert.id} className="flex items-start gap-2 p-2 border rounded">
              <Badge variant={
                alert.severity === 'critical' ? 'destructive' :
                alert.severity === 'warning' ? 'default' :
                'secondary'
              }>
                {alert.severity}
              </Badge>
              <div className="flex-1">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dismissAlert(alert.id)}
              >
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Alert Rules

### Error Rate Monitoring

**Rule**: Trigger alert if error rate exceeds threshold

```sql
-- File: scripts/sql/monitoring/alert-rules.sql

-- Function to check error rate and create alert
CREATE OR REPLACE FUNCTION check_error_rate_threshold()
RETURNS void AS $$
DECLARE
  v_error_count BIGINT;
  v_threshold INTEGER := 5; -- From ALERT_THRESHOLDS
BEGIN
  -- Count errors in last hour
  SELECT COUNT(*) INTO v_error_count
  FROM error_logs
  WHERE occurred_at >= NOW() - INTERVAL '1 hour'
    AND severity IN ('high', 'critical');
  
  -- If threshold exceeded, create alert
  IF v_error_count > v_threshold THEN
    INSERT INTO system_alerts (
      alert_type,
      title,
      message,
      severity,
      metadata
    ) VALUES (
      'high_error_rate',
      'High Error Rate Detected',
      format('Detected %s errors in the last hour', v_error_count),
      'critical',
      jsonb_build_object(
        'error_count', v_error_count,
        'threshold', v_threshold,
        'time_window', '1 hour'
      )
    );
    
    -- Trigger notification function
    PERFORM send_alert_notification(
      'high_error_rate',
      'High Error Rate Detected',
      format('Detected %s errors in the last hour. Threshold is %s.', v_error_count, v_threshold)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Performance Degradation

**Rule**: Alert if response times exceed thresholds

```sql
CREATE OR REPLACE FUNCTION check_performance_degradation()
RETURNS void AS $$
DECLARE
  v_avg_duration NUMERIC;
  v_threshold INTEGER := 3000; -- 3 seconds
BEGIN
  -- Calculate average response time (last hour)
  SELECT AVG(duration_ms) INTO v_avg_duration
  FROM performance_metrics
  WHERE metric_type = 'edge_function'
    AND recorded_at >= NOW() - INTERVAL '1 hour';
  
  -- If threshold exceeded, create alert
  IF v_avg_duration > v_threshold THEN
    INSERT INTO system_alerts (
      alert_type,
      title,
      message,
      severity,
      metadata
    ) VALUES (
      'performance_degradation',
      'Performance Degradation Detected',
      format('Average response time: %sms (threshold: %sms)', ROUND(v_avg_duration), v_threshold),
      'warning',
      jsonb_build_object(
        'avg_duration_ms', v_avg_duration,
        'threshold_ms', v_threshold
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### SMS Delivery Failures

**Rule**: Alert if SMS failure rate is high

```sql
CREATE OR REPLACE FUNCTION check_sms_delivery_failures()
RETURNS void AS $$
DECLARE
  v_failed_count BIGINT;
  v_total_count BIGINT;
  v_failure_rate NUMERIC;
  v_threshold INTEGER := 10; -- 10% failure rate
BEGIN
  -- Count SMS in last hour
  SELECT 
    COUNT(*) FILTER (WHERE delivery_status = 'failed'),
    COUNT(*)
  INTO v_failed_count, v_total_count
  FROM sms_delivery_log
  WHERE created_at >= NOW() - INTERVAL '1 hour';
  
  -- Skip if no SMS sent
  IF v_total_count = 0 THEN
    RETURN;
  END IF;
  
  v_failure_rate := (v_failed_count::NUMERIC / v_total_count) * 100;
  
  -- If threshold exceeded, create alert
  IF v_failure_rate > v_threshold THEN
    INSERT INTO system_alerts (
      alert_type,
      title,
      message,
      severity,
      metadata
    ) VALUES (
      'high_sms_failure_rate',
      'High SMS Failure Rate',
      format('%s of %s SMS messages failed (%s%%)', 
        v_failed_count, v_total_count, ROUND(v_failure_rate, 2)),
      'high',
      jsonb_build_object(
        'failed_count', v_failed_count,
        'total_count', v_total_count,
        'failure_rate', v_failure_rate
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Scheduled Monitoring

### Cron Jobs (Use pg_cron extension)

```sql
-- Run hourly checks
SELECT cron.schedule(
  'check-error-rate-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$ SELECT check_error_rate_threshold(); $$
);

SELECT cron.schedule(
  'check-performance-hourly',
  '15 * * * *', -- Every hour at minute 15
  $$ SELECT check_performance_degradation(); $$
);

SELECT cron.schedule(
  'check-sms-failures-hourly',
  '30 * * * *', -- Every hour at minute 30
  $$ SELECT check_sms_delivery_failures(); $$
);

-- Cleanup old logs daily
SELECT cron.schedule(
  'cleanup-rate-limits-daily',
  '0 2 * * *', -- 2 AM daily
  $$ SELECT cleanup_rate_limit_logs(); $$
);

-- Weekly backup verification
SELECT cron.schedule(
  'verify-backup-weekly',
  '0 1 * * 0', -- 1 AM every Sunday
  $$ SELECT verify_latest_backup(); $$
);
```

### Edge Function for Monitoring

**File**: `supabase/functions/check-alert-triggers/index.ts`

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Running alert checks...');

    // Run all monitoring functions
    await supabase.rpc('check_error_rate_threshold');
    await supabase.rpc('check_performance_degradation');
    await supabase.rpc('check_sms_delivery_failures');

    // Check for new unread alerts
    const { data: unreadAlerts } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (unreadAlerts && unreadAlerts.length > 0) {
      console.log(`📢 Found ${unreadAlerts.length} unread alerts`);
      
      // Send notifications for critical alerts
      for (const alert of unreadAlerts) {
        if (alert.severity === 'critical') {
          await sendCriticalAlert(alert);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        unreadAlerts: unreadAlerts?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error checking alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendCriticalAlert(alert: any) {
  const alertRecipients = Deno.env.get('ALERT_EMAIL_RECIPIENTS');
  
  if (alertRecipients) {
    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const { Resend } = await import('npm:resend@latest');
      const resend = new Resend(resendApiKey);
      
      await resend.emails.send({
        from: `${Deno.env.get('FROM_NAME') || 'ACE Engage'} <${Deno.env.get('FROM_EMAIL') || 'alerts@mobulace.com'}>`,
        to: alertRecipients.split(','),
        subject: `🚨 CRITICAL ALERT: ${alert.title}`,
        html: buildAlertEmailHtml(alert)
      });
    }
  }
  
  // Send to Slack
  const slackWebhook = Deno.env.get('ALERT_SLACK_WEBHOOK_URL');
  if (slackWebhook) {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: alert.title,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 ${alert.title}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: alert.message
            }
          },
          {
            type: 'context',
            elements: [{
              type: 'mrkdwn',
              text: `Severity: *${alert.severity}* | Type: ${alert.alert_type}`
            }]
          }
        ]
      })
    });
  }
}

function buildAlertEmailHtml(alert: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert-critical { border-left: 4px solid #ef4444; padding-left: 20px; }
        .alert-warning { border-left: 4px solid #f59e0b; padding-left: 20px; }
        .metadata { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="alert-${alert.severity}">
          <h1>${alert.title}</h1>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Type:</strong> ${alert.alert_type}</p>
          <p><strong>Message:</strong></p>
          <p>${alert.message}</p>
        </div>
        
        ${alert.metadata && Object.keys(alert.metadata).length > 0 ? `
          <div class="metadata">
            <h3>Additional Details:</h3>
            <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Alert ID: ${alert.id}</p>
          <p>Created: ${alert.created_at}</p>
          <p>ACE Engage Platform Monitoring System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

---

## Metrics Collection

### Frontend Performance Tracking

```typescript
// File: src/lib/monitoring/performance-tracker.ts

export async function trackPerformance(
  metricName: string,
  duration: number,
  metadata?: any
) {
  try {
    await supabase.from('performance_metrics').insert({
      metric_type: 'page_load',
      metric_name: metricName,
      duration_ms: Math.round(duration),
      metadata,
      client_id: getCurrentClientId()
    });
  } catch (error) {
    console.error('Failed to track performance:', error);
  }
}

// Usage
const startTime = performance.now();

// ... page load or operation ...

const duration = performance.now() - startTime;
trackPerformance('dashboard_load', duration, {
  route: window.location.pathname
});
```

### Edge Function Performance

```typescript
// Add to all edge functions
const startTime = Date.now();

try {
  // Function logic
  
  const duration = Date.now() - startTime;
  
  // Log performance
  await supabase.from('performance_metrics').insert({
    metric_type: 'edge_function',
    metric_name: 'FUNCTION_NAME',
    duration_ms: duration
  });
  
} catch (error) {
  const duration = Date.now() - startTime;
  
  // Log error with duration
  await supabase.from('error_logs').insert({
    severity: 'high',
    category: 'api',
    message: error.message,
    function_name: 'FUNCTION_NAME',
    error_details: { duration_ms: duration }
  });
}
```

---

## Dashboard Widgets

### Error Rate Widget

```typescript
export function ErrorRateWidget() {
  const { data: errorRate } = useQuery({
    queryKey: ['error-rate'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_error_rate', {
        p_time_window_minutes: 60
      });
      return data;
    },
    refetchInterval: 60000 // Every minute
  });
  
  const rate = errorRate?.[0]?.errors_per_minute || 0;
  const threshold = 0.5; // 0.5 errors per minute = 30 per hour
  const status = rate < threshold ? 'healthy' : 'warning';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {rate.toFixed(2)} <span className="text-sm text-muted-foreground">/ min</span>
        </div>
        <Badge variant={status === 'healthy' ? 'default' : 'destructive'}>
          {status}
        </Badge>
      </CardContent>
    </Card>
  );
}
```

### Active Users Widget

```typescript
export function ActiveUsersWidget() {
  const { data: activeUsers } = useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const { count } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
      return count || 0;
    },
    refetchInterval: 30000
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Users (15min)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{activeUsers}</div>
      </CardContent>
    </Card>
  );
}
```

---

## Alert Testing

### Test Alert System

**Script**: `scripts/test-alerts.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function testAlerts() {
  console.log('🧪 Testing alert system...\n');
  
  // Test 1: Create test alert
  console.log('Test 1: Creating test alert...');
  const { data: alert, error: alertError } = await supabase
    .from('system_alerts')
    .insert({
      alert_type: 'test_alert',
      title: 'Test Alert',
      message: 'This is a test alert from the monitoring system',
      severity: 'info',
      metadata: { test: true }
    })
    .select()
    .single();
  
  if (alertError) {
    console.error('❌ Failed to create alert:', alertError);
    return;
  }
  console.log('✅ Alert created:', alert.id);
  
  // Test 2: Trigger email notification
  console.log('\nTest 2: Sending email notification...');
  const { error: emailError } = await supabase.functions.invoke(
    'send-alert-notification',
    {
      body: {
        severity: 'info',
        title: 'Test Email Alert',
        message: 'Testing email alert delivery',
        category: 'system_test'
      }
    }
  );
  
  if (emailError) {
    console.error('❌ Failed to send email:', emailError);
  } else {
    console.log('✅ Email sent successfully');
  }
  
  // Test 3: Check if alert appears in dashboard
  console.log('\nTest 3: Verifying alert in dashboard...');
  const { data: alerts } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false });
  
  console.log(`✅ Found ${alerts?.length || 0} unread alerts`);
  
  // Cleanup test alert
  console.log('\nCleaning up test alert...');
  await supabase
    .from('system_alerts')
    .delete()
    .eq('id', alert.id);
  
  console.log('\n✅ Alert system test complete!');
}

testAlerts();
```

---

## Alert Configuration Checklist

- [ ] Email recipients configured
- [ ] Slack webhook configured (optional)
- [ ] Alert thresholds set appropriately
- [ ] Monitoring functions deployed
- [ ] Cron jobs scheduled
- [ ] Test alerts sent and received
- [ ] Alert dashboard accessible
- [ ] Team trained on alert response
- [ ] Escalation procedures documented
- [ ] Alert fatigue prevention measures in place

---

**Last Updated**: December 2024  
**Owner**: DevOps Team



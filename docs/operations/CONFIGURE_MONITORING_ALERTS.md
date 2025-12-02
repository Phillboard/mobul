# Production Monitoring Alerts Configuration

## Overview
Configure email and Slack alerts for production monitoring and incident response.

## Alert Configuration Files

### 1. Alert Thresholds Configuration

Create/Update: `supabase/functions/send-alert-notification/index.ts`

```typescript
// Alert thresholds configuration
export const ALERT_THRESHOLDS = {
  // Error rates
  critical_errors_per_hour: 5,
  high_errors_per_hour: 10,
  error_rate_percentage: 5, // 5% error rate triggers alert
  
  // Performance
  slow_response_time_ms: 3000, // 3 seconds
  slow_query_time_ms: 1000, // 1 second
  
  // SMS delivery
  failed_sms_per_hour: 10,
  sms_delivery_rate_threshold: 90, // Alert if below 90%
  
  // Gift cards (if not handled separately)
  low_inventory_threshold: 50,
  critical_inventory_threshold: 10,
  
  // Credit system
  low_credit_balance: 100,
  critical_credit_balance: 25,
  
  // Database
  database_size_threshold_gb: 8, // 80% of 10GB free tier
  connection_pool_threshold: 80, // 80% of connections used
  
  // Edge functions
  function_timeout_count: 5, // per hour
  function_error_rate: 10, // 10% error rate
};

// Alert recipients
export const ALERT_RECIPIENTS = {
  critical: process.env.ALERT_EMAIL_RECIPIENTS_CRITICAL || process.env.ALERT_EMAIL_RECIPIENTS,
  high: process.env.ALERT_EMAIL_RECIPIENTS || '',
  medium: process.env.ALERT_EMAIL_RECIPIENTS || '',
  slack: process.env.ALERT_SLACK_WEBHOOK_URL || '',
};
```

### 2. Environment Variables Setup

**Add to Supabase Dashboard → Settings → Edge Functions → Secrets**:

```bash
# Email Alerts
ALERT_EMAIL_RECIPIENTS=ops@company.com,admin@company.com,tech@company.com
ALERT_EMAIL_RECIPIENTS_CRITICAL=oncall@company.com,cto@company.com

# Slack Alerts
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_SLACK_CHANNEL=#production-alerts

# Alert Settings
ALERT_COOLDOWN_MINUTES=30
ALERT_ENABLED=true

# Monitoring Thresholds (override defaults)
CRITICAL_ERROR_THRESHOLD=5
LOW_INVENTORY_THRESHOLD=50
LOW_CREDIT_THRESHOLD=100
```

### 3. Slack Webhook Setup

**Steps**:
1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Navigate to "Incoming Webhooks"
4. Activate Incoming Webhooks
5. Click "Add New Webhook to Workspace"
6. Select channel (e.g., #production-alerts)
7. Copy webhook URL
8. Add to Supabase environment variables

**Test webhook**:
```powershell
$webhook = "YOUR_WEBHOOK_URL"
$body = @{
    text = "🚨 Test alert from ACE Engage monitoring system"
    blocks = @(
        @{
            type = "section"
            text = @{
                type = "mrkdwn"
                text = "*Test Alert*`n`nThis is a test alert to verify Slack integration is working correctly."
            }
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri $webhook -Method Post -Body $body -ContentType "application/json"
```

## Alert Types & Triggers

### Critical Alerts (Immediate Response)
- [ ] Database completely down
- [ ] All edge functions failing
- [ ] Critical error rate > 5/hour
- [ ] Gift card system completely failing
- [ ] SMS delivery 100% failure rate

**Recipients**: On-call engineer, CTO
**Channels**: Email + Slack + SMS (if configured)

### High Priority Alerts (30 min response)
- [ ] Major feature failing (SMS, campaigns, call center)
- [ ] Error rate > 5%
- [ ] Low gift card inventory (< 10 cards)
- [ ] Critical credit balance low
- [ ] Slow response times (> 3s average)

**Recipients**: Engineering team
**Channels**: Email + Slack

### Medium Priority (2 hour response)
- [ ] Elevated error rate (> 2%)
- [ ] Gift card inventory low (< 50 cards)
- [ ] SMS delivery rate below 95%
- [ ] Database approaching size limit
- [ ] Intermittent failures

**Recipients**: Engineering team
**Channels**: Slack

### Low Priority (Next business day)
- [ ] Non-critical errors
- [ ] Performance degradation (non-critical)
- [ ] Warning thresholds reached
- [ ] Maintenance reminders

**Recipients**: Engineering team
**Channels**: Slack

## Alert Monitoring Queries

### Error Rate Monitoring
```sql
-- Run every 5 minutes via cron job
SELECT 
  COUNT(*) as error_count,
  severity,
  category
FROM error_logs
WHERE occurred_at >= NOW() - INTERVAL '1 hour'
  AND resolved = FALSE
GROUP BY severity, category
HAVING COUNT(*) > 5;

-- If results returned, trigger alert
```

### SMS Delivery Monitoring
```sql
-- Check SMS delivery rate
SELECT 
  COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed,
  COUNT(*) as total,
  (COUNT(*) FILTER (WHERE delivery_status = 'delivered')::FLOAT / COUNT(*) * 100) as delivery_rate
FROM sms_delivery_log
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Alert if delivery_rate < 90%
```

### Performance Monitoring
```sql
-- Check slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
  AND calls > 10
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Alert if any queries > 3000ms
```

## Automated Monitoring Setup

### Create Monitoring Function
```sql
-- File: supabase/migrations/create_monitoring_alerts.sql

CREATE OR REPLACE FUNCTION check_system_health_and_alert()
RETURNS void AS $$
DECLARE
  v_error_count INTEGER;
  v_critical_errors INTEGER;
  v_sms_delivery_rate NUMERIC;
BEGIN
  -- Check error rate
  SELECT COUNT(*) INTO v_error_count
  FROM error_logs
  WHERE occurred_at >= NOW() - INTERVAL '1 hour'
    AND resolved = FALSE;
    
  SELECT COUNT(*) INTO v_critical_errors
  FROM error_logs
  WHERE occurred_at >= NOW() - INTERVAL '1 hour'
    AND severity = 'critical'
    AND resolved = FALSE;
  
  -- Trigger alert if thresholds exceeded
  IF v_critical_errors >= 5 THEN
    PERFORM send_alert('critical', 'Critical errors detected', 
      format('Found %s critical errors in the last hour', v_critical_errors));
  ELSIF v_error_count >= 20 THEN
    PERFORM send_alert('high', 'Elevated error rate', 
      format('Found %s errors in the last hour', v_error_count));
  END IF;
  
  -- Check SMS delivery
  SELECT 
    (COUNT(*) FILTER (WHERE delivery_status = 'delivered')::FLOAT / 
     NULLIF(COUNT(*), 0) * 100) INTO v_sms_delivery_rate
  FROM sms_delivery_log
  WHERE created_at >= NOW() - INTERVAL '1 hour';
  
  IF v_sms_delivery_rate < 90 AND v_sms_delivery_rate > 0 THEN
    PERFORM send_alert('high', 'Low SMS delivery rate',
      format('SMS delivery rate: %.2f%%', v_sms_delivery_rate));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule to run every 5 minutes
-- (Requires pg_cron extension)
SELECT cron.schedule(
  'system-health-check',
  '*/5 * * * *',
  $$SELECT check_system_health_and_alert()$$
);
```

### Send Alert Function
```sql
CREATE OR REPLACE FUNCTION send_alert(
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT
)
RETURNS void AS $$
BEGIN
  -- Insert into system_alerts
  INSERT INTO system_alerts (
    alert_type,
    title,
    message,
    severity,
    metadata
  ) VALUES (
    'automated_monitoring',
    p_title,
    p_message,
    p_severity,
    jsonb_build_object('timestamp', NOW())
  );
  
  -- Call edge function to send notifications
  -- This would typically be done via a trigger or scheduled job
END;
$$ LANGUAGE plpgsql;
```

## Alert Message Templates

### Critical Alert Template
```
🚨 CRITICAL ALERT

Title: [ALERT_TITLE]
Severity: CRITICAL
Time: [TIMESTAMP]

Description:
[ALERT_DESCRIPTION]

Impact:
[IMPACT_DESCRIPTION]

Immediate Actions Required:
1. Check system status dashboard
2. Review error logs
3. Contact on-call engineer if not already notified

Dashboard: https://app.yourapp.com/admin/system-health
Logs: https://app.yourapp.com/admin/error-logs

Incident Channel: #incident-[DATE]
```

### High Priority Template
```
⚠️ HIGH PRIORITY ALERT

Title: [ALERT_TITLE]
Severity: HIGH
Time: [TIMESTAMP]

Description:
[ALERT_DESCRIPTION]

Recommended Actions:
[ACTION_ITEMS]

Dashboard: https://app.yourapp.com/admin/system-health
```

### Medium Priority Template
```
ℹ️ MONITORING ALERT

Title: [ALERT_TITLE]
Severity: MEDIUM
Time: [TIMESTAMP]

[ALERT_DESCRIPTION]

Review when convenient.
Dashboard: https://app.yourapp.com/admin/system-health
```

## Testing Alerts

### Test Email Alerts
```powershell
# Send test email via edge function
$body = @{
  to = "your-email@company.com"
  subject = "Test Alert from ACE Engage"
  html = "<h1>Test Alert</h1><p>If you receive this, email alerts are working correctly.</p>"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "$env:VITE_SUPABASE_URL/functions/v1/send-email" `
  -Method Post `
  -Headers @{ "Authorization" = "Bearer $env:VITE_SUPABASE_ANON_KEY" } `
  -Body $body `
  -ContentType "application/json"
```

### Test Slack Alerts
```powershell
# Already shown above in Slack Webhook Setup section
```

### Test Alert Triggers
```sql
-- Manually trigger test alert
INSERT INTO error_logs (
  severity,
  category,
  message,
  error_details
) VALUES (
  'critical',
  'unknown',
  'Test critical error for alert testing',
  '{"test": true}'::jsonb
);

-- Insert enough to trigger alert threshold
INSERT INTO error_logs (severity, category, message)
SELECT 'critical', 'unknown', 'Test error ' || generate_series
FROM generate_series(1, 6);

-- Check if alert was triggered
SELECT * FROM system_alerts 
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

## Monitoring Dashboard

### System Health Page Updates
Add to `src/pages/SystemHealth.tsx`:

```typescript
// Real-time alert display
const { data: activeAlerts } = useQuery({
  queryKey: ['active-alerts'],
  queryFn: async () => {
    const { data } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('dismissed', false)
      .order('created_at', { ascending: false });
    return data;
  },
  refetchInterval: 30000, // Refresh every 30 seconds
});

// Critical metrics
const { data: criticalMetrics } = useQuery({
  queryKey: ['critical-metrics'],
  queryFn: async () => {
    const { data: errorRate } = await supabase.rpc('get_error_rate', {
      p_time_window_minutes: 60
    });
    
    return {
      errorRate: errorRate?.[0],
      // Add other metrics
    };
  },
  refetchInterval: 60000,
});
```

## Success Criteria

- [ ] Email alerts configured and tested
- [ ] Slack webhook configured and tested
- [ ] Alert thresholds set appropriately
- [ ] Monitoring queries created
- [ ] Automated monitoring function deployed
- [ ] Alert templates documented
- [ ] System Health dashboard shows alerts
- [ ] Team trained on alert response
- [ ] Escalation procedures documented

## Next Steps

1. Configure PagerDuty or similar (optional)
2. Set up SMS alerts for critical issues
3. Create on-call rotation schedule
4. Document alert response procedures
5. Review and adjust thresholds weekly

## Recording Configuration

Create file: `MONITORING_ALERTS_CONFIG.md`

```markdown
# Monitoring Alerts Configuration Log

## Date: YYYY-MM-DD
## Configured by: YOUR_NAME

### Email Configuration
- Recipients configured: ✅
- Test email sent: ✅
- Email template customized: ✅

### Slack Configuration
- Webhook URL configured: ✅
- Channel: #production-alerts
- Test message sent: ✅

### Alert Thresholds
- Critical errors: 5/hour
- Error rate: 5%
- SMS delivery: 90%
- Low inventory: 50 cards

### Monitoring Queries
- Error rate monitoring: ✅
- SMS delivery monitoring: ✅
- Performance monitoring: ✅
- Automated function: ✅

### Testing Results
- Email alerts: ✅ Working
- Slack alerts: ✅ Working
- Threshold triggers: ✅ Tested
- Dashboard display: ✅ Working

### Team Training
- [x] Engineering team trained
- [x] On-call rotation established
- [x] Response procedures documented
```


# Gift Card Redemption - Monitoring & Alerting Setup

> ⚠️ **Prerequisites:** Complete [CONFIGURATION_SETUP.md](./CONFIGURATION_SETUP.md) first to configure alert recipients.

## Overview

This guide provides SQL queries and configurations for monitoring the gift card redemption system in production.

**Alert Channels** (configured via environment variables):
- **Slack:** `${ALERT_SLACK_WEBHOOK_URL}` → Channels: `#redemption-critical`, `#redemption-alerts`, `#redemption-daily`
- **Email:** `${ALERT_EMAIL_RECIPIENTS}` (comma-separated list)

[→ Configure Alert Recipients](./CONFIGURATION_SETUP.md)

---

## Real-Time Dashboard Queries

### 1. Redemption Health Dashboard

**Refresh: Every 30 seconds**

```sql
-- Redemptions Last Hour (by status)
SELECT 
  DATE_TRUNC('minute', claimed_at) as minute,
  COUNT(*) as redemptions
FROM gift_cards
WHERE claimed_at > NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute;

-- Success Rate (Last 24 Hours)
SELECT 
  ROUND(
    COUNT(CASE WHEN status = 'claimed' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0),
    2
  ) as success_rate,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'claimed' THEN 1 END) as successful,
  COUNT(CASE WHEN status != 'claimed' THEN 1 END) as failed
FROM (
  SELECT id, status, claimed_at
  FROM gift_cards
  WHERE claimed_at > NOW() - INTERVAL '24 hours'
  UNION ALL
  SELECT id, 'failed' as status, occurred_at as claimed_at
  FROM error_logs
  WHERE error_type = 'redemption_failed'
  AND occurred_at > NOW() - INTERVAL '24 hours'
) AS all_attempts;

-- Average Redemption Time (Last Hour)
WITH redemption_times AS (
  SELECT 
    gc.claimed_at,
    EXTRACT(EPOCH FROM (gc.claimed_at - el.occurred_at)) as duration_seconds
  FROM gift_cards gc
  JOIN error_logs el ON el.request_data->>'gift_card_id' = gc.id::text
  WHERE gc.claimed_at > NOW() - INTERVAL '1 hour'
  AND el.error_type = 'redemption_start'
)
SELECT 
  ROUND(AVG(duration_seconds), 2) as avg_seconds,
  ROUND(MIN(duration_seconds), 2) as min_seconds,
  ROUND(MAX(duration_seconds), 2) as max_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_seconds), 2) as p95_seconds
FROM redemption_times;
-- Target: avg <2s, p95 <5s
```

---

### 2. SMS Delivery Dashboard

**Refresh: Every 60 seconds**

```sql
-- SMS Delivery Rate (Last 24 Hours)
SELECT 
  delivery_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM sms_delivery_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY delivery_status
ORDER BY count DESC;
-- Target: >98% 'sent' or 'delivered'

-- SMS Retry Effectiveness
SELECT 
  retry_count,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as successful,
  ROUND(
    COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0),
    2
  ) as success_rate
FROM sms_delivery_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY retry_count
ORDER BY retry_count;

-- Failed SMS by Error Type
SELECT 
  SUBSTRING(error_message, 1, 50) as error_summary,
  COUNT(*) as occurrence_count
FROM sms_delivery_log
WHERE delivery_status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_summary
ORDER BY occurrence_count DESC
LIMIT 10;

-- SMS Delivery Time Distribution
SELECT 
  CASE
    WHEN EXTRACT(EPOCH FROM (delivered_at - created_at)) <= 10 THEN '0-10s'
    WHEN EXTRACT(EPOCH FROM (delivered_at - created_at)) <= 30 THEN '11-30s'
    WHEN EXTRACT(EPOCH FROM (delivered_at - created_at)) <= 60 THEN '31-60s'
    WHEN EXTRACT(EPOCH FROM (delivered_at - created_at)) <= 300 THEN '1-5min'
    ELSE '>5min'
  END as delivery_time_bucket,
  COUNT(*) as count
FROM sms_delivery_log
WHERE delivered_at IS NOT NULL
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY delivery_time_bucket
ORDER BY 
  CASE delivery_time_bucket
    WHEN '0-10s' THEN 1
    WHEN '11-30s' THEN 2
    WHEN '31-60s' THEN 3
    WHEN '1-5min' THEN 4
    ELSE 5
  END;
```

---

### 3. Pool Inventory Dashboard

**Refresh: Every 30 seconds**

```sql
-- Real-Time Pool Status
SELECT 
  id,
  pool_name,
  available_cards,
  claimed_cards,
  total_cards,
  low_stock_threshold,
  ROUND(available_cards * 100.0 / NULLIF(total_cards, 0), 2) as utilization_pct,
  CASE
    WHEN available_cards = 0 THEN '🔴 EMPTY'
    WHEN available_cards <= low_stock_threshold THEN '🟡 LOW'
    WHEN available_cards <= low_stock_threshold * 2 THEN '🟢 OK'
    ELSE '🟢 FULL'
  END as status,
  provider,
  purchase_method
FROM gift_card_pools
ORDER BY available_cards ASC;

-- Pool Depletion Rate (Cards per Hour)
WITH hourly_usage AS (
  SELECT 
    gc.pool_id,
    DATE_TRUNC('hour', gc.claimed_at) as hour,
    COUNT(*) as cards_used
  FROM gift_cards gc
  WHERE claimed_at > NOW() - INTERVAL '24 hours'
  GROUP BY gc.pool_id, hour
)
SELECT 
  p.pool_name,
  p.available_cards,
  ROUND(AVG(hu.cards_used), 2) as avg_cards_per_hour,
  CASE
    WHEN AVG(hu.cards_used) > 0 THEN
      ROUND(p.available_cards / AVG(hu.cards_used), 2)
    ELSE NULL
  END as hours_until_empty
FROM gift_card_pools p
LEFT JOIN hourly_usage hu ON hu.pool_id = p.id
GROUP BY p.id, p.pool_name, p.available_cards
ORDER BY hours_until_empty NULLS LAST;

-- Pool Performance Metrics
SELECT 
  p.pool_name,
  COUNT(gc.id) as total_redeemed,
  COUNT(CASE WHEN sdl.delivery_status = 'sent' THEN 1 END) as sms_delivered,
  ROUND(
    COUNT(CASE WHEN sdl.delivery_status = 'sent' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(gc.id), 0),
    2
  ) as delivery_success_rate
FROM gift_card_pools p
LEFT JOIN gift_cards gc ON gc.pool_id = p.id AND gc.claimed_at > NOW() - INTERVAL '24 hours'
LEFT JOIN sms_delivery_log sdl ON sdl.gift_card_id = gc.id
GROUP BY p.id, p.pool_name
ORDER BY total_redeemed DESC;
```

---

### 4. Error Tracking Dashboard

**Refresh: Every 60 seconds**

```sql
-- Error Rate by Type (Last Hour)
SELECT 
  error_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '1 hour'
GROUP BY error_type
ORDER BY count DESC
LIMIT 10;

-- Critical Errors (Last 24 Hours)
SELECT 
  error_type,
  error_code,
  error_message,
  COUNT(*) as occurrences,
  MAX(occurred_at) as last_occurred
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '24 hours'
AND error_code IN ('POOL_EMPTY', 'DATABASE_ERROR', 'API_FAILURE')
GROUP BY error_type, error_code, error_message
ORDER BY occurrences DESC;

-- Error Trend (Hourly)
SELECT 
  DATE_TRUNC('hour', occurred_at) as hour,
  error_type,
  COUNT(*) as error_count
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, error_type
ORDER BY hour DESC, error_count DESC;
```

---

### 5. Rate Limiting Dashboard

**Refresh: Every 5 minutes**

```sql
-- Current Rate Limit Status
SELECT 
  identifier as ip_address,
  action,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt,
  CASE
    WHEN COUNT(*) >= 20 THEN '🔴 BLOCKED'
    WHEN COUNT(*) >= 10 THEN '🟡 WARNING'
    ELSE '🟢 OK'
  END as status
FROM rate_limit_tracking
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier, action
HAVING COUNT(*) >= 5
ORDER BY attempts DESC;

-- Suspicious Activity Detection
SELECT 
  identifier as ip_address,
  COUNT(DISTINCT action) as unique_actions,
  COUNT(*) as total_attempts,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  ARRAY_AGG(DISTINCT action) as actions
FROM rate_limit_tracking
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier
HAVING COUNT(*) > 50
ORDER BY total_attempts DESC;

-- Rate Limit Effectiveness
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT identifier) as unique_ips,
  ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT identifier), 2) as avg_attempts_per_ip
FROM rate_limit_tracking
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

### 6. System Health Dashboard

**Refresh: Every 30 seconds**

```sql
-- Database Connection Health
SELECT 
  COUNT(*) as active_connections,
  COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries,
  COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
  MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as longest_query_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- Table Sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('gift_cards', 'gift_card_pools', 'sms_delivery_log', 'rate_limit_tracking')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Stuck Cards Count
SELECT 
  COUNT(*) as stuck_cards_count,
  MAX(claimed_at) as oldest_stuck_card
FROM gift_cards
WHERE status = 'claimed'
AND claimed_at < NOW() - INTERVAL '15 minutes'
AND id NOT IN (
  SELECT gift_card_id 
  FROM sms_delivery_log 
  WHERE delivery_status IN ('sent', 'delivered')
);
-- Target: 0

-- Cron Job Status
SELECT 
  jobname,
  schedule,
  active,
  last_run,
  next_run,
  CASE
    WHEN last_run IS NULL THEN '⚪ NEVER RUN'
    WHEN last_run < NOW() - INTERVAL '30 minutes' AND schedule ~ '\*/5' THEN '🔴 OVERDUE'
    WHEN last_run < NOW() - INTERVAL '1 hour' AND schedule ~ '\*/10' THEN '🔴 OVERDUE'
    ELSE '🟢 OK'
  END as status
FROM cron.job
WHERE jobname LIKE '%gift%' OR jobname LIKE '%sms%';
```

---

## Alert Configurations

> **Note:** Alert recipients are configured in [CONFIGURATION_SETUP.md](./CONFIGURATION_SETUP.md)
> - Critical alerts → `${ALERT_EMAIL_RECIPIENTS}` + Slack `#redemption-critical`
> - Warning alerts → `${ALERT_EMAIL_RECIPIENTS}` + Slack `#redemption-alerts`
> - Info alerts → Slack `#redemption-daily` + Email distribution list

### Critical Alerts (Immediate Response Required)

**Alert 1: Pool Empty**
```sql
-- Run every 1 minute
SELECT 
  id,
  pool_name,
  available_cards
FROM gift_card_pools
WHERE available_cards = 0
AND active = true;

-- If any results, trigger:
-- - Slack: #redemption-critical
-- - Email: ${ALERT_EMAIL_RECIPIENTS}
-- - PagerDuty: Incident creation (if configured)
```

**Alert 2: High Error Rate**
```sql
-- Run every 5 minutes
WITH error_rate AS (
  SELECT 
    COUNT(*) as error_count
  FROM error_logs
  WHERE occurred_at > NOW() - INTERVAL '5 minutes'
  AND error_type IN ('redemption_failed', 'database_error', 'api_failure')
)
SELECT error_count
FROM error_rate
WHERE error_count > 10;

-- If triggered:
-- - Slack: #redemption-critical
-- - Page on-call engineer
```

**Alert 3: SMS Delivery Failure Spike**
```sql
-- Run every 5 minutes
WITH sms_stats AS (
  SELECT 
    COUNT(*) as total_sms,
    COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed_sms,
    ROUND(
      COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0),
      2
    ) as failure_rate
  FROM sms_delivery_log
  WHERE created_at > NOW() - INTERVAL '5 minutes'
)
SELECT failure_rate
FROM sms_stats
WHERE failure_rate > 20;

-- If triggered:
-- - Slack: #redemption-alerts
-- - Email: ${ALERT_EMAIL_RECIPIENTS} (SMS monitoring team)
```

---

### Warning Alerts (Response within 30 minutes)

**Alert 4: Low Pool Inventory**
```sql
-- Run every 10 minutes
SELECT 
  id,
  pool_name,
  available_cards,
  low_stock_threshold
FROM gift_card_pools
WHERE available_cards <= low_stock_threshold
AND available_cards > 0;

-- If triggered:
-- - Slack: #redemption-alerts
-- - Email: ${ALERT_EMAIL_RECIPIENTS} (inventory team)
```

**Alert 5: Stuck Cards Detected**
```sql
-- Run every 10 minutes
WITH stuck_cards AS (
  SELECT COUNT(*) as stuck_count
  FROM gift_cards
  WHERE status = 'claimed'
  AND claimed_at < NOW() - INTERVAL '15 minutes'
  AND id NOT IN (
    SELECT gift_card_id 
    FROM sms_delivery_log 
    WHERE delivery_status IN ('sent', 'delivered')
  )
)
SELECT stuck_count
FROM stuck_cards
WHERE stuck_count > 5;

-- If triggered:
-- - Slack: #redemption-alerts
-- - Email: ops@company.com
```

**Alert 6: Cron Job Failure**
```sql
-- Run every 15 minutes
SELECT 
  jobname,
  last_run,
  schedule
FROM cron.job
WHERE (jobname LIKE '%gift%' OR jobname LIKE '%sms%')
AND (
  (schedule ~ '\*/5' AND last_run < NOW() - INTERVAL '15 minutes')
  OR
  (schedule ~ '\*/10' AND last_run < NOW() - INTERVAL '30 minutes')
);

-- If any results:
-- - Slack: #redemption-alerts
-- - Email: ${ALERT_EMAIL_RECIPIENTS} (devops team)
```

---

### Info Alerts (FYI, no immediate action)

**Alert 7: Daily Summary Report**
```sql
-- Run daily at 9am
SELECT 
  -- Redemption Stats
  (SELECT COUNT(*) FROM gift_cards WHERE claimed_at > CURRENT_DATE) as total_redemptions,
  (SELECT COUNT(*) FROM sms_delivery_log WHERE delivery_status = 'sent' AND created_at > CURRENT_DATE) as sms_sent,
  ROUND(
    (SELECT COUNT(*) FROM sms_delivery_log WHERE delivery_status = 'sent' AND created_at > CURRENT_DATE) * 100.0 /
    NULLIF((SELECT COUNT(*) FROM sms_delivery_log WHERE created_at > CURRENT_DATE), 0),
    2
  ) as sms_success_rate,
  
  -- Error Stats
  (SELECT COUNT(*) FROM error_logs WHERE occurred_at > CURRENT_DATE) as total_errors,
  
  -- Pool Stats
  (SELECT COUNT(*) FROM gift_card_pools WHERE available_cards = 0) as empty_pools,
  (SELECT COUNT(*) FROM gift_card_pools WHERE available_cards <= low_stock_threshold) as low_pools;

-- Send to:
-- - Email: ${ALERT_EMAIL_RECIPIENTS} (daily summary)
-- - Slack: #redemption-daily
```

---

## Slack Webhook Integration

### Setup Slack Alerts

**1. Create Incoming Webhook**
- Go to Slack App Settings
- Create webhook for #redemption-alerts channel
- Copy webhook URL

**2. Store in Supabase Secrets**
```bash
# Via Lovable interface
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**3. Test Alert**
```javascript
// In send-inventory-alert edge function
const slackWebhook = Deno.env.get('ALERT_SLACK_WEBHOOK_URL');

await fetch(slackWebhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '🚨 CRITICAL: Gift Card Pool Empty',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Pool Empty Alert'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Pool:* ${poolName}\n*Available Cards:* ${availableCards}\n*Action:* Upload cards immediately`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Pool'
            },
            url: `${Deno.env.get('APP_URL') || 'https://yourapp.lovable.app'}/gift-cards/pools/${poolId}`
          }
        ]
      }
    ]
  })
});
```

---

## Performance Baselines

### Expected Metrics (Production)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Redemption Success Rate | 99.5%+ | <95% |
| SMS Delivery Rate | 98%+ | <90% |
| Average Redemption Time | <2s | >5s |
| P95 Redemption Time | <5s | >10s |
| Pool Exhaustion Rate | 0% | >1% |
| Stuck Card Rate | <0.1% | >1% |
| Rate Limit False Positives | <0.1% | >1% |
| Database Query Time | <100ms | >500ms |
| Cron Job Success Rate | 100% | <99% |

---

## Monitoring Checklist

### Daily
- [ ] Review dashboard for anomalies
- [ ] Check SMS delivery rate (>98%)
- [ ] Verify no stuck cards
- [ ] Review error logs
- [ ] Check pool inventory levels

### Weekly
- [ ] Analyze redemption trends
- [ ] Review performance metrics
- [ ] Check cron job execution history
- [ ] Review rate limit logs
- [ ] Database health check (connections, size)

### Monthly
- [ ] Review alert effectiveness
- [ ] Optimize slow queries
- [ ] Update documentation
- [ ] Review and archive old data
- [ ] Capacity planning based on trends

---

## Grafana Dashboard (Optional)

If using Grafana, import this dashboard JSON:

```json
{
  "dashboard": {
    "title": "Gift Card Redemption System",
    "panels": [
      {
        "title": "Redemptions Per Minute",
        "type": "graph",
        "datasource": "PostgreSQL",
        "targets": [
          {
            "rawSql": "SELECT DATE_TRUNC('minute', claimed_at) as time, COUNT(*) as value FROM gift_cards WHERE claimed_at > NOW() - INTERVAL '1 hour' GROUP BY time ORDER BY time"
          }
        ]
      },
      {
        "title": "Pool Inventory",
        "type": "stat",
        "datasource": "PostgreSQL",
        "targets": [
          {
            "rawSql": "SELECT pool_name, available_cards FROM gift_card_pools ORDER BY available_cards"
          }
        ]
      },
      {
        "title": "SMS Success Rate",
        "type": "gauge",
        "datasource": "PostgreSQL",
        "targets": [
          {
            "rawSql": "SELECT ROUND(COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) * 100.0 / COUNT(*), 2) as value FROM sms_delivery_log WHERE created_at > NOW() - INTERVAL '1 hour'"
          }
        ]
      }
    ]
  }
}
```

---

## Export & Backup

### Daily Backup Scripts

```sql
-- Backup critical tables
COPY (SELECT * FROM gift_cards WHERE claimed_at > CURRENT_DATE - INTERVAL '7 days') 
TO '/backup/gift_cards_$(date +%Y%m%d).csv' CSV HEADER;

COPY (SELECT * FROM sms_delivery_log WHERE created_at > CURRENT_DATE - INTERVAL '7 days') 
TO '/backup/sms_log_$(date +%Y%m%d).csv' CSV HEADER;

COPY (SELECT * FROM error_logs WHERE occurred_at > CURRENT_DATE - INTERVAL '7 days') 
TO '/backup/errors_$(date +%Y%m%d).csv' CSV HEADER;
```

---

**Setup Complete:** Run all queries to verify monitoring is working, then schedule alerts based on your incident response requirements.

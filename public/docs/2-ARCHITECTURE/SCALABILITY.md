# Scalability & Performance

## Overview

The Mobul ACE Platform is designed to scale from prototype to production with millions of users, handling high-volume direct mail campaigns, real-time call tracking, and gift card redemptions at enterprise scale.

---

## Database Performance

### Indexing Strategy

Critical indexes for performance optimization:

```sql
-- Campaign queries
CREATE INDEX idx_campaigns_client_status ON campaigns(client_id, status);
CREATE INDEX idx_campaigns_mail_date ON campaigns(mail_date) WHERE status = 'mailed';

-- Recipient lookups
CREATE INDEX idx_recipients_token ON recipients(redemption_token);
CREATE INDEX idx_recipients_campaign ON recipients(campaign_id, status);

-- Call tracking
CREATE INDEX idx_call_sessions_campaign_date ON call_sessions(campaign_id, call_started_at);
CREATE INDEX idx_call_sessions_caller ON call_sessions(caller_phone, campaign_id);

-- Gift card queries
CREATE INDEX idx_gift_cards_pool_status ON gift_cards(pool_id, status) WHERE status = 'available';
CREATE INDEX idx_gift_cards_redemption ON gift_cards(redemption_code) WHERE status IN ('claimed', 'delivered');

-- Analytics queries
CREATE INDEX idx_events_campaign_type_date ON events(campaign_id, event_type, created_at);
```

### Table Partitioning

Large tables are partitioned by date for query performance:

```sql
-- Partition events table by month
CREATE TABLE events_2024_01 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

Benefits:
- **Faster queries** - Only scans relevant partitions
- **Easier archival** - Drop old partitions without VACUUM
- **Better maintenance** - Index rebuilds per partition

---

## Caching Strategy

### Edge Function Caching

```typescript
// Cache template data for 5 minutes
const { data, error } = await supabase
  .from('templates')
  .select('*')
  .eq('id', templateId)
  .single();

// Set cache headers
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, s-maxage=300',
  },
});
```

### Client-Side Caching

TanStack Query provides automatic caching:

```typescript
const { data: campaigns } = useQuery({
  queryKey: ['campaigns', clientId],
  queryFn: fetchCampaigns,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});
```

### Cache Invalidation

```typescript
// Invalidate after mutation
const mutation = useMutation({
  mutationFn: updateCampaign,
  onSuccess: () => {
    queryClient.invalidateQueries(['campaigns']);
  },
});
```

---

## Batch Operations

### Bulk Recipient Creation

```typescript
// Insert 10,000 recipients in batches of 1,000
const batchSize = 1000;
for (let i = 0; i < recipients.length; i += batchSize) {
  const batch = recipients.slice(i, i + batchSize);
  
  await supabase
    .from('recipients')
    .insert(batch);
}
```

### Bulk Gift Card Assignment

```sql
-- Assign gift cards to recipients in single query
UPDATE gift_cards
SET 
  status = 'claimed',
  recipient_id = assignments.recipient_id,
  claimed_at = NOW()
FROM (
  SELECT 
    gc.id as card_id,
    r.id as recipient_id
  FROM gift_cards gc
  CROSS JOIN LATERAL (
    SELECT id FROM recipients
    WHERE campaign_id = $1
      AND gift_card_id IS NULL
    ORDER BY created_at
    LIMIT 1
  ) r
  WHERE gc.pool_id = $2
    AND gc.status = 'available'
  LIMIT 1000
) assignments
WHERE gift_cards.id = assignments.card_id;
```

---

## Rate Limiting

### API Rate Limits

```typescript
// Edge Function: Implement rate limiting
const rateLimiter = {
  'redemption': { limit: 10, window: 60 }, // 10 per minute
  'api': { limit: 100, window: 60 }, // 100 per minute
  'webhook': { limit: 50, window: 60 }, // 50 per minute
};

async function checkRateLimit(
  key: string,
  type: keyof typeof rateLimiter
) {
  const config = rateLimiter[type];
  
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact' })
    .eq('key', key)
    .gte('created_at', new Date(Date.now() - config.window * 1000));
  
  if (count >= config.limit) {
    throw new Error('Rate limit exceeded');
  }
  
  // Log request
  await supabase
    .from('rate_limits')
    .insert({ key, type, created_at: new Date() });
}
```

### Redemption Throttling

```typescript
// Prevent redemption abuse
const REDEMPTION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

const { data: recentRedemption } = await supabase
  .from('gift_cards')
  .select('redeemed_at')
  .eq('recipient_id', recipientId)
  .gte('redeemed_at', new Date(Date.now() - REDEMPTION_COOLDOWN))
  .maybeSingle();

if (recentRedemption) {
  throw new Error('Please wait before redeeming another card');
}
```

---

## Data Retention

### Archival Strategy

| Data Type | Retention | Archive Method |
|-----------|-----------|----------------|
| Events | 2 years | Partition drop |
| Call Recordings | 1 year | Move to cold storage |
| Campaign Data | Indefinite | Keep all |
| Recipient Data | 3 years | Soft delete |
| Gift Card Logs | 7 years | Compliance requirement |
| Audit Logs | 5 years | Regulatory requirement |

### Automated Cleanup Jobs

```sql
-- Delete old events (runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS void AS $$
BEGIN
  DELETE FROM events
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule(
  'cleanup-events',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT cleanup_old_events()'
);
```

### Cold Storage Migration

```typescript
// Archive old call recordings to S3
const OLD_RECORDING_THRESHOLD = 365; // days

const { data: oldRecordings } = await supabase
  .from('call_sessions')
  .select('id, recording_url')
  .lt('call_started_at', new Date(Date.now() - OLD_RECORDING_THRESHOLD * 86400000))
  .not('recording_url', 'is', null);

for (const session of oldRecordings) {
  // Copy to cold storage
  await archiveToS3(session.recording_url, `cold-storage/${session.id}`);
  
  // Update with archive location
  await supabase
    .from('call_sessions')
    .update({ recording_url: `archive://${session.id}` })
    .eq('id', session.id);
}
```

---

## Monitoring & Alerts

### Query Performance Monitoring

```sql
-- Identify slow queries
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Capacity Planning

Monitor key metrics:

- **Database size growth** - Project when storage needs increase
- **Connection pool usage** - Prevent connection exhaustion
- **Cache hit ratio** - Optimize for >95% hit rate
- **API response times** - Maintain <200ms p95
- **Edge Function concurrency** - Scale before limits

### Alerting Thresholds

```typescript
const ALERT_THRESHOLDS = {
  database_size: 80, // % of capacity
  connection_pool: 90, // % of max connections
  api_latency_p95: 500, // milliseconds
  error_rate: 1, // % of requests
  gift_card_pool_depletion: 10, // % remaining
};
```

---

## Horizontal Scaling

### Database Scaling

- **Read replicas** - Distribute read queries across replicas
- **Connection pooling** - PgBouncer reduces connection overhead
- **Vertical scaling** - Increase CPU/memory for primary database

### Edge Function Scaling

- **Auto-scaling** - Deno Deploy automatically scales based on load
- **Global distribution** - Functions run close to users
- **Concurrent execution** - No cold starts, instant scale-up

### Storage Scaling

- **Unlimited capacity** - Supabase Storage scales automatically
- **CDN caching** - Assets served from edge locations
- **Compression** - Images optimized on upload

---

## Best Practices

1. **Use database indexes** - Index all foreign keys and frequently queried columns
2. **Implement pagination** - Never fetch unbounded result sets
3. **Cache aggressively** - Reduce database load with smart caching
4. **Batch operations** - Group inserts/updates for efficiency
5. **Monitor query performance** - Identify and optimize slow queries
6. **Archive old data** - Keep active dataset small
7. **Use rate limiting** - Prevent abuse and ensure fair usage
8. **Test at scale** - Load test before production deployment

---

## Related Documentation

- [Database Operations](/docs/developer-guide/database)
- [Edge Functions](/docs/developer-guide/edge-functions)
- [Security Architecture](/docs/architecture/security)
- [Monitoring & Alerts](/docs/features/analytics)

# Performance Optimization Guide

This guide covers the performance optimizations implemented in the ACE Engage platform to ensure fast response times and efficient resource usage.

## Table of Contents

1. [Database Optimizations](#database-optimizations)
2. [Edge Function Optimizations](#edge-function-optimizations)
3. [Frontend Optimizations](#frontend-optimizations)
4. [Monitoring Performance](#monitoring-performance)
5. [Troubleshooting Slow Performance](#troubleshooting-slow-performance)

---

## Database Optimizations

### Indexes

We maintain comprehensive indexes for all frequently queried columns. See migrations:

- `20251127100002_performance_indexes.sql` - Core indexes
- `20251203100001_additional_performance_indexes.sql` - Additional optimizations

#### Key Index Categories

1. **Campaign Queries**
   ```sql
   -- Active campaigns by client (most common query)
   CREATE INDEX idx_campaigns_active_client ON campaigns(client_id, updated_at DESC) 
   WHERE status = 'active';
   ```

2. **Recipient Lookups**
   ```sql
   -- By redemption code (call center verification)
   CREATE INDEX idx_recipients_redemption_code ON recipients(redemption_code) 
   WHERE redemption_code IS NOT NULL;
   ```

3. **Condition Evaluation**
   ```sql
   -- Fast condition lookup by sequence
   CREATE INDEX idx_campaign_conditions_campaign_seq 
   ON campaign_conditions(campaign_id, sequence_order);
   ```

4. **Monitoring Tables**
   ```sql
   -- Recent errors (dashboard queries)
   CREATE INDEX idx_error_logs_recent ON error_logs(occurred_at DESC);
   ```

### Query Optimization Patterns

**❌ Bad: N+1 Queries**
```typescript
// Fetches each campaign's recipients separately
const campaigns = await supabase.from('campaigns').select('*');
for (const campaign of campaigns) {
  const recipients = await supabase
    .from('recipients')
    .select('count')
    .eq('campaign_id', campaign.id);
}
```

**✅ Good: Single Query with Join**
```typescript
// Fetches all data in one query
const { data: campaigns } = await supabase
  .from('campaigns')
  .select(`
    *,
    recipients:recipients(count)
  `);
```

### Partial Indexes

We use partial indexes for common filter conditions:

```sql
-- Only index active campaigns (smaller, faster)
CREATE INDEX idx_campaigns_active ON campaigns(client_id) 
WHERE status = 'active';

-- Only index pending approvals
CREATE INDEX idx_recipients_pending ON recipients(audience_id) 
WHERE approval_status = 'pending';
```

### Maintenance Schedule

Run weekly:
```sql
-- Update statistics
ANALYZE campaigns;
ANALYZE recipients;
ANALYZE events;

-- Check for bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

---

## Edge Function Optimizations

### Connection Reuse

Supabase clients are expensive to create. Reuse them across requests:

```typescript
// ❌ Bad: New client per request
Deno.serve(async (req) => {
  const supabase = createClient(url, key); // Cold start penalty
  // ...
});

// ✅ Good: Reuse client
let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(url, key);
  }
  return supabase;
}

Deno.serve(async (req) => {
  const client = getClient(); // Instant after first request
  // ...
});
```

### In-Memory Caching

Cache frequently accessed data to reduce database queries:

```typescript
// Cache with TTL
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}
```

### Cache Strategy by Data Type

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Campaign Config | 5 min | Rarely changes during execution |
| Conditions | 1 min | May be updated by admin |
| User Roles | 10 min | Very stable |
| Gift Card Inventory | 30 sec | Needs to be fresh for availability |

### Performance Logging

Add timing to all critical functions:

```typescript
Deno.serve(async (req) => {
  const startTime = performance.now();
  
  try {
    // ... function logic ...
    
    const duration = performance.now() - startTime;
    console.log(`Function completed in ${duration.toFixed(2)}ms`);
    
    return new Response(JSON.stringify({ 
      success: true,
      performance: { durationMs: Math.round(duration) }
    }));
  } catch (error) {
    // ...
  }
});
```

---

## Frontend Optimizations

### Code Splitting

All non-critical pages are lazy-loaded:

```typescript
// src/App.tsx
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
// ... etc

// Use with Suspense
<Suspense fallback={<LoadingFallback />}>
  <Routes>
    <Route path="/campaigns" element={<Campaigns />} />
  </Routes>
</Suspense>
```

### React Query Configuration

Optimized defaults reduce unnecessary refetches:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 min before refetch
      gcTime: 10 * 60 * 1000,       // 10 min cache retention
      refetchOnWindowFocus: false,  // No refetch on tab focus
      retry: 1,                     // One retry on error
    },
  },
});
```

### Component Memoization

Use React.memo for expensive components:

```typescript
import { memo } from 'react';
import { propsAreEqual } from '@/lib/performance/react-utils';

export const CampaignCard = memo(({ campaign }) => {
  return <Card>...</Card>;
}, (prev, next) => {
  return prev.campaign.id === next.campaign.id &&
         prev.campaign.updated_at === next.campaign.updated_at;
});
```

### Available Performance Hooks

Located in `src/lib/performance/react-utils.ts`:

1. **useDebouncedValue** - Delay updates until user stops typing
2. **useThrottledCallback** - Limit callback frequency
3. **usePrevious** - Track previous prop values
4. **useStableCallback** - Avoid callback identity changes
5. **useIntersectionObserver** - Lazy load on scroll
6. **useMemoizedSelector** - Derived state optimization

---

## Monitoring Performance

### Key Metrics to Track

1. **Database Query Time**
   - Target: < 100ms for simple queries
   - Target: < 500ms for complex joins

2. **Edge Function Response**
   - Target: < 200ms for cached
   - Target: < 1000ms for cold start

3. **Frontend Load Time**
   - Target: < 2s Time to Interactive
   - Target: < 500ms for route changes

### Checking Query Performance

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Over 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Checking Index Usage

```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Find missing indexes (sequential scans on large tables)
SELECT schemaname, relname, seq_scan, seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 100
AND seq_tup_read > 10000
ORDER BY seq_tup_read DESC;
```

---

## Troubleshooting Slow Performance

### Symptom: Slow Page Load

**Check:**
1. Network tab - look for slow API calls
2. React Query devtools - check cache status
3. Component profiler - find slow renders

**Solutions:**
- Add pagination for large datasets
- Implement virtual scrolling for long lists
- Check for unnecessary re-renders

### Symptom: Slow API Response

**Check:**
1. Edge function logs for timing
2. Database query explain plans
3. Cache hit/miss ratio

**Solutions:**
- Add/verify indexes
- Enable caching
- Optimize query structure

### Symptom: Database Timeout

**Check:**
1. Running queries in pg_stat_activity
2. Lock contention
3. Resource utilization

**Solutions:**
```sql
-- Kill long-running query
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 minutes';

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;
```

### Performance Testing Checklist

Before deploying changes:

- [ ] Test with production-like data volume
- [ ] Run queries with EXPLAIN ANALYZE
- [ ] Check edge function cold start time
- [ ] Verify lazy loading works correctly
- [ ] Monitor memory usage patterns
- [ ] Test under concurrent load

---

## Best Practices Summary

1. **Always use indexes** for filtered/sorted columns
2. **Cache stable data** (campaigns, conditions, config)
3. **Lazy load pages** that aren't immediately needed
4. **Memoize expensive components** with React.memo
5. **Use React Query** for server state management
6. **Log performance metrics** in production
7. **Run maintenance** queries weekly
8. **Profile before optimizing** - measure, don't guess

---

*Last updated: December 2, 2025*


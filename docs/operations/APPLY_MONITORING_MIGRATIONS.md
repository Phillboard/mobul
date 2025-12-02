# Monitoring Migrations Application Guide

## Overview

This guide walks through applying critical error tracking and monitoring migrations to enable production-ready observability.

## Migrations to Apply

### 1. Error Tracking Tables (CRITICAL)
**File**: `supabase/migrations/20251201100000_create_error_tracking_tables.sql`
**Status**: ✅ File exists and is ready to apply
**Impact**: Creates error_logs and system_alerts tables for centralized monitoring

**What it creates**:
- `error_logs` table - Central error logging with severity, category, resolution tracking
- `system_alerts` table - System-level alerts for admins  
- RLS policies for secure access
- Helper functions: `get_error_rate()`, `get_critical_errors_needing_attention()`

**Safe to apply**: YES - Uses IF NOT EXISTS, won't break existing data

### 2. Performance Metrics (Check if exists)
**File**: `supabase/migrations/20251123185644_65119f0f-2134-425b-bbf2-d5e5be45ace9.sql`
**Status**: Need to check if already applied
**Impact**: Creates performance_metrics and usage_analytics tables

## Application Procedure

### Step 1: Backup Database
```bash
# In Supabase Dashboard:
# 1. Go to Database → Backups
# 2. Click "Create backup" (if available)
# 3. Note the timestamp for rollback if needed
```

### Step 2: Apply Error Tracking Migration

#### Method A: Via Supabase Dashboard (Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `20251201100000_create_error_tracking_tables.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Check for errors in output

#### Method B: Via Supabase CLI
```powershell
# From project root
supabase db push

# Or deploy specific migration
cd supabase
supabase migration up --file migrations/20251201100000_create_error_tracking_tables.sql
```

### Step 3: Verify Migration Success

Run these verification queries:

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('error_logs', 'system_alerts');

-- Should return 2 rows

-- Check functions were created
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_error_rate', 'get_critical_errors_needing_attention');

-- Should return 2 rows

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('error_logs', 'system_alerts');

-- Both should show rowsecurity = true

-- Test error logging
INSERT INTO error_logs (
  severity, category, message, error_details
) VALUES (
  'low', 'database', 'Test error log', '{"test": true}'::jsonb
);

-- Check it was inserted
SELECT COUNT(*) FROM error_logs WHERE message = 'Test error log';

-- Clean up test
DELETE FROM error_logs WHERE message = 'Test error log';
```

### Step 4: Update Frontend Error Boundary

Verify ErrorBoundary component logs to new table:

```typescript
// File: src/components/ErrorBoundary.tsx
// Should have this code:

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  logger.error('[ErrorBoundary] React error caught:', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });
  
  // Log to database
  supabase.from('error_logs').insert({
    severity: 'high',
    category: 'unknown',
    message: error.message,
    stack_trace: error.stack,
    error_details: {
      componentStack: errorInfo.componentStack,
      type: 'react_error'
    },
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent
    }
  });
}
```

### Step 5: Test Error Logging

```typescript
// Test in browser console (while logged in as admin):

// 1. Test manual error logging
await supabase.from('error_logs').insert({
  severity: 'low',
  category: 'api',
  message: 'Test API error',
  error_details: { endpoint: '/test', status: 500 }
});

// 2. Verify it appears in System Health page
// Navigate to /admin/system-health

// 3. Test error rate function
const { data, error } = await supabase.rpc('get_error_rate', {
  p_time_window_minutes: 60
});
console.log('Error rate:', data);

// 4. Test critical errors function  
const { data: criticalErrors } = await supabase.rpc(
  'get_critical_errors_needing_attention'
);
console.log('Critical errors:', criticalErrors);
```

## Rollback Plan

If migration causes issues:

```sql
-- Rollback script: scripts/sql/rollbacks/20241202_rollback_error_tracking.sql

BEGIN;

-- Drop functions
DROP FUNCTION IF EXISTS get_error_rate(INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_critical_errors_needing_attention();

-- Drop tables
DROP TABLE IF EXISTS system_alerts CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;

COMMIT;
```

## Post-Migration Tasks

### 1. Configure Alerting
Edit: `supabase/functions/send-alert-notification/index.ts`
Set thresholds:
```typescript
const ALERT_THRESHOLDS = {
  critical_errors_per_hour: 5,
  error_rate_threshold: 0.05, // 5%
};
```

### 2. Add to System Health Dashboard
Verify `src/pages/SystemHealth.tsx` shows error logs

### 3. Update Edge Functions
Add error logging to all edge functions:
```typescript
try {
  // Function logic
} catch (error) {
  await supabase.from('error_logs').insert({
    severity: 'high',
    category: 'edge_function',
    message: error.message,
    error_details: { function: 'FUNCTION_NAME' },
    context: { request: requestBody }
  });
  throw error;
}
```

## Success Criteria

- ✅ error_logs table exists and accepting inserts
- ✅ system_alerts table exists
- ✅ RLS policies active on both tables
- ✅ Helper functions return data
- ✅ Frontend ErrorBoundary logs to table
- ✅ System Health page displays errors
- ✅ No console errors when navigating app

## Next Steps

After successful deployment:
1. Monitor error_logs table for first 24 hours
2. Set up email/Slack alerts (next todo)
3. Apply remaining migrations (tags, comments, campaign enhancements)

## Troubleshooting

### Error: "relation error_logs already exists"
**Solution**: Migration already applied, skip to verification step

### Error: "function has_role does not exist"
**Solution**: Need to apply user roles migration first

### Error: "relation client_users does not exist"
**Solution**: RLS policy references missing table, safe to ignore if you don't use client_users

### Error: "permission denied for table error_logs"
**Solution**: RLS policies too restrictive, verify user has admin role

## Support

If issues persist:
1. Check migration order in verification results
2. Review RLS policies
3. Verify user roles table is populated
4. Test with service_role key to bypass RLS


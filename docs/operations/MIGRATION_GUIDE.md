# Migration Application Guide

## Overview

This guide provides step-by-step instructions for applying database migrations for the ACE Engage platform.

---

## Pre-Application Checklist

Before applying any migration:

- [ ] Create full database backup
- [ ] Review migration SQL file completely
- [ ] Check for DROP statements (data loss risk)
- [ ] Verify migration hasn't been applied already
- [ ] Test in development environment if possible
- [ ] Prepare rollback script
- [ ] Notify team of migration window

---

## Critical Migrations for Launch

### Priority 1: Error Tracking & Monitoring (APPLY FIRST)

**File**: `supabase/migrations/20251201100000_create_error_tracking_tables.sql`

**What it does**:
- Creates `error_logs` table for centralized error tracking
- Creates `system_alerts` table for system notifications
- Adds helper functions for error analysis
- Enables RLS policies for security

**How to apply**:

1. **Backup first**:
```bash
# In Supabase Dashboard: Settings → Database → Backups → Download
```

2. **Open Supabase SQL Editor**:
   - Go to SQL Editor in Supabase Dashboard
   - Create new query

3. **Copy migration content**:
```bash
# From your terminal
cat supabase/migrations/20251201100000_create_error_tracking_tables.sql
```

4. **Paste into SQL Editor and review**
   - Check for DROP statements (none in this migration)
   - Review RLS policies
   - Verify function definitions

5. **Execute migration**:
   - Click "Run"
   - Wait for completion
   - Check for errors in output

6. **Verify migration**:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('error_logs', 'system_alerts');

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_error_rate', 'get_critical_errors_needing_attention');

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('error_logs', 'system_alerts');
```

7. **Test error logging**:
```sql
-- Insert test error (as service role)
INSERT INTO error_logs (severity, category, message, error_details)
VALUES ('low', 'database', 'Test error', '{"test": true}'::jsonb);

-- Query errors
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 1;

-- Clean up test
DELETE FROM error_logs WHERE message = 'Test error';
```

**Expected results**:
- 2 new tables created
- 2 new functions created
- RLS enabled on both tables
- Can insert and query errors

---

### Priority 2: Rate Limiting System

**File**: `supabase/migrations/20251203000001_create_rate_limiting_system.sql`

**What it does**:
- Creates `rate_limit_log` table
- Adds functions for checking and logging rate limits
- Adds cleanup function for old logs

**How to apply**:

1. Follow same procedure as above
2. Verify with:
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'rate_limit_log';

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('check_rate_limit', 'log_rate_limit_request');

-- Test rate limit check
SELECT * FROM check_rate_limit('test-ip', 'test-endpoint', 100, 60);
```

---

### Priority 3: Campaign System Enhancements (10 migrations)

**Files**: 
- `20251127000000_enhance_campaign_system_part1_schema.sql`
- `20251127000001_enhance_campaign_system_part2_constraints.sql`
- `20251127000002_enhance_campaign_system_part3_notifications.sql`
- `20251127000003_enhance_campaign_system_part4_functions.sql`
- `20251127000004_enhance_campaign_system_part5_notify_func.sql`
- `20251127000005_enhance_campaign_system_part6_data_migration.sql`
- `20251127000006_enhance_campaign_system_part7_grants.sql`
- `20251127000007_enhance_campaign_system_part8_grants2.sql`
- `20251127000008_enhance_campaign_system_part9_grants3.sql`
- `20251127000009_enhance_campaign_system_part10_grants4.sql`

**Important**: Apply in order, one at a time

**What they do**:
- Enhance campaign conditions system
- Add notification system
- Add helper functions
- Set up proper permissions

**How to apply**:

1. Apply part 1, verify it works
2. Apply part 2, verify it works
3. Continue through part 10
4. After all parts applied, verify:
```sql
-- Check for campaign notification tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'campaign_%notification%';

-- Check campaign condition enhancements
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'campaign_conditions'
ORDER BY column_name;
```

---

### Priority 4: Tags & Comments System

**File 1**: `supabase/migrations/20251201160000_create_tags_system.sql`

**What it does**:
- Adds tagging capability to campaigns, contacts, recipients
- Allows organizing resources

**File 2**: `supabase/migrations/20251201170000_create_comments_system.sql`

**What it does**:
- Adds commenting capability to campaigns
- Team collaboration feature

**How to apply**:
- Apply tags migration first
- Then apply comments migration
- Verify:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tags', 'comments');
```

---

### Priority 5: Organization Enhancements

**File**: `supabase/migrations/20251202100000_add_organization_archive_columns.sql`

**What it does**:
- Adds archive functionality for organizations
- Soft delete capability

**File**: `supabase/migrations/20251201180000_grant_clients_edit_to_admin.sql`

**What it does**:
- Fixes permission grants for admin role

---

## Optional Migrations

### Bulk Operations Support

**File**: `supabase/migrations/20251201150000_create_bulk_operations_support.sql`

**Benefits**:
- Bulk import/export operations
- Efficiency improvements

### Atomic Transaction Functions

**File**: `supabase/migrations/20251201110000_create_atomic_transaction_functions.sql`

**Benefits**:
- Transaction safety
- Data integrity improvements

### Validation Functions

**File**: `supabase/migrations/20251201130000_create_validation_functions.sql`

**Benefits**:
- Input validation helpers
- Better data quality

---

## Post-Migration Tasks

After applying each migration:

1. **Test affected features**:
```bash
# Restart local dev server
npm run dev

# Test in browser
# Check for console errors
# Verify affected features work
```

2. **Monitor for issues**:
```sql
-- Check for new errors
SELECT * FROM error_logs 
WHERE occurred_at > NOW() - INTERVAL '10 minutes'
ORDER BY occurred_at DESC;

-- Check error rate
SELECT * FROM get_error_rate(10); -- Last 10 minutes
```

3. **Document applied migration**:
```markdown
# Migration Log

## [YYYY-MM-DD HH:MM] - [MIGRATION_NAME]
- Applied by: [YOUR_NAME]
- Duration: [X minutes]
- Issues: [None / DESCRIPTION]
- Rollback available: [Yes / No]
```

---

## Rollback Procedures

If a migration causes issues:

### Immediate Rollback

1. **Find rollback script**:
```bash
ls scripts/sql/rollbacks/
```

2. **Execute rollback**:
   - Open Supabase SQL Editor
   - Paste rollback script
   - Execute

3. **Verify rollback**:
```sql
-- Check tables removed
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'REMOVED_TABLE';
-- Should return 0 rows

-- Check functions removed
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'REMOVED_FUNCTION';
-- Should return 0 rows
```

### Point-in-Time Recovery (PITR)

If rollback script doesn't exist or fails:

1. Go to Supabase Dashboard → Database → Backups
2. Click "Point-in-time recovery"
3. Enter timestamp before migration
4. Create new project from backup
5. Test restored database
6. Switch connection if verified

See [DISASTER_RECOVERY.md](../operations/DISASTER_RECOVERY.md) for full PITR procedure.

---

## Migration Troubleshooting

### Issue: "relation already exists"

**Cause**: Migration already applied or partial application

**Solution**:
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'TABLE_NAME';

-- If exists, either:
-- 1. Skip migration (already applied)
-- 2. Add IF NOT EXISTS to CREATE statements
-- 3. Drop table and reapply (CAUTION: data loss)
```

### Issue: "function does not exist"

**Cause**: Dependent migration not applied

**Solution**:
```sql
-- Check which migrations applied
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC;

-- Apply missing dependencies first
```

### Issue: "permission denied"

**Cause**: RLS policies too restrictive

**Solution**:
```sql
-- Temporarily disable RLS (CAUTION: production risk)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Apply migration

-- Re-enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Issue: "out of shared memory"

**Cause**: Too many indexes/objects

**Solution**:
```sql
-- Check current index count
SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';

-- If very high (>500), may need to:
-- 1. Upgrade database tier
-- 2. Remove unused indexes
-- 3. Apply migration in smaller chunks
```

---

## Migration Best Practices

1. **Always backup before applying**
2. **Apply one migration at a time**
3. **Test in development first**
4. **Apply during low-traffic periods**
5. **Monitor error logs after application**
6. **Keep rollback scripts ready**
7. **Document what was applied**
8. **Verify expected behavior**

---

## Questions?

- Review migration SQL file carefully
- Check [DISASTER_RECOVERY.md](../operations/DISASTER_RECOVERY.md) for recovery procedures
- Check [INCIDENT_RESPONSE.md](../operations/INCIDENT_RESPONSE.md) if issues arise
- Ask team for review before applying risky migrations

---

**Last Updated**: December 2024  
**Owner**: DevOps Team



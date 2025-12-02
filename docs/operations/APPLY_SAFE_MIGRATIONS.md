# Safe Migrations Application Guide

## Overview
This guide covers applying all safe, non-destructive migrations that add monitoring, tags, comments, and campaign enhancements.

## Pre-Application Checklist
- [ ] Database backup created
- [ ] Verification queries run (check-migration-status.sql)
- [ ] Results documented
- [ ] Access to Supabase Dashboard confirmed

## Safe Migrations to Apply (In Order)

### 1. Error Tracking & Monitoring ✅
**File**: `supabase/migrations/20251201100000_create_error_tracking_tables.sql`
**Status**: Ready to apply
**What**: Creates error_logs, system_alerts tables
**Risk**: None (uses IF NOT EXISTS)
**Apply**: See APPLY_MONITORING_MIGRATIONS.md

### 2. Tags System
**File**: `supabase/migrations/20251201160000_create_tags_system.sql`  
**What**: Creates tags and tag_assignments tables
**Risk**: None
**Impact**: Enables tagging for campaigns, contacts, forms

### 3. Comments System
**File**: `supabase/migrations/20251201170000_create_comments_system.sql`
**What**: Creates comments table for campaign collaboration
**Risk**: None
**Impact**: Enables team comments on campaigns

### 4. Campaign System Enhancements (10 parts)
**Files**: `20251127000000` through `20251127000009`
**What**: Enhanced campaign conditions, notifications, version control
**Risk**: Low (additive changes)
**Impact**: Better campaign tracking and notifications

**Order**:
1. `20251127000000_enhance_campaign_system_part1_schema.sql` - Schema changes
2. `20251127000001_enhance_campaign_system_part2_constraints.sql` - Constraints
3. `20251127000002_enhance_campaign_system_part3_notifications.sql` - Notifications
4. `20251127000003_enhance_campaign_system_part4_functions.sql` - Functions
5. `20251127000004_enhance_campaign_system_part5_notify_func.sql` - Notify functions
6. `20251127000005_enhance_campaign_system_part6_data_migration.sql` - Data migration
7. `20251127000006_enhance_campaign_system_part7_grants.sql` - Grants
8. `20251127000007_enhance_campaign_system_part8_grants2.sql` - More grants
9. `20251127000008_enhance_campaign_system_part9_grants3.sql` - More grants
10. `20251127000009_enhance_campaign_system_part10_grants4.sql` - Final grants

### 5. Organization Archive Support
**File**: `supabase/migrations/20251202100000_add_organization_archive_columns.sql`
**What**: Adds archive columns to organizations
**Risk**: None
**Impact**: Enables soft-delete for organizations

### 6. Advanced Features (Optional but Recommended)
**File**: `supabase/migrations/20251201110000_create_atomic_transaction_functions.sql`
**What**: Transaction safety functions
**Risk**: None
**Impact**: Better data integrity

**File**: `supabase/migrations/20251201130000_create_validation_functions.sql`
**What**: Input validation helpers
**Risk**: None
**Impact**: Better data quality

**File**: `supabase/migrations/20251201150000_create_bulk_operations_support.sql`
**What**: Bulk operations support
**Risk**: Low
**Impact**: Efficiency improvements

## Application Script

### PowerShell Script (Windows)
```powershell
# save as: scripts/apply-safe-migrations.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Safe Migrations Application Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$migrations = @(
    "20251201100000_create_error_tracking_tables.sql",
    "20251201160000_create_tags_system.sql",
    "20251201170000_create_comments_system.sql",
    "20251127000000_enhance_campaign_system_part1_schema.sql",
    "20251127000001_enhance_campaign_system_part2_constraints.sql",
    "20251127000002_enhance_campaign_system_part3_notifications.sql",
    "20251127000003_enhance_campaign_system_part4_functions.sql",
    "20251127000004_enhance_campaign_system_part5_notify_func.sql",
    "20251127000005_enhance_campaign_system_part6_data_migration.sql",
    "20251127000006_enhance_campaign_system_part7_grants.sql",
    "20251127000007_enhance_campaign_system_part8_grants2.sql",
    "20251127000008_enhance_campaign_system_part9_grants3.sql",
    "20251127000009_enhance_campaign_system_part10_grants4.sql",
    "20251202100000_add_organization_archive_columns.sql",
    "20251201110000_create_atomic_transaction_functions.sql",
    "20251201130000_create_validation_functions.sql",
    "20251201150000_create_bulk_operations_support.sql"
)

Write-Host "This script will help apply $($migrations.Count) safe migrations" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: You must apply these via Supabase Dashboard SQL Editor" -ForegroundColor Red
Write-Host "   This script will show you which files to apply in order" -ForegroundColor Red
Write-Host ""
Read-Host "Press Enter to continue or Ctrl+C to cancel"

foreach ($migration in $migrations) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Migration: $migration" -ForegroundColor White
    Write-Host "=========================================" -ForegroundColor Green
    
    $path = "supabase\migrations\$migration"
    
    if (Test-Path $path) {
        Write-Host "✅ File exists: $path" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Open Supabase Dashboard → SQL Editor" -ForegroundColor White
        Write-Host "2. Create new query" -ForegroundColor White
        Write-Host "3. Copy contents of: $path" -ForegroundColor White
        Write-Host "4. Paste and Run" -ForegroundColor White
        Write-Host "5. Verify no errors in output" -ForegroundColor White
        Write-Host ""
        $apply = Read-Host "Have you applied this migration? (y/n)"
        
        if ($apply -ne "y") {
            Write-Host "⚠️  Stopping. Please apply migration before continuing" -ForegroundColor Red
            exit
        }
        
        Write-Host "✅ Marked as applied" -ForegroundColor Green
    } else {
        Write-Host "⚠️  File not found: $path" -ForegroundColor Red
        Write-Host "   Skipping..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Migration application complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run verification queries (scripts/sql/verification/check-migration-status.sql)" -ForegroundColor White
Write-Host "2. Test application functionality" -ForegroundColor White
Write-Host "3. Check System Health dashboard (/admin/system-health)" -ForegroundColor White
Write-Host "4. Monitor error logs for first 24 hours" -ForegroundColor White
```

## Verification After Each Migration

Run after EACH migration:

```sql
-- Verify last migration
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY inserted_at DESC LIMIT 1;

-- Check for any table locking
SELECT * FROM pg_stat_activity 
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';

-- Verify RLS is still enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND NOT rowsecurity
ORDER BY tablename;

-- Check for any broken foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f' AND convalidated = false;
```

## Rollback Procedures

Each migration has a rollback script in `scripts/sql/rollbacks/`.

If a migration fails:
1. Note the error message
2. Check rollback script exists
3. Review rollback SQL
4. Execute rollback
5. Verify rollback success
6. Fix migration issue
7. Retry migration

## Troubleshooting

### Error: "relation already exists"
**Solution**: Migration already applied, verify in schema_migrations table

### Error: "column already exists"
**Solution**: Migration partially applied, check table schema

### Error: "function does not exist"
**Solution**: Dependency missing, check previous migrations applied

### Error: "permission denied"
**Solution**: Using wrong key, need service_role key for some operations

## Post-Migration Testing

### 1. Test Error Logging
```typescript
// In browser console
await supabase.from('error_logs').insert({
  severity: 'low',
  category: 'unknown',
  message: 'Test error',
  error_details: {}
});
```

### 2. Test Tags System
```typescript
// Create a tag
await supabase.from('tags').insert({
  name: 'Test Tag',
  entity_type: 'campaign',
  client_id: 'YOUR_CLIENT_ID'
});
```

### 3. Test Comments
```typescript
// Add comment to campaign
await supabase.from('comments').insert({
  entity_type: 'campaign',
  entity_id: 'CAMPAIGN_ID',
  content: 'Test comment',
  user_id: 'YOUR_USER_ID'
});
```

### 4. Test Campaign Versions
```typescript
// Check if campaign versions table works
const { data } = await supabase
  .from('campaign_versions')
  .select('*')
  .limit(1);
```

## Success Criteria

- [ ] All 17 migrations applied without errors
- [ ] Verification queries return expected results
- [ ] No broken foreign keys
- [ ] RLS enabled on all new tables
- [ ] Application loads without errors
- [ ] System Health page shows data
- [ ] Error logging works
- [ ] Tags can be created and assigned
- [ ] Comments can be added

## Next Steps

After successful migration:
1. Deploy edge functions (next todo)
2. Set up monitoring alerts
3. Run security audit
4. Begin testing phase

## Recording Results

Create file: `MIGRATION_APPLICATION_LOG.md`

```markdown
# Migration Application Log

## Date: YYYY-MM-DD
## Applied by: YOUR_NAME

### Migrations Applied
- [x] 20251201100000 - Error tracking (Success)
- [x] 20251201160000 - Tags system (Success)
- [x] 20251201170000 - Comments (Success)
- [x] 20251127000000-000009 - Campaign enhancements (Success)
- [x] 20251202100000 - Organization archive (Success)
- [x] 20251201110000 - Atomic transactions (Success)
- [x] 20251201130000 - Validation functions (Success)
- [x] 20251201150000 - Bulk operations (Success)

### Issues Encountered
None

### Verification Results
- All tables created successfully
- RLS policies active
- Functions working
- Application stable

### Next Actions
1. Deploy edge functions
2. Set up alerts
3. Begin testing
```


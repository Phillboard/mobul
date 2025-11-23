# Database Backup & Recovery Strategy

## Overview
This document outlines the backup strategy and disaster recovery procedures for the application's database.

---

## Automated Backups (Lovable Cloud/Supabase)

### Daily Backups
- **Frequency**: Automatic daily backups
- **Retention**: 7 days (on Pro plan and above)
- **Time**: Performed during low-traffic hours (typically 2-4 AM UTC)
- **Coverage**: Full database snapshot including:
  - All tables and data
  - Database functions
  - RLS policies
  - Database roles and permissions

### Point-in-Time Recovery (PITR)
- **Availability**: Pro plan and above
- **Coverage**: Last 7 days of transaction logs
- **Granularity**: Restore to any point within retention period
- **Use case**: Recover from accidental data deletion or corruption

---

## Accessing Backups

### Via Lovable Cloud
1. Open your project
2. Go to Settings → Integrations → Lovable Cloud
3. Click "View Backend"
4. Navigate to Database → Backups
5. View available backups and restore points

### Via Supabase CLI
```bash
# List available backups
supabase db remote list-backups

# Download a specific backup
supabase db remote download --backup-id <backup-id>

# Restore from backup (to local)
supabase db reset --db-url <backup-url>
```

---

## Manual Backup Procedures

### Full Database Export
For critical operations or before major migrations:

```bash
# Export entire database schema and data
pg_dump -h <supabase-host> -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Export schema only (no data)
pg_dump -h <supabase-host> -U postgres -d postgres --schema-only > schema_backup.sql

# Export data only (no schema)
pg_dump -h <supabase-host> -U postgres -d postgres --data-only > data_backup.sql
```

### Selective Table Exports
For specific tables:

```sql
-- Via SQL in Lovable Cloud → Backend → Database
COPY (SELECT * FROM campaigns) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM gift_cards) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM recipients) TO STDOUT WITH CSV HEADER;
```

### Edge Function Code Backup
```bash
# All edge functions are in Git
git archive --format=zip HEAD:supabase/functions -o edge-functions-backup.zip
```

---

## Recovery Procedures

### Scenario 1: Accidental Data Deletion (Recent)
**If deleted within last 7 days:**

1. Go to Lovable Cloud → Backend → Database → Backups
2. Select "Point-in-Time Recovery"
3. Choose timestamp before deletion
4. Click "Restore"
5. Verify data restoration
6. Update application if needed

**Downtime**: 5-15 minutes depending on database size

### Scenario 2: Database Corruption
**Full recovery from daily backup:**

1. Identify last known good backup
2. Go to Lovable Cloud → Backend → Database → Backups
3. Select the backup before corruption
4. Click "Restore to new database" (safer option)
5. Test thoroughly
6. Point application to new database
7. Delete corrupted database

**Downtime**: 30-60 minutes

### Scenario 3: Complete Database Loss
**Recovery from external backup:**

1. Create new Supabase project (if necessary)
2. Apply schema from backup:
   ```bash
   psql -h <new-host> -U postgres -d postgres < schema_backup.sql
   ```
3. Import data:
   ```bash
   psql -h <new-host> -U postgres -d postgres < data_backup.sql
   ```
4. Run migrations:
   ```bash
   supabase db push
   ```
5. Verify all tables and data
6. Update application connection strings
7. Test all critical features

**Downtime**: 2-4 hours

### Scenario 4: Migration Failed
**Rollback procedure:**

1. If using migrations, Supabase automatically creates pre-migration backup
2. Go to Database → Migrations → Failed Migrations
3. Click "Rollback"
4. Or manually restore from backup before migration
5. Fix migration issues locally
6. Test migration locally first
7. Re-apply corrected migration

**Downtime**: 5-15 minutes

---

## Data Retention Policies

### Production Data
- **Backups**: 7 days (Supabase default)
- **Error logs**: Keep 90 days, then archive
- **Performance metrics**: Keep 30 days, aggregate older data
- **Usage analytics**: Keep 180 days
- **Audit logs**: Keep 1 year for compliance
- **Campaign data**: Keep indefinitely
- **Gift cards**: Keep indefinitely (financial records)

### Development/Staging
- **Backups**: 3 days
- **Logs**: 7 days
- **Test data**: Clean up monthly

### Archival Strategy
```sql
-- Archive old error logs (run monthly)
CREATE TABLE error_logs_archive AS 
SELECT * FROM error_logs 
WHERE occurred_at < NOW() - INTERVAL '90 days';

DELETE FROM error_logs 
WHERE occurred_at < NOW() - INTERVAL '90 days';

-- Archive old performance metrics (run monthly)  
CREATE TABLE performance_metrics_archive AS
SELECT * FROM performance_metrics
WHERE recorded_at < NOW() - INTERVAL '30 days';

DELETE FROM performance_metrics
WHERE recorded_at < NOW() - INTERVAL '30 days';
```

---

## Pre-Migration Checklist

Before running any migration:

- [ ] Create manual backup
- [ ] Document current state
- [ ] Test migration on development environment
- [ ] Verify rollback procedure
- [ ] Schedule during low-traffic window
- [ ] Notify team of maintenance window
- [ ] Have recovery plan ready
- [ ] Monitor error logs after migration
- [ ] Verify all features work post-migration

---

## Backup Testing

### Monthly Backup Verification
**Schedule**: First Monday of every month

1. Download latest backup
2. Restore to test environment
3. Run test queries to verify data integrity
4. Check all tables exist and have correct row counts
5. Verify RLS policies are intact
6. Test edge functions against restored database
7. Document any issues

### Test Checklist
```sql
-- Verify table counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;  -- Should return 0 rows

-- Verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## Disaster Recovery Plan

### Critical Data Priority (Recovery Order)
1. **Users & Authentication** (`auth.users`, `profiles`, `user_roles`)
2. **Clients & Organizations** (`clients`, `organizations`, `client_users`)
3. **Gift Cards** (`gift_cards`, `gift_card_pools`, `gift_card_brands`)
4. **Campaigns** (`campaigns`, `recipients`, `audiences`)
5. **Transactions** (`gift_card_deliveries`, `admin_card_sales`)
6. **Audit Logs** (`error_logs`, `gift_card_audit_log`)

### RTO and RPO Targets
- **Recovery Time Objective (RTO)**: 1 hour maximum
- **Recovery Point Objective (RPO)**: 24 hours maximum (1 day of data loss acceptable)
- **Critical Services RTO**: 15 minutes (auth, gift card redemption)

### Emergency Contacts
- **Database Issues**: Lovable Support / Supabase Support
- **Technical Lead**: [Add contact]
- **DevOps Team**: [Add contact]

---

## Monitoring & Alerts

### Backup Health Monitoring
Set up alerts for:
- [ ] Backup failure
- [ ] Backup size suddenly changes (>20% increase/decrease)
- [ ] Backup duration exceeds normal time (>30 minutes)
- [ ] Point-in-Time Recovery window expiring

### Database Health Monitoring
- [ ] Database size approaching plan limits
- [ ] Slow query performance
- [ ] Connection pool exhaustion
- [ ] Replication lag (if applicable)

---

## Compliance & Auditing

### Regulatory Requirements
- **GDPR**: Ability to export/delete user data on request
- **SOC 2**: Regular backup testing and documentation
- **Financial Records**: Gift card transactions must be retained

### Audit Trail
All recovery operations should be logged:
```sql
CREATE TABLE backup_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL, -- 'restore', 'backup', 'export'
  performed_by UUID REFERENCES auth.users(id),
  backup_source TEXT,
  restore_point TIMESTAMPTZ,
  status TEXT, -- 'success', 'failed'
  notes TEXT,
  performed_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Best Practices

### DO ✅
- Test backups regularly (monthly minimum)
- Document all recovery procedures
- Keep backups in multiple locations
- Maintain backup access credentials securely
- Monitor backup health
- Practice disaster recovery scenarios
- Update this document when procedures change

### DON'T ❌
- Don't assume backups work without testing
- Don't store backup credentials in code
- Don't forget to backup configuration (not just data)
- Don't skip pre-migration backups
- Don't restore directly to production without testing

---

## Additional Resources

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [Postgres Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Lovable Cloud Documentation](https://docs.lovable.dev/)

**Last Updated**: 2025-01-23  
**Next Review Date**: 2025-02-23

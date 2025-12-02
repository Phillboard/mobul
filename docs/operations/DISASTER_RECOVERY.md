# Disaster Recovery Plan

## Overview

This document outlines procedures for recovering from various disaster scenarios for the ACE Engage platform.

**Recovery Time Objective (RTO)**: 4 hours maximum downtime  
**Recovery Point Objective (RPO)**: 15 minutes maximum data loss

---

## Backup Strategy

### Automated Backups (Supabase)

- **Daily**: Incremental backups (automatic)
- **Retention**: 7 days for free tier, 30 days for paid
- **Location**: Supabase managed storage

### Manual Backups (Weekly)

**Schedule**: Every Sunday at midnight

**Procedure**:
1. Go to Supabase Dashboard → Settings → Database → Backups
2. Click "Download backup"
3. Store in secure location:
   - Primary: AWS S3 / Google Drive / Azure Blob
   - Secondary: Local encrypted storage
4. Verify backup file integrity
5. Document backup in backup log

### Critical Data to Backup

1. **Campaign configurations** - Business critical
2. **Recipient data (PII)** - Compliance requirement
3. **SMS opt-in records** - Legal compliance (TCPA)
4. **Audit logs** - Security compliance
5. **User accounts and roles** - Access control
6. **Client configurations** - Business operations

---

## Point-in-Time Recovery (PITR)

### When to Use PITR

- Accidental data deletion
- Bad migration applied
- Data corruption detected
- Ransomware attack
- Mass data modification error

### PITR Procedure

**Step 1: Identify Recovery Point**
- Determine exact time before incident (UTC timezone)
- Verify data integrity at that point
- Document incident timeline

**Step 2: Create Recovery Project**
1. Go to Supabase Dashboard → Database → Backups
2. Click "Point-in-time recovery"
3. Enter timestamp: `YYYY-MM-DD HH:MM:SS`
4. Create new project from backup
5. Wait for restoration (5-30 minutes depending on size)

**Step 3: Verify Data Integrity**
1. Connect to restored database
2. Run verification queries:
```sql
-- Check row counts
SELECT 
  'campaigns' as table_name, COUNT(*) as count FROM campaigns
UNION ALL
SELECT 'recipients', COUNT(*) FROM recipients
UNION ALL
SELECT 'clients', COUNT(*) FROM clients;

-- Verify recent data
SELECT id, name, created_at 
FROM campaigns 
ORDER BY created_at DESC 
LIMIT 10;
```
3. Test critical functions
4. Verify user access

**Step 4: Cutover to Restored Database**
1. Update environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Redeploy edge functions
3. Update DNS if applicable
4. Clear CDN cache
5. Test application thoroughly

**Step 5: Monitor and Verify**
1. Monitor for 24 hours
2. Check error logs
3. Verify all features working
4. Collect user feedback

**Step 6: Cleanup**
1. Archive old project (don't delete immediately)
2. Document recovery process
3. Schedule post-incident review
4. Update runbook with learnings

---

## Disaster Scenarios

### Scenario 1: Database Unavailable

**Symptoms**:
- Cannot connect to database
- All queries failing
- Supabase dashboard shows outage

**Response Procedure**:

1. **Verify Outage** (5 minutes)
   ```
   - Check Supabase status page: https://status.supabase.com
   - Test database connection from multiple locations
   - Check #incidents Slack channel
   - Review recent deployments
   ```

2. **Activate Incident Response** (Immediate)
   ```
   - Declare P0 incident
   - Create incident channel: #incident-YYYY-MM-DD
   - Notify engineering team
   - Update status page
   ```

3. **If Supabase Platform Issue** (Wait for resolution)
   ```
   - Monitor Supabase status page
   - Communicate with customers every 30 minutes
   - Prepare post-incident communication
   ```

4. **If Configuration Issue** (30 minutes)
   ```
   - Review recent changes
   - Check connection strings
   - Verify firewall rules
   - Restore from known good configuration
   ```

5. **If Data Corruption** (Use PITR)
   ```
   - Follow PITR procedure above
   - Restore to point before corruption
   - Test thoroughly before cutover
   ```

### Scenario 2: Edge Functions All Failing

**Symptoms**:
- 500 errors from all functions
- Cannot process webhooks
- Cannot send SMS/emails

**Response Procedure**:

1. **Verify Scope** (5 minutes)
   ```
   - Check Supabase Functions dashboard
   - Review function logs
   - Test individual functions
   - Identify if all or subset failing
   ```

2. **Quick Fixes** (15 minutes)
   ```
   - Check environment variables
   - Verify service role key
   - Check function deployment status
   - Review recent deployments
   ```

3. **Rollback** (20 minutes)
   ```bash
   # Redeploy last known good version
   git checkout <LAST_GOOD_COMMIT>
   supabase functions deploy --project-ref <PROJECT_REF>
   ```

4. **Verify Recovery**
   ```
   - Test critical functions
   - Check logs for errors
   - Verify webhooks processing
   - Test form submissions
   ```

### Scenario 3: Data Breach Suspected

**Symptoms**:
- Unusual database access patterns
- Unauthorized user activity
- Data exfiltration alerts

**Response Procedure**:

1. **Contain** (Immediate)
   ```
   - Rotate all API keys
   - Revoke suspicious sessions
   - Enable additional logging
   - Block suspicious IPs
   ```

2. **Investigate** (1-4 hours)
   ```
   - Review audit logs
   - Check security_audit_log table
   - Identify compromised accounts
   - Determine scope of breach
   ```

3. **Remediate** (1-8 hours)
   ```
   - Patch vulnerabilities
   - Reset compromised credentials
   - Enhance security measures
   - Notify affected users (if required)
   ```

4. **Comply** (24-72 hours)
   ```
   - Document incident thoroughly
   - Notify authorities if required (GDPR, etc.)
   - Prepare customer communications
   - File incident reports
   ```

### Scenario 4: Accidental Mass Data Deletion

**Symptoms**:
- Large number of records suddenly missing
- User reports data loss
- Audit logs show mass deletion

**Response Procedure**:

1. **Stop the Bleeding** (Immediate)
   ```
   - Identify deletion source
   - Revoke access if malicious
   - Disable automated processes if faulty
   ```

2. **Assess Damage** (15 minutes)
   ```sql
   -- Check deletion scope
   SELECT 
     action_type,
     resource_type,
     COUNT(*) as count,
     MIN(created_at) as first_action,
     MAX(created_at) as last_action
   FROM security_audit_log
   WHERE action_type LIKE '%delete%'
     AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY action_type, resource_type;
   ```

3. **Restore Data** (30-120 minutes)
   ```
   Option A: PITR (if within 7 days)
   - Use PITR procedure above
   - Restore to point before deletion
   
   Option B: From Backup (if older)
   - Restore backup to temporary database
   - Export deleted records
   - Import into production
   
   Option C: From Archive (if archived)
   - Retrieve from archive storage
   - Validate data integrity
   - Import into production
   ```

4. **Verify Restoration**
   ```sql
   -- Verify record counts
   SELECT COUNT(*) FROM campaigns WHERE deleted_at IS NULL;
   SELECT COUNT(*) FROM recipients WHERE deleted_at IS NULL;
   
   -- Check data integrity
   SELECT id, name, created_at FROM campaigns 
   WHERE created_at < NOW() - INTERVAL '1 day'
   ORDER BY created_at DESC LIMIT 10;
   ```

---

## Data Export for Disaster Recovery

### Automated Weekly Export

**Script**: `scripts/export-critical-data.ts`

**What it backs up**:
- Campaigns (JSON)
- Recipients (Encrypted)
- Audit logs (JSON)
- Configuration data (JSON)

**Storage locations**:
1. AWS S3 bucket (encrypted)
2. Google Drive (encrypted)
3. Local backup server (encrypted)

**Encryption**:
- Algorithm: AES-256
- Key management: AWS KMS / Azure Key Vault
- Key rotation: Every 90 days

### Manual Export Procedure

**When to use**: Before major changes, migrations, or updates

```sql
-- Export campaigns
COPY (SELECT * FROM campaigns) 
TO '/tmp/campaigns_backup.csv' CSV HEADER;

-- Export recipients (contains PII - encrypt immediately)
COPY (SELECT * FROM recipients) 
TO '/tmp/recipients_backup.csv' CSV HEADER;

-- Export audit logs
COPY (SELECT * FROM security_audit_log 
WHERE created_at > NOW() - INTERVAL '90 days') 
TO '/tmp/audit_logs_backup.csv' CSV HEADER;
```

**Then encrypt files**:
```bash
# Encrypt sensitive files
gpg --encrypt --recipient ops@company.com recipients_backup.csv
gpg --encrypt --recipient ops@company.com campaigns_backup.csv

# Upload to secure storage
aws s3 cp recipients_backup.csv.gpg s3://backups/$(date +%Y%m%d)/
```

---

## Contact Information

### Incident Response Team

**Primary On-Call**:
- Name: [TBD]
- Phone: [TBD]
- Email: [TBD]

**Secondary On-Call**:
- Name: [TBD]
- Phone: [TBD]
- Email: [TBD]

**Database Administrator**:
- Name: [TBD]
- Email: [TBD]

**Security Lead**:
- Name: [TBD]
- Email: [TBD]

### External Contacts

**Supabase Support**:
- Email: support@supabase.io
- Dashboard: https://app.supabase.com
- Status: https://status.supabase.com

**AWS Support** (if using S3):
- Console: https://console.aws.amazon.com
- Support: https://console.aws.amazon.com/support/

---

## Testing and Validation

### Quarterly DR Tests

**Schedule**: First Sunday of each quarter

**Test Procedure**:
1. Announce test to team
2. Perform PITR to test environment
3. Verify data integrity
4. Test application functionality
5. Document results
6. Update procedures as needed

### Annual Full DR Exercise

**Scope**: Complete failover and recovery

**Includes**:
- Full database restoration
- Edge function redeployment
- Application cutover
- User acceptance testing
- Performance validation

---

## Post-Incident Procedures

### Within 24 Hours

- [ ] Document timeline of events
- [ ] Identify root cause
- [ ] List all actions taken
- [ ] Assess effectiveness of response
- [ ] Identify gaps in procedures

### Within 48 Hours

- [ ] Conduct post-incident review meeting
- [ ] Create action items for improvements
- [ ] Update runbooks with learnings
- [ ] Communicate findings to stakeholders

### Within 1 Week

- [ ] Implement quick wins from action items
- [ ] Schedule larger improvements
- [ ] Update training materials
- [ ] Archive incident documentation

---

## Appendix

### Verification Queries

```sql
-- Database health check
SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value
UNION ALL
SELECT 
  'Active Connections',
  COUNT(*)::text
FROM pg_stat_activity
WHERE datname = current_database();

-- Table integrity check
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Useful Commands

```bash
# Check Supabase project status
supabase status

# List all functions
supabase functions list

# View function logs
supabase functions logs FUNCTION_NAME --tail

# Test database connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

---

**Last Updated**: December 2024  
**Next Review**: March 2025  
**Owner**: DevOps Team



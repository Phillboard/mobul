# Backup Procedures

## Overview

This document details backup procedures, schedules, and restoration processes for the Mobul platform.

---

## Backup Schedule

### Automated Backups (Supabase)

**Daily Backups**:
- **Frequency**: Every 24 hours
- **Retention**: 7 days (free tier), 30 days (paid tier)
- **Type**: Full database snapshot
- **Location**: Supabase managed storage
- **Verification**: Automatic integrity checks

### Manual Backups

**Weekly Full Backup**:
- **Schedule**: Every Sunday at 00:00 UTC
- **Retention**: 90 days
- **Storage Locations**:
  1. AWS S3 (Primary)
  2. Google Drive (Secondary)
  3. Local encrypted storage (Tertiary)

**Pre-Deployment Backup**:
- **When**: Before any major deployment
- **Trigger**: Manual
- **Retention**: 30 days minimum

**Pre-Migration Backup**:
- **When**: Before running any database migration
- **Trigger**: Manual
- **Retention**: Until migration verified successful

---

## What to Backup

### Critical Data (Priority 1)

1. **Campaigns** (`campaigns` table)
   - Business critical configurations
   - Template designs
   - Targeting rules

2. **Recipients** (`recipients` table)
   - Contains PII - encrypt always
   - SMS opt-in status (legal compliance)
   - Redemption codes

3. **SMS Opt-in Records** (`sms_opt_ins` table)
   - Required for TCPA compliance
   - Legal liability if lost
   - Cannot be regenerated

4. **Audit Logs** (`security_audit_log`, `error_logs`)
   - Security compliance
   - Forensic investigation
   - Compliance requirements

### Important Data (Priority 2)

5. **Clients** (`clients` table)
   - Business relationships
   - Configuration settings

6. **User Accounts** (`profiles`, `user_roles`)
   - Access control
   - User preferences

7. **Call Sessions** (`call_sessions` table)
   - Business intelligence
   - Customer service records

8. **Events** (`events` table)
   - Analytics data
   - Campaign performance tracking

### Nice-to-Have (Priority 3)

9. **Templates** (`templates` table)
   - Can be rebuilt
   - Version controlled in git

10. **Demo Data**
    - Can be regenerated
    - Not critical for production

---

## Manual Backup Procedures

### Full Database Backup

**Method 1: Supabase Dashboard** (Recommended)

1. Go to Supabase Dashboard
2. Navigate to: Settings → Database → Backups
3. Click "Download backup"
4. Save file with naming convention: `backup_YYYYMMDD_HHMM.sql`
5. Verify file size is reasonable (>1MB typically)
6. Store in secure locations

**Method 2: Command Line**

```bash
# Using pg_dump
pg_dump -h db.PROJECT_REF.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -f backup_$(date +%Y%m%d_%H%M).dump

# Verify backup
pg_restore --list backup_YYYYMMDD_HHMM.dump | head -20
```

### Selective Table Backup

```sql
-- Backup campaigns (business critical)
COPY (SELECT * FROM campaigns) 
TO '/tmp/campaigns_backup_YYYYMMDD.csv' CSV HEADER;

-- Backup recipients (CONTAINS PII - ENCRYPT IMMEDIATELY)
COPY (SELECT * FROM recipients) 
TO '/tmp/recipients_backup_YYYYMMDD.csv' CSV HEADER;

-- Backup SMS opt-ins (compliance requirement)
COPY (SELECT * FROM sms_opt_ins) 
TO '/tmp/sms_optins_backup_YYYYMMDD.csv' CSV HEADER;

-- Backup audit logs (last 90 days)
COPY (
  SELECT * FROM security_audit_log 
  WHERE created_at > NOW() - INTERVAL '90 days'
) TO '/tmp/audit_logs_backup_YYYYMMDD.csv' CSV HEADER;
```

### Encrypt Sensitive Backups

```bash
# Encrypt using GPG
gpg --encrypt --recipient ops@company.com recipients_backup_YYYYMMDD.csv

# Or using OpenSSL
openssl enc -aes-256-cbc -salt \
  -in recipients_backup_YYYYMMDD.csv \
  -out recipients_backup_YYYYMMDD.csv.enc \
  -k STRONG_PASSWORD

# Verify encryption
file recipients_backup_YYYYMMDD.csv.enc
# Should show: "data" not "ASCII text"
```

### Upload to Secure Storage

```bash
# Upload to AWS S3
aws s3 cp backup_YYYYMMDD_HHMM.sql.gpg \
  s3://ace-engage-backups/$(date +%Y/%m/%d)/ \
  --server-side-encryption AES256

# Upload to Google Drive (using rclone)
rclone copy backup_YYYYMMDD_HHMM.sql.gpg \
  gdrive:ACE-Engage-Backups/$(date +%Y/%m/%d)/

# Verify upload
aws s3 ls s3://ace-engage-backups/$(date +%Y/%m/%d)/
```

---

## Backup Verification

### Weekly Verification (Every Monday)

**Procedure**:
1. Download most recent backup
2. Verify file integrity
3. Test restoration to staging environment
4. Verify data accuracy
5. Document verification results

**Verification Script**:

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="backup_verification_${TIMESTAMP}.log"

echo "Starting backup verification: $BACKUP_FILE" | tee -a $LOG_FILE

# Step 1: Check file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found" | tee -a $LOG_FILE
    exit 1
fi

# Step 2: Check file size
SIZE=$(stat -f%z "$BACKUP_FILE")
if [ $SIZE -lt 1000000 ]; then
    echo "WARNING: Backup file smaller than expected ($SIZE bytes)" | tee -a $LOG_FILE
fi

# Step 3: Verify file is not corrupted
pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Backup file structure valid" | tee -a $LOG_FILE
else
    echo "ERROR: Backup file corrupted" | tee -a $LOG_FILE
    exit 1
fi

# Step 4: Count tables in backup
TABLE_COUNT=$(pg_restore --list "$BACKUP_FILE" | grep "TABLE DATA" | wc -l)
echo "✓ Backup contains $TABLE_COUNT tables" | tee -a $LOG_FILE

# Step 5: Check for critical tables
CRITICAL_TABLES=("campaigns" "recipients" "sms_opt_ins" "clients")
for table in "${CRITICAL_TABLES[@]}"; do
    if pg_restore --list "$BACKUP_FILE" | grep -q "TABLE DATA.*$table"; then
        echo "✓ Critical table found: $table" | tee -a $LOG_FILE
    else
        echo "ERROR: Missing critical table: $table" | tee -a $LOG_FILE
        exit 1
    fi
done

echo "✓ Backup verification complete" | tee -a $LOG_FILE
```

---

## Restoration Procedures

### Full Database Restore

**⚠️ WARNING: This will overwrite the entire database**

**Pre-Restore Checklist**:
- [ ] Verify backup file integrity
- [ ] Notify team of restore operation
- [ ] Put application in maintenance mode
- [ ] Create snapshot of current database (as safety)

**Restore Procedure**:

```bash
# Method 1: Using Supabase PITR (Recommended)
# 1. Go to Supabase Dashboard → Database → Backups
# 2. Click "Point-in-time recovery"
# 3. Select timestamp
# 4. Create new project from backup

# Method 2: Using pg_restore
pg_restore -h db.PROJECT_REF.supabase.co \
           -U postgres \
           -d postgres \
           --clean \
           --if-exists \
           backup_YYYYMMDD_HHMM.dump

# Verify restoration
psql -h db.PROJECT_REF.supabase.co -U postgres -d postgres -c "
  SELECT 
    'campaigns' as table_name, COUNT(*) as count FROM campaigns
  UNION ALL
  SELECT 'recipients', COUNT(*) FROM recipients
  UNION ALL
  SELECT 'clients', COUNT(*) FROM clients;
"
```

### Selective Table Restore

**Use case**: Restore specific table(s) without affecting others

```sql
-- Step 1: Create temporary table
CREATE TABLE campaigns_temp (LIKE campaigns INCLUDING ALL);

-- Step 2: Import backup data
COPY campaigns_temp FROM '/tmp/campaigns_backup_YYYYMMDD.csv' CSV HEADER;

-- Step 3: Verify data
SELECT COUNT(*) FROM campaigns_temp;
SELECT * FROM campaigns_temp LIMIT 10;

-- Step 4: Swap tables (in transaction for safety)
BEGIN;

-- Rename current table
ALTER TABLE campaigns RENAME TO campaigns_old;

-- Rename temp table to production
ALTER TABLE campaigns_temp RENAME TO campaigns;

-- If everything looks good, commit
COMMIT;

-- If there are issues, rollback
-- ROLLBACK;

-- Step 5: After verification, drop old table
DROP TABLE campaigns_old;
```

### Point-in-Time Recovery (PITR)

**Use case**: Restore to specific moment before incident

See full procedure in [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md#point-in-time-recovery-pitr)

---

## Automated Backup Script

### Weekly Export Script

**Location**: `scripts/export-critical-data.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BackupConfig {
  tables: string[];
  encrypt: boolean;
  storageLocations: string[];
}

async function exportCriticalData() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupDir = `backups/${timestamp}`;
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log(`📦 Starting backup: ${timestamp}`);
  
  // Export campaigns
  console.log('Exporting campaigns...');
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*');
  fs.writeFileSync(
    `${backupDir}/campaigns_${timestamp}.json`,
    JSON.stringify(campaigns, null, 2)
  );
  
  // Export recipients (encrypted)
  console.log('Exporting recipients (encrypted)...');
  const { data: recipients } = await supabase
    .from('recipients')
    .select('*');
  const encrypted = encryptData(JSON.stringify(recipients));
  fs.writeFileSync(
    `${backupDir}/recipients_${timestamp}.enc`,
    encrypted
  );
  
  // Export SMS opt-ins (encrypted)
  console.log('Exporting SMS opt-ins (encrypted)...');
  const { data: smsOptIns } = await supabase
    .from('sms_opt_ins')
    .select('*');
  const encryptedOptIns = encryptData(JSON.stringify(smsOptIns));
  fs.writeFileSync(
    `${backupDir}/sms_opt_ins_${timestamp}.enc`,
    encryptedOptIns
  );
  
  // Export audit logs (last 90 days)
  console.log('Exporting audit logs...');
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const { data: auditLogs } = await supabase
    .from('security_audit_log')
    .select('*')
    .gte('created_at', ninetyDaysAgo.toISOString());
  fs.writeFileSync(
    `${backupDir}/audit_logs_${timestamp}.json`,
    JSON.stringify(auditLogs, null, 2)
  );
  
  // Export configuration
  console.log('Exporting configuration...');
  const { data: clients } = await supabase.from('clients').select('*');
  fs.writeFileSync(
    `${backupDir}/clients_${timestamp}.json`,
    JSON.stringify(clients, null, 2)
  );
  
  console.log(`✅ Backup completed: ${backupDir}`);
  console.log(`📊 Backup statistics:`);
  console.log(`   - Campaigns: ${campaigns?.length || 0}`);
  console.log(`   - Recipients: ${recipients?.length || 0}`);
  console.log(`   - SMS Opt-ins: ${smsOptIns?.length || 0}`);
  console.log(`   - Audit Logs: ${auditLogs?.length || 0}`);
  console.log(`   - Clients: ${clients?.length || 0}`);
  
  return backupDir;
}

function encryptData(data: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted
  });
}

function decryptData(encryptedData: string): string {
  const { iv, authTag, data } = JSON.parse(encryptedData);
  
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Run if called directly
if (require.main === module) {
  exportCriticalData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}

export { exportCriticalData, encryptData, decryptData };
```

### Schedule with Cron

```bash
# Add to crontab
# Run every Sunday at midnight
0 0 * * 0 cd /path/to/project && npm run backup:weekly

# Or using GitHub Actions / CI/CD
# .github/workflows/weekly-backup.yml
```

---

## Backup Storage Management

### Retention Policy

**Production Backups**:
- Daily backups: 7 days
- Weekly backups: 90 days
- Monthly backups: 1 year
- Yearly backups: 7 years (compliance)

**Cleanup Script**:

```bash
#!/bin/bash
# cleanup-old-backups.sh

BACKUP_DIR="backups"
CURRENT_DATE=$(date +%s)

# Delete daily backups older than 7 days
find $BACKUP_DIR -name "daily_*" -type f -mtime +7 -delete

# Delete weekly backups older than 90 days
find $BACKUP_DIR -name "weekly_*" -type f -mtime +90 -delete

# Delete monthly backups older than 365 days
find $BACKUP_DIR -name "monthly_*" -type f -mtime +365 -delete

echo "Backup cleanup completed"
```

### Storage Cost Optimization

**Compression**:
```bash
# Compress before upload
gzip backup_YYYYMMDD.sql
# Results in 80-90% size reduction

# Or use higher compression
xz -9 backup_YYYYMMDD.sql
# Results in 90-95% size reduction (slower)
```

**Lifecycle Policies** (AWS S3):
```json
{
  "Rules": [{
    "Id": "Transition old backups to Glacier",
    "Status": "Enabled",
    "Transitions": [{
      "Days": 90,
      "StorageClass": "GLACIER"
    }],
    "Expiration": {
      "Days": 365
    }
  }]
}
```

---

## Backup Monitoring

### Automated Checks

**Daily Verification**:
- Check backup completed successfully
- Verify backup file size
- Confirm upload to all storage locations
- Test file integrity

**Weekly Testing**:
- Restore to test environment
- Verify data accuracy
- Check all tables present
- Confirm RLS policies intact

### Alerting

**Alert Conditions**:
- Backup job failed
- Backup file size anomaly
- Upload to storage failed
- Integrity check failed

**Alert Channels**:
- Email: ops@company.com
- Slack: #alerts
- PagerDuty: For critical failures

---

## Backup Checklist

### Pre-Deployment Backup

- [ ] Announce backup to team
- [ ] Create manual backup via Supabase Dashboard
- [ ] Download backup file
- [ ] Verify file integrity
- [ ] Upload to S3 and Google Drive
- [ ] Document backup location and timestamp
- [ ] Ready to proceed with deployment

### Post-Incident Backup

- [ ] Create backup of current state
- [ ] Document incident details
- [ ] Store backup with incident reference
- [ ] Keep for forensic analysis
- [ ] Extend retention period if needed

---

**Last Updated**: December 2024  
**Next Review**: March 2025  
**Owner**: DevOps Team



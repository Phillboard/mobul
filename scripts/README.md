# Scripts Directory

> Utility scripts for deployment, testing, data seeding, and database operations.

## Structure

```
scripts/
├── sql/                    # SQL utilities
│   ├── verification/       # Migration verification
│   ├── rollbacks/          # Rollback templates
│   └── *.sql               # Utility scripts
├── seed-data/              # TypeScript seed modules
├── *.ps1                   # PowerShell scripts
├── *.ts                    # TypeScript scripts
└── README.md
```

---

## Deployment Scripts

| Script | Purpose |
|--------|---------|
| `run-deployment-pipeline.ps1` | Complete deployment automation |
| `deploy-edge-functions.ps1` | Deploy all edge functions |
| `deploy-edge-functions.sh` | Linux/Mac version |
| `setup-new-supabase.ps1` | Initialize new Supabase project |
| `setup-new-supabase.sh` | Linux/Mac version |
| `apply-safe-migrations.ps1` | Safe migration deployment |
| `run-all-migrations.ps1` | Run all migrations in order |

### Usage

```powershell
# Full deployment
.\scripts\run-deployment-pipeline.ps1

# Deploy edge functions only
.\scripts\deploy-edge-functions.ps1

# Setup new Supabase project
.\scripts\setup-new-supabase.ps1
```

---

## Testing Scripts

| Script | Purpose |
|--------|---------|
| `test-edge-functions.ps1` | Test all edge functions |
| `test-wallet-functions.ts` | Test wallet pass generation |
| `test-alerts.ts` | Test alert system |
| `verify-edge-functions.ts` | Verify function deployment |
| `verify-no-duplicates.ts` | Verify duplicate prevention |
| `run-diagnostics.ts` | Run campaign diagnostics |
| `validate-analytics-data.ts` | Validate seed data |

### Usage

```powershell
# Test edge functions
.\scripts\test-edge-functions.ps1

# Test wallet functions
npx tsx scripts/test-wallet-functions.ts
```

---

## Seed Data Scripts

### TypeScript Modules (`seed-data/`)

| Module | Purpose |
|--------|---------|
| `organizations.ts` | Organization hierarchies |
| `contacts.ts` | Contact data |
| `campaigns.ts` | Campaign data |
| `recipients-events.ts` | Recipients and events |
| `call-center.ts` | Call center data |
| `analytics-generators.ts` | Analytics data |
| `time-simulator.ts` | Time-based simulation |
| `generators.ts` | Data generators |
| `helpers.ts` | Utility functions |
| `config.ts` | Configuration |
| `constants.ts` | Constants |
| `quick-enrich.ts` | Quick enrichment |

### Master Scripts

| Script | Purpose |
|--------|---------|
| `seed-all-data.ts` | Master orchestrator |
| `seed-cli.ts` | Interactive CLI |
| `seed-gift-card-data.ts` | Gift card data |
| `seed-client-gift-cards.ts` | Client gift cards |

### Usage

```bash
# Run master seeder
npx tsx scripts/seed-all-data.ts

# Interactive CLI
npx tsx scripts/seed-cli.ts

# Seed gift cards
npx tsx scripts/seed-gift-card-data.ts
```

---

## SQL Scripts (`sql/`)

### Seed Data

| Script | Purpose |
|--------|---------|
| `seed-mvp-test-data.sql` | Basic test data |
| `seed-complete-analytics-data.sql` | Analytics data |
| `seed-default-message-templates.sql` | Message templates |
| `populate-gift-card-pools.sql` | Test inventory |
| `setup-call-center-test-data.sql` | Call center data |

### Utilities

| Script | Purpose |
|--------|---------|
| `enable-client-gift-cards.sql` | Enable gift cards for clients |
| `grant-admin-role.sql` | Grant admin role |
| `setup-campaign-gift-card-config.sql` | Campaign config |
| `setup-designer-storage-buckets.sql` | Storage setup |
| `apply-credit-functions.sql` | Credit functions |

### Verification (`sql/verification/`)

| Script | Purpose |
|--------|---------|
| `check-migration-status.sql` | Check migrations |

### Rollbacks (`sql/rollbacks/`)

| Script | Purpose |
|--------|---------|
| `rollback-template.sql` | Rollback template |

### Usage

```sql
-- In Supabase SQL Editor:
-- Run verification
\i scripts/sql/verification/check-migration-status.sql

-- Seed data
\i scripts/sql/seed-mvp-test-data.sql
```

---

## Other Scripts

| Script | Purpose |
|--------|---------|
| `setup-wallet-credentials.ps1` | Wallet credential setup |
| `setup-gift-cards.ps1` | Gift card setup |
| `load-test.yml` | Artillery load test config |

---

## Common Tasks

### Full Deployment

```powershell
.\scripts\run-deployment-pipeline.ps1
```

### Seed Test Data

```bash
npx tsx scripts/seed-all-data.ts
```

### Verify Database

```sql
\i scripts/sql/verification/check-migration-status.sql
```

### Test Edge Functions

```powershell
.\scripts\test-edge-functions.ps1
```

---

## Related Documentation

- [Deployment Runbook](../docs/DEPLOYMENT_RUNBOOK.md)
- [Environment Setup](../docs/ENVIRONMENT_SETUP.md)
- [Seed Data System](./SEED_DATA_SYSTEM_README.md)
- [SQL Scripts](./sql/README.md)

---

**Last Updated:** February 1, 2026

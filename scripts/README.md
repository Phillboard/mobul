# Scripts Directory

## Overview

Utility scripts for deployment, testing, data management, and database operations.

---

## Directory Structure

```
scripts/
├── deployment/          # Deployment automation
│   ├── run-deployment-pipeline.ps1
│   ├── deploy-for-mike-demo.ps1
│   ├── setup-new-supabase.ps1
│   ├── deploy-edge-functions.ps1
│   └── deploy-edge-functions.sh
├── testing/            # Testing utilities
│   ├── test-edge-functions.ps1
│   ├── test-wallet-functions.ts
│   ├── test-db-connection.ts
│   └── test-alerts.ts
├── database/           # Database operations
│   ├── migrations/     # Migration helpers
│   └── seed/          # Seed data scripts
├── sql/               # SQL utilities
│   ├── diagnostics/   # Diagnostic queries
│   ├── verification/  # Verification scripts
│   ├── archived/      # One-time fixes
│   ├── seed/         # Seed SQL scripts
│   └── README.md
├── seed-data/         # TypeScript seed data modules
└── README.md          # This file
```

---

## Deployment Scripts

### run-deployment-pipeline.ps1

**Location:** `deployment/run-deployment-pipeline.ps1`

**Purpose:** Complete deployment automation

**Usage:**
```powershell
.\scripts\deployment\run-deployment-pipeline.ps1
```

**What it does:**
1. Verifies Supabase CLI installation
2. Checks project connection
3. Deploys all edge functions
4. Runs integration tests
5. Displays deployment summary

**Duration:** 15-20 minutes

### deploy-edge-functions.ps1

**Location:** `deployment/deploy-edge-functions.ps1`

**Purpose:** Deploy edge functions only

**Usage:**
```powershell
.\scripts\deployment\deploy-edge-functions.ps1
```

### setup-new-supabase.ps1

**Location:** `deployment/setup-new-supabase.ps1`

**Purpose:** Initialize new Supabase project

**Usage:**
```powershell
.\scripts\deployment\setup-new-supabase.ps1
```

---

## Testing Scripts

### test-wallet-functions.ts

**Purpose:** Test Apple/Google Wallet pass generation

**Usage:**
```bash
npx tsx scripts/testing/test-wallet-functions.ts
```

### test-edge-functions.ps1

**Purpose:** Test all edge functions

**Usage:**
```powershell
.\scripts\testing\test-edge-functions.ps1
```

---

## Database Scripts

### SQL Utilities (scripts/sql/)

**Seed Data:**
- `seed-mvp-test-data.sql` - Basic test data
- `seed-comprehensive-demo-data.sql` - Complete demo
- `seed-complete-analytics-data.sql` - Analytics data
- `seed-default-message-templates.sql` - Message templates
- `populate-gift-card-pools.sql` - Test inventory

**Diagnostics:** (in sql/diagnostics/)
- `diagnose-ab6-1061-simple.sql` - Code lookup diagnostics
- `diagnose-call-permissions.sql` - Permission diagnostics
- `diagnose-specific-code.sql` - Generic code diagnostics
- `comprehensive-system-diagnostic.sql` - Full system check

**Verification:** (in sql/verification/)
- `check-migration-status.sql` - Migration status
- `verify-mvp-database.sql` - Database health

**Archived:** (in sql/archived/)
- One-time fixes
- Completed audits
- Historical scripts

---

## Seed Data Scripts

### TypeScript Modules (scripts/seed-data/)

**Purpose:** Programmatic test data generation

**Modules:**
- `organizations.ts` - Organization hierarchies
- `contacts.ts` - Contact data
- `campaigns.ts` - Campaign data
- `analytics-generators.ts` - Analytics data
- `call-center.ts` - Call center data
- `generators.ts` - Data generators
- `helpers.ts` - Utility functions
- `config.ts` - Configuration

**Usage:**
```typescript
import { generateOrganizations } from './seed-data/organizations';
const orgs = await generateOrganizations(10);
```

### Seed CLI

**File:** `seed-cli.ts`

**Usage:**
```bash
npx tsx scripts/seed-cli.ts --help
```

---

## Data Transfer Scripts

### Transfer Utilities

- `transfer-data-api.ts` - API-based transfer
- `transfer-data-direct.ts` - Direct database transfer
- `transfer-data-hybrid.ts` - Hybrid approach
- `transfer-data-via-api.ts` - Via API endpoints

**Usage:**
```bash
npx tsx scripts/transfer-data-api.ts
```

---

## Migration Scripts

### Migration Helpers

- `apply-migrations.ts` - Apply all migrations
- `apply-safe-migrations.ps1` - Safe migration deployment
- `run-all-migrations.ps1` - Run all in order

---

## Common Tasks

### Deploy Everything

```powershell
.\scripts\deployment\run-deployment-pipeline.ps1
```

### Seed Test Data

```bash
npx tsx scripts/seed-all-data.ts
```

### Run Diagnostics

```sql
-- In Supabase SQL Editor:
\i scripts/sql/diagnostics/comprehensive-system-diagnostic.sql
```

### Verify Database

```sql
\i scripts/sql/verification/verify-mvp-database.sql
```

### Test Edge Functions

```powershell
.\scripts\testing\test-edge-functions.ps1
```

---

## Script Naming Conventions

**PowerShell Scripts (.ps1):**
- `verb-noun.ps1` (e.g., `deploy-edge-functions.ps1`)
- Use kebab-case
- Clear, descriptive names

**TypeScript Scripts (.ts):**
- `verb-noun.ts` (e.g., `seed-all-data.ts`)
- Use kebab-case
- Import as ES modules

**SQL Scripts (.sql):**
- `action-target.sql` (e.g., `seed-mvp-test-data.sql`)
- Use kebab-case
- Include comments at top explaining purpose

---

## Adding New Scripts

### 1. Choose Correct Directory

- **Deployment?** → `deployment/`
- **Testing?** → `testing/`
- **Database operation?** → `database/` or `sql/`
- **Data generation?** → `seed-data/`

### 2. Follow Naming Convention

- Use kebab-case
- Start with verb (deploy, test, seed, verify, etc.)
- Be descriptive

### 3. Add Documentation

- Add comment block at top of file
- Update this README
- Include usage examples

### 4. Test Before Committing

- Run the script
- Verify it works
- Check for errors

---

## Related Documentation

- [Deployment Guide](../public/docs/4-DEVELOPER-GUIDE/DEPLOYMENT.md)
- [Testing Guide](../public/docs/4-DEVELOPER-GUIDE/TESTING.md)
- [Database Guide](../public/docs/4-DEVELOPER-GUIDE/DATABASE.md)
- [SQL Scripts README](sql/README.md)

---

**Last Updated:** December 4, 2024  
**Maintained By:** DevOps Team

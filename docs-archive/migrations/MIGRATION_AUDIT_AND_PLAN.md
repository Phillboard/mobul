# Database Migration Audit & Execution Plan

**Generated:** December 1, 2025  
**Status:** Ready for Execution  
**Project:** ACE Engage Direct Mail Platform  
**Supabase Project ID:** `arzthloosvnasokxygfo`

---

## 🔍 Executive Summary

This document provides a complete audit of all SQL migrations and data scripts that need to be executed, along with a comprehensive step-by-step execution plan. The migrations were never run due to Supabase CLI not being installed previously.

### Current Status
- **Total Migrations Found:** 127 SQL migration files
- **Data Scripts Found:** 9 SQL utility scripts  
- **TypeScript Migration Scripts:** 2 data migration scripts
- **Migration Range:** November 10, 2025 → December 1, 2025 (Latest: `20251201180000`)

### Critical Issue Identified
The `.env` file has a character encoding issue that's preventing Supabase CLI linking:
```
failed to parse environment file: .env (unexpected character '»' in variable name)
```
**Resolution Required:** Fix `.env` file encoding before proceeding with CLI-based migrations.

---

## 📋 Complete Migration Inventory

### Phase 1: Core System Migrations (Nov 10-17)
**11 migrations** - Initial database schema setup
- Campaign system tables
- User management and roles
- Organization hierarchy
- Basic gift card structure
- RLS policies and permissions

### Phase 2: Gift Card System (Nov 18-21)
**8 migrations** - Gift card pools and tracking
- Gift card pools table
- Brand management
- Code tracking and validation
- Inventory management

### Phase 3: Enhanced Features (Nov 23-25)
**15 migrations** - Advanced features
- Analytics and tracking
- Audit logging
- SMS and delivery systems
- Performance optimizations

### Phase 4: Major Overhaul (Nov 25-27)
**12 migrations** - System architecture updates
- Campaign enhancements
- Message templates
- Performance indexes
- Demo data flags

### Phase 5: Recent Updates (Nov 28-30)
**9 migrations** - Bug fixes and improvements
- Simulation tracking
- Email delivery logs
- Mailing methods
- SMS opt-in tracking
- Redemption fee config
- Unique code constraints

### Phase 6: Credit System & Latest (Dec 1, 2025)
**19 migrations** - Major system overhaul ⚠️ CRITICAL
- Credit-based account system (replaces pool-based)
- Gift card assignment tracking
- Brand-denomination functions **← FIXES "Failed to load" ERROR**
- Smart pool selection
- Atomic transaction functions
- Error tracking tables
- Inventory monitoring
- Validation functions
- Credit management system
- Bulk operations support
- Tags system
- Comments system
- Permission grants

**Most Recent Migration:** `20251201180000_grant_clients_edit_to_admin.sql`

---

## 🗂️ Data Script Inventory

### Setup & Seeding Scripts (Run in Order)
1. **`seed-default-message-templates.sql`** - Message templates (SMS/Email)
2. **`seed-mvp-test-data.sql`** - Basic test data (orgs, users, campaigns, contacts)
3. **`seed-comprehensive-demo-data.sql`** - Full demo environment (optional)
4. **`populate-gift-card-pools.sql`** - Test gift card inventory
5. **`seed-complete-analytics-data.sql`** - Historical analytics data (optional)

### Verification Scripts
6. **`verify-mvp-database.sql`** - Database health check (read-only)

### Maintenance Scripts
7. **`cleanup-demo-data.sql`** - Remove demo data (⚠️ DESTRUCTIVE)
8. **`fix-campaign-audience-links.sql`** - Repair campaign-audience relationships
9. **`migrate-legacy-pool-ids.sql`** - Migrate old pool IDs

---

## 🔧 TypeScript Migration Scripts

### Data Migration Scripts (Run After SQL Migrations)
1. **`scripts/migrate-campaigns-to-brand-denomination.ts`**
   - Migrates campaign conditions from `pool_id` → `brand_id + card_value`
   - Dry-run mode by default
   - Run: `npm run migrate:gift-cards` or `ts-node scripts/migrate-campaigns-to-brand-denomination.ts`

2. **`scripts/migrate-gift-card-pools-to-brand-value.ts`**
   - Migrates gift card pools to brand+value system
   - Run: `ts-node scripts/migrate-gift-card-pools-to-brand-value.ts`

---

## 📝 Step-by-Step Execution Plan

### ⚠️ PRE-EXECUTION CHECKLIST

- [ ] **Backup Database** - Create snapshot in Supabase dashboard
- [ ] **Fix .env file** - Remove BOM/special characters
- [ ] **Verify Supabase credentials** - Ensure `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- [ ] **Test connection** - Verify Supabase project is accessible
- [ ] **Review migrations** - Understand what each migration does

---

### 🎯 EXECUTION METHOD OPTIONS

We have **3 methods** to apply migrations. Choose ONE based on your preference:

---

## METHOD 1: Supabase Dashboard (RECOMMENDED)

**Best for:** Visual feedback, easy to track progress, no CLI issues

### Steps:

1. **Navigate to SQL Editor**
   ```
   https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
   ```

2. **Apply Migrations One by One**
   - Open each migration file from `supabase/migrations/` in order
   - Copy the SQL content
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Verify no errors before proceeding to next
   - **CRITICAL:** Start with `20251110154551` and go in chronological order

3. **Track Progress**
   Create a checklist and mark off each migration as completed

**Pros:**
- No CLI setup needed
- Visual feedback on errors
- Can review SQL before execution
- No encoding issues

**Cons:**
- Manual process (127 migrations)
- Time-consuming
- Prone to human error (skipping files)

---

## METHOD 2: Supabase CLI (FASTEST)

**Best for:** Automated execution, proper migration tracking

### Prerequisites:

1. **Fix .env File Encoding**
   ```powershell
   # Open .env in a proper text editor (VS Code)
   # Save with UTF-8 encoding (no BOM)
   # Remove any special characters at start of file
   ```

2. **Install Supabase CLI** (already done)
   ```powershell
   npx supabase --version  # Should show 2.64.2
   ```

3. **Link Project**
   ```powershell
   npx supabase link --project-ref arzthloosvnasokxygfo
   ```
   - Enter your Supabase database password when prompted

### Execute Migrations:

```powershell
# Push all migrations at once
npx supabase db push

# This will:
# - Detect all unapplied migrations
# - Apply them in order
# - Track applied migrations
# - Show progress and errors
```

### Verify:

```powershell
# List migration status
npx supabase migration list

# Should show all 127 migrations as "Applied"
```

**Pros:**
- Automated (one command)
- Proper migration tracking
- Fast
- Can't skip migrations accidentally

**Cons:**
- Requires fixing .env file
- Requires CLI setup
- Less visibility into what's being executed

---

## METHOD 3: Direct Database Connection (ADVANCED)

**Best for:** Power users, automation scripts

### Prerequisites:

1. **Get Database Connection String**
   - Go to Supabase Dashboard → Settings → Database
   - Copy "Connection String" (Pooler or Direct)

2. **Install psql** (PostgreSQL client)
   ```powershell
   # Install PostgreSQL (includes psql)
   # Or use GUI tool like pgAdmin, DBeaver, TablePlus
   ```

### Execute:

```powershell
# Connect to database
psql "your-connection-string-here"

# Apply migrations in order
\i supabase/migrations/20251110154551_4112d4f9-7988-478d-a45f-7bbe6d4d142d.sql
\i supabase/migrations/20251110154825_a77aba6c-db5e-4282-b5df-0c198df2f30f.sql
# ... continue for all 127 migrations
```

**Pros:**
- Direct database access
- Can use familiar tools
- Can batch execute

**Cons:**
- Requires PostgreSQL client
- Manual tracking of applied migrations
- Need to maintain correct order

---

## 🚀 RECOMMENDED EXECUTION PLAN

### Phase 1: Fix Environment (5 minutes)

```powershell
# 1. Fix .env file encoding
# Open .env in VS Code
# File → Save with Encoding → UTF-8
# Remove any BOM (byte order mark) characters

# 2. Test Supabase CLI
npx supabase link --project-ref arzthloosvnasokxygfo
```

### Phase 2: Apply Schema Migrations (10-15 minutes)

**Option A: CLI (Recommended)**
```powershell
npx supabase db push
```

**Option B: Dashboard**
- Go through all 127 migrations manually
- Use the checklist at the end of this document

### Phase 3: Verify Migration Success (2 minutes)

```powershell
# Using CLI
npx supabase migration list

# Or run verification script in Supabase SQL Editor
# Execute: scripts/sql/verify-mvp-database.sql
```

### Phase 4: Run Data Seeding Scripts (5-10 minutes)

**Execute in Supabase SQL Editor in this order:**

1. `scripts/sql/seed-default-message-templates.sql`
2. `scripts/sql/seed-mvp-test-data.sql`
3. **[OPTIONAL]** `scripts/sql/seed-comprehensive-demo-data.sql`
4. `scripts/sql/populate-gift-card-pools.sql`
5. **[OPTIONAL]** `scripts/sql/seed-complete-analytics-data.sql`

### Phase 5: Run TypeScript Data Migrations (5 minutes)

```powershell
# Ensure environment variables are set
# VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# 1. Migrate campaigns (dry run first)
npm run migrate:gift-cards

# 2. If dry run looks good, apply changes
npm run migrate:gift-cards -- --apply

# 3. Migrate gift card pools
ts-node scripts/migrate-gift-card-pools-to-brand-value.ts
```

### Phase 6: Final Verification (2 minutes)

```sql
-- Run in Supabase SQL Editor
-- Execute: scripts/sql/verify-mvp-database.sql

-- Additional checks:
SELECT COUNT(*) FROM credit_accounts;  -- Should have records
SELECT COUNT(*) FROM gift_card_pools;  -- Should have records
SELECT COUNT(*) FROM campaign_conditions WHERE brand_id IS NOT NULL;  -- Migrated conditions
```

---

## 📊 Migration Dependencies

### Critical Dependencies (Must Run in Order)

1. **Credit System** (Dec 1)
   - Must run `20251201000000_create_credit_system.sql` BEFORE:
     - `20251201000002_initialize_credit_accounts.sql`
     - `20251201140000_create_credit_management_system.sql`

2. **Gift Card Functions** (Dec 1)
   - Must run these in order:
     - `20251201000004_add_gift_card_assignment_tracking.sql`
     - `20251201000005_create_recipient_gift_cards_junction.sql`
     - `20251201000006_create_brand_denomination_functions.sql` ⭐ **CRITICAL**
     - `20251201000007_create_smart_pool_selection.sql`
     - `20251201000008_update_claim_card_atomic_v2.sql`

3. **Tags & Comments** (Dec 1)
   - `20251201160000_create_tags_system.sql` → `20251201170000_create_comments_system.sql`

---

## 🔍 Critical Migrations Explained

### Migration: `20251201000000_create_credit_system.sql`
**Purpose:** Replaces pool-based system with hierarchical credit accounts  
**Impact:** Major architecture change  
**Creates:**
- `credit_accounts` table
- Credit transaction tracking
- Platform → Agency → Client → Campaign hierarchy

### Migration: `20251201000006_create_brand_denomination_functions.sql`
**Purpose:** Fixes "Failed to load gift card options" error  
**Impact:** Critical for campaign wizard  
**Creates:**
- `get_available_brand_denominations()` function
- `get_brand_denomination_info()` function
- Aggregates pools by brand + denomination

### Migration: `20251201000008_update_claim_card_atomic_v2.sql`
**Purpose:** Atomic gift card assignment  
**Impact:** Prevents double-assignment of cards  
**Creates:**
- `claim_card_atomic()` function with proper locking

---

## ⚠️ Common Issues & Solutions

### Issue 1: .env Encoding Error
```
failed to parse environment file: .env (unexpected character '»' in variable name)
```

**Solution:**
1. Open `.env` in VS Code
2. Check bottom-right corner for encoding
3. If it shows "UTF-8 with BOM", change to "UTF-8"
4. Save file
5. Alternatively, recreate `.env` file from scratch

### Issue 2: Function Already Exists
```
ERROR: function "get_available_brand_denominations" already exists
```

**Solution:**
- Function was already created by a previous migration
- Safe to skip or modify migration to use `CREATE OR REPLACE FUNCTION`

### Issue 3: Foreign Key Constraint Violation
```
ERROR: insert or update on table violates foreign key constraint
```

**Solution:**
- Ensure you're running migrations in chronological order
- Parent tables must be created before child tables

### Issue 4: Permission Denied
```
ERROR: permission denied for table X
```

**Solution:**
- Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` not `SUPABASE_ANON_KEY`
- Check that RLS policies are properly configured

---

## 📋 Migration Execution Checklist

### November 10, 2025 (11 migrations)
- [ ] `20251110154551_4112d4f9-7988-478d-a45f-7bbe6d4d142d.sql`
- [ ] `20251110154825_a77aba6c-db5e-4282-b5df-0c198df2f30f.sql`
- [ ] `20251110155200_8ce0c541-c41a-47b6-abbf-338382c2355f.sql`
- [ ] `20251110162523_c26f7ff1-83f5-4ae2-825f-54d6631044f0.sql`
- [ ] `20251110164041_d0a345d3-1665-4983-af6d-a4837335cb25.sql`
- [ ] `20251110165557_15d6fff0-80af-40fb-af52-1fffda0d1e3c.sql`
- [ ] `20251110170355_9020a880-eabe-431f-9726-ecbd9c096246.sql`
- [ ] `20251110171232_a28ad9c2-4bd0-4cec-87be-d8bde7a24e87.sql`
- [ ] `20251110171834_866dec7f-110f-496b-bc58-6fbb0243a430.sql`
- [ ] `20251110180617_5bab49f3-77f0-4243-bde9-43abd19087f9.sql`
- [ ] `20251110182028_3d4aa97d-d610-4b3b-9b10-764e53b25ad4.sql`

### November 11, 2025 (4 migrations)
- [ ] `20251111151148_2ae8ab98-b27c-4205-b78d-1798262ca34a.sql`
- [ ] `20251111153453_2c1ecbad-9c71-4b6a-b99c-82dc808f756c.sql`
- [ ] `20251111161319_917b90dd-77af-475b-b94d-5d4116a243f5.sql`
- [ ] `20251111213753_dd57280f-5324-46fa-b908-f6583cf97e09.sql`

### November 13-14, 2025 (5 migrations)
- [ ] `20251113141416_e37e9874-2012-49aa-b0e0-557f8b79362f.sql`
- [ ] `20251113145748_79be29ca-170d-452a-97d6-e3ddbab4153f.sql`
- [ ] `20251114153421_ff259772-c668-4231-af0b-ec7c99209d30.sql`
- [ ] `20251114164229_faf0fc5a-e6a7-44f0-9ca1-9071b0b21d27.sql`
- [ ] `20251114172954_b9e39acd-52a1-40a1-8722-1bc70382c2aa.sql`

### November 15-16, 2025 (10 migrations)
- [ ] `20251115160326_796b86c5-2a72-4849-9e19-31ff7d3fe5a3.sql`
- [ ] `20251115232338_6c547d8d-473f-48c1-97c8-a5b8924f9eb8.sql`
- [ ] `20251116173708_d6778b46-a3f6-4c97-a90d-0204ccfb7c96.sql`
- [ ] `20251116173734_5213bb05-a197-4445-8849-3aad661f9f87.sql`
- [ ] `20251116181639_b33c0d99-f839-408d-b3eb-fd877e7d6d48.sql`
- [ ] `20251116182149_06c1047c-1864-4e90-b711-3af558626bb7.sql`
- [ ] `20251116211457_d2a5ea1a-e382-44c6-ae51-d38119de92f8.sql`
- [ ] `20251116213735_21f9abab-cbee-469d-8571-eaae0a8c3866.sql`
- [ ] `20251116220517_c67223ac-ab9a-4505-a649-be819d5d2c64.sql`
- [ ] `20251116223600_be47a336-190b-4830-a694-e0f139509298.sql`

### November 17, 2025 (14 migrations)
- [ ] `20251116234145_a46dcd4d-86d0-444a-a324-d35774a4ea4a.sql`
- [ ] `20251117003338_688f6ef7-611f-4a5d-851d-4d6743214a49.sql`
- [ ] `20251117003624_c23061a4-950d-461e-bd60-b84b4cdc6c13.sql`
- [ ] `20251117003703_098becbd-6d40-493b-b714-4176243c36fd.sql`
- [ ] `20251117003956_57ee0ceb-093d-4644-9264-634f1009bde1.sql`
- [ ] `20251117004326_6ee589da-b472-4caf-8cff-cd8ea442e0f7.sql`
- [ ] `20251117004914_f3c6547e-05e2-47e1-9e9a-e57dc6d313a9.sql`
- [ ] `20251117010005_893f10e7-a6e0-4210-b1cd-372269679434.sql`
- [ ] `20251117011651_1869c869-81a2-472b-9a10-0aba615614c7.sql`
- [ ] `20251117013908_b6a4752f-5af4-44df-9f2b-f0bae28ccd3a.sql`
- [ ] `20251117152303_3a25d2ca-5c10-476c-8622-69a1fc6f99b3.sql`
- [ ] `20251117154942_0c48df64-221f-40fd-88fe-347350ee9c42.sql`
- [ ] `20251117162324_a1699d73-e1c8-4421-9fb8-74eacb8009b0.sql`
- [ ] `20251117164604_4a99bab1-b691-4644-bbe9-19b796db6ef8.sql`

### November 17-18, 2025 (continued - 5 migrations)
- [ ] `20251117165553_f4fc7e54-632d-4647-a353-63bec963d3fa.sql`
- [ ] `20251117170439_e2516c68-40ae-42e0-b580-1210e66e15f2.sql`
- [ ] `20251117182157_be81fb99-897f-4164-b69d-05fa7ba13f21.sql`
- [ ] `20251118150106_b9d68838-2d47-4bfe-aeb1-e0655f4dc69f.sql`
- [ ] `20251118150137_d0aa519d-1d72-4c37-ba28-e4f328436074.sql`

### November 19-21, 2025 (6 migrations)
- [ ] `20251119213247_aa00f453-76fa-4675-99bf-3f67958e9821.sql`
- [ ] `20251120215813_2f914bca-b18c-423c-8be4-9fde9a8422a1.sql`
- [ ] `20251120220726_461dbd7f-fb2c-4ff9-ac88-b427e48b4102.sql`
- [ ] `20251120232336_4b2733e9-6b70-484f-a00a-94013d01ec17.sql`
- [ ] `20251121000611_13d08274-99dc-4e14-ac7d-7155d0812fbc.sql`
- [ ] `20251121010416_2839a323-b7d1-4ab0-bcb2-308d54371fa4.sql`

### November 21-23, 2025 (8 migrations)
- [ ] `20251121022459_d5d84f72-a1ee-42c0-a928-240bfe8ddd86.sql`
- [ ] `20251123002417_dc1d4467-d517-4e93-82fe-42c27efaedea.sql`
- [ ] `20251123004620_33ae1b08-6a1b-43f7-bd2b-5087aaff548d.sql`
- [ ] `20251123011742_a1391871-0753-442d-9b5a-ee1ab15b8669.sql`
- [ ] `20251123011800_f4a07dd5-0a48-4d96-93cc-b588501ea319.sql`
- [ ] `20251123022803_9a034a95-f474-4d2f-b253-9aa446709602.sql`
- [ ] `20251123035059_9319601e-15fd-4f25-aef4-ae3a327aa193.sql`
- [ ] `20251123183333_9c39619e-d814-47b6-b760-d24ad40a439d.sql`

### November 23-24, 2025 (continued - 6 migrations)
- [ ] `20251123185644_65119f0f-2134-425b-bbf2-d5e5be45ace9.sql`
- [ ] `20251123192703_821abc7f-b968-4cc3-9abe-9424c75a03ce.sql`
- [ ] `20251123192816_c37244d0-cd64-4895-94f8-b5e99f3c208d.sql`
- [ ] `20251123223449_ec4cee7d-0bb3-4b28-a65c-4727328bb2fa.sql`
- [ ] `20251124031104_a1d31483-c597-48c2-afb0-6bfd1896c4b0.sql`
- [ ] `20251124031118_7d384168-825c-4846-987e-7161e1d0ad4b.sql`

### November 24-25, 2025 (11 migrations)
- [ ] `20251124051439_4f44d57e-3fa2-42e2-9202-fc93fc3d3b14.sql`
- [ ] `20251125013932_3529c640-ca27-4fe8-9e5e-bd2e60bfa6a5.sql`
- [ ] `20251125015402_3b29cad8-6651-4634-a790-17347b16f417.sql`
- [ ] `20251125015416_a677f240-f981-4f9a-bffb-3b12b32c1318.sql`
- [ ] `20251125024450_958fb214-a42e-4222-880d-20de046c297c.sql`
- [ ] `20251125024504_cfa93c8a-5a7b-4370-a6e8-55790a2251b5.sql`
- [ ] `20251125025502_d56bcc11-dcd5-4592-8a0c-ce6856e4079f.sql`
- [ ] `20251125030203_b2b8acef-3fb6-4a81-b774-1c63a7dce4b6.sql`
- [ ] `20251125030218_d2b144a0-7326-41a9-b008-828a379da587.sql`
- [ ] `20251125204814_751ddbe8-5183-4d6a-adc2-df4870deb41b.sql`
- [ ] `20251125205726_c4f97578-88f4-4cae-9be9-f5034c9afb64.sql`

### November 25, 2025 (continued - 4 migrations)
- [ ] `20251125210442_6861496e-b685-4248-bb1a-bd0d0999468c.sql`
- [ ] `20251125212044_751754f1-e0ea-4ab9-af73-2d9c84c870f6.sql`
- [ ] `20251125222001_e90b7303-317f-4009-ac27-d3e5c7ae1502.sql`
- [ ] `20251125224014_b0a9d5e6-67b6-4449-83cb-aafec5b3a315.sql`

### November 25-26, 2025 (continued - 6 migrations)
- [ ] `20251125233325_d1eaadb3-2741-4606-b872-111552856011.sql`
- [ ] `20251126150856_95dca6b3-8187-4ec9-8955-65b282330f4c.sql`
- [ ] `20251126151909_428de0b3-80ce-45dd-b0ed-8e2cccaa483c.sql`
- [ ] `20251126165720_468d6215-a1a8-49a7-86fc-95be79c94db4.sql`
- [ ] `20251126170157_db2ca5f0-0468-4e15-9f37-3075c922e91b.sql`
- [ ] `20251126170219_a9bf74ff-4a5f-4c28-b046-4e15b09c4c20.sql`

### November 26, 2025 (continued - 3 migrations)
- [ ] `20251126170441_100e30bd-90d7-438d-a1b0-8ae843dbfdde.sql`
- [ ] `20251126170921_86bad5a2-f944-442e-831f-225922a4c8d7.sql`
- [ ] `20251126184814_4441f262-bf67-445a-a342-dfda9cbe3c2a.sql`

### November 27, 2025 (6 migrations)
- [ ] `20251127_add_demo_brand_flag.sql`
- [ ] `20251127_add_message_templates.sql`
- [ ] `20251127_performance_indexes.sql`
- [ ] `20251127000000_enhance_campaign_system.sql`
- [ ] `20251127000146_51d37731-cb59-40d3-b08b-62fa40a18ea0.sql`
- [ ] `20251127022238_8ae806fd-06cc-4159-bb79-cfecb878ded2.sql`

### November 28-29, 2025 (6 migrations)
- [ ] `20251128000001_cleanup_old_test_data.sql`
- [ ] `20251128000002_add_simulation_tracking.sql`
- [ ] `20251128000003_email_delivery_logs.sql`
- [ ] `20251129000001_add_mailing_method.sql`
- [ ] `20251129000002_add_sms_opt_in_tracking.sql`
- [ ] `20251129200001_add_redemption_fee_config.sql`

### November 29-30, 2025 (continued - 3 migrations)
- [ ] `20251129200002_add_performance_indexes.sql`
- [ ] `20251130000001_add_unique_code_constraints.sql`
- [ ] `20251130000002_backfill_unique_codes.sql`

### December 1, 2025 ⭐ CRITICAL (19 migrations)
- [ ] `20251201000000_create_credit_system.sql` ⚠️ MAJOR CHANGE
- [ ] `20251201000001_archive_legacy_system.sql`
- [ ] `20251201000002_initialize_credit_accounts.sql`
- [ ] `20251201000003_testing_script.sql`
- [ ] `20251201000004_add_gift_card_assignment_tracking.sql`
- [ ] `20251201000005_create_recipient_gift_cards_junction.sql`
- [ ] `20251201000006_create_brand_denomination_functions.sql` ⭐ **FIXES ERROR**
- [ ] `20251201000007_create_smart_pool_selection.sql`
- [ ] `20251201000008_update_claim_card_atomic_v2.sql`
- [ ] `20251201000009_update_campaign_conditions_schema.sql`
- [ ] `20251201100000_create_error_tracking_tables.sql`
- [ ] `20251201110000_create_atomic_transaction_functions.sql`
- [ ] `20251201120000_create_inventory_monitoring.sql`
- [ ] `20251201130000_create_validation_functions.sql`
- [ ] `20251201140000_create_credit_management_system.sql`
- [ ] `20251201150000_create_bulk_operations_support.sql`
- [ ] `20251201160000_create_tags_system.sql`
- [ ] `20251201170000_create_comments_system.sql`
- [ ] `20251201180000_grant_clients_edit_to_admin.sql` ← **LATEST**

### Data Seeding Scripts (Run After Migrations)
- [ ] `scripts/sql/seed-default-message-templates.sql`
- [ ] `scripts/sql/seed-mvp-test-data.sql`
- [ ] `scripts/sql/populate-gift-card-pools.sql`
- [ ] `scripts/sql/verify-mvp-database.sql` (verification)

### TypeScript Data Migrations (Run Last)
- [ ] `npm run migrate:gift-cards` (dry run)
- [ ] `npm run migrate:gift-cards -- --apply` (live)
- [ ] `ts-node scripts/migrate-gift-card-pools-to-brand-value.ts`

---

## 🎯 Quick Start Command Summary

```powershell
# 1. Fix .env file (manual - open in VS Code, save as UTF-8)

# 2. Link Supabase project
npx supabase link --project-ref arzthloosvnasokxygfo

# 3. Apply ALL schema migrations
npx supabase db push

# 4. Verify migrations
npx supabase migration list

# 5. Go to Supabase SQL Editor and run data scripts:
# - seed-default-message-templates.sql
# - seed-mvp-test-data.sql
# - populate-gift-card-pools.sql
# - verify-mvp-database.sql

# 6. Run TypeScript migrations
npm run migrate:gift-cards
npm run migrate:gift-cards -- --apply

# 7. Final verification
# Run verify-mvp-database.sql in Supabase SQL Editor
```

---

## 📞 Support & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu
- **SQL Editor:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
- **Database Logs:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/logs/postgres-logs
- **Documentation:** `/public/docs/` in this repository

---

## ⚠️ IMPORTANT NOTES

1. **Backup First:** Always backup your database before running migrations
2. **Order Matters:** Migrations MUST be run in chronological order
3. **No Rollback:** Some migrations (especially Dec 1 credit system) are difficult to rollback
4. **Test First:** Consider running on a test database first
5. **Monitor Logs:** Watch Supabase logs during migration for errors
6. **Credit System:** The Dec 1 migrations fundamentally change how gift cards work
7. **Time Estimate:** Full migration process: 30-45 minutes
8. **Downtime:** Some migrations may require brief downtime

---

## ✅ Post-Migration Verification

After completing all migrations, verify:

1. **Schema exists:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Functions exist:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   ORDER BY routine_name;
   ```

3. **Key tables have data:**
   ```sql
   SELECT 'credit_accounts' as table, COUNT(*) FROM credit_accounts
   UNION ALL
   SELECT 'gift_card_pools', COUNT(*) FROM gift_card_pools
   UNION ALL
   SELECT 'campaigns', COUNT(*) FROM campaigns
   UNION ALL
   SELECT 'organizations', COUNT(*) FROM organizations;
   ```

4. **Critical functions work:**
   ```sql
   -- Test get_available_brand_denominations
   SELECT * FROM get_available_brand_denominations('some-client-id'::uuid);
   ```

5. **Application loads without errors**
   - Open application
   - Navigate to Campaigns → Create Campaign
   - Check if gift card options load
   - Verify no console errors

---

## 🔄 Rollback Plan

If migrations fail or cause issues:

1. **Restore from backup:**
   - Go to Supabase Dashboard → Settings → Backups
   - Restore to pre-migration snapshot

2. **Partial rollback:**
   - Not recommended - migrations have dependencies
   - Safer to restore full backup

3. **Data migration rollback:**
   - Use generated rollback scripts from TypeScript migrations
   - Located in project root as `rollback-gift-card-migration-*.sql`

---

## 📝 Notes

- Created: December 1, 2025
- Author: Automated Audit
- Database: ACE Engage Production
- Project: arzthloosvnasokxygfo
- Status: Ready for execution
- Priority: HIGH - Application functionality impaired without migrations

---

**END OF AUDIT DOCUMENT**


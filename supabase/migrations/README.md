# Database Migrations Index

## Overview

Complete index of all database migrations for the ACE Engage platform. Migrations are organized chronologically and categorized by purpose.

**Total Migrations:** ~148 (after consolidation)  
**Date Range:** November 2024 - December 2024  
**Last Updated:** December 4, 2024

---

## Migration Organization

### By Date

#### November 2024 - Initial Schema
**20251110*** - Foundation** (Early November)
- Core table creation
- Initial schema setup
- Base relationships

**20251111*** - Extended Schema**
- Additional tables
- Foreign keys
- Indexes

**20251113*** - 20251118*** - Features**
- Campaign system
- Contact management
- Gift card foundations

**20251123*** - Late November**
- Feature completions
- Performance optimizations

#### December 2024 - Refinements & Fixes
**20251202*** - Gift Card Overhaul**
- Brand-denomination marketplace
- Custom pricing
- Inventory management
- Legacy table removal

**20251203*** - December 3rd Updates**
- Call center permissions
- SMS provider settings
- Verification columns
- Campaign condition repairs
- Rate limiting
- AI landing pages

**20251204*** - December 4th (Recent)**
- Provisioning monitoring
- Duplicate cleanup
- Balance tracking
- Auto-repair functions
- Lookup optimizations

---

## By Category

### 1. Core Schema & Tables

**Purpose:** Initial database structure

- `20251110154551_*` - Initial setup
- `20251110154825_*` - Core tables
- `20251110155200_*` - Relationships
- `20251110162523_*` through `20251110182028_*` - Extended schema
- `20251111151148_*` through `20251117182157_*` - Feature tables

### 2. Authentication & Users

**Purpose:** User management, roles, permissions

- `20251202000006_add_admin_to_user_roles.sql` - Admin role
- `20251202000005_set_specific_admin.sql` - Set admin user
- `20251203000011_add_client_slug.sql` - Client slugs
- `20251203000012_auto_admin_domain_emails.sql` - Auto-admin domains

### 3. Gift Card System

**Purpose:** Complete gift card provisioning and management

**Foundation:**
- `20251202100001_enhance_gift_card_brands.sql` - Enhanced brands
- `20251203000002_add_custom_pricing_to_denominations.sql` - Custom pricing
- `20251203000005_create_gift_card_functions.sql` - Database functions
- `20251203000004_seed_gift_card_test_data.sql` - Test data

**Inventory & Provisioning:**
- `20251204000001_add_inventory_balance_tracking.sql` - Balance tracking
- `20251204100001_set_tillo_balance_check_method.sql` - Tillo integration
- `20251204200000_ensure_provisioning_functions.sql` - Provisioning functions
- `20251204200001_fix_null_brand_id_conditions.sql` - Fix null brands

**Monitoring & Logging:**
- `20251204300000_add_provisioning_trace_logging.sql` - Trace logging
- `20251204300001_create_provisioning_monitoring_views.sql` - Monitoring views

**Data Cleanup:**
- `20251203200000_cleanup_duplicate_starbucks.sql` - Starbucks cleanup
- `20251204500000_cleanup_duplicate_assigned_cards.sql` - Duplicate cleanup
- `20251204500001_fix_pascale_duplicates.sql` - Specific duplicates

**Lookup Functions:**
- `20251204700000_lookup_card_by_code.sql` - Gift card lookup

### 4. Campaign System

**Purpose:** Campaign management, conditions, tracking

**Core Campaign Features:**
- `20251203300002_add_sms_opt_in_message_to_campaigns.sql` - SMS opt-in
- `20251203300003_add_rewards_enabled_to_campaigns.sql` - Rewards toggle
- `20251203500001_add_missing_campaign_status_values.sql` - Status values
- `20251203600001_add_missing_campaign_status_values.sql` - More statuses

**Campaign Conditions:**
- `20251203300001_add_sms_template_to_campaign_conditions.sql` - SMS templates
- `20251203800001_backfill_campaign_conditions_gift_cards.sql` - Backfill
- `20251203900005_repair_campaign_conditions_data.sql` - Repair data
- `20251204200001_fix_null_brand_id_conditions.sql` - Fix null brands
- `20251204400001_auto_repair_all_conditions.sql` - Auto-repair

**Campaign Fixes:**
- `20251203950001_fix_spring_27_and_recent_campaigns.sql` - Fix specific campaigns

### 5. Call Center & SMS

**Purpose:** Call center operations and SMS delivery

**Permissions:**
- `20251203000010_fix_call_center_permissions.sql` - Call center access

**SMS Providers:**
- `20251203400001_add_sms_provider_settings.sql` - Provider configuration

**Verification:**
- `20251203200001_add_verification_disposition_columns.sql` - Disposition tracking

### 6. Credit System

**Purpose:** Credit accounts and billing

- `20251203000020_add_auto_reload_to_credit_accounts.sql` - Auto-reload
- `20251203000021_enforce_campaign_activation_credit_check.sql` - Credit validation
- `20251203400000_fix_claim_card_credits.sql` - Fix credit claiming

### 7. AI & Landing Pages

**Purpose:** AI-powered features

- `20251203000003_ai_landing_page_system.sql` - AI landing page system

### 8. Rate Limiting & Security

**Purpose:** Security and abuse prevention

- `20251203000001_create_rate_limiting_system.sql` - Rate limiting

### 9. Error Handling & Logging

**Purpose:** Error tracking and monitoring

- `20251203550001_enhance_error_logs_table.sql` - Enhanced error logs

### 10. Service & RPC Functions

**Purpose:** Database helper functions

- `20251203700001_add_service_role_policies.sql` - Service role access
- `20251203900001_add_missing_gift_card_rpc.sql` - Gift card RPCs
- `20251203900003_add_missing_gift_card_rpc.sql` - More RPCs

### 11. Organization Management

**Purpose:** Multi-tenant organization structure

- `20251202100000_add_organization_archive_columns.sql` - Archive support

---

## Superseded Migrations

Some migrations have been superseded by later ones but are kept for historical record:

| Migration | Superseded By | Reason |
|-----------|---------------|---------|
| `20251204400000_cleanup_duplicate_assigned_cards.sql` | `20251204500000_*` | Identical, newer kept |
| `20251204600000_lookup_card_by_code.sql` | `20251204700000_*` | Identical, newer kept |

---

## Migration Best Practices

### When Creating New Migrations

1. **Naming Convention:**
   ```
   YYYYMMDDHHMM_descriptive_name.sql
   Example: 20251204120000_add_user_preferences_table.sql
   ```

2. **Include in Migration:**
   - `CREATE OR REPLACE` for functions (idempotent)
   - `IF NOT EXISTS` for tables
   - `ON CONFLICT DO NOTHING` for data inserts
   - Rollback instructions in comments

3. **Testing:**
   - Test locally first: `supabase db reset`
   - Verify in staging
   - Document in this README

### Applying Migrations

**Automatic (Recommended):**
```bash
supabase db push
```

**Manual:**
```bash
supabase migration up
```

**Selective:**
```sql
-- Run specific migration in Supabase SQL Editor
\i supabase/migrations/FILENAME.sql
```

---

## Migration Health Check

### Verify All Applied

```sql
-- Check migration status
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- Count applied migrations
SELECT COUNT(*) as applied_migrations
FROM supabase_migrations.schema_migrations;
```

### Check for Failed Migrations

```bash
# View migration logs
supabase db push --dry-run

# Check for errors
grep -i "error" supabase/.branches/main/migration_status.log
```

---

## Recent Changes

### December 4, 2024
- Removed 2 duplicate migrations (lookup_card, cleanup_duplicate)
- Created this comprehensive README
- Organized migrations by category
- Documented superseded migrations

### December 3, 2024
- Added SMS provider settings
- Fixed call center permissions
- Repaired campaign conditions
- Enhanced error logging

### December 2, 2024
- Migrated to brand-denomination marketplace
- Dropped legacy gift card tables
- Added custom pricing
- Enhanced gift card brands

---

## Related Documentation

- [Migration Consolidation Log](../../MIGRATION_CONSOLIDATION_LOG.md)
- [Database Schema](../../public/docs/4-DEVELOPER-GUIDE/DATABASE.md)
- [Deployment Guide](../../public/docs/4-DEVELOPER-GUIDE/DEPLOYMENT.md)
- [Operations Guide](../../public/docs/8-OPERATIONS/INDEX.md)

---

**Maintained By:** Database Team  
**Last Updated:** December 4, 2024  
**Migration Count:** ~148 active migrations

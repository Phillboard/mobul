# SQL Utility Scripts

SQL scripts for database operations, seeding, and verification for the ACE Engage platform.

## Available Scripts

### Setup & Seeding Scripts

#### `seed-mvp-test-data.sql`
**Purpose:** Create basic test data for MVP testing  
**Use When:** Setting up a new development environment  
**Creates:**
- Sample organizations (agency + clients)
- Test users with various roles
- Basic campaigns
- Sample contacts

**Safety:** Safe to run on empty databases. Will create minimal test data.

#### `seed-comprehensive-demo-data.sql`
**Purpose:** Generate complete demo data with realistic scenarios  
**Use When:** Creating a full demo environment or testing all features  
**Creates:**
- Multiple organizations with hierarchies
- Full user roster across all roles
- Complete campaigns with tracking
- Large contact lists
- Gift card pools with inventory
- Analytics data

**Safety:** Creates extensive data. Review before running on production.

#### `seed-complete-analytics-data.sql`
**Purpose:** Populate analytics tables with historical data  
**Use When:** Testing analytics dashboards and reports  
**Creates:**
- Campaign events and tracking data
- Conversion metrics
- Delivery logs
- Performance data across time periods

**Safety:** Safe for existing databases. Adds analytics data without affecting core records.

#### `seed-default-message-templates.sql`
**Purpose:** Add default SMS and email templates  
**Use When:** Initial setup or template reset  
**Creates:**
- Default gift card delivery messages
- Opt-in confirmation templates
- Reminder message templates

**Safety:** Safe to run. Uses UPSERT to avoid duplicates.

#### `populate-gift-card-pools.sql`
**Purpose:** Add test gift cards to existing pools  
**Use When:** Testing gift card redemption workflows  
**Creates:**
- Test gift card codes
- Balance entries
- Pool inventory

**Safety:** Safe for testing. Uses realistic but fake card codes.

### Verification Scripts

#### `verify-mvp-database.sql`
**Purpose:** Check database setup and configuration  
**Use When:** After initial setup or troubleshooting  
**Checks:**
- Table existence
- RLS policies
- Required indexes
- Data integrity

**Safety:** Read-only. Does not modify data.

### Maintenance Scripts

#### `cleanup-demo-data.sql`
**Purpose:** Remove demo and test data  
**Use When:** Cleaning up after testing or before production deployment  
**Removes:**
- Demo organizations (flagged with `is_demo_brand`)
- Associated campaigns, contacts, and activities
- Test gift cards
- Analytics data from demo campaigns

**Safety:** ⚠️ DESTRUCTIVE. Only removes records flagged as demo data. Review carefully before use.

#### `fix-campaign-audience-links.sql`
**Purpose:** Repair campaign-audience relationships  
**Use When:** Troubleshooting campaign audience issues  
**Fixes:**
- Missing or broken campaign_audiences entries
- Orphaned audience records
- Mismatched campaign-contact relationships

**Safety:** Modifies existing data. Back up first.

## Usage Guidelines

### Running Scripts

1. **Backup First:** Always backup your database before running modification scripts
2. **Review:** Read through the entire script before executing
3. **Test Environment:** Test on a development database first
4. **Execute:** Run via Supabase SQL Editor or CLI

### Script Execution Order (New Setup)

For a new database setup, run in this order:

1. `seed-default-message-templates.sql` - Set up templates first
2. `seed-mvp-test-data.sql` - Create basic structure
3. `seed-comprehensive-demo-data.sql` - (Optional) Add full demo data
4. `populate-gift-card-pools.sql` - Add gift card inventory
5. `seed-complete-analytics-data.sql` - (Optional) Add analytics history
6. `verify-mvp-database.sql` - Verify everything is correct

### Cleaning Up

To reset a test environment:

1. `cleanup-demo-data.sql` - Remove all demo data
2. `verify-mvp-database.sql` - Verify cleanup was successful

## Script Dependencies

Some scripts expect certain data to exist:

- `populate-gift-card-pools.sql` requires existing gift card pools (created by seed scripts)
- `seed-complete-analytics-data.sql` requires existing campaigns (from seed scripts)
- `fix-campaign-audience-links.sql` requires existing campaigns and audiences

## Best Practices

- **Never run cleanup scripts on production** unless you're absolutely certain
- **Use transactions** when testing modifications
- **Document custom changes** if you modify these scripts
- **Check for conflicts** if you've made manual data changes
- **Monitor execution** for errors or warnings

## Troubleshooting

### Script Fails with Foreign Key Error
- Ensure you're running scripts in the correct order
- Check that required parent records exist

### Data Not Appearing
- Verify RLS policies allow your user to see the data
- Check that you're logged in as the correct user
- Run the verification script to check database state

### Cleanup Script Not Removing Everything
- Ensure records are properly flagged as demo data
- Check for foreign key constraints preventing deletion
- Review script output for specific errors

## Migration vs. Utility Scripts

**These are utility scripts, not migrations:**

- Migrations: In `supabase/migrations/` - Schema and structure changes
- Utility Scripts: In `scripts/sql/` - Data operations and seeding

Do not confuse these with database migrations. Migrations run automatically on deployment, while these utility scripts are run manually as needed.

## Support

For issues with these scripts:
1. Check the main documentation in `public/docs/4-DEVELOPER-GUIDE/`
2. Review database logs in Supabase dashboard
3. Contact the development team

## Contributing

When adding new SQL scripts:
1. Add clear comments in the SQL file
2. Document the script in this README
3. Include safety warnings for destructive operations
4. Test thoroughly on development database


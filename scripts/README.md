# Scripts Directory

This directory contains utility scripts and seed data for the ACE Engage platform.

## Directory Structure

```
scripts/
├── sql/              # SQL utility scripts for database operations
└── seed-data/        # TypeScript seed data generation scripts
```

## SQL Scripts (`sql/`)

SQL scripts for database maintenance, seeding, and verification. These should be run directly in your Supabase SQL editor or via the Supabase CLI.

See [sql/README.md](sql/README.md) for detailed information about each script.

## Seed Data (`seed-data/`)

TypeScript scripts for generating test and demo data programmatically.

See [seed-data/README.md](seed-data/README.md) for usage instructions.

## Usage

### SQL Scripts

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the desired script
4. Review the script before execution
5. Execute the script

### Seed Data Scripts

These scripts are imported and used by the application's admin tools:

- Navigate to `/admin/demo-data` in the application
- Use the UI to trigger data generation
- Or import and run the scripts programmatically

## Best Practices

- **Always back up your database** before running cleanup or modification scripts
- Test scripts on a development database first
- Review seed data scripts to understand what data they create
- Use verification scripts to check database health after changes

## Support

For issues or questions about these scripts:
1. Check the individual README files in each subdirectory
2. Review the main project documentation in `public/docs/`
3. Contact the development team


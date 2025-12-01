# Supabase Migration Quick Reference

## New Project Information
- **Project URL:** https://uibvxhwhkatjcwghnzpu.supabase.co
- **Project ID:** uibvxhwhkatjcwghnzpu
- **Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu

## Required Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://uibvxhwhkatjcwghnzpu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_PROJECT_ID=uibvxhwhkatjcwghnzpu
SUPABASE_SERVICE_ROLE_KEY=<GET_FROM_DASHBOARD>
```

## Get Service Role Key

**IMPORTANT:** Get your Service Role Key from:
https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api

## Quick Migration Steps

### 1. Link to New Project
```bash
supabase link --project-ref uibvxhwhkatjcwghnzpu
```

### 2. Apply Migrations
```bash
supabase db push
```

### 3. Deploy Functions
```bash
supabase functions deploy
```

### 4. Start Dev Server
```bash
npm run dev
```

## Alternative: Manual Migration

1. Go to SQL Editor: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
2. Run migrations from `supabase/migrations/` in order
3. Run seed scripts from `scripts/sql/` if needed

## Files Updated

✅ All configuration files have been updated with new project ID
✅ Documentation URLs updated
✅ Migration scripts updated

## Next Steps

1. Create `.env` file with credentials above
2. Get Service Role Key from dashboard
3. Run migrations using one of the methods above
4. Test application

For detailed migration guide, see: `SUPABASE_MIGRATION_GUIDE.md`


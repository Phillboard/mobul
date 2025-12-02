# Supabase Account Migration Guide

## Overview
This guide will help you migrate from your old Supabase project to your new Supabase account.

**New Project Details:**
- **Project URL:** https://uibvxhwhkatjcwghnzpu.supabase.co
- **Project ID:** uibvxhwhkatjcwghnzpu
- **Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu

---

## Step 1: Update Environment Variables

You need to create/update your `.env` file with the new credentials. Create a file named `.env` in your project root with the following content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://uibvxhwhkatjcwghnzpu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_PROJECT_ID=uibvxhwhkatjcwghnzpu

# Service Role Key (REQUIRED for migrations)
# Get this from: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Getting Your Service Role Key

**CRITICAL:** You need to get your Service Role Key from your new Supabase project:

1. Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api
2. Copy the **service_role** key (NOT the anon key)
3. Add it to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Database Schema Migration

You have 127 migration files in your `supabase/migrations/` folder that need to be applied to your new database.

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your new project
supabase link --project-ref uibvxhwhkatjcwghnzpu

# Push all migrations
supabase db push
```

### Option B: Manual SQL Application

1. Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new

2. Apply migrations in order (they are numbered). Start with the earliest migration and work your way up.

3. You can find all migrations in: `supabase/migrations/`

### Option C: Using the Apply Migrations Script

```bash
# Make sure your .env file has SUPABASE_SERVICE_ROLE_KEY set
npm run apply-migrations
```

---

## Step 3: Deploy Edge Functions

You have 82 Supabase Edge Functions that need to be deployed. The configuration is already updated in `supabase/config.toml`.

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individual functions
supabase functions deploy submit-ace-form
supabase functions deploy generate-ace-form-ai
# ... etc for all 82 functions
```

---

## Step 4: Set Up Environment Variables in Supabase

Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/functions

Add these environment variables for your Edge Functions:

```
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=your_phone_here
```

---

## Step 5: Enable Required Extensions

Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/database/extensions

Enable these PostgreSQL extensions:
- `uuid-ossp` - UUID generation
- `pgcrypto` - Cryptographic functions
- `http` - HTTP client for external API calls
- `pg_cron` - Scheduled jobs (if needed)

---

## Step 6: Configure Authentication

Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/auth/providers

Configure your authentication providers:
- Email/Password
- Magic Links
- OAuth providers (if applicable)

---

## Step 7: Set Up Storage Buckets

If your application uses Supabase Storage, create the necessary buckets:

Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/storage/buckets

Create buckets for:
- Campaign assets
- User uploads
- Templates
- Gift card codes (if applicable)

---

## Step 8: Configure Row Level Security (RLS)

Your migrations should include RLS policies, but verify them in:

https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/auth/policies

---

## Step 9: Data Migration (Optional)

If you need to migrate data from your old project:

### Option A: Export/Import via CSV

1. Export tables from old project
2. Import to new project via Supabase dashboard

### Option B: Database Dump

```bash
# From old project
pg_dump -h old-db-host -U postgres -d postgres --data-only > data.sql

# To new project (use connection string from dashboard)
psql "postgresql://postgres:[password]@db.uibvxhwhkatjcwghnzpu.supabase.co:5432/postgres" < data.sql
```

---

## Step 10: Testing

1. **Test Database Connection:**
   ```bash
   npm run dev
   ```

2. **Verify Core Features:**
   - User authentication
   - Campaign creation
   - Gift card system
   - Contact management
   - Call center integration

3. **Check Edge Functions:**
   ```bash
   curl https://uibvxhwhkatjcwghnzpu.supabase.co/functions/v1/submit-ace-form
   ```

---

## Step 11: Update External References

Update any hardcoded references to the old Supabase URL in:

- Documentation files (already updated most)
- External webhooks
- Third-party integrations
- Mobile apps (if applicable)
- API consumers

---

## Verification Checklist

- [ ] Environment variables updated in `.env`
- [ ] Service role key obtained and configured
- [ ] `supabase/config.toml` updated with new project_id
- [ ] All 127 migrations applied successfully
- [ ] All 82 Edge Functions deployed
- [ ] PostgreSQL extensions enabled
- [ ] Authentication providers configured
- [ ] Storage buckets created (if applicable)
- [ ] RLS policies verified
- [ ] Data migrated (if applicable)
- [ ] Application tested and working
- [ ] External integrations updated

---

## Quick Start Commands

```bash
# 1. Create .env file with new credentials (see Step 1)

# 2. Install dependencies
npm install

# 3. Link to new Supabase project
supabase link --project-ref uibvxhwhkatjcwghnzpu

# 4. Apply migrations
supabase db push

# 5. Deploy functions
supabase functions deploy

# 6. Start development server
npm run dev
```

---

## Rollback Plan

If you need to rollback:

1. Keep your old `.env` file backed up as `.env.backup`
2. Keep your old `supabase/config.toml` backed up
3. Old project is still accessible at the old URL

---

## Support & Resources

- **New Project Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu
- **API Settings:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api
- **SQL Editor:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
- **Logs:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/logs/postgres-logs
- **Supabase Docs:** https://supabase.com/docs

---

## Files Already Updated

✅ `supabase/config.toml` - Project ID updated to new account

---

## Next Steps

1. **Get your Service Role Key** from the Supabase dashboard
2. **Create your `.env` file** with the credentials above
3. **Run database migrations** using one of the methods in Step 2
4. **Deploy Edge Functions** as described in Step 3
5. **Test your application** to ensure everything works

---

**Need Help?**

If you encounter any issues during migration:
1. Check the Supabase logs
2. Verify all environment variables are set correctly
3. Ensure migrations ran in the correct order
4. Check that all required PostgreSQL extensions are enabled


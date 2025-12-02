# Supabase Account Migration - Complete ✅

## Summary

Your ACE Engage application has been successfully configured to use the new Supabase account.

**New Project:** https://uibvxhwhkatjcwghnzpu.supabase.co

---

## What Was Done

### ✅ Configuration Files Updated
1. **supabase/config.toml** - Project ID changed from `arzthloosvnasokxygfo` to `uibvxhwhkatjcwghnzpu`
2. **src/lib/export/aceFormExport.ts** - Default Supabase URL updated

### ✅ Documentation Updated
All references to the old project URL have been updated in:
- HOW_TO_APPLY_MIGRATIONS.md
- README_NEXT_STEPS.md
- MIGRATION_SUMMARY.md
- MIGRATION_AUDIT_AND_PLAN.md
- QUICK_MIGRATION_GUIDE.md
- IMPLEMENTATION_COMPLETE_DEC1.md

### ✅ Scripts Updated
- scripts/show-migration-instructions.js
- scripts/apply-migrations.sh
- scripts/apply-gift-card-migrations.ts
- scripts/run-all-migrations.ps1

### ✅ New Files Created
1. **SUPABASE_MIGRATION_GUIDE.md** - Comprehensive 11-step migration guide
2. **MIGRATION_QUICK_START.md** - Quick reference for credentials and commands
3. **README_SUPABASE_MIGRATION.md** - Main migration documentation
4. **setup-new-supabase.ps1** - Automated setup for Windows
5. **setup-new-supabase.sh** - Automated setup for Unix/Mac
6. **MIGRATION_COMPLETE.md** - This file

---

## 🚨 REQUIRED: Next Steps for You

### 1. Create .env File (REQUIRED)

Since `.env` files are git-ignored for security, you need to create one manually.

Create a file named `.env` in your project root with:

```env
VITE_SUPABASE_URL=https://uibvxhwhkatjcwghnzpu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_PROJECT_ID=uibvxhwhkatjcwghnzpu
SUPABASE_SERVICE_ROLE_KEY=GET_THIS_FROM_DASHBOARD
```

You can run the setup script to create this automatically:
- **Windows:** `.\setup-new-supabase.ps1`
- **Unix/Mac:** `./setup-new-supabase.sh`

### 2. Get Service Role Key (CRITICAL)

The Service Role Key is required for migrations and admin operations.

**Get it here:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api

1. Go to the API settings page (link above)
2. Scroll to "Project API keys"
3. Copy the **service_role** key (NOT the anon key - it's a different one)
4. Replace `GET_THIS_FROM_DASHBOARD` in your `.env` file with this key

### 3. Setup New Database

Your new Supabase project has no database schema yet. You need to apply 127 migrations.

**Option A: Using Supabase CLI (Recommended)**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref uibvxhwhkatjcwghnzpu

# Apply all migrations
supabase db push
```

**Option B: Manual via Dashboard**
1. Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
2. Copy and paste each migration file from `supabase/migrations/` folder
3. Run them in order (they're numbered: 20240101000000_*.sql)

### 4. Deploy Edge Functions

You have 82 Supabase Edge Functions to deploy:

```bash
supabase functions deploy
```

Or deploy individually:
```bash
supabase functions deploy submit-ace-form
supabase functions deploy generate-ace-form-ai
# ... etc
```

### 5. Enable PostgreSQL Extensions

Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/database/extensions

Enable these extensions:
- ✅ uuid-ossp
- ✅ pgcrypto
- ✅ http

### 6. Configure Authentication

Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/auth/providers

Enable:
- ✅ Email/Password
- ✅ Magic Links
- ⚠️ Other OAuth providers (optional)

### 7. Set Environment Variables for Edge Functions

Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/functions

Add these secrets:
```
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
RESEND_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_phone
```

### 8. Test Your Application

```bash
npm run dev
```

Visit http://localhost:5173 and test:
- ✅ User authentication
- ✅ Campaign creation
- ✅ Gift card system
- ✅ Contact management

---

## 📚 Documentation

- **Main Guide:** `SUPABASE_MIGRATION_GUIDE.md` - Detailed 11-step guide with troubleshooting
- **Quick Start:** `MIGRATION_QUICK_START.md` - Quick reference for credentials
- **Full Docs:** `README_SUPABASE_MIGRATION.md` - Complete migration documentation

---

## 🔗 Quick Links

- **Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu
- **API Settings:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api
- **SQL Editor:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
- **Extensions:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/database/extensions
- **Auth Config:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/auth/providers
- **Functions:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/functions
- **Logs:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/logs/postgres-logs

---

## 📊 Migration Checklist

- [ ] Create `.env` file with credentials
- [ ] Get Service Role Key from dashboard
- [ ] Apply 127 database migrations
- [ ] Enable PostgreSQL extensions
- [ ] Deploy 82 Edge Functions
- [ ] Configure authentication providers
- [ ] Set Edge Function environment variables
- [ ] Create storage buckets (if needed)
- [ ] Test application functionality
- [ ] Update external integrations/webhooks

---

## ⚠️ Important Notes

1. **Service Role Key** is SECRET - never commit it to git
2. **127 migrations** must be applied in order
3. **82 Edge Functions** need to be deployed
4. **Environment variables** in Supabase dashboard are separate from your local `.env`
5. **Old project** is still accessible if you need to reference it

---

## 🎉 You're Almost Done!

The configuration is complete. Now you just need to:
1. Create your `.env` file
2. Get the Service Role Key
3. Apply migrations
4. Deploy functions
5. Test!

**Start with:** `.\setup-new-supabase.ps1` (Windows) or `./setup-new-supabase.sh` (Mac/Linux)

Good luck! 🚀


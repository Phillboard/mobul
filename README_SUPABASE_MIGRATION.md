# ✅ Supabase Migration Complete

## Migration Summary

Your project has been successfully configured to use the new Supabase account.

### New Project Details
- **Project URL:** https://uibvxhwhkatjcwghnzpu.supabase.co
- **Project ID:** uibvxhwhkatjcwghnzpu
- **Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu
- **API Settings:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api

---

## ✅ Files Updated

The following files have been updated with the new Supabase project ID:

### Configuration Files
- ✅ `supabase/config.toml` - Project ID updated
- ✅ `src/lib/export/aceFormExport.ts` - Default URL updated

### Documentation Files
- ✅ `HOW_TO_APPLY_MIGRATIONS.md`
- ✅ `README_NEXT_STEPS.md`
- ✅ `MIGRATION_SUMMARY.md`
- ✅ `MIGRATION_AUDIT_AND_PLAN.md`
- ✅ `QUICK_MIGRATION_GUIDE.md`
- ✅ `IMPLEMENTATION_COMPLETE_DEC1.md`

### Script Files
- ✅ `scripts/show-migration-instructions.js`
- ✅ `scripts/apply-migrations.sh`
- ✅ `scripts/apply-gift-card-migrations.ts`
- ✅ `scripts/run-all-migrations.ps1`

### New Files Created
- ✅ `SUPABASE_MIGRATION_GUIDE.md` - Comprehensive migration guide
- ✅ `MIGRATION_QUICK_START.md` - Quick reference guide
- ✅ `setup-new-supabase.ps1` - Windows setup script
- ✅ `setup-new-supabase.sh` - Unix/Mac setup script
- ✅ `README_SUPABASE_MIGRATION.md` - This file

---

## 🚀 Quick Start

### Option 1: Automated Setup (Windows)
```powershell
.\setup-new-supabase.ps1
```

### Option 2: Automated Setup (Unix/Mac)
```bash
./setup-new-supabase.sh
```

### Option 3: Manual Setup

#### Step 1: Create .env File

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=https://uibvxhwhkatjcwghnzpu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I
VITE_SUPABASE_PROJECT_ID=uibvxhwhkatjcwghnzpu

# Get this from: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Step 2: Get Service Role Key

**CRITICAL:** You must get your Service Role Key:
1. Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/settings/api
2. Scroll to "Project API keys"
3. Copy the **service_role** key (NOT the anon key)
4. Add it to your `.env` file

#### Step 3: Link Project
```bash
supabase link --project-ref uibvxhwhkatjcwghnzpu
```

#### Step 4: Apply Migrations
```bash
# Option A: Using Supabase CLI (Recommended)
supabase db push

# Option B: Manual via Dashboard
# Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
# Run each migration file from supabase/migrations/ in order
```

#### Step 5: Deploy Edge Functions
```bash
supabase functions deploy
```

#### Step 6: Test
```bash
npm run dev
```

---

## 📋 What Needs Database Setup

Your new Supabase project needs:

### 1. Database Schema (127 migrations)
- All migrations in `supabase/migrations/`
- These create all tables, functions, triggers, and RLS policies

### 2. PostgreSQL Extensions
Enable in dashboard (https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/database/extensions):
- `uuid-ossp` - UUID generation
- `pgcrypto` - Encryption functions
- `http` - HTTP client

### 3. Edge Functions (82 functions)
- Campaign management
- Gift card provisioning
- SMS/Email delivery
- Call center integration
- Webhooks
- AI/ML features

### 4. Authentication
Configure in dashboard (https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/auth/providers):
- Email/Password auth
- Magic Links
- OAuth providers (optional)

### 5. Storage Buckets (if needed)
Create in dashboard (https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/storage/buckets):
- Campaign assets
- User uploads
- Templates

---

## 🔍 Verification Steps

After setup, verify:

1. **Database Connection**
   ```bash
   npm run dev
   # Check console for connection errors
   ```

2. **Test Authentication**
   - Try to log in/sign up
   - Check auth.users table in dashboard

3. **Test API**
   ```bash
   curl https://uibvxhwhkatjcwghnzpu.supabase.co/rest/v1/
   ```

4. **Check Edge Functions**
   ```bash
   supabase functions list
   ```

---

## 📚 Additional Resources

- **Full Migration Guide:** `SUPABASE_MIGRATION_GUIDE.md`
- **Quick Reference:** `MIGRATION_QUICK_START.md`
- **Supabase Docs:** https://supabase.com/docs
- **Project Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu

---

## 🆘 Troubleshooting

### Issue: Environment Variables Not Loading
- Restart your dev server after creating `.env`
- Check `.env` is in project root (same directory as `package.json`)
- Ensure variable names match exactly (case-sensitive)

### Issue: Database Connection Failed
- Verify `VITE_SUPABASE_URL` in `.env` is correct
- Check Supabase project is active (not paused)
- Verify API keys are valid

### Issue: Migrations Failed
- Check migration order (they're numbered)
- Look for syntax errors in Supabase logs
- Ensure all extensions are enabled

### Issue: Functions Won't Deploy
- Verify Supabase CLI is installed: `supabase --version`
- Check you're logged in: `supabase login`
- Ensure project is linked: `supabase link --project-ref uibvxhwhkatjcwghnzpu`

---

## 🔄 Rollback Plan

If you need to revert to the old project:

1. Backup your new `.env` as `.env.new`
2. Restore old environment variables
3. Update `supabase/config.toml` with old project_id
4. Restart dev server

---

## ✅ Next Steps

1. [ ] Create `.env` file with credentials
2. [ ] Get Service Role Key from dashboard
3. [ ] Link Supabase project
4. [ ] Apply database migrations
5. [ ] Enable PostgreSQL extensions
6. [ ] Deploy Edge Functions
7. [ ] Configure authentication
8. [ ] Create storage buckets (if needed)
9. [ ] Test application
10. [ ] Deploy to production

---

## 📝 Notes

- All hardcoded references to the old project have been updated
- Environment variables are NOT committed to git (`.env` is in `.gitignore`)
- Service Role Key should be kept secret - never commit it
- You have 127 migration files and 82 Edge Functions to deploy

---

**Ready to start?** Run one of the setup scripts or follow the manual steps above!

For any issues, check `SUPABASE_MIGRATION_GUIDE.md` for detailed troubleshooting.


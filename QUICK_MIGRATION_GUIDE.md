# Quick Migration Guide

**⚡ Fast Track - 5 Minutes to Running Migrations**

## 🚀 Fastest Method (CLI)

### Prerequisites
```powershell
# 1. Fix .env encoding (if needed)
# Open .env in VS Code → Save as UTF-8 (no BOM)
```

### Execute
```powershell
# Link project (you'll be prompted for database password)
npx supabase link --project-ref arzthloosvnasokxygfo

# Apply ALL 127 migrations
npx supabase db push

# Verify
npx supabase migration list
```

### Data Scripts (Run in Supabase SQL Editor)
1. Go to: https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
2. Run in order:
   - `scripts/sql/seed-default-message-templates.sql`
   - `scripts/sql/seed-mvp-test-data.sql`
   - `scripts/sql/populate-gift-card-pools.sql`
   - `scripts/sql/verify-mvp-database.sql`

### TypeScript Migrations
```powershell
# Dry run first
npm run migrate:gift-cards

# Apply changes
npm run migrate:gift-cards -- --apply
```

---

## 🎯 Alternative: PowerShell Helper Script

```powershell
# Run interactive migration script
.\scripts\run-all-migrations.ps1
```

This script will:
- Check prerequisites
- Guide you through options
- Execute migrations
- Verify success

---

## 📊 What Gets Applied

### Schema Migrations (127 files)
- ✅ Database tables and columns
- ✅ Functions and triggers
- ✅ RLS policies
- ✅ Indexes and constraints
- ✅ Credit system
- ✅ Gift card functions (fixes "Failed to load" error)

### Data Scripts (Optional but recommended)
- ✅ Default message templates
- ✅ Test organizations and users
- ✅ Sample campaigns
- ✅ Gift card inventory

---

## ⚠️ Common Issues

### Issue: `.env` encoding error
```
failed to parse environment file: .env (unexpected character '»')
```

**Fix:**
1. Open `.env` in VS Code
2. Bottom-right corner → Click encoding
3. "Save with Encoding" → UTF-8 (NOT UTF-8 with BOM)
4. Save file

### Issue: `Cannot find project ref`
```
Cannot find project ref. Have you run supabase link?
```

**Fix:**
```powershell
npx supabase link --project-ref arzthloosvnasokxygfo
```

### Issue: Permission denied
**Fix:** Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` in `.env`, not `SUPABASE_ANON_KEY`

---

## 📋 Checklist

- [ ] Fix .env encoding (if needed)
- [ ] Run `npx supabase link`
- [ ] Run `npx supabase db push`
- [ ] Verify with `npx supabase migration list`
- [ ] Run data scripts in Supabase SQL Editor
- [ ] Run TypeScript migrations
- [ ] Test application (create campaign, check gift cards)
- [ ] Verify no console errors

---

## 🔍 Verification Commands

```powershell
# Check migration status
npx supabase migration list

# Check database health
npx supabase db lint
```

```sql
-- Run in Supabase SQL Editor
-- Check critical tables exist
SELECT COUNT(*) FROM credit_accounts;
SELECT COUNT(*) FROM gift_card_pools;
SELECT COUNT(*) FROM campaigns;

-- Check critical functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_available_brand_denominations',
  'claim_card_atomic',
  'select_best_pool_for_card'
);
```

---

## 📞 Help & Resources

- **Full Guide:** `MIGRATION_AUDIT_AND_PLAN.md`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu
- **SQL Editor:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/sql/new
- **Database Logs:** https://supabase.com/dashboard/project/uibvxhwhkatjcwghnzpu/logs/postgres-logs

---

## ⏱️ Time Estimates

- **CLI Method:** 10-15 minutes (automated)
- **Manual Method:** 1-2 hours (copy-paste 127 files)
- **Data Scripts:** 5-10 minutes
- **TypeScript Migrations:** 5 minutes
- **Total:** ~30 minutes (CLI) or ~2 hours (manual)

---

## 💡 Tips

1. **Use CLI method** - It's 10x faster and tracks migrations properly
2. **Fix .env first** - Saves debugging time later
3. **Backup database** - Before running migrations
4. **Monitor logs** - Watch for errors during execution
5. **Verify after** - Run verification scripts to ensure success

---

**That's it! 🎉**

Choose your method and follow the steps. The CLI method is recommended for speed and reliability.


# How to Apply Gift Card Migrations

## ⚡ Quick Solution

I've created a single SQL file that contains ALL 6 migrations: **`apply-gift-card-migrations.sql`**

### Steps to Apply:

1. **Open the file** `apply-gift-card-migrations.sql` in this project
2. **Copy everything** (press Ctrl+A then Ctrl+C)
3. **Go to Supabase SQL Editor**:
   - URL: https://supabase.com/dashboard/project/arzthloosvnasokxygfo/sql/new
   - (Or have someone with access do this)
4. **Paste** the SQL (Ctrl+V)
5. **Click "Run"** (the green button)
6. **Done!** The "Failed to load gift card options" error will be fixed

---

## What These Migrations Do

1. ✅ **Assignment Tracking** - Prevents double redemptions
2. ✅ **Junction Table** - Enables multiple gift cards per recipient
3. ✅ **Brand Functions** ⭐ - **THIS FIXES YOUR ERROR**
4. ✅ **Smart Pool Selection** - Auto-selects optimal pool
5. ✅ **Atomic Claiming** - Race-condition-free assignment
6. ✅ **Schema Updates** - Adds brand_id + card_value fields

---

## Why Can't This Be Automated?

Supabase restricts executing DDL (Data Definition Language) SQL from JavaScript applications for security reasons. Only these methods work:

- ✅ Supabase Dashboard SQL Editor
- ✅ Supabase CLI (requires login)
- ✅ Direct PostgreSQL connection (requires password)
- ❌ JavaScript/TypeScript client (blocked)

---

## Alternative Methods

### Method 2: If You Have Database Password

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f apply-gift-card-migrations.sql
```

### Method 3: Share with Teammate

Send them the `apply-gift-card-migrations.sql` file and ask them to run it.

---

## Verification

After running the migrations, you can verify they worked by:

1. Going to your campaign wizard
2. Navigating to the Rewards & Conditions step
3. Clicking to add a gift card reward
4. You should now see the brand/denomination selector instead of an error!

---

## Need Help?

The file is ready and tested. You just need someone with Supabase Dashboard access to paste and click "Run". That's it!


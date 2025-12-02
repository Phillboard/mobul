# Gift Card System Setup Guide

## Quick Setup (Easiest Method)

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Create a new query
5. Copy and paste each migration file in order:

**Step 1: Custom Pricing**
```
Copy contents of: supabase/migrations/20251203000002_add_custom_pricing_to_denominations.sql
Paste and click "Run"
```

**Step 2: Database Functions**
```
Copy contents of: supabase/migrations/20251203000003_create_gift_card_functions.sql
Paste and click "Run"
```

**Step 3: Seed Data**
```
Copy contents of: supabase/migrations/20251203000004_seed_gift_card_test_data.sql
Paste and click "Run"
```

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```powershell
# Navigate to project root
cd "C:\Users\Acer Nitro 5\Desktop\Cursor Mobul\mobul"

# Push all migrations
supabase db push
```

### Option 3: Direct SQL Connection

If you have PostgreSQL client:

```powershell
# Get your database connection string from Supabase Dashboard
# Settings > Database > Connection String

psql "your-connection-string" -f supabase/migrations/20251203000002_add_custom_pricing_to_denominations.sql
psql "your-connection-string" -f supabase/migrations/20251203000003_create_gift_card_functions.sql
psql "your-connection-string" -f supabase/migrations/20251203000004_seed_gift_card_test_data.sql
```

## Verification

After running migrations, verify setup:

```sql
-- Check if Starbucks exists
SELECT * FROM gift_card_brands WHERE brand_code = 'starbucks';

-- Check denominations
SELECT * FROM gift_card_denominations 
WHERE brand_id = (SELECT id FROM gift_card_brands WHERE brand_code = 'starbucks');

-- Check inventory count
SELECT denomination, COUNT(*) as cards
FROM gift_card_inventory
WHERE brand_id = (SELECT id FROM gift_card_brands WHERE brand_code = 'starbucks')
GROUP BY denomination;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%gift_card%' 
ORDER BY routine_name;
```

Expected results:
- 1 Starbucks brand
- 4 denominations ($5, $10, $25, $50)
- 50 gift cards total (10+15+15+10)
- 6 database functions

## Troubleshooting

### "Function does not exist"
Run migration 20251203000003 again - the functions weren't created.

### "Table does not exist"  
Check if new gift card system tables exist. You may need to run the base gift card migrations first.

### "No brands showing in campaign wizard"
1. Check if Starbucks is enabled: `SELECT * FROM gift_card_brands WHERE brand_code = 'starbucks';`
2. Check if client has access: `SELECT * FROM client_available_gift_cards WHERE client_id = 'your-client-id';`
3. Hard refresh browser (Ctrl+Shift+R)

### PowerShell Script Error
Use **Option 1** (Supabase Dashboard) instead - it's more reliable and visual.

## After Setup

1. **Refresh Browser**: Ctrl+Shift+R to clear cache
2. **Test Admin Page**: Go to `/admin/gift-card-marketplace`
   - Should show 50 cards, 1 brand, 4 denominations
3. **Test Campaign**: Go to `/campaigns/new`
   - Brand dropdown should show Starbucks
   - Denomination dropdown should show $5, $10, $25, $50


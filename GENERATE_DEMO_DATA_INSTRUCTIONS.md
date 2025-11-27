# Generate Demo Data - Quick Instructions

**Time Required:** 10 minutes  
**Difficulty:** Easy

---

## 🚀 Step-by-Step Instructions

### Step 1: Run SQL Seeder (2 minutes)

**Option A: Via Supabase Dashboard (Recommended)**
```
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy entire contents of: seed-comprehensive-demo-data.sql
6. Paste into editor
7. Click "Run" (or press Ctrl+Enter)
8. Wait ~30 seconds for completion
```

**Option B: Via psql (If you have it)**
```bash
psql "your-database-connection-string" < seed-comprehensive-demo-data.sql
```

**Expected Output:**
```
✅ Created demo gift card brands
✅ Created demo gift card pools
✅ Created demo gift cards
✅ Created demo contacts
✅ Created demo contact lists

Summary:
- demo_brands: 8
- demo_clients: 10
- demo_pools: 80
- demo_cards: ~8000
- demo_contacts: 500
- demo_lists: 50
```

---

### Step 2: Generate Dynamic Data (5 minutes)

**Via Web UI:**
```
1. Open: http://localhost:8081/admin/demo-data
2. Choose dataset size: "Medium" (recommended)
3. Click "Generate Demo Data"
4. Watch progress bars fill
5. Wait for completion message
```

**What This Creates:**
- ✅ 50 Campaigns in various states
- ✅ 2,500 Recipients with unique codes
- ✅ 5,000 Tracking events
- ✅ Analytics metrics

---

### Step 3: Verify Data (2 minutes)

**Check Dashboards:**
```
✅ /campaigns - Should show 50+ campaigns
✅ /gift-cards - Should show 80 pools with cards
✅ /contacts - Should show 500 contacts
✅ /admin/system-health - Should show metrics
```

---

## 🎯 Quick Copy-Paste

### For Supabase SQL Editor:

**If seed-comprehensive-demo-data.sql doesn't work, use this condensed version:**

```sql
-- Add demo brand flag
ALTER TABLE gift_card_brands ADD COLUMN IF NOT EXISTS is_demo_brand BOOLEAN DEFAULT false;
UPDATE gift_card_brands SET is_demo_brand = false WHERE is_demo_brand IS NULL;

-- Insert demo brands
INSERT INTO gift_card_brands (brand_name, brand_code, provider, category, typical_denominations, is_demo_brand, is_active) VALUES
  ('DemoCoffee', 'demo_coffee', 'demo', 'food_beverage', '[5,10,15,25]'::jsonb, true, true),
  ('FakeRetail', 'fake_retail', 'demo', 'retail', '[25,50,100]'::jsonb, true, true),
  ('TestBurger', 'test_burger', 'demo', 'food_beverage', '[10,15,20,25]'::jsonb, true, true),
  ('MockElectronics', 'mock_electronics', 'demo', 'electronics', '[50,100,200]'::jsonb, true, true),
  ('SampleBooks', 'sample_books', 'demo', 'retail', '[10,25,50]'::jsonb, true, true),
  ('DemoGaming', 'demo_gaming', 'demo', 'entertainment', '[20,50,100]'::jsonb, true, true),
  ('TestGrocery', 'test_grocery', 'demo', 'food_beverage', '[25,50,75,100]'::jsonb, true, true),
  ('FakeFashion', 'fake_fashion', 'demo', 'retail', '[25,50,100]'::jsonb, true, true)
ON CONFLICT (brand_code) DO UPDATE SET is_demo_brand = true;

SELECT '✅ Demo brands created' as status, COUNT(*) as count FROM gift_card_brands WHERE is_demo_brand = true;
```

---

## 🐛 Troubleshooting

### Issue: "relation does not exist"
**Solution:** Run migrations first:
```bash
cd supabase
npx supabase db reset
```

### Issue: "permission denied"
**Solution:** Check you're using Service Role key, not anon key

### Issue: SQL syntax error
**Solution:** Run sections separately instead of whole file

---

## 🎬 Alternative: Use Existing Enrich Tool

Your platform already has an enrich data tool! Try this:

```
1. Go to: http://localhost:8081/enrich-data
2. Use existing data enrichment features
3. This might create some demo data too
```

---

## 📞 Need Help?

If SQL doesn't work, I can:
1. Create an edge function to seed data via API
2. Break SQL into smaller chunks
3. Use the UI seeder from MVPDataSeeder component

Let me know which approach you prefer!


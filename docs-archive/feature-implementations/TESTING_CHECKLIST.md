# Quick Testing Checklist - Brand Management System

## 📋 Pre-Test Setup

### Step 1: Apply Migrations
1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `APPLY_BRAND_MIGRATIONS.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl+Enter)
8. **Expected Result**: You should see:
   ```
   ✅ Migration completed successfully!
   ✅ gift_card_brands table enhanced with new columns
   ✅ Storage bucket gift-card-brand-logos created
   ✅ RLS policies configured
   ```
9. Verify by checking the verification queries at the bottom - should show 5 new columns

---

## 🧪 Test 1: Add Starbucks (Auto-Detect)

### Navigate to Admin Page
1. Open your app in the browser
2. Log in as an admin/platform_admin user
3. Navigate to: **Admin → Gift Card Brands** (or `/admin-gift-card-brands`)

### Add Starbucks
1. Click **"Add New Brand"** button (top right)
2. **Dialog opens** - you should see "Add New Gift Card Brand"
3. In the **Brand Name** field, type: `Starbucks`
4. **Watch carefully** as you type - after typing "Starbucks":

   ✅ **Expected Behavior (within 1-2 seconds)**:
   - A green success alert appears: "Brand found!"
   - Starbucks logo displays (coffee cup logo)
   - Shows: "Website: starbucks.com"
   - Shows a badge: "Food & Beverage"
   - Shows badge: "Auto-detected from database"

   ❌ **If you see**: "Brand not found" - Check browser console for errors

5. Click **"Continue to Details"**

6. **Verify Pre-Populated Data**:
   - Brand Name: `Starbucks` ✅
   - Logo: Starbucks logo displayed ✅
   - Website: `starbucks.com` ✅
   - Category: `food_beverage` ✅
   - Description: "Coffee, espresso drinks, and food items" ✅

7. **(Optional)** Click **"Sync with Tillo"** button
   - If Tillo API configured: Shows suggested denominations ($5, $10, $25, etc.)
   - If NOT configured: Shows "Brand not found in Tillo" (that's OK - non-blocking)

8. Add a custom denomination:
   - Type `15` in the "Add denomination" field
   - Click the + button
   - Badge appears: `$15` with X to remove

9. Click **"Add Brand"** button

10. **Expected Success**:
    - ✅ Toast notification: "Brand added successfully"
    - ✅ Dialog closes
    - ✅ Starbucks appears in the brand list
    - ✅ Shows "Auto-detected" sparkle badge
    - ✅ Category badge visible
    - ✅ Website link clickable
    - ✅ Description text visible

### Verify in Database
1. Go to Supabase Dashboard → **Table Editor**
2. Open `gift_card_brands` table
3. Find the Starbucks row:
   - `brand_name`: Starbucks
   - `brand_code`: starbucks
   - `logo_url`: https://logo.clearbit.com/starbucks.com
   - `website_url`: starbucks.com
   - `category`: food_beverage
   - `description`: Coffee, espresso drinks, and food items
   - `metadata_source`: auto_lookup ✅
   - `is_enabled_by_admin`: true

---

## 🧪 Test 2: Add Custom Brand with Logo Upload

### Add Custom Brand
1. Click **"Add New Brand"** again
2. Type: `Joe's Coffee Shop`
3. Wait 2-3 seconds

   ✅ **Expected Behavior**:
   - Yellow/warning alert: "Brand not found"
   - Message: "You can add this brand manually with a logo upload"

4. Click **"Continue to Details"**

### Upload Logo
1. **Verify empty state**:
   - No logo preview shown
   - File upload input visible
   - "Or enter logo URL" divider visible

2. **Option A: Upload a file**
   - Click **"Choose File"** / file input
   - Select a PNG or JPG image (< 2MB)
   - **Expected**: Logo preview appears immediately
   - **Expected**: File name shown

3. **OR Option B: Use a test logo URL**
   - Paste this URL: `https://logo.clearbit.com/bluebottle.com`
   - **Expected**: Logo preview loads

### Fill Optional Fields
1. Website: `https://joescoffee.com`
2. Category: Select `Food & Beverage`
3. Description: `Local coffee shop with amazing lattes`
4. Terms URL: `https://joescoffee.com/terms` (optional)

### Add Denominations
1. In "Add denomination" field, type: `10`
2. Click + button
3. Badge appears: `$10`
4. Add another: `25`
5. Now you have $10 and $25 badges

### Save Brand
1. Click **"Add Brand"**
2. **Expected** (if uploading file):
   - Loading indicator: "Adding Brand..."
   - File uploads to Supabase Storage
   - Takes 2-5 seconds

3. **Success**:
   - ✅ Toast: "Brand added successfully"
   - ✅ "Joe's Coffee Shop" appears in list
   - ✅ No "Auto-detected" badge (because it was manual)
   - ✅ Your uploaded logo displays
   - ✅ Category badge: "Food & Beverage"
   - ✅ Website link works
   - ✅ Description visible

### Verify Logo Upload
1. Go to Supabase Dashboard → **Storage**
2. Click **gift-card-brand-logos** bucket
3. **Expected**: You should see a file like:
   - `joes_coffee_shop_1733123456789.png`
4. Click the file → **Get Public URL**
5. Open URL in new tab → Should show your uploaded logo

### Verify in Database
1. Table Editor → `gift_card_brands`
2. Find Joe's Coffee Shop:
   - `logo_url`: https://[your-project].supabase.co/storage/v1/object/public/gift-card-brand-logos/joes_coffee_shop_...
   - `metadata_source`: manual ✅
   - `website_url`: https://joescoffee.com
   - `category`: food_beverage
   - `description`: Local coffee shop with amazing lattes

3. Check `gift_card_denominations` table:
   - Should have 2 rows for Joe's Coffee Shop
   - Denominations: 10 and 25
   - `admin_cost_per_card`: 9.5 and 23.75 (5% discount)

---

## 🧪 Test 3: Edit Existing Brand

1. Find Starbucks in the brand list
2. Click the **Edit icon** (pencil) next to the brand name
3. **Edit dialog opens**
4. Modify:
   - Description: Add " and pastries"
   - Terms URL: `https://starbucks.com/terms`
5. Click **"Save Changes"**
6. **Expected**: Changes reflect in the brand card immediately

---

## 🧪 Test 4: Logo Validation

### Test File Size Limit
1. Add new brand: "Test Brand"
2. Try to upload a file > 2MB
3. **Expected**: Error message: "File size must be less than 2MB"

### Test File Type
1. Try to upload a .txt or .pdf file
2. **Expected**: Error message: "Invalid file type. Allowed types: PNG, JPG, JPEG, SVG"

### Test Valid Upload
1. Upload a valid PNG < 2MB
2. **Expected**: Preview appears, no errors

---

## ✅ Success Criteria Checklist

After all tests, verify:

- [ ] Starbucks auto-detected instantly with logo
- [ ] Starbucks saved with metadata_source = 'auto_lookup'
- [ ] Custom brand accepted manual logo upload
- [ ] Logo uploaded to Supabase Storage successfully
- [ ] Logo displays in brand cards
- [ ] Edit functionality works
- [ ] File validation prevents invalid uploads
- [ ] All metadata displays correctly (website, description, category)
- [ ] Denominations save and link to brands
- [ ] "Auto-detected" badge shows for Starbucks
- [ ] No "Auto-detected" badge for custom brands
- [ ] Storage bucket is public (logos load without auth)

---

## 🐛 Troubleshooting

### "Brand not found" for Starbucks
**Problem**: Auto-lookup not working

**Check**:
1. Open browser DevTools → Console
2. Look for errors
3. Check Network tab for failed requests
4. Verify `src/lib/gift-cards/popular-brands-db.ts` exists

### Logo Upload Fails
**Problem**: "Failed to upload logo"

**Check**:
1. Verify storage bucket exists in Supabase
2. Check RLS policies are correct
3. Verify user is authenticated
4. Check file is < 2MB and valid type

### Can't Access Admin Page
**Problem**: 403 or blank page

**Check**:
1. Verify your user has `platform_admin` role in `user_roles` table
2. Check browser console for auth errors

### Logo Doesn't Display
**Problem**: Broken image icon

**Check**:
1. Verify logo URL is accessible (open in new tab)
2. Check storage bucket is public
3. Verify RLS policy for SELECT is set to public

---

## 📸 Visual Confirmation Screenshots

Take screenshots of:
1. ✅ Starbucks auto-detect success alert
2. ✅ Starbucks brand card with "Auto-detected" badge
3. ✅ Custom brand with uploaded logo
4. ✅ Storage bucket showing uploaded file
5. ✅ Database table showing both brands

---

## 🎉 When Everything Works

You should have:
- ✅ 2 brands in your system (Starbucks + Custom)
- ✅ Both logos displaying correctly
- ✅ Starbucks marked as auto_lookup
- ✅ Custom brand marked as manual
- ✅ All metadata visible and correct
- ✅ File uploaded to storage bucket
- ✅ No console errors

**System is production-ready!** 🚀


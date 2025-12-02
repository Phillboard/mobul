# Gift Card Brand Management System - Testing Guide

## Overview
This guide provides comprehensive testing instructions for the new gift card brand management system with auto-lookup capabilities.

## Prerequisites
1. Run migrations to add new fields to `gift_card_brands` table
2. Ensure storage bucket `gift-card-brand-logos` is created
3. Have admin/platform_admin role to access the brand management features

## Test Scenarios

### Test 1: Add a Popular Brand (Auto-Lookup Success)

**Objective**: Verify that popular brands are automatically detected and enriched with metadata

**Steps**:
1. Navigate to Admin → Gift Card Brands page
2. Click "Add New Brand" button
3. Type "Starbucks" in the Brand Name field
4. **Expected**: Auto-lookup triggers and shows:
   - Green checkmark with "Brand found!" message
   - Starbucks logo preview (from Clearbit)
   - Website: starbucks.com
   - Category: Food & Beverage badge
   - "Auto-detected from database" badge
5. Click "Continue to Details"
6. **Expected**: Form pre-populated with:
   - Brand Name: Starbucks
   - Logo: Starbucks logo displayed
   - Website: starbucks.com
   - Category: food_beverage
   - Description: "Coffee, espresso drinks, and food items"
7. (Optional) Click "Sync with Tillo"
8. **Expected**: If Tillo API configured:
   - Shows "Tillo sync successful" message
   - Displays Tillo brand code badge
   - Shows suggested denominations ($5, $10, $15, $25, $50, $100)
9. Click "Add Brand"
10. **Expected**: 
    - Success toast: "Brand added successfully"
    - Brand appears in the list with "Auto-detected" badge
    - All metadata displayed correctly (website link, description, category)

**Variations to Test**:
- Amazon
- Target
- Walmart
- Netflix
- iTunes

### Test 2: Add a Less Common Brand (Clearbit Lookup Success)

**Objective**: Test Clearbit logo lookup for brands not in the popular database

**Steps**:
1. Click "Add New Brand"
2. Type "Chipotle" or another brand not showing instant results
3. Wait ~2-3 seconds for Clearbit lookup
4. **Expected**: Shows "Brand found!" with logo from Clearbit
5. Continue and complete the brand addition
6. **Expected**: Brand saved with metadata_source: 'clearbit'

### Test 3: Add a Custom Brand (Manual Entry)

**Objective**: Test manual brand entry for unknown brands

**Steps**:
1. Click "Add New Brand"
2. Type "Joe's Coffee Shop"
3. **Expected**: Shows "Brand not found" message
4. Click "Continue to Details"
5. **Expected**: Form shows:
   - Brand Name: Joe's Coffee Shop
   - Empty logo field with upload option
6. Click the file upload input
7. Upload a PNG/JPG logo (< 2MB)
8. **Expected**: Logo preview appears immediately
9. Fill optional fields:
   - Website: https://joescoffee.com
   - Category: Food & Beverage
   - Description: "Local coffee shop"
10. Click "Add Brand"
11. **Expected**: 
    - Logo uploaded to Supabase storage
    - Brand saved with uploaded logo URL
    - metadata_source: 'manual'

### Test 4: Add Brand with Logo URL (Not Upload)

**Objective**: Test entering logo URL directly instead of uploading

**Steps**:
1. Click "Add New Brand"
2. Type "Custom Brand"
3. Continue to Details
4. Instead of uploading, enter logo URL: `https://logo.clearbit.com/example.com`
5. **Expected**: Logo preview loads from URL
6. Complete and save brand
7. **Expected**: Brand saved with entered logo URL (not uploaded to storage)

### Test 5: Tillo Sync Integration

**Objective**: Test optional Tillo synchronization

**Steps**:
1. Add a new brand (e.g., "Visa")
2. On the name step, click "Sync with Tillo (Optional)"
3. **Expected**: 
   - Loading indicator appears
   - If found: Shows Tillo brand code badge and suggested denominations
   - If not found: Shows "Brand not found in Tillo" message (non-blocking)
4. Continue to details
5. **Expected**: Tillo brand code pre-filled (if found)
6. **Expected**: Suggested denominations appear as removable badges
7. Add/remove denominations as needed
8. Save brand
9. **Expected**: Brand and denominations saved to database

### Test 6: Edit Existing Brand

**Objective**: Test brand editing functionality

**Steps**:
1. Find an existing brand in the list
2. Click the Edit icon (pencil)
3. **Expected**: Edit dialog opens with all current brand data
4. Modify fields:
   - Change description
   - Update website URL
   - Change category
5. Click "Change Logo" button
6. Upload a new logo
7. **Expected**: New logo preview appears
8. Click "Save Changes"
9. **Expected**:
   - Old logo deleted from storage (if it was uploaded)
   - New logo uploaded
   - Brand metadata updated
   - Changes reflected in brand list

### Test 7: Logo Validation

**Objective**: Test file upload validation

**Steps**:
1. Try uploading a file > 2MB
2. **Expected**: Error message "File size must be less than 2MB"
3. Try uploading a .txt file
4. **Expected**: Error message "Invalid file type. Allowed types: PNG, JPG, JPEG, SVG"
5. Upload a valid PNG
6. **Expected**: Upload succeeds, preview shown

### Test 8: Brand Metadata Display

**Objective**: Verify rich metadata display in brand cards

**Steps**:
1. Review brand cards in the list
2. For auto-detected brands, **Expected**:
   - "Auto-detected" sparkle badge
   - Category badge displayed
   - Website link with external link icon
   - Description text visible
   - Tillo code shown (if available)
3. For manual brands, **Expected**:
   - No auto-detected badge
   - All entered metadata displayed
   - metadata_source: 'manual'

### Test 9: Enable/Disable Brand

**Objective**: Test brand activation toggle

**Steps**:
1. Toggle a brand's "Enabled" switch
2. **Expected**: 
   - Status updates immediately
   - Badge changes from "Active" (green) to "Inactive" (gray)
   - Toast confirmation
3. Toggle back on
4. **Expected**: Status reverts to Active

### Test 10: Denomination Management with New Brand

**Objective**: Test adding denominations from Tillo sync results

**Steps**:
1. Add brand with Tillo sync that returns denominations
2. **Expected**: Suggested denominations show as badges
3. Remove a denomination (click X)
4. **Expected**: Badge removed from suggestions
5. Add custom denomination ($15)
6. **Expected**: New denomination added to list
7. Save brand
8. **Expected**: All denominations created in database with default 5% discount cost

## Edge Cases to Test

### E1: Network Failure During Lookup
- Disconnect internet during brand name entry
- **Expected**: Shows "not found" gracefully, allows manual entry

### E2: Invalid Logo URL
- Enter non-existent logo URL
- **Expected**: Logo fails to load but form still submittable

### E3: Duplicate Brand Name
- Try adding brand with existing name
- **Expected**: Database unique constraint error, clear message to user

### E4: Cancel During Logo Upload
- Start uploading large file, immediately click Cancel
- **Expected**: Upload cancels, dialog closes, no orphaned files

### E5: Edit Brand Without Changing Logo
- Edit brand but don't touch logo
- **Expected**: Logo unchanged, no unnecessary uploads

## Performance Tests

### P1: Auto-Lookup Speed
- **Expected**: Popular DB lookup < 100ms
- **Expected**: Clearbit lookup < 3 seconds

### P2: Logo Upload Speed
- Upload 500KB image
- **Expected**: Completes in < 5 seconds

### P3: Tillo Sync Speed
- **Expected**: Completes in < 10 seconds (depends on Tillo API)

## Database Verification

After each test, verify in Supabase:

1. Check `gift_card_brands` table:
   - New row created with correct fields
   - `metadata_source` set correctly
   - `brand_colors` JSONB formatted properly
   - `updated_at` timestamp correct

2. Check `gift_card_denominations` table:
   - Denominations linked to correct brand_id
   - Cost calculations correct (5% discount)

3. Check `gift-card-brand-logos` storage bucket:
   - Uploaded logos present
   - No orphaned files
   - Public access working

## Success Criteria

✅ All popular brands (Starbucks, Amazon, Target, etc.) auto-detected instantly
✅ Custom brands can be added with manual logo upload
✅ Logo validation prevents invalid files
✅ Tillo sync enriches brands with denominations and codes
✅ Edit functionality updates brands without data loss
✅ All metadata displays correctly in UI
✅ Storage bucket properly configured
✅ No linter errors
✅ Migrations apply successfully
✅ Forms are intuitive and provide clear feedback

## Known Limitations

1. Clearbit API is free but rate-limited (may fail for rapid consecutive lookups)
2. Tillo sync requires valid API credentials in environment
3. Logo URLs from external sources may break if source site changes
4. Auto-lookup only works for brands in English

## Future Enhancements

- [ ] Add brand logo size optimization/compression
- [ ] Support for international brands
- [ ] Bulk brand import from CSV
- [ ] Brand analytics and usage statistics
- [ ] Integration with more logo APIs (Brandfetch)
- [ ] AI-powered brand categorization


# Gift Card System Testing Checklist

## Phase 1: Dead Code Removal ✅
- [x] Removed CreatePoolDialog.tsx
- [x] Removed GiftCardManager.tsx
- [x] Removed sell-gift-cards edge function
- [x] Verified no hanging imports

## Phase 2: Feature Completion ✅
- [x] Fixed cost tracking in transfer-admin-cards
- [x] Created export-pool-cards edge function
- [x] Wired up balance check button
- [x] Wired up CSV export button
- [x] Made pool settings editable

## Phase 3: Security ✅
- [x] Added RLS policies for client_users, lead_sources, vendors
- [x] Fixed search_path for update_updated_at_column function
- [x] Noted leaked password protection requires dashboard access

## Phase 4: Modularization ✅
- [x] Created types/giftCards.ts with comprehensive types
- [x] Created lib/giftCardUtils.ts with shared functions
- [x] Created lib/currencyUtils.ts for currency operations
- [x] Split PoolDetailDialog into modular components
- [x] Added JSDoc comments to all new files and functions

## Phase 5: Testing ✅ READY

### System Status Check ✅
- [x] No console errors detected
- [x] Network requests functioning correctly (200 responses)
- [x] Authentication working properly
- [x] API endpoints responding

### Testing Instructions

**Prerequisites:**
1. Log in as admin user (admin@mopads.com)
2. Navigate to /gift-cards page
3. Have test CSV file with gift cards ready

---

### Core Functionality Tests

#### 1. Create Master Pool
**Steps:**
1. Click "Create New Pool" button
2. Select a brand from dropdown
3. Enter pool details (name, card value, provider)
4. Check "Master Pool" checkbox
5. Click Create
**Expected:** Pool created successfully, shows in Admin Master Pools tab

#### 2. Upload Cards to Master Pool
**Steps:**
1. Click on a master pool card
2. Click "Upload Gift Cards" button
3. Upload CSV file with cards
4. Verify card count increases
**Expected:** Cards imported, counts updated, success toast shown

#### 3. Set Pricing
**Steps:**
1. Open a master pool
2. Click "Edit Pricing" button
3. Set sale_price_per_card (e.g., $25)
4. Set markup_percentage (e.g., 20%)
5. Save changes
**Expected:** Pricing saved, displayed on pool card

#### 4. Transfer Cards to Client
**Steps:**
1. Open master pool detail
2. Click "Sell to Client" button
3. Select client and quantity
4. Enter price per card
5. Confirm transfer
**Expected:** Cards moved to client pool, admin_card_sales record created, profit calculated

#### 5. Check Balances
**Steps:**
1. Open any pool detail dialog
2. Click "Check Balances" button
3. Wait for API calls to complete
**Expected:** Balance updates shown, history logged, success message

#### 6. Export Pool CSV
**Steps:**
1. Open pool detail dialog
2. Click "Export CSV" button
3. Toggle "Include sensitive data" (admin only)
4. Download file
**Expected:** CSV downloads with proper masking for non-admins

#### 7. Edit Pool Settings
**Steps:**
1. Open pool detail dialog
2. Go to Settings tab
3. Toggle auto-balance check
4. Change frequency and threshold
5. Save
**Expected:** Settings persist, applied to pool

---

### Security Tests

#### 1. Admin-only Master Pools
**Steps:**
1. Log in as non-admin user
2. Try to create master pool
**Expected:** Option not visible or blocked

#### 2. Client Pool Isolation
**Steps:**
1. Log in as client user
2. Navigate to gift cards page
**Expected:** Only see own client's pools

#### 3. Masked Codes
**Steps:**
1. Log in as client user
2. Open pool detail
3. View card codes in table
**Expected:** Codes masked (••••••••1234)

#### 4. Export Masking
**Steps:**
1. As client user, export CSV
**Expected:** Codes masked in export file

---

### UI/UX Tests

#### 1. Loading States
**Action:** Observe all async operations (create, upload, transfer)
**Expected:** Loading spinners/states visible during operations

#### 2. Error Handling
**Action:** Try invalid operations (transfer more than available, etc.)
**Expected:** Clear error toast messages

#### 3. Empty States
**Action:** View page with no pools
**Expected:** Helpful empty state message with action

#### 4. Responsive Design
**Action:** Resize browser, test on mobile viewport
**Expected:** Layout adapts, all features accessible

#### 5. Dark Mode
**Action:** Toggle theme in settings
**Expected:** All components render correctly in both modes

---

### Performance Tests

#### 1. Large Pool Display
**Setup:** Create pool with 1000+ cards
**Action:** Open pool detail, scroll through cards table
**Expected:** Smooth rendering, pagination working

#### 2. Search Filtering
**Action:** Search for cards by code in large pool
**Expected:** Results filter instantly

#### 3. Balance Check
**Action:** Check balances on pool with 100+ cards
**Expected:** Completes within reasonable time (< 30s)

#### 4. CSV Export
**Action:** Export pool with 1000+ cards
**Expected:** File downloads successfully without timeout

---

## Testing Status
- [ ] All Core Functionality Tests Complete
- [ ] All Security Tests Complete  
- [ ] All UI/UX Tests Complete
- [ ] All Performance Tests Complete

## Bug Fixes Needed
_Document any issues found during testing here_

## Known Limitations
- Leaked password protection requires manual backend configuration
- Balance checks only work for Tillo API provider currently
- Screenshot tool cannot access authenticated pages (expected behavior)

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

## Phase 5: Testing

### Core Functionality Tests
- [ ] **Create Master Pool** - Admin can create master pool with brand selection
- [ ] **Upload Cards to Master Pool** - CSV upload works and updates card counts
- [ ] **Set Pricing** - Admin can set sale_price_per_card and markup
- [ ] **Transfer Cards to Client** - Sell dialog transfers cards and deducts wallet
- [ ] **Client Purchase from Marketplace** - Client can buy pools with wallet credits
- [ ] **Check Balances** - Balance check button triggers API and updates cards
- [ ] **Export Pool CSV** - CSV export works with proper masking based on role
- [ ] **View Sales History** - Profit calculations display correctly
- [ ] **Record Inventory Purchase** - Cost tracking records properly
- [ ] **Edit Pool Settings** - Admin can edit auto-check, frequency, threshold
- [ ] **View Audit Logs** - Transfers are logged in gift_card_audit_log

### Security Tests
- [ ] **Admin-only Master Pools** - Non-admins cannot create master pools
- [ ] **Client Pool Isolation** - Users can only see their client's pools
- [ ] **Masked Codes for Clients** - Client users see masked card codes
- [ ] **Full Codes for Admins** - Admins can reveal full card codes
- [ ] **RLS Enforcement** - Direct database queries respect RLS policies
- [ ] **Wallet Validation** - Cannot purchase more than wallet balance

### UI/UX Tests
- [ ] **Loading States** - All async operations show loading indicators
- [ ] **Error Handling** - Errors display user-friendly toast messages
- [ ] **Empty States** - Appropriate messages when no data exists
- [ ] **Responsive Design** - Works on mobile, tablet, desktop
- [ ] **Dark Mode** - All components render correctly in dark theme

### Performance Tests
- [ ] **Large Pool Display** - Handles pools with 1000+ cards
- [ ] **Search Filtering** - Card search performs well with many results
- [ ] **Balance Check** - Batch balance checks don't timeout
- [ ] **CSV Export** - Large exports (1000+ cards) complete successfully

## Bug Fixes Needed
- None identified yet

## Known Limitations
- Leaked password protection requires manual dashboard configuration
- Balance checks only work for Tillo API provider currently

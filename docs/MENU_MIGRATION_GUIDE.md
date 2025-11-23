# Menu Reorganization & Codebase Cleanup - Migration Guide

## Overview
This guide documents the completed menu reorganization, RBAC implementation, and codebase restructuring. This is the result of implementing Phases 1-9 of the cleanup plan.

## What Was Changed

### ✅ Phase 1: Menu Consolidation (COMPLETE)
**From 8 groups → 6 groups**

#### Old Structure
1. Dashboard
2. Marketing (with Audiences)
3. CRM
4. Rewards (Gift Cards)
5. Call Center
6. Administration
7. Agency
8. Platform Admin

#### New Structure
1. **Dashboard** - Same
2. **Marketing** - Removed Audiences
3. **CRM** - Added Contacts (merged from Audiences)
4. **Gift Cards** - NEW: Consolidated from "Rewards" + added Marketplace from Platform Admin
5. **Call Center** - Same
6. **Administration** - Same
7. **Agency** - Same (agency_owner only)

**Menu Behavior Changes:**
- ✅ NO groups open by default
- ✅ Only the group containing the active route expands automatically
- ✅ All menu items have proper permission checks

**File Changes:**
- `src/components/layout/Sidebar.tsx` - Updated navigation structure

### ✅ Phase 2: Database Permissions (COMPLETE)
Added missing permissions for new consolidated structure:

**New Permissions Added:**
```sql
-- Contacts
contacts.view, contacts.create, contacts.edit, contacts.delete, contacts.export, contacts.import

-- Companies  
companies.view, companies.create, companies.edit, companies.delete

-- Deals
deals.view, deals.create, deals.edit, deals.delete

-- Activities
activities.view, activities.create

-- Tasks
tasks.view, tasks.create, tasks.edit, tasks.complete

-- Gift Cards Admin
giftcards.admin_view (for admin marketplace)
```

**Database Files:**
- Migration created and executed successfully

### ✅ Phase 3: Audiences → Contacts Consolidation (COMPLETE)
**Merged Audiences functionality into Contacts page**

**Changes:**
- `/audiences` route now redirects to `/contacts`
- Contacts page now has two tabs:
  - "All Contacts" - Original contacts functionality
  - "Import Audiences" - Audience import functionality moved here
- Page title updated to "Contacts & Audiences"
- Import button in header switches to import tab

**Files Modified:**
- `src/pages/Contacts.tsx` - Added import tab and audience functionality
- `src/App.tsx` - Updated /audiences route to redirect to Contacts

**Files TO DELETE (after verification):**
- `src/pages/Audiences.tsx` - Replaced by Contacts import tab
- `src/pages/AudienceDetail.tsx` - Check if duplicate of ContactDetail

### ✅ Phase 4: Gift Card Consolidation (IN PROGRESS)
**Started new feature-based structure**

**New Structure Created:**
```
src/features/gift-cards/
├── lib/
│   └── utils.ts              ✅ CREATED - Shared utilities
├── types/
│   └── index.ts              ✅ CREATED - Consolidated types
└── components/
    └── shared/
        └── StatusBadge.tsx   ✅ CREATED - Reusable status badge
```

**Utilities Created:**
- `getHealthColor()` - Pool health status colors
- `calculatePoolHealth()` - Health calculation logic
- `calculateUtilization()` - Utilization percentage
- `calculateProfitMargin()` - Profit calculations
- `formatCurrency()` - Currency formatting
- `maskCardCode()` - Security masking for card codes
- `getStatusVariant()` - Badge variant helper

**Components To Migrate (REMAINING WORK):**

**Marketplace** (admin components):
- [ ] `src/components/gift-cards/BrandPoolsView.tsx` → `src/features/gift-cards/components/marketplace/`
- [ ] `src/components/gift-cards/PoolCard.tsx` → `src/features/gift-cards/components/marketplace/`
- [ ] `src/components/gift-cards/PoolDetailDialog.tsx` → `src/features/gift-cards/components/marketplace/`
- [ ] `src/components/gift-cards/AdminUploadDialog.tsx` → `src/features/gift-cards/components/marketplace/`

**Management** (client management):
- [ ] `src/components/gift-cards/GiftCardInventory.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/PoolSettings.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/DeliveryHistory.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/GiftCardAnalytics.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/EditPoolPricingDialog.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/PoolBalanceHistory.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/PoolCardsTable.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/GiftCardUploadTab.tsx` → `src/features/gift-cards/components/management/`
- [ ] `src/components/gift-cards/CreatePoolDialogV2.tsx` → `src/features/gift-cards/components/management/`

**Purchase** (purchase flow):
- [ ] `src/components/gift-cards/PurchaseGiftCardsDialog.tsx` → `src/features/gift-cards/components/purchase/`
- [ ] `src/components/gift-cards/PurchasePoolDialog.tsx` → `src/features/gift-cards/components/purchase/`
- [ ] `src/components/gift-cards/BrandSelector.tsx` → `src/features/gift-cards/components/purchase/`
- [ ] `src/components/gift-cards/ClientMarketplace.tsx` → `src/features/gift-cards/components/purchase/`
- [ ] `src/components/gift-cards/RecordPurchaseDialog.tsx` → `src/features/gift-cards/components/purchase/`
- [ ] `src/components/gift-cards/SellGiftCardsDialog.tsx` → `src/features/gift-cards/components/purchase/`

**Shared**:
- [ ] `src/components/gift-cards/PoolStats.tsx` → `src/features/gift-cards/components/shared/`
- [ ] `src/components/gift-cards/GiftCardTesting.tsx` → Consider if needed

### Phase 5: Remove Unused Code (TODO)
**After gift card migration is complete:**
1. Delete old `src/components/gift-cards/` directory
2. Remove `src/pages/Audiences.tsx` (verify no usage first)
3. Remove `src/pages/AudienceDetail.tsx` (if duplicate)
4. Search for any orphaned imports

### Phase 6: Code Quality (TODO)
**After migration:**
1. Replace all `getHealthColor()` calls with `import { getHealthColor } from '@/features/gift-cards/lib/utils'`
2. Replace all status badges with `import { StatusBadge } from '@/features/gift-cards/components/shared/StatusBadge'`
3. Use shared type definitions from `@/features/gift-cards/types`

### Phase 7: Security Enhancements (TODO)
**RLS Review needed for:**
- [ ] `gift_card_pools` - Verify client isolation
- [ ] `gift_cards` - Verify access control
- [ ] `contacts` - Verify RLS policies updated for audiences merge
- [ ] `campaigns` - Verify client isolation

### Phase 8: Testing (TODO)
See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for detailed testing plan.

**Quick Tests:**
1. ✅ Menu displays correctly for each role
2. ✅ No groups open by default
3. ✅ Active route's group expands
4. ✅ /audiences redirects to /contacts
5. [ ] All gift card features work after migration
6. [ ] No console errors
7. [ ] All permissions enforced

### ✅ Phase 9: Documentation (COMPLETE)
**Created:**
- ✅ `docs/PERMISSIONS.md` - Complete permission documentation
- ✅ `docs/MENU_MIGRATION_GUIDE.md` - This file
- [ ] Update `docs/ARCHITECTURE.md` - TODO

## How to Continue the Migration

### Step 1: Complete Gift Card Migration
For each component in the "Components To Migrate" list above:

1. **Create destination directory** (if not exists):
   ```bash
   mkdir -p src/features/gift-cards/components/marketplace
   mkdir -p src/features/gift-cards/components/management
   mkdir -p src/features/gift-cards/components/purchase
   ```

2. **Move the file**:
   ```bash
   mv src/components/gift-cards/PoolCard.tsx src/features/gift-cards/components/marketplace/
   ```

3. **Update imports in the moved file**:
   - Change relative imports to use `@/features/gift-cards/...`
   - Use shared utilities: `import { getHealthColor } from '@/features/gift-cards/lib/utils'`
   - Use shared types: `import type { GiftCardPool } from '@/features/gift-cards/types'`

4. **Update all files that import the moved component**:
   ```typescript
   // Old
   import { PoolCard } from '@/components/gift-cards/PoolCard'
   
   // New
   import { PoolCard } from '@/features/gift-cards/components/marketplace/PoolCard'
   ```

5. **Search for duplicate logic**:
   - If component has `getHealthColor` function, remove it and use shared util
   - If component has status badge logic, use shared `<StatusBadge>` component

6. **Test the component** - Verify it still works

### Step 2: Refactor Duplicate Logic
As you move components, look for:

**Duplicate getHealthColor:**
```typescript
// REMOVE THIS (duplicate)
const getHealthColor = (health: string) => {
  switch (health) {
    case 'healthy': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-red-500';
  }
}

// REPLACE WITH
import { getHealthColor } from '@/features/gift-cards/lib/utils';
```

**Duplicate Status Badges:**
```typescript
// REMOVE THIS (duplicate)
<Badge variant={status === 'active' ? 'success' : 'secondary'}>
  {status}
</Badge>

// REPLACE WITH
import { StatusBadge } from '@/features/gift-cards/components/shared/StatusBadge';
<StatusBadge status={status} />
```

### Step 3: Update Page Components
Update the main page files to import from new locations:

**Files to update:**
- `src/pages/GiftCards.tsx` (Gift Card Manager)
- `src/pages/PurchaseGiftCards.tsx`
- `src/pages/AdminGiftCardMarketplace.tsx`

### Step 4: Delete Old Files
**Only after ALL imports are updated and tested:**
```bash
rm -rf src/components/gift-cards/
rm src/pages/Audiences.tsx
rm src/pages/AudienceDetail.tsx  # If confirmed duplicate
```

### Step 5: Verify and Test
1. Run the app - no console errors
2. Test each role's menu visibility
3. Test all gift card features
4. Test contacts/audiences merge
5. Run any automated tests

## Permission Changes Summary

### Menu Items → Permission Mapping

| Menu Item | Old Permissions | New Permissions |
|-----------|----------------|-----------------|
| Contacts | `audiences.view` | `audiences.view` OR `contacts.view` |
| Companies | `audiences.view` | `audiences.view` OR `companies.view` |
| Deals | `audiences.view` | `audiences.view` OR `deals.view` |
| Activities | `audiences.view` | `audiences.view` OR `activities.view` |
| Tasks | `audiences.view` | `audiences.view` OR `tasks.view` |
| Manage Cards | `gift_cards.manage` | `gift_cards.manage` OR `giftcards.view` |
| Purchase Cards | `gift_cards.purchase` | `gift_cards.purchase` OR `giftcards.purchase` |
| Marketplace | N/A (was in Platform Admin) | `giftcards.admin_view` + admin role |

## Rollback Plan

If issues arise:

### Rollback Menu Changes
```bash
git checkout HEAD~1 src/components/layout/Sidebar.tsx
```

### Rollback Route Changes
```bash
git checkout HEAD~1 src/App.tsx
git checkout HEAD~1 src/pages/Contacts.tsx
```

### Rollback Database
Database changes are additive (only INSERT), so no rollback needed. New permissions simply won't be used.

## Success Criteria

- [x] Menu reduced from 8 to 6 groups
- [x] All menu items have proper permissions
- [x] No groups open by default
- [x] Audiences merged into Contacts
- [x] New permissions added to database
- [ ] Gift Cards fully consolidated (IN PROGRESS)
- [ ] No unused code remaining
- [ ] All tests passing
- [ ] Documentation complete

## Next Steps

1. **Complete gift card migration** following Step 1 above
2. **Update remaining imports** in page components
3. **Delete old files** after verification
4. **Run full test suite** to verify everything works
5. **Update ARCHITECTURE.md** with new structure

## Questions / Issues?

If you encounter issues during migration:

1. Check that all imports are updated to new paths
2. Verify permissions are granted to test users
3. Check console for import errors
4. Verify RLS policies allow data access
5. Review [PERMISSIONS.md](./PERMISSIONS.md) for permission details

## Related Documentation

- [PERMISSIONS.md](./PERMISSIONS.md) - Complete permission system docs
- [TESTING_CHECKLIST.md](../TESTING_CHECKLIST.md) - Testing procedures
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture (to be updated)

# Call Center Marketplace Fix - Implementation Complete

## ✅ All Fixes Applied

### Changes Made:

#### 1. ✅ Fixed CallCenterRedemptionPanel Query
**File:** `src/components/call-center/CallCenterRedemptionPanel.tsx`

**Change:** Updated database query from pool-based to marketplace model
- **Before:** `campaign_reward_configs (*)`
- **After:** `campaign_gift_card_config (*)`

#### 2. ✅ Updated TypeScript Interfaces
**File:** `src/components/call-center/CallCenterRedemptionPanel.tsx`

**Added:**
```typescript
interface CampaignGiftCardConfig {
  id: string;
  brand_id: string;
  denomination: number;
  condition_number: number;
}
```

**Updated:** `RecipientData` interface to use `campaign_gift_card_config` instead of `campaign_reward_configs`

#### 3. ✅ Fixed Gift Card Config Reference
**File:** `src/components/call-center/CallCenterRedemptionPanel.tsx`

**Change:** Updated poolId logic to work with marketplace model
- Now extracts `brand_id` and `denomination` from `campaign_gift_card_config`
- Creates compatible poolId format: `{brand_id}-{denomination}`

#### 4. ✅ Updated PoolInventoryWidget Hook
**File:** `src/hooks/usePoolInventory.ts`

**Change:** Adapted hook to query `gift_card_inventory` table instead of `gift_card_pools`
- Parses `brand-denomination` format from poolId
- Queries inventory by brand_id and denomination
- Counts available, total, and reserved cards
- Returns compatible interface for existing PoolInventoryWidget component

#### 5. ✅ Created Verification Script
**File:** `scripts/sql/verify-marketplace-setup.sql`

**Purpose:** Comprehensive 7-step verification to diagnose why code lookup fails
- Checks recipient existence
- Verifies campaign linkage
- Confirms conditions configured
- **Critical:** Verifies gift card config exists
- Checks client access
- Verifies inventory availability
- Tests exact call center query

#### 6. ✅ Created Setup Script
**File:** `scripts/sql/setup-campaign-gift-card-config.sql`

**Purpose:** Automatically configures campaign gift card if missing
- Finds campaign for code AB6-1061
- Selects appropriate brand (Starbucks → Amazon → first available)
- Grants client access to gift card
- Adds gift card config to campaign
- Creates campaign condition if missing
- Verifies inventory and reports status

---

## 🚀 Next Steps - Run These SQL Scripts

### Step 1: Verify Current Setup

```bash
# In Supabase SQL Editor, run:
scripts/sql/verify-marketplace-setup.sql
```

**This will tell you exactly what's missing.**

Look for the "SUMMARY" section at the end:
- ✓ SUCCESS: Everything is ready
- ✗ CRITICAL: Shows what needs to be fixed
- Next action: Tells you what to do

### Step 2: If Verification Fails, Run Setup

```bash
# In Supabase SQL Editor, run:
scripts/sql/setup-campaign-gift-card-config.sql
```

**This will:**
- Link your campaign to a gift card brand
- Configure denomination ($25 by default)
- Grant client access
- Create condition if missing

### Step 3: Test in Call Center

1. Refresh your browser (hard refresh: Ctrl+Shift+R)
2. Navigate to Call Center (`/call-center`)
3. Enter code: `AB6-1061`
4. Click "Look Up"

**Expected Result:** ✓ Recipient found with campaign details!

---

## 🔍 What Was Wrong?

### Root Cause:
Your database uses the **Admin Marketplace Model** for gift cards:
- `gift_card_inventory` - Platform's inventory
- `campaign_gift_card_config` - Campaign configuration
- `client_available_gift_cards` - Client purchases

But the call center code was looking for the **Pool-Based Model**:
- `gift_card_pools` - (doesn't exist in your DB)
- `campaign_reward_configs` - (doesn't exist in your DB)

### The Fix:
Updated all call center code to use the marketplace model tables.

---

## 📊 Schema Comparison

### OLD (Pool-Based) - What code expected:
```
campaigns
  └─ campaign_reward_configs
      └─ gift_card_pools
          └─ gift_cards
```

### NEW (Marketplace) - What you actually have:
```
campaigns
  └─ campaign_gift_card_config (brand_id + denomination)
      └─ gift_card_inventory (platform-wide)
          └─ client_available_gift_cards (client access)
```

---

## ✅ Verification Checklist

After running the scripts, verify:

- [ ] Run verification script - all checks pass
- [ ] Run setup script if needed - completes without errors
- [ ] Refresh call center page
- [ ] Enter code `AB6-1061`
- [ ] Recipient details appear
- [ ] Campaign and conditions show
- [ ] Gift card brand displays
- [ ] Can proceed through opt-in flow
- [ ] Can approve and provision gift card

---

## 🆘 Troubleshooting

### Issue: Verification script shows "No gift card configured"

**Solution:** Run `scripts/sql/setup-campaign-gift-card-config.sql`

### Issue: Setup script says "No campaign found"

**Solution:** The campaign isn't linked to the audience containing AB6-1061
```sql
-- Check campaign and audience
SELECT c.id, c.name, a.id as audience_id, a.name as audience_name
FROM campaigns c
LEFT JOIN audiences a ON c.audience_id = a.id;

-- Check recipient's audience
SELECT id, audience_id, redemption_code 
FROM recipients 
WHERE redemption_code = 'AB6-1061';

-- Fix: Link campaign to correct audience
UPDATE campaigns 
SET audience_id = (SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061')
WHERE id = 'your-campaign-id';
```

### Issue: "No inventory available"

**Solution:** Upload gift cards to platform inventory
1. Go to Admin > Platform Inventory
2. Upload CSV with gift cards
3. Or run: `INSERT INTO gift_card_inventory (...) VALUES (...)`

### Issue: Still getting "Code not found"

**Solutions:**
1. Check RLS policies on `recipients` table
2. Verify you're logged in with correct role
3. Check browser console for errors
4. Verify code exists: `SELECT * FROM recipients WHERE redemption_code = 'AB6-1061'`

---

## 📝 Files Modified

1. `src/components/call-center/CallCenterRedemptionPanel.tsx` - Query and interfaces
2. `src/hooks/usePoolInventory.ts` - Inventory hook adapted to marketplace

## 📝 Files Created

1. `scripts/sql/verify-marketplace-setup.sql` - Diagnostic tool
2. `scripts/sql/setup-campaign-gift-card-config.sql` - Auto-setup tool
3. `CALL_CENTER_MARKETPLACE_FIX_PLAN.md` - Detailed plan
4. `CALL_CENTER_MARKETPLACE_FIX_COMPLETE.md` - This summary

---

## 🎉 Success Metrics

When everything works:
- ✅ No "Code not found" errors
- ✅ Campaign details load instantly
- ✅ Gift card brand shows in UI
- ✅ Can complete full redemption flow
- ✅ Billing ledger records correctly
- ✅ Inventory decrements properly

---

**Status:** ✅ READY FOR TESTING

**Next Action:** Run verification script, then test with code AB6-1061!

*Context improved by Giga AI - using gift card provisioning system, campaign condition model, and organization hierarchy information.*


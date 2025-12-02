# Fix Call Center Code Lookup - Admin Marketplace Model

## Executive Summary

The call center cannot find recipient code `AB6-1061` because the lookup query expects `campaign_reward_configs` table, but the system uses the newer **admin marketplace model** with different tables:
- `campaign_gift_card_config` (not `campaign_reward_configs`)
- `gift_card_inventory` (not `gift_card_pools`)
- `client_available_gift_cards` (marketplace enablement)

## Root Cause Analysis

### 1. Schema Mismatch in Call Center Query

**Current Query (Line 183-195 in CallCenterRedemptionPanel.tsx):**
```typescript
.select(`
  *,
  audiences!inner (
    id,
    name,
    campaigns!inner (
      id,
      name,
      client_id,
      campaign_conditions (*),
      campaign_reward_configs (*)  // ❌ WRONG TABLE
    )
  )
`)
```

**Problem:** References `campaign_reward_configs` which doesn't exist in your database.

**Actual Tables:**
- ✅ `campaign_gift_card_config` - Links campaigns to gift cards
- ✅ `gift_card_inventory` - Platform inventory
- ✅ `client_available_gift_cards` - Client's purchased options

### 2. Two Competing Gift Card Systems

Your migrations show **TWO different gift card systems**:

**System A: Pool-Based (OLD/LEGACY)**
- `gift_card_pools` table
- `campaign_reward_configs` table
- Used by call center code

**System B: Admin Marketplace (NEW/CURRENT)**
- `gift_card_inventory` table
- `campaign_gift_card_config` table
- `client_available_gift_cards` table
- Used by your actual database

### 3. Migration Conflict

- Migration `20251114153421` creates pool-based system
- Migration `20251202000001` creates marketplace system
- Code references pool-based, database has marketplace

## Complete Fix Plan

### Phase 1: Verify Current State ✓ (DONE)

- [x] Confirmed database has marketplace tables
- [x] Confirmed code references pool tables
- [x] Identified query mismatch in `CallCenterRedemptionPanel.tsx`

### Phase 2: Fix Frontend Query (Critical)

**File:** `src/components/call-center/CallCenterRedemptionPanel.tsx`

**Line 183-195:** Update query to use correct table name:

```typescript
// BEFORE:
campaigns!inner (
  id,
  name,
  client_id,
  campaign_conditions (*),
  campaign_reward_configs (*)  // ❌ Wrong table
)

// AFTER:
campaigns!inner (
  id,
  name,
  client_id,
  campaign_conditions (*),
  campaign_gift_card_config (*)  // ✅ Correct table
)
```

### Phase 3: Update TypeScript Interface

**File:** `src/components/call-center/CallCenterRedemptionPanel.tsx`

**Lines 22-48:** Update interface to match new schema:

```typescript
// ADD new interface:
interface CampaignGiftCardConfig {
  id: string;
  brand_id: string;
  denomination: number;
  condition_number: number;
}

// UPDATE RecipientData interface:
interface RecipientData {
  // ... existing fields
  audiences?: {
    id: string;
    name: string;
    campaigns?: Array<{
      id: string;
      name: string;
      campaign_conditions?: Array<{...}>;
      campaign_gift_card_config?: CampaignGiftCardConfig[];  // ✅ New
      // campaign_reward_configs removed
    }>;
  };
}
```

### Phase 4: Fix Pool Inventory Widget

**File:** `src/hooks/usePoolInventory.ts`

This hook queries `gift_card_pools` which doesn't exist in marketplace model.

**Options:**
A. Update to query inventory stats from `gift_card_inventory`
B. Remove/disable the PoolInventoryWidget for marketplace model
C. Create a view/function that provides pool-like stats

**Recommended:** Create helper function:

```sql
CREATE OR REPLACE FUNCTION get_campaign_gift_card_availability(
  p_campaign_id UUID,
  p_brand_id UUID,
  p_denomination NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_available_count INT;
  v_total_in_system INT;
BEGIN
  -- Count available cards in inventory for this brand/denomination
  SELECT COUNT(*) INTO v_available_count
  FROM gift_card_inventory
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination
    AND status = 'available';
  
  SELECT COUNT(*) INTO v_total_in_system
  FROM gift_card_inventory
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination;
  
  RETURN json_build_object(
    'available_cards', v_available_count,
    'total_cards', v_total_in_system,
    'low_stock_threshold', 20
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

### Phase 5: Verify Edge Function Compatibility

**File:** `supabase/functions/provision-gift-card-for-call-center/index.ts`

**Lines 163-189:** Already uses `campaign_gift_card_config` ✅

This function is ALREADY compatible with marketplace model!

```typescript
const { data: giftCardConfig } = await supabaseClient
  .from('campaign_gift_card_config')  // ✅ Correct table
  .select('brand_id, denomination')
  .eq('campaign_id', campaignId)
  .eq('condition_number', conditionNumber)
  .single();
```

### Phase 6: Database Verification Query

**Create:** `scripts/sql/verify-marketplace-setup.sql`

```sql
-- Verify campaign gift card configuration exists
SELECT 
  'Campaign Gift Card Config' as check_name,
  c.name as campaign_name,
  gc.brand_id,
  gc.denomination,
  gc.condition_number,
  gb.name as brand_name
FROM campaign_gift_card_config gc
INNER JOIN campaigns c ON gc.campaign_id = c.id
INNER JOIN gift_card_brands gb ON gc.brand_id = gb.id
WHERE c.audience_id IN (
  SELECT audience_id FROM recipients 
  WHERE UPPER(redemption_code) = 'AB6-1061'
);

-- Verify client has access to this gift card
SELECT 
  'Client Gift Card Access' as check_name,
  c.name as client_name,
  gb.name as brand_name,
  cag.denomination,
  cag.is_enabled
FROM client_available_gift_cards cag
INNER JOIN clients c ON cag.client_id = c.id
INNER JOIN gift_card_brands gb ON cag.brand_id = gb.id
WHERE cag.client_id IN (
  SELECT client_id FROM campaigns
  WHERE audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
);

-- Verify inventory exists
SELECT 
  'Gift Card Inventory' as check_name,
  gb.name as brand_name,
  gi.denomination,
  COUNT(*) as available_cards
FROM gift_card_inventory gi
INNER JOIN gift_card_brands gb ON gi.brand_id = gb.id
WHERE gi.status = 'available'
  AND EXISTS (
    SELECT 1 FROM campaign_gift_card_config gc
    WHERE gc.brand_id = gi.brand_id
      AND gc.denomination = gi.denomination
      AND gc.campaign_id IN (
        SELECT c.id FROM campaigns c
        WHERE c.audience_id IN (
          SELECT audience_id FROM recipients 
          WHERE UPPER(redemption_code) = 'AB6-1061'
        )
      )
  )
GROUP BY gb.name, gi.denomination;
```

### Phase 7: Setup Script for Missing Data

**Create:** `scripts/sql/setup-campaign-gift-card-config.sql`

```sql
-- Add gift card config to campaign if missing
-- Run this after verifying campaign exists

DO $$
DECLARE
  v_campaign_id UUID;
  v_brand_id UUID;
  v_client_id UUID;
BEGIN
  -- Get campaign ID for the recipient
  SELECT c.id, c.client_id INTO v_campaign_id, v_client_id
  FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
  LIMIT 1;

  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'No campaign found for code AB6-1061';
  END IF;

  -- Get a brand ID (preferably Starbucks or first available)
  SELECT id INTO v_brand_id 
  FROM gift_card_brands 
  WHERE name ILIKE '%starbucks%'
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    SELECT id INTO v_brand_id FROM gift_card_brands LIMIT 1;
  END IF;

  -- Ensure client has access to this gift card
  INSERT INTO client_available_gift_cards (
    client_id,
    brand_id,
    denomination,
    is_enabled
  ) VALUES (
    v_client_id,
    v_brand_id,
    25.00,
    true
  ) ON CONFLICT (client_id, brand_id, denomination) DO NOTHING;

  -- Add gift card config to campaign condition 1
  INSERT INTO campaign_gift_card_config (
    campaign_id,
    brand_id,
    denomination,
    condition_number
  ) VALUES (
    v_campaign_id,
    v_brand_id,
    25.00,
    1
  ) ON CONFLICT (campaign_id, condition_number) DO NOTHING;

  RAISE NOTICE 'Gift card config added to campaign %', v_campaign_id;
END $$;
```

## Implementation Order

1. **[CRITICAL]** Fix `CallCenterRedemptionPanel.tsx` query (Phase 2)
2. **[CRITICAL]** Update TypeScript interface (Phase 3)
3. **[MEDIUM]** Run verification query to check data (Phase 6)
4. **[MEDIUM]** Run setup script if config missing (Phase 7)
5. **[LOW]** Fix or disable PoolInventoryWidget (Phase 4)
6. **[TEST]** Try code `AB6-1061` again in call center

## Success Criteria

- ✅ Call center can look up code `AB6-1061`
- ✅ No "Code not found" errors
- ✅ Campaign conditions display correctly
- ✅ Gift card provisioning works
- ✅ Billing ledger records correctly
- ✅ Admin marketplace integration intact

## Rollback Plan

If changes break existing functionality:
1. Revert `CallCenterRedemptionPanel.tsx` changes
2. Apply pool-based migrations to add `campaign_reward_configs`
3. Create migration to sync data between both systems

## Post-Fix Verification

```sql
-- Test the exact query call center will use
SELECT 
  r.id,
  r.redemption_code,
  a.name as audience_name,
  c.name as campaign_name,
  gc.brand_id,
  gc.denomination,
  gc.condition_number
FROM recipients r
INNER JOIN audiences a ON r.audience_id = a.id
INNER JOIN campaigns c ON c.audience_id = a.id
INNER JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
WHERE UPPER(r.redemption_code) = 'AB6-1061';
```

Expected result: Should return 1 row with campaign and gift card data.

---

**Estimated Implementation Time:** 30-45 minutes  
**Risk Level:** Medium (changes core lookup logic)  
**Testing Required:** End-to-end call center flow



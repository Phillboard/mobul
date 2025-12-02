# Gift Card System Migration Guide

## Overview

The gift card system has been migrated from a **pool-based architecture** to a **brand-denomination marketplace model**. This document explains the changes and how to update your code.

## What Changed?

### Old System (Deprecated)
- **gift_card_pools** table - Managed inventory in "pools"
- Each pool had a brand, denomination, and inventory count
- Pools belonged to specific clients
- Complex pool management UI

### New System
- **gift_card_brands** - Master catalog of available brands
- **gift_card_denominations** - Denominations available per brand
- **gift_card_inventory** - Uploaded gift card codes
- **client_available_gift_cards** - Enabled brand-denomination pairs per client
- **campaign_gift_card_config** - Links campaigns to specific brand-denominations

## Migration Guide

### 1. Hooks

#### Before (Deprecated):
```typescript
import { useGiftCardPools } from "@/hooks/useGiftCardPools";

const { pools, createPool } = useGiftCardPools(clientId);

// Create a pool
await createPool.mutateAsync({
  client_id: clientId,
  brand_id: brandId,
  pool_name: "Starbucks $25",
  card_value: 25,
  provider: "tillo",
});
```

#### After (New):
```typescript
import { useClientAvailableGiftCards, useAddClientGiftCard } from "@/hooks/useClientAvailableGiftCards";

const { data: giftCards } = useClientAvailableGiftCards(clientId);
const addGiftCard = useAddClientGiftCard(clientId);

// Add brand-denomination option
await addGiftCard.mutateAsync({
  brandId: brandId,
  denomination: 25,
});
```

### 2. Campaign Configuration

#### Before (Deprecated):
```typescript
// Conditions had gift_card_pool_id
const condition = {
  condition_name: "Listened to call",
  trigger_type: "manual_agent",
  gift_card_pool_id: "pool-uuid",
};
```

#### After (New):
```typescript
// Conditions have brand_id + card_value
const condition = {
  condition_name: "Listened to call",
  trigger_type: "manual_agent",
  brand_id: "brand-uuid",
  card_value: 25,
};

// Or use campaign_gift_card_config table
import { useSetCampaignGiftCard } from "@/hooks/useCampaignGiftCardConfig";

const setGiftCard = useSetCampaignGiftCard(campaignId);
await setGiftCard.mutateAsync({
  brandId: "brand-uuid",
  denomination: 25,
  conditionNumber: 1,
});
```

### 3. Inventory Management

#### Before (Deprecated):
```typescript
// Query pool inventory
const { data } = await supabase
  .from("gift_cards")
  .select("*")
  .eq("pool_id", poolId)
  .eq("status", "available");
```

#### After (New):
```typescript
// Query brand-denomination inventory
const { data } = await supabase
  .from("gift_card_inventory")
  .select("*")
  .eq("brand_id", brandId)
  .eq("denomination", denomination)
  .eq("status", "available");

// Or use the hook
import { useGiftCardInventoryCount } from "@/hooks/useCampaignGiftCardConfig";

const { data: count } = useGiftCardInventoryCount(brandId, denomination);
```

### 4. UI Components

#### Deprecated Components:
- `CreatePoolDialogV2` → Use `AddGiftCardDialog`
- `BrandPoolsView` → Use `BrandDenominationsView` (if exists) or query directly
- `PoolDetailDialog` → Use `BrandDenominationDetailDialog` (if exists) or build new view

#### Updated Components:
- Campaign wizard steps now use brand-denomination selection
- Admin marketplace shows brands with denomination options

## Database Schema Changes

### Dropped Tables:
- `gift_card_pools`
- `gift_cards` (old structure with pool_id)
- Various legacy pool-related tables

### New Tables:
- `gift_card_denominations` - Available denominations per brand
- `gift_card_inventory` - Uploaded gift card codes
- `client_available_gift_cards` - Client's enabled options
- `agency_available_gift_cards` - Agency's enabled options
- `gift_card_billing_ledger` - Immutable financial ledger
- `campaign_gift_card_config` - Campaign gift card configuration

## Benefits of New System

1. **Simpler Architecture** - No pool management overhead
2. **Better Inventory Tracking** - Direct brand-denomination queries
3. **Flexible Provisioning** - Can use uploaded codes OR Tillo API
4. **Clear Billing** - Immutable ledger tracks all transactions
5. **Client Control** - Clients choose which brand-denominations to enable

## Backwards Compatibility

The migration includes backwards compatibility layers:

- `useGiftCardPools` still exists but throws deprecation warnings
- `CreatePoolDialogV2` redirects to `AddGiftCardDialog`
- Cost estimation hooks support both old and new condition formats

However, these compatibility layers will be removed in future versions.

## Common Issues

### Issue: "Could not find the table 'gift_card_pools'"
**Solution**: The old table no longer exists. Use `client_available_gift_cards` instead.

### Issue: Components expecting pool_id
**Solution**: Update to use brand_id + denomination. See migration examples above.

### Issue: Pool detail views not working
**Solution**: Query `gift_card_inventory` filtered by brand_id and denomination.

## Support

For questions or issues with migration, please contact the development team.

Last Updated: December 2, 2024


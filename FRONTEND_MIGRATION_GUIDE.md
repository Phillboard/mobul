# Frontend Migration Guide

## Overview

This guide helps you migrate from direct RPC calls to the new API-first edge functions. The migration is designed to be gradual and non-breaking.

## Migration Strategy

### Phase 1: Add New Hooks (✅ Complete)
New hooks have been created alongside existing ones:
- `src/hooks/useCreditManagement.enhanced.ts` - Enhanced credit management
- `src/hooks/useCampaignValidation.ts` - Campaign validation APIs

### Phase 2: Update Components (Do This Now)
Gradually replace old patterns with new hooks in your components.

### Phase 3: Remove Old Code (After Testing)
Once tested, remove old direct RPC calls.

## Quick Migration Examples

### Example 1: Calculate Campaign Credits

**Before (Direct Calculation):**
```typescript
const estimatedCost = recipientCount * (giftCardDenomination + mailCost);
```

**After (Server-Side with Validation):**
```typescript
import { useCalculateCreditRequirements } from '@/hooks/useCreditManagement.enhanced';

function MyComponent() {
  const calculateCredits = useCalculateCreditRequirements();

  const handleCalculate = async () => {
    const result = await calculateCredits.mutateAsync({
      recipientCount: 100,
      giftCardDenomination: 25,
      mailCostPerPiece: 0.55,
    });

    console.log('Total cost:', result.grandTotal);
    console.log('Breakdown:', result.breakdown);
  };

  return (
    <button onClick={handleCalculate}>
      Calculate Credits
    </button>
  );
}
```

### Example 2: Validate Campaign Budget

**Before (No Validation):**
```typescript
// Budget checked client-side or not at all
const canAfford = clientBalance >= estimatedCost;
```

**After (Server-Side Validation):**
```typescript
import { useValidateCampaignBudget } from '@/hooks/useCampaignValidation';

function CampaignWizard() {
  const validateBudget = useValidateCampaignBudget();

  const handleLaunch = async () => {
    const result = await validateBudget.mutateAsync({
      campaignId: campaign.id,
      recipientCount: audience.length,
      giftCardDenomination: 25,
    });

    if (!result.valid) {
      alert(`Insufficient credits. Shortfall: $${result.shortfall}`);
      return;
    }

    // Proceed with launch
  };

  return (
    <button onClick={handleLaunch}>
      Launch Campaign
    </button>
  );
}
```

### Example 3: Real-Time Budget Check

**Before (Manual Check):**
```typescript
useEffect(() => {
  const cost = recipientCount * denomination;
  setCanAfford(balance >= cost);
}, [recipientCount, denomination, balance]);
```

**After (Automatic with Edge Function):**
```typescript
import { useCampaignBudgetCheck } from '@/hooks/useCampaignValidation';

function CampaignForm() {
  const [recipientCount, setRecipientCount] = useState(100);
  const [denomination, setDenomination] = useState(25);

  // Automatically validates as values change
  const { data: budgetCheck } = useCampaignBudgetCheck(
    campaignId,
    recipientCount,
    denomination,
    true // enabled
  );

  return (
    <div>
      <input
        type="number"
        value={recipientCount}
        onChange={(e) => setRecipientCount(Number(e.target.value))}
      />
      
      {budgetCheck && !budgetCheck.valid && (
        <Alert variant="destructive">
          Insufficient credits. Need ${budgetCheck.shortfall} more.
        </Alert>
      )}
    </div>
  );
}
```

### Example 4: Gift Card Configuration Validation

**New Feature:**
```typescript
import { useGiftCardAvailabilityCheck } from '@/hooks/useCampaignValidation';

function GiftCardSelector() {
  const [selectedBrand, setSelectedBrand] = useState<string>();
  const [denomination, setDenomination] = useState(25);

  // Real-time availability check
  const { data: availability } = useGiftCardAvailabilityCheck(
    campaignId,
    selectedBrand,
    denomination
  );

  return (
    <div>
      <Select value={selectedBrand} onValueChange={setSelectedBrand}>
        {/* Brand options */}
      </Select>

      {availability && (
        <div className="mt-2">
          {availability.valid ? (
            <Badge variant="success">
              {availability.inventoryStatus.message}
            </Badge>
          ) : (
            <Alert variant="warning">
              {availability.errors.join(', ')}
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
```

## Component-by-Component Migration

### 1. Campaign Wizard (`src/components/campaigns/CreateCampaignWizard.tsx`)

**Add:**
```typescript
import { useValidateCampaignBudget } from '@/hooks/useCampaignValidation';
import { useCalculateCreditRequirements } from '@/hooks/useCreditManagement.enhanced';

const validateBudget = useValidateCampaignBudget();
const calculateCredits = useCalculateCreditRequirements();
```

**Replace launch logic with:**
```typescript
const handleLaunch = async () => {
  // Validate budget before launching
  const validation = await validateBudget.mutateAsync({
    campaignId: campaign.id,
    recipientCount: recipients.length,
    giftCardDenomination: selectedDenomination,
  });

  if (!validation.valid) {
    toast.error(`Cannot launch: ${validation.error}`);
    return;
  }

  // Proceed with launch
  await launchCampaign();
};
```

### 2. Gift Card Selector (`src/components/gift-cards/SimpleBrandDenominationSelector.tsx`)

**Add real-time validation:**
```typescript
import { useGiftCardAvailabilityCheck } from '@/hooks/useCampaignValidation';

const { data: availability, isLoading } = useGiftCardAvailabilityCheck(
  campaignId,
  selectedBrandId,
  selectedDenomination,
  enabled
);

// Show availability status
{availability && (
  <div className="text-sm text-muted-foreground">
    {availability.inventoryStatus.message}
  </div>
)}
```

### 3. Credit Dashboard (`src/components/dashboard/ClientCreditDashboard.tsx`)

**Add credit calculator:**
```typescript
import { useCalculateCreditRequirements } from '@/hooks/useCreditManagement.enhanced';

const calculateCredits = useCalculateCreditRequirements();

const handleEstimate = async () => {
  const result = await calculateCredits.mutateAsync({
    recipientCount: estimatedRecipients,
    giftCardDenomination: avgDenomination,
  });

  setEstimatedCost(result.grandTotal);
};
```

## Testing Checklist

After migrating each component:

- [ ] Test happy path (valid inputs)
- [ ] Test error handling (insufficient credits)
- [ ] Test edge cases (zero recipients, etc.)
- [ ] Verify loading states work
- [ ] Check error messages display correctly
- [ ] Ensure toast notifications appear
- [ ] Test with real campaign data

## Rollback Plan

If issues arise:

1. **Keep old hooks** - Don't delete original files yet
2. **Feature flag** - Add toggle to switch between old/new
3. **Gradual rollout** - Start with low-traffic features

```typescript
// Example feature flag
const USE_NEW_API = import.meta.env.VITE_USE_NEW_API === 'true';

const validateBudget = USE_NEW_API 
  ? useValidateCampaignBudget() // New API
  : useOldBudgetValidation();    // Old direct call
```

## Performance Considerations

### Caching Strategy
New hooks use React Query caching:
- Budget validation: 10s stale time
- Gift card availability: 30s stale time, refetch every 60s
- Credit balance: 30s stale time

### Optimization Tips
1. **Debounce user input** before validation
2. **Enable/disable queries** based on form state
3. **Prefetch data** for common scenarios
4. **Use suspense** for better UX

## Common Issues & Solutions

### Issue: "Function returned error"
**Solution**: Check function logs in Supabase Dashboard

### Issue: Slow response times
**Solution**: Check if function is deployed and warm

### Issue: Validation failing unexpectedly
**Solution**: Verify campaign has required data (client_id, etc.)

### Issue: Real-time validation laggy
**Solution**: Increase stale time or add debouncing

## Next Steps

1. ✅ Deploy edge functions (if not done)
2. ⏳ Test new hooks in isolation
3. ⏳ Migrate one component at a time
4. ⏳ Monitor for errors in production
5. ⏳ Gather user feedback
6. ⏳ Remove old code when stable

## Support

- **Documentation**: See `API_FIRST_IMPLEMENTATION_COMPLETE.md`
- **Examples**: Check `src/hooks/useCampaignValidation.ts`
- **Edge Functions**: Review `supabase/functions/*/index.ts`

---

**Estimated Migration Time**: 2-4 hours  
**Risk Level**: Low (non-breaking changes)  
**Testing Required**: Yes (integration tests available)


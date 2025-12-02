# API Examples

## Overview

Practical code examples for common API integrations.

---

## JavaScript/TypeScript

```typescript
// Create campaign
const response = await fetch('https://api.mobulace.com/v1/campaigns', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.MOBUL_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Q1 2024 Campaign',
    client_id: 'client-id',
    contact_list_id: 'list-id',
  }),
});

const campaign = await response.json();
```

---

## Python

```python
import requests

response = requests.post(
    'https://api.mobulace.com/v1/campaigns',
    headers={'X-API-Key': 'your-api-key'},
    json={
        'name': 'Q1 2024 Campaign',
        'client_id': 'client-id',
        'contact_list_id': 'list-id',
    }
)

campaign = response.json()
```

---

## cURL

```bash
curl -X POST https://api.mobulace.com/v1/campaigns \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2024 Campaign",
    "client_id": "client-id",
    "contact_list_id": "list-id"
  }'
```

---

## Edge Function Examples

### React Hooks

**Validate Campaign Budget**:
```typescript
import { useValidateCampaignBudget } from '@/hooks/useCampaignValidation';

function CampaignWizard() {
  const validateBudget = useValidateCampaignBudget();

  const handleLaunch = async () => {
    const result = await validateBudget.mutateAsync({
      campaignId: campaign.id,
      recipientCount: 100,
      giftCardDenomination: 25,
    });

    if (!result.valid) {
      alert(`Insufficient credits. Shortfall: $${result.shortfall}`);
      return;
    }

    // Proceed with launch
    await launchCampaign();
  };

  return <button onClick={handleLaunch}>Launch Campaign</button>;
}
```

**Calculate Credit Requirements**:
```typescript
import { useCalculateCreditRequirements } from '@/hooks/useCreditManagement.enhanced';

function CreditCalculator() {
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

  return <button onClick={handleCalculate}>Calculate</button>;
}
```

**Real-Time Gift Card Validation**:
```typescript
import { useGiftCardAvailabilityCheck } from '@/hooks/useCampaignValidation';

function GiftCardSelector() {
  const [selectedBrand, setSelectedBrand] = useState<string>();
  const [denomination, setDenomination] = useState(25);

  // Automatically validates as values change
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

      {availability && !availability.valid && (
        <Alert variant="warning">
          {availability.errors.join(', ')}
        </Alert>
      )}
    </div>
  );
}
```

### Direct API Calls

**Call Edge Function from TypeScript**:
```typescript
import { supabase } from '@/integrations/supabase/client';

async function validateBudget(campaignId: string, recipientCount: number) {
  const { data, error } = await supabase.functions.invoke(
    'validate-campaign-budget',
    {
      body: {
        campaignId,
        recipientCount,
        giftCardDenomination: 25,
        mailCostPerPiece: 0.55,
      },
    }
  );

  if (error) throw error;
  return data.data;
}
```

**Call from Node.js**:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function provisionCard() {
  const { data, error } = await supabase.functions.invoke(
    'provision-gift-card-unified',
    {
      body: {
        campaignId: 'uuid',
        recipientId: 'uuid',
        brandId: 'uuid',
        denomination: 25,
        conditionNumber: 1,
      },
    }
  );

  if (error) throw error;
  return data;
}
```

### cURL Examples

**Validate Campaign Budget**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "uuid",
    "recipientCount": 100,
    "giftCardDenomination": 25,
    "mailCostPerPiece": 0.55
  }' \
  https://your-project.supabase.co/functions/v1/validate-campaign-budget
```

**Calculate Credits**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientCount": 100,
    "giftCardDenomination": 25
  }' \
  https://your-project.supabase.co/functions/v1/calculate-credit-requirements
```

**Simulate Mail Tracking**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "uuid",
    "deliveryRate": 85,
    "returnRate": 5
  }' \
  https://your-project.supabase.co/functions/v1/simulate-mail-tracking
```

### Python Examples

**Using Supabase Python Client**:
```python
from supabase import create_client, Client

supabase: Client = create_client(
    supabase_url,
    supabase_key
)

# Validate campaign budget
response = supabase.functions.invoke(
    'validate-campaign-budget',
    body={
        'campaignId': 'uuid',
        'recipientCount': 100,
        'giftCardDenomination': 25
    }
)

data = response.json()
if data['success']:
    print(f"Budget valid: {data['data']['valid']}")
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Campaign Validation', () => {
  it('should validate budget successfully', async () => {
    const { data, error } = await supabase.functions.invoke(
      'validate-campaign-budget',
      {
        body: {
          campaignId: testCampaignId,
          recipientCount: 10,
          giftCardDenomination: 25,
        },
      }
    );

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('valid');
    expect(data.data).toHaveProperty('estimatedCost');
  });
});
```

---

## Related Documentation

- [Edge Functions API](./EDGE_FUNCTIONS.md)
- [Authentication](./AUTHENTICATION.md)
- [REST API](./REST_API.md)
- [Frontend Migration Guide](../7-IMPLEMENTATION/FRONTEND_MIGRATION_GUIDE.md)

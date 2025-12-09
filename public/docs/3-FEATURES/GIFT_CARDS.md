# Gift Card Management

## Overview

The gift card system automates reward provisioning with a modern brand-denomination marketplace. It features unified provisioning (inventory + Tillo API), comprehensive billing tracking, and hierarchical configuration for agencies and clients.

---

## New Architecture (December 2024)

### Brand-Denomination Marketplace

The platform now uses a simplified brand-denomination model:

**Key Components:**
- **Gift Card Brands** - Catalog of available brands (Amazon, Visa, etc.)
- **Denominations** - Available values per brand ($10, $25, $50, etc.)
- **Inventory** - Uploaded gift card codes (CSV bulk upload)
- **Tillo Integration** - Automatic fallback to Tillo API when inventory depleted

### Unified Provisioning

Intelligent provisioning with automatic fallback:

```
1. Check Inventory → If available, claim card
2. If no inventory → Purchase from Tillo API
3. Record billing transaction
4. Return card details
```

**Edge Function**: `provision-gift-card-unified`

```typescript
const { data } = await supabase.functions.invoke(
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
```

### Hierarchical Configuration

**Admin Level:**
- Enable/disable brands globally
- Configure denominations per brand
- Upload bulk inventory (CSV)
- View platform-wide analytics

**Agency Level:**
- Select which brands to offer clients
- Set markup percentages
- Configure custom pricing

**Client Level:**
- Choose from agency-approved brands
- Select denominations for campaigns
- View spending and billing

### Billing & Tracking

Complete transaction ledger:
- **Source Tracking** - Inventory vs Tillo API
- **Cost Basis** - Admin cost per card
- **Profit Calculation** - Automatic margin tracking
- **Billing Entity** - Client or agency billed
- **Immutable Ledger** - All transactions recorded

---

## Gift Card Brands

### Supported Brands

The platform supports digital and physical gift cards from major brands:

**Top Brands:**
- Amazon
- Visa
- Mastercard
- Apple
- Target
- Starbucks
- Walmart
- Home Depot
- Lowe's
- Best Buy

### Brand Configuration

Each brand has specific attributes:

```typescript
interface GiftCardBrand {
  id: string;
  name: string;
  logo_url: string;
  card_format: 'digital' | 'physical';
  code_format: string; // Regex pattern
  expiration_policy: string;
  redemption_url: string;
  terms_url: string;
}
```

**Code Formats:**
- **Amazon:** `AMZN-XXXX-XXXX-XXXX` (alphanumeric)
- **Visa:** `4XXX-XXXX-XXXX-XXXX` with CVV/exp
- **Retail:** `XXXX-XXXX-XXXX` (numeric)

---

## Gift Card Pools

### Pool Structure

Pools organize gift card inventory by:
- **Client** - Client-specific inventory
- **Brand** - Single brand per pool
- **Denomination** - Card value ($10, $25, $50, etc.)
- **Campaign** - Optional campaign-specific pools

### Pool Types

**Master Pools**
- Owned by admin/internal org
- Source inventory for client pools
- Used for card sales to clients

**Client Pools**
- Assigned to specific clients
- Purchased or allocated from master pools
- Used for campaign rewards

### Creating Pools

```typescript
const { data: pool } = await supabase
  .from('gift_card_pools')
  .insert({
    client_id: clientId,
    brand_id: brandId,
    pool_name: 'Q1 2024 Amazon $25',
    denomination: 25.00,
    currency: 'USD',
    pool_type: 'client',
    cost_per_card: 23.50, // Wholesale cost
    total_cards: 1000,
    available_cards: 1000,
  })
  .select()
  .single();
```

---

## Gift Card Codes

### Code Management

**Code Upload:**
```typescript
// Bulk upload from CSV
const codes = [
  { code: 'AMZN-1234-5678-90AB', pin: null },
  { code: 'AMZN-2345-6789-01BC', pin: null },
  // ... up to 10,000 per batch
];

const { data: cards } = await supabase
  .from('gift_cards')
  .insert(codes.map(c => ({
    pool_id: poolId,
    code: c.code,
    pin: c.pin,
    status: 'available',
  })))
  .select();
```

**Code Validation:**
- Format validation against brand regex
- Duplicate detection within pool
- Expiration date validation

### Code Status Lifecycle

```
available → claimed → delivered → redeemed
     ↓         ↓          ↓
  expired   stuck    cancelled
```

**Status Definitions:**
- `available` - In pool, ready for assignment
- `claimed` - Assigned to recipient, pending delivery
- `delivered` - SMS/email sent, awaiting redemption
- `redeemed` - Recipient confirmed use
- `expired` - Past expiration date
- `stuck` - Claimed >10 min without delivery (auto-cleanup)
- `cancelled` - Manually returned to pool

---

## Redemption Workflows

### Call Center Redemption

Standard workflow for phone-based reward delivery:

1. **Call Session Created**
   - Caller reaches call center
   - Agent answers call
   - System attempts to match caller phone to recipient

2. **Confirm Recipient**
   ```typescript
   // Agent enters confirmation code
   const { data: recipient } = await supabase
     .from('recipients')
     .select('*, campaign:campaigns(*)')
     .eq('redemption_token', confirmationCode)
     .single();
   
   if (!recipient) {
     throw new Error('Invalid confirmation code');
   }
   ```

3. **Select Delivery Method**
   - Agent asks recipient preference
   - Phone (SMS) or Email
   - Agent collects contact info if not in database

4. **Select Condition**
   - Agent reviews campaign conditions
   - Selects which condition recipient completed
   - System validates condition eligibility

5. **Claim Gift Card**
   ```typescript
   // Claim card from pool
   const { data: giftCard } = await supabase
     .from('gift_cards')
     .update({
       status: 'claimed',
       recipient_id: recipient.id,
       claimed_at: new Date(),
     })
     .eq('pool_id', config.gift_card_pool_id)
     .eq('status', 'available')
     .limit(1)
     .select()
     .single();
   
   if (!giftCard) {
     throw new Error('No gift cards available');
   }
   ```

6. **Deliver Gift Card**
   ```typescript
   // Send SMS
   await sendSMS(recipient.phone, 
     `Your $${giftCard.denomination} ${brand.name} gift card: ${giftCard.code}`
   );
   
   // Update status
   await supabase
     .from('gift_cards')
     .update({
       status: 'delivered',
       delivered_at: new Date(),
       delivery_method: 'sms',
     })
     .eq('id', giftCard.id);
   ```

7. **Log Condition Met**
   ```typescript
   await supabase
     .from('call_conditions_met')
     .insert({
       call_session_id: callSession.id,
       campaign_id: campaign.id,
       recipient_id: recipient.id,
       condition_number: selectedCondition,
       gift_card_id: giftCard.id,
       met_by_agent_id: agentUserId,
     });
   ```

### Automated Redemption

For CRM-triggered rewards:

1. **CRM Event Received**
   ```typescript
   // Webhook from CRM
   const crmEvent = {
     event_type: 'appointment_scheduled',
     contact_id: 'crm-123',
     campaign_id: 'camp-456',
   };
   ```

2. **Match to Recipient**
   ```typescript
   const { data: recipient } = await supabase
     .from('recipients')
     .select('*')
     .eq('campaign_id', crmEvent.campaign_id)
     .eq('external_crm_id', crmEvent.contact_id)
     .single();
   ```

3. **Evaluate Condition**
   ```typescript
   const { data: condition } = await supabase
     .from('campaign_conditions')
     .select('*')
     .eq('campaign_id', crmEvent.campaign_id)
     .eq('crm_event_name', crmEvent.event_type)
     .single();
   ```

4. **Auto-Provision Gift Card**
   ```typescript
   await provisionGiftCard(
     crmEvent.campaign_id,
     condition.condition_number,
     recipient.id
   );
   ```

### Self-Service Redemption (ACE Forms)

Direct redemption via web form:

1. **Recipient Submits Form**
   - Enters redemption code
   - Provides contact info
   - Selects delivery method

2. **Code Validation**
   ```typescript
   const { data: recipient } = await supabase
     .from('recipients')
     .select('*, campaign:campaigns(*)')
     .eq('redemption_token', code)
     .single();
   
   if (!recipient) {
     return { error: 'Invalid code' };
   }
   
   // Check if already redeemed
   const { data: existing } = await supabase
     .from('gift_cards')
     .select('*')
     .eq('recipient_id', recipient.id)
     .maybeSingle();
   
   if (existing) {
     return { error: 'Code already used' };
   }
   ```

3. **Auto-Provision & Deliver**
   - Claim gift card from pool
   - Send via SMS or email
   - Display code in browser

---

## SMS Delivery

### SMS Templates

Campaign-specific message templates with merge tags:

```
Hi {{first_name}}, thanks for scheduling your appointment! 

Here's your ${{amount}} {{brand}} gift card: {{code}}

Redeem at: {{redemption_url}}

Questions? Reply HELP
```

**Merge Tags:**
- `{{first_name}}`, `{{last_name}}` - Recipient name
- `{{amount}}` - Card denomination
- `{{brand}}` - Brand name
- `{{code}}` - Gift card code
- `{{pin}}` - PIN (if applicable)
- `{{redemption_url}}` - Brand redemption URL
- `{{expiration_date}}` - Expiration date

### SMS Retry Logic

Automatic retry with exponential backoff:

```typescript
async function sendSMSWithRetry(
  phone: string,
  message: string,
  giftCardId: string,
  maxRetries: number = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await twilioClient.messages.create({
        to: phone,
        from: TWILIO_PHONE_NUMBER,
        body: message,
      });
      
      // Log delivery
      await supabase.from('sms_delivery_log').insert({
        gift_card_id: giftCardId,
        phone_number: phone,
        message_sid: result.sid,
        status: 'sent',
        attempt_number: attempt + 1,
      });
      
      return { success: true };
    } catch (error) {
      // Log failure
      await supabase.from('sms_delivery_log').insert({
        gift_card_id: giftCardId,
        phone_number: phone,
        status: 'failed',
        attempt_number: attempt + 1,
        error_message: error.message,
      });
      
      if (attempt < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return { success: false };
}
```

---

## Pool Management

### Inventory Monitoring

Real-time tracking of pool status:

```typescript
const { data: pool } = await supabase
  .from('gift_card_pools')
  .select('total_cards, available_cards, claimed_cards, delivered_cards')
  .eq('id', poolId)
  .single();

const utilization = {
  available: pool.available_cards,
  claimed: pool.claimed_cards,
  delivered: pool.delivered_cards,
  percentage: (pool.available_cards / pool.total_cards) * 100,
};
```

### Low Inventory Alerts

Automated alerts when pools run low:

```sql
-- Trigger when pool drops below threshold
CREATE OR REPLACE FUNCTION check_pool_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.available_cards < (NEW.total_cards * 0.10) THEN
    INSERT INTO system_alerts (
      alert_type,
      severity,
      message,
      metadata
    ) VALUES (
      'low_gift_card_inventory',
      'warning',
      'Gift card pool ' || NEW.pool_name || ' is below 10% capacity',
      jsonb_build_object('pool_id', NEW.id, 'available', NEW.available_cards)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pool_inventory_check
  AFTER UPDATE OF available_cards ON gift_card_pools
  FOR EACH ROW
  EXECUTE FUNCTION check_pool_inventory();
```

### Pool Exhaustion Handling

When a pool runs out:

```typescript
try {
  const giftCard = await claimGiftCard(poolId);
} catch (error) {
  if (error.message === 'No cards available') {
    // Send alert to admin
    await sendAlert({
      type: 'pool_exhausted',
      poolId: poolId,
      severity: 'critical',
    });
    
    // Notify recipient of delay
    await sendSMS(recipient.phone,
      'We're processing your reward. You'll receive your gift card within 24 hours.'
    );
    
    // Queue for manual provisioning
    await supabase.from('pending_rewards').insert({
      recipient_id: recipient.id,
      pool_id: poolId,
      status: 'awaiting_inventory',
    });
  }
}
```

---

## Card Sales & Purchasing

### Selling Cards to Clients

Admin functionality for card inventory sales:

```typescript
async function sellCardsToClient(
  masterPoolId: string,
  buyerClientId: string,
  quantity: number,
  pricePerCard: number
) {
  // Create buyer pool
  const { data: buyerPool } = await supabase
    .from('gift_card_pools')
    .insert({
      client_id: buyerClientId,
      brand_id: masterPool.brand_id,
      pool_name: `${client.name} - ${brand.name}`,
      denomination: masterPool.denomination,
      cost_per_card: pricePerCard,
      total_cards: quantity,
      available_cards: quantity,
    })
    .select()
    .single();
  
  // Transfer cards
  await supabase
    .from('gift_cards')
    .update({ pool_id: buyerPool.id })
    .eq('pool_id', masterPoolId)
    .eq('status', 'available')
    .limit(quantity);
  
  // Log sale
  await supabase.from('admin_card_sales').insert({
    master_pool_id: masterPoolId,
    buyer_client_id: buyerClientId,
    buyer_pool_id: buyerPool.id,
    quantity: quantity,
    price_per_card: pricePerCard,
    total_amount: quantity * pricePerCard,
  });
  
  // Update pool counts
  await updatePoolInventory(masterPoolId);
  await updatePoolInventory(buyerPool.id);
}
```

---

## Reporting & Analytics

### Pool Performance

- **Utilization Rate** - Cards delivered / total cards
- **Delivery Success Rate** - Successful deliveries / attempts
- **Average Time to Delivery** - Claimed → delivered duration
- **Cost per Redemption** - Total cost / cards delivered

### Redemption Analytics

- **Brand Performance** - Redemption rates by brand
- **Delivery Method** - SMS vs email effectiveness
- **Geographic Distribution** - Redemptions by location
- **Campaign Comparison** - Pool performance across campaigns

---

## Best Practices

1. **Monitor inventory** - Set alerts at 20% and 10% thresholds
2. **Pre-load pools** - Upload codes before campaign launch
3. **Test redemption** - Use test codes to verify workflow
4. **Validate codes** - Check format and duplicates on upload
5. **Track costs** - Record wholesale costs for ROI calculation
6. **Clean up stuck cards** - Auto-release after 10 minutes
7. **Use SMS retry** - Enable automatic retry for failed deliveries
8. **Archive old pools** - Remove exhausted pools from active view

---

## Troubleshooting Common Issues

### Error: "400 Bad Request" from provision-gift-card-for-call-center

This error typically indicates a configuration or inventory issue.

**Diagnostic Steps:**

1. **Check Campaign Configuration:**
   ```sql
   SELECT 
     c.campaign_name,
     cc.condition_name,
     cc.brand_id,
     cc.card_value,
     gb.brand_name
   FROM campaigns c
   LEFT JOIN campaign_conditions cc ON cc.campaign_id = c.id
   LEFT JOIN gift_card_brands gb ON gb.id = cc.brand_id
   WHERE c.id = 'YOUR_CAMPAIGN_ID';
   ```
   
   **Expected:** Condition has `brand_id` (not NULL) and `card_value` > 0

2. **Check Gift Card Inventory:**
   ```sql
   SELECT 
     brand_id,
     denomination,
     COUNT(*) FILTER (WHERE status = 'available') as available,
     COUNT(*) as total
   FROM gift_card_inventory
   GROUP BY brand_id, denomination;
   ```
   
   **Expected:** At least one available card matching campaign configuration

**Common Fixes:**

- **No Gift Card Configured**: Edit campaign → Conditions tab → Set brand and value
- **No Inventory**: Upload CSV cards OR configure Tillo API credentials
- **Verification Required**: Customer must complete SMS opt-in first

### Error Code Reference

| Code | Description | Solution |
|------|-------------|----------|
| GC-001 | Missing brand_id/card_value | Edit campaign condition settings |
| GC-002 | Brand not found | Check brand exists and is enabled |
| GC-003 | No inventory available | Upload cards or configure Tillo |
| GC-004 | Tillo API not configured | Add Tillo credentials to Supabase |
| GC-005 | Tillo API call failed | Check Tillo account status |
| GC-006 | Insufficient credits | Allocate more credits to account |
| GC-007 | Billing transaction failed | Check database connection |
| GC-008 | Campaign billing not configured | Set up billing entity |
| GC-009 | Verification required | Complete SMS opt-in or skip verification |
| GC-010 | Already provisioned | Customer already received gift card |
| GC-011 | Invalid redemption code | Verify code exists in system |
| GC-012 | Missing parameters | Check API request format |
| GC-013 | Database function error | Check migration status |
| GC-014 | Delivery notification failed | Check SMS/email configuration |
| GC-015 | Unknown error | Check function logs for details |

### Provisioning Trace Logging

To debug provisioning issues, check the trace logs:

```sql
-- Recent provisioning attempts
SELECT * FROM gift_card_provisioning_trace
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Failed attempts with error details
SELECT 
  request_id,
  step_name,
  error_code,
  error_message,
  created_at
FROM gift_card_provisioning_trace
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Environment Variables Quick Reference

**Required for SMS (Twilio):**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

**Optional for Gift Card API (Tillo):**
- `TILLO_API_KEY`
- `TILLO_SECRET_KEY`

**Optional for Support Info:**
- `COMPANY_NAME`
- `SUPPORT_PHONE_NUMBER`
- `SUPPORT_EMAIL`

### Monitoring & Logs

**View Real-Time Logs:**
```bash
# Gift Card Provisioning
supabase functions logs provision-gift-card-for-call-center --tail
supabase functions logs provision-gift-card-unified --tail

# SMS Delivery
supabase functions logs send-gift-card-sms --tail
supabase functions logs send-sms-opt-in --tail
```

**Success Indicators:**
- `[PROVISION] Success`
- `[TWILIO] SMS sent successfully, SID: SMxxxxxx`
- No error codes in logs

**Error Indicators:**
- `No gift card configured`
- `No available gift cards in pool`
- `Tillo API error`
- `SMS service not configured`

---

## Related Documentation

- [Campaigns](/docs/features/campaigns)
- [Call Center Guide](/docs/user-guides/call-center-guide)
- [Redemption Workflows](/docs/features/campaign-lifecycle)
- [SMS Delivery](/docs/developer-guide/edge-functions)
- [Troubleshooting Guide](/docs/troubleshooting/troubleshooting-gift-cards)

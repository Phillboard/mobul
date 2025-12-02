# Gift Card Purchase Guide for Mike Demo

This guide walks through purchasing and setting up a real gift card for Mike's demonstration.

## Option 1: Purchase Digital Gift Cards (Recommended for Demo)

### Starbucks Digital Gift Card ($5-25)

**Where to Buy:**
- **Starbucks.com** (Instant delivery)
- **Amazon.com** (Email delivery)
- **Target.com** (Digital delivery)
- **Raise.com** (Discounted cards)

**Steps:**
1. Go to https://www.starbucks.com/gift
2. Select "eGift" option
3. Choose amount: **$10** or **$25** (Mike demo amount)
4. Send to your own email
5. Receive card within minutes
6. Extract card number and PIN

**What You'll Get:**
- 19-digit card number
- 8-digit security code (CSC)
- Can be added to Starbucks app or mobile wallet
- Never expires

### Jimmy John's Gift Card ($10-25)

**Where to Buy:**
- **JimmyJohns.com** - Not available for digital purchase (physical only)
- **GiftCards.com** - Digital delivery available
- **CardCash.com** - Reseller option

**Alternative:** Use Starbucks or Amazon for demo since they have better wallet integration

### Amazon Digital Gift Card ($5-25)

**Where to Buy:**
- **Amazon.com/gc** (Instant delivery)

**Steps:**
1. Go to https://www.amazon.com/gift-cards
2. Select "Email" delivery
3. Choose amount: **$10** recommended
4. Enter your email as recipient
5. Checkout and receive immediately
6. Get claim code

**Pros:**
- Instant delivery (seconds)
- Everyone knows Amazon
- Easy to demonstrate value
- Works great in mobile wallets

## Option 2: Buy from Gift Card Aggregator

### Tillo (Our Integration Partner)

**If you have Tillo API access:**

```bash
# Use the provision-gift-card-unified edge function
curl -X POST 'https://your-project.supabase.co/functions/v1/provision-gift-card-unified' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "brandId": "starbucks-brand-id",
    "value": 25.00,
    "recipientId": "test-recipient-id",
    "campaignId": "test-campaign-id",
    "source": "manual_purchase"
  }'
```

**This will:**
- Purchase card via Tillo API
- Add to database automatically
- Make available for assignment
- Track in credit system

### Cost:
- **Starbucks $25:** ~$27 (face value + fees)
- **Amazon $25:** ~$26.50
- **Minimum purchase:** Check Tillo account minimum

## Option 3: Use Test/Demo Card

### For System Testing (Not Real Money)

```sql
-- Insert a realistic-looking test card
INSERT INTO gift_cards (
  pool_id,
  card_code,
  card_number,
  card_value,
  pin,
  status,
  expiration_date,
  provider,
  created_at
) VALUES (
  (SELECT id FROM gift_card_pools 
   WHERE brand_id = (SELECT id FROM gift_card_brands WHERE brand_name = 'Starbucks')
   AND card_value = 25.00 
   LIMIT 1),
  'DEMO-SBUX-2024',
  '6109687942134567',  -- Fake but realistic number
  25.00,
  '12345678',          -- Fake PIN
  'available',
  NOW() + INTERVAL '1 year',
  'test',
  NOW()
);
```

**Important:** This won't work for actual redemption at Starbucks, but demonstrates the system flow.

## Recommended Approach for Mike Demo

### Purchase TWO Cards

1. **$10 Starbucks** - Primary demo card
   - Easy to understand value
   - Quick to purchase
   - Low cost risk
   - Universal appeal

2. **$10 Amazon** - Backup card
   - In case Starbucks wallet integration has issues
   - Shows system works with multiple brands
   - Amazon wallet integration very reliable

### Total Cost: ~$22 (including processing fees)

## Adding Purchased Card to System

### Method 1: Via Database (Quick)

```sql
-- First, get the Starbucks pool ID
SELECT id, card_value FROM gift_card_pools 
WHERE brand_id = (SELECT id FROM gift_card_brands WHERE brand_name = 'Starbucks')
ORDER BY card_value;

-- Insert the real card you purchased
INSERT INTO gift_cards (
  pool_id,
  card_code,
  card_number,
  card_value,
  pin,
  status,
  provider,
  created_at,
  metadata
) VALUES (
  'pool-id-from-above',
  'REAL-CARD-CODE',      -- Use actual code from purchase
  '6109xxxxxxxxxx',       -- Use actual 16-19 digit card number
  10.00,                  -- Match your purchase amount
  '12345678',             -- Actual PIN/CSC if provided
  'available',
  'starbucks',
  NOW(),
  jsonb_build_object(
    'purchase_date', NOW(),
    'purchase_source', 'starbucks.com',
    'notes', 'Purchased for Mike demo'
  )
);
```

### Method 2: Via UI (If Implemented)

1. Navigate to **Gift Cards** → **Add Card Manually**
2. Select brand: Starbucks
3. Enter card number
4. Enter PIN/security code
5. Select pool or create new pool
6. Mark as "available"
7. Save

### Method 3: Via CSV Import

Create file `mike-demo-real-card.csv`:

```csv
card_code,card_number,pin,card_value,brand,status
SBUX-MIKE-001,6109687942134567,12345678,10.00,Starbucks,available
```

Then import via edge function:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/import-gift-cards' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  --data-binary @mike-demo-real-card.csv
```

## Verification Before Demo

### 1. Confirm Card Is in Database

```sql
SELECT 
  gc.id,
  gc.card_code,
  gc.card_number,
  gc.card_value,
  gc.status,
  gb.brand_name,
  gp.pool_name
FROM gift_cards gc
JOIN gift_card_pools gp ON gc.pool_id = gp.id
JOIN gift_card_brands gb ON gp.brand_id = gb.id
WHERE gc.card_code = 'YOUR-CARD-CODE'
  AND gc.status = 'available';
```

Expected: 1 row returned, status = 'available'

### 2. Test Card Can Be Claimed

```sql
-- Simulate claim (without actually claiming)
SELECT * FROM gift_cards 
WHERE pool_id IN (
  SELECT id FROM gift_card_pools 
  WHERE brand_id = (SELECT id FROM gift_card_brands WHERE brand_name = 'Starbucks')
    AND card_value = 10.00
)
AND status = 'available'
LIMIT 1;
```

### 3. Verify Wallet Integration

**For Starbucks:**
- Card number should be 16-19 digits
- Need 8-digit PIN/CSC for Starbucks app
- QR code generation will work automatically
- Google/Apple Wallet pass will include barcode

**Test:**
1. Use test redemption flow
2. Verify card details display correctly
3. Check QR code generates
4. Attempt to add to wallet (don't complete if preserving for demo)

## During Demo - Card Tracking

### Track the Demo Card Usage

```sql
-- See when Mike's test code claims the card
SELECT 
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.approval_status,
  gc.card_code,
  gc.card_number,
  rgc.assigned_at
FROM recipients r
JOIN recipient_gift_cards rgc ON rgc.recipient_id = r.id
JOIN gift_cards gc ON gc.id = rgc.gift_card_id
WHERE r.redemption_code = 'MIKE0001';
```

### After Demo - Card Status

```sql
-- Check final status
SELECT 
  gc.status,
  gc.card_code,
  gc.assigned_at,
  r.redemption_code
FROM gift_cards gc
LEFT JOIN recipient_gift_cards rgc ON rgc.gift_card_id = gc.id
LEFT JOIN recipients r ON r.id = rgc.recipient_id
WHERE gc.card_code = 'YOUR-DEMO-CARD-CODE';
```

## Post-Demo Options

### Option A: Keep Card Active
- Leave in system for future demos
- Mark as "demo card" in metadata
- Reset recipient assignment if needed

### Option B: Redeem Yourself
- You now have a real $10-25 gift card
- Use the card number and PIN
- Enjoy your coffee/sandwich!

### Option C: Return to Inventory

```sql
-- Reset card to available if you want to reuse in another demo
UPDATE gift_cards 
SET status = 'available'
WHERE card_code = 'YOUR-DEMO-CARD-CODE';

-- Clear recipient assignment
DELETE FROM recipient_gift_cards 
WHERE gift_card_id = (
  SELECT id FROM gift_cards WHERE card_code = 'YOUR-DEMO-CARD-CODE'
);

-- Reset recipient
UPDATE recipients 
SET 
  approval_status = 'pending',
  gift_card_assigned_id = NULL,
  redemption_completed_at = NULL
WHERE redemption_code = 'MIKE0001';
```

## Budget Considerations

### Minimum Investment for Mike Demo

**Option 1: Real Money (Recommended)**
- Cost: $22-30 total
- Items: 2x $10 gift cards (Starbucks + Amazon)
- Benefit: Mike sees real, functional cards
- Risk: Low - you can use cards yourself after

**Option 2: Test Data Only**
- Cost: $0
- Items: Test codes with fake card numbers
- Benefit: No money spent
- Risk: Medium - wallet integration won't fully work

**Option 3: Mixed Approach**
- Cost: $12
- Items: 1x $10 real card + test data
- Benefit: Shows wallet integration, backup options
- Risk: Low - best balance of cost/demo quality

### Recommendation

**Buy 1x $10 Starbucks card from Starbucks.com**

**Reasoning:**
- $10 is low-risk investment
- Starbucks has best wallet integration
- Universal brand everyone recognizes
- Instant digital delivery
- You get coffee after if demo fails
- Mike sees complete end-to-end flow working

## Quick Purchase Checklist

**15 Minutes Before Demo:**
- [ ] Go to Starbucks.com/gift
- [ ] Purchase $10 eGift to yourself
- [ ] Check email for card details
- [ ] Copy card number (16-19 digits)
- [ ] Copy PIN (8 digits)
- [ ] Insert into database using SQL above
- [ ] Verify card shows as "available"
- [ ] Test that gift card pool has the card
- [ ] Ready for demo!

## Emergency Backup Plan

**If gift card purchase fails or time is short:**

Use the built-in test code: `12345678ABCD`

This returns a mock Jimmy John's gift card:
- Always works in development
- Shows complete UI
- Demonstrates wallet integration
- Just won't work for actual redemption

**In redeem-customer-code edge function:**

```typescript
if (isDevelopment && normalizedCode === '12345678ABCD') {
  return {
    success: true,
    giftCard: {
      card_code: '1234-5678-ABCD',
      card_number: 'JJ-TEST-9876-5432',
      card_value: 25.00,
      brand_name: "Jimmy John's",
      // ... complete mock data
    }
  };
}
```

## Summary

**Best Practice for Mike Demo:**
1. Purchase $10 Starbucks eGift (10 minutes)
2. Add to database (2 minutes)
3. Verify it's available (1 minute)
4. Run through test flow once (5 minutes)
5. Ready for Mike (18 minutes total)

**Total Investment:** ~$12 (card + fees)
**Return:** Successful demo of working system
**Bonus:** Free coffee for you after demo! ☕


# Mike Demo Test Campaign Setup

This document provides the complete setup process and test data for demonstrating the system to Mike.

## Test Campaign Configuration

### Campaign Details
- **Name:** Mike Demo - AutoCare Plus Warranty
- **Type:** Direct Mail with Call Center Redemption
- **Gift Card:** $25 Starbucks (or Jimmy John's)
- **Test Codes:** 10 sample codes for demonstration
- **Mail Date:** Today (for immediate testing)

## Step 1: Create Test Codes CSV

Create a file `test-codes-mike-demo.csv` with the following content:

```csv
redemption_code,first_name,last_name,email,phone,company,address1,city,state,zip
MIKE0001,John,Smith,john.smith@test.com,5551234567,AutoCare Plus,123 Main St,Los Angeles,CA,90210
MIKE0002,Sarah,Johnson,sarah.j@test.com,5552345678,Premium Motors,456 Oak Ave,San Diego,CA,92101
MIKE0003,Michael,Williams,mwilliams@test.com,5553456789,Elite Auto,789 Pine Rd,San Francisco,CA,94102
MIKE0004,Emily,Brown,ebrown@test.com,5554567890,Quality Cars,321 Elm St,Sacramento,CA,95814
MIKE0005,David,Jones,djones@test.com,5555678901,Best Auto,654 Maple Dr,Fresno,CA,93650
MIKE0006,Lisa,Garcia,lgarcia@test.com,5556789012,Top Motors,987 Cedar Ln,Long Beach,CA,90802
MIKE0007,Robert,Martinez,rmartinez@test.com,5557890123,Prime Auto,147 Birch Way,Oakland,CA,94601
MIKE0008,Jennifer,Rodriguez,jrodriguez@test.com,5558901234,Superior Cars,258 Spruce St,Bakersfield,CA,93301
MIKE0009,William,Hernandez,whernandez@test.com,5559012345,Excellent Auto,369 Willow Ct,Anaheim,CA,92801
MIKE0010,Michelle,Lopez,mlopez@test.com,5550123456,Premier Motors,741 Ash Blvd,Riverside,CA,92501
```

## Step 2: Import Test Codes to Database

### Option A: Via SQL (Fastest for Demo)

```sql
-- First, create a test audience
INSERT INTO audiences (client_id, name, size, created_at)
VALUES (
  'your-client-id-here',
  'Mike Demo Audience',
  10,
  NOW()
) RETURNING id;

-- Note the returned audience_id, then insert recipients:
INSERT INTO recipients (
  audience_id,
  redemption_code,
  first_name,
  last_name,
  email,
  phone,
  company,
  address1,
  city,
  state,
  zip,
  approval_status,
  sms_opt_in_status,
  created_at
) VALUES
('audience-id-from-above', 'MIKE0001', 'John', 'Smith', 'john.smith@test.com', '+15551234567', 'AutoCare Plus', '123 Main St', 'Los Angeles', 'CA', '90210', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0002', 'Sarah', 'Johnson', 'sarah.j@test.com', '+15552345678', 'Premium Motors', '456 Oak Ave', 'San Diego', 'CA', '92101', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0003', 'Michael', 'Williams', 'mwilliams@test.com', '+15553456789', 'Elite Auto', '789 Pine Rd', 'San Francisco', 'CA', '94102', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0004', 'Emily', 'Brown', 'ebrown@test.com', '+15554567890', 'Quality Cars', '321 Elm St', 'Sacramento', 'CA', '95814', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0005', 'David', 'Jones', 'djones@test.com', '+15555678901', 'Best Auto', '654 Maple Dr', 'Fresno', 'CA', '93650', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0006', 'Lisa', 'Garcia', 'lgarcia@test.com', '+15556789012', 'Top Motors', '987 Cedar Ln', 'Long Beach', 'CA', '90802', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0007', 'Robert', 'Martinez', 'rmartinez@test.com', '+15557890123', 'Prime Auto', '147 Birch Way', 'Oakland', 'CA', '94601', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0008', 'Jennifer', 'Rodriguez', 'jrodriguez@test.com', '+15558901234', 'Superior Cars', '258 Spruce St', 'Bakersfield', 'CA', '93301', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0009', 'William', 'Hernandez', 'whernandez@test.com', '+15559012345', 'Excellent Auto', '369 Willow Ct', 'Anaheim', 'CA', '92801', 'pending', 'not_sent', NOW()),
('audience-id-from-above', 'MIKE0010', 'Michelle', 'Lopez', 'mlopez@test.com', '+15550123456', 'Premier Motors', '741 Ash Blvd', 'Riverside', 'CA', '92501', 'pending', 'not_sent', NOW());
```

### Option B: Via UI (More Demo-Friendly)

1. Navigate to **Contacts** → **Import Contacts**
2. Upload `test-codes-mike-demo.csv`
3. Map fields correctly
4. Create audience named "Mike Demo Audience"

### Option C: Via Edge Function

```bash
# Use the import-customer-codes edge function
curl -X POST 'https://your-project.supabase.co/functions/v1/import-customer-codes' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "audienceId": "your-audience-id",
    "codes": [
      {
        "redemption_code": "MIKE0001",
        "first_name": "John",
        "last_name": "Smith",
        ...
      }
    ]
  }'
```

## Step 3: Create Test Campaign

```sql
-- Create campaign
INSERT INTO campaigns (
  client_id,
  audience_id,
  name,
  status,
  mail_date,
  size,
  mailing_method,
  created_at
) VALUES (
  'your-client-id',
  'audience-id-from-step-2',
  'Mike Demo - AutoCare Plus Warranty',
  'active',
  CURRENT_DATE,
  '6x9',
  'customer_handled',
  NOW()
) RETURNING id;

-- Create gift card reward condition
INSERT INTO campaign_conditions (
  campaign_id,
  condition_name,
  trigger_type,
  brand_id,
  card_value,
  created_at
) VALUES (
  'campaign-id-from-above',
  'Sales Call Completion',
  'manual_approval',
  'starbucks-brand-id', -- Or jimmy-johns-brand-id
  25.00,
  NOW()
);
```

## Step 4: Setup Test Gift Card Inventory

Ensure you have gift cards available:

```sql
-- Check available inventory
SELECT 
  gb.brand_name,
  gp.card_value,
  COUNT(*) as available_cards
FROM gift_cards gc
JOIN gift_card_pools gp ON gc.pool_id = gp.id
JOIN gift_card_brands gb ON gp.brand_id = gb.id
WHERE gc.status = 'available'
  AND gb.brand_name IN ('Starbucks', 'Jimmy Johns')
  AND gp.card_value = 25.00
GROUP BY gb.brand_name, gp.card_value;
```

If no cards available, add test cards:

```sql
-- Get Starbucks pool ID
SELECT id FROM gift_card_pools 
WHERE brand_id = (SELECT id FROM gift_card_brands WHERE brand_name = 'Starbucks')
  AND card_value = 25.00;

-- Insert 10 test cards
INSERT INTO gift_cards (
  pool_id,
  card_code,
  card_number,
  card_value,
  status,
  created_at
)
SELECT 
  'pool-id-from-above',
  'SBUX-TEST-' || LPAD((1000 + generate_series)::text, 4, '0'),
  'SBUX' || LPAD((generate_series)::text, 16, '0'),
  25.00,
  'available',
  NOW()
FROM generate_series(1, 10);
```

## Step 5: Demo Flow Testing Script

### Test Case 1: Happy Path

**Scenario:** Customer calls in, opts in, listens to pitch, receives gift card

1. **Call Center Rep:**
   - Open `/call-center`
   - Enter code: `MIKE0001`
   - System displays: John Smith, AutoCare Plus

2. **SMS Opt-In:**
   - Enter phone: `(555) 123-4567`
   - Click "Send Opt-In SMS"
   - Customer receives: "This is [Client]. Reply YES to receive..."

3. **Customer Response:**
   - Customer texts "YES"
   - System updates status to "opted_in" (real-time)

4. **Sales Pitch & Approval:**
   - Rep completes sales pitch
   - Rep clicks "Approve Gift Card"
   - Customer receives SMS: "Your gift card has been activated! Redeem it here: [LINK]"

5. **Customer Redemption:**
   - Customer clicks link → opens `/redeem-gift-card?code=MIKE0001&campaign=xxx`
   - Enters cell phone: `(555) 123-4567`
   - Enters code: `MIKE0001`
   - Clicks "Claim Gift Card"
   - Form flips → Shows Starbucks $25 card
   - Customer adds to Google/Apple Wallet

### Test Case 2: Customer Declines

**Scenario:** Customer doesn't opt in or doesn't complete sales call

1. Enter code: `MIKE0002`
2. Send opt-in SMS
3. Customer doesn't respond or replies "STOP"
4. Rep marks as "Did not opt in" or "Rejected"
5. No gift card sent

### Test Case 3: Already Redeemed

**Scenario:** Customer tries to redeem twice

1. Complete Test Case 1 fully
2. Customer clicks SMS link again
3. System shows: "You've already claimed this gift card"
4. Displays same gift card information

## Step 6: Mike's Live Demo Script

**Setup Before Call:** (5 minutes before)
- [ ] Verify Twilio credentials configured
- [ ] Test SMS sending to your phone
- [ ] Open call center page
- [ ] Have test code ready: **MIKE0001**
- [ ] Have Mike's phone number ready (or use test number)

**During Demo:** (Show Mike each step)

1. **"This is our call center dashboard"**
   - Show `/call-center` interface
   - "Rep enters the unique code from the mailer"

2. **"Customer verification and opt-in"**
   - Enter MIKE0001
   - "System pulls up customer info"
   - Enter Mike's cell phone (or test number)
   - "Rep asks permission, sends instant SMS"
   - Show Mike the SMS on phone

3. **"Customer confirms opt-in"**
   - Have Mike text "YES" (or simulate)
   - "Real-time status update - see it change"

4. **"After the sales pitch"**
   - "Rep clicks approve - instantly triggers gift card"
   - Show Mike second SMS with link

5. **"Customer claims their reward"**
   - Click the link (open on Mike's phone or screen share)
   - Enter phone + code
   - "Card is instantly provisioned"
   - **Show wallet integration**

6. **"Behind the scenes"**
   - Show campaign dashboard
   - Show analytics: calls, redemptions, ROI
   - Show audit trail of the transaction

## Step 7: Troubleshooting During Demo

### If SMS doesn't send:
- Check Twilio console for errors
- Verify phone number format
- Check edge function logs
- Fallback: Show email delivery option

### If redemption fails:
- Check gift card inventory
- Verify campaign conditions configured
- Check edge function logs
- Use test code: `12345678ABCD` (returns mock card)

### If page doesn't load:
- Check URL in SMS is correct
- Verify PUBLIC_APP_URL environment variable
- Open redemption page manually with test params

## Test Data Summary

**Primary Test Code:** MIKE0001
**Customer Name:** John Smith
**Phone:** (555) 123-4567
**Company:** AutoCare Plus
**Gift Card:** Starbucks $25

**Backup Codes:** MIKE0002 through MIKE0010

## Post-Demo Cleanup

```sql
-- Remove test data after demo
DELETE FROM recipient_audit_log 
WHERE recipient_id IN (
  SELECT id FROM recipients WHERE redemption_code LIKE 'MIKE%'
);

DELETE FROM recipient_gift_cards 
WHERE recipient_id IN (
  SELECT id FROM recipients WHERE redemption_code LIKE 'MIKE%'
);

DELETE FROM recipients WHERE redemption_code LIKE 'MIKE%';
DELETE FROM audiences WHERE name = 'Mike Demo Audience';
DELETE FROM campaigns WHERE name LIKE '%Mike Demo%';
```

## Success Metrics for Demo

Mike should see:
- ✅ Instant SMS delivery
- ✅ Real-time opt-in status
- ✅ One-click approval
- ✅ Automatic gift card provisioning
- ✅ Mobile-friendly redemption
- ✅ Wallet integration working
- ✅ Complete audit trail
- ✅ Zero manual steps after approval

## Questions Mike Might Ask

**Q: What if customer doesn't have smartphone?**
A: System can send gift card code via SMS as text, or email as backup

**Q: How do you prevent fraud?**
A: Multi-layer: unique codes tied to customer, phone verification, approval required before activation, codes only work once

**Q: What's the cost per gift card?**
A: Based on face value + small fee (e.g., $25 card = $27 cost including delivery)

**Q: Can we integrate with our CRM?**
A: Yes, via Zapier or direct API integration

**Q: What about reporting?**
A: Full analytics dashboard showing calls, conversions, ROI, response rates

**Q: Scale to 30,000 mailers?**
A: System tested to handle 100K+ simultaneous redemptions

## Next Steps After Demo

If Mike approves:
1. Set up production Twilio account
2. Import 30K customer codes
3. Configure real gift card inventory
4. Train call center staff (15 min training)
5. Launch test batch (1,000 mailers)
6. Monitor and optimize
7. Scale to full 30K


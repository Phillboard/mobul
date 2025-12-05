# Demo Data System Guide

Generate comprehensive test data for complete system testing.

---

## Overview

The demo data system allows you to generate realistic dummy data across all system features for thorough testing without affecting production data.

### Key Features:
- Fake gift card brands (clearly marked as DEMO)
- Complete organization/client hierarchy
- Campaigns in all lifecycle stages
- Recipients with unique redemption codes
- Tracking events for rich analytics
- Easy cleanup before production launch

---

## Quick Start (5 Minutes)

### Step 1: Run SQL Seeder
```bash
1. Open Supabase SQL Editor
2. Copy contents of: scripts/sql/seed-comprehensive-demo-data.sql
3. Run the script
4. Wait ~30 seconds for completion
```

**This creates:**
- 8 Fake gift card brands (DemoCoffee, FakeRetail, etc.)
- 2 Demo organizations
- 10 Demo clients
- Gift card denominations per brand
- ~8,000 Fake gift card inventory items
- 500 Test contacts
- 50 Contact lists

### Step 2: Generate Dynamic Data
```bash
1. Log in to platform as admin
2. Navigate to: /admin/demo-data
3. Choose dataset size: Small / Medium / Large
4. Click "Generate Demo Data"
5. Wait for completion (2-10 minutes depending on size)
```

**This creates:**
- 25-100 Campaigns (configurable)
- 1,250-10,000 Recipients with unique codes
- 2,500-20,000 Tracking events
- Rich analytics data

### Step 3: Test System
```bash
Visit dashboards and verify data displays:
- /campaigns → Campaign analytics
- /gift-cards → Inventory and redemption data
- /call-center → Call metrics
- /contacts → Contact lists and lifecycle stages
- /admin/system-health → System metrics
```

---

## What Gets Generated

### Fake Gift Card Brands

| Brand | Category | Denominations | Status |
|-------|----------|---------------|--------|
| DemoCoffee ☕ | Food & Beverage | $5, $10, $15, $25 | Demo |
| FakeRetail 🛍️ | Retail | $25, $50, $100 | Demo |
| TestBurger 🍔 | Food & Beverage | $10, $15, $20, $25 | Demo |
| MockElectronics 💻 | Electronics | $50, $100, $200 | Demo |
| SampleBooks 📚 | Retail | $10, $25, $50 | Demo |
| DemoGaming 🎮 | Entertainment | $20, $50, $100 | Demo |
| TestGrocery 🛒 | Food & Beverage | $25, $50, $75, $100 | Demo |
| FakeFashion 👗 | Retail | $25, $50, $100 | Demo |

**Identification:**
- All have `is_demo_brand = true` flag
- Obvious fake names
- Provider set to "demo"
- Can be filtered/hidden in UI

### Campaign Data

**Campaign States:**
```
Draft (20%):      Recently created, not sent
Scheduled (15%):  Ready to mail, date set
In Progress (30%): Mailed, tracking active
Completed (30%):   Finished with full metrics
Cancelled (5%):    Stopped midway
```

### Recipients & Codes

**Format:**
- Redemption codes: `DEMO-A1B2C3`, `TEST-X9Y8Z7`
- PURL tokens: 16-character alphanumeric
- Phone numbers: +1 555-XXX-XXXX (555 = test area code)
- Emails: firstname.lastname@testmail.com

### Gift Cards

**Code Format:**
```
DEMO-1234-5678-9ABC
TEST-AAAA-BBBB-CCCC
FAKE-0000-1111-2222
```

**Status Distribution:**
- 60% Available
- 20% Claimed
- 15% Delivered
- 5% Failed

---

## UI Features

### Demo Data Generator Page

**Location:** `/admin/demo-data`  
**Access:** Admin role required

**Features:**
- Choose dataset size (Small/Medium/Large)
- Customize campaign and recipient counts
- Real-time progress tracking
- Phase-by-phase status updates
- Error handling and recovery

---

## Cleanup Before Production

### Option 1: UI Cleanup
```
1. Navigate to: /admin/demo-data
2. Click "Cleanup" tab
3. Click "Delete All Demo Data"
4. Confirm deletion
```

### Option 2: SQL Cleanup
```
1. Open Supabase SQL Editor
2. Run: scripts/sql/cleanup-demo-data.sql
3. Wait for completion
4. Verify demo data removed
```

---

## Data Volumes by Size

### Small Dataset
```
Organizations:    2
Clients:         10
Campaigns:       25
Recipients:     625
Gift Cards:   2,000
Events:       1,250
Contacts:       500
Total Records: ~4,400
Generation Time: ~2 minutes
```

### Medium Dataset (Recommended)
```
Organizations:    2
Clients:         10
Campaigns:       50
Recipients:   2,500
Gift Cards:   2,000
Events:       5,000
Contacts:       500
Total Records: ~10,000
Generation Time: ~5 minutes
```

### Large Dataset
```
Organizations:    2
Clients:         10
Campaigns:      100
Recipients:  10,000
Gift Cards:   2,000
Events:      20,000
Contacts:       500
Total Records: ~32,500
Generation Time: ~15 minutes
```

---

## How to Identify Demo Data

### In Database:
```sql
-- Demo brands
SELECT * FROM gift_card_brands WHERE is_demo_brand = true;

-- Demo clients
SELECT * FROM clients WHERE id LIKE 'dc%';

-- Demo organizations  
SELECT * FROM organizations WHERE id LIKE 'd%';

-- Demo campaigns
SELECT * FROM campaigns WHERE client_id LIKE 'dc%';

-- Demo contacts
SELECT * FROM contacts WHERE email LIKE '%@testmail.com';

-- Demo gift cards
SELECT * FROM gift_cards WHERE card_code LIKE 'DEMO-%' OR card_code LIKE 'TEST-%' OR card_code LIKE 'FAKE-%';
```

### In UI:
- Demo brands show badge: "DEMO BRAND"
- Client names clearly indicate demo status
- Gift card codes start with DEMO/TEST/FAKE prefixes
- Contact emails end with @testmail.com
- Redemption codes start with DEMO- or TEST-

---

## Troubleshooting

### Issue: "No demo clients found"
**Solution:** Run `scripts/sql/seed-comprehensive-demo-data.sql` first

### Issue: Generation fails midway
**Solution:** 
- Check Supabase logs for errors
- Verify RLS policies allow data insertion
- Ensure you're logged in as admin
- Try smaller dataset first

### Issue: Cleanup doesn't remove everything
**Solution:**
```sql
-- Force delete with CASCADE
DELETE FROM organizations WHERE id LIKE 'd%' CASCADE;
```

### Issue: Dashboards don't show data
**Solution:**
- Verify campaigns have `audience_id` set
- Check events table has records
- Confirm recipients linked to campaigns
- Check RLS policies allow viewing data


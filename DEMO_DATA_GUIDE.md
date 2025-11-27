# Demo Data System Guide

**Purpose:** Generate comprehensive test data for complete system testing  
**Date:** November 27, 2025  
**Status:** ✅ Production Ready

---

## 🎯 Overview

The demo data system allows you to generate realistic dummy data across all system features for thorough testing without affecting production data.

### Key Features:
- ✅ Fake gift card brands (clearly marked as DEMO)
- ✅ Complete organization/client hierarchy
- ✅ Campaigns in all lifecycle stages
- ✅ Recipients with unique redemption codes
- ✅ Tracking events for rich analytics
- ✅ Easy cleanup before production launch

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Run SQL Seeder
```bash
1. Open Supabase SQL Editor
2. Copy contents of: seed-comprehensive-demo-data.sql
3. Run the script
4. Wait ~30 seconds for completion
```

**This creates:**
- ✅ 8 Fake gift card brands (DemoCoffee, FakeRetail, etc.)
- ✅ 2 Demo organizations
- ✅ 10 Demo clients
- ✅ 80 Gift card pools (8 brands × 10 clients)
- ✅ ~8,000 Fake gift cards
- ✅ 500 Test contacts
- ✅ 50 Contact lists

### Step 2: Generate Dynamic Data
```bash
1. Log in to platform as admin
2. Navigate to: /admin/demo-data
3. Choose dataset size: Small / Medium / Large
4. Click "Generate Demo Data"
5. Wait for completion (2-10 minutes depending on size)
```

**This creates:**
- ✅ 25-100 Campaigns (configurable)
- ✅ 1,250-10,000 Recipients with unique codes
- ✅ 2,500-20,000 Tracking events
- ✅ Rich analytics data

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

## 📦 What Gets Generated

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

### Demo Organizations & Clients

**Demo Agency 1:**
- Tech Startup Co
- Healthcare Clinic
- Real Estate Firm
- Auto Dealership
- Dental Practice

**Demo Agency 2:**
- Law Firm Partners
- Restaurant Group
- Fitness Center
- Home Services Pro
- Insurance Agency

**Client IDs:** All start with `dc` prefix (e.g., `dc100000-...`)

### Campaign Data

**Campaign States:**
```
Draft (20%):      Recently created, not sent
Scheduled (15%):  Ready to mail, date set
In Progress (30%): Mailed, tracking active
Completed (30%):   Finished with full metrics
Cancelled (5%):    Stopped midway
```

**Campaign Names:**
- "Q4 Holiday Promotion - Technology"
- "Winter Special Offer - Healthcare Clinic"
- "Grand Opening Mailer - December"
- "Customer Appreciation - November 2025"
- And many more realistic variations

### Recipients & Codes

**Format:**
- Redemption codes: `DEMO-A1B2C3`, `TEST-X9Y8Z7`
- PURL tokens: 16-character alphanumeric
- Phone numbers: +1 555-XXX-XXXX (555 = test area code)
- Emails: firstname.lastname@testmail.com

**Quantities:**
- Small: ~625 recipients
- Medium: ~2,500 recipients
- Large: ~10,000 recipients

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

### Tracking Events

**Event Types:**
- PURL visits (30%)
- QR code scans (20%)
- Form submissions (15%)
- Calls received (10%)
- Gift cards claimed (10%)
- Gift cards delivered (10%)
- Emails opened (5%)

**Time Distribution:**
- 50% last 7 days
- 30% last 30 days
- 20% older than 30 days

---

## 🎨 UI Features

### Demo Data Generator Page

**Location:** `/admin/demo-data`  
**Access:** Admin role required

**Features:**
- Choose dataset size (Small/Medium/Large)
- Customize campaign and recipient counts
- Real-time progress tracking
- Phase-by-phase status updates
- Error handling and recovery

### Data Filtering

**Gift Card Brands:**
```tsx
// Show/hide demo brands
<Switch 
  label="Show Demo Brands"
  checked={showDemo}
  onCheckedChange={setShowDemo}
/>

// Query
const { data } = await supabase
  .from('gift_card_brands')
  .select('*')
  .eq('is_demo_brand', showDemo);
```

**Campaigns:**
```typescript
// Filter demo campaigns
const { data } = await supabase
  .from('campaigns')
  .select('*')
  .eq('client_id', clientId)
  // Demo clients have IDs starting with 'dc'
  .not('client_id', 'like', 'dc%'); // Production only
```

---

## 🧪 Testing Workflows

### Test Gift Card Redemption

1. Get demo redemption code:
```sql
SELECT redemption_code, first_name, last_name, phone
FROM recipients
WHERE audience_id IN (
  SELECT audience_id FROM campaigns WHERE client_id LIKE 'dc%'
)
LIMIT 1;
```

2. Navigate to call center: `/call-center`
3. Enter redemption code
4. Provision gift card
5. Verify SMS delivery (to test phone number)

### Test Campaign Analytics

1. Navigate to: `/campaigns`
2. Click on any campaign with "in_progress" or "completed" status
3. View analytics tab
4. Verify charts display:
   - Delivery timeline
   - Engagement rates
   - Geographic distribution
   - Conversion funnel

### Test PURL Pages

1. Get PURL URL:
```sql
SELECT 
  CONCAT('http://localhost:8081/c/', c.id, '/', r.token) as purl_url
FROM recipients r
JOIN audiences a ON r.audience_id = a.id
JOIN campaigns c ON a.id = c.audience_id
WHERE c.client_id LIKE 'dc%'
LIMIT 1;
```

2. Visit PURL in browser
3. Verify personalized content loads
4. Check tracking event created

---

## 🗑️ Cleanup Before Production

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
2. Run: cleanup-demo-data.sql
3. Wait for completion
4. Verify demo data removed
```

### Option 3: Selective Cleanup
```sql
-- Just hide demo brands (don't delete)
UPDATE gift_card_brands 
SET is_active = false 
WHERE is_demo_brand = true;

-- Delete only demo campaigns
DELETE FROM campaigns 
WHERE client_id LIKE 'dc%';

-- Delete only test contacts
DELETE FROM contacts 
WHERE email LIKE '%@testmail.com';
```

---

## 📊 Data Volumes by Size

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

## 🔍 How to Identify Demo Data

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

## 🎓 Best Practices

### During Testing:
1. ✅ Always use demo clients for testing
2. ✅ Generate fresh data for each test cycle
3. ✅ Use cleanup script between major test rounds
4. ✅ Monitor database size (large datasets can grow quickly)
5. ✅ Test with medium dataset first

### Before Production:
1. ✅ Run cleanup script to remove all demo data
2. ✅ Verify no demo brands remain active
3. ✅ Check no test contacts in production lists
4. ✅ Confirm all campaigns use real clients
5. ✅ Review analytics to ensure no demo data pollution

### During Development:
1. ✅ Keep demo data separate from real test accounts
2. ✅ Document any new demo patterns
3. ✅ Update cleanup script if adding new demo tables
4. ✅ Test cleanup script regularly

---

## 🛠️ Customization

### Add More Fake Brands

Edit `src/lib/demo-brands.ts`:
```typescript
export const DEMO_BRANDS = [
  // ... existing brands
  {
    brand_name: 'YourNewBrand',
    brand_code: 'your_new_brand',
    provider: 'demo',
    category: 'category_name',
    is_demo_brand: true,
  },
];
```

### Adjust Data Distribution

Edit `src/lib/fake-data-helpers.ts`:
```typescript
// Change campaign status distribution
export function getRandomCampaignStatus() {
  const statuses = [
    { status: 'draft', weight: 30 },  // Changed from 20
    { status: 'in_progress', weight: 50 },  // Changed from 30
    // ... adjust weights as needed
  ];
}
```

### Custom Generation Logic

Create custom generator in `src/lib/demo-data-generator.ts`:
```typescript
async generateCustomScenario() {
  // Your custom logic here
}
```

---

## 🐛 Troubleshooting

### Issue: "No demo clients found"
**Solution:** Run `seed-comprehensive-demo-data.sql` first

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

### Issue: Performance degradation
**Solution:**
- Use smaller dataset
- Run VACUUM ANALYZE after cleanup
- Check database indexes
- Monitor Supabase dashboard

---

## 📈 Performance Considerations

### Database Size Impact:
```
Small Dataset:  ~50 MB
Medium Dataset: ~200 MB
Large Dataset:  ~800 MB
```

### Generation Speed:
```
Small:  ~2 minutes
Medium: ~5 minutes
Large:  ~15 minutes
```

### Query Performance:
- All demo queries use indexed columns
- Performance should remain good up to Large dataset
- Consider pagination for large result sets

---

## 🔒 Security Notes

### Demo Data Isolation:
- Demo clients use distinct ID prefix (`dc`)
- Demo brands flagged (`is_demo_brand = true`)
- Easy to identify and filter
- RLS policies still enforced

### Before Production:
1. Run cleanup script
2. Verify removal with queries
3. Check no demo IDs in production tables
4. Review analytics for test data

---

## 📚 Related Documentation

- `seed-comprehensive-demo-data.sql` - SQL seeding script
- `cleanup-demo-data.sql` - Cleanup script
- `src/lib/demo-data-generator.ts` - Generation logic
- `src/lib/demo-brands.ts` - Fake brand definitions
- `src/lib/fake-data-helpers.ts` - Helper functions

---

## ✅ Verification Checklist

After generating data, verify:

- [ ] Campaign dashboard shows metrics
- [ ] Gift card analytics display trends
- [ ] Call center dashboard populated
- [ ] Contact lists have members
- [ ] Charts render correctly
- [ ] Search and filters work
- [ ] Redemption codes validate
- [ ] PURL pages load
- [ ] Forms submit successfully
- [ ] Analytics update properly
- [ ] No production data affected

---

## 🎯 Use Cases

### Scenario 1: Sales Demo
```
Dataset: Medium
Purpose: Show potential customers full system capabilities
Focus: Campaigns, analytics, gift card management
```

### Scenario 2: Training New Users
```
Dataset: Small
Purpose: Teach users how to create campaigns
Focus: Wizard workflow, contact management
```

### Scenario 3: Performance Testing
```
Dataset: Large
Purpose: Test system under load
Focus: Query performance, UI responsiveness
```

### Scenario 4: Feature Development
```
Dataset: Small
Purpose: Quick iteration during development
Focus: Specific feature being built
```

---

## 🚀 Advanced Usage

### Regenerate Specific Data Type

```typescript
import { DemoDataGenerator } from '@/lib/demo-data-generator';

const generator = new DemoDataGenerator((progress) => {
  console.log(progress);
});

// Generate only campaigns
await generator.generateCampaigns(clientIds, 10);

// Generate only events
await generator.generateEvents(campaignIds, 100);
```

### Custom Data Patterns

```typescript
// Override default behaviors
const customRecipients = recipients.map(r => ({
  ...r,
  custom_field: 'your_value',
  redemption_code: `CUSTOM-${generateCode()}`,
}));
```

---

## 📊 Analytics & Metrics

### Pre-calculated Metrics

The demo data includes realistic conversion funnels:
```
1000 Recipients
→ 300 PURL Visits (30% engagement)
  → 150 Form Views (50% of visits)
    → 75 Submissions (50% of views)
      → 30 Gift Cards (40% conversion)
```

### Geographic Distribution

Recipients spread across major US cities:
- Austin, TX
- Dallas, TX
- Houston, TX
- Phoenix, AZ
- Denver, CO
- Seattle, WA
- Portland, OR
- Los Angeles, CA
- And more...

### Temporal Patterns

Events follow realistic patterns:
- Peak hours: 9 AM - 5 PM
- Weekdays: Higher activity
- Weekends: Lower activity
- Recent bias: More events in last 7 days

---

## 🔄 Maintenance

### Regular Tasks:

**Weekly (During Testing):**
- Review data quality
- Regenerate if needed
- Monitor database size

**Before Each Demo:**
- Verify data is current
- Check all dashboards load
- Test critical workflows

**After Testing Sprint:**
- Clean up if data gets stale
- Regenerate fresh data
- Update documentation if patterns change

---

## 🎉 Success Metrics

Demo data is working when:

✅ All dashboards show rich data
✅ Analytics charts display trends
✅ Campaign workflows testable end-to-end
✅ Gift card redemption works
✅ Call center has scenarios
✅ Search returns results
✅ Filters work correctly
✅ Exports contain data
✅ Performance remains good
✅ No errors in logs

---

## 🙏 Summary

The demo data system provides a comprehensive testing environment that:
- **Looks Real** - Realistic names, addresses, patterns
- **Works Completely** - All features testable
- **Cleans Easily** - Single script removes everything
- **Performs Well** - Optimized for speed
- **Clearly Marked** - No confusion with production data

**Ready to generate demo data and test your system!** 🚀

---

*Last Updated: November 27, 2025*  
*Version: 1.0.0*  
*Status: ✅ Production Ready*


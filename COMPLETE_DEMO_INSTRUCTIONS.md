# Complete Demo Data Setup - Step by Step

**Updated:** November 27, 2025  
**Status:** Complete instructions for full analytics data

---

## 🎯 Goal

Generate **complete, interconnected demo data** so all dashboards show rich analytics including:
- ✅ Campaigns with audiences and recipients
- ✅ PURL visits and QR scans
- ✅ Form submissions
- ✅ Gift card redemptions
- ✅ Call session data
- ✅ Full conversion funnels

---

## 📋 Current Status

**What You Have:**
- ✅ 1,888 records from first generation
- ✅ 10 Campaigns (but no audiences = no analytics)
- ✅ 399 Contacts
- ✅ 982 Gift Cards
- ✅ Gift Card Pools

**What's Missing:**
- ❌ Campaign → Audience linkage
- ❌ Recipients with redemption codes
- ❌ Tracking events (visits, scans, submissions)
- ❌ Gift card redemptions
- ❌ Call session data

---

## 🚀 Complete Setup (Two-Step Process)

### Step 1: Run Complete Analytics Script

**Via Supabase SQL Editor:**

```sql
1. Go to: https://supabase.com/dashboard
2. Select your project → SQL Editor
3. Copy entire contents of: seed-complete-analytics-data.sql
4. Paste and click "Run"
5. Wait ~1 minute for completion
```

**This Will:**
- ✅ Link all campaigns to new audiences
- ✅ Generate 500-1,000 recipients with unique DEMO codes
- ✅ Create PURL visit events (30-60% of recipients)
- ✅ Create QR scan events (15-30% of recipients)
- ✅ Create form submission events (10-20% of visitors)
- ✅ Add campaign conditions with gift card rewards
- ✅ Simulate gift card redemptions (5-15 per campaign)
- ✅ Generate call session data
- ✅ Update all statistics

**Expected Output:**
```
✅ All campaigns now have audiences and recipients
✅ Added conditions and rewards to campaigns
✅ Simulated gift card redemptions  
✅ Generated call session data
🎉 Complete! All campaigns now have full analytics data

Summary:
- Campaigns with Audiences: 10
- Total Recipients: 500-1000
- Total Events: 1500-3000
- Gift Cards Claimed: 50-150
- Call Sessions: 40-120
```

---

### Step 2: Verify Data in Dashboards

**A. Campaign Analytics**
```
1. Go to: http://localhost:8081/campaigns
2. Select "Vertical Roofing Experts" client
3. Click on any "Completed" campaign
4. Should now see:
   ✅ Recipients count (25-100)
   ✅ Engagement metrics
   ✅ Conversion funnel
   ✅ Timeline chart
```

**B. Gift Cards**
```
1. Go to: http://localhost:8081/gift-cards
2. Should now see:
   ✅ Cards claimed (not all 0)
   ✅ Utilization percentages
   ✅ Delivery history
```

**C. Contacts**
```
1. Go to: http://localhost:8081/contacts
2. Should see:
   ✅ 399+ contacts
   ✅ Activities linked
   ✅ Campaign participation
```

---

## 📊 What You'll See After Running Script

### Campaign Dashboard
```
Campaign: "Annual Inspection Promotion"
├── Recipients: 50
├── PURL Visits: 22 (44%)
├── QR Scans: 12 (24%)
├── Form Submissions: 8 (16%)
├── Gift Cards Claimed: 7 (14%)
└── Conversion Rate: 14%
```

### Gift Card Dashboard
```
Amazon $25 Pool:
├── Total: 100
├── Available: 85 (85%)
├── Claimed: 12 (12%)
├── Delivered: 3 (3%)
└── Utilization: 15%
```

### Call Center Dashboard
```
Total Calls: 80
├── Completed: 48 (60%)
├── No Answer: 16 (20%)
├── Busy: 8 (10%)
└── Qualified: 32 (40%)
```

---

## 🔍 Verify Campaign Linkage

**Check if campaigns have audiences:**

```sql
SELECT 
  c.name as campaign,
  c.status,
  a.name as audience,
  a.total_count as recipients,
  COUNT(r.id) as actual_recipients
FROM campaigns c
LEFT JOIN audiences a ON c.audience_id = a.id
LEFT JOIN recipients r ON a.id = r.audience_id
WHERE c.client_id IN (
  SELECT id FROM clients LIMIT 5
)
GROUP BY c.id, c.name, c.status, a.name, a.total_count
ORDER BY c.created_at DESC;
```

**Expected Result:**
- All campaigns should have audience names
- Recipient counts should match
- No "NULL" audiences

---

## 🎯 Quick Test Redemption Flow

After running the script, test a gift card redemption:

**1. Get a Demo Redemption Code:**
```sql
SELECT 
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.phone,
  c.name as campaign
FROM recipients r
JOIN audiences a ON r.audience_id = a.id
JOIN campaigns c ON a.id = c.audience_id
WHERE r.redemption_code LIKE 'DEMO-%'
LIMIT 1;
```

**2. Test in Call Center:**
```
1. Go to: http://localhost:8081/call-center
2. Enter the redemption code
3. Should load recipient details
4. Provision gift card
5. Verify success
```

---

## 🗂️ Complete Data Structure

After both scripts, you'll have:

```
Organizations (2)
└── Clients (10)
    ├── Campaigns (10 per client = 100 total)
    │   ├── Audiences (1 per campaign)
    │   │   └── Recipients (25-100 each = 2,500-10,000 total)
    │   ├── Conditions (1 per active campaign)
    │   └── Reward Configs (linked to pools)
    ├── Gift Card Pools (5 per client = 50 total)
    │   └── Gift Cards (100-200 per pool = 5,000-10,000 total)
    ├── Contacts (399 total)
    └── Contact Lists (50 total)

Events (~5,000-10,000):
├── PURL Visits (30%)
├── QR Scans (20%)
├── Form Submissions (15%)
├── Calls (10%)
└── Other (25%)
```

---

## 🐛 Troubleshooting

### Issue: "No audiences created"
**Solution:** Check campaigns table:
```sql
SELECT COUNT(*) FROM campaigns WHERE audience_id IS NULL;
-- If > 0, run the script again
```

### Issue: "Still showing 0 events"
**Solution:** Check events table:
```sql
SELECT COUNT(*), event_type FROM events GROUP BY event_type;
-- Should show multiple event types with counts
```

### Issue: "Gift cards still 0"
**Solution:** Gift cards may not be in the pools created by enrich-data.  
Run: `seed-comprehensive-demo-data.sql` first to create gift cards.

---

## ⚡ Quick Complete Setup (Copy-Paste)

**Run these in order in Supabase SQL Editor:**

```sql
-- Step 1: Base data (brands, clients, contacts, cards)
\i seed-comprehensive-demo-data.sql

-- Step 2: Complete analytics linkage
\i seed-complete-analytics-data.sql

-- Done! Refresh your dashboards
```

---

## ✅ Success Checklist

Your demo data is complete when:

- [ ] All campaigns show audience names (not "No audience")
- [ ] Campaign details show recipient counts > 0
- [ ] Events table has 1,000+ records
- [ ] Gift cards show claimed/delivered (not all available)
- [ ] Dashboards display charts with data
- [ ] Analytics show conversion funnels
- [ ] Call center has session data
- [ ] Contacts have campaign participation

---

## 🎊 Final Result

After completing both steps, you'll have:

**✅ Production-Quality Test Environment:**
- Realistic conversion rates (30% visit → 15% convert)
- Time-distributed events (last 7/30/60 days)
- Full campaign lifecycles
- Working redemption codes
- Rich dashboard analytics
- Complete workflow testing capability

**Total Records:** ~15,000-25,000 depending on configuration

**Ready for:** Demos, training, feature testing, performance testing

---

*Run the scripts and your system will be fully testable!* 🚀


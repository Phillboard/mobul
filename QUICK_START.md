# 🚀 Quick Start - Campaign MVP

## ⚡ 5-Minute Setup

### 1. Environment Setup (2 min)
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your Supabase and Twilio credentials

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev
```

### 2. Seed Test Data (1 min)
1. Open: http://localhost:8081/admin/mvp-verification
2. Go to "Seed Test Data" tab
3. Click "Seed Test Data"
4. Wait for success ✅

### 3. Verify System (1 min)
1. Switch to "Verification" tab
2. Click "Run Verification"
3. Check all green ✅

### 4. Create Test Campaign (1 min)
1. Go to: http://localhost:8081/campaigns/new
2. Complete wizard:
   - Name: "My First Campaign"
   - Recipients: Select "Test Contact List"
   - Condition: Link to "Test Amazon $25 Pool"
3. Create!

---

## 🔑 Key URLs

| Tool | URL | Purpose |
|------|-----|---------|
| **MVP Verification** | `/admin/mvp-verification` | Check system readiness |
| **Campaigns** | `/campaigns` | View all campaigns |
| **Create Campaign** | `/campaigns/new` | Campaign wizard |
| **Gift Cards** | `/gift-cards` | Manage pools |
| **Contacts** | `/contacts` | Manage contacts |
| **Call Center** | `/call-center` | Redeem gift cards |
| **System Health** | `/admin/system-health` | Monitor system |

---

## 📦 What Was Created

### Database Tables ✅
- All 20+ critical tables verified
- RLS policies enabled
- Indexes optimized

### Test Data ✅
- 5 gift card brands
- 1 test client
- 20 test gift cards ($25 Amazon)
- 10 test contacts
- 1 contact list
- 1 template

### Tools & UI ✅
- MVP Verification page with live checks
- One-click test data seeder
- Environment validator
- Comprehensive documentation

---

## 🎯 Test the Full Flow

### Step 1: Create Campaign
```
/campaigns/new → Complete wizard → Create
```

### Step 2: Trigger Condition
```
/call-center → Enter redemption code → Provision card
```

### Step 3: Verify Gift Card
```sql
-- Check card was claimed
SELECT * FROM gift_cards WHERE status = 'claimed' ORDER BY claimed_at DESC LIMIT 1;
```

### Step 4: Check SMS
```
Check recipient phone for SMS with card details
```

### Step 5: Visit PURL
```
http://localhost:8081/c/{campaignId}/{token}
```

---

## 🛠️ Troubleshooting

### Issue: Verification fails
**Fix:** Run data seeder first

### Issue: No SMS sent
**Fix:** Check Twilio credentials in `.env`

### Issue: Can't create campaign
**Fix:** Ensure user assigned to client (run seeder)

### Issue: No gift cards available
**Fix:** Check pool has available cards

---

## 📚 Documentation

- **Full Setup:** `MVP_SETUP_GUIDE.md`
- **Testing:** `CAMPAIGN_TESTING_GUIDE.md`
- **Summary:** `MVP_COMPLETION_SUMMARY.md`
- **SQL Scripts:** `verify-mvp-database.sql`, `seed-mvp-test-data.sql`

---

## ✅ Success Checklist

- [ ] Environment configured
- [ ] Dev server running
- [ ] Test data seeded
- [ ] Verification passes
- [ ] Test campaign created
- [ ] Gift card provisioned
- [ ] SMS received
- [ ] PURL page loads

**All done? You're ready to go! 🎉**

---

## 🆘 Need Help?

1. Check `/admin/mvp-verification` first
2. Review `MVP_COMPLETION_SUMMARY.md`
3. Run SQL verification: `verify-mvp-database.sql`
4. Check browser console for errors
5. Review Supabase logs

---

**MVP Status:** ✅ READY

*Your campaign system is configured and ready to run!*


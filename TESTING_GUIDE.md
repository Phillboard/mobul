# MVP Testing Guide

## 🧪 Complete Testing Checklist

This guide provides step-by-step testing procedures for all MVP features after deployment.

---

## Prerequisites

Before testing:
- [ ] All edge functions deployed
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] Demo data populated (campaigns, contacts, gift card pools)

---

## 1. Email System Testing

### 1.1 Gift Card Email Delivery

**Test Scenario:** Provision gift card via call center with email delivery

**Steps:**
1. Navigate to `/call-center`
2. Enter a redemption code
3. Select "Email" as delivery method
4. Enter test email address
5. Click "Provision Gift Card"
6. Check email inbox within 1 minute

**Expected Results:**
- ✅ Email received with gift card code
- ✅ Email has proper formatting and branding
- ✅ Gift card details displayed correctly
- ✅ Links (if any) are clickable
- ✅ Entry in `email_delivery_logs` table with status "sent"

**SQL Verification:**
```sql
SELECT * FROM email_delivery_logs 
WHERE template_name = 'gift-card-delivery'
ORDER BY sent_at DESC LIMIT 5;
```

### 1.2 Form Submission Email

**Test Scenario:** Submit form and receive confirmation email

**Steps:**
1. Navigate to `/ace-forms`
2. Create or select a form linked to a campaign
3. Get the public form URL
4. Submit the form with email address
5. Check email inbox

**Expected Results:**
- ✅ Confirmation email received
- ✅ Form submission details included
- ✅ Gift card included if applicable
- ✅ Professional formatting

### 1.3 Inventory Alert Email

**Test Scenario:** Trigger low inventory alert

**Steps:**
1. Navigate to `/gift-cards`
2. Find a pool with low inventory (< 10 cards)
3. Or manually trigger by claiming cards
4. Check admin email (ALERT_EMAIL_RECIPIENTS)

**Expected Results:**
- ✅ Alert email received by admins
- ✅ Pool details clearly displayed
- ✅ Severity level shown
- ✅ Link to pool detail page works

---

## 2. Gift Card Page Navigation Testing

### 2.1 Pool Detail Page

**Test Scenario:** View detailed pool information

**Steps:**
1. Navigate to `/gift-cards`
2. Click on any pool card
3. Should navigate to `/gift-cards/pools/:poolId`
4. Test all tabs: Cards, Balance History, Settings (admin only)
5. Test "Check Balances" button
6. Test "Export CSV" button
7. Click back button

**Expected Results:**
- ✅ URL shows `/gift-cards/pools/:poolId`
- ✅ Pool details display correctly
- ✅ All tabs are accessible
- ✅ Cards table shows data
- ✅ Balance history displays
- ✅ Settings tab visible for admins only
- ✅ Export downloads CSV file
- ✅ Back button returns to `/gift-cards`
- ✅ Breadcrumb navigation works

**Edge Cases:**
- Invalid pool ID → Shows error
- Non-existent pool → Redirects to gift cards
- Non-admin user → Settings tab hidden

### 2.2 Purchase Flow

**Test Scenario:** Purchase gift cards from marketplace

**Steps:**
1. Navigate to `/admin/gift-card-marketplace` (admin)
2. Or `/gift-cards` (client with marketplace access)
3. Click "Purchase" on any pool
4. Should navigate to `/gift-cards/purchase/:poolId`
5. Enter quantity (e.g., 10)
6. Verify purchase summary shows correct totals
7. Verify balance calculation is correct
8. Click "Purchase"
9. Verify success page displays

**Expected Results:**
- ✅ URL shows `/gift-cards/purchase/:poolId`
- ✅ Pool details display correctly
- ✅ Quantity input validated
- ✅ Purchase summary calculates correctly
- ✅ Balance shows current and after-purchase amounts
- ✅ Insufficient balance shows warning
- ✅ Purchase completes successfully
- ✅ Success page displays with order summary
- ✅ Pool inventory updates
- ✅ Client balance deducted

### 2.3 Record Purchase (Admin Only)

**Test Scenario:** Record inventory purchase

**Steps:**
1. Navigate to `/admin/gift-cards/record-purchase`
2. Select a brand
3. Enter supplier details
4. Enter quantity and cost per card
5. Add notes (optional)
6. Click "Record Purchase"
7. Verify success page
8. Check recent purchases table

**Expected Results:**
- ✅ URL shows `/admin/gift-cards/record-purchase`
- ✅ Form validates required fields
- ✅ Purchase summary calculates correctly
- ✅ Success page displays
- ✅ Recent purchases table shows new entry
- ✅ Can record another purchase
- ✅ Entry in `admin_gift_card_inventory` table

### 2.4 Edit Pricing (Admin Only)

**Test Scenario:** Update pool pricing

**Steps:**
1. Navigate to any pool detail page
2. Click "Edit Pricing" (admin only)
3. Should navigate to `/admin/gift-cards/pools/:poolId/pricing`
4. Update sale price
5. Update min/max quantities
6. View pricing analysis sidebar
7. Click "Save Pricing"
8. Verify redirect back to pool detail

**Expected Results:**
- ✅ URL shows `/admin/gift-cards/pools/:poolId/pricing`
- ✅ Current values pre-populated
- ✅ Pricing analysis updates in real-time
- ✅ Profit margin calculated correctly
- ✅ Warnings shown for unusual pricing
- ✅ Save completes successfully
- ✅ Returns to pool detail page
- ✅ Updated prices reflected

---

## 3. Complete Workflow Testing

### 3.1 Campaign Creation to Gift Card Delivery

**End-to-End Test:**

1. **Create Campaign:**
   - Navigate to `/campaigns/new`
   - Complete wizard steps
   - Upload codes or select contact list
   - Link landing page
   - Configure gift card reward
   - Set delivery settings
   - Publish campaign

2. **Form Submission:**
   - Visit form public URL
   - Enter gift card code
   - Submit form with email

3. **Verify Email:**
   - Check email inbox
   - Verify gift card delivered
   - Verify confirmation email

4. **Check Analytics:**
   - Navigate to campaign detail
   - Verify analytics display
   - Check redemption count

**Success Criteria:**
- ✅ Campaign created successfully
- ✅ Form submission works
- ✅ Email delivered with gift card
- ✅ Analytics show submission
- ✅ Gift card pool count decreased
- ✅ Email logs show delivery

### 3.2 Call Center Redemption Flow

**End-to-End Test:**

1. **Call Center Lookup:**
   - Navigate to `/call-center`
   - Enter redemption code
   - Verify recipient details display

2. **Provision Gift Card:**
   - Select email delivery
   - Enter email address
   - Click "Provision Gift Card"
   - Verify success message

3. **Verify Delivery:**
   - Check email inbox
   - Verify gift card code present
   - Check delivery logs

4. **Check Pool:**
   - Navigate to pool detail page
   - Verify available count decreased
   - Verify claimed count increased

**Success Criteria:**
- ✅ Code lookup works
- ✅ Recipient details display
- ✅ Gift card provisioned
- ✅ Email delivered
- ✅ Pool counts updated atomically
- ✅ No duplicate provisions

### 3.3 Admin Gift Card Management

**End-to-End Test:**

1. **View Inventory:**
   - Navigate to `/gift-cards` as admin
   - View all pools

2. **Record Purchase:**
   - Navigate to `/admin/gift-cards/record-purchase`
   - Record new inventory purchase
   - Verify added to history

3. **Upload Cards:**
   - Navigate to pool detail
   - Upload CSV with cards
   - Verify cards added to pool

4. **Update Pricing:**
   - Click "Edit Pricing"
   - Update prices
   - Save and verify

5. **Sell to Client:**
   - Navigate to marketplace
   - Client purchases cards
   - Verify transfer

**Success Criteria:**
- ✅ All admin functions accessible
- ✅ Purchases recorded accurately
- ✅ Card uploads work
- ✅ Pricing updates save
- ✅ Sales transactions complete
- ✅ All audit trails created

---

## 4. Data Integrity Testing

### 4.1 Atomic Claiming Test

**Purpose:** Verify race condition prevention

**Test Method:**
```sql
-- Create a test script to claim cards simultaneously
-- Run multiple claims at exact same time
-- Verify no duplicate claims occur

SELECT 
  gc.card_code,
  gc.status,
  gc.recipient_id,
  COUNT(*) OVER (PARTITION BY gc.id) as claim_count
FROM gift_cards gc
WHERE gc.status = 'claimed'
  AND gc.recipient_id IS NOT NULL
HAVING COUNT(*) OVER (PARTITION BY gc.id) > 1;

-- Should return 0 rows (no duplicates)
```

**Expected Result:**
- ✅ Zero duplicate claims
- ✅ Each card claimed only once
- ✅ Pool counts accurate

### 4.2 Campaign-Audience Links

**Verification:**
```sql
-- Check campaigns have audiences
SELECT 
  c.id,
  c.name,
  c.audience_id,
  cl.list_name,
  (SELECT COUNT(*) FROM recipients r WHERE r.campaign_id = c.id) as recipient_count
FROM campaigns c
LEFT JOIN contact_lists cl ON c.audience_id = cl.id
WHERE c.status != 'draft'
ORDER BY c.created_at DESC
LIMIT 20;

-- All non-draft campaigns should have audience_id
```

**Expected Result:**
- ✅ All campaigns have audience_id
- ✅ Audience names display
- ✅ Recipient counts > 0
- ✅ Analytics display correctly

### 4.3 Pool Count Accuracy

**Verification:**
```sql
-- Verify pool math is correct
SELECT 
  pool_name,
  total_cards,
  available_cards,
  claimed_cards,
  delivered_cards,
  failed_cards,
  (available_cards + claimed_cards + delivered_cards + failed_cards) as calculated_total,
  total_cards = (available_cards + claimed_cards + delivered_cards + failed_cards) as counts_match
FROM gift_card_pools
WHERE total_cards > 0
ORDER BY pool_name;

-- All rows should have counts_match = true
```

**Expected Result:**
- ✅ All pool counts add up correctly
- ✅ No negative numbers
- ✅ Available cards accurate

---

## 5. Performance Testing

### 5.1 Page Load Times

**Test Pages:**
- `/gift-cards` → Should load < 2s
- `/gift-cards/pools/:poolId` → Should load < 2s  
- `/gift-cards/purchase/:poolId` → Should load < 1s
- `/campaigns` → Should load < 2s
- `/dashboard` → Should load < 2s

**Measurement:**
- Open browser DevTools
- Go to Network tab
- Measure "Load" time
- Check for console errors

**Expected Results:**
- ✅ All pages load < 3 seconds
- ✅ No JavaScript errors
- ✅ No failed network requests
- ✅ Smooth animations

### 5.2 Database Query Performance

**Check Slow Queries:**
```sql
-- Enable query logging (if not already)
-- Check for slow queries in Supabase dashboard
-- Look for queries > 1 second

-- Verify indexes are being used
EXPLAIN ANALYZE
SELECT * FROM gift_cards 
WHERE pool_id = 'some-uuid' 
  AND status = 'available'
LIMIT 1;

-- Should use index on (pool_id, status)
```

---

## 6. Security Testing

### 6.1 RLS Policy Verification

**Test Non-Admin Access:**
1. Login as non-admin user
2. Try to access `/admin/gift-cards/record-purchase`
3. Should be blocked or redirected
4. Try to view other client's data
5. Should return empty or error

**Expected Results:**
- ✅ Admin routes protected
- ✅ Client data isolated
- ✅ RLS policies enforced
- ✅ No unauthorized access

### 6.2 Email Security

**Verify:**
- Email addresses validated
- No SQL injection in email content
- Gift card codes not exposed in URLs
- Tracking IDs secure

---

## 7. MVP Verification

### 7.1 Run System Checks

**Automated Checks:**
```bash
# Navigate to /admin/mvp-verification
# Click "Run All Checks"
# Wait for completion
# Review results
```

**Manual Checks:**
- [ ] Database: All tables present
- [ ] Auth: Users can login
- [ ] Campaigns: Can create and view
- [ ] Gift Cards: Can provision and deliver
- [ ] Forms: Can submit and process
- [ ] Analytics: Data displays correctly
- [ ] Emails: Delivery working
- [ ] Navigation: All pages accessible

### 7.2 Critical Path Testing

**User Journey 1: Create Campaign**
```
/campaigns → /campaigns/new → Complete wizard → /campaigns/:id → View analytics
```

**User Journey 2: Gift Card Redemption**
```
/call-center → Enter code → Provision card → Email sent → Verify delivery
```

**User Journey 3: Admin Management**
```
/gift-cards → View pool → /gift-cards/pools/:id → Edit → Save → Verify changes
```

---

## 8. Browser Compatibility

### Test Browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if Mac available)
- [ ] Mobile browsers (responsive design)

### Test Features in Each:
- Login/authentication
- Page navigation
- Form submissions
- Dialog/modal interactions
- Responsive layouts

---

## 9. Error Handling Testing

### 9.1 Network Errors

**Test:**
- Disconnect internet
- Try to submit form
- Verify error message displays
- Reconnect and retry

**Expected:**
- ✅ User-friendly error message
- ✅ No crash or blank screen
- ✅ Can retry after reconnection

### 9.2 Invalid Data

**Test:**
- Enter invalid email format
- Enter negative quantities
- Submit empty required fields
- Enter non-existent IDs in URLs

**Expected:**
- ✅ Validation errors display
- ✅ Helpful error messages
- ✅ No database errors
- ✅ Graceful fallbacks

### 9.3 Permission Errors

**Test:**
- Access admin routes as non-admin
- Try to view other client's data
- Attempt unauthorized operations

**Expected:**
- ✅ Access denied messages
- ✅ Redirect to appropriate page
- ✅ No data leakage

---

## 10. Load Testing

### 10.1 Concurrent Users

**Simulate:**
- Multiple users accessing simultaneously
- Multiple gift card provisions at once
- Concurrent form submissions

**Tools:**
- Manual testing with multiple tabs
- Or use: Artillery, k6, or JMeter

**Expected:**
- ✅ No race conditions
- ✅ Atomic operations work
- ✅ No duplicate card claims
- ✅ Accurate pool counts

### 10.2 Large Data Sets

**Test:**
- Campaign with 10,000+ recipients
- Pool with 1,000+ cards
- 100+ form submissions

**Expected:**
- ✅ Pages load without timeout
- ✅ Tables paginate correctly
- ✅ Exports complete successfully
- ✅ No memory issues

---

## 11. Regression Testing

### After Each Deployment:

**Quick Smoke Test (5 minutes):**
1. Login works
2. Dashboard loads
3. Create new campaign
4. View gift cards
5. No console errors

**Full Regression (30 minutes):**
- Run all critical path tests
- Verify email delivery
- Test navigation flows
- Check data integrity
- Review error logs

---

## 12. Production Monitoring

### Day 1 Checklist:
- [ ] Monitor Supabase logs for errors
- [ ] Check Resend dashboard for email delivery rate
- [ ] Review `email_delivery_logs` for failures
- [ ] Check gift card pool counts
- [ ] Verify campaign analytics display
- [ ] Monitor page load times
- [ ] Check for user-reported issues

### Week 1 Checklist:
- [ ] Email deliverability > 95%
- [ ] Zero critical errors
- [ ] Page performance acceptable
- [ ] Users can complete core workflows
- [ ] No data integrity issues
- [ ] Pool counts remain accurate

### Metrics to Track:
```sql
-- Email delivery rate
SELECT 
  delivery_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_delivery_logs
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY delivery_status;

-- Gift card provisioning rate
SELECT 
  DATE(delivered_at) as date,
  COUNT(*) as cards_delivered,
  COUNT(DISTINCT campaign_id) as campaigns,
  COUNT(DISTINCT recipient_id) as recipients
FROM gift_card_deliveries
WHERE delivered_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(delivered_at)
ORDER BY date DESC;

-- Pool health
SELECT 
  pool_name,
  available_cards,
  total_cards,
  ROUND(available_cards * 100.0 / NULLIF(total_cards, 0), 1) as availability_percent
FROM gift_card_pools
WHERE total_cards > 0
ORDER BY availability_percent ASC;
```

---

## 13. Known Issues & Workarounds

### Issue 1: Resend Not Configured
**Symptom:** Emails not sending  
**Check:** `RESEND_API_KEY` environment variable  
**Fix:** Configure in Supabase secrets  
**Workaround:** Use SMS delivery temporarily

### Issue 2: Pool Counts Incorrect
**Symptom:** Available cards doesn't match reality  
**Check:** Run pool count verification SQL  
**Fix:** Recalculate pool counts  
**Script:**
```sql
UPDATE gift_card_pools p
SET 
  total_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = p.id),
  available_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = p.id AND status = 'available'),
  claimed_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = p.id AND status = 'claimed'),
  delivered_cards = (SELECT COUNT(*) FROM gift_cards WHERE pool_id = p.id AND status = 'delivered');
```

### Issue 3: Navigation Doesn't Work
**Symptom:** Clicking pool doesn't navigate  
**Check:** Browser console for errors  
**Fix:** Clear cache and hard refresh  
**Workaround:** Type URL manually

---

## 14. Testing Sign-Off

### Before Marking MVP Complete:

**Functional Testing:**
- [ ] All email types send successfully
- [ ] All 4 new pages load and function
- [ ] Navigation works throughout app
- [ ] Gift card workflows complete end-to-end
- [ ] Campaign creation works
- [ ] Form submission works
- [ ] Call center redemption works
- [ ] Analytics display correctly

**Data Integrity:**
- [ ] Pool counts accurate
- [ ] No duplicate card claims
- [ ] Campaign-audience links fixed
- [ ] Email logs tracking properly
- [ ] No data leakage between clients

**Performance:**
- [ ] Pages load < 3 seconds
- [ ] No console errors
- [ ] No network timeouts
- [ ] Smooth user experience

**Security:**
- [ ] RLS policies enforced
- [ ] Admin routes protected
- [ ] Email addresses validated
- [ ] No sensitive data exposed

**Documentation:**
- [ ] Deployment guide complete
- [ ] Testing guide complete
- [ ] User-facing docs updated
- [ ] Known issues documented

---

## ✅ Testing Complete Criteria

**MVP is production-ready when:**
1. All functional tests pass
2. No critical bugs discovered
3. Performance meets targets
4. Security verified
5. Data integrity confirmed
6. Email system operational
7. Navigation flows work
8. Analytics display correctly
9. Documentation complete
10. Team sign-off received

---

## 📊 Test Results Template

**Date:** _________________  
**Tester:** _________________  
**Environment:** _________________

### Results Summary:
- Total Tests: ___ 
- Passed: ___
- Failed: ___
- Blocked: ___

### Critical Issues Found:
1. _________________
2. _________________

### Recommendations:
_________________

**Sign-Off:** [ ] Approved for Production

---

*Generated: MVP Testing Guide*
*Context improved by Giga AI - Uses campaign condition system and reward distribution flow documentation*


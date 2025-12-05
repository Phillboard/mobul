# MVP Testing Guide

Complete testing checklist for all MVP features after deployment.

---

## Prerequisites

Before testing:
- [ ] All edge functions deployed
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] Demo data populated (campaigns, contacts, gift card inventory)

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
- Email received with gift card code
- Email has proper formatting and branding
- Gift card details displayed correctly
- Links (if any) are clickable
- Entry in `email_delivery_logs` table with status "sent"

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
- Confirmation email received
- Form submission details included
- Gift card included if applicable
- Professional formatting

### 1.3 Inventory Alert Email

**Test Scenario:** Trigger low inventory alert

**Steps:**
1. Navigate to **Rewards** → **Gift Card Inventory**
2. Find a brand/denomination with low inventory (< 10 cards)
3. Or manually trigger by provisioning cards
4. Check admin email (ALERT_EMAIL_RECIPIENTS)

**Expected Results:**
- Alert email received by admins
- Pool details clearly displayed
- Severity level shown
- Link to pool detail page works

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
- URL shows `/gift-cards/pools/:poolId`
- Pool details display correctly
- All tabs are accessible
- Cards table shows data
- Balance history displays
- Settings tab visible for admins only
- Export downloads CSV file
- Back button returns to `/gift-cards`
- Breadcrumb navigation works

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
- URL shows `/gift-cards/purchase/:poolId`
- Pool details display correctly
- Quantity input validated
- Purchase summary calculates correctly
- Balance shows current and after-purchase amounts
- Insufficient balance shows warning
- Purchase completes successfully
- Success page displays with order summary
- Pool inventory updates
- Client balance deducted

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
- Campaign created successfully
- Form submission works
- Email delivered with gift card
- Analytics show submission
- Gift card pool count decreased
- Email logs show delivery

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
- Code lookup works
- Recipient details display
- Gift card provisioned
- Email delivered
- Pool counts updated atomically
- No duplicate provisions

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
- Zero duplicate claims
- Each card claimed only once
- Pool counts accurate

### 4.2 Inventory Count Accuracy

**Verification:**
```sql
-- Verify inventory counts are correct
SELECT 
  gb.brand_name,
  gd.denomination,
  COUNT(*) FILTER (WHERE gi.status = 'available') as available_count,
  COUNT(*) FILTER (WHERE gi.status = 'provisioned') as provisioned_count,
  COUNT(*) FILTER (WHERE gi.status = 'delivered') as delivered_count,
  COUNT(*) as total_count
FROM gift_card_inventory gi
JOIN gift_card_brands gb ON gi.brand_id = gb.id
JOIN gift_card_denominations gd ON gi.denomination_id = gd.id
GROUP BY gb.brand_name, gd.denomination
ORDER BY gb.brand_name, gd.denomination;

-- All counts should be accurate
```

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
- All pages load < 3 seconds
- No JavaScript errors
- No failed network requests
- Smooth animations

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
- Admin routes protected
- Client data isolated
- RLS policies enforced
- No unauthorized access

---

## 7. Browser Compatibility

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

## 8. Production Monitoring

### Day 1 Checklist:
- [ ] Monitor Supabase logs for errors
- [ ] Check Resend dashboard for email delivery rate
- [ ] Review `email_delivery_logs` for failures
- [ ] Check gift card pool counts
- [ ] Verify campaign analytics display
- [ ] Monitor page load times
- [ ] Check for user-reported issues

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
```

---

## Testing Sign-Off

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


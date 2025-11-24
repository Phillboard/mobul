# MVP Redemption System - Testing Guide

## Pre-Launch Testing Checklist

This guide provides step-by-step instructions to validate all critical redemption flows before production launch.

---

## Test Environment Setup

### Prerequisites
- [ ] Test gift card pool with 100+ cards loaded
- [ ] Test recipient with valid redemption code
- [ ] Test phone number for SMS testing
- [ ] Access to Supabase logs
- [ ] Access to Twilio logs (for SMS verification)

---

## 1. Happy Path Tests ✅

### Test 1.1: First-Time Redemption (Call Center)
**Steps:**
1. Navigate to `/call-center-redemption`
2. Enter valid redemption code: `TEST-1234`
3. Press Enter or click "Look Up"
4. Verify customer details display correctly
5. Verify gift card details display
6. Click "Send Card via SMS"
7. Verify SMS sent confirmation

**Expected Results:**
- ✅ Customer found in <2 seconds
- ✅ Gift card provisioned from pool
- ✅ SMS sent successfully
- ✅ SMS received on test phone
- ✅ Pool inventory decremented by 1
- ✅ Card status changed to "claimed"
- ✅ Entry created in `sms_delivery_log` with status "sent"

**Database Verification:**
```sql
-- Check card was claimed
SELECT status, claimed_at, claimed_by_recipient_id 
FROM gift_cards 
WHERE card_code = '[CODE_FROM_TEST]';

-- Check SMS was logged
SELECT delivery_status, twilio_message_sid 
FROM sms_delivery_log 
WHERE gift_card_id = '[CARD_ID]';

-- Check pool inventory
SELECT available_cards, claimed_cards 
FROM gift_card_pools 
WHERE id = '[POOL_ID]';
```

---

### Test 1.2: Already Redeemed Code
**Steps:**
1. Use the same redemption code from Test 1.1
2. Enter code again
3. Click "Look Up"

**Expected Results:**
- ✅ "Already Redeemed" badge shown
- ✅ Original gift card details displayed
- ✅ Redemption date shown
- ✅ Can still resend SMS if needed
- ✅ No new card claimed from pool

---

### Test 1.3: Self-Service Redemption (Landing Page)
**Steps:**
1. Navigate to landing page with PURL: `/landing/[token]`
2. Enter valid redemption code
3. Submit form

**Expected Results:**
- ✅ Code validated successfully
- ✅ Gift card details displayed with celebration animation
- ✅ SMS sent automatically (if phone on file)
- ✅ "Screenshot this" message shown
- ✅ Card properly claimed in database

---

## 2. SMS Retry Logic Tests ✅

### Test 2.1: Simulate Twilio Failure
**Setup:**
1. Temporarily set invalid Twilio credentials in Supabase secrets
2. Attempt redemption with valid code

**Expected Results:**
- ✅ Redemption completes successfully
- ✅ Card still provisioned
- ✅ SMS marked as "failed" in `sms_delivery_log`
- ✅ `retry_count` = 0
- ✅ Within 5 minutes, automatic retry attempted (check cron job)

**Database Verification:**
```sql
-- Check retry attempts
SELECT 
  id,
  delivery_status,
  retry_count,
  last_retry_at,
  error_message
FROM sms_delivery_log
WHERE gift_card_id = '[CARD_ID]'
ORDER BY created_at DESC;
```

**Cleanup:**
1. Restore correct Twilio credentials
2. Wait for next retry (should succeed)
3. Verify SMS delivered

---

### Test 2.2: Manual SMS Resend
**Steps:**
1. Complete a redemption
2. Click "Resend SMS" button
3. Verify new SMS sent

**Expected Results:**
- ✅ New entry in `sms_delivery_log`
- ✅ SMS received on phone
- ✅ Button shows "Sending..." while in progress
- ✅ Success toast shown

---

## 3. Pool Exhaustion Tests 🚨

### Test 3.1: Low Inventory Warning
**Setup:**
1. Drain test pool to exactly 20 cards (or low_stock_threshold value)
2. Attempt redemption

**Expected Results:**
- ✅ Redemption completes successfully
- ✅ WARNING alert sent to admins (check email/Slack)
- ✅ Alert logged in `error_logs` table
- ✅ Inventory widget shows yellow warning

**Alert Verification:**
```sql
SELECT * FROM error_logs
WHERE error_type = 'inventory_alert'
AND error_code = 'warning'
ORDER BY occurred_at DESC
LIMIT 1;
```

---

### Test 3.2: Pool Empty
**Setup:**
1. Drain test pool to 0 cards
2. Attempt redemption

**Expected Results:**
- ✅ Redemption BLOCKED (returns error)
- ✅ CRITICAL alert sent immediately
- ✅ Error message: "We're temporarily out of gift cards..."
- ✅ Support phone number shown
- ✅ Inventory widget shows red "Empty" badge

**User-Facing Error:**
```
"We're temporarily out of gift cards. Our team has been notified. 
Please try again in 30 minutes or call support at 1-800-XXX-XXXX."
```

---

### Test 3.3: Race Condition (Last Card)
**Setup:**
1. Set pool to exactly 1 card
2. Open 2 browser tabs
3. Attempt redemption simultaneously from both tabs

**Expected Results:**
- ✅ Only ONE redemption succeeds
- ✅ Second redemption gets "Pool Empty" error
- ✅ No duplicate claims
- ✅ SKIP LOCKED prevents double-claiming

**Database Verification:**
```sql
-- Verify only 1 card claimed
SELECT COUNT(*) 
FROM gift_cards
WHERE pool_id = '[POOL_ID]'
AND status = 'claimed'
AND claimed_at > NOW() - INTERVAL '1 minute';
-- Should return 1
```

---

## 4. Rate Limiting Tests 🔒

### Test 4.1: IP Rate Limit
**Steps:**
1. Attempt 6 redemptions from same IP within 5 minutes
2. Use different valid codes each time

**Expected Results:**
- ✅ First 5 attempts succeed
- ✅ 6th attempt returns 429 (Too Many Requests)
- ✅ Error message: "Too many attempts. Please wait a few minutes..."
- ✅ After 5 minutes, rate limit resets

**Rate Limit Verification:**
```sql
SELECT COUNT(*) as attempt_count
FROM rate_limit_tracking
WHERE identifier = '[IP_ADDRESS]'
AND action = 'validate-gift-card-code'
AND created_at > NOW() - INTERVAL '5 minutes';
-- Should show 6 attempts
```

---

### Test 4.2: Per-Code Rate Limit
**Steps:**
1. Attempt same code 11 times from different IPs within 1 hour

**Expected Results:**
- ✅ First 10 attempts processed (may return "invalid" but not rate limited)
- ✅ 11th attempt returns rate limit error
- ✅ Prevents brute force guessing

---

### Test 4.3: Failed Attempt Lockout
**Steps:**
1. Attempt 21 invalid codes from same IP within 1 hour

**Expected Results:**
- ✅ After 20 failed attempts, IP blocked
- ✅ All subsequent requests return 429
- ✅ Block persists for 1 hour
- ✅ Logged in `rate_limit_tracking`

---

## 5. Stuck Card Cleanup Tests 🧹

### Test 5.1: Card Stuck After SMS Failure
**Setup:**
1. Claim a card (status = "claimed")
2. Simulate SMS failure (no delivery)
3. Wait 10 minutes
4. Check cleanup job execution

**Expected Results:**
- ✅ After 10 minutes, card status returns to "available"
- ✅ `claimed_at` set to NULL
- ✅ `claimed_by_recipient_id` set to NULL
- ✅ Cleanup logged in `system_alerts`
- ✅ Card can be claimed again

**Cron Job Verification:**
```sql
-- Check cleanup function ran
SELECT * FROM system_alerts
WHERE alert_type = 'gift_card_cleanup'
ORDER BY created_at DESC
LIMIT 1;

-- Verify card released
SELECT status, claimed_at 
FROM gift_cards
WHERE id = '[STUCK_CARD_ID]';
-- status should be 'available', claimed_at should be NULL
```

---

### Test 5.2: Card NOT Stuck (SMS Succeeded)
**Setup:**
1. Complete normal redemption with successful SMS
2. Wait 10 minutes
3. Verify cleanup does NOT affect this card

**Expected Results:**
- ✅ Card remains in "claimed" status
- ✅ Cleanup job ignores cards with successful delivery
- ✅ No changes to card record

---

## 6. Error Message Tests 💬

### Test 6.1: Invalid Code Format
**Test Inputs:**
- `ABC` (too short)
- `ABCDEFGHIJKLMNOP` (too long)
- `ABC@1234` (special characters)
- `abc-1234` (lowercase - should auto-uppercase)

**Expected Results:**
- ✅ Friendly error: "We couldn't find that code. Please double-check..."
- ✅ No technical error messages shown
- ✅ Input auto-converts to uppercase

---

### Test 6.2: Code Not Found
**Steps:**
1. Enter valid format but non-existent code: `ZZZZZ-9999`

**Expected Results:**
- ✅ Error: "We couldn't find that code. Please double-check and try again."
- ✅ No system errors exposed

---

### Test 6.3: Pending Approval Code
**Steps:**
1. Use code with `status = 'pending_approval'`

**Expected Results:**
- ✅ Error: "Your code is being reviewed. You'll receive a call within 24 hours."
- ✅ Contact info shown if available

---

## 7. Real-Time Inventory Tests 📊

### Test 7.1: Inventory Widget Refresh
**Steps:**
1. Open call center dashboard
2. Note current inventory count
3. From another tab, claim a card from same pool
4. Wait 30 seconds (auto-refresh interval)

**Expected Results:**
- ✅ Inventory count decrements by 1
- ✅ Progress bar updates
- ✅ Color coding changes if threshold crossed (green → yellow → red)

---

### Test 7.2: Multiple Pool Monitoring
**Steps:**
1. Set up campaign with 3 different pools
2. Monitor all 3 on dashboard
3. Drain one pool while others remain full

**Expected Results:**
- ✅ Only drained pool shows red alert
- ✅ Other pools remain green
- ✅ Each widget updates independently

---

## 8. Load Testing 🚀

### Test 8.1: 10 Concurrent Redemptions
**Setup:**
1. Create test script to submit 10 redemptions simultaneously
2. Use different valid codes for each
3. All from same pool

**Expected Results:**
- ✅ All 10 complete successfully
- ✅ No duplicate claims
- ✅ Average response time <2 seconds
- ✅ Pool inventory correct (decremented by 10)

**Load Test Script (example):**
```javascript
// Run in browser console or with Node.js
async function loadTest() {
  const codes = ['CODE1', 'CODE2', 'CODE3', ...]; // 10 codes
  const promises = codes.map(code => 
    supabase.functions.invoke('provision-gift-card-for-call-center', {
      body: { redemptionCode: code }
    })
  );
  
  const start = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - start;
  
  console.log('Total time:', duration, 'ms');
  console.log('Avg per request:', duration / 10, 'ms');
  console.log('Success count:', results.filter(r => r.data.success).length);
}
```

---

### Test 8.2: 50 Concurrent Redemptions
**Setup:**
1. Same as above but with 50 simultaneous requests
2. Across 5 different pools (10 per pool)

**Expected Results:**
- ✅ All complete within 10 seconds total
- ✅ No errors or timeouts
- ✅ Database remains consistent

---

## 9. Edge Cases & Error Recovery 🔧

### Test 9.1: Network Timeout During Claim
**Setup:**
1. Start redemption
2. Simulate network interruption (browser dev tools → offline)
3. Wait 30 seconds
4. Restore network

**Expected Results:**
- ✅ User sees error message
- ✅ Card NOT stuck in claimed state
- ✅ Retry works after network restored

---

### Test 9.2: Browser Refresh Mid-Redemption
**Steps:**
1. Start redemption
2. Immediately refresh page
3. Re-enter same code

**Expected Results:**
- ✅ Either shows "already redeemed" (if completed)
- ✅ Or allows redemption (if timed out)
- ✅ No duplicate cards issued

---

### Test 9.3: Twilio Webhook Delayed
**Setup:**
1. Send SMS
2. Twilio webhook delayed >1 minute
3. Check delivery status

**Expected Results:**
- ✅ Initial status shows "sent"
- ✅ Webhook eventually updates status to "delivered"
- ✅ No duplicate SMS sent

---

## 10. Agent Experience Tests 🎧

### Test 10.1: Keyboard Shortcuts
**Steps:**
1. Enter redemption code
2. Press Enter (instead of clicking button)

**Expected Results:**
- ✅ Redemption triggered by Enter key
- ✅ No need to click button

---

### Test 10.2: Copy All Details
**Steps:**
1. Complete redemption
2. Click "Copy All" button

**Expected Results:**
- ✅ All card details copied to clipboard
- ✅ Formatted nicely (brand, value, code, number, expiry)
- ✅ Can paste into email or chat

---

### Test 10.3: Start New Redemption
**Steps:**
1. Complete redemption
2. Click "Start New"

**Expected Results:**
- ✅ Form clears
- ✅ Ready for next code
- ✅ Previous result hidden

---

## Post-Test Verification

### Database Consistency Check
```sql
-- Verify no orphaned claims
SELECT COUNT(*) FROM gift_cards
WHERE status = 'claimed'
AND claimed_at < NOW() - INTERVAL '15 minutes'
AND id NOT IN (
  SELECT gift_card_id FROM sms_delivery_log 
  WHERE delivery_status IN ('sent', 'delivered')
);
-- Should return 0

-- Verify pool inventory accuracy
SELECT 
  id,
  pool_name,
  total_cards,
  available_cards,
  claimed_cards,
  (SELECT COUNT(*) FROM gift_cards WHERE pool_id = p.id AND status = 'available') as actual_available,
  (SELECT COUNT(*) FROM gift_cards WHERE pool_id = p.id AND status = 'claimed') as actual_claimed
FROM gift_card_pools p;
-- available_cards should match actual_available
-- claimed_cards should match actual_claimed
```

---

## Monitoring Post-Launch

### Daily Checks (First Week)
- [ ] Review error_logs for any new error types
- [ ] Check SMS delivery success rate (target: 98%+)
- [ ] Verify no stuck cards (run cleanup verification query)
- [ ] Review rate limit logs for suspicious activity
- [ ] Check pool inventory levels

### Weekly Checks (Month 1)
- [ ] Analyze redemption performance metrics
- [ ] Review agent feedback
- [ ] Check for any timeout issues
- [ ] Verify cron jobs running successfully

---

## Success Criteria

Before marking testing as complete, verify:
- ✅ 100% of happy path tests pass
- ✅ All error scenarios handled gracefully
- ✅ SMS retry logic working (3 attempts)
- ✅ Pool exhaustion alerts functioning
- ✅ Rate limiting blocks brute force attempts
- ✅ Stuck card cleanup runs every 10 minutes
- ✅ Load tests pass (10 and 50 concurrent)
- ✅ No database inconsistencies found
- ✅ User-friendly error messages for all scenarios
- ✅ Real-time inventory updates working

---

## Testing Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**All Tests Passed:** ☐ Yes ☐ No  
**Notes:** ___________________  

**Approved for Production:** ☐ Yes ☐ No  
**Approver:** ___________________  
**Date:** ___________________

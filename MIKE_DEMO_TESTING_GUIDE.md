# End-to-End Testing Guide for Mike Demo

This document provides a comprehensive checklist for testing the complete flow before the Mike demonstration.

## Pre-Test Setup Checklist

### 1. Database Setup
- [ ] Run permission migration: `20251203000010_fix_call_center_permissions.sql`
- [ ] Verify user has `calls.confirm_redemption` permission
- [ ] Create test audience with ID noted
- [ ] Import 10 test codes (MIKE0001-MIKE0010)
- [ ] Create test campaign linked to audience
- [ ] Configure campaign with gift card condition ($25 Starbucks)

### 2. Gift Card Inventory
- [ ] Verify Starbucks $25 cards available (minimum 5)
- [ ] Check pool status: `SELECT * FROM gift_card_pools WHERE brand_id = 'starbucks' AND card_value = 25`
- [ ] Confirm cards in 'available' status
- [ ] Note pool ID for testing

### 3. Environment Variables
- [ ] TWILIO_ACCOUNT_SID configured
- [ ] TWILIO_AUTH_TOKEN configured
- [ ] TWILIO_PHONE_NUMBER configured
- [ ] PUBLIC_APP_URL configured (e.g., https://your-app.lovable.app)
- [ ] All edge functions redeployed after env var changes

### 4. UI Verification
- [ ] Call center page visible at `/call-center`
- [ ] Public redemption page loads at `/redeem-gift-card`
- [ ] No console errors on either page
- [ ] Mobile responsive design verified

## Test Case 1: Complete Happy Path

### Step 1: Call Center - Code Entry

**Action:** Navigate to `/call-center`

**Expected:**
- Page loads without errors
- "Enter Redemption Code" form visible
- No permission errors

**Test:**
```
1. Open browser to /call-center
2. Verify page loads
3. Check for any console errors
4. Confirm UI elements present
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 2: Code Lookup

**Action:** Enter test code `MIKE0001` and submit

**Expected:**
- System finds recipient "John Smith"
- Shows customer information
- Display company "AutoCare Plus"
- Shows "SMS Opt-In" section

**Test:**
```typescript
// Verify in database:
SELECT * FROM recipients WHERE redemption_code = 'MIKE0001';
// Should show: approval_status = 'pending', sms_opt_in_status = 'not_sent'
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 3: SMS Opt-In Request

**Action:** Enter phone number `(555) 123-4567` and click "Send Opt-In SMS"

**Expected:**
- Success message displayed
- SMS sent confirmation
- Status updates to "pending"
- Real-time status indicator shows "Waiting for response"

**Verify SMS Content:**
```
Expected message: "This is [Client Name]. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out."
```

**Database Check:**
```sql
SELECT sms_opt_in_status, sms_opt_in_sent_at, phone 
FROM recipients 
WHERE redemption_code = 'MIKE0001';
-- Should show: sms_opt_in_status = 'pending', phone = '+15551234567'
```

**Twilio Check:**
- [ ] Check Twilio console for message SID
- [ ] Verify message delivered
- [ ] Confirm correct phone number
- [ ] Check message content matches template

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 4: Customer Opt-In Response

**Action:** Text "YES" to Twilio number from test phone

**Expected:**
- System receives SMS via webhook
- `handle-sms-response` edge function triggers
- Status updates to "opted_in"
- UI shows green checkmark (real-time update)
- "Approve Gift Card" button becomes enabled

**Database Check:**
```sql
SELECT sms_opt_in_status, sms_opt_in_confirmed_at 
FROM recipients 
WHERE redemption_code = 'MIKE0001';
-- Should show: sms_opt_in_status = 'opted_in', confirmed_at = recent timestamp
```

**Edge Function Log Check:**
- [ ] Check Supabase logs for `handle-sms-response`
- [ ] Verify successful processing
- [ ] Confirm no errors

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 5: Gift Card Approval

**Action:** Click "Approve Gift Card" button

**Expected:**
- Confirmation modal appears
- Click "Confirm Approval"
- Success message: "Gift card approved and SMS sent"
- Status changes to "approved"
- SMS automatically sent to customer

**Database Check:**
```sql
SELECT approval_status, approved_at, approved_by_user_id 
FROM recipients 
WHERE redemption_code = 'MIKE0001';
-- Should show: approval_status = 'approved', timestamps filled
```

**SMS Verification:**
```
Expected message: "Your gift card code has been activated! Redeem it here: https://your-app.lovable.app/redeem-gift-card?code=MIKE0001&campaign=[campaign-id]"
```

**URL Check:**
- [ ] SMS contains correct domain
- [ ] Code parameter is correct
- [ ] Campaign ID is included
- [ ] URL is clickable

**Edge Function Check:**
- [ ] `approve-customer-code` logged successful execution
- [ ] `send-gift-card-sms` invoked
- [ ] Twilio message SID returned

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 6: Customer Clicks Redemption Link

**Action:** Click the SMS link on mobile device (or copy to browser)

**Expected:**
- Public redemption page loads
- Clean, professional design
- Pre-filled code from URL parameter
- Campaign ID passed correctly
- Phone number input field ready
- "Claim Gift Card" button visible

**UI Checks:**
- [ ] Page loads in < 2 seconds
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Gift card icon displays
- [ ] Input fields formatted correctly
- [ ] Code pre-populated from URL

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 7: Customer Enters Information

**Action:** 
1. Enter phone: `(555) 123-4567` (should auto-format)
2. Verify code is `MIKE0001`
3. Click "Claim Gift Card"

**Expected:**
- Phone auto-formats as user types
- Submit button enables when valid
- Loading indicator shows
- "Claiming Your Gift Card..." message

**Frontend Validation:**
- [ ] Phone validates 10 digits required
- [ ] Code is uppercase
- [ ] Submit disabled until both fields valid

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 8: Gift Card Provisioning

**Action:** System processes redemption

**Expected:**
- `redeem-customer-code` edge function executes
- Validates code is approved
- Claims gift card from inventory via `claim_card_atomic`
- Updates recipient status to "redeemed"
- Returns gift card details

**Database Checks:**
```sql
-- Check recipient updated
SELECT approval_status, gift_card_assigned_id, redemption_completed_at 
FROM recipients 
WHERE redemption_code = 'MIKE0001';
-- Should show: approval_status = 'redeemed', gift_card_assigned_id filled

-- Check gift card assigned
SELECT gc.*, rgc.* 
FROM gift_cards gc
JOIN recipient_gift_cards rgc ON rgc.gift_card_id = gc.id
WHERE rgc.recipient_id = (SELECT id FROM recipients WHERE redemption_code = 'MIKE0001');
-- Should show: card status = 'assigned', recipient_id linked

-- Check audit log
SELECT * FROM recipient_audit_log 
WHERE recipient_id = (SELECT id FROM recipients WHERE redemption_code = 'MIKE0001')
ORDER BY created_at DESC LIMIT 5;
-- Should show: 'redeemed' action logged
```

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 9: Gift Card Display

**Action:** Page flips to show gift card

**Expected:**
- Smooth flip animation
- Congratulations message
- Gift card displays with:
  - [ ] Starbucks logo
  - [ ] $25.00 value
  - [ ] Card code (visible/copyable)
  - [ ] Card number (if applicable)
  - [ ] Brand color theme (green for Starbucks)
  - [ ] Expiration date (if applicable)
  - [ ] Usage instructions
  - [ ] "Add to Wallet" buttons

**UI Verification:**
- [ ] Card looks professional
- [ ] All information readable
- [ ] Copy button works
- [ ] Google Wallet button visible (Android)
- [ ] Apple Wallet button visible (iOS)
- [ ] QR code generated
- [ ] Store URL link works

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

### Step 10: Wallet Integration Test

**Action:** Click "Add to Google Wallet" or "Add to Apple Wallet"

**Expected:**
- Wallet pass generated
- Pass contains:
  - [ ] Starbucks branding
  - [ ] $25.00 balance
  - [ ] Barcode/QR code for scanning
  - [ ] Card number
  - [ ] Expiration date
- Pass successfully adds to wallet app

**Test on Both Platforms:**
- [ ] Android: Google Wallet tested
- [ ] iOS: Apple Wallet tested

**Result:** [ ] PASS [ ] FAIL
**Notes:** _________________________________

---

## Test Case 2: Error Scenarios

### Test 2A: Invalid Code

**Action:** Enter non-existent code `INVALID123`

**Expected:**
- Error message: "Redemption code not found"
- No database changes
- User can try again

**Result:** [ ] PASS [ ] FAIL

---

### Test 2B: Already Redeemed

**Action:** Try to redeem `MIKE0001` again after Test Case 1

**Expected:**
- Message: "You've already claimed this gift card"
- Shows previously claimed card details
- No new card provisioned
- Database unchanged

**Database Check:**
```sql
-- Verify no duplicate assignments
SELECT COUNT(*) FROM recipient_gift_cards 
WHERE recipient_id = (SELECT id FROM recipients WHERE redemption_code = 'MIKE0001');
-- Should be 1
```

**Result:** [ ] PASS [ ] FAIL

---

### Test 2C: Code Not Approved Yet

**Action:** Try to redeem `MIKE0002` without approval

**Expected:**
- Error: "Your code has not been activated yet. Please call customer service."
- `needsApproval: true` in response
- Clear instruction for next steps

**Result:** [ ] PASS [ ] FAIL

---

### Test 2D: Customer Opts Out

**Action:** Text "STOP" instead of "YES" in Step 4

**Expected:**
- Status updates to "opted_out"
- Cannot proceed with approval
- Rep sees clear status
- No gift card sent

**Result:** [ ] PASS [ ] FAIL

---

### Test 2E: SMS Not Sent (Twilio Error)

**Simulate:** Temporarily invalid Twilio credentials

**Expected:**
- Error message displayed to rep
- User-friendly error
- Doesn't crash application
- Rep can retry

**Result:** [ ] PASS [ ] FAIL

---

### Test 2F: Out of Inventory

**Simulate:** Set all Starbucks $25 cards to 'assigned'

**Expected:**
- Error: "No gift cards available"
- Graceful handling
- Alert sent to admin
- Customer informed to contact support

**Result:** [ ] PASS [ ] FAIL

---

## Test Case 3: Performance & Load

### Test 3A: Multiple Simultaneous Redemptions

**Action:** Process 5 codes simultaneously (MIKE0001-MIKE0005)

**Expected:**
- All process successfully
- No race conditions
- Each gets unique card
- Atomic transactions work
- No duplicate assignments

**Result:** [ ] PASS [ ] FAIL

---

### Test 3B: Page Load Speed

**Metrics:**
- Call center page load: [ ] < 2 seconds
- Redemption page load: [ ] < 1 second
- Gift card reveal: [ ] < 1 second
- API response times: [ ] < 500ms average

**Result:** [ ] PASS [ ] FAIL

---

## Test Case 4: Mobile Compatibility

### Test 4A: Mobile Safari (iOS)

**Checklist:**
- [ ] Redemption page loads correctly
- [ ] Phone input works
- [ ] Code input works
- [ ] Submit button responsive
- [ ] Gift card displays properly
- [ ] Apple Wallet integration works
- [ ] Copy buttons function

**Result:** [ ] PASS [ ] FAIL

---

### Test 4B: Chrome Mobile (Android)

**Checklist:**
- [ ] All UI elements visible
- [ ] Touch targets appropriate size
- [ ] Google Wallet integration works
- [ ] QR code readable
- [ ] Smooth animations

**Result:** [ ] PASS [ ] FAIL

---

## Test Case 5: Security

### Test 5A: Permission Enforcement

**Action:** Login as user without `calls.confirm_redemption` permission

**Expected:**
- Call center page not visible in menu
- Direct URL access blocked
- Error message appropriate

**Result:** [ ] PASS [ ] FAIL

---

### Test 5B: Code Reuse Prevention

**Action:** Attempt to claim same code twice from different devices

**Expected:**
- Second attempt rejected
- Original card still secure
- No duplicate credits

**Result:** [ ] PASS [ ] FAIL

---

## Post-Test Cleanup

```sql
-- Reset test codes for next test run
UPDATE recipients 
SET 
  approval_status = 'pending',
  sms_opt_in_status = 'not_sent',
  sms_opt_in_sent_at = NULL,
  sms_opt_in_confirmed_at = NULL,
  approved_at = NULL,
  approved_by_user_id = NULL,
  gift_card_assigned_id = NULL,
  redemption_completed_at = NULL
WHERE redemption_code LIKE 'MIKE%';

-- Return gift cards to inventory
UPDATE gift_cards
SET status = 'available', recipient_id = NULL
WHERE id IN (
  SELECT gift_card_id FROM recipient_gift_cards 
  WHERE recipient_id IN (
    SELECT id FROM recipients WHERE redemption_code LIKE 'MIKE%'
  )
);

-- Clear junction table
DELETE FROM recipient_gift_cards
WHERE recipient_id IN (
  SELECT id FROM recipients WHERE redemption_code LIKE 'MIKE%'
);

-- Clear audit logs
DELETE FROM recipient_audit_log
WHERE recipient_id IN (
  SELECT id FROM recipients WHERE redemption_code LIKE 'MIKE%'
);
```

## Final Pre-Demo Checklist

**24 Hours Before Mike Call:**
- [ ] All test cases passed
- [ ] No critical bugs outstanding
- [ ] SMS delivery confirmed working
- [ ] Wallet integration tested both platforms
- [ ] Performance acceptable
- [ ] Mobile experience smooth
- [ ] Error handling graceful
- [ ] Documentation complete

**1 Hour Before Mike Call:**
- [ ] Fresh test run completed
- [ ] Test code MIKE0001 ready (status pending)
- [ ] Twilio balance sufficient
- [ ] Real $5-25 gift card in inventory
- [ ] Mike's phone number obtained
- [ ] Backup plan documented
- [ ] Screen sharing tested
- [ ] Browser tabs organized

**Backup Plans:**
- If Twilio fails → Use email delivery
- If inventory fails → Use test code: `12345678ABCD`
- If public page fails → Show via embedded iframe
- If wallet fails → Show QR code alternative

## Success Criteria

Before going live with Mike:
✅ All Happy Path tests passing
✅ Error scenarios handled gracefully  
✅ SMS delivery working reliably
✅ Gift card provisioning atomic
✅ Wallet integration functional
✅ Mobile experience excellent
✅ Performance acceptable (< 2s loads)
✅ Zero critical bugs

**Status:** [ ] READY FOR MIKE DEMO [ ] NEEDS WORK

**Sign-off:** _______________ Date: ___________


# 🚀 Quick Fix Guide - AB6-1061 Code Lookup

## ⚡ 3-Step Fix

### Step 1: Run Verification (30 seconds)
```sql
-- Copy/paste in Supabase SQL Editor
-- File: scripts/sql/verify-marketplace-setup.sql
```
Look at the bottom "SUMMARY" section.

### Step 2: Run Setup (30 seconds)
```sql
-- Copy/paste in Supabase SQL Editor  
-- File: scripts/sql/setup-campaign-gift-card-config.sql
```
Should see "SETUP COMPLETE!" message.

### Step 3: Test (10 seconds)
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Go to `/call-center`
3. Enter: `AB6-1061`
4. Click "Look Up"
5. ✅ Should see recipient details!

---

## 🔍 Quick Diagnostic

**Still not working? Check these:**

```sql
-- 1. Does recipient exist?
SELECT * FROM recipients WHERE redemption_code = 'AB6-1061';

-- 2. Does campaign exist for this recipient?
SELECT c.* FROM campaigns c
WHERE c.audience_id IN (
  SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061'
);

-- 3. Is gift card configured?
SELECT * FROM campaign_gift_card_config 
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients WHERE redemption_code = 'AB6-1061'
  )
);
```

If any return 0 rows → run setup script!

---

## 📋 What Changed

**Before:** Code looked for `campaign_reward_configs` (doesn't exist)
**After:** Code looks for `campaign_gift_card_config` (exists!)

---

## ✅ Success Looks Like:

Call center shows:
- ✓ Recipient name
- ✓ Campaign name  
- ✓ Gift card brand/value
- ✓ Active conditions
- ✓ Opt-in button enabled

---

## 🆘 Emergency Fallback

If nothing works:
1. Check you're logged in
2. Check user has `calls.confirm_redemption` permission
3. Check browser console for errors
4. Check Supabase logs for query errors

---

**Files Modified:**
- `CallCenterRedemptionPanel.tsx` - Updated query
- `usePoolInventory.ts` - Adapted to marketplace

**Scripts Created:**
- `verify-marketplace-setup.sql` - Diagnostic
- `setup-campaign-gift-card-config.sql` - Auto-fix

---

*Full details: CALL_CENTER_MARKETPLACE_FIX_COMPLETE.md*


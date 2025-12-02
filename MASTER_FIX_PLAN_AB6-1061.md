# 🎯 Master Plan: Fix Call Center System for AB6-1061

## Problem Summary

**Current State:**
- ✅ Contact `AB6-1061` exists in database (500 contacts total)
- ✅ Campaigns exist (spring 262, spring 2689, spring 262, spring 26)
- ❌ **All campaigns show "No audience"**
- ❌ Call center lookup fails: "Code not found"

**Root Cause:**
Campaigns are not linked to audiences/contacts. The system requires:
```
Campaign → Audience → Recipients (contacts)
```
Currently: Campaign → ❌ NULL audience_id

---

## 📋 Step-by-Step Fix Plan

### Step 1: Run Diagnostic (5 minutes)

**Purpose:** Understand exact state of your data

**Action:**
```bash
# In Supabase SQL Editor, run:
scripts/sql/comprehensive-system-diagnostic.sql
```

**What it tells you:**
- Section 1: Details about AB6-1061
- Section 2: All audiences in system
- Section 3: Which campaigns have audiences
- Section 4: How many contacts have no audience
- Section 5: Which campaigns have gift cards configured
- Section 6: Which campaigns have conditions
- **Section 7: EXACT fix needed** ⭐

---

### Step 2: Fix Based on Diagnostic Result

The diagnostic will tell you which script to run:

#### Scenario A: Contacts Have No Audience
**Diagnostic says:** "Contact has no audience_id"

**Fix:**
```sql
-- Run this in Supabase SQL Editor:
-- scripts/sql/fix-orphaned-contacts.sql
```

**What it does:**
- Creates new audience "Imported Contacts - [date]"
- Links all 500 contacts to this audience
- Ready for Step 3

#### Scenario B: Contacts Have Audience, But Campaign Doesn't
**Diagnostic says:** "No campaign linked to contact's audience"

**Fix:**
```sql
-- Run this in Supabase SQL Editor:
-- scripts/sql/fix-link-campaign-to-contacts.sql
-- IMPORTANT: Edit line 5 to set your campaign name!
```

**What it does:**
- Finds audience containing AB6-1061
- Links your chosen campaign to that audience
- Ready for Step 3

---

### Step 3: Configure Gift Card for Campaign (5 minutes)

After campaign is linked to audience:

```sql
-- Run in Supabase SQL Editor:
-- scripts/sql/setup-campaign-gift-card-config.sql
```

**What it does:**
- Adds gift card (Starbucks $25 by default)
- Creates campaign condition ("Sales Call Completion")
- Grants client access to gift card
- Verifies inventory

---

### Step 4: Test Call Center (1 minute)

1. **Refresh browser** (Ctrl+Shift+R)
2. Go to `/call-center`
3. Enter: `AB6-1061`
4. Should work! ✅

---

## 🔍 Understanding Your Campaign Setup

### Current Workflow Issue:

**What you're doing:**
1. Upload contacts with codes ✅
2. Create campaigns ✅
3. **Missing:** Link campaigns to contacts ❌

**What needs to happen:**
1. Upload contacts → Creates/assigns to audience
2. Create campaign → **Link to that audience**
3. Configure gift card for campaign
4. Call center can now find codes

### Proper Workflow Going Forward:

#### When Importing Contacts:

**Option A: Via UI (Recommended)**
1. Go to Contacts → Import
2. Upload CSV
3. **Create or select audience** ← Critical step!
4. Import completes with audience_id set

#### Option B: Via SQL
```sql
-- 1. Create audience first
INSERT INTO audiences (name, client_id, size)
VALUES ('Campaign XYZ Contacts', 'your-client-id', 500);

-- 2. Import contacts with audience_id
INSERT INTO recipients (audience_id, redemption_code, first_name, ...)
VALUES ('audience-id-from-step-1', 'CODE123', 'John', ...);
```

#### When Creating Campaign:

**In Campaign Wizard:**
1. Set campaign name
2. **Select audience** ← Must link here!
3. Configure mail settings
4. **Configure gift card** ← Don't skip!
5. Launch

---

## 📊 Quick Reference: Database Relationships

```
clients
  └─ audiences (contact lists)
      └─ recipients (individual contacts with codes)
      
clients
  └─ campaigns
      ├─ audience_id (MUST BE SET!)
      ├─ campaign_conditions
      └─ campaign_gift_card_config
```

**The Lookup Chain:**
1. Enter code in call center
2. Find recipient with that code
3. Get recipient's audience_id
4. Find campaign with that audience_id ← **Breaks here if NULL!**
5. Get campaign's gift card config
6. Show customer info

---

## 🛠️ All Fix Scripts Created

1. **`comprehensive-system-diagnostic.sql`** - Run this FIRST
2. **`fix-orphaned-contacts.sql`** - If contacts have no audience
3. **`fix-link-campaign-to-contacts.sql`** - Link campaign to audience
4. **`setup-campaign-gift-card-config.sql`** - Configure gift cards

---

## ✅ Success Checklist

After running fixes:

- [ ] Diagnostic shows contact has audience_id
- [ ] Diagnostic shows campaign has audience_id  
- [ ] Diagnostic shows campaign has gift card config
- [ ] Diagnostic shows "SUCCESS" in Section 7
- [ ] Call center accepts code AB6-1061
- [ ] Can proceed through opt-in flow
- [ ] Can approve gift card
- [ ] System provisions card successfully

---

## 🚀 Quick Start

**Run these 3 scripts in order:**

1. **Diagnostic:**
   ```sql
   -- scripts/sql/comprehensive-system-diagnostic.sql
   ```
   
2. **Fix (based on diagnostic):**
   ```sql
   -- If contacts orphaned: scripts/sql/fix-orphaned-contacts.sql
   -- Then: scripts/sql/fix-link-campaign-to-contacts.sql (edit campaign name first!)
   ```
   
3. **Setup gift card:**
   ```sql
   -- scripts/sql/setup-campaign-gift-card-config.sql
   ```

4. **Test:** Enter AB6-1061 in call center ✨

---

## 📞 Next Steps After Fix

1. **Fix current data** (above steps)
2. **Update import workflow** to always set audience_id
3. **Update campaign creation** to always link audience
4. **Test end-to-end** with real demo flow
5. **Document process** for team

---

**Status:** 🔴 AWAITING DIAGNOSTIC RESULTS

**Next Action:** Run `comprehensive-system-diagnostic.sql` and share Section 7 results!



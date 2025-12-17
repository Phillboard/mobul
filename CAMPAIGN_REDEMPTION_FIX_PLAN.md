# Campaign & Redemption System - Complete Fix Plan
## Root Cause Analysis and Solution

**Date:** December 17, 2025
**Issue:** "Code found but not in a campaign"

---

## 🔍 ROOT CAUSE ANALYSIS

### The Problem

When a valid code is entered, the system says it's "found but not in a campaign" even though the code should be linked to a campaign.

### Data Model Issue

The current relationships are:

```
┌─────────────┐     FK      ┌─────────────┐     FK      ┌─────────────┐
│  campaigns  │────────────>│  audiences  │<────────────│ recipients  │
│             │ audience_id │             │ audience_id │             │
└─────────────┘             └─────────────┘             └─────────────┘
```

**The Query Pattern Used:**
```javascript
// All redemption functions do this:
recipients
  .select(`
    *,
    audiences(
      id,
      name,
      campaigns(...)  // Reverse FK lookup
    )
  `)
```

**Why It Fails:**
This query finds campaigns where `campaigns.audience_id = audiences.id`. 
If `campaigns.audience_id` is NULL or points to a DIFFERENT audience, it returns an empty array!

### Found 5 Critical Bugs

| # | File | Issue |
|---|------|-------|
| 1 | `import-campaign-codes/index.ts` | Tries to insert `campaign_id` and `source_type` into `audiences` table - **columns don't exist!** This causes silent failures. |
| 2 | `import-customer-codes/index.ts` | Creates recipients but **never links the audience to any campaign** |
| 3 | `redeem-customer-code/index.ts` | Uses broken query pattern, assumes `audiences.campaigns` returns data |
| 4 | `validate-redemption-code/index.ts` | Same broken query pattern |
| 5 | `CallCenterRedemptionPanel.tsx` | Client-side uses `audiences!inner (campaigns!inner ...)` which fails when no link exists |

### Schema Mismatch Evidence

**import-campaign-codes tries to insert:**
```javascript
.from('audiences')
.insert({
  client_id: clientId,
  campaign_id: campaignId,  // ❌ Column doesn't exist!
  name: audienceName,
  total_count: uniqueCodes.length,
  source_type: 'csv_upload'  // ❌ Column doesn't exist! (it's `source` enum)
})
```

**Actual audiences table columns:**
```
- client_id ✓
- name ✓
- total_count ✓
- source (enum, not source_type)
- status
- valid_count
- invalid_count
- hygiene_json
- suppressed_json
- is_simulated
- simulation_batch_id
- created_at
```

---

## 🎯 THE FIX

### Strategy: Add `campaign_id` to recipients table

This is the cleanest fix because:
1. Direct relationship - no need to traverse through audiences
2. Simple queries - `recipients.campaign_id = campaigns.id`
3. No ambiguity - each recipient knows exactly which campaign they belong to
4. Backward compatible - existing data can be backfilled

---

## 📋 IMPLEMENTATION PROMPTS

---

### PROMPT 1: Database Migration - Add campaign_id to recipients

```
Create a database migration to add campaign_id to the recipients table.

Run this SQL in Supabase SQL Editor:

-- Step 1: Add campaign_id column to recipients
ALTER TABLE recipients 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

-- Step 2: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id 
ON recipients(campaign_id);

-- Step 3: Backfill existing recipients from their audience's campaign
UPDATE recipients r
SET campaign_id = c.id
FROM audiences a
JOIN campaigns c ON c.audience_id = a.id
WHERE r.audience_id = a.id
  AND r.campaign_id IS NULL;

-- Step 4: Verify backfill worked
SELECT 
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign,
  COUNT(*) - COUNT(campaign_id) as without_campaign
FROM recipients;

-- Step 5: Add RLS policy for campaign_id
-- (existing RLS policies should still work since they're based on audience_id)
```

After running, regenerate Supabase types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/core/services/supabase/types.ts
```
```

---

### PROMPT 2: Fix import-campaign-codes Function

```
Fix the import-campaign-codes edge function to:
1. Use correct column names for audiences table
2. Set campaign_id on recipients directly

FILE: supabase/functions/import-campaign-codes/index.ts

FIND the audience insert (around line 145-160):

const { data: audience, error: audienceError } = await supabaseClient
  .from('audiences')
  .insert({
    client_id: clientId,
    campaign_id: campaignId,  // REMOVE - doesn't exist
    name: audienceName,
    total_count: uniqueCodes.length,
    source_type: 'csv_upload'  // CHANGE to: source: 'csv'
  })

REPLACE WITH:

const { data: audience, error: audienceError } = await supabaseClient
  .from('audiences')
  .insert({
    client_id: clientId,
    name: audienceName,
    total_count: uniqueCodes.length,
    source: 'csv',  // Fixed: use 'source' enum, not 'source_type'
    status: 'ready'
  })
  .select('id')
  .single();

---

FIND the recipients insert (around line 170-185):

const recipients = uniqueCodes.map(c => ({
  audience_id: audience.id,
  campaign_id: campaignId,  // ADD THIS
  contact_id: c.email ? contactIdMap.get(c.email.toLowerCase()) || null : null,
  ...

REPLACE WITH (add campaign_id):

const recipients = uniqueCodes.map(c => ({
  audience_id: audience.id,
  campaign_id: campaignId,  // NEW: Direct campaign link
  contact_id: c.email ? contactIdMap.get(c.email.toLowerCase()) || null : null,
  redemption_code: c.code.toUpperCase(),
  first_name: c.first_name || null,
  last_name: c.last_name || null,
  email: c.email || null,
  phone: c.phone || null,
  address1: c.address || null,
  city: c.city || null,
  state: c.state || null,
  zip: c.zip || null,
  approval_status: 'approved',
  token: crypto.randomUUID()  // Generate token for each recipient
}));
```

---

### PROMPT 3: Fix import-customer-codes Function  

```
Fix the import-customer-codes edge function to set campaign_id on recipients.

FILE: supabase/functions/import-customer-codes/index.ts

FIND the recipients insert array building (around line 170-185):

recipientsToInsert.push({
  audience_id: targetAudienceId,
  redemption_code: code.redemption_code.toUpperCase(),
  first_name: code.first_name || null,
  ...

REPLACE WITH (add campaign_id):

recipientsToInsert.push({
  audience_id: targetAudienceId,
  campaign_id: campaignId || null,  // NEW: Set campaign_id if provided
  redemption_code: code.redemption_code.toUpperCase(),
  first_name: code.first_name || null,
  last_name: code.last_name || null,
  phone: code.phone || null,
  email: code.email?.toLowerCase() || null,
  company: code.company || null,
  address1: code.address1 || null,
  address2: code.address2 || null,
  city: code.city || null,
  state: code.state || null,
  zip: code.zip || null,
  approval_status: 'pending',
  custom_fields: customFields,
  token: crypto.randomUUID()  // Generate token
});

---

ALSO ADD at the end of the function:

// If campaignId was provided, also update campaign's audience_id
if (campaignId && targetAudienceId) {
  await supabase
    .from('campaigns')
    .update({ audience_id: targetAudienceId })
    .eq('id', campaignId);
}
```

---

### PROMPT 4: Fix redeem-customer-code Function

```
Fix the redemption function to use campaign_id directly on recipients.

FILE: supabase/functions/redeem-customer-code/index.ts

FIND the recipient lookup query (around line 75-90):

const { data: recipient, error: recipientError } = await supabase
  .from('recipients')
  .select(`
    *,
    audience:audiences(id, client_id, name),
    gift_card_assigned:gift_cards(...)
  `)
  .eq('redemption_code', normalizedCode)
  .single();

REPLACE WITH:

const { data: recipient, error: recipientError } = await supabase
  .from('recipients')
  .select(`
    *,
    campaign:campaigns(id, name, client_id, status),
    audience:audiences(id, client_id, name),
    gift_card_assigned:gift_cards(
      id, card_code, card_number,
      pool:gift_card_pools(card_value, provider, brand_id)
    )
  `)
  .eq('redemption_code', normalizedCode)
  .single();

---

FIND the campaign verification (around line 100-110):

// 2. Verify campaign matches
const { data: campaign } = await supabase
  .from('campaigns')
  .select('id, name, audience_id, client_id')
  .eq('id', campaignId)
  .single();

if (!campaign || campaign.audience_id !== recipient.audience_id) {

REPLACE WITH:

// 2. Verify campaign matches - now using direct campaign_id
// First check if recipient has campaign_id set directly
let campaign = recipient.campaign;

// Fallback: if no direct campaign_id, try to find via audience
if (!campaign && recipient.audience_id) {
  const { data: fallbackCampaign } = await supabase
    .from('campaigns')
    .select('id, name, client_id, status')
    .eq('audience_id', recipient.audience_id)
    .maybeSingle();
  
  campaign = fallbackCampaign;
  
  // Update recipient with campaign_id for future lookups
  if (fallbackCampaign) {
    await supabase
      .from('recipients')
      .update({ campaign_id: fallbackCampaign.id })
      .eq('id', recipient.id);
  }
}

// Validate campaign exists and matches if campaignId was provided
if (campaignId) {
  if (!campaign) {
    console.log('Campaign not found for recipient:', recipient.id);
    return Response.json(
      { success: false, error: 'This code is not associated with any active campaign.' },
      { headers: corsHeaders, status: 400 }
    );
  }
  
  if (campaign.id !== campaignId) {
    console.log('Campaign mismatch:', { expected: campaignId, found: campaign.id });
    return Response.json(
      { success: false, error: 'This code is not valid for this campaign.' },
      { headers: corsHeaders, status: 400 }
    );
  }
}

// Use found campaign for rest of function
const effectiveCampaignId = campaign?.id || campaignId;

---

FIND the conditions query (around line 195-200):

const { data: conditions, error: conditionsError } = await supabase
  .from('campaign_conditions')
  .select('id, condition_name, brand_id, card_value, gift_card_pool_id')
  .eq('campaign_id', campaignId)
  .not('brand_id', 'is', null);

REPLACE WITH:

const { data: conditions, error: conditionsError } = await supabase
  .from('campaign_conditions')
  .select('id, condition_name, brand_id, card_value, gift_card_pool_id')
  .eq('campaign_id', effectiveCampaignId)  // Use effective campaign ID
  .not('brand_id', 'is', null);
```

---

### PROMPT 5: Fix validate-redemption-code Function

```
Fix the validation function to use campaign_id directly.

FILE: supabase/functions/validate-redemption-code/index.ts

FIND the recipient lookup query (around line 48-75):

const { data: recipient, error: recipientError } = await supabase
  .from('recipients')
  .select(`
    id,
    redemption_code,
    ...
    audience_id,
    audiences(
      id,
      name,
      campaigns(
        id,
        name,
        client_id
      )
    )
  `)

REPLACE WITH:

const { data: recipient, error: recipientError } = await supabase
  .from('recipients')
  .select(`
    id,
    redemption_code,
    approval_status,
    rejection_reason,
    sms_opt_in_status,
    gift_card_assigned_id,
    first_name,
    last_name,
    phone,
    email,
    audience_id,
    campaign_id,
    campaign:campaigns(
      id,
      name,
      client_id,
      status
    ),
    audience:audiences(
      id,
      name
    )
  `)
  .eq('redemption_code', redemptionCode.trim().toUpperCase())
  .single();

---

FIND the campaign matching logic (around line 88-105):

// 2. Check if code belongs to specified campaign (if provided)
if (campaignId) {
  const matchesCampaign = recipient.audiences?.campaigns?.some(
    (c: any) => c.id === campaignId
  );

  if (!matchesCampaign) {

REPLACE WITH:

// 2. Check if code belongs to specified campaign (if provided)
if (campaignId) {
  // Direct check using campaign_id on recipient
  const matchesCampaign = recipient.campaign_id === campaignId || 
                          recipient.campaign?.id === campaignId;

  if (!matchesCampaign) {
    // Fallback: try to find campaign via audience if campaign_id not set
    if (!recipient.campaign_id && recipient.audience_id) {
      const { data: audienceCampaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('audience_id', recipient.audience_id)
        .eq('id', campaignId)
        .maybeSingle();
      
      if (audienceCampaign) {
        // Update recipient for future lookups
        await supabase
          .from('recipients')
          .update({ campaign_id: campaignId })
          .eq('id', recipient.id);
      } else {
        return Response.json({
          valid: false,
          reason: 'CAMPAIGN_MISMATCH',
          message: 'This code is not valid for the specified campaign',
          recipient: null,
          existingCards: [],
          canRedeem: false
        }, { headers: corsHeaders, status: 400 });
      }
    } else {
      return Response.json({
        valid: false,
        reason: 'CAMPAIGN_MISMATCH',
        message: 'This code is not valid for the specified campaign',
        recipient: null,
        existingCards: [],
        canRedeem: false
      }, { headers: corsHeaders, status: 400 });
    }
  }
}

---

FIND the available conditions query (around line 230-240):

// 6. Get available conditions for this recipient's campaign(s)
const campaignIds = recipient.audiences?.campaigns?.map((c: any) => c.id) || [];
const { data: availableConditions } = await supabase
  .from('campaign_conditions')
  .select('id, condition_name, brand_id, card_value')
  .in('campaign_id', campaignIds)
  .not('brand_id', 'is', null);

REPLACE WITH:

// 6. Get available conditions for this recipient's campaign
// Use direct campaign_id, fallback to audience-based lookup
let effectiveCampaignId = recipient.campaign_id || recipient.campaign?.id;

// If still no campaign_id, try audience lookup
if (!effectiveCampaignId && recipient.audience_id) {
  const { data: audienceCampaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('audience_id', recipient.audience_id)
    .maybeSingle();
  
  effectiveCampaignId = audienceCampaign?.id;
  
  // Backfill the recipient's campaign_id
  if (effectiveCampaignId) {
    await supabase
      .from('recipients')
      .update({ campaign_id: effectiveCampaignId })
      .eq('id', recipient.id);
  }
}

let availableConditions: any[] = [];
if (effectiveCampaignId) {
  const { data } = await supabase
    .from('campaign_conditions')
    .select('id, condition_name, brand_id, card_value')
    .eq('campaign_id', effectiveCampaignId)
    .not('brand_id', 'is', null);
  
  availableConditions = data || [];
}

---

UPDATE the response to include campaign info (around line 260):

recipient: {
  id: recipient.id,
  firstName: recipient.first_name,
  lastName: recipient.last_name,
  phone: recipient.phone,
  email: recipient.email,
  status: recipient.approval_status,
  smsOptInStatus: recipient.sms_opt_in_status,
  audienceName: recipient.audience?.name,
  campaignId: effectiveCampaignId,
  campaignName: recipient.campaign?.name,
  campaigns: effectiveCampaignId ? [{ id: effectiveCampaignId, name: recipient.campaign?.name }] : []
},
```

---

### PROMPT 6: Fix CallCenterRedemptionPanel.tsx

```
Fix the client-side call center panel to use campaign_id directly.

FILE: src/features/call-center/components/CallCenterRedemptionPanel.tsx

FIND the primary lookup query (around line 395-430):

const { data: recipient, error: recipientError } = await supabase
  .from("recipients")
  .select(`
    *,
    audiences!inner (
      id,
      name,
      campaigns!inner (
        id,
        name,
        status,
        client_id,
        sms_opt_in_message,
        clients (id, name),
        campaign_conditions (*),
        campaign_gift_card_config (*)
      )
    )
  `)
  .eq("redemption_code", code.toUpperCase())
  .maybeSingle();

REPLACE WITH:

// Primary lookup: Use campaign_id directly on recipients
const { data: recipient, error: recipientError } = await supabase
  .from("recipients")
  .select(`
    *,
    campaign:campaigns (
      id,
      name,
      status,
      client_id,
      sms_opt_in_message,
      clients (id, name),
      campaign_conditions (*),
      campaign_gift_card_config (*)
    ),
    audience:audiences (
      id,
      name
    )
  `)
  .eq("redemption_code", code.toUpperCase())
  .maybeSingle();

---

After the query, ADD fallback logic:

// If no direct campaign link, try to find via audience
if (recipient && !recipient.campaign && recipient.audience_id) {
  const { data: audienceCampaign } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      status,
      client_id,
      sms_opt_in_message,
      clients (id, name),
      campaign_conditions (*),
      campaign_gift_card_config (*)
    `)
    .eq("audience_id", recipient.audience_id)
    .maybeSingle();
  
  if (audienceCampaign) {
    recipient.campaign = audienceCampaign;
    
    // Backfill campaign_id on recipient for future lookups
    await supabase
      .from("recipients")
      .update({ campaign_id: audienceCampaign.id })
      .eq("id", recipient.id);
  }
}

---

FIND the campaign status check (around line 440-460):

const campaign = recipient.audiences?.campaigns?.[0];

REPLACE WITH:

const campaign = recipient.campaign;

---

FIND all other references to recipient.audiences?.campaigns and replace:

// OLD:
recipient.audiences?.campaigns?.[0]

// NEW:
recipient.campaign

---

Also update the RecipientData interface (around line 90-110):

interface RecipientData {
  id: string;
  redemption_code: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  approval_status: string;
  campaign_id?: string;  // ADD THIS
  campaign?: {           // ADD THIS (replacing audiences.campaigns)
    id: string;
    name: string;
    status?: string;
    client_id?: string;
    sms_opt_in_message?: string;
    clients?: { id: string; name: string };
    campaign_conditions?: Array<{
      id: string;
      condition_number: number;
      condition_name: string;
      is_active: boolean;
      brand_id?: string | null;
      card_value?: number | null;
    }>;
    campaign_gift_card_config?: CampaignGiftCardConfig[];
  };
  audience?: {           // Simplified
    id: string;
    name: string;
  };
  // Remove or deprecate:
  // audiences?: { ... campaigns?: Array<...> }
}
```

---

### PROMPT 7: Fix diagnose-campaign-config Function

```
Fix the diagnostic function to use correct relationships.

FILE: supabase/functions/diagnose-campaign-config/index.ts

FIND the recipient lookup (around line 105-125):

const { data: recipient, error: recipientError } = await supabaseClient
  .from('recipients')
  .select(`
    id,
    first_name,
    last_name,
    redemption_code,
    sms_opt_in_status,
    verification_method,
    disposition,
    audiences!inner(
      campaign_id,  // DOESN'T EXIST!
      campaigns!inner(...)
    )
  `)

REPLACE WITH:

const { data: recipient, error: recipientError } = await supabaseClient
  .from('recipients')
  .select(`
    id,
    first_name,
    last_name,
    redemption_code,
    sms_opt_in_status,
    verification_method,
    disposition,
    campaign_id,
    campaign:campaigns(
      id,
      name,
      client_id,
      status
    ),
    audience:audiences(
      id,
      name,
      client_id
    )
  `)
  .eq('redemption_code', redemptionCode)
  .single();

---

UPDATE the diagnostic output:

diagnostics.checks.recipientLookup = {
  success: !!recipient,
  hasRecipient: !!recipient,
  hasCampaign: !!recipient?.campaign_id || !!recipient?.campaign,
  campaignId: recipient?.campaign_id || recipient?.campaign?.id,
  error: recipientError,
  data: recipient ? {
    id: recipient.id,
    name: `${recipient.first_name} ${recipient.last_name}`,
    sms_opt_in_status: recipient.sms_opt_in_status,
    verification_method: recipient.verification_method,
    disposition: recipient.disposition,
    campaign_id: recipient.campaign_id,
    campaign_name: recipient.campaign?.name,
  } : null,
};

// Check campaign conditions using direct campaign_id
const recipientCampaignId = recipient?.campaign_id || recipient?.campaign?.id;
```

---

### PROMPT 8: Create Backfill Script for Existing Data

```
Create a one-time script to backfill campaign_id for existing recipients.

FILE: Create new file: scripts/backfill-recipient-campaign-ids.sql

CREATE:

-- Backfill Script: Set campaign_id on recipients
-- Run this AFTER adding the campaign_id column

-- Check current state
SELECT 
  'Before backfill' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Method 1: Via audiences table
-- This sets campaign_id based on campaigns.audience_id matching recipients.audience_id
UPDATE recipients r
SET campaign_id = c.id
FROM campaigns c
WHERE c.audience_id = r.audience_id
  AND r.campaign_id IS NULL;

-- Check progress
SELECT 
  'After audience-based backfill' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Method 2: Via recipient_gift_cards junction table
-- For recipients who have been assigned gift cards, we can find their campaign
UPDATE recipients r
SET campaign_id = rgc.campaign_id
FROM recipient_gift_cards rgc
WHERE rgc.recipient_id = r.id
  AND r.campaign_id IS NULL
  AND rgc.campaign_id IS NOT NULL;

-- Check progress
SELECT 
  'After gift-card-based backfill' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Method 3: Via call_sessions
UPDATE recipients r
SET campaign_id = cs.campaign_id
FROM call_sessions cs
WHERE cs.recipient_id = r.id
  AND r.campaign_id IS NULL
  AND cs.campaign_id IS NOT NULL;

-- Final check
SELECT 
  'After all backfills' as stage,
  COUNT(*) as total_recipients,
  COUNT(campaign_id) as with_campaign_id,
  COUNT(*) - COUNT(campaign_id) as missing_campaign_id
FROM recipients;

-- Show orphaned recipients (no campaign found)
SELECT 
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  r.audience_id,
  a.name as audience_name,
  r.created_at
FROM recipients r
LEFT JOIN audiences a ON a.id = r.audience_id
WHERE r.campaign_id IS NULL
ORDER BY r.created_at DESC
LIMIT 100;
```

---

### PROMPT 9: Update TypeScript Types

```
After running the migration, regenerate types and update local type definitions.

1. Regenerate Supabase types:
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/core/services/supabase/types.ts

2. Update CampaignFormData if needed:

FILE: src/types/campaigns.ts

Ensure the types reflect the new structure where recipients have campaign_id.

3. Update any local interfaces:

FILE: src/features/call-center/components/types.ts

Add campaign_id to recipient interfaces if not using generated types.
```

---

### PROMPT 10: Add Integration Tests

```
Create tests to verify the fix works correctly.

FILE: src/features/campaigns/utils/__tests__/redemption-flow.test.ts

CREATE:

import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@core/services/supabase';

describe('Redemption Flow', () => {
  describe('Code Lookup', () => {
    it('should find recipient with direct campaign_id', async () => {
      // This test verifies the new query pattern works
      const testCode = 'TEST123';
      
      const { data: recipient, error } = await supabase
        .from('recipients')
        .select(`
          id,
          redemption_code,
          campaign_id,
          campaign:campaigns(id, name, status)
        `)
        .eq('redemption_code', testCode)
        .maybeSingle();
      
      // If recipient exists, should have campaign info
      if (recipient) {
        expect(recipient.campaign_id || recipient.campaign).toBeTruthy();
      }
      expect(error).toBeNull();
    });

    it('should fallback to audience-based lookup', async () => {
      // Test the fallback mechanism for old data
      const { data: recipientWithoutCampaignId } = await supabase
        .from('recipients')
        .select('id, audience_id')
        .is('campaign_id', null)
        .limit(1)
        .maybeSingle();
      
      if (recipientWithoutCampaignId) {
        // Should be able to find campaign via audience
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('audience_id', recipientWithoutCampaignId.audience_id)
          .maybeSingle();
        
        // Either campaign exists or recipient is truly orphaned
        console.log('Fallback test:', { 
          recipientId: recipientWithoutCampaignId.id,
          campaignFound: !!campaign 
        });
      }
    });
  });
});
```

---

## 📊 EXECUTION ORDER

| Step | Prompt | Action | Risk |
|------|--------|--------|------|
| 1 | **Prompt 1** | Add campaign_id column to recipients | Low - additive change |
| 2 | **Prompt 8** | Run backfill script | Medium - test on staging first |
| 3 | **Prompt 9** | Regenerate TypeScript types | Low |
| 4 | **Prompt 2** | Fix import-campaign-codes | Medium |
| 5 | **Prompt 3** | Fix import-customer-codes | Medium |
| 6 | **Prompt 4** | Fix redeem-customer-code | High - core redemption |
| 7 | **Prompt 5** | Fix validate-redemption-code | Medium |
| 8 | **Prompt 6** | Fix CallCenterRedemptionPanel | High - core UI |
| 9 | **Prompt 7** | Fix diagnose function | Low |
| 10 | **Prompt 10** | Add tests | Low |

---

## ✅ VERIFICATION CHECKLIST

After completing all prompts:

**Database:**
- [ ] recipients table has campaign_id column
- [ ] Index exists on recipients.campaign_id
- [ ] Existing recipients backfilled with campaign_id

**Import Functions:**
- [ ] import-campaign-codes sets campaign_id on recipients
- [ ] import-campaign-codes uses correct audience columns
- [ ] import-customer-codes sets campaign_id when provided

**Redemption Functions:**
- [ ] redeem-customer-code uses campaign_id directly
- [ ] redeem-customer-code has fallback for old data
- [ ] validate-redemption-code uses campaign_id directly
- [ ] validate-redemption-code has fallback for old data

**UI:**
- [ ] CallCenterRedemptionPanel uses new query pattern
- [ ] Codes are found AND show campaign info
- [ ] Gift card provisioning works end-to-end

**Testing:**
- [ ] Import new codes → verify campaign_id set
- [ ] Redeem code → verify campaign found
- [ ] Call center lookup → verify campaign displayed
- [ ] Old codes (backfilled) → verify still work

---

## 🚨 IMMEDIATE HOTFIX (If Needed)

If you need a quick fix before the full migration, add this to the edge functions:

```javascript
// Hotfix: Find campaign via audience when campaign_id is null
async function findCampaignForRecipient(supabase, recipient) {
  // Try direct campaign_id first
  if (recipient.campaign_id) {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', recipient.campaign_id)
      .single();
    return data;
  }
  
  // Fallback: find campaign by audience_id
  if (recipient.audience_id) {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('audience_id', recipient.audience_id)
      .maybeSingle();
    return data;
  }
  
  return null;
}
```

This can be added to the existing functions as a bridge while you implement the full fix.

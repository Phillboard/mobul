# CAMPAIGN SYSTEM OVERHAUL - MASTER IMPLEMENTATION GUIDE
## Complete Plan with Copy-Paste Ready Cursor Prompts

**Date:** December 17, 2025
**Scope:** Transform call-center-focused system into multi-channel marketing platform
**Estimated Total Effort:** 40-60 hours

---

# TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [Phase 1: Database Schema](#phase-1-database-schema)
5. [Phase 2: Campaign List Fix](#phase-2-campaign-list-fix)
6. [Phase 3: Campaign Detail Fix](#phase-3-campaign-detail-fix)
7. [Phase 4: Dashboard Fix](#phase-4-dashboard-fix)
8. [Phase 5: Campaign Wizard Update](#phase-5-campaign-wizard-update)
9. [Phase 6: Navigation Update](#phase-6-navigation-update)
10. [Phase 7: Edge Functions](#phase-7-edge-functions)
11. [Phase 8: Template Management](#phase-8-template-management)
12. [Testing Checklist](#testing-checklist)

---

# EXECUTIVE SUMMARY

## Problem Statement
The current system shows call-center metrics (Calls, Call Duration, Call Analytics) that are irrelevant to the actual business model of direct mail campaigns with gift card rewards.

## Solution
Transform the campaign system to:
1. Remove all call-related metrics and tabs
2. Show relevant metrics (Recipients, Rewards, Response Rate)
3. Add support for Email and SMS campaigns
4. Add email/SMS drip sequence capabilities
5. Add multi-channel campaigns (direct mail + digital follow-ups)

## Key Changes
| Area | Before | After |
|------|--------|-------|
| Campaign List | Shows Calls, Conversion | Shows Recipients, Rewards, Response Rate |
| Campaign Detail | Call Analytics, Call Log tabs | Overview, Email/SMS Analytics tabs |
| Dashboard | Call-centric KPIs | Reward-centric KPIs |
| Campaign Types | Direct Mail only | Direct Mail, Email, SMS, Drip, Multi-channel |

---

# CURRENT STATE ANALYSIS

## Campaign List Columns (WRONG)
```
Campaign Name | Status | List | Calls | Rewards | Conversion | Size | Mail Date
```

**Problems:**
- "Calls" - Counts call_sessions table - NOT RELEVANT
- "Conversion" - Calculated as rewards/calls - MEANINGLESS
- No campaign type indicator

## Campaign Detail Tabs (WRONG)
```
Conditions | Call Analytics | Rewards | Call Log | QR Analytics | Print Batches | Approvals | Comments
```

**Problems:**
- "Call Analytics" - Shows call status breakdown - NOT USED
- "Call Log" - Shows individual calls - NOT USED
- Missing Overview tab with key metrics

## Dashboard KPIs (WRONG)
```
Active Campaigns | Active Calls Today | Gift Cards Delivered | Avg Call Duration | Condition Completion Rate | ...
```

**Problems:**
- "Active Calls Today" - NOT RELEVANT
- "Avg Call Duration" - NOT RELEVANT
- "Condition Completion Rate" - Call-based calculation

---

# TARGET ARCHITECTURE

## New Campaign Types
```
campaign_type ENUM:
- direct_mail     → Physical postcards/letters
- email           → Single email blast
- sms             → Single SMS blast  
- email_drip      → Automated email sequence
- sms_drip        → Automated SMS sequence
- multi_channel   → Direct mail + email/SMS follow-ups
```

## New Campaign List Columns
```
Campaign Name | Type | Status | Recipients | Rewards | Response Rate | Launch Date | Actions
```

## New Campaign Detail Tabs
```
Overview | Rewards & Triggers | Rewards | [Mail Tracking] | [Email Analytics] | [SMS Analytics] | Approvals | Comments
```
*Tabs in brackets shown conditionally based on campaign type*

## New Dashboard KPIs
```
Active Campaigns | Rewards Given Today | Total Rewards Value | Pending Redemptions | Reward Rate | Recipients | Delivery Rate | Response Rate
```

---

# PHASE 1: DATABASE SCHEMA

## PROMPT 1.1: Add Campaign Type Column

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Add campaign_type column and email/SMS flags to the campaigns table.

**TASK:** Run this SQL migration in Supabase SQL Editor, then regenerate TypeScript types.

**SQL TO RUN:**

```sql
-- ============================================
-- MIGRATION: Add Campaign Type Support
-- ============================================

-- 1. Add campaign_type column
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'direct_mail';

-- 2. Add email/SMS enabled flags
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;

-- 3. Add email configuration columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS email_from_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_from_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_reply_to VARCHAR(255);

-- 4. Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_type ON campaigns(campaign_type);

-- 5. Set all existing campaigns to direct_mail
UPDATE campaigns 
SET campaign_type = 'direct_mail' 
WHERE campaign_type IS NULL;

-- 6. Add check constraint for valid types
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_type_check'
  ) THEN
    ALTER TABLE campaigns 
    ADD CONSTRAINT campaigns_type_check 
    CHECK (campaign_type IN ('direct_mail', 'email', 'sms', 'email_drip', 'sms_drip', 'multi_channel'));
  END IF;
END $$;

-- 7. Comment for documentation
COMMENT ON COLUMN campaigns.campaign_type IS 'Type of campaign: direct_mail, email, sms, email_drip, sms_drip, multi_channel';
COMMENT ON COLUMN campaigns.email_enabled IS 'Whether email follow-ups are enabled for this campaign';
COMMENT ON COLUMN campaigns.sms_enabled IS 'Whether SMS follow-ups are enabled for this campaign';
```

**AFTER RUNNING SQL:**
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/core/services/supabase/types.ts
```

**VERIFICATION:**
- campaigns table should have: campaign_type, email_enabled, sms_enabled columns
- All existing campaigns should have campaign_type = 'direct_mail'

---
```

---

## PROMPT 1.2: Create Email Sequences Table

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the campaign_email_sequences table for storing email drip sequences.

**TASK:** Run this SQL migration in Supabase SQL Editor.

**SQL TO RUN:**

```sql
-- ============================================
-- MIGRATION: Create Email Sequences Table
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  
  -- Timing Configuration
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  
  -- Email Content
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(200),
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Optional: Link to reusable template
  template_id UUID REFERENCES message_templates(id),
  
  -- Trigger Configuration
  trigger_type VARCHAR(50) DEFAULT 'time_based',
  -- Values: 'time_based', 'on_open', 'on_click', 'on_no_action'
  trigger_condition JSONB,
  
  -- A/B Testing Support
  variant_group VARCHAR(50),
  variant_weight INTEGER DEFAULT 100,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique order per campaign
  UNIQUE(campaign_id, sequence_order)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_sequences_campaign ON campaign_email_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_active ON campaign_email_sequences(campaign_id, is_active) 
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE campaign_email_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access sequences for campaigns they have access to
CREATE POLICY "email_sequences_access_policy"
ON campaign_email_sequences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN user_clients uc ON c.client_id = uc.client_id
    WHERE c.id = campaign_email_sequences.campaign_id
    AND uc.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_sequences_updated_at ON campaign_email_sequences;
CREATE TRIGGER email_sequences_updated_at
  BEFORE UPDATE ON campaign_email_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sequences_updated_at();

-- Comments
COMMENT ON TABLE campaign_email_sequences IS 'Email drip sequence steps for campaigns';
COMMENT ON COLUMN campaign_email_sequences.trigger_type IS 'When to send: time_based (after delay), on_open, on_click, on_no_action';
```

---
```

---

## PROMPT 1.3: Create SMS Sequences Table

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the campaign_sms_sequences table for storing SMS drip sequences.

**TASK:** Run this SQL migration in Supabase SQL Editor.

**SQL TO RUN:**

```sql
-- ============================================
-- MIGRATION: Create SMS Sequences Table
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_sms_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  
  -- Timing Configuration
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  
  -- SMS Content
  message_body TEXT NOT NULL,
  media_url VARCHAR(500), -- For MMS support
  
  -- Trigger Configuration
  trigger_type VARCHAR(50) DEFAULT 'time_based',
  -- Values: 'time_based', 'on_reply', 'on_no_reply', 'on_link_click'
  trigger_condition JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique order per campaign
  UNIQUE(campaign_id, sequence_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_sequences_campaign ON campaign_sms_sequences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_sequences_active ON campaign_sms_sequences(campaign_id, is_active)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE campaign_sms_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "sms_sequences_access_policy"
ON campaign_sms_sequences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN user_clients uc ON c.client_id = uc.client_id
    WHERE c.id = campaign_sms_sequences.campaign_id
    AND uc.user_id = auth.uid()
  )
);

-- Updated_at trigger
DROP TRIGGER IF EXISTS sms_sequences_updated_at ON campaign_sms_sequences;
CREATE TRIGGER sms_sequences_updated_at
  BEFORE UPDATE ON campaign_sms_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sequences_updated_at();

-- Comments
COMMENT ON TABLE campaign_sms_sequences IS 'SMS drip sequence steps for campaigns';
```

---
```

---

## PROMPT 1.4: Create Message Sends Tracking Table

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the campaign_message_sends table to track all email and SMS sends.

**TASK:** Run this SQL migration in Supabase SQL Editor.

**SQL TO RUN:**

```sql
-- ============================================
-- MIGRATION: Create Message Sends Tracking Table
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_message_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Recipient Information
  recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Message Type and Reference
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('email', 'sms')),
  sequence_id UUID, -- References email_sequences or sms_sequences
  sequence_order INTEGER,
  
  -- Delivery Information
  to_address VARCHAR(500) NOT NULL, -- Email address or phone number
  from_address VARCHAR(500),
  subject VARCHAR(500), -- For emails
  content_preview TEXT, -- First 200 chars for reference
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending',
  -- Values: pending, queued, sent, delivered, opened, clicked, bounced, failed, unsubscribed
  
  -- Timestamps for each state
  scheduled_for TIMESTAMPTZ,
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  first_click_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Engagement Metrics
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Provider Information
  provider VARCHAR(50), -- resend, sendgrid, twilio, infobip, etc.
  external_id VARCHAR(255), -- Message ID from provider
  
  -- Error Handling
  error_message TEXT,
  error_code VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  max_retries INTEGER DEFAULT 3,
  
  -- Extra Data
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_msg_sends_campaign ON campaign_message_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_msg_sends_recipient ON campaign_message_sends(recipient_id);
CREATE INDEX IF NOT EXISTS idx_msg_sends_contact ON campaign_message_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_msg_sends_status ON campaign_message_sends(status);
CREATE INDEX IF NOT EXISTS idx_msg_sends_type ON campaign_message_sends(campaign_id, message_type);
CREATE INDEX IF NOT EXISTS idx_msg_sends_scheduled ON campaign_message_sends(scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_msg_sends_pending_retry ON campaign_message_sends(last_retry_at) 
  WHERE status = 'failed' AND retry_count < max_retries;

-- Enable RLS
ALTER TABLE campaign_message_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "message_sends_select_policy"
ON campaign_message_sends
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN user_clients uc ON c.client_id = uc.client_id
    WHERE c.id = campaign_message_sends.campaign_id
    AND uc.user_id = auth.uid()
  )
);

-- Updated_at trigger
DROP TRIGGER IF EXISTS message_sends_updated_at ON campaign_message_sends;
CREATE TRIGGER message_sends_updated_at
  BEFORE UPDATE ON campaign_message_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sequences_updated_at();

-- Comments
COMMENT ON TABLE campaign_message_sends IS 'Tracks all email and SMS message sends with delivery status';
COMMENT ON COLUMN campaign_message_sends.status IS 'Message status: pending, queued, sent, delivered, opened, clicked, bounced, failed, unsubscribed';
```

---
```

---

## PROMPT 1.5: Create Message Events Table

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the campaign_message_events table to track opens, clicks, bounces, etc.

**TASK:** Run this SQL migration in Supabase SQL Editor.

**SQL TO RUN:**

```sql
-- ============================================
-- MIGRATION: Create Message Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_send_id UUID NOT NULL REFERENCES campaign_message_sends(id) ON DELETE CASCADE,
  
  -- Event Information
  event_type VARCHAR(50) NOT NULL,
  -- Values: open, click, bounce, complaint, unsubscribe, delivery, defer
  
  -- Click-specific data
  link_url TEXT,
  link_id VARCHAR(100),
  
  -- Client/Device Information
  user_agent TEXT,
  ip_address INET,
  device_type VARCHAR(50), -- desktop, mobile, tablet
  email_client VARCHAR(100), -- Gmail, Outlook, Apple Mail, etc.
  os VARCHAR(50),
  browser VARCHAR(50),
  
  -- Geolocation (from IP)
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Provider Data
  provider_event_id VARCHAR(255),
  raw_payload JSONB,
  
  -- Timestamp
  event_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_msg_events_send ON campaign_message_events(message_send_id);
CREATE INDEX IF NOT EXISTS idx_msg_events_type ON campaign_message_events(event_type);
CREATE INDEX IF NOT EXISTS idx_msg_events_time ON campaign_message_events(event_at);

-- Enable RLS
ALTER TABLE campaign_message_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy (inherits access from message_sends)
CREATE POLICY "message_events_select_policy"
ON campaign_message_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_message_sends ms
    JOIN campaigns c ON ms.campaign_id = c.id
    JOIN user_clients uc ON c.client_id = uc.client_id
    WHERE ms.id = campaign_message_events.message_send_id
    AND uc.user_id = auth.uid()
  )
);

-- Comments
COMMENT ON TABLE campaign_message_events IS 'Individual events for message sends (opens, clicks, bounces, etc.)';
```

---
```

---

## PROMPT 1.6: Regenerate TypeScript Types

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

After running all database migrations, regenerate the Supabase TypeScript types.

**TASK:** Run the following command and verify the new types are present.

**COMMAND:**
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/core/services/supabase/types.ts
```

**VERIFICATION CHECKLIST:**
Open `src/core/services/supabase/types.ts` and verify these types exist:

1. campaigns table should have:
   - campaign_type: string
   - email_enabled: boolean | null
   - sms_enabled: boolean | null
   - email_from_name: string | null
   - email_from_address: string | null
   - email_reply_to: string | null

2. New tables should be present:
   - campaign_email_sequences
   - campaign_sms_sequences
   - campaign_message_sends
   - campaign_message_events

**IF TYPES ARE MISSING:**
- Ensure all migrations ran successfully
- Check Supabase dashboard for any errors
- Re-run the gen types command

---
```



---

# PHASE 2: CAMPAIGN LIST FIX

## PROMPT 2.1: Update Campaign List Columns

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the campaign list columns to show relevant metrics instead of call-based ones.

**FILE TO MODIFY:** `src/features/campaigns/components/campaignsColumns.tsx`

**CHANGES REQUIRED:**

1. **REMOVE** these columns:
   - `callSessionCount` (the "Calls" column)
   - `conversionRate` (the "Conversion" column)

2. **ADD** these new columns:
   - `campaign_type` - Icon showing campaign type
   - `recipientCount` - Number of recipients
   - `rewardsGiven` - Number of rewards/gift cards sent
   - `responseRate` - rewardsGiven / recipientCount * 100

3. **MODIFY** existing columns:
   - Rename "Mail Date" header to "Launch Date"

4. **ADD** new imports at the top:
```typescript
import { Mail, MailOpen, MessageSquare, Layers, Send, Users, Gift, TrendingUp } from "lucide-react";
```

5. **UPDATE** the `CampaignRow` type:
```typescript
export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  campaign_type: string;
  size: string;
  postage: string | null;
  mail_date: string | null;
  mailing_method: string | null;
  audience?: { name: string; valid_count?: number } | null;
  contact_lists?: { name: string; contact_count?: number } | null;
  template?: { name: string } | null;
  // NEW FIELDS - calculated in query
  recipientCount: number;
  rewardsGiven: number;
  responseRate: number;
};
```

6. **ADD** helper function for campaign type icon:
```typescript
const getCampaignTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    direct_mail: <Mail className="h-4 w-4 text-blue-500" title="Direct Mail" />,
    email: <MailOpen className="h-4 w-4 text-green-500" title="Email" />,
    email_drip: <Send className="h-4 w-4 text-green-500" title="Email Drip" />,
    sms: <MessageSquare className="h-4 w-4 text-purple-500" title="SMS" />,
    sms_drip: <MessageSquare className="h-4 w-4 text-purple-500" title="SMS Drip" />,
    multi_channel: <Layers className="h-4 w-4 text-orange-500" title="Multi-Channel" />,
  };
  return icons[type] || icons.direct_mail;
};
```

7. **REPLACE** the columns array with this new order:
```typescript
return [
  // Campaign Name
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Campaign Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {getCampaignTypeIcon(row.original.campaign_type || 'direct_mail')}
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  // Status
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant="secondary" className={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Badge>
      );
    },
  },
  // List (contact list or audience)
  {
    accessorKey: "audience",
    header: "List",
    cell: ({ row }) => {
      const campaign = row.original as CampaignRow;
      const listName = campaign.contact_lists?.name || campaign.audience?.name;
      return (
        <span className="text-sm">
          {listName || <span className="text-muted-foreground">No list</span>}
        </span>
      );
    },
  },
  // Recipients - NEW
  {
    accessorKey: "recipientCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Recipients" />
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {(row.getValue("recipientCount") as number)?.toLocaleString() || '0'}
      </div>
    ),
  },
  // Rewards Given - NEW
  {
    accessorKey: "rewardsGiven",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rewards" />
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="font-medium text-green-600">
          {(row.getValue("rewardsGiven") as number)?.toLocaleString() || '0'}
        </span>
      </div>
    ),
  },
  // Response Rate - NEW
  {
    accessorKey: "responseRate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Response" />
    ),
    cell: ({ row }) => {
      const rate = row.getValue("responseRate") as number;
      return (
        <div className="text-center font-medium">
          {rate > 0 ? `${rate.toFixed(1)}%` : "0%"}
        </div>
      );
    },
  },
  // Launch Date (renamed from Mail Date)
  {
    accessorKey: "mail_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Launch Date" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("mail_date") as string | null;
      return date ? (
        <span className="text-muted-foreground">
          {format(new Date(date), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-muted-foreground">Not scheduled</span>
      );
    },
  },
  // Actions (keep existing)
  {
    id: "actions",
    // ... keep existing actions code
  },
];
```

**TESTING:**
- View campaigns list page
- Verify new columns appear: Recipients, Rewards, Response
- Verify old columns are gone: Calls, Conversion
- Verify campaign type icon shows correctly

---
```

---

## PROMPT 2.2: Update Campaign List Query

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the campaign list query to fetch proper metrics instead of call-based ones.

**FILE TO MODIFY:** `src/features/campaigns/components/CampaignsList.tsx`

**FIND THIS CODE** (around lines 135-175):
```typescript
// Fetch call sessions and conditions for each campaign
const enrichedCampaigns = await Promise.all(
  (campaignsData || []).map(async (campaign) => {
    // Get call sessions count
    const { count: callsCount } = await supabase
      .from('call_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    // Get conditions met (rewards) count
    const { count: rewardsCount } = await supabase
      .from('call_conditions_met')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    // Calculate conversion rate
    const conversionRate = callsCount && callsCount > 0 
      ? ((rewardsCount || 0) / callsCount) * 100 
      : 0;

    return {
      ...campaign,
      callSessionCount: callsCount || 0,
      rewardCount: rewardsCount || 0,
      conversionRate,
    };
  })
);
```

**REPLACE WITH THIS CODE:**
```typescript
// Enrich campaigns with relevant metrics (not call-based)
const enrichedCampaigns = await Promise.all(
  (campaignsData || []).map(async (campaign) => {
    // Calculate recipient count from contact list or audience
    const recipientCount = campaign.contact_lists?.contact_count || 
                          campaign.audiences?.valid_count || 
                          0;

    // Get rewards/gift cards given count
    const { count: rewardsGiven } = await supabase
      .from('recipient_gift_cards')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id);

    // Get email engagement if applicable
    let emailClicks = 0;
    if (campaign.email_enabled || 
        campaign.campaign_type === 'email' || 
        campaign.campaign_type === 'email_drip' ||
        campaign.campaign_type === 'multi_channel') {
      const { count } = await supabase
        .from('campaign_message_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('message_type', 'email')
        .not('first_click_at', 'is', null);
      emailClicks = count || 0;
    }

    // Calculate response rate based on rewards + email clicks
    const totalResponses = (rewardsGiven || 0) + emailClicks;
    const responseRate = recipientCount > 0 
      ? (totalResponses / recipientCount) * 100 
      : 0;

    return {
      ...campaign,
      campaign_type: campaign.campaign_type || 'direct_mail',
      recipientCount,
      rewardsGiven: rewardsGiven || 0,
      responseRate,
    };
  })
);
```

**ALSO UPDATE** the main query to include campaign_type:
Find this query:
```typescript
const { data: campaignsData, error } = await query;
```

Make sure the select includes campaign_type:
```typescript
.select(`
  *,
  campaign_type,
  email_enabled,
  sms_enabled,
  contact_lists (
    name,
    contact_count
  ),
  audiences (
    name,
    valid_count
  ),
  templates (
    name
  )
`)
```

**TESTING:**
- Reload the campaigns page
- Verify recipient counts are accurate
- Verify rewards count matches gift cards given
- Verify response rate calculation is correct

---
```

---

## PROMPT 2.3: Add Campaign Type Filter to Campaigns Page

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Add filtering by campaign type to the campaigns page.

**FILE TO MODIFY:** `src/pages/Campaigns.tsx`

**CHANGES:**

1. **ADD** imports at the top:
```typescript
import { Mail, MailOpen, MessageSquare, Layers } from "lucide-react";
import { useSearchParams } from "react-router-dom";
```

2. **ADD** state for type filter (after other useState calls):
```typescript
const [searchParams, setSearchParams] = useSearchParams();
const typeFilter = searchParams.get('type');

const setTypeFilter = (type: string | null) => {
  if (type) {
    setSearchParams({ type });
  } else {
    setSearchParams({});
  }
};
```

3. **ADD** filter buttons before the CampaignsList component:
```tsx
{/* Campaign Type Filter */}
<div className="flex gap-2 flex-wrap">
  <Button 
    variant={!typeFilter ? 'default' : 'outline'}
    size="sm"
    onClick={() => setTypeFilter(null)}
  >
    All Campaigns
  </Button>
  <Button 
    variant={typeFilter === 'direct_mail' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setTypeFilter('direct_mail')}
    className="gap-2"
  >
    <Mail className="h-4 w-4" />
    Direct Mail
  </Button>
  <Button 
    variant={typeFilter === 'email' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setTypeFilter('email')}
    className="gap-2"
  >
    <MailOpen className="h-4 w-4" />
    Email
  </Button>
  <Button 
    variant={typeFilter === 'sms' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setTypeFilter('sms')}
    className="gap-2"
  >
    <MessageSquare className="h-4 w-4" />
    SMS
  </Button>
  <Button 
    variant={typeFilter === 'multi_channel' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setTypeFilter('multi_channel')}
    className="gap-2"
  >
    <Layers className="h-4 w-4" />
    Multi-Channel
  </Button>
</div>
```

4. **UPDATE** the CampaignsList component to pass the filter:
```tsx
<CampaignsList 
  clientId={clientId} 
  searchQuery={searchQuery}
  typeFilter={typeFilter}
/>
```

5. **UPDATE** the CampaignsList component interface and query:

In `CampaignsList.tsx`, add the prop:
```typescript
interface CampaignsListProps {
  clientId: string;
  searchQuery: string;
  typeFilter?: string | null;
}
```

And in the query, add the filter:
```typescript
// After the existing query setup
if (typeFilter) {
  if (typeFilter === 'email') {
    // Include both single email and drip
    query = query.in('campaign_type', ['email', 'email_drip']);
  } else if (typeFilter === 'sms') {
    // Include both single SMS and drip
    query = query.in('campaign_type', ['sms', 'sms_drip']);
  } else {
    query = query.eq('campaign_type', typeFilter);
  }
}
```

**TESTING:**
- Click "Direct Mail" filter - should only show direct_mail campaigns
- Click "Email" filter - should show email and email_drip campaigns
- Click "All Campaigns" - should show all
- URL should update with ?type=xxx parameter

---
```



---

# PHASE 3: CAMPAIGN DETAIL FIX

## PROMPT 3.1: Update Campaign Detail Page - Remove Call Tabs, Add Dynamic Tabs

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the Campaign Detail page to show relevant tabs based on campaign type.

**FILE TO MODIFY:** `src/pages/CampaignDetail.tsx`

**CHANGES:**

1. **ADD** new imports at the top:
```typescript
import { CampaignOverviewTab } from "@/features/campaigns/components/CampaignOverviewTab";
import { EmailAnalyticsTab } from "@/features/campaigns/components/EmailAnalyticsTab";
import { SMSAnalyticsTab } from "@/features/campaigns/components/SMSAnalyticsTab";
```

2. **ADD** campaign type detection after fetching campaign (inside the component, after the campaign query):
```typescript
// Determine which tabs to show based on campaign type
const campaignType = campaign?.campaign_type || 'direct_mail';
const isDirectMail = ['direct_mail', 'multi_channel'].includes(campaignType);
const hasEmail = campaign?.email_enabled || 
                ['email', 'email_drip', 'multi_channel'].includes(campaignType);
const hasSMS = campaign?.sms_enabled || 
              ['sms', 'sms_drip', 'multi_channel'].includes(campaignType);
const hasQR = campaign?.lp_mode === 'purl' || isDirectMail;
const hasPrintBatches = campaignType === 'direct_mail' && 
                        campaign?.mailing_method === 'ace_fulfillment';
```

3. **REPLACE** the entire Tabs section with this new dynamic version:
```tsx
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="flex flex-wrap h-auto gap-1 p-1">
    {/* Always show these tabs */}
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="conditions">Rewards & Triggers</TabsTrigger>
    <TabsTrigger value="rewards">Rewards</TabsTrigger>
    
    {/* Conditionally show based on campaign type */}
    {hasEmail && (
      <TabsTrigger value="email-analytics">Email Analytics</TabsTrigger>
    )}
    {hasSMS && (
      <TabsTrigger value="sms-analytics">SMS Analytics</TabsTrigger>
    )}
    {hasQR && (
      <TabsTrigger value="qr">QR Analytics</TabsTrigger>
    )}
    {hasPrintBatches && (
      <TabsTrigger value="batches">Print Batches</TabsTrigger>
    )}
    
    {/* Always show these tabs */}
    <TabsTrigger value="approvals">Approvals</TabsTrigger>
    <TabsTrigger value="comments">Comments</TabsTrigger>
  </TabsList>

  {/* Overview Tab - NEW */}
  <TabsContent value="overview">
    <CampaignOverviewTab campaignId={id!} campaign={campaign} />
  </TabsContent>

  {/* Conditions Tab - renamed to Rewards & Triggers */}
  <TabsContent value="conditions">
    <ConditionsDisplay campaignId={id!} />
  </TabsContent>

  {/* Rewards Tab */}
  <TabsContent value="rewards">
    <RewardsTab campaignId={id!} />
  </TabsContent>

  {/* Email Analytics Tab - NEW */}
  {hasEmail && (
    <TabsContent value="email-analytics">
      <EmailAnalyticsTab campaignId={id!} />
    </TabsContent>
  )}

  {/* SMS Analytics Tab - NEW */}
  {hasSMS && (
    <TabsContent value="sms-analytics">
      <SMSAnalyticsTab campaignId={id!} />
    </TabsContent>
  )}

  {/* QR Analytics Tab */}
  {hasQR && (
    <TabsContent value="qr">
      <QRAnalytics campaignId={id!} />
    </TabsContent>
  )}

  {/* Print Batches Tab */}
  {hasPrintBatches && (
    <TabsContent value="batches" className="space-y-4">
      {/* Keep existing batches content */}
    </TabsContent>
  )}

  {/* Approvals Tab */}
  <TabsContent value="approvals">
    <ApprovalsTab campaignId={id!} />
  </TabsContent>

  {/* Comments Tab */}
  <TabsContent value="comments">
    <CommentsTab campaignId={id!} />
  </TabsContent>
</Tabs>
```

4. **REMOVE** these tabs completely (delete the TabsTrigger and TabsContent):
   - `value="calls"` (Call Analytics)
   - `value="call-log"` (Call Log)

5. **UPDATE** the Campaign Summary card to show campaign type:
```tsx
<CardContent className="space-y-2">
  <div className="flex justify-between">
    <span className="text-muted-foreground">Campaign Type:</span>
    <Badge variant="outline" className="capitalize">
      {campaignType.replace('_', ' ')}
    </Badge>
  </div>
  <div className="flex justify-between">
    <span className="text-muted-foreground">Audience:</span>
    <span className="font-medium">
      {campaign.audience?.name || campaign.contact_lists?.name || 'No list'} 
      ({campaign.audience?.valid_count || campaign.contact_lists?.contact_count || 0} recipients)
    </span>
  </div>
  {/* Keep size and mail_date only for direct mail */}
  {isDirectMail && (
    <>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Mail Size:</span>
        <span className="font-medium">{campaign.size}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Mail Date:</span>
        <span className="font-medium">
          {campaign.mail_date 
            ? new Date(campaign.mail_date).toLocaleDateString() 
            : 'Not set'}
        </span>
      </div>
    </>
  )}
</CardContent>
```

**TESTING:**
- View a direct mail campaign - should NOT show Email/SMS Analytics tabs
- View an email campaign - should show Email Analytics tab
- Call Analytics and Call Log tabs should be completely gone
- Overview tab should be the default

---
```

---

## PROMPT 3.2: Create Campaign Overview Tab Component

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create a new Overview tab component that shows key campaign metrics.

**CREATE NEW FILE:** `src/features/campaigns/components/CampaignOverviewTab.tsx`

**FULL FILE CONTENT:**

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { 
  Users, Gift, TrendingUp, Mail, MessageSquare, MailOpen, 
  MousePointerClick, Calendar, Clock, CheckCircle 
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface CampaignOverviewTabProps {
  campaignId: string;
  campaign: any;
}

export function CampaignOverviewTab({ campaignId, campaign }: CampaignOverviewTabProps) {
  const campaignType = campaign?.campaign_type || 'direct_mail';
  const isDirectMail = ['direct_mail', 'multi_channel'].includes(campaignType);
  const hasEmail = campaign?.email_enabled || campaignType.includes('email');
  const hasSMS = campaign?.sms_enabled || campaignType.includes('sms');
  
  // Fetch comprehensive metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['campaign-overview-metrics', campaignId],
    queryFn: async () => {
      // Get recipient count
      let recipientCount = 0;
      if (campaign.contact_list_id) {
        const { data } = await supabase
          .from('contact_lists')
          .select('contact_count')
          .eq('id', campaign.contact_list_id)
          .single();
        recipientCount = data?.contact_count || 0;
      } else if (campaign.audience_id) {
        const { data } = await supabase
          .from('audiences')
          .select('valid_count')
          .eq('id', campaign.audience_id)
          .single();
        recipientCount = data?.valid_count || 0;
      }

      // Get rewards delivered
      const { count: rewardsCount } = await supabase
        .from('recipient_gift_cards')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      // Get total rewards value
      const { data: rewardsValue } = await supabase
        .from('recipient_gift_cards')
        .select('card_value')
        .eq('campaign_id', campaignId);
      
      const totalRewardsValue = rewardsValue?.reduce((sum, r) => sum + (r.card_value || 0), 0) || 0;

      // Get email metrics if applicable
      let emailMetrics = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
      if (hasEmail) {
        const { data: emailData } = await supabase
          .from('campaign_message_sends')
          .select('status, delivered_at, opened_at, first_click_at')
          .eq('campaign_id', campaignId)
          .eq('message_type', 'email');
        
        if (emailData) {
          emailMetrics.sent = emailData.length;
          emailMetrics.delivered = emailData.filter(e => e.delivered_at).length;
          emailMetrics.opened = emailData.filter(e => e.opened_at).length;
          emailMetrics.clicked = emailData.filter(e => e.first_click_at).length;
        }
      }

      // Get SMS metrics if applicable
      let smsMetrics = { sent: 0, delivered: 0 };
      if (hasSMS) {
        const { data: smsData } = await supabase
          .from('campaign_message_sends')
          .select('status, delivered_at')
          .eq('campaign_id', campaignId)
          .eq('message_type', 'sms');
        
        if (smsData) {
          smsMetrics.sent = smsData.length;
          smsMetrics.delivered = smsData.filter(s => s.delivered_at).length;
        }
      }

      // Calculate response rate
      const totalResponses = (rewardsCount || 0) + emailMetrics.clicked;
      const responseRate = recipientCount > 0 
        ? (totalResponses / recipientCount) * 100 
        : 0;

      return {
        recipientCount,
        rewardsDelivered: rewardsCount || 0,
        totalRewardsValue,
        responseRate,
        emailMetrics,
        smsMetrics,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recipients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.recipientCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In campaign audience
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rewards Given
            </CardTitle>
            <Gift className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.rewardsDelivered}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${metrics?.totalRewardsValue.toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Response Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.responseRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recipients who responded
            </p>
          </CardContent>
        </Card>

        {/* 4th card varies by type */}
        {hasEmail && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Email Open Rate
              </CardTitle>
              <MailOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {metrics?.emailMetrics.sent > 0 
                  ? ((metrics.emailMetrics.opened / metrics.emailMetrics.sent) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.emailMetrics.opened} of {metrics?.emailMetrics.sent} opened
              </p>
            </CardContent>
          </Card>
        )}

        {hasSMS && !hasEmail && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                SMS Delivery Rate
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {metrics?.smsMetrics.sent > 0 
                  ? ((metrics.smsMetrics.delivered / metrics.smsMetrics.sent) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.smsMetrics.delivered} of {metrics?.smsMetrics.sent} delivered
              </p>
            </CardContent>
          </Card>
        )}

        {isDirectMail && !hasEmail && !hasSMS && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Campaign Status
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-lg capitalize">
                {campaign.status?.replace('_', ' ')}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Campaign Details Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant="outline" className="capitalize">
                {campaignType.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="secondary" className="capitalize">
                {campaign.status?.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">
                {format(new Date(campaign.created_at), 'PPP')}
              </span>
            </div>
            {campaign.mail_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Launch Date</span>
                <span className="text-sm">
                  {format(new Date(campaign.mail_date), 'PPP')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isDirectMail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Direct Mail</span>
                <Badge variant="secondary" className="ml-auto">
                  {campaign.size?.toUpperCase()}
                </Badge>
              </div>
            )}
            {hasEmail && (
              <div className="flex items-center gap-2">
                <MailOpen className="h-4 w-4 text-green-500" />
                <span className="text-sm">Email</span>
                <Badge variant="secondary" className="ml-auto">
                  {metrics?.emailMetrics.sent || 0} sent
                </Badge>
              </div>
            )}
            {hasSMS && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <span className="text-sm">SMS</span>
                <Badge variant="secondary" className="ml-auto">
                  {metrics?.smsMetrics.sent || 0} sent
                </Badge>
              </div>
            )}
            {!isDirectMail && !hasEmail && !hasSMS && (
              <p className="text-sm text-muted-foreground">
                No channels configured
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**TESTING:**
- Navigate to any campaign detail page
- Overview tab should be the first/default tab
- Metrics should display correctly
- Cards should adjust based on campaign type

---
```

---

## PROMPT 3.3: Create Email Analytics Tab Component

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the Email Analytics tab component for campaigns with email.

**CREATE NEW FILE:** `src/features/campaigns/components/EmailAnalyticsTab.tsx`

**FULL FILE CONTENT:**

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Mail, MailOpen, MousePointerClick, AlertTriangle, TrendingUp, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface EmailAnalyticsTabProps {
  campaignId: string;
}

export function EmailAnalyticsTab({ campaignId }: EmailAnalyticsTabProps) {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['email-analytics', campaignId],
    queryFn: async () => {
      // Get all email sends for this campaign
      const { data: sends, error } = await supabase
        .from('campaign_message_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('message_type', 'email');

      if (error) throw error;
      if (!sends || sends.length === 0) return null;

      // Calculate metrics
      const totalSent = sends.length;
      const delivered = sends.filter(s => s.delivered_at || (s.status !== 'bounced' && s.status !== 'failed')).length;
      const opened = sends.filter(s => s.opened_at).length;
      const clicked = sends.filter(s => s.first_click_at).length;
      const bounced = sends.filter(s => s.status === 'bounced').length;
      const failed = sends.filter(s => s.status === 'failed').length;

      // Calculate rates
      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
      const clickToOpenRate = opened > 0 ? (clicked / opened) * 100 : 0;
      const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;

      // Get sequence breakdown if multiple emails
      const { data: sequences } = await supabase
        .from('campaign_email_sequences')
        .select('id, sequence_order, subject')
        .eq('campaign_id', campaignId)
        .order('sequence_order');

      const sequenceStats = sequences?.map(seq => {
        const seqSends = sends.filter(s => s.sequence_id === seq.id);
        return {
          name: `Email ${seq.sequence_order}`,
          subject: seq.subject?.substring(0, 30) + (seq.subject?.length > 30 ? '...' : ''),
          sent: seqSends.length,
          opened: seqSends.filter(s => s.opened_at).length,
          clicked: seqSends.filter(s => s.first_click_at).length,
        };
      }) || [];

      // Pie chart data for status breakdown
      const statusBreakdown = [
        { name: 'Opened & Clicked', value: clicked, color: '#10b981' },
        { name: 'Opened Only', value: opened - clicked, color: '#3b82f6' },
        { name: 'Delivered (Not Opened)', value: delivered - opened, color: '#6b7280' },
        { name: 'Bounced/Failed', value: bounced + failed, color: '#ef4444' },
      ].filter(item => item.value > 0);

      return {
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        failed,
        deliveryRate,
        openRate,
        clickRate,
        clickToOpenRate,
        bounceRate,
        sequenceStats,
        statusBreakdown,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics || metrics.totalSent === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No emails sent yet</p>
            <p className="text-sm mt-2">
              Email analytics will appear here once emails are sent.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.delivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MailOpen className="h-4 w-4" />
              Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.opened} opened
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              Click Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.clicked} clicked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Click-to-Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.clickToOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Of opens that clicked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Bounce Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.bounceRate > 5 ? 'text-red-600' : ''}`}>
              {metrics.bounceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.bounced} bounced
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Breakdown</CardTitle>
            <CardDescription>How recipients engaged with your emails</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sequence Performance (if multiple emails) */}
        {metrics.sequenceStats.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Sequence Performance</CardTitle>
              <CardDescription>Performance by email in sequence</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.sequenceStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Bar dataKey="sent" name="Sent" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="opened" name="Opened" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="clicked" name="Clicked" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

---
```

---

## PROMPT 3.4: Create SMS Analytics Tab Component

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the SMS Analytics tab component for campaigns with SMS.

**CREATE NEW FILE:** `src/features/campaigns/components/SMSAnalyticsTab.tsx`

**FULL FILE CONTENT:**

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { MessageSquare, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SMSAnalyticsTabProps {
  campaignId: string;
}

export function SMSAnalyticsTab({ campaignId }: SMSAnalyticsTabProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['sms-analytics', campaignId],
    queryFn: async () => {
      // Get all SMS sends for this campaign
      const { data: sends, error } = await supabase
        .from('campaign_message_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('message_type', 'sms');

      if (error) throw error;
      if (!sends || sends.length === 0) return null;

      // Calculate metrics
      const totalSent = sends.length;
      const delivered = sends.filter(s => s.delivered_at).length;
      const failed = sends.filter(s => s.status === 'failed').length;
      const pending = sends.filter(s => s.status === 'pending' || s.status === 'queued').length;

      // Calculate rates
      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const failureRate = totalSent > 0 ? (failed / totalSent) * 100 : 0;

      // Get sequence breakdown if multiple messages
      const { data: sequences } = await supabase
        .from('campaign_sms_sequences')
        .select('id, sequence_order, message_body')
        .eq('campaign_id', campaignId)
        .order('sequence_order');

      const sequenceStats = sequences?.map(seq => {
        const seqSends = sends.filter(s => s.sequence_id === seq.id);
        return {
          name: `SMS ${seq.sequence_order}`,
          preview: seq.message_body?.substring(0, 30) + '...',
          sent: seqSends.length,
          delivered: seqSends.filter(s => s.delivered_at).length,
          failed: seqSends.filter(s => s.status === 'failed').length,
        };
      }) || [];

      return {
        totalSent,
        delivered,
        failed,
        pending,
        deliveryRate,
        failureRate,
        sequenceStats,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics || metrics.totalSent === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No SMS sent yet</p>
            <p className="text-sm mt-2">
              SMS analytics will appear here once messages are sent.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSent.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.delivered}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.deliveryRate.toFixed(1)}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.failed > 0 ? 'text-red-600' : ''}`}>
              {metrics.failed}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.failureRate.toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sequence Performance */}
      {metrics.sequenceStats.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Sequence Performance</CardTitle>
            <CardDescription>Delivery status by message in sequence</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.sequenceStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))" 
                  }}
                />
                <Bar dataKey="sent" name="Sent" fill="hsl(var(--chart-1))" />
                <Bar dataKey="delivered" name="Delivered" fill="hsl(var(--chart-2))" />
                <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Delivery Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.deliveryRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.failureRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Failure Rate</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalSent}</p>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---
```



---

# PHASE 4: DASHBOARD FIX

## PROMPT 4.1: Update Dashboard KPIs - Remove Call Metrics

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the Dashboard to remove call-centric KPIs and replace with reward-centric ones.

**FILE TO MODIFY:** `src/pages/Dashboard.tsx`

**STEP 1: REMOVE** these imports (around line 45):
```typescript
// REMOVE THESE LINES:
import { useCallStats, useRewardSummary, useConditionCompletionRate } from '@/features/call-center/hooks';
```

**STEP 2: REPLACE WITH** new imports:
```typescript
import { useRewardMetrics } from '@/features/analytics/hooks/useRewardMetrics';
```

**STEP 3: UPDATE** the hooks usage inside the component:

FIND (around lines 55-58):
```typescript
const { data: callStats } = useCallStats(currentClient?.id || null, dateRange);
const { data: rewardSummary } = useRewardSummary(currentClient?.id || null, dateRange);
const { data: conditionRate } = useConditionCompletionRate(currentClient?.id || null, dateRange);
```

REPLACE WITH:
```typescript
const { data: rewardMetrics } = useRewardMetrics(currentClient?.id || null, dateRange);
```

**STEP 4: REPLACE** the entire kpiCards array (around lines 60-110):

```typescript
const kpiCards = [
  {
    title: "Active Campaigns",
    value: stats?.activeCampaigns || 0,
    change: stats?.campaignTrend || 0,
    icon: Send,
    color: "text-primary",
    bgGradient: "from-primary/10 via-primary/5 to-transparent",
  },
  {
    title: "Rewards Given Today",
    value: rewardMetrics?.todayCount || 0,
    change: rewardMetrics?.todayTrend || 0,
    icon: Gift,
    color: "text-green-600",
    bgGradient: "from-green-600/10 via-green-600/5 to-transparent",
  },
  {
    title: "Total Rewards Value",
    value: `$${(rewardMetrics?.totalValue || 0).toLocaleString()}`,
    change: 0,
    icon: DollarSign,
    color: "text-purple-600",
    bgGradient: "from-purple-600/10 via-purple-600/5 to-transparent",
  },
  {
    title: "Pending Redemptions",
    value: rewardMetrics?.pendingCount || 0,
    change: 0,
    icon: Clock,
    color: "text-amber-600",
    bgGradient: "from-amber-600/10 via-amber-600/5 to-transparent",
  },
  {
    title: "Reward Rate",
    value: `${(rewardMetrics?.rewardRate || 0).toFixed(1)}%`,
    change: rewardMetrics?.rewardRateTrend || 0,
    icon: Target,
    color: "text-blue-600",
    bgGradient: "from-blue-600/10 via-blue-600/5 to-transparent",
  },
  {
    title: "Total Recipients",
    value: stats?.totalRecipients?.toLocaleString() || "0",
    change: stats?.recipientTrend || 0,
    icon: Users,
    color: "text-purple-600",
    bgGradient: "from-purple-600/10 via-purple-600/5 to-transparent",
  },
  {
    title: "Email Open Rate",
    value: `${(rewardMetrics?.emailOpenRate || 0).toFixed(1)}%`,
    change: 0,
    icon: MailOpen,
    color: "text-green-600",
    bgGradient: "from-green-600/10 via-green-600/5 to-transparent",
  },
  {
    title: "Response Rate",
    value: `${stats?.responseRate?.toFixed(1) || 0}%`,
    change: stats?.responseTrend || 0,
    icon: MousePointerClick,
    color: "text-amber-600",
    bgGradient: "from-amber-600/10 via-amber-600/5 to-transparent",
  },
];
```

**STEP 5: ADD** the MailOpen import at the top:
```typescript
import { MailOpen } from "lucide-react";
```

**STEP 6: REMOVE** any remaining references to:
- `callStats`
- `Phone` icon related to calls
- "Active Calls Today"
- "Avg Call Duration"

---
```

---

## PROMPT 4.2: Create useRewardMetrics Hook

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create a new hook for fetching reward metrics for the dashboard.

**CREATE NEW FILE:** `src/features/analytics/hooks/useRewardMetrics.ts`

**FULL FILE CONTENT:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { startOfDay, subDays } from "date-fns";

interface RewardMetrics {
  todayCount: number;
  todayTrend: number;
  totalValue: number;
  pendingCount: number;
  rewardRate: number;
  rewardRateTrend: number;
  emailOpenRate: number;
  totalRewards: number;
}

export function useRewardMetrics(clientId: string | null, dateRange: number = 30) {
  return useQuery({
    queryKey: ['reward-metrics', clientId, dateRange],
    queryFn: async (): Promise<RewardMetrics> => {
      if (!clientId) {
        return {
          todayCount: 0,
          todayTrend: 0,
          totalValue: 0,
          pendingCount: 0,
          rewardRate: 0,
          rewardRateTrend: 0,
          emailOpenRate: 0,
          totalRewards: 0,
        };
      }

      const today = startOfDay(new Date());
      const yesterday = subDays(today, 1);
      const rangeStart = subDays(today, dateRange);
      const previousRangeStart = subDays(rangeStart, dateRange);

      // Get today's rewards
      const { count: todayCount } = await supabase
        .from('recipient_gift_cards')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('created_at', today.toISOString());

      // Get yesterday's rewards for trend
      const { count: yesterdayCount } = await supabase
        .from('recipient_gift_cards')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      // Calculate today trend
      const todayTrend = yesterdayCount && yesterdayCount > 0
        ? ((todayCount || 0) - yesterdayCount) / yesterdayCount * 100
        : 0;

      // Get total rewards value in date range
      const { data: rewardsData } = await supabase
        .from('recipient_gift_cards')
        .select('card_value')
        .eq('client_id', clientId)
        .gte('created_at', rangeStart.toISOString());

      const totalValue = rewardsData?.reduce((sum, r) => sum + (r.card_value || 0), 0) || 0;

      // Get pending rewards (gift cards that haven't been delivered)
      const { count: pendingCount } = await supabase
        .from('recipient_gift_cards')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'pending');

      // Calculate reward rate (rewards / total recipients in active campaigns)
      const { data: activeCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', clientId)
        .in('status', ['in_progress', 'scheduled']);

      let totalRecipients = 0;
      let totalRewards = 0;

      if (activeCampaigns && activeCampaigns.length > 0) {
        const campaignIds = activeCampaigns.map(c => c.id);
        
        // Get recipient count from audiences
        const { data: audiences } = await supabase
          .from('campaigns')
          .select('audiences(valid_count), contact_lists(contact_count)')
          .in('id', campaignIds);
        
        totalRecipients = audiences?.reduce((sum, a) => {
          return sum + (a.audiences?.valid_count || a.contact_lists?.contact_count || 0);
        }, 0) || 0;

        // Get reward count for these campaigns
        const { count } = await supabase
          .from('recipient_gift_cards')
          .select('*', { count: 'exact', head: true })
          .in('campaign_id', campaignIds);
        
        totalRewards = count || 0;
      }

      const rewardRate = totalRecipients > 0 
        ? (totalRewards / totalRecipients) * 100 
        : 0;

      // Calculate reward rate trend (compare to previous period)
      // Simplified: just return 0 for now, can be enhanced
      const rewardRateTrend = 0;

      // Get email open rate
      const { data: emailSends } = await supabase
        .from('campaign_message_sends')
        .select('opened_at')
        .eq('message_type', 'email')
        .gte('created_at', rangeStart.toISOString());

      const emailsSent = emailSends?.length || 0;
      const emailsOpened = emailSends?.filter(e => e.opened_at).length || 0;
      const emailOpenRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;

      return {
        todayCount: todayCount || 0,
        todayTrend,
        totalValue,
        pendingCount: pendingCount || 0,
        rewardRate,
        rewardRateTrend,
        emailOpenRate,
        totalRewards,
      };
    },
    enabled: !!clientId,
    staleTime: 60000, // Cache for 1 minute
  });
}
```

**STEP 2: Export the hook**

**FILE TO MODIFY:** `src/features/analytics/hooks/index.ts`

ADD this export:
```typescript
export * from './useRewardMetrics';
```

---
```

---

# PHASE 5: CAMPAIGN WIZARD UPDATE

## PROMPT 5.1: Update Campaign Types Definition

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the campaign types and form data definitions.

**FILE TO MODIFY:** `src/types/campaigns.ts`

**ADD** this new type after the existing imports:

```typescript
/**
 * Campaign Type
 * Defines the channel and delivery method for the campaign
 */
export type CampaignType = 
  | 'direct_mail'    // Physical postcards/letters
  | 'email'          // Single email blast
  | 'sms'            // Single SMS blast
  | 'email_drip'     // Automated email sequence
  | 'sms_drip'       // Automated SMS sequence
  | 'multi_channel'; // Direct mail + email/SMS follow-ups

/**
 * Email Sequence Step
 * A single email in a drip sequence
 */
export interface EmailSequenceStep {
  id: string;
  sequence_order: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  preview_text?: string;
  body_html: string;
  body_text?: string;
  trigger_type: 'time_based' | 'on_open' | 'on_click' | 'on_no_action';
  is_active: boolean;
}

/**
 * SMS Sequence Step
 * A single SMS in a drip sequence
 */
export interface SMSSequenceStep {
  id: string;
  sequence_order: number;
  delay_days: number;
  delay_hours: number;
  message_body: string;
  media_url?: string;
  trigger_type: 'time_based' | 'on_reply' | 'on_no_reply' | 'on_link_click';
  is_active: boolean;
}
```

**UPDATE** the CampaignFormData interface - ADD these fields:

```typescript
export interface CampaignFormData {
  // Existing fields...
  
  // NEW: Campaign Type (Step 0)
  campaign_type?: CampaignType;
  
  // NEW: Email Configuration
  email_enabled?: boolean;
  email_from_name?: string;
  email_from_address?: string;
  email_reply_to?: string;
  email_sequences?: EmailSequenceStep[];
  
  // NEW: SMS Configuration
  sms_enabled?: boolean;
  sms_sequences?: SMSSequenceStep[];
  
  // ... rest of existing fields
}
```

---
```

---

## PROMPT 5.2: Create Campaign Type Selection Step

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create a new wizard step for selecting campaign type.

**CREATE NEW FILE:** `src/features/campaigns/components/wizard/CampaignTypeStep.tsx`

**FULL FILE CONTENT:**

```typescript
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Mail, MailOpen, MessageSquare, Send, Layers, CheckCircle2 } from "lucide-react";
import type { CampaignType } from "@/types/campaigns";

interface CampaignTypeStepProps {
  selectedType: CampaignType | null;
  onSelect: (type: CampaignType) => void;
  onNext: () => void;
  onCancel: () => void;
}

const CAMPAIGN_TYPES: Array<{
  type: CampaignType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  color: string;
  badge?: string;
}> = [
  {
    type: 'direct_mail',
    title: 'Direct Mail',
    description: 'Send physical postcards or letters to your audience',
    icon: Mail,
    features: [
      'Physical mail pieces',
      'QR code tracking',
      'USPS delivery tracking',
      'Gift card rewards'
    ],
    color: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
  },
  {
    type: 'email',
    title: 'Email Campaign',
    description: 'Send a single email blast to your audience',
    icon: MailOpen,
    features: [
      'Rich HTML emails',
      'Open & click tracking',
      'Personalization',
      'A/B testing support'
    ],
    color: 'border-green-500 bg-green-50 dark:bg-green-950',
  },
  {
    type: 'email_drip',
    title: 'Email Drip Sequence',
    description: 'Automated email series sent over time',
    icon: Send,
    features: [
      'Multiple email steps',
      'Time-based triggers',
      'Behavior triggers',
      'Sequence analytics'
    ],
    color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950',
    badge: 'Popular',
  },
  {
    type: 'sms',
    title: 'SMS Campaign',
    description: 'Send a single text message to your audience',
    icon: MessageSquare,
    features: [
      'Text messages',
      'Delivery tracking',
      'Link tracking',
      'MMS support'
    ],
    color: 'border-purple-500 bg-purple-50 dark:bg-purple-950',
  },
  {
    type: 'sms_drip',
    title: 'SMS Drip Sequence',
    description: 'Automated SMS series sent over time',
    icon: MessageSquare,
    features: [
      'Multiple SMS steps',
      'Time-based triggers',
      'Reply detection',
      'Opt-out handling'
    ],
    color: 'border-violet-500 bg-violet-50 dark:bg-violet-950',
  },
  {
    type: 'multi_channel',
    title: 'Multi-Channel Campaign',
    description: 'Direct mail with email and/or SMS follow-ups',
    icon: Layers,
    features: [
      'Physical mail + digital',
      'Coordinated timing',
      'Cross-channel tracking',
      'Maximum engagement'
    ],
    color: 'border-orange-500 bg-orange-50 dark:bg-orange-950',
    badge: 'Best Results',
  },
];

export function CampaignTypeStep({ 
  selectedType, 
  onSelect, 
  onNext, 
  onCancel 
}: CampaignTypeStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose Campaign Type</h2>
        <p className="text-muted-foreground mt-2">
          Select the type of campaign you want to create
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CAMPAIGN_TYPES.map((campaignType) => {
          const Icon = campaignType.icon;
          const isSelected = selectedType === campaignType.type;
          
          return (
            <Card 
              key={campaignType.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? `ring-2 ring-primary ${campaignType.color}` 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelect(campaignType.type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {campaignType.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {campaignType.badge}
                      </Badge>
                    )}
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg mt-3">{campaignType.title}</CardTitle>
                <CardDescription>{campaignType.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {campaignType.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext} disabled={!selectedType}>
          Continue
        </Button>
      </div>
    </div>
  );
}
```

---
```

---

## PROMPT 5.3: Create Email Sequence Builder Step

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the email sequence builder wizard step.

**CREATE NEW FILE:** `src/features/campaigns/components/wizard/EmailSequenceStep.tsx`

**FULL FILE CONTENT:**

```typescript
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { 
  Plus, Trash2, GripVertical, ChevronDown, Mail, Clock, 
  Wand2, Eye, MailOpen, MousePointerClick
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { EmailSequenceStep as EmailStep, CampaignFormData } from "@/types/campaigns";

interface EmailSequenceStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

const MERGE_TAGS = [
  { tag: 'first_name', label: 'First Name' },
  { tag: 'last_name', label: 'Last Name' },
  { tag: 'email', label: 'Email' },
  { tag: 'company', label: 'Company' },
  { tag: 'reward_link', label: 'Reward Link' },
  { tag: 'unsubscribe_link', label: 'Unsubscribe Link' },
];

const TRIGGER_TYPES = [
  { value: 'time_based', label: 'Time Delay', description: 'Send after specified delay' },
  { value: 'on_open', label: 'On Open', description: 'Send when previous email is opened' },
  { value: 'on_click', label: 'On Click', description: 'Send when previous email is clicked' },
  { value: 'on_no_action', label: 'No Action', description: 'Send if no action on previous' },
];

const createDefaultEmail = (order: number): EmailStep => ({
  id: crypto.randomUUID(),
  sequence_order: order,
  delay_days: order === 1 ? 0 : 3,
  delay_hours: 0,
  subject: order === 1 ? 'Welcome!' : `Follow-up ${order}`,
  preview_text: '',
  body_html: '',
  body_text: '',
  trigger_type: 'time_based',
  is_active: true,
});

export function EmailSequenceStep({ 
  clientId, 
  initialData, 
  onNext, 
  onBack 
}: EmailSequenceStepProps) {
  const [emails, setEmails] = useState<EmailStep[]>(() => {
    if (initialData.email_sequences && initialData.email_sequences.length > 0) {
      return initialData.email_sequences;
    }
    // Default: single email for 'email' type, or 3 for 'email_drip'
    const isdrip = initialData.campaign_type === 'email_drip';
    if (isdrip) {
      return [
        createDefaultEmail(1),
        createDefaultEmail(2),
        createDefaultEmail(3),
      ];
    }
    return [createDefaultEmail(1)];
  });

  const [expandedEmail, setExpandedEmail] = useState<string | null>(emails[0]?.id || null);
  const isDrip = initialData.campaign_type === 'email_drip' || initialData.campaign_type === 'multi_channel';

  const handleAddEmail = () => {
    const newEmail = createDefaultEmail(emails.length + 1);
    setEmails([...emails, newEmail]);
    setExpandedEmail(newEmail.id);
  };

  const handleRemoveEmail = (id: string) => {
    if (emails.length === 1) return;
    const newEmails = emails
      .filter(e => e.id !== id)
      .map((e, idx) => ({ ...e, sequence_order: idx + 1 }));
    setEmails(newEmails);
  };

  const handleUpdateEmail = (id: string, updates: Partial<EmailStep>) => {
    setEmails(emails.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(emails);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const renumbered = items.map((item, idx) => ({
      ...item,
      sequence_order: idx + 1,
    }));
    
    setEmails(renumbered);
  };

  const insertMergeTag = (emailId: string, field: 'subject' | 'body_html', tag: string) => {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    const currentValue = email[field] || '';
    handleUpdateEmail(emailId, { [field]: currentValue + `{{${tag}}}` });
  };

  const handleNext = () => {
    const activeEmails = emails.filter(e => e.is_active);
    if (activeEmails.length === 0) {
      alert('At least one email is required');
      return;
    }
    
    // Validate required fields
    for (const email of activeEmails) {
      if (!email.subject.trim()) {
        alert(`Email ${email.sequence_order} is missing a subject`);
        return;
      }
      if (!email.body_html.trim()) {
        alert(`Email ${email.sequence_order} is missing content`);
        return;
      }
    }
    
    onNext({ email_sequences: emails, email_enabled: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {isDrip ? 'Email Sequence' : 'Email Content'}
        </h2>
        <p className="text-muted-foreground mt-2">
          {isDrip 
            ? 'Create your automated email sequence. Emails will be sent based on timing and triggers.'
            : 'Create your email content with personalization and tracking.'}
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="emails">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {emails.map((email, index) => (
                <Draggable key={email.id} draggableId={email.id} index={index}>
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${snapshot.isDragging ? 'shadow-lg' : ''} ${!email.is_active ? 'opacity-60' : ''}`}
                    >
                      <Collapsible 
                        open={expandedEmail === email.id}
                        onOpenChange={(open) => setExpandedEmail(open ? email.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              {isDrip && (
                                <div {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                                {email.sequence_order}
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  {email.subject || `Email ${email.sequence_order}`}
                                </CardTitle>
                                {isDrip && email.sequence_order > 1 && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {email.delay_days}d {email.delay_hours}h after previous
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={email.is_active ? 'default' : 'secondary'}>
                                  {email.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <ChevronDown className={`h-5 w-5 transition-transform ${expandedEmail === email.id ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="space-y-4 pt-0">
                            {/* Active Toggle */}
                            <div className="flex items-center justify-between">
                              <Label>Email Active</Label>
                              <Switch
                                checked={email.is_active}
                                onCheckedChange={(checked) => handleUpdateEmail(email.id, { is_active: checked })}
                              />
                            </div>

                            {/* Timing (for drip sequences) */}
                            {isDrip && email.sequence_order > 1 && (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Delay (Days)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={email.delay_days}
                                    onChange={(e) => handleUpdateEmail(email.id, { delay_days: parseInt(e.target.value) || 0 })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Delay (Hours)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={email.delay_hours}
                                    onChange={(e) => handleUpdateEmail(email.id, { delay_hours: parseInt(e.target.value) || 0 })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Trigger</Label>
                                  <Select
                                    value={email.trigger_type}
                                    onValueChange={(value: any) => handleUpdateEmail(email.id, { trigger_type: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TRIGGER_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                          {t.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {/* Subject Line */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Subject Line *</Label>
                                <span className="text-xs text-muted-foreground">
                                  {email.subject.length}/100 characters
                                </span>
                              </div>
                              <Input
                                value={email.subject}
                                onChange={(e) => handleUpdateEmail(email.id, { subject: e.target.value })}
                                placeholder="Enter email subject..."
                                maxLength={100}
                              />
                            </div>

                            {/* Preview Text */}
                            <div className="space-y-2">
                              <Label>Preview Text</Label>
                              <Input
                                value={email.preview_text || ''}
                                onChange={(e) => handleUpdateEmail(email.id, { preview_text: e.target.value })}
                                placeholder="Text shown in inbox preview..."
                                maxLength={150}
                              />
                            </div>

                            {/* Merge Tags */}
                            <div className="space-y-2">
                              <Label>Insert Merge Tag</Label>
                              <div className="flex flex-wrap gap-2">
                                {MERGE_TAGS.map(tag => (
                                  <Button
                                    key={tag.tag}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => insertMergeTag(email.id, 'body_html', tag.tag)}
                                    className="text-xs"
                                  >
                                    <Wand2 className="h-3 w-3 mr-1" />
                                    {tag.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Email Body */}
                            <div className="space-y-2">
                              <Label>Email Content *</Label>
                              <Textarea
                                value={email.body_html}
                                onChange={(e) => handleUpdateEmail(email.id, { body_html: e.target.value })}
                                placeholder="Enter email content... Use {{first_name}} for personalization."
                                rows={8}
                                className="font-mono text-sm"
                              />
                              <p className="text-xs text-muted-foreground">
                                HTML is supported. Use merge tags like {'{{first_name}}'} for personalization.
                              </p>
                            </div>

                            {/* Remove Button */}
                            {emails.length > 1 && (
                              <div className="pt-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveEmail(email.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Email
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Email Button (for drip campaigns) */}
      {isDrip && emails.length < 10 && (
        <Button variant="outline" onClick={handleAddEmail} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Email to Sequence
        </Button>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

---
```



---

## PROMPT 5.4: Create SMS Sequence Builder Step

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create the SMS sequence builder wizard step.

**CREATE NEW FILE:** `src/features/campaigns/components/wizard/SMSSequenceStep.tsx`

**FULL FILE CONTENT:**

```typescript
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { 
  Plus, Trash2, GripVertical, ChevronDown, MessageSquare, Clock, 
  Wand2, AlertTriangle, Smartphone
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { SMSSequenceStep as SMSStep, CampaignFormData } from "@/types/campaigns";

interface SMSSequenceStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

const SMS_MERGE_TAGS = [
  { tag: 'first_name', label: 'First Name' },
  { tag: 'last_name', label: 'Last Name' },
  { tag: 'reward_link', label: 'Reward Link' },
  { tag: 'company', label: 'Company' },
];

const SMS_TRIGGER_TYPES = [
  { value: 'time_based', label: 'Time Delay', description: 'Send after specified delay' },
  { value: 'on_reply', label: 'On Reply', description: 'Send when recipient replies' },
  { value: 'on_no_reply', label: 'No Reply', description: 'Send if no reply received' },
  { value: 'on_link_click', label: 'Link Click', description: 'Send when link is clicked' },
];

const SMS_CHAR_LIMIT = 160;
const SMS_CHAR_WARNING = 140;

const createDefaultSMS = (order: number): SMSStep => ({
  id: crypto.randomUUID(),
  sequence_order: order,
  delay_days: order === 1 ? 0 : 2,
  delay_hours: 0,
  message_body: '',
  media_url: '',
  trigger_type: 'time_based',
  is_active: true,
});

export function SMSSequenceStep({ 
  clientId, 
  initialData, 
  onNext, 
  onBack 
}: SMSSequenceStepProps) {
  const [messages, setMessages] = useState<SMSStep[]>(() => {
    if (initialData.sms_sequences && initialData.sms_sequences.length > 0) {
      return initialData.sms_sequences;
    }
    const isDrip = initialData.campaign_type === 'sms_drip';
    if (isDrip) {
      return [
        createDefaultSMS(1),
        createDefaultSMS(2),
      ];
    }
    return [createDefaultSMS(1)];
  });

  const [expandedSMS, setExpandedSMS] = useState<string | null>(messages[0]?.id || null);
  const isDrip = initialData.campaign_type === 'sms_drip' || initialData.campaign_type === 'multi_channel';

  const handleAddSMS = () => {
    const newSMS = createDefaultSMS(messages.length + 1);
    setMessages([...messages, newSMS]);
    setExpandedSMS(newSMS.id);
  };

  const handleRemoveSMS = (id: string) => {
    if (messages.length === 1) return;
    const newMessages = messages
      .filter(m => m.id !== id)
      .map((m, idx) => ({ ...m, sequence_order: idx + 1 }));
    setMessages(newMessages);
  };

  const handleUpdateSMS = (id: string, updates: Partial<SMSStep>) => {
    setMessages(messages.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(messages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const renumbered = items.map((item, idx) => ({
      ...item,
      sequence_order: idx + 1,
    }));
    
    setMessages(renumbered);
  };

  const insertMergeTag = (smsId: string, tag: string) => {
    const sms = messages.find(m => m.id === smsId);
    if (!sms) return;
    handleUpdateSMS(smsId, { message_body: sms.message_body + `{{${tag}}}` });
  };

  const getCharacterCount = (text: string) => {
    // Account for merge tags being replaced with typical values
    let estimated = text
      .replace(/\{\{first_name\}\}/g, 'John')
      .replace(/\{\{last_name\}\}/g, 'Smith')
      .replace(/\{\{company\}\}/g, 'Company')
      .replace(/\{\{reward_link\}\}/g, 'https://bit.ly/xxxxx');
    return estimated.length;
  };

  const getSegmentCount = (charCount: number) => {
    if (charCount <= 160) return 1;
    return Math.ceil(charCount / 153); // Multipart SMS use 153 chars per segment
  };

  const handleNext = () => {
    const activeMessages = messages.filter(m => m.is_active);
    if (activeMessages.length === 0) {
      alert('At least one SMS message is required');
      return;
    }
    
    for (const sms of activeMessages) {
      if (!sms.message_body.trim()) {
        alert(`SMS ${sms.sequence_order} is missing message content`);
        return;
      }
    }
    
    onNext({ sms_sequences: messages, sms_enabled: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {isDrip ? 'SMS Sequence' : 'SMS Content'}
        </h2>
        <p className="text-muted-foreground mt-2">
          {isDrip 
            ? 'Create your automated SMS sequence. Messages will be sent based on timing and triggers.'
            : 'Create your SMS message with personalization.'}
        </p>
      </div>

      {/* SMS Best Practices Alert */}
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          <strong>SMS Best Practices:</strong> Keep messages under 160 characters for single SMS delivery. 
          Include clear call-to-action and always provide opt-out instructions.
        </AlertDescription>
      </Alert>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sms-messages">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {messages.map((sms, index) => {
                const charCount = getCharacterCount(sms.message_body);
                const segmentCount = getSegmentCount(charCount);
                const isOverLimit = charCount > SMS_CHAR_LIMIT;
                const isNearLimit = charCount > SMS_CHAR_WARNING && charCount <= SMS_CHAR_LIMIT;

                return (
                  <Draggable key={sms.id} draggableId={sms.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${snapshot.isDragging ? 'shadow-lg' : ''} ${!sms.is_active ? 'opacity-60' : ''}`}
                      >
                        <Collapsible 
                          open={expandedSMS === sms.id}
                          onOpenChange={(open) => setExpandedSMS(open ? sms.id : null)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                {isDrip && (
                                  <div {...provided.dragHandleProps} className="cursor-grab">
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 font-semibold">
                                  {sms.sequence_order}
                                </div>
                                <div className="flex-1">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    SMS {sms.sequence_order}
                                    {isOverLimit && (
                                      <Badge variant="destructive" className="text-xs">
                                        {segmentCount} segments
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  {isDrip && sms.sequence_order > 1 && (
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {sms.delay_days}d {sms.delay_hours}h after previous
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={sms.is_active ? 'default' : 'secondary'}>
                                    {sms.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <ChevronDown className={`h-5 w-5 transition-transform ${expandedSMS === sms.id ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="space-y-4 pt-0">
                              {/* Active Toggle */}
                              <div className="flex items-center justify-between">
                                <Label>Message Active</Label>
                                <Switch
                                  checked={sms.is_active}
                                  onCheckedChange={(checked) => handleUpdateSMS(sms.id, { is_active: checked })}
                                />
                              </div>

                              {/* Timing (for drip sequences) */}
                              {isDrip && sms.sequence_order > 1 && (
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label>Delay (Days)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={sms.delay_days}
                                      onChange={(e) => handleUpdateSMS(sms.id, { delay_days: parseInt(e.target.value) || 0 })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Delay (Hours)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="23"
                                      value={sms.delay_hours}
                                      onChange={(e) => handleUpdateSMS(sms.id, { delay_hours: parseInt(e.target.value) || 0 })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Trigger</Label>
                                    <Select
                                      value={sms.trigger_type}
                                      onValueChange={(value: any) => handleUpdateSMS(sms.id, { trigger_type: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SMS_TRIGGER_TYPES.map(t => (
                                          <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}

                              {/* Merge Tags */}
                              <div className="space-y-2">
                                <Label>Insert Merge Tag</Label>
                                <div className="flex flex-wrap gap-2">
                                  {SMS_MERGE_TAGS.map(tag => (
                                    <Button
                                      key={tag.tag}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => insertMergeTag(sms.id, tag.tag)}
                                      className="text-xs"
                                    >
                                      <Wand2 className="h-3 w-3 mr-1" />
                                      {tag.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              {/* Message Body */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Message Content *</Label>
                                  <span className={`text-xs ${
                                    isOverLimit ? 'text-destructive font-medium' : 
                                    isNearLimit ? 'text-amber-500' : 'text-muted-foreground'
                                  }`}>
                                    ~{charCount}/{SMS_CHAR_LIMIT} characters
                                    {segmentCount > 1 && ` (${segmentCount} SMS)`}
                                  </span>
                                </div>
                                <Textarea
                                  value={sms.message_body}
                                  onChange={(e) => handleUpdateSMS(sms.id, { message_body: e.target.value })}
                                  placeholder="Enter your SMS message... Use {{first_name}} for personalization."
                                  rows={4}
                                  className={`font-mono text-sm ${isOverLimit ? 'border-destructive' : ''}`}
                                />
                                {isOverLimit && (
                                  <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Message exceeds 160 characters and will be sent as {segmentCount} SMS segments (higher cost)
                                  </p>
                                )}
                              </div>

                              {/* Phone Preview */}
                              <div className="space-y-2">
                                <Label>Preview</Label>
                                <div className="bg-muted rounded-2xl p-4 max-w-xs">
                                  <div className="bg-primary text-primary-foreground rounded-xl p-3 text-sm">
                                    {sms.message_body
                                      .replace(/\{\{first_name\}\}/g, 'John')
                                      .replace(/\{\{last_name\}\}/g, 'Smith')
                                      .replace(/\{\{company\}\}/g, 'Acme Corp')
                                      .replace(/\{\{reward_link\}\}/g, 'https://bit.ly/xxxxx')
                                      || 'Your message preview will appear here...'}
                                  </div>
                                </div>
                              </div>

                              {/* Remove Button */}
                              {messages.length > 1 && (
                                <div className="pt-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveSMS(sms.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove SMS
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add SMS Button (for drip campaigns) */}
      {isDrip && messages.length < 10 && (
        <Button variant="outline" onClick={handleAddSMS} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add SMS to Sequence
        </Button>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

---
```

---

## PROMPT 5.5: Update Campaign Wizard to Support All Types

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the main CreateCampaignWizard to support all campaign types with dynamic steps.

**FILE TO MODIFY:** `src/features/campaigns/components/CreateCampaignWizard.tsx`

**STEP 1: ADD** new imports at the top:
```typescript
import { CampaignTypeStep } from "./wizard/CampaignTypeStep";
import { EmailSequenceStep } from "./wizard/EmailSequenceStep";
import { SMSSequenceStep } from "./wizard/SMSSequenceStep";
import type { CampaignType } from "@/types/campaigns";
```

**STEP 2: UPDATE** the initial state to include campaign_type:
```typescript
const [formData, setFormData] = useState<Partial<CampaignFormData>>({
  name: "",
  campaign_type: undefined, // NEW
  mailing_method: undefined,
  utm_source: "directmail",
  utm_medium: "postcard",
});
```

**STEP 3: ADD** a new state for tracking selected campaign type:
```typescript
const [campaignType, setCampaignType] = useState<CampaignType | null>(null);
```

**STEP 4: REPLACE** the steps calculation with a dynamic version:

```typescript
// Dynamic steps based on campaign type
const getStepsForType = (type: CampaignType | null): Array<{ label: string; description: string }> => {
  // Step 0 is always campaign type selection
  const baseSteps = [
    { label: "Type", description: "Campaign type" },
  ];

  if (!type) {
    return baseSteps;
  }

  // Common setup steps
  const setupSteps = [
    { label: "Setup", description: "Campaign name" },
    { label: "Audience", description: "Select recipients" },
  ];

  // Type-specific steps
  const typeSteps: Record<CampaignType, Array<{ label: string; description: string }>> = {
    direct_mail: [
      { label: "Codes & Setup", description: "Codes and landing page" },
    ],
    email: [
      { label: "Email", description: "Email content" },
    ],
    email_drip: [
      { label: "Emails", description: "Email sequence" },
    ],
    sms: [
      { label: "SMS", description: "SMS content" },
    ],
    sms_drip: [
      { label: "Messages", description: "SMS sequence" },
    ],
    multi_channel: [
      { label: "Mail Setup", description: "Codes and landing page" },
      { label: "Emails", description: "Email follow-ups" },
      { label: "SMS", description: "SMS follow-ups" },
    ],
  };

  // Final steps
  const finalSteps = [
    { label: "Rewards", description: "Reward conditions" },
    { label: "Review", description: "Confirm & create" },
  ];

  return [...baseSteps, ...setupSteps, ...(typeSteps[type] || []), ...finalSteps];
};

const steps = useMemo(() => getStepsForType(campaignType), [campaignType]);
const totalSteps = steps.length;
```

**STEP 5: UPDATE** the `renderStep` function to handle all campaign types:

```typescript
const renderStep = () => {
  // Step 0: Campaign Type Selection (always first)
  if (currentStep === 0) {
    return (
      <CampaignTypeStep
        selectedType={campaignType}
        onSelect={(type) => {
          setCampaignType(type);
          setFormData({ ...formData, campaign_type: type });
        }}
        onNext={() => setCurrentStep(1)}
        onCancel={handleClose}
      />
    );
  }

  // After type selection, render based on campaign type
  if (!campaignType) {
    return null;
  }

  // Calculate which logical step we're on
  const stepIndex = currentStep;

  // Common steps (1 = Setup, 2 = Audience)
  if (stepIndex === 1) {
    return (
      <CampaignSetupStep
        clientId={clientId}
        initialData={formData}
        onNext={handleNext}
        onBack={() => setCurrentStep(0)}
        mailingMethod={formData.mailing_method}
        campaignType={campaignType}
      />
    );
  }

  if (stepIndex === 2) {
    return (
      <AudiencesStep
        clientId={clientId}
        initialData={formData}
        onNext={handleNext}
        onBack={handleBack}
      />
    );
  }

  // Type-specific steps
  switch (campaignType) {
    case 'direct_mail':
      if (stepIndex === 3) {
        return (
          <CodesUploadStep
            clientId={clientId}
            campaignId={campaignId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 4) {
        return (
          <ConditionsStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 5) {
        return (
          <SummaryStep
            formData={formData}
            clientId={clientId}
            recipientCount={formData.recipient_count || 0}
            onBack={handleBack}
            onConfirm={handleClose}
          />
        );
      }
      break;

    case 'email':
    case 'email_drip':
      if (stepIndex === 3) {
        return (
          <EmailSequenceStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 4) {
        return (
          <ConditionsStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 5) {
        return (
          <SummaryStep
            formData={formData}
            clientId={clientId}
            recipientCount={formData.recipient_count || 0}
            onBack={handleBack}
            onConfirm={handleClose}
          />
        );
      }
      break;

    case 'sms':
    case 'sms_drip':
      if (stepIndex === 3) {
        return (
          <SMSSequenceStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 4) {
        return (
          <ConditionsStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 5) {
        return (
          <SummaryStep
            formData={formData}
            clientId={clientId}
            recipientCount={formData.recipient_count || 0}
            onBack={handleBack}
            onConfirm={handleClose}
          />
        );
      }
      break;

    case 'multi_channel':
      if (stepIndex === 3) {
        return (
          <CodesUploadStep
            clientId={clientId}
            campaignId={campaignId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 4) {
        return (
          <EmailSequenceStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 5) {
        return (
          <SMSSequenceStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 6) {
        return (
          <ConditionsStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }
      if (stepIndex === 7) {
        return (
          <SummaryStep
            formData={formData}
            clientId={clientId}
            recipientCount={formData.recipient_count || 0}
            onBack={handleBack}
            onConfirm={handleClose}
          />
        );
      }
      break;
  }

  return null;
};
```

**STEP 6: UPDATE** the `closeWizard` function to reset campaign type:
```typescript
const closeWizard = () => {
  setCurrentStep(0);
  setCampaignType(null); // ADD THIS LINE
  setCurrentDraftId(null);
  setFormData({
    name: "",
    campaign_type: undefined,
    mailing_method: undefined,
    utm_source: "directmail",
    utm_medium: "postcard",
  });
  onOpenChange(false);
};
```

---
```

---

## PROMPT 5.6: Update Campaign Creation Hook to Handle All Types

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the campaign creation hook to handle all campaign types and save email/SMS sequences.

**FILE TO MODIFY:** `src/features/campaigns/hooks/useCampaignCreateForm.ts`

**FIND** the `createCampaignMutation` mutationFn and **UPDATE** the campaign insert to include campaign_type:

```typescript
// Create campaign
const { data: campaign, error: campaignError } = await supabase
  .from("campaigns")
  .insert([{
    client_id: clientId,
    name: data.name!,
    campaign_type: data.campaign_type || 'direct_mail', // ADD THIS
    email_enabled: data.email_enabled || false, // ADD THIS
    sms_enabled: data.sms_enabled || false, // ADD THIS
    email_from_name: data.email_from_name || null, // ADD THIS
    email_from_address: data.email_from_address || null, // ADD THIS
    template_id: data.template_id || null,
    size: data.size || null,
    postage: data.postage || "standard",
    mail_date: data.mail_date ? new Date(data.mail_date).toISOString() : null,
    contact_list_id: data.contact_list_id || null,
    audience_id: audienceId,
    landing_page_id: data.landing_page_id || null,
    lp_mode: data.lp_mode as any || "bridge",
    utm_source: data.utm_source || null,
    utm_medium: data.utm_medium || null,
    utm_campaign: data.utm_campaign || null,
    status: "draft",
  }])
  .select()
  .single();

if (campaignError) throw campaignError;
```

**ADD** this code after creating the campaign to save email sequences:

```typescript
// Save email sequences if present
if (data.email_sequences && data.email_sequences.length > 0) {
  const emailSequencesToInsert = data.email_sequences.map((seq, index) => ({
    campaign_id: campaign.id,
    sequence_order: seq.sequence_order || index + 1,
    delay_days: seq.delay_days || 0,
    delay_hours: seq.delay_hours || 0,
    subject: seq.subject,
    preview_text: seq.preview_text || null,
    body_html: seq.body_html,
    body_text: seq.body_text || null,
    trigger_type: seq.trigger_type || 'time_based',
    is_active: seq.is_active !== false,
  }));

  const { error: emailSeqError } = await supabase
    .from("campaign_email_sequences")
    .insert(emailSequencesToInsert);

  if (emailSeqError) {
    console.error("Failed to save email sequences:", emailSeqError);
    // Don't throw - campaign is already created
  }
}

// Save SMS sequences if present
if (data.sms_sequences && data.sms_sequences.length > 0) {
  const smsSequencesToInsert = data.sms_sequences.map((seq, index) => ({
    campaign_id: campaign.id,
    sequence_order: seq.sequence_order || index + 1,
    delay_days: seq.delay_days || 0,
    delay_hours: seq.delay_hours || 0,
    message_body: seq.message_body,
    media_url: seq.media_url || null,
    trigger_type: seq.trigger_type || 'time_based',
    is_active: seq.is_active !== false,
  }));

  const { error: smsSeqError } = await supabase
    .from("campaign_sms_sequences")
    .insert(smsSequencesToInsert);

  if (smsSeqError) {
    console.error("Failed to save SMS sequences:", smsSeqError);
    // Don't throw - campaign is already created
  }
}
```

---
```



---

# PHASE 6: NAVIGATION UPDATE

## PROMPT 6.1: Update Sidebar Navigation

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Update the sidebar navigation to include campaign type filters and template management sections.

**FILE TO MODIFY:** `src/shared/components/layout/Sidebar.tsx`

**STEP 1: ADD** new imports:
```typescript
import { Mail, MailOpen, MessageSquare, Layers, FileText, Globe, FormInput } from "lucide-react";
```

**STEP 2: FIND** the navigation groups array and **UPDATE** the Campaigns section:

```typescript
// FIND the campaigns navigation group and REPLACE with:
{
  label: "Campaigns",
  collapsible: true,
  defaultOpen: true,
  items: [
    { 
      name: "All Campaigns", 
      href: "/campaigns", 
      icon: Megaphone,
      description: "View all campaigns" 
    },
    { 
      name: "Direct Mail", 
      href: "/campaigns?type=direct_mail", 
      icon: Mail,
      description: "Physical mail campaigns" 
    },
    { 
      name: "Email", 
      href: "/campaigns?type=email", 
      icon: MailOpen,
      description: "Email campaigns & drips" 
    },
    { 
      name: "SMS", 
      href: "/campaigns?type=sms", 
      icon: MessageSquare,
      description: "SMS campaigns & drips" 
    },
    { 
      name: "Multi-Channel", 
      href: "/campaigns?type=multi_channel", 
      icon: Layers,
      description: "Combined channel campaigns" 
    },
  ]
},
```

**STEP 3: ADD** a new Templates/Design section after Campaigns:

```typescript
{
  label: "Templates",
  collapsible: true,
  defaultOpen: false,
  items: [
    { 
      name: "Mail Designs", 
      href: "/mail", 
      icon: FileText,
      description: "Direct mail templates" 
    },
    { 
      name: "Email Templates", 
      href: "/email-templates", 
      icon: MailOpen,
      description: "Reusable email templates" 
    },
    { 
      name: "SMS Templates", 
      href: "/sms-templates", 
      icon: MessageSquare,
      description: "Reusable SMS templates" 
    },
    { 
      name: "Landing Pages", 
      href: "/landing-pages", 
      icon: Globe,
      description: "Campaign landing pages" 
    },
    { 
      name: "ACE Forms", 
      href: "/ace-forms", 
      icon: FormInput,
      description: "Lead capture forms" 
    },
  ]
},
```

**STEP 4: VERIFY** the navigation renders correctly with proper icons and links.

---
```

---

# PHASE 7: EDGE FUNCTIONS

## PROMPT 7.1: Create Email Sequence Processor

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create an edge function to process scheduled email sends from drip sequences.

**CREATE NEW FILE:** `supabase/functions/process-email-sequences/index.ts`

**FULL FILE CONTENT:**

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Process Email Sequences
 * 
 * This function should be called via cron every 5 minutes to process
 * scheduled emails from drip sequences.
 * 
 * It:
 * 1. Finds pending email sends that are due
 * 2. Fetches recipient data
 * 3. Processes merge tags
 * 4. Sends via the email provider
 * 5. Updates send status
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const now = new Date();
    console.log(`[PROCESS-EMAIL-SEQUENCES] Starting at ${now.toISOString()}`);

    // Find pending email sends that are scheduled for now or earlier
    const { data: pendingSends, error: fetchError } = await supabaseClient
      .from('campaign_message_sends')
      .select(`
        *,
        campaign:campaigns(
          id, name, client_id, email_from_name, email_from_address
        ),
        recipient:recipients(
          id, first_name, last_name, email, contact_id
        ),
        contact:contacts(
          id, first_name, last_name, email
        )
      `)
      .eq('message_type', 'email')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(50); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch pending sends: ${fetchError.message}`);
    }

    if (!pendingSends || pendingSends.length === 0) {
      console.log('[PROCESS-EMAIL-SEQUENCES] No pending emails to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PROCESS-EMAIL-SEQUENCES] Found ${pendingSends.length} pending emails`);

    let processed = 0;
    let failed = 0;

    for (const send of pendingSends) {
      try {
        // Get email sequence content
        const { data: sequence } = await supabaseClient
          .from('campaign_email_sequences')
          .select('*')
          .eq('id', send.sequence_id)
          .single();

        if (!sequence) {
          console.error(`[PROCESS-EMAIL-SEQUENCES] Sequence not found for send ${send.id}`);
          continue;
        }

        // Get recipient data
        const recipientData = send.recipient || send.contact || {};
        const firstName = recipientData.first_name || '';
        const lastName = recipientData.last_name || '';
        const email = send.to_address;

        // Process merge tags in subject and body
        const processedSubject = processMergeTags(sequence.subject, {
          first_name: firstName,
          last_name: lastName,
          email: email,
          company: send.campaign?.name || '',
        });

        const processedBody = processMergeTags(sequence.body_html, {
          first_name: firstName,
          last_name: lastName,
          email: email,
          company: send.campaign?.name || '',
          unsubscribe_link: `${Deno.env.get('PUBLIC_URL')}/unsubscribe?id=${send.id}`,
        });

        // Update status to queued
        await supabaseClient
          .from('campaign_message_sends')
          .update({ status: 'queued', queued_at: new Date().toISOString() })
          .eq('id', send.id);

        // Send email via send-email function
        const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke('send-email', {
          body: {
            to: email,
            subject: processedSubject,
            html: processedBody,
            from: send.campaign?.email_from_address 
              ? `${send.campaign.email_from_name || 'Notification'} <${send.campaign.email_from_address}>`
              : undefined,
          },
        });

        if (emailError || !emailResult?.success) {
          throw new Error(emailError?.message || emailResult?.error || 'Email send failed');
        }

        // Update status to sent
        await supabaseClient
          .from('campaign_message_sends')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(),
            external_id: emailResult.messageId,
            provider: emailResult.provider || 'resend',
          })
          .eq('id', send.id);

        processed++;
        console.log(`[PROCESS-EMAIL-SEQUENCES] Sent email ${send.id} to ${email}`);

      } catch (error) {
        failed++;
        console.error(`[PROCESS-EMAIL-SEQUENCES] Failed to process send ${send.id}:`, error);

        // Update with error
        await supabaseClient
          .from('campaign_message_sends')
          .update({ 
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            retry_count: (send.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString(),
          })
          .eq('id', send.id);
      }
    }

    console.log(`[PROCESS-EMAIL-SEQUENCES] Complete. Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, processed, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PROCESS-EMAIL-SEQUENCES] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Process merge tags in text
 */
function processMergeTags(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value || '');
  }
  return result;
}
```

---
```

---

## PROMPT 7.2: Create SMS Sequence Processor

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create an edge function to process scheduled SMS sends from drip sequences.

**CREATE NEW FILE:** `supabase/functions/process-sms-sequences/index.ts`

**FULL FILE CONTENT:**

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendSMS, formatPhoneE164 } from '../_shared/sms-provider.ts';

/**
 * Process SMS Sequences
 * 
 * This function should be called via cron every 5 minutes to process
 * scheduled SMS messages from drip sequences.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const now = new Date();
    console.log(`[PROCESS-SMS-SEQUENCES] Starting at ${now.toISOString()}`);

    // Find pending SMS sends that are scheduled for now or earlier
    const { data: pendingSends, error: fetchError } = await supabaseClient
      .from('campaign_message_sends')
      .select(`
        *,
        campaign:campaigns(id, name, client_id),
        recipient:recipients(id, first_name, last_name, phone, contact_id),
        contact:contacts(id, first_name, last_name, phone)
      `)
      .eq('message_type', 'sms')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch pending sends: ${fetchError.message}`);
    }

    if (!pendingSends || pendingSends.length === 0) {
      console.log('[PROCESS-SMS-SEQUENCES] No pending SMS to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PROCESS-SMS-SEQUENCES] Found ${pendingSends.length} pending SMS`);

    let processed = 0;
    let failed = 0;

    for (const send of pendingSends) {
      try {
        // Get SMS sequence content
        const { data: sequence } = await supabaseClient
          .from('campaign_sms_sequences')
          .select('*')
          .eq('id', send.sequence_id)
          .single();

        if (!sequence) {
          console.error(`[PROCESS-SMS-SEQUENCES] Sequence not found for send ${send.id}`);
          continue;
        }

        // Get recipient data
        const recipientData = send.recipient || send.contact || {};
        const firstName = recipientData.first_name || '';
        const lastName = recipientData.last_name || '';
        const phone = send.to_address;

        // Format phone number
        const formattedPhone = formatPhoneE164(phone);

        // Process merge tags in message
        const processedMessage = processMergeTags(sequence.message_body, {
          first_name: firstName,
          last_name: lastName,
          company: send.campaign?.name || '',
          reward_link: `${Deno.env.get('PUBLIC_URL')}/r/${send.id}`,
        });

        // Update status to queued
        await supabaseClient
          .from('campaign_message_sends')
          .update({ status: 'queued', queued_at: new Date().toISOString() })
          .eq('id', send.id);

        // Send SMS using provider abstraction
        const smsResult = await sendSMS(formattedPhone, processedMessage, supabaseClient);

        if (!smsResult.success) {
          throw new Error(smsResult.error || 'SMS send failed');
        }

        // Update status to sent
        await supabaseClient
          .from('campaign_message_sends')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(),
            external_id: smsResult.messageId,
            provider: smsResult.provider,
          })
          .eq('id', send.id);

        processed++;
        console.log(`[PROCESS-SMS-SEQUENCES] Sent SMS ${send.id} to ${formattedPhone}`);

      } catch (error) {
        failed++;
        console.error(`[PROCESS-SMS-SEQUENCES] Failed to process send ${send.id}:`, error);

        // Update with error
        await supabaseClient
          .from('campaign_message_sends')
          .update({ 
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            retry_count: (send.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString(),
          })
          .eq('id', send.id);
      }
    }

    console.log(`[PROCESS-SMS-SEQUENCES] Complete. Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, processed, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PROCESS-SMS-SEQUENCES] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function processMergeTags(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value || '');
  }
  return result;
}
```

---
```

---

## PROMPT 7.3: Create Email Webhook Handler

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create an edge function to handle email webhook events (opens, clicks, bounces).

**CREATE NEW FILE:** `supabase/functions/email-webhook/index.ts`

**FULL FILE CONTENT:**

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Email Webhook Handler
 * 
 * Receives webhook events from email providers (Resend, SendGrid)
 * and updates the campaign_message_sends and campaign_message_events tables.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    const provider = req.headers.get('x-provider') || detectProvider(body);
    
    console.log(`[EMAIL-WEBHOOK] Received ${provider} webhook:`, JSON.stringify(body).substring(0, 500));

    // Normalize the webhook payload
    const events = normalizeWebhookEvents(body, provider);

    for (const event of events) {
      await processEvent(supabaseClient, event);
    }

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EMAIL-WEBHOOK] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface NormalizedEvent {
  messageId: string;
  eventType: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  timestamp: string;
  linkUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  rawPayload: any;
}

function detectProvider(body: any): string {
  if (body.type && body.data?.email_id) return 'resend';
  if (Array.isArray(body) && body[0]?.event) return 'sendgrid';
  return 'unknown';
}

function normalizeWebhookEvents(body: any, provider: string): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];

  if (provider === 'resend') {
    // Resend webhook format
    const event: NormalizedEvent = {
      messageId: body.data?.email_id,
      eventType: mapResendEventType(body.type),
      timestamp: body.created_at || new Date().toISOString(),
      linkUrl: body.data?.click?.link,
      rawPayload: body,
    };
    if (event.messageId) events.push(event);
  } 
  else if (provider === 'sendgrid') {
    // SendGrid webhook format (array of events)
    for (const item of body) {
      const event: NormalizedEvent = {
        messageId: item.sg_message_id?.split('.')[0],
        eventType: mapSendGridEventType(item.event),
        timestamp: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : new Date().toISOString(),
        linkUrl: item.url,
        userAgent: item.useragent,
        ipAddress: item.ip,
        rawPayload: item,
      };
      if (event.messageId) events.push(event);
    }
  }

  return events;
}

function mapResendEventType(type: string): NormalizedEvent['eventType'] {
  const mapping: Record<string, NormalizedEvent['eventType']> = {
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  };
  return mapping[type] || 'delivered';
}

function mapSendGridEventType(event: string): NormalizedEvent['eventType'] {
  const mapping: Record<string, NormalizedEvent['eventType']> = {
    'delivered': 'delivered',
    'open': 'opened',
    'click': 'clicked',
    'bounce': 'bounced',
    'spamreport': 'complained',
    'unsubscribe': 'unsubscribed',
  };
  return mapping[event] || 'delivered';
}

async function processEvent(supabaseClient: any, event: NormalizedEvent) {
  // Find the message send by external_id
  const { data: messageSend, error: findError } = await supabaseClient
    .from('campaign_message_sends')
    .select('id, status, open_count, click_count')
    .eq('external_id', event.messageId)
    .single();

  if (findError || !messageSend) {
    console.log(`[EMAIL-WEBHOOK] Message send not found for ID: ${event.messageId}`);
    return;
  }

  // Update the message send record
  const updates: Record<string, any> = {};

  switch (event.eventType) {
    case 'delivered':
      updates.delivered_at = updates.delivered_at || event.timestamp;
      updates.status = 'delivered';
      break;
    case 'opened':
      updates.opened_at = updates.opened_at || event.timestamp;
      updates.open_count = (messageSend.open_count || 0) + 1;
      if (messageSend.status !== 'clicked') {
        updates.status = 'opened';
      }
      break;
    case 'clicked':
      updates.first_click_at = updates.first_click_at || event.timestamp;
      updates.click_count = (messageSend.click_count || 0) + 1;
      updates.status = 'clicked';
      break;
    case 'bounced':
      updates.bounced_at = event.timestamp;
      updates.status = 'bounced';
      break;
    case 'complained':
      updates.status = 'complained';
      break;
    case 'unsubscribed':
      updates.unsubscribed_at = event.timestamp;
      updates.status = 'unsubscribed';
      break;
  }

  if (Object.keys(updates).length > 0) {
    await supabaseClient
      .from('campaign_message_sends')
      .update(updates)
      .eq('id', messageSend.id);
  }

  // Create event record
  await supabaseClient
    .from('campaign_message_events')
    .insert({
      message_send_id: messageSend.id,
      event_type: event.eventType,
      event_at: event.timestamp,
      link_url: event.linkUrl,
      user_agent: event.userAgent,
      ip_address: event.ipAddress,
      raw_payload: event.rawPayload,
    });

  console.log(`[EMAIL-WEBHOOK] Processed ${event.eventType} for message ${messageSend.id}`);
}
```

---
```

---

## PROMPT 7.4: Create Schedule Sequences Function

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create an edge function to schedule email/SMS sequences when a campaign is activated.

**CREATE NEW FILE:** `supabase/functions/schedule-campaign-sequences/index.ts`

**FULL FILE CONTENT:**

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { addDays, addHours } from 'npm:date-fns@3';

/**
 * Schedule Campaign Sequences
 * 
 * When a campaign is activated, this function creates the scheduled
 * message sends for all recipients based on the email/SMS sequences.
 */

interface ScheduleRequest {
  campaignId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { campaignId }: ScheduleRequest = await req.json();

    if (!campaignId) {
      throw new Error('campaignId is required');
    }

    console.log(`[SCHEDULE-SEQUENCES] Scheduling for campaign ${campaignId}`);

    // Get campaign with sequences
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select(`
        *,
        email_sequences:campaign_email_sequences(*),
        sms_sequences:campaign_sms_sequences(*)
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Get recipients
    let recipients: any[] = [];
    
    if (campaign.audience_id) {
      const { data } = await supabaseClient
        .from('recipients')
        .select('id, first_name, last_name, email, phone, contact_id')
        .eq('audience_id', campaign.audience_id);
      recipients = data || [];
    } else if (campaign.contact_list_id) {
      const { data } = await supabaseClient
        .from('contact_list_members')
        .select('contact:contacts(id, first_name, last_name, email, phone)')
        .eq('list_id', campaign.contact_list_id);
      recipients = (data || []).map(d => ({
        ...d.contact,
        contact_id: d.contact?.id,
      }));
    }

    if (recipients.length === 0) {
      console.log('[SCHEDULE-SEQUENCES] No recipients found');
      return new Response(
        JSON.stringify({ success: true, scheduled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SCHEDULE-SEQUENCES] Found ${recipients.length} recipients`);

    const baseTime = campaign.mail_date ? new Date(campaign.mail_date) : new Date();
    let scheduledCount = 0;

    // Schedule email sequences
    const activeEmailSeqs = (campaign.email_sequences || [])
      .filter((s: any) => s.is_active)
      .sort((a: any, b: any) => a.sequence_order - b.sequence_order);

    for (const recipient of recipients) {
      if (!recipient.email) continue;

      let cumulativeDelay = { days: 0, hours: 0 };

      for (const seq of activeEmailSeqs) {
        cumulativeDelay.days += seq.delay_days || 0;
        cumulativeDelay.hours += seq.delay_hours || 0;

        const scheduledFor = addHours(
          addDays(baseTime, cumulativeDelay.days),
          cumulativeDelay.hours
        );

        await supabaseClient
          .from('campaign_message_sends')
          .insert({
            campaign_id: campaignId,
            recipient_id: recipient.id || null,
            contact_id: recipient.contact_id || recipient.id,
            message_type: 'email',
            sequence_id: seq.id,
            sequence_order: seq.sequence_order,
            to_address: recipient.email,
            subject: seq.subject,
            content_preview: seq.body_html?.substring(0, 200),
            status: 'pending',
            scheduled_for: scheduledFor.toISOString(),
          });

        scheduledCount++;
      }
    }

    // Schedule SMS sequences
    const activeSmsSeqs = (campaign.sms_sequences || [])
      .filter((s: any) => s.is_active)
      .sort((a: any, b: any) => a.sequence_order - b.sequence_order);

    for (const recipient of recipients) {
      if (!recipient.phone) continue;

      let cumulativeDelay = { days: 0, hours: 0 };

      for (const seq of activeSmsSeqs) {
        cumulativeDelay.days += seq.delay_days || 0;
        cumulativeDelay.hours += seq.delay_hours || 0;

        const scheduledFor = addHours(
          addDays(baseTime, cumulativeDelay.days),
          cumulativeDelay.hours
        );

        await supabaseClient
          .from('campaign_message_sends')
          .insert({
            campaign_id: campaignId,
            recipient_id: recipient.id || null,
            contact_id: recipient.contact_id || recipient.id,
            message_type: 'sms',
            sequence_id: seq.id,
            sequence_order: seq.sequence_order,
            to_address: recipient.phone,
            content_preview: seq.message_body?.substring(0, 160),
            status: 'pending',
            scheduled_for: scheduledFor.toISOString(),
          });

        scheduledCount++;
      }
    }

    console.log(`[SCHEDULE-SEQUENCES] Scheduled ${scheduledCount} messages`);

    return new Response(
      JSON.stringify({ success: true, scheduled: scheduledCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SCHEDULE-SEQUENCES] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---
```



---

# PHASE 8: TEMPLATE MANAGEMENT

## PROMPT 8.1: Create Email Templates Page

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create a page to manage reusable email templates.

**CREATE NEW FILE:** `src/pages/EmailTemplates.tsx`

**FULL FILE CONTENT:**

```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useTenant } from "@/contexts/TenantContext";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from '@shared/hooks';
import { 
  Plus, Mail, MoreHorizontal, Edit, Trash2, Copy, Eye,
  Search, MailOpen
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/shared/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  preview_text?: string;
  template_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplates() {
  const { currentClient } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates', currentClient?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('client_id', currentClient?.id)
        .eq('template_type', 'email')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!currentClient?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<EmailTemplate>) => {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          client_id: currentClient?.id,
          template_type: 'email',
          name: data.name,
          subject: data.subject,
          body_html: data.body_html,
          body_text: data.body_text,
          preview_text: data.preview_text,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: "Template created successfully" });
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<EmailTemplate>) => {
      const { error } = await supabase
        .from('message_templates')
        .update({
          name: data.name,
          subject: data.subject,
          body_html: data.body_html,
          body_text: data.body_text,
          preview_text: data.preview_text,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: "Template updated successfully" });
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: "Template deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const { error } = await supabase
        .from('message_templates')
        .insert({
          client_id: currentClient?.id,
          template_type: 'email',
          name: `${template.name} (Copy)`,
          subject: template.subject,
          body_html: template.body_html,
          body_text: template.body_text,
          preview_text: template.preview_text,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: "Template duplicated" });
    },
  });

  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description="Create and manage reusable email templates for your campaigns"
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MailOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No email templates yet</p>
              <p className="text-sm mt-2">
                Create your first template to use in email campaigns.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates?.map((template) => (
            <Card key={template.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {template.subject}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(template.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <EmailTemplateDialog
        open={isCreateOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTemplate(null);
          }
        }}
        template={editingTemplate}
        onSave={(data) => {
          if (editingTemplate) {
            updateMutation.mutate({ ...data, id: editingTemplate.id });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>Subject: {previewTemplate?.subject}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white max-h-96 overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: previewTemplate?.body_html || '' }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Dialog Component
function EmailTemplateDialog({ 
  open, 
  onOpenChange, 
  template, 
  onSave, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onSave: (data: Partial<EmailTemplate>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    body_html: '',
    preview_text: '',
  });

  // Reset form when template changes
  useState(() => {
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        body_html: template.body_html,
        preview_text: template.preview_text || '',
      });
    } else {
      setFormData({ name: '', subject: '', body_html: '', preview_text: '' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Email Template'}</DialogTitle>
          <DialogDescription>
            Create a reusable email template for your campaigns.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Welcome Email"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject Line *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Welcome to {{company}}!"
            />
          </div>
          <div className="space-y-2">
            <Label>Preview Text</Label>
            <Input
              value={formData.preview_text}
              onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
              placeholder="Text shown in inbox preview"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Content (HTML) *</Label>
            <Textarea
              value={formData.body_html}
              onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
              placeholder="Enter your email HTML content..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave(formData)} 
            disabled={isLoading || !formData.name || !formData.subject || !formData.body_html}
          >
            {isLoading ? 'Saving...' : template ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---
```

---

## PROMPT 8.2: Create SMS Templates Page

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Create a page to manage reusable SMS templates.

**CREATE NEW FILE:** `src/pages/SMSTemplates.tsx`

Create a similar page to EmailTemplates.tsx but for SMS:
- template_type: 'sms'
- No subject field
- Character counter (160 char limit)
- Phone mockup preview
- message_body instead of body_html

The structure should follow EmailTemplates.tsx with these key differences:

1. Query for template_type = 'sms'
2. Form fields: name, message_body only
3. Add character counter showing chars/160
4. Add warning when over 160 characters
5. Show preview in a phone-style mockup

---
```

---

## PROMPT 8.3: Add Routes for New Pages

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Add routes for the new template management pages.

**FILE TO MODIFY:** `src/App.tsx` (or your main routes file)

**ADD** these imports at the top:
```typescript
import EmailTemplates from "@/pages/EmailTemplates";
import SMSTemplates from "@/pages/SMSTemplates";
```

**ADD** these routes inside your route configuration:
```typescript
<Route path="/email-templates" element={<EmailTemplates />} />
<Route path="/sms-templates" element={<SMSTemplates />} />
```

If you're using protected routes, make sure to wrap them appropriately:
```typescript
<Route element={<ProtectedRoute />}>
  {/* ... existing routes ... */}
  <Route path="/email-templates" element={<EmailTemplates />} />
  <Route path="/sms-templates" element={<SMSTemplates />} />
</Route>
```

---
```

---

# PHASE 9: CLEANUP - REMOVE CALL-CENTER DEPENDENCIES

## PROMPT 9.1: Remove Call-Center Imports from Dashboard

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Remove unused call-center hook imports from the Dashboard.

**FILE TO MODIFY:** `src/pages/Dashboard.tsx`

**FIND AND REMOVE** these imports (they may be around line 45):
```typescript
// REMOVE THESE:
import { useCallStats, useRewardSummary, useConditionCompletionRate } from '@/features/call-center/hooks';
```

**ALSO REMOVE** any usage of these hooks in the component:
```typescript
// REMOVE THESE LINES:
const { data: callStats } = useCallStats(currentClient?.id || null, dateRange);
const { data: conditionRate } = useConditionCompletionRate(currentClient?.id || null, dateRange);
```

**KEEP** useRewardSummary if you've replaced it with useRewardMetrics, otherwise remove it too.

**REMOVE** the Phone import if it's no longer used:
```typescript
// If Phone is only used for call KPIs, remove it from the import:
import { Phone, /* other icons */ } from "lucide-react";
```

---
```

---

## PROMPT 9.2: Remove CallAnalyticsTab and CallLogTab Components

```
CURSOR PROMPT - Copy and paste this entire prompt into Cursor:

---

Remove or comment out the unused call-related tab components.

**FILES TO REVIEW:**

1. `src/features/campaigns/components/CallAnalyticsTab.tsx` - Can be deleted or kept for future use

2. Any imports of CallAnalyticsTab in CampaignDetail.tsx - Remove these imports

**IN CampaignDetail.tsx**, remove:
```typescript
// REMOVE this import:
import { CallAnalyticsTab } from "@/features/campaigns/components/CallAnalyticsTab";
```

Also ensure the tab is not rendered anywhere in the JSX.

**DECISION POINT:**
- If you want to keep call tracking as a future feature, just comment out the tab
- If you're certain it won't be used, delete the file

---
```

---

# TESTING CHECKLIST

## Complete Verification Checklist

```
## Database Verification

[ ] Run all migration SQLs in order
[ ] Verify campaign_type column exists: SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns';
[ ] Verify email_enabled, sms_enabled columns exist
[ ] Verify campaign_email_sequences table exists
[ ] Verify campaign_sms_sequences table exists  
[ ] Verify campaign_message_sends table exists
[ ] Verify campaign_message_events table exists
[ ] Test RLS policies by querying as different users
[ ] Regenerate TypeScript types

## Campaign List Verification

[ ] Load campaigns page
[ ] Verify "Calls" column is NOT visible
[ ] Verify "Conversion" column is NOT visible
[ ] Verify "Recipients" column IS visible
[ ] Verify "Rewards" column IS visible
[ ] Verify "Response" column IS visible
[ ] Verify campaign type icon displays correctly
[ ] Test filter: All Campaigns
[ ] Test filter: Direct Mail
[ ] Test filter: Email
[ ] Test filter: SMS
[ ] Verify URL updates with filter parameter

## Campaign Detail Verification

[ ] Open a direct_mail campaign
[ ] Verify "Call Analytics" tab is NOT visible
[ ] Verify "Call Log" tab is NOT visible
[ ] Verify "Overview" tab IS visible and is default
[ ] Verify "Rewards & Triggers" tab IS visible
[ ] Verify metrics in Overview are correct

[ ] Create an email campaign
[ ] Verify "Email Analytics" tab IS visible
[ ] Verify email metrics show correctly

[ ] Create an SMS campaign
[ ] Verify "SMS Analytics" tab IS visible
[ ] Verify SMS metrics show correctly

## Dashboard Verification

[ ] Load dashboard
[ ] Verify "Active Calls Today" KPI is NOT visible
[ ] Verify "Avg Call Duration" KPI is NOT visible
[ ] Verify "Rewards Given Today" KPI IS visible
[ ] Verify "Total Rewards Value" KPI IS visible
[ ] Verify "Pending Redemptions" KPI IS visible
[ ] Verify metrics are accurate

## Campaign Creation Wizard Verification

[ ] Open create campaign wizard
[ ] Verify Campaign Type selection step appears first
[ ] Select Direct Mail - verify appropriate steps appear
[ ] Select Email - verify Email content step appears
[ ] Select Email Drip - verify Email sequence builder appears
[ ] Select SMS - verify SMS content step appears
[ ] Select SMS Drip - verify SMS sequence builder appears
[ ] Select Multi-Channel - verify all steps appear

[ ] In Email sequence builder:
[ ] - Add email
[ ] - Edit subject
[ ] - Edit body
[ ] - Add merge tags
[ ] - Remove email
[ ] - Reorder emails

[ ] In SMS sequence builder:
[ ] - Character counter works
[ ] - Warning at 160+ chars
[ ] - Preview updates
[ ] - Merge tags insert correctly

## Campaign Save Verification

[ ] Create email campaign - verify campaign_type saved
[ ] Create SMS campaign - verify campaign_type saved
[ ] Create email_drip - verify sequences saved to campaign_email_sequences
[ ] Create sms_drip - verify sequences saved to campaign_sms_sequences
[ ] Create multi_channel - verify all data saved

## Navigation Verification

[ ] Sidebar shows campaign type filters
[ ] Sidebar shows Templates section
[ ] Email Templates link works
[ ] SMS Templates link works
[ ] Filter links update campaign list correctly

## Template Management Verification

[ ] Email Templates page loads
[ ] Create email template
[ ] Edit email template
[ ] Duplicate email template
[ ] Delete email template
[ ] Preview email template

[ ] SMS Templates page loads
[ ] Create SMS template
[ ] Character counter works
[ ] Preview shows in phone mockup

## Edge Functions (if deployed)

[ ] process-email-sequences function deployed
[ ] process-sms-sequences function deployed
[ ] email-webhook function deployed
[ ] schedule-campaign-sequences function deployed
[ ] Test email sending
[ ] Test SMS sending
[ ] Test webhook handling

## Error Handling

[ ] Missing required fields show validation errors
[ ] API errors display user-friendly messages
[ ] Loading states display correctly
[ ] Empty states display correctly
```

---

# EXECUTION ORDER SUMMARY

| Phase | Prompts | Priority | Est. Hours |
|-------|---------|----------|------------|
| 1 | 1.1-1.6 | CRITICAL | 2h |
| 2 | 2.1-2.3 | HIGH | 3h |
| 3 | 3.1-3.4 | HIGH | 4h |
| 4 | 4.1-4.2 | MEDIUM | 2h |
| 5 | 5.1-5.6 | HIGH | 8h |
| 6 | 6.1 | MEDIUM | 1h |
| 7 | 7.1-7.4 | HIGH | 6h |
| 8 | 8.1-8.3 | LOW | 3h |
| 9 | 9.1-9.2 | MEDIUM | 1h |

**Total Estimated: ~30 hours**

## Quick Start Order

1. **Day 1:** Phase 1 (Database) + Phase 2 (Campaign List Fix)
2. **Day 2:** Phase 3 (Campaign Detail) + Phase 4 (Dashboard)
3. **Day 3:** Phase 5 (Wizard - Part 1: Type Selection, Email Builder)
4. **Day 4:** Phase 5 (Wizard - Part 2: SMS Builder, Integration)
5. **Day 5:** Phase 6 (Navigation) + Phase 7 (Edge Functions)
6. **Day 6:** Phase 8 (Templates) + Phase 9 (Cleanup) + Testing

---

**END OF MASTER PLAN**


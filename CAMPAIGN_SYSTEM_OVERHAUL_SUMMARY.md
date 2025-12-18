# Campaign System Overhaul - Complete Plan
## Making Campaigns Relevant & Adding Email/SMS Capabilities

**Date:** December 17, 2025
**Priority:** HIGH - Core System Update

---

## 📊 CURRENT STATE ANALYSIS

### What's Wrong

**Campaign List View (Image 1):**
| Column | Issue |
|--------|-------|
| Calls | ❌ Not relevant - you don't track inbound calls |
| Conversion | ❌ Based on calls - meaningless without call tracking |
| Size | ⚠️ Only relevant for printed mail |
| Mail Date | ⚠️ Only relevant for direct mail |

**Campaign Detail View (Image 2):**
| Tab | Issue |
|-----|-------|
| Call Analytics | ❌ Not used - irrelevant |
| Call Log | ❌ Not used - irrelevant |
| QR Analytics | ⚠️ Only if QR codes are used |
| Print Batches | ⚠️ Only for printed mail |

**Missing Completely:**
- Email campaign creation/management
- SMS campaign creation/management  
- Drip sequences (multi-touch email/SMS)
- Email/SMS follow-ups for direct mail campaigns
- Campaign type selection in navigation
- Email/SMS analytics

---

## 🎯 PROPOSED ARCHITECTURE

### 1. Campaign Types (New Concept)

```
Campaign Types:
├── direct_mail       (current functionality)
├── email             (NEW - standalone email campaigns)
├── sms               (NEW - standalone SMS campaigns)
├── email_drip        (NEW - automated email sequences)
├── sms_drip          (NEW - automated SMS sequences)
└── multi_channel     (direct mail + email/sms follow-ups)
```

### 2. New Database Schema

**Add to campaigns table:**
```sql
ALTER TABLE campaigns ADD COLUMN campaign_type VARCHAR(50) DEFAULT 'direct_mail';
-- Values: 'direct_mail', 'email', 'sms', 'email_drip', 'sms_drip', 'multi_channel'

ALTER TABLE campaigns ADD COLUMN email_enabled BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN sms_enabled BOOLEAN DEFAULT false;
```

**New table: campaign_email_sequences**
```sql
CREATE TABLE campaign_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  template_id UUID REFERENCES message_templates(id),
  subject VARCHAR(500),
  body_html TEXT,
  trigger_type VARCHAR(50) DEFAULT 'time_based',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New table: campaign_sms_sequences**
```sql
CREATE TABLE campaign_sms_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  message_body TEXT NOT NULL,
  trigger_type VARCHAR(50) DEFAULT 'time_based',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New table: campaign_message_sends**
```sql
CREATE TABLE campaign_message_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  recipient_id UUID REFERENCES recipients(id),
  message_type VARCHAR(20) NOT NULL, -- 'email', 'sms'
  sequence_id UUID,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📋 IMPLEMENTATION PROMPTS

See the full CAMPAIGN_SYSTEM_OVERHAUL_PLAN.md file in /mnt/user-data/outputs/ for complete prompts.

### Summary of Prompts:

1. **Database Schema Updates** - Add campaign_type, create sequence tables
2. **Update Campaign List Columns** - Remove Calls/Conversion, add Recipients/Response
3. **Update Campaign List Query** - Fetch new metrics
4. **Update Campaign Detail Page** - Remove call tabs, add Overview
5. **Update Navigation** - Add campaign type filtering
6. **Create Email Sequence Step** - Wizard for email drips
7. **Create SMS Sequence Step** - Wizard for SMS drips
8. **Update Campaign Wizard** - Add type selection
9. **Create Email Analytics Tab** - Opens, clicks, bounces
10. **Create SMS Analytics Tab** - Delivery, responses
11. **Create Template Management Pages** - Email & SMS templates
12. **Add Routes** - New page routing
13. **Create Send Functions** - Edge functions for sending
14. **Update Campaigns Filter** - Type filtering

---

## 📊 EXECUTION ORDER

| Phase | Prompts | Description | Priority |
|-------|---------|-------------|----------|
| **1** | 1 | Database schema updates | HIGH |
| **2** | 2, 3 | Campaign list relevance | HIGH |
| **3** | 4 | Campaign detail page overhaul | HIGH |
| **4** | 5 | Navigation updates | MEDIUM |
| **5** | 6, 7, 8 | Wizard updates for new types | HIGH |
| **6** | 9, 10 | Analytics tabs | MEDIUM |
| **7** | 11, 12 | Template management pages | MEDIUM |
| **8** | 13 | Email/SMS send functions | HIGH |
| **9** | 14 | Filter functionality | LOW |

---

## 🎯 KEY CHANGES SUMMARY

### Campaign List Will Show:
- Campaign Type icon (mail, email, sms, multi)
- Recipients count
- Rewards sent
- Response rate (rewards/recipients)
- Launch date

### Campaign Detail Will Show:
- Overview tab with key metrics
- Rewards & Triggers (renamed from Conditions)
- Rewards tab
- Email Analytics (if email enabled)
- SMS Analytics (if sms enabled)
- Mail Tracking (if direct mail)
- Approvals
- Comments

### New Capabilities:
- Create email-only campaigns
- Create SMS-only campaigns
- Create email drip sequences
- Create SMS drip sequences
- Add email/SMS follow-ups to direct mail
- Manage email templates
- Manage SMS templates
- Track all message sends with analytics

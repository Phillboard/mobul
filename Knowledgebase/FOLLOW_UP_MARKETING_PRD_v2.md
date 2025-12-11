# FOLLOW-UP MARKETING SYSTEM
## Product Requirements Document (PRD) v2.0

**Version:** 2.0  
**Date:** December 10, 2025  
**Status:** Final Architecture Review  
**Priority:** P0 - Strategic Platform Initiative

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Vision & Goals](#2-vision--goals)
3. [System Architecture](#3-system-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Core Features](#5-core-features)
6. [Advanced Features](#6-advanced-features)
7. [Channel Specifications](#7-channel-specifications)
8. [Compliance & Legal](#8-compliance--legal)
9. [Integration Architecture](#9-integration-architecture)
10. [Analytics & Attribution](#10-analytics--attribution)
11. [AI & Optimization](#11-ai--optimization)
12. [User Experience](#12-user-experience)
13. [Implementation Phases](#13-implementation-phases)
14. [Technical Requirements](#14-technical-requirements)
15. [Success Metrics](#15-success-metrics)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Vision Statement

Transform Mobul from a single-touch direct mail platform into a **comprehensive omnichannel engagement platform** that orchestrates personalized, multi-touch customer journeys across SMS, Email, WhatsApp, and Voice channels—powered by AI optimization and real-time personalization.

## 1.2 Strategic Value

| Stakeholder | Current Pain | Solution Value |
|-------------|--------------|----------------|
| **Agencies** | Manual follow-up, no automation | 40-60% ROI increase via automated sequences |
| **Clients** | Low visibility into recipient journey | Complete attribution and conversion tracking |
| **Recipients** | Generic, poorly-timed messages | Personalized, AI-optimized communications |
| **Mobul** | Single revenue stream (mail) | New revenue: SMS/email volume, AI features, WhatsApp |

## 1.3 Platform Transformation

```
CURRENT STATE                          FUTURE STATE
─────────────────                      ─────────────────
Direct Mail Only                       Omnichannel Platform
     │                                      │
     ▼                                      ▼
┌─────────────┐                      ┌─────────────────────────────────────┐
│   Mail      │                      │  Orchestration Engine               │
│   Piece     │──► Hope for          │                                     │
│   Sent      │    Response          │  Mail ──► SMS ──► Email ──► WhatsApp│
└─────────────┘                      │    │       │        │         │     │
                                     │    └───────┴────────┴─────────┘     │
                                     │              │                       │
                                     │         AI Optimizer                 │
                                     │              │                       │
                                     │    ┌────────┴────────┐              │
                                     │    │ Real-Time       │              │
                                     │    │ Personalization │              │
                                     │    └─────────────────┘              │
                                     └─────────────────────────────────────┘
```

---

# 2. VISION & GOALS

## 2.1 Primary Goals

| ID | Goal | Description | Success Metric |
|----|------|-------------|----------------|
| **G1** | Automated Multi-Step Sequences | Enable creation of complex, branching follow-up sequences | 100% of campaigns can have sequences |
| **G2** | Omnichannel Delivery | Support SMS, Email, WhatsApp, Voice in unified sequences | All 4 channels operational |
| **G3** | Event-Driven Triggers | Trigger sequences from any campaign event | All 7 event types supported |
| **G4** | Full Compliance | TCPA, CAN-SPAM, GDPR compliant by design | 100% audit pass rate |
| **G5** | Complete Attribution | Track full recipient journey with revenue attribution | End-to-end visibility |

## 2.2 Advanced Goals

| ID | Goal | Description | Success Metric |
|----|------|-------------|----------------|
| **G6** | A/B Testing | Test message variants, timing, channels at any step | Statistical significance detection |
| **G7** | AI Send Time Optimization | ML-powered optimal send time per recipient | 15%+ engagement lift |
| **G8** | Two-Way Conversations | Handle replies, enable conversational flows | Response handling for all channels |
| **G9** | Gift Card Integration | Provision and deliver gift cards within sequences | Seamless reward delivery |
| **G10** | Revenue Attribution | Track conversions and attribute revenue to touchpoints | Full funnel attribution |
| **G11** | WhatsApp Business | Rich messaging with buttons, templates, media | WhatsApp Business API integration |
| **G12** | Voice Automation | Automated voice calls with IVR and AI voice | Outbound voice sequences |
| **G13** | Custom Email Builder | Drag-and-drop email designer with components | Visual email creation |
| **G14** | Real-Time Personalization | Dynamic content based on live data sources | External data integration |

## 2.3 Goal Dependencies

```
Phase 1 (Foundation)     Phase 2 (Core)         Phase 3 (Advanced)      Phase 4 (AI/Scale)
────────────────────     ──────────────         ──────────────────      ──────────────────
G1: Sequences     ───►   G3: Triggers    ───►   G6: A/B Testing  ───►  G7: AI Optimization
G2: SMS/Email     ───►   G5: Attribution ───►   G9: Gift Cards   ───►  G14: Real-Time Personal
G4: Compliance    ───►   G8: Replies     ───►   G10: Revenue     ───►  
                         G13: Email Build ───►   G11: WhatsApp    ───►  
                                                 G12: Voice       ───►
```

---

# 3. SYSTEM ARCHITECTURE

## 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Sequence    │  │   Email      │  │  Analytics   │  │ Conversation │        │
│  │  Builder     │  │   Designer   │  │  Dashboard   │  │    Inbox     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Authentication │ Rate Limiting │ Request Validation │ Audit Logging            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ORCHESTRATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐    │
│  │  SEQUENCE ENGINE   │    │  TRIGGER ENGINE    │    │  SCHEDULING ENGINE │    │
│  │                    │    │                    │    │                    │    │
│  │  • Enrollment      │    │  • Event Listeners │    │  • Send Windows    │    │
│  │  • Step Execution  │    │  • Condition Eval  │    │  • Timezone Mgmt   │    │
│  │  • Branching Logic │    │  • Filter Matching │    │  • Queue Priority  │    │
│  │  • A/B Assignment  │    │  • Deduplication   │    │  • Retry Logic     │    │
│  └────────────────────┘    └────────────────────┘    └────────────────────┘    │
│                                                                                  │
│  ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐    │
│  │  PERSONALIZATION   │    │  CONVERSATION      │    │  AI OPTIMIZER      │    │
│  │  ENGINE            │    │  MANAGER           │    │                    │    │
│  │                    │    │                    │    │  • Send Time       │    │
│  │  • Template Render │    │  • Reply Routing   │    │  • Channel Select  │    │
│  │  • Dynamic Content │    │  • Intent Detect   │    │  • Content Rank    │    │
│  │  • External Data   │    │  • Agent Handoff   │    │  • Fatigue Mgmt    │    │
│  └────────────────────┘    └────────────────────┘    └────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DELIVERY LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    SMS      │  │   EMAIL     │  │  WHATSAPP   │  │   VOICE     │            │
│  │  GATEWAY    │  │   GATEWAY   │  │   GATEWAY   │  │   GATEWAY   │            │
│  │             │  │             │  │             │  │             │            │
│  │ • Twilio    │  │ • Resend    │  │ • Meta API  │  │ • Twilio    │            │
│  │ • Infobip   │  │ • SendGrid  │  │ • Infobip   │  │ • Vonage    │            │
│  │ • NotifAPI  │  │ • AWS SES   │  │ • Twilio    │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │   OPERATIONAL   │  │   ANALYTICS     │  │   COMPLIANCE    │                 │
│  │   DATABASE      │  │   WAREHOUSE     │  │   VAULT         │                 │
│  │                 │  │                 │  │                 │                 │
│  │  • Sequences    │  │  • Events       │  │  • Consent      │                 │
│  │  • Enrollments  │  │  • Attribution  │  │  • Suppression  │                 │
│  │  • Executions   │  │  • Performance  │  │  • Audit Logs   │                 │
│  │  • Templates    │  │  • Revenue      │  │  • Retention    │                 │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Event Flow Architecture

```
                              TRIGGER EVENTS
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │               │               │               │               │
    ▼               ▼               ▼               ▼               ▼
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│  Mail  │    │   QR   │    │  PURL  │    │  Form  │    │  Call  │
│Delivered│    │Scanned │    │Visited │    │Submitted│   │Complete│
└────┬───┘    └────┬───┘    └────┬───┘    └────┬───┘    └────┬───┘
     │             │             │             │             │
     └─────────────┴─────────────┴─────────────┴─────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    TRIGGER ENGINE      │
                    │                        │
                    │  1. Match to Sequences │
                    │  2. Evaluate Filters   │
                    │  3. Check Eligibility  │
                    │  4. Verify Consent     │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   SEQUENCE ENGINE      │
                    │                        │
                    │  1. Create Enrollment  │
                    │  2. Assign A/B Variant │
                    │  3. Schedule Step 1    │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  SCHEDULING ENGINE     │
                    │                        │
                    │  1. Check Send Window  │
                    │  2. Apply AI Timing    │
                    │  3. Queue for Delivery │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  PERSONALIZATION       │
                    │                        │
                    │  1. Fetch External Data│
                    │  2. Render Template    │
                    │  3. Dynamic Content    │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  DELIVERY GATEWAY      │
                    │                        │
                    │  1. Select Channel     │
                    │  2. Select Provider    │
                    │  3. Execute Send       │
                    │  4. Handle Fallback    │
                    └───────────┬────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │   SUCCESS    │        │   FAILURE    │
            │              │        │              │
            │ • Log Event  │        │ • Log Error  │
            │ • Update DB  │        │ • Schedule   │
            │ • Next Step  │        │   Retry      │
            └──────────────┘        └──────────────┘
```

## 3.3 Conversation Flow Architecture

```
                         INBOUND MESSAGE
                              │
                              ▼
                    ┌─────────────────────┐
                    │  CHANNEL RECEIVER   │
                    │                     │
                    │  SMS │ Email │ WA   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  MESSAGE ROUTER     │
                    │                     │
                    │  1. Identify Sender │
                    │  2. Match Enrollment│
                    │  3. Parse Intent    │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   OPT-OUT       │  │  AUTO-REPLY     │  │  CONVERSATION   │
│                 │  │                 │  │                 │
│ STOP, CANCEL,   │  │ Keyword Match   │  │ Agent Handoff   │
│ UNSUBSCRIBE     │  │ FAQ Response    │  │ AI Response     │
│                 │  │ Next Step       │  │ Human Review    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ • Add Suppress  │  │ • Send Response │  │ • Create Thread │
│ • Cancel Enroll │  │ • Log Event     │  │ • Notify Agent  │
│ • Confirm Msg   │  │ • Continue Seq  │  │ • Queue Reply   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

# 4. DATA ARCHITECTURE

## 4.1 Core Entities

### Entity Relationship Overview

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   SEQUENCES     │       │    TEMPLATES    │       │    CAMPAIGNS    │
│                 │       │                 │       │   (existing)    │
│  id             │       │  id             │       │                 │
│  name           │◄──────│  sequence_id    │       │  id             │
│  trigger_type   │       │  channel        │       │  name           │
│  status         │       │  content        │       │                 │
└────────┬────────┘       └─────────────────┘       └────────┬────────┘
         │                                                    │
         │                                                    │
         ▼                                                    │
┌─────────────────┐                                          │
│     STEPS       │                                          │
│                 │                                          │
│  id             │                                          │
│  sequence_id    │                                          │
│  step_number    │                                          │
│  channel        │                                          │
│  delay          │                                          │
│  conditions     │                                          │
└────────┬────────┘                                          │
         │                                                    │
         │         ┌─────────────────┐                       │
         │         │   RECIPIENTS    │                       │
         │         │   (existing)    │◄──────────────────────┘
         │         │                 │
         │         │  id             │
         │         │  campaign_id    │
         │         │  phone          │
         │         │  email          │
         │         └────────┬────────┘
         │                  │
         ▼                  ▼
┌─────────────────────────────────────┐
│           ENROLLMENTS               │
│                                     │
│  id                                 │
│  sequence_id ◄──────────────────────┤
│  recipient_id ◄─────────────────────┤
│  campaign_id                        │
│  status                             │
│  current_step                       │
│  ab_variant                         │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           EXECUTIONS                │
│                                     │
│  id                                 │
│  enrollment_id                      │
│  step_id                            │
│  channel                            │
│  status                             │
│  sent_at                            │
│  delivered_at                       │
│  opened_at                          │
│  clicked_at                         │
│  replied_at                         │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           CONVERSATIONS             │
│                                     │
│  id                                 │
│  enrollment_id                      │
│  channel                            │
│  status (open/closed)               │
│  assigned_agent                     │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           MESSAGES                  │
│                                     │
│  id                                 │
│  conversation_id                    │
│  direction (in/out)                 │
│  content                            │
│  timestamp                          │
└─────────────────────────────────────┘
```

## 4.2 Table Specifications

### Sequences Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Owner organization |
| client_id | UUID | Optional client scope |
| name | VARCHAR(255) | Sequence name |
| description | TEXT | Description |
| status | ENUM | draft, active, paused, archived |
| trigger_type | ENUM | Event that starts sequence |
| trigger_config | JSONB | Trigger filters and conditions |
| timezone | VARCHAR(50) | Default timezone |
| send_window_start | TIME | Earliest send time |
| send_window_end | TIME | Latest send time |
| send_days | INTEGER[] | Days of week (0-6) |
| ai_optimization_enabled | BOOLEAN | Use AI for timing |
| max_enrollments_per_recipient | INTEGER | Enrollment limit |
| cooldown_days | INTEGER | Days between enrollments |
| created_at | TIMESTAMPTZ | Creation timestamp |
| published_at | TIMESTAMPTZ | When published |

### Steps Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sequence_id | UUID | Parent sequence |
| step_number | INTEGER | Order in sequence |
| name | VARCHAR(255) | Step name |
| channel | ENUM | sms, email, whatsapp, voice |
| template_id | UUID | Message template |
| delay_value | INTEGER | Wait time |
| delay_unit | ENUM | minutes, hours, days, weeks |
| condition_type | ENUM | When to execute |
| condition_config | JSONB | Condition parameters |
| action_on_complete | ENUM | What happens next |
| action_config | JSONB | Action parameters |
| ab_variants | JSONB[] | A/B test variants |
| is_active | BOOLEAN | Step enabled |

### Templates Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Owner |
| name | VARCHAR(255) | Template name |
| channel | ENUM | sms, email, whatsapp, voice |
| category | VARCHAR(50) | Template category |
| sms_body | TEXT | SMS content |
| email_subject | VARCHAR(255) | Email subject |
| email_html | TEXT | Email HTML |
| email_design_json | JSONB | Email builder JSON |
| whatsapp_template_id | VARCHAR(100) | WA template ID |
| whatsapp_components | JSONB | WA components |
| voice_script | TEXT | Voice script |
| voice_config | JSONB | Voice settings |
| variables | VARCHAR(50)[] | Available variables |
| status | ENUM | draft, active, archived |

### Enrollments Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sequence_id | UUID | Sequence enrolled in |
| recipient_id | UUID | Recipient |
| campaign_id | UUID | Source campaign |
| trigger_type | VARCHAR(50) | What triggered |
| trigger_event_id | UUID | Source event |
| status | ENUM | active, paused, completed, cancelled, opted_out, failed |
| current_step | INTEGER | Current position |
| next_step_due_at | TIMESTAMPTZ | Next execution time |
| steps_completed | INTEGER | Progress count |
| steps_total | INTEGER | Total steps |
| ab_variant | VARCHAR(10) | A/B assignment |
| ai_send_times | JSONB | AI-optimized times |
| enrolled_at | TIMESTAMPTZ | Enrollment time |
| completed_at | TIMESTAMPTZ | Completion time |

### Executions Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| enrollment_id | UUID | Parent enrollment |
| step_id | UUID | Step executed |
| channel | ENUM | Delivery channel |
| rendered_content | JSONB | Final content sent |
| scheduled_at | TIMESTAMPTZ | Planned send time |
| sent_at | TIMESTAMPTZ | Actual send time |
| delivered_at | TIMESTAMPTZ | Delivery confirmed |
| status | ENUM | scheduled, sending, sent, delivered, failed, bounced |
| provider | VARCHAR(50) | Delivery provider |
| provider_message_id | VARCHAR(255) | Provider reference |
| cost_cents | INTEGER | Send cost |
| opened_at | TIMESTAMPTZ | First open |
| clicked_at | TIMESTAMPTZ | First click |
| replied_at | TIMESTAMPTZ | First reply |
| open_count | INTEGER | Total opens |
| click_count | INTEGER | Total clicks |
| links_clicked | JSONB[] | Click details |

### Conversations Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| enrollment_id | UUID | Related enrollment |
| recipient_id | UUID | Recipient |
| channel | ENUM | Conversation channel |
| status | ENUM | open, waiting, closed |
| assigned_to | UUID | Agent assigned |
| last_message_at | TIMESTAMPTZ | Last activity |
| created_at | TIMESTAMPTZ | Started |
| closed_at | TIMESTAMPTZ | Ended |
| close_reason | VARCHAR(50) | Why closed |
| metadata | JSONB | Additional data |

### Messages Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Parent conversation |
| execution_id | UUID | If from sequence |
| direction | ENUM | inbound, outbound |
| channel | ENUM | Message channel |
| content | TEXT | Message content |
| content_type | ENUM | text, image, file, template |
| media_urls | TEXT[] | Attached media |
| sender_type | ENUM | system, agent, recipient |
| sender_id | UUID | Who sent |
| provider_message_id | VARCHAR(255) | Provider ref |
| status | ENUM | sent, delivered, read, failed |
| created_at | TIMESTAMPTZ | Timestamp |

### Consent Tables
| Table | Purpose |
|-------|---------|
| sms_consent_records | SMS opt-in/out tracking |
| email_consent_records | Email consent with double opt-in |
| whatsapp_consent_records | WhatsApp opt-in |
| voice_consent_records | Voice call consent |
| suppression_list | Global suppression |
| consent_audit_log | All consent changes |

### Analytics Tables
| Table | Purpose |
|-------|---------|
| follow_up_events | Event stream |
| attribution_touchpoints | Multi-touch attribution |
| conversion_events | Conversion tracking |
| revenue_attribution | Revenue by touchpoint |
| sequence_performance | Materialized stats |
| ab_test_results | A/B test outcomes |

---

# 5. CORE FEATURES

## 5.1 Sequence Builder

### Description
Visual drag-and-drop interface for creating multi-step, multi-channel follow-up sequences with branching logic.

### Capabilities

| Feature | Description |
|---------|-------------|
| **Visual Canvas** | Drag-and-drop step arrangement |
| **Step Types** | SMS, Email, WhatsApp, Voice, Wait, Condition, Action |
| **Branching** | If/then logic based on engagement |
| **Merging** | Reconnect branches |
| **A/B Testing** | Split traffic at any step |
| **Preview** | See recipient journey timeline |
| **Validation** | Ensure sequence is complete and valid |
| **Versioning** | Track changes, rollback |

### Step Configuration

| Step Type | Configuration Options |
|-----------|----------------------|
| **SMS** | Template, delay, personalization |
| **Email** | Template, subject, delay, tracking |
| **WhatsApp** | Template (approved), buttons, media |
| **Voice** | Script, voice selection, IVR options |
| **Wait** | Duration (minutes to weeks) |
| **Condition** | If opened, clicked, replied, custom |
| **Action** | Gift card, webhook, tag, end sequence |

### Branching Logic

```
Condition Types:
├── Engagement-Based
│   ├── If message opened (email)
│   ├── If link clicked
│   ├── If replied
│   └── If not engaged within X time
├── Data-Based
│   ├── If recipient attribute matches
│   ├── If custom field equals
│   └── If segment membership
├── External
│   ├── If webhook returns value
│   └── If API condition met
└── Time-Based
    ├── If within date range
    └── If day of week matches
```

## 5.2 Template System

### Template Types

| Channel | Template Components |
|---------|---------------------|
| **SMS** | Body text, link shortening, personalization |
| **Email** | Subject, preview text, HTML body, plain text, design JSON |
| **WhatsApp** | Pre-approved template, header, body, footer, buttons, media |
| **Voice** | Script text, SSML markup, voice selection, IVR prompts |

### Personalization Variables

```
Standard Variables:
├── Recipient
│   ├── {{first_name}}
│   ├── {{last_name}}
│   ├── {{full_name}}
│   ├── {{email}}
│   ├── {{phone}}
│   └── {{custom_field_N}}
├── Campaign
│   ├── {{campaign_name}}
│   ├── {{client_name}}
│   └── {{offer_details}}
├── Gift Card
│   ├── {{gift_card_code}}
│   ├── {{gift_card_value}}
│   ├── {{gift_card_brand}}
│   └── {{gift_card_expiration}}
├── Links
│   ├── {{purl}}
│   ├── {{unsubscribe_link}}
│   ├── {{preference_center}}
│   └── {{tracking_link:URL}}
└── Dynamic (Real-Time)
    ├── {{weather.current}}
    ├── {{location.nearest_store}}
    └── {{inventory.product_status}}
```

## 5.3 Trigger System

### Supported Triggers

| Trigger | Source | Data Available |
|---------|--------|----------------|
| **Mail Delivered** | USPS webhook | Delivery date, tracking |
| **QR Code Scanned** | QR redirect | Scan time, device, location |
| **PURL Visited** | Page view | Visit time, duration, device |
| **Form Submitted** | Form completion | All form fields |
| **Call Completed** | Call tracking | Duration, disposition, recording |
| **Condition Met** | Campaign condition | Condition number, metadata |
| **Manual/API** | External trigger | Custom payload |
| **Schedule** | Time-based | Scheduled time |
| **Segment Entry** | Segment rules | Segment details |

### Trigger Filters

```
Filter Configuration:
├── Campaign Filters
│   ├── Specific campaign IDs
│   ├── Campaign tags
│   └── Client ID
├── Recipient Filters
│   ├── Attribute conditions
│   ├── Segment membership
│   └── Previous engagement
├── Event Filters
│   ├── Event metadata matching
│   ├── Time constraints
│   └── Frequency limits
└── Consent Filters
    ├── Has channel consent
    ├── Not suppressed
    └── Consent recency
```

## 5.4 Delivery Engine

### Processing Pipeline

```
1. QUEUE PICKUP
   └── CRON job checks for due steps every minute
   
2. CONSENT VERIFICATION
   ├── Check channel-specific consent
   ├── Check suppression list
   └── Verify consent not expired

3. SEND WINDOW CHECK
   ├── Convert to recipient timezone
   ├── Check if within allowed hours
   ├── Check if allowed day
   └── If outside window, reschedule

4. AI OPTIMIZATION (if enabled)
   ├── Calculate optimal send time
   ├── Check recipient engagement patterns
   └── Adjust within window

5. PERSONALIZATION
   ├── Load recipient data
   ├── Fetch external data (if configured)
   ├── Render template
   └── Validate output

6. CHANNEL ROUTING
   ├── Select primary provider
   ├── Execute send
   ├── Handle failures
   └── Execute fallback if needed

7. POST-SEND
   ├── Update execution record
   ├── Log event
   ├── Calculate next step
   └── Update enrollment
```

### Retry Logic

| Scenario | Retry Strategy |
|----------|----------------|
| Provider timeout | 3 retries, exponential backoff |
| Rate limit | Wait and retry with backoff |
| Temporary failure | Retry in 5, 30, 120 minutes |
| Permanent failure | Mark failed, no retry |
| Invalid recipient | Skip, log, continue sequence |

---

# 6. ADVANCED FEATURES

## 6.1 A/B Testing

### Test Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Message A/B** | Test different content | Which copy converts better |
| **Subject A/B** | Test email subjects | Optimize open rates |
| **Channel A/B** | Test SMS vs Email | Best channel for audience |
| **Timing A/B** | Test send times | Optimal engagement time |
| **Sequence A/B** | Test entire flows | Best overall journey |

### Configuration

```
A/B Test Setup:
├── Variants
│   ├── Variant A (Control): 50%
│   ├── Variant B: 30%
│   └── Variant C: 20%
├── Success Metric
│   ├── Open rate
│   ├── Click rate
│   ├── Reply rate
│   ├── Conversion rate
│   └── Custom event
├── Sample Size
│   ├── Minimum per variant
│   └── Statistical confidence
└── Winner Selection
    ├── Automatic (when significant)
    ├── Manual review
    └── Time-based cutoff
```

## 6.2 Two-Way Conversations

### Reply Handling Flow

```
Inbound Message
      │
      ▼
┌─────────────────┐
│ Parse Message   │
│                 │
│ • Identify      │
│   sender        │
│ • Match to      │
│   enrollment    │
│ • Detect        │
│   intent        │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Keyword │ │Free    │
│Match   │ │Text    │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────┐ ┌────────┐
│Auto    │ │Create  │
│Response│ │Conver- │
│        │ │sation  │
└────────┘ └───┬────┘
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
    ┌────────┐  ┌────────┐
    │AI Auto │  │Agent   │
    │Reply   │  │Queue   │
    └────────┘  └────────┘
```

### Keyword Actions

| Keyword | Action |
|---------|--------|
| STOP, CANCEL, UNSUBSCRIBE | Opt-out, add to suppression |
| HELP, INFO | Send help message |
| YES, START | Confirm opt-in |
| Custom keywords | Trigger specific responses/actions |

### Conversation Inbox Features

- Unified inbox across all channels
- Agent assignment and routing
- Conversation history with timeline
- Quick reply templates
- Customer context sidebar
- Transfer and escalation
- Conversation tagging
- SLA tracking

## 6.3 Gift Card Integration

### Integration Points

```
Gift Card in Sequences:
├── Step Action
│   └── Provision gift card when step executes
├── Template Variable
│   └── Include card details in message
├── Conditional Step
│   └── Branch based on card redemption
└── Conversion Tracking
    └── Attribute revenue to sequence
```

### Configuration Options

| Option | Description |
|--------|-------------|
| Brand selection | Which gift card brand |
| Denomination | Fixed or dynamic amount |
| Delivery method | In-message, separate SMS, email |
| Expiration | Card validity period |
| Budget limits | Max cards per sequence/recipient |

## 6.4 Revenue Attribution

### Attribution Models

| Model | Description |
|-------|-------------|
| **First Touch** | Credit to first interaction |
| **Last Touch** | Credit to final interaction |
| **Linear** | Equal credit to all touches |
| **Time Decay** | More credit to recent touches |
| **Position Based** | 40% first, 40% last, 20% middle |
| **Custom** | Configurable weights |

### Tracked Conversions

- Form submissions
- Gift card redemptions
- Phone calls completed
- Custom conversion events (via API)
- E-commerce purchases (integration)

---

# 7. CHANNEL SPECIFICATIONS

## 7.1 SMS Channel

### Providers
- Primary: Twilio
- Fallback 1: Infobip
- Fallback 2: NotificationAPI

### Capabilities
| Feature | Support |
|---------|---------|
| Text messages | ✅ Up to 1600 characters |
| MMS (images) | ✅ Via supported providers |
| Link shortening | ✅ With click tracking |
| Personalization | ✅ Full variable support |
| Two-way | ✅ Reply handling |
| Opt-out handling | ✅ Automatic keyword processing |

### Compliance Requirements
- Express written consent required
- Include opt-out instructions
- Honor STOP requests immediately
- Send only during allowed hours (8am-9pm local)
- Maintain consent records 5 years

## 7.2 Email Channel

### Providers
- Primary: Resend
- Fallback: SendGrid
- Future: AWS SES

### Capabilities
| Feature | Support |
|---------|---------|
| HTML emails | ✅ Full HTML support |
| Plain text | ✅ Auto-generated or custom |
| Visual builder | ✅ Drag-and-drop designer |
| Personalization | ✅ Full variable support |
| Open tracking | ✅ Pixel tracking |
| Click tracking | ✅ Link wrapping |
| Attachments | ⚠️ Limited (gift card PDFs) |

### Compliance Requirements
- Accurate sender information
- Physical postal address in footer
- One-click unsubscribe
- Honor opt-outs within 10 days
- No deceptive subject lines

## 7.3 WhatsApp Channel

### Provider
- Meta WhatsApp Business API (via Twilio/Infobip)

### Capabilities
| Feature | Support |
|---------|---------|
| Template messages | ✅ Pre-approved only |
| Session messages | ✅ Within 24hr window |
| Rich media | ✅ Images, documents, video |
| Buttons | ✅ Quick reply, URL, call |
| Lists | ✅ Interactive lists |
| Location | ✅ Send/receive locations |

### Requirements
- Business verification required
- Template pre-approval by Meta
- 24-hour response window rules
- Opt-in required (can be implicit)
- Quality rating maintenance

### Template Types
| Type | Use Case |
|------|----------|
| Marketing | Promotional messages |
| Utility | Order updates, confirmations |
| Authentication | OTPs, verification |

## 7.4 Voice Channel

### Providers
- Primary: Twilio Voice
- Fallback: Vonage

### Capabilities
| Feature | Support |
|---------|---------|
| Outbound calls | ✅ Automated dialing |
| Text-to-speech | ✅ Multiple voices/languages |
| Pre-recorded audio | ✅ MP3/WAV support |
| IVR menus | ✅ Press 1 for X |
| Call transfer | ✅ To live agent |
| Voicemail detection | ✅ Leave message |
| Call recording | ✅ With consent |

### Call Flow Options

```
Outbound Call Flow:
├── Answer Detection
│   ├── Human answered → Play message
│   ├── Voicemail → Leave message
│   └── No answer → Retry later
├── Message Playback
│   ├── TTS script
│   └── Pre-recorded audio
├── Interaction
│   ├── IVR menu options
│   ├── Speech recognition
│   └── DTMF input
└── Completion
    ├── Transfer to agent
    ├── Schedule callback
    └── End call
```

### Compliance Requirements
- Prior express consent for marketing
- Identify caller at start
- Honor do-not-call lists
- Time-of-day restrictions
- Allow immediate opt-out

---

# 8. COMPLIANCE & LEGAL

## 8.1 Regulatory Framework

| Regulation | Scope | Key Requirements |
|------------|-------|------------------|
| **TCPA** | US SMS/Voice | Express written consent, time restrictions |
| **CAN-SPAM** | US Email | Sender ID, unsubscribe, physical address |
| **GDPR** | EU All | Explicit consent, data rights, DPO |
| **CCPA** | California | Opt-out rights, disclosure |
| **CASL** | Canada | Express consent, identification |
| **WhatsApp Policy** | Global | Template approval, opt-in, quality |

## 8.2 Consent Management

### Consent Collection Points

```
Consent Sources:
├── Web Forms
│   ├── Checkbox with disclosure
│   ├── Terms acceptance
│   └── Double opt-in email
├── Paper Forms
│   ├── Signed consent form
│   └── Scanned/uploaded proof
├── SMS Keywords
│   ├── Text YES to subscribe
│   └── Keyword opt-in
├── Import
│   ├── With consent proof
│   └── Timestamp and source
└── Implied
    ├── Existing business relationship
    └── Transactional context
```

### Consent Record Requirements

| Field | Required | Description |
|-------|----------|-------------|
| Contact identifier | Yes | Phone/email |
| Consent type | Yes | Express written, verbal, implied |
| Consent source | Yes | How collected |
| Consent language | Yes | What they agreed to |
| Timestamp | Yes | When consented |
| IP address | Recommended | Web submissions |
| Proof | Recommended | Screenshot, recording |
| Expiration | If applicable | Consent validity period |

## 8.3 Opt-Out Processing

### Immediate Actions on Opt-Out

1. Stop all in-progress sends
2. Cancel all scheduled sends
3. Cancel active enrollments
4. Add to suppression list
5. Update consent records
6. Send confirmation (if required)
7. Log audit trail

### Opt-Out Channels

| Channel | Opt-Out Method | Processing Time |
|---------|----------------|-----------------|
| SMS | Reply STOP | Immediate |
| Email | Click unsubscribe | Immediate |
| WhatsApp | Reply STOP | Immediate |
| Voice | Press # or say "stop" | Immediate |
| Web | Preference center | Immediate |
| Manual | Support request | 24-48 hours |

## 8.4 Data Retention

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Consent records | 5 years | Legal requirement |
| Opt-out records | 7 years | Legal requirement |
| Message content | 3 years | Business/audit |
| Delivery logs | 1 year | Debugging |
| Conversation history | 2 years | Support |
| Analytics (aggregated) | Indefinite | Reporting |
| PII | Until opt-out + 30 days | Compliance |

---

# 9. INTEGRATION ARCHITECTURE

## 9.1 Existing System Integration

### Campaign System Integration

```
Campaign Conditions → Follow-Up Triggers
─────────────────────────────────────────
When a campaign condition is met:
1. Current system provisions gift card
2. NEW: Also check for linked sequences
3. NEW: Trigger sequence enrollment if configured

Configuration:
- Add sequence_id field to campaign_conditions table
- Extend evaluate-conditions function to call enrollment
```

### Form System Integration

```
Form Submission → Follow-Up Triggers
────────────────────────────────────
When a form is submitted:
1. Current system saves submission
2. Current system may provision gift card
3. NEW: Check for linked sequences on form
4. NEW: Trigger sequence enrollment if configured

Configuration:
- Add sequence_id field to ace_forms table
- Extend submit-ace-form function to call enrollment
```

### Gift Card System Integration

```
Gift Card Provisioning in Sequences
───────────────────────────────────
Step action can trigger gift card:
1. Sequence step executes
2. If action = provision_gift_card
3. Call existing provision-gift-card-unified
4. Include card details in template variables
5. Continue sequence

Configuration:
- Step action_config includes brand_id, denomination
- Template includes gift card variables
```

## 9.2 External Integrations

### CRM Integration

| System | Integration Type | Data Flow |
|--------|------------------|-----------|
| Salesforce | API/Webhook | Bidirectional contact sync |
| HubSpot | API/Webhook | Contact and activity sync |
| Zoho | API | Contact sync |

### E-commerce Integration

| Platform | Purpose |
|----------|---------|
| Shopify | Purchase attribution, product data |
| WooCommerce | Purchase attribution |
| Custom | Webhook-based |

### Data Enrichment

| Provider | Data Available |
|----------|----------------|
| Clearbit | Company data, social profiles |
| FullContact | Contact enrichment |
| Custom API | Any external data source |

## 9.3 Webhook System

### Outbound Webhooks

Trigger webhooks on events:
- Enrollment created
- Step executed
- Message delivered
- Reply received
- Conversion tracked
- Sequence completed

### Inbound Webhooks

Receive webhooks for:
- Provider delivery status
- Provider reply notifications
- Custom trigger events
- Conversion events

---

# 10. ANALYTICS & ATTRIBUTION

## 10.1 Dashboards

### Sequence Performance Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Sequence: Post-QR Scan Nurture                    [Date Range] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ ENROLLED │  │COMPLETED │  │   SENT   │  │CONVERTED │        │
│  │   1,234  │  │    892   │  │   4,521  │  │    156   │        │
│  │   +12%   │  │   72.3%  │  │  3.7/rec │  │   12.6%  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  FUNNEL VISUALIZATION                                           │
│  ════════════════════════════════════════════════ 1,234        │
│  ═══════════════════════════════════════         1,198 (97%)   │
│  ════════════════════════════════                1,045 (85%)   │
│  ═══════════════════════                           892 (72%)   │
│  ════════════════                                  678 (55%)   │
│                                                                  │
│  STEP PERFORMANCE                                               │
│  ┌────────┬─────────┬──────┬─────────┬────────┬────────┐      │
│  │ Step   │ Channel │ Sent │Delivered│ Opened │ Clicked│      │
│  ├────────┼─────────┼──────┼─────────┼────────┼────────┤      │
│  │ Step 1 │   SMS   │1,198 │  1,189  │   N/A  │   245  │      │
│  │ Step 2 │  Email  │1,045 │  1,023  │   412  │   156  │      │
│  │ Step 3 │WhatsApp │  892 │    885  │   756  │   289  │      │
│  │ Step 4 │  Voice  │  678 │    534  │   N/A  │   N/A  │      │
│  └────────┴─────────┴──────┴─────────┴────────┴────────┘      │
│                                                                  │
│  A/B TEST RESULTS                                               │
│  Variant A: 23.4% conversion   Variant B: 28.1% conversion     │
│  Winner: Variant B (94% confidence)  [Apply Winner]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Attribution Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Revenue Attribution                               [Date Range] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TOTAL ATTRIBUTED REVENUE: $45,678                              │
│                                                                  │
│  BY CHANNEL                      BY SEQUENCE                    │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │ Email      $18,234 │         │ Post-Scan    $23,456│         │
│  │ SMS        $15,678 │         │ Form Follow  $12,345│         │
│  │ WhatsApp   $ 8,234 │         │ Mail Remind  $ 6,789│         │
│  │ Voice      $ 3,532 │         │ Re-engage    $ 3,088│         │
│  └────────────────────┘         └────────────────────┘         │
│                                                                  │
│  ATTRIBUTION PATH                                               │
│  Mail → QR Scan → SMS → Email → Conversion                     │
│  (Most common path: 34% of conversions)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 10.2 Reports

### Available Reports

| Report | Description | Schedule |
|--------|-------------|----------|
| Sequence Summary | Overall performance | Daily/Weekly |
| Delivery Report | Send/delivery rates | Daily |
| Engagement Report | Opens, clicks, replies | Daily |
| Conversion Report | Conversions by sequence | Weekly |
| Attribution Report | Revenue attribution | Weekly |
| Compliance Report | Opt-outs, complaints | Weekly |
| A/B Test Results | Test outcomes | On-demand |
| Channel Comparison | Cross-channel performance | Monthly |

### Export Formats
- CSV
- Excel
- PDF
- API (JSON)

---

# 11. AI & OPTIMIZATION

## 11.1 AI Send Time Optimization

### How It Works

```
Data Collection:
├── Historical engagement data per recipient
│   ├── Open times
│   ├── Click times
│   ├── Reply times
│   └── Conversion times
├── Aggregate patterns
│   ├── Day of week patterns
│   ├── Hour of day patterns
│   └── Timezone considerations
└── External signals
    ├── Industry benchmarks
    └── Similar recipient behavior

Model Training:
├── Features
│   ├── Recipient engagement history
│   ├── Channel preferences
│   ├── Time zone
│   ├── Demographics
│   └── Past send times and outcomes
├── Output
│   └── Optimal send time (within window)
└── Continuous learning
    └── Update based on new data

Application:
├── Respect send window constraints
├── Calculate optimal time per recipient
├── Batch similar recipients
└── Distribute load to avoid spikes
```

### Expected Impact
- 15-25% improvement in open rates
- 10-20% improvement in click rates
- Reduced fatigue and opt-outs

## 11.2 AI Channel Selection

### Decision Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Historical preference | High | Which channel gets best engagement |
| Content type | Medium | Some content suits certain channels |
| Urgency | Medium | Time-sensitive = SMS/WhatsApp |
| Cost | Low | Optimize within budget |
| Availability | Required | Must have consent for channel |

### Implementation

```
Channel Selection Algorithm:
1. Check consent for each channel
2. Score each available channel:
   - Engagement history score
   - Content fit score
   - Recency score (avoid fatigue)
3. Apply cost considerations
4. Select highest scoring channel
5. Log decision for learning
```

## 11.3 Real-Time Personalization

### Data Sources

| Source | Data Type | Use Case |
|--------|-----------|----------|
| Weather API | Current conditions | Weather-based offers |
| Location API | Nearest store | Local promotions |
| Inventory API | Stock status | Availability messaging |
| CRM API | Recent activity | Contextual follow-up |
| Custom API | Any data | Flexible personalization |

### Implementation

```
Real-Time Variable Resolution:
1. Template contains {{dynamic.weather}}
2. At send time, fetch from Weather API
3. Cache response (5 min TTL)
4. Substitute into template
5. If API fails, use fallback value

Configuration per variable:
- API endpoint
- Request parameters
- Response path (JSONPath)
- Cache duration
- Fallback value
- Timeout
```

## 11.4 AI Content Generation (Future)

### Planned Capabilities
- Subject line generation
- SMS copy optimization
- Email copy suggestions
- Response suggestions for agents

---

# 12. USER EXPERIENCE

## 12.1 Sequence Builder UI

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Sequences    Edit: Post-Scan Nurture        [Test] [Publish] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Settings Panel ──────────────────────────────────────────────────┐  │
│  │ Trigger: [QR Scanned ▼]    Timezone: [America/New_York ▼]         │  │
│  │ Window: [9:00 AM] to [9:00 PM]    Days: [M T W T F] S S           │  │
│  │ ☑ AI Send Time Optimization                                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Canvas ──────────────────────────────────────────────────────────┐  │
│  │                        ┌─────────────┐                            │  │
│  │                        │   TRIGGER   │                            │  │
│  │                        │  QR Scanned │                            │  │
│  │                        └──────┬──────┘                            │  │
│  │                               │                                    │  │
│  │                        ┌──────┴──────┐                            │  │
│  │                        │  📱 SMS     │                            │  │
│  │                        │  Immediate  │                            │  │
│  │                        └──────┬──────┘                            │  │
│  │                               │                                    │  │
│  │                        ┌──────┴──────┐                            │  │
│  │                        │  ⏱ Wait     │                            │  │
│  │                        │  24 hours   │                            │  │
│  │                        └──────┬──────┘                            │  │
│  │                               │                                    │  │
│  │                        ┌──────┴──────┐                            │  │
│  │                        │  📧 Email   │                            │  │
│  │                        │  Offer      │                            │  │
│  │                        └──────┬──────┘                            │  │
│  │                               │                                    │  │
│  │                    ┌──────────┴──────────┐                        │  │
│  │                    │     CONDITION       │                        │  │
│  │                    │    If Opened?       │                        │  │
│  │                    └────┬─────────┬──────┘                        │  │
│  │                    YES  │         │  NO                           │  │
│  │                         │         │                               │  │
│  │                    ┌────┴───┐ ┌───┴────┐                         │  │
│  │                    │  END   │ │WhatsApp│                         │  │
│  │                    └────────┘ │Reminder│                         │  │
│  │                               └───┬────┘                         │  │
│  │                                   │                               │  │
│  │                              ┌────┴────┐                         │  │
│  │                              │  Voice  │                         │  │
│  │                              │  Call   │                         │  │
│  │                              └─────────┘                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Step Palette ────────────────────────────────────────────────────┐  │
│  │ [📱SMS] [📧Email] [💬WhatsApp] [📞Voice] [⏱Wait] [🔀Condition]   │  │
│  │ [🎁Gift Card] [🔗Webhook] [🏷Tag] [🔚End]                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 12.2 Email Designer UI

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Email Designer: Welcome Email                      [Preview] [Save]    │
├──────────────────────────────────────┬──────────────────────────────────┤
│                                      │                                   │
│  BLOCKS                              │  PREVIEW                          │
│  ───────                             │  ────────                         │
│  ┌──────────────┐                    │  ┌─────────────────────────────┐ │
│  │ □ Header     │                    │  │ [Logo]                      │ │
│  └──────────────┘                    │  │                             │ │
│  ┌──────────────┐                    │  │ Hi {{first_name}},          │ │
│  │ ▭ Text       │                    │  │                             │ │
│  └──────────────┘                    │  │ Thanks for scanning!        │ │
│  ┌──────────────┐                    │  │ Here's your exclusive       │ │
│  │ 🖼 Image     │                    │  │ offer...                    │ │
│  └──────────────┘                    │  │                             │ │
│  ┌──────────────┐                    │  │ [Image Banner]              │ │
│  │ ▢ Button     │                    │  │                             │ │
│  └──────────────┘                    │  │ [Claim Offer Button]        │ │
│  ┌──────────────┐                    │  │                             │ │
│  │ ═ Divider    │                    │  │ ─────────────────           │ │
│  └──────────────┘                    │  │                             │ │
│  ┌──────────────┐                    │  │ Company Name                │ │
│  │ ⊞ Columns    │                    │  │ 123 Main St                 │ │
│  └──────────────┘                    │  │ [Unsubscribe]               │ │
│  ┌──────────────┐                    │  └─────────────────────────────┘ │
│  │ 👤 Social    │                    │                                   │
│  └──────────────┘                    │  [Desktop] [Mobile]              │
│  ┌──────────────┐                    │                                   │
│  │ 📍 Footer    │                    │                                   │
│  └──────────────┘                    │                                   │
│                                      │                                   │
│  PROPERTIES                          │                                   │
│  ──────────                          │                                   │
│  Selected: Button                    │                                   │
│  Text: [Claim Offer    ]             │                                   │
│  URL: [{{tracking_link}}]            │                                   │
│  Color: [#FF6B00]                    │                                   │
│  Radius: [4px]                       │                                   │
│                                      │                                   │
├──────────────────────────────────────┴──────────────────────────────────┤
│  Variables: {{first_name}} {{last_name}} {{offer_code}} [+ Insert]      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 12.3 Conversation Inbox UI

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Conversations                                    [Filter ▼] [Search]   │
├───────────────────────┬─────────────────────────────────────────────────┤
│                       │                                                  │
│  INBOX (12)           │  John Smith                        📱 SMS       │
│  ─────────            │  ─────────────────────────────────────────────  │
│  ┌─────────────────┐  │                                                  │
│  │ 🔵 John Smith   │  │  Today, 2:34 PM                                 │
│  │ "Yes I'm inter.."│ │  ┌──────────────────────────────────┐          │
│  │ 2 min ago  📱   │  │  │ Hi John! Thanks for scanning     │ System   │
│  └─────────────────┘  │  │ our QR code. Reply YES for more  │          │
│  ┌─────────────────┐  │  └──────────────────────────────────┘          │
│  │ ○ Sarah Jones   │  │                                                  │
│  │ "What are the.." │ │  Today, 2:45 PM                                 │
│  │ 15 min ago 📧   │  │            ┌───────────────────────────────┐   │
│  └─────────────────┘  │            │ Yes I'm interested! Tell me   │   │
│  ┌─────────────────┐  │            │ more about the offer.         │   │
│  │ ○ Mike Wilson   │  │            └───────────────────────────────┘   │
│  │ "STOP"          │  │                                        John    │
│  │ 1 hr ago  📱    │  │                                                  │
│  └─────────────────┘  │  ───────────────────────────────────────────── │
│                       │                                                  │
│  WAITING (3)          │  [Type a message...]               [Send]       │
│  ─────────            │                                                  │
│  CLOSED (45)          │  ───────────────────────────────────────────── │
│  ─────────            │  Quick Replies: [More Info] [Schedule Call]     │
│                       │                 [Send Offer] [Transfer]         │
│                       │                                                  │
│                       ├─────────────────────────────────────────────────┤
│                       │  CONTEXT                                        │
│                       │  ─────────                                      │
│                       │  Recipient: John Smith                          │
│                       │  Campaign: Summer Promo                         │
│                       │  Sequence: Post-Scan Nurture                    │
│                       │  Step: 1 of 4                                   │
│                       │  Enrolled: Today 2:30 PM                        │
│                       │                                                  │
│                       │  TIMELINE                                       │
│                       │  ─────────                                      │
│                       │  • 2:30 PM - QR Scanned                         │
│                       │  • 2:34 PM - SMS Sent (Step 1)                  │
│                       │  • 2:45 PM - Reply received                     │
│                       │                                                  │
└───────────────────────┴─────────────────────────────────────────────────┘
```

---

# 13. IMPLEMENTATION PHASES

## 13.1 Phase Overview

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| **0** | Foundation | 2 weeks | Database, types, infrastructure |
| **1** | Core Engine | 3 weeks | Sequences, enrollment, processing |
| **2** | SMS & Email | 2 weeks | Delivery, tracking, templates |
| **3** | Builder UI | 3 weeks | Sequence builder, template editor |
| **4** | Conversations | 2 weeks | Reply handling, inbox |
| **5** | WhatsApp | 2 weeks | WhatsApp Business integration |
| **6** | Voice | 2 weeks | Voice call automation |
| **7** | Email Designer | 2 weeks | Drag-and-drop builder |
| **8** | Advanced | 3 weeks | A/B testing, gift cards, attribution |
| **9** | AI Features | 3 weeks | Send time, personalization |
| **10** | Polish | 2 weeks | Testing, optimization, docs |

**Total: 26 weeks (~6 months)**

## 13.2 Phase Details

### Phase 0: Foundation (Weeks 1-2)
**Goal:** Establish database schema and infrastructure

**Deliverables:**
- Database migrations for all tables
- TypeScript type definitions
- Email provider abstraction
- SMS provider integration (existing)
- RLS policies and security

**Dependencies:** None

---

### Phase 1: Core Engine (Weeks 3-5)
**Goal:** Build sequence orchestration engine

**Deliverables:**
- Sequence CRUD operations
- Step management
- Enrollment system
- Processing engine (CRON)
- Trigger evaluation
- Basic scheduling

**Dependencies:** Phase 0

---

### Phase 2: SMS & Email Delivery (Weeks 6-7)
**Goal:** Implement message delivery and tracking

**Deliverables:**
- SMS delivery function
- Email delivery function
- Open tracking (email)
- Click tracking (all)
- Delivery webhooks
- Retry logic

**Dependencies:** Phase 1

---

### Phase 3: Builder UI (Weeks 8-10)
**Goal:** Create visual sequence builder

**Deliverables:**
- Sequence list page
- Visual canvas builder
- Step configuration panels
- Template selection/creation
- Preview functionality
- Publish workflow

**Dependencies:** Phase 2

---

### Phase 4: Conversations (Weeks 11-12)
**Goal:** Enable two-way communication

**Deliverables:**
- Reply handling (SMS)
- Reply handling (Email)
- Conversation data model
- Inbox UI
- Agent assignment
- Keyword detection
- Opt-out processing

**Dependencies:** Phase 2

---

### Phase 5: WhatsApp (Weeks 13-14)
**Goal:** Add WhatsApp Business channel

**Deliverables:**
- WhatsApp Business API integration
- Template management
- Message sending
- Reply handling
- Media support
- Session management

**Dependencies:** Phase 4

---

### Phase 6: Voice (Weeks 15-16)
**Goal:** Add automated voice calls

**Deliverables:**
- Twilio Voice integration
- TTS configuration
- IVR menu support
- Call status tracking
- Voicemail detection
- Recording (with consent)

**Dependencies:** Phase 2

---

### Phase 7: Email Designer (Weeks 17-18)
**Goal:** Drag-and-drop email creation

**Deliverables:**
- Block-based editor
- Component library
- Mobile responsive preview
- Variable insertion
- Save as template
- HTML export

**Dependencies:** Phase 2

---

### Phase 8: Advanced Features (Weeks 19-21)
**Goal:** A/B testing, gift cards, attribution

**Deliverables:**
- A/B test configuration
- Variant assignment
- Statistical analysis
- Winner selection
- Gift card step action
- Attribution tracking
- Revenue reporting

**Dependencies:** Phases 3, 4

---

### Phase 9: AI Features (Weeks 22-24)
**Goal:** AI-powered optimization

**Deliverables:**
- Send time optimization model
- Per-recipient scoring
- Real-time personalization
- External data integration
- Performance learning

**Dependencies:** Phase 8

---

### Phase 10: Polish (Weeks 25-26)
**Goal:** Production readiness

**Deliverables:**
- Comprehensive testing
- Performance optimization
- Documentation
- Monitoring setup
- Launch checklist
- Training materials

**Dependencies:** All phases

---

## 13.3 MVP Definition

**Minimum Viable Product (End of Phase 3):**
- Create sequences with SMS and Email steps
- Visual sequence builder
- Basic triggers (QR scan, form submit)
- Send window scheduling
- Delivery tracking
- Basic analytics

**Time to MVP: 10 weeks**

---

# 14. TECHNICAL REQUIREMENTS

## 14.1 Performance Requirements

| Metric | Requirement |
|--------|-------------|
| CRON processing throughput | 1,000 steps/minute |
| Message send latency | < 5 seconds from trigger |
| API response time | < 500ms (p95) |
| Template rendering | < 100ms |
| Consent check | < 50ms |
| Builder page load | < 2 seconds |

## 14.2 Scalability Requirements

| Metric | Initial | Scale Target |
|--------|---------|--------------|
| Active sequences | 100 | 10,000 |
| Daily enrollments | 10,000 | 1,000,000 |
| Messages/day | 50,000 | 5,000,000 |
| Concurrent users | 100 | 1,000 |

## 14.3 Reliability Requirements

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Message delivery rate | > 98% |
| Data durability | 99.999% |
| Recovery time (RTO) | < 1 hour |
| Recovery point (RPO) | < 5 minutes |

## 14.4 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Data encryption at rest | Supabase default |
| Data encryption in transit | TLS 1.3 |
| Authentication | Supabase Auth + JWT |
| Authorization | RLS policies |
| Audit logging | All admin actions |
| PII handling | Encrypted, minimal retention |
| Secrets management | Environment variables |

---

# 15. SUCCESS METRICS

## 15.1 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sequence adoption rate | 70% of campaigns | Campaigns with sequences / Total campaigns |
| Average steps per sequence | 4+ | Total steps / Total sequences |
| Enrollment completion rate | 60%+ | Completed / Enrolled |
| Channel utilization | 3+ channels used | Unique channels / Sequences |
| Revenue attributed | Track all | Conversions with attribution |

## 15.2 Operational Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Message delivery rate | > 98% | < 95% |
| Processing latency | < 60s | > 120s |
| Error rate | < 1% | > 2% |
| Queue depth | < 1000 | > 5000 |
| Provider availability | > 99.5% | < 99% |

## 15.3 Engagement Metrics

| Metric | Target | Benchmark |
|--------|--------|-----------|
| SMS delivery rate | > 95% | Industry: 93% |
| Email delivery rate | > 98% | Industry: 95% |
| Email open rate | > 25% | Industry: 20% |
| Email click rate | > 3% | Industry: 2.5% |
| SMS response rate | > 10% | Industry: 8% |
| Opt-out rate | < 2% | Industry: 2.5% |

---

# APPENDICES

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Sequence** | Automated series of follow-up messages |
| **Step** | Single action within a sequence |
| **Enrollment** | Recipient's participation in a sequence |
| **Execution** | Single send attempt |
| **Trigger** | Event that starts a sequence |
| **Condition** | Logic that determines branching |
| **Template** | Reusable message content |
| **Attribution** | Tracking conversions to touchpoints |

## Appendix B: Related Documents

- `API_SYSTEMS_AUDIT.md` - API architecture
- `CRITICAL_DEDUPLICATION_FIX.md` - Code cleanup
- `FOLLOW_UP_ALL_PROMPTS.md` - Implementation prompts

---

**Document Version:** 2.0  
**Last Updated:** December 10, 2025  
**Author:** System Architect  
**Status:** Ready for Implementation

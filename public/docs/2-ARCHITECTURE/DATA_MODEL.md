# Database Schema

Complete reference for the Mobul ACE Platform database schema including all tables, columns, relationships, and data types.

## Entity Relationship Overview

```
organizations
  ├── clients
  │     ├── campaigns
  │     │     ├── recipients (via audience)
  │     │     ├── campaign_conditions
  │     │     ├── campaign_reward_configs
  │     │     └── tracked_phone_numbers
  │     ├── contacts
  │     │     ├── contact_lists
  │     │     └── contact_tags
  │     ├── gift_card_pools
  │     │     └── gift_cards
  │     ├── templates
  │     ├── landing_pages
  │     └── ace_forms
  └── users (via org_members)
        └── user_roles
```

## Tenant & User Tables

### organizations
Top-level tenant structure.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Organization name |
| type | TEXT | 'internal', 'agency', or 'direct' |
| created_at | TIMESTAMPTZ | Creation timestamp |
| settings_json | JSONB | Organization-specific settings |

**RLS**: Admins see all, users see their own org.

---

### clients
Business units within organizations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| org_id | UUID | FK → organizations |
| name | TEXT | Client business name |
| industry | ENUM | Industry type (roofing, rei, auto_service, etc.) |
| logo_url | TEXT | Logo image URL |
| brand_colors_json | JSONB | Primary/secondary colors |
| website_url | TEXT | Client website |
| api_key_hash | TEXT | Hashed API key for REST API access |
| credits | INTEGER | Available platform credits |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Indexes**: `(org_id)`, `(api_key_hash)`  
**RLS**: Users see clients they have access to via client_users.

---

### users
Stored in Supabase auth.users (managed by Supabase Auth).

---

### profiles
Extended user profile data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | FK → auth.users.id |
| email | TEXT | User email (denormalized) |
| full_name | TEXT | User's full name |
| avatar_url | TEXT | Profile picture URL |
| phone | TEXT | Contact phone number |
| timezone | TEXT | User's timezone |
| created_at | TIMESTAMPTZ | Profile creation |
| updated_at | TIMESTAMPTZ | Last profile update |

---

### user_roles
Defines which role(s) a user has.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users.id |
| role | ENUM | Role: admin, tech_support, agency_owner, company_owner, developer, call_center |
| created_at | TIMESTAMPTZ | Role assignment date |

**Indexes**: `(user_id)`, `(role)`

---

### role_permissions
Defines granular permissions for roles.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| role | ENUM | Role this permission applies to |
| permission_key | TEXT | Permission identifier (e.g., 'campaigns.create') |
| created_at | TIMESTAMPTZ | Permission creation |

**Indexes**: `(role, permission_key)`

---

### org_members
Links users to organizations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| org_id | UUID | FK → organizations |
| user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Membership start date |

**Indexes**: `(org_id, user_id)`

---

### client_users
Links users to specific clients.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients |
| user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Assignment date |

**Indexes**: `(client_id, user_id)`

---

## Campaign Tables

### campaigns

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients |
| name | TEXT | Campaign name |
| status | ENUM | draft, ready, in_production, mailed, active, completed |
| size | ENUM | 4x6, 6x9, 6x11, letter |
| postage | ENUM | standard, first_class |
| vendor | TEXT | Print vendor name |
| mail_date | DATE | Expected mail date |
| audience_id | UUID | FK → audiences (deprecated, use contact_list_id) |
| contact_list_id | UUID | FK → contact_lists |
| template_id | UUID | FK → templates |
| landing_page_id | UUID | FK → landing_pages |
| lp_mode | ENUM | 'bridge' or 'redirect' |
| base_lp_url | TEXT | Base URL for landing pages |
| utm_source | TEXT | UTM source parameter |
| utm_medium | TEXT | UTM medium parameter |
| utm_campaign | TEXT | UTM campaign parameter |
| created_by_user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Creation date |
| updated_at | TIMESTAMPTZ | Last update |

**Indexes**: `(client_id)`, `(status)`, `(mail_date)`  
**RLS**: Users see campaigns for their accessible clients.

---

### campaign_conditions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| condition_number | INTEGER | Order (1, 2, 3...) |
| condition_name | TEXT | Display name |
| trigger_type | TEXT | 'call', 'crm_event', 'time_delay' |
| crm_event_name | TEXT | CRM event to match (if trigger_type='crm_event') |
| time_delay_hours | INTEGER | Delay before trigger (if trigger_type='time_delay') |
| is_active | BOOLEAN | Enabled/disabled |
| created_at | TIMESTAMPTZ | Creation date |

**Indexes**: `(campaign_id, condition_number)`

---

### campaign_reward_configs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| condition_number | INTEGER | Which condition this reward is for |
| gift_card_pool_id | UUID | FK → gift_card_pools |
| reward_description | TEXT | Human-readable reward description |
| sms_template | TEXT | Message template for SMS delivery |
| created_at | TIMESTAMPTZ | Configuration date |

**Indexes**: `(campaign_id, condition_number)`

---

### recipients

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| audience_id | UUID | FK → audiences (deprecated) |
| contact_id | UUID | FK → contacts |
| redemption_code | TEXT | Unique code (required) |
| purl_token | TEXT | Unique PURL token |
| first_name | TEXT | Recipient first name (optional) |
| last_name | TEXT | Recipient last name (optional) |
| email | TEXT | Recipient email (optional) |
| phone | TEXT | Recipient phone (optional) |
| address | TEXT | Street address (optional) |
| address2 | TEXT | Unit/suite (optional) |
| city | TEXT | City (optional) |
| state | TEXT | State (optional) |
| zip | TEXT | ZIP code (optional) |
| country | TEXT | Country (optional) |
| custom_fields | JSONB | Industry-specific data (optional) |
| imb_serial | TEXT | Intelligent Mail Barcode serial |
| status | TEXT | 'active', 'delivered', 'bounced' |
| delivered_at | TIMESTAMPTZ | USPS delivery timestamp |
| last_visited_at | TIMESTAMPTZ | Last landing page visit |
| total_visits | INTEGER | Landing page visit count |
| created_at | TIMESTAMPTZ | Record creation |

**Indexes**: `(campaign_id)`, `(purl_token)`, `(redemption_code)`, `(contact_id)`  
**RLS**: Accessible by client that owns campaign.

---

## Contact & Audience Tables

### contacts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients |
| customer_code | TEXT | Unique identifier code (auto-generated if not provided) |
| first_name | TEXT | Contact first name |
| last_name | TEXT | Contact last name |
| email | TEXT | Email address |
| phone | TEXT | Primary phone |
| mobile_phone | TEXT | Mobile phone |
| company | TEXT | Company name |
| job_title | TEXT | Job title |
| address | TEXT | Street address |
| address2 | TEXT | Unit/suite |
| city | TEXT | City |
| state | TEXT | State |
| zip | TEXT | ZIP code |
| country | TEXT | Country |
| lifecycle_stage | TEXT | lead, mql, sql, opportunity, customer, evangelist |
| lead_score | INTEGER | 0-100 lead score |
| engagement_score | INTEGER | 0-100 engagement score |
| lead_source | TEXT | Where contact originated |
| do_not_contact | BOOLEAN | Suppression flag |
| email_opt_out | BOOLEAN | Email unsubscribe |
| sms_opt_out | BOOLEAN | SMS opt-out |
| custom_fields | JSONB | Flexible custom data |
| notes | TEXT | Free-form notes |
| last_activity_date | TIMESTAMPTZ | Last engagement |
| created_by_user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Contact creation |
| updated_at | TIMESTAMPTZ | Last update |

**Indexes**: `(client_id)`, `(email)`, `(customer_code)`, `(lifecycle_stage)`, `(lead_score)`  
**RLS**: Users see contacts for their accessible clients.

---

### contact_lists

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients |
| name | TEXT | List name |
| description | TEXT | List description |
| list_type | TEXT | 'static' or 'dynamic' |
| filter_rules | JSONB | Dynamic segment rules (if list_type='dynamic') |
| contact_count | INTEGER | Cached count |
| created_by_user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | List creation |
| updated_at | TIMESTAMPTZ | Last update |
| last_sync_at | TIMESTAMPTZ | Last dynamic sync |

**Indexes**: `(client_id)`, `(list_type)`

---

### contact_list_members

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| list_id | UUID | FK → contact_lists |
| contact_id | UUID | FK → contacts |
| added_by_user_id | UUID | FK → auth.users.id |
| added_at | TIMESTAMPTZ | Addition timestamp |

**Indexes**: `(list_id, contact_id)`, `(contact_id)`

---

### contact_tags

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| contact_id | UUID | FK → contacts |
| tag | TEXT | Tag value |
| tag_category | TEXT | Category for organization |
| created_by_user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Tag creation |

**Indexes**: `(contact_id)`, `(tag)`

---

### contact_campaign_participation

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| contact_id | UUID | FK → contacts |
| campaign_id | UUID | FK → campaigns |
| recipient_id | UUID | FK → recipients |
| participation_status | TEXT | sent, delivered, bounced, redeemed, expired |
| redemption_code | TEXT | Code for this participation |
| gift_card_id | UUID | FK → gift_cards |
| delivered_at | TIMESTAMPTZ | Mail delivery |
| participated_at | TIMESTAMPTZ | First engagement |
| redeemed_at | TIMESTAMPTZ | Gift card redemption |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**Indexes**: `(contact_id, campaign_id)`, `(recipient_id)`

---

## Gift Card Tables

### gift_card_brands

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| brand_name | TEXT | Amazon, Visa, Target, etc. |
| brand_logo_url | TEXT | Brand logo image |
| default_value | DECIMAL | Default card value |
| is_active | BOOLEAN | Available for purchase |
| created_at | TIMESTAMPTZ | Brand added |

---

### gift_card_pools

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients (NULL for admin master pools) |
| brand_id | UUID | FK → gift_card_brands |
| pool_name | TEXT | Pool display name |
| value_amount | DECIMAL | Card value ($10.00, $25.00, etc.) |
| total_cards | INTEGER | Total cards in pool |
| available_cards | INTEGER | Not yet claimed/delivered |
| reserved_cards | INTEGER | Reserved for campaigns |
| delivered_cards | INTEGER | Sent to recipients |
| created_at | TIMESTAMPTZ | Pool creation |

**Indexes**: `(client_id)`, `(brand_id)`

---

### gift_cards

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| pool_id | UUID | FK → gift_card_pools |
| card_code | TEXT | Gift card code (encrypted) |
| pin_code | TEXT | PIN if required (encrypted) |
| value_amount | DECIMAL | Card value |
| status | TEXT | available, claimed, delivered, redeemed, expired |
| recipient_id | UUID | FK → recipients (when claimed) |
| campaign_id | UUID | FK → campaigns (when claimed) |
| claimed_at | TIMESTAMPTZ | Claimed timestamp |
| delivered_at | TIMESTAMPTZ | Sent via SMS/email |
| delivery_method | TEXT | 'sms' or 'email' |
| delivery_address | TEXT | Phone or email where sent |
| redeemed_at | TIMESTAMPTZ | Used timestamp |
| created_at | TIMESTAMPTZ | Card added to pool |

**Indexes**: `(pool_id)`, `(status)`, `(recipient_id)`, `(campaign_id)`  
**RLS**: Client users see cards in their pools.

---

## Call Tracking Tables

### tracked_phone_numbers

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| phone_number | TEXT | E.164 format (+15551234567) |
| forward_to_number | TEXT | Business number to forward calls to |
| provider | TEXT | 'twilio' |
| provider_sid | TEXT | Twilio phone number SID |
| is_active | BOOLEAN | Accepting calls |
| created_at | TIMESTAMPTZ | Number provisioned |

**Indexes**: `(campaign_id)`, `(phone_number)`

---

### call_sessions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| tracked_number_id | UUID | FK → tracked_phone_numbers |
| recipient_id | UUID | FK → recipients (if matched) |
| caller_phone | TEXT | Caller ID (E.164 format) |
| match_status | TEXT | 'matched', 'unmatched' |
| call_status | TEXT | 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed' |
| call_started_at | TIMESTAMPTZ | Call initiated |
| call_answered_at | TIMESTAMPTZ | Call answered |
| call_ended_at | TIMESTAMPTZ | Call completed |
| call_duration_seconds | INTEGER | Total duration |
| recording_url | TEXT | Call recording URL |
| recording_sid | TEXT | Twilio recording SID |
| recording_duration | INTEGER | Recording length |
| twilio_call_sid | TEXT | Twilio call SID |
| agent_user_id | UUID | FK → auth.users.id (call center agent) |
| forward_to_number | TEXT | Number call was forwarded to |
| notes | TEXT | Agent notes |
| created_at | TIMESTAMPTZ | Record creation |

**Indexes**: `(campaign_id)`, `(recipient_id)`, `(call_started_at)`, `(twilio_call_sid)`

---

### call_conditions_met

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| call_session_id | UUID | FK → call_sessions |
| campaign_id | UUID | FK → campaigns |
| recipient_id | UUID | FK → recipients |
| condition_number | INTEGER | Which condition was met |
| met_at | TIMESTAMPTZ | Condition completion timestamp |
| met_by_agent_id | UUID | FK → auth.users.id |
| gift_card_id | UUID | FK → gift_cards (provisioned card) |
| delivery_status | TEXT | pending, sent, delivered, failed |
| notes | TEXT | Agent notes |
| created_at | TIMESTAMPTZ | Record creation |

**Indexes**: `(call_session_id)`, `(recipient_id, condition_number)`

---

## Template & Landing Page Tables

### templates

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients |
| name | TEXT | Template name |
| size | ENUM | 4x6, 6x9, 6x11, letter |
| design_json | JSONB | GrapesJS design data |
| thumbnail_url | TEXT | Preview image |
| is_favorite | BOOLEAN | User favorite flag |
| category | TEXT | Organization category |
| created_by_user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Template creation |
| updated_at | TIMESTAMPTZ | Last design update |

**Indexes**: `(client_id)`, `(is_favorite)`

---

### landing_pages

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients |
| name | TEXT | Landing page name |
| editor_type | TEXT | 'grapesjs', 'custom', 'ai' |
| content_json | JSONB | GrapesJS page design |
| is_published | BOOLEAN | Published status |
| published_at | TIMESTAMPTZ | Last publish |
| created_by_user_id | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Page creation |
| updated_at | TIMESTAMPTZ | Last edit |

**Indexes**: `(client_id)`, `(is_published)`

---

### ace_forms

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | FK → clients |
| name | TEXT | Form name |
| description | TEXT | Form description |
| form_config | JSONB | Form field definitions, validation, reveal settings |
| is_active | BOOLEAN | Published status |
| is_draft | BOOLEAN | Draft status |
| total_views | INTEGER | View count |
| total_submissions | INTEGER | Submission count |
| created_by | UUID | FK → auth.users.id |
| created_at | TIMESTAMPTZ | Form creation |
| updated_at | TIMESTAMPTZ | Last update |
| last_auto_save | TIMESTAMPTZ | Auto-save timestamp |

**Indexes**: `(client_id)`, `(is_active)`

---

### ace_form_submissions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| form_id | UUID | FK → ace_forms |
| recipient_id | UUID | FK → recipients (if from campaign) |
| contact_id | UUID | FK → contacts (if linked) |
| submission_data | JSONB | Form field values |
| redemption_token | TEXT | Gift card code (if redeemed) |
| gift_card_id | UUID | FK → gift_cards |
| enrichment_status | TEXT | Data enrichment status |
| ip_address | TEXT | Submitter IP |
| user_agent | TEXT | Browser user agent |
| submitted_at | TIMESTAMPTZ | Submission timestamp |

**Indexes**: `(form_id)`, `(recipient_id)`, `(submitted_at)`

---

## Analytics & Event Tables

### events

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | FK → campaigns |
| recipient_id | UUID | FK → recipients |
| event_type | TEXT | 'purl_visit', 'qr_scan', 'form_submit', 'call', 'gift_card_redeem' |
| event_data | JSONB | Event-specific data |
| ip_address | TEXT | Event source IP |
| user_agent | TEXT | Browser user agent |
| referrer | TEXT | HTTP referrer |
| created_at | TIMESTAMPTZ | Event timestamp |

**Indexes**: `(campaign_id, event_type)`, `(recipient_id)`, `(created_at)`  
**Partitioning**: Partitioned by `created_at` (monthly partitions)

---

## Documentation Tables

### documentation_pages

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| category | TEXT | Category slug (getting-started, architecture, etc.) |
| title | TEXT | Page title |
| slug | TEXT | URL slug |
| file_path | TEXT | Original markdown file path |
| content | TEXT | Markdown content |
| order_index | INTEGER | Sort order within category |
| is_admin_only | BOOLEAN | Restricted to admins |
| search_keywords | TEXT[] | Searchable keywords array |
| last_updated | TIMESTAMPTZ | Last content update |
| created_at | TIMESTAMPTZ | Page creation |

**Indexes**: `(category, order_index)`, GIN index on `search_keywords`

---

### documentation_views

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| page_id | UUID | FK → documentation_pages |
| user_id | UUID | FK → auth.users.id |
| time_spent_seconds | INTEGER | Time on page |
| viewed_at | TIMESTAMPTZ | View timestamp |

**Indexes**: `(page_id)`, `(user_id, viewed_at)`

---

### documentation_feedback

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| page_id | UUID | FK → documentation_pages |
| user_id | UUID | FK → auth.users.id |
| is_helpful | BOOLEAN | Thumbs up/down |
| feedback_text | TEXT | Optional comment |
| created_at | TIMESTAMPTZ | Feedback submission |

**Indexes**: `(page_id)`, `(user_id)`

---

## Key Relationships

```sql
-- Campaign → Recipients (one-to-many)
campaigns.id → recipients.campaign_id

-- Campaign → Contacts (via contact_lists and recipients)
campaigns.contact_list_id → contact_lists.id
contact_lists.id → contact_list_members.list_id
contact_list_members.contact_id → contacts.id
contacts.id → recipients.contact_id

-- Campaign → Gift Cards (via reward configs and conditions)
campaigns.id → campaign_reward_configs.campaign_id
campaign_reward_configs.gift_card_pool_id → gift_card_pools.id
gift_card_pools.id → gift_cards.pool_id
gift_cards.recipient_id → recipients.id

-- Campaign → Call Tracking
campaigns.id → tracked_phone_numbers.campaign_id
tracked_phone_numbers.id → call_sessions.tracked_number_id
call_sessions.recipient_id → recipients.id
```

## Related Documentation

- [Architecture Overview →](/docs/architecture/architecture-overview)
- [Security Model →](/docs/architecture/security)
- [Scalability →](/docs/architecture/scalability)
- [API Reference →](/docs/api-reference/rest-api)

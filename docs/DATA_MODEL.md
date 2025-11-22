# Data Model Documentation

## Core Entity Relationships

```
organizations
  └── clients
      ├── users (via client_users)
      ├── campaigns
      │   ├── templates
      │   ├── audiences → recipients
      │   ├── landing_pages
      │   ├── campaign_conditions
      │   └── campaign_reward_configs → gift_card_pools
      ├── contacts
      │   └── companies
      ├── deals
      │   ├── pipelines → pipeline_stages
      │   └── activities
      ├── templates
      ├── audiences
      ├── landing_pages
      └── gift_card_pools → gift_cards
```

## Table Schemas

### Organizations & Users

#### organizations
Multi-tenant organization level (agencies).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Organization name |
| org_type | enum | 'agency' or 'company' |
| created_at | timestamp | Record creation time |

#### clients
Individual businesses within an organization.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| org_id | uuid | Parent organization |
| name | text | Client business name |
| industry | enum | Business industry type |
| logo_url | text | Client logo URL |
| website_url | text | Client website |
| tagline | text | Marketing tagline |
| brand_colors_json | jsonb | Brand color palette |
| font_preferences | jsonb | Typography preferences |
| timezone | text | Client timezone |
| credits | integer | Available campaign credits |
| created_at | timestamp | Record creation time |

**RLS**: Users can only view clients they're assigned to (via `client_users`).

#### user_roles
User role assignments (NOT on profiles table).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users |
| role | app_role | User's role enum |
| assigned_at | timestamp | When role was assigned |

**Roles**: 'admin', 'agency_owner', 'company_owner', 'call_center', 'user'

#### client_users
User-to-client assignments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User ID |
| client_id | uuid | Client ID |
| created_at | timestamp | Assignment time |

**RLS**: Users can view their own assignments; admins can view all.

### Campaigns

#### campaigns
Direct mail campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client |
| name | text | Campaign name |
| status | enum | 'draft', 'scheduled', 'in_progress', 'completed', 'cancelled' |
| size | enum | Mail size ('4x6', '6x9', '6x11', 'letter', 'trifold') |
| template_id | uuid | Associated template |
| audience_id | uuid | Target audience |
| landing_page_id | uuid | Associated landing page |
| lp_mode | enum | 'bridge', 'purl', 'direct' |
| base_lp_url | text | Base URL for PURLs |
| utm_source | text | UTM tracking parameter |
| utm_medium | text | UTM tracking parameter |
| utm_campaign | text | UTM tracking parameter |
| mail_date | date | Scheduled mail drop date |
| postage | enum | 'first_class', 'standard' |
| vendor | text | Mail vendor name |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**RLS**: Users can only access campaigns for their assigned clients.

**Status Flow**: draft → scheduled → in_progress → completed (or cancelled)

#### campaign_conditions
Trigger conditions for automated actions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | Parent campaign |
| condition_number | integer | Sequence number |
| condition_name | text | Display name |
| trigger_type | text | 'manual_agent', 'crm_event', 'time_delay' |
| crm_event_name | text | CRM event identifier |
| time_delay_hours | integer | Delay before trigger |
| is_active | boolean | Condition enabled |
| created_at | timestamp | Creation time |

**Trigger Types**:
- `manual_agent`: Call center agent marks condition met
- `crm_event`: Webhook from CRM triggers condition
- `time_delay`: Automatic trigger after X hours from mail delivery

#### campaign_reward_configs
Gift card reward settings for conditions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | Parent campaign |
| condition_number | integer | Which condition triggers this |
| gift_card_pool_id | uuid | Pool to draw cards from |
| reward_description | text | Description for recipient |
| sms_template | text | SMS message template |
| created_at | timestamp | Creation time |

### Templates

#### templates
Mail design templates.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client |
| name | text | Template name |
| size | enum | Template dimensions |
| is_starter_template | boolean | Provided by platform |
| category | text | Template category |
| json_layers | jsonb | Canvas data (see Template JSON Structure) |
| thumbnail_url | text | Preview image URL |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**Template JSON Structure**:
```json
{
  "version": "1.0",
  "canvasSize": {
    "width": 1800,
    "height": 1200
  },
  "backgroundColor": "#FFFFFF",
  "layers": [
    {
      "id": "layer-123",
      "type": "text",
      "text": "{{first_name}}",
      "fontSize": 24,
      "fontFamily": "Arial",
      "fill": "#000000",
      "left": 100,
      "top": 100,
      "zIndex": 0,
      "visible": true,
      "locked": false
    },
    {
      "id": "layer-456",
      "type": "qr_code",
      "data": "{{purl}}",
      "size": 200,
      "left": 500,
      "top": 500,
      "zIndex": 1,
      "visible": true,
      "locked": false
    }
  ]
}
```

**Available Merge Fields**:
- `{{first_name}}`, `{{last_name}}`, `{{full_name}}`
- `{{email}}`, `{{phone}}`
- `{{company}}`
- `{{address}}`, `{{city}}`, `{{state}}`, `{{postal_code}}`
- `{{purl}}` - Personalized URL
- `{{qr_code}}` - QR code to PURL

### Audiences & Recipients

#### audiences
Mailing lists and segments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client |
| name | text | Audience name |
| source | enum | 'manual', 'csv', 'api', 'crm' |
| status | enum | 'processing', 'ready', 'failed' |
| total_count | integer | Total recipients |
| valid_count | integer | Valid recipients |
| invalid_count | integer | Invalid recipients |
| hygiene_json | jsonb | Data validation results |
| suppressed_json | jsonb | Suppression list results |
| created_at | timestamp | Creation time |

**Hygiene JSON Structure**:
```json
{
  "valid_emails": 850,
  "invalid_emails": 50,
  "valid_phones": 800,
  "duplicates_removed": 25
}
```

#### recipients
Individual people in audiences.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| audience_id | uuid | Parent audience |
| first_name | text | First name |
| last_name | text | Last name |
| email | text | Email address |
| phone | text | Phone number |
| company | text | Company name |
| address_line_1 | text | Street address |
| address_line_2 | text | Suite/Apt number |
| city | text | City |
| state | text | State/Province |
| postal_code | text | ZIP/Postal code |
| country | text | Country |
| purl_token | text | Unique PURL token |
| custom_fields | jsonb | Additional data |
| is_valid | boolean | Passed validation |
| created_at | timestamp | Creation time |

**RLS**: Users can only access recipients for their assigned clients' audiences.

### Gift Cards

#### gift_card_brands
Catalog of available brands.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| brand_name | text | Brand name |
| brand_code | text | Unique identifier |
| provider | text | 'tillo', 'blackhawk', etc. |
| logo_url | text | Brand logo URL |
| category | text | Brand category |
| balance_check_enabled | boolean | Supports balance API |
| balance_check_url | text | Balance check URL |
| typical_denominations | jsonb | Common card values |
| is_active | boolean | Available for use |
| created_at | timestamp | Creation time |

**RLS**: Anyone can view brands (public data).

#### gift_card_pools
Card inventory pools.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client (NULL for master pools) |
| brand_id | uuid | Gift card brand |
| pool_name | text | Pool name |
| card_value | numeric | Face value per card |
| is_master_pool | boolean | Admin-managed pool |
| provider | text | Card provider |
| purchase_method | text | 'manual', 'api' |
| total_cards | integer | Total cards in pool |
| available_cards | integer | Not claimed/delivered |
| claimed_cards | integer | Claimed but not delivered |
| delivered_cards | integer | Successfully delivered |
| failed_cards | integer | Delivery failed |
| sale_price_per_card | numeric | Price for clients (master pools only) |
| markup_percentage | numeric | Profit margin (master pools only) |
| available_for_purchase | boolean | Clients can buy from this pool |
| min_purchase_quantity | integer | Minimum purchase amount |
| low_stock_threshold | integer | Alert threshold |
| auto_balance_check | boolean | Automatic balance validation |
| balance_check_frequency_hours | integer | How often to check |
| last_auto_balance_check | timestamp | Last check time |
| api_provider | text | API provider name |
| api_config | jsonb | API credentials (encrypted) |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**RLS**:
- Master pools: Only admins can view/edit
- Client pools: Users can access for their assigned clients

**Master Pool**: `is_master_pool=true`, `client_id=NULL`
**Client Pool**: `is_master_pool=false`, `client_id` set

#### gift_cards
Individual gift cards.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| pool_id | uuid | Parent pool |
| brand_id | uuid | Gift card brand |
| card_number | text | Card number (encrypted/masked) |
| card_code | text | PIN/code (encrypted) |
| status | text | 'available', 'claimed', 'delivered', 'failed', 'redeemed' |
| current_balance | numeric | Current card balance |
| expiration_date | date | Card expiration |
| claimed_at | timestamp | When claimed for delivery |
| claimed_by_recipient_id | uuid | Recipient who received card |
| claimed_by_call_session_id | uuid | Call that triggered reward |
| delivered_at | timestamp | When delivery confirmed |
| delivery_method | text | 'sms', 'email' |
| delivery_address | text | Phone or email used |
| balance_check_status | text | 'success', 'failed', 'pending' |
| last_balance_check | timestamp | Last balance check time |
| tags | jsonb | Custom tags |
| notes | text | Admin notes |
| created_at | timestamp | Creation time |

**Status Flow**: available → claimed → delivered (or failed) → redeemed

**Security**: Card codes are encrypted at rest. Frontend shows masked values (e.g., `****1234`).

#### gift_card_deliveries
Delivery tracking records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| gift_card_id | uuid | Card being delivered |
| recipient_id | uuid | Recipient |
| campaign_id | uuid | Associated campaign |
| call_session_id | uuid | Call that triggered delivery |
| condition_number | integer | Which condition was met |
| delivery_method | text | 'sms', 'email' |
| delivery_address | text | Phone or email |
| delivery_status | text | 'pending', 'sent', 'delivered', 'failed' |
| delivered_at | timestamp | Delivery time |
| sms_message | text | SMS content sent |
| sms_status | text | Twilio delivery status |
| sms_sent_at | timestamp | SMS send time |
| twilio_message_sid | text | Twilio message ID |
| sms_error_message | text | Error details |
| retry_count | integer | Delivery attempts |
| error_message | text | General error info |
| created_at | timestamp | Creation time |

### Contacts & CRM

#### contacts
Individual people in CRM.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client |
| first_name | text | First name |
| last_name | text | Last name |
| email | text | Email address |
| phone | text | Phone number |
| mobile_phone | text | Mobile number |
| company_id | uuid | Associated company |
| title | text | Job title |
| address_line_1 | text | Street address |
| address_line_2 | text | Suite/Apt |
| city | text | City |
| state | text | State |
| postal_code | text | ZIP code |
| country | text | Country |
| tags | jsonb | Contact tags |
| custom_fields | jsonb | Custom data |
| notes | text | Contact notes |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

#### companies
Business entities in CRM.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client |
| name | text | Company name |
| website | text | Website URL |
| industry | text | Industry |
| employee_count | integer | Number of employees |
| annual_revenue | numeric | Annual revenue |
| address_line_1 | text | Street address |
| city | text | City |
| state | text | State |
| postal_code | text | ZIP code |
| country | text | Country |
| phone | text | Main phone |
| tags | jsonb | Company tags |
| custom_fields | jsonb | Custom data |
| notes | text | Company notes |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

#### deals
Sales opportunities in pipeline.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client |
| name | text | Deal name |
| value | numeric | Deal value |
| contact_id | uuid | Primary contact |
| company_id | uuid | Associated company |
| pipeline_id | uuid | Sales pipeline |
| stage_id | uuid | Current stage |
| probability | integer | Win probability (0-100) |
| expected_close_date | date | Expected close date |
| tags | jsonb | Deal tags |
| custom_fields | jsonb | Custom data |
| notes | text | Deal notes |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

#### pipelines
Sales pipeline configurations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | Owner client |
| name | text | Pipeline name |
| is_default | boolean | Default pipeline |
| created_at | timestamp | Creation time |

#### pipeline_stages
Stages within pipelines.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| pipeline_id | uuid | Parent pipeline |
| name | text | Stage name |
| display_order | integer | Sort order |
| probability | integer | Default win probability |
| created_at | timestamp | Creation time |

### Events & Tracking

#### events
Event tracking log.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | Associated campaign |
| recipient_id | uuid | Associated recipient |
| event_type | text | Event type identifier |
| source | text | Event source system |
| event_data_json | jsonb | Event payload |
| occurred_at | timestamp | When event occurred |
| created_at | timestamp | When logged |

**Event Types**:
- `mail_delivered` - Mail piece delivered
- `landing_page_visit` - PURL visited
- `form_submitted` - Lead form submitted
- `call_received` - Inbound call logged
- `gift_card_delivered` - Reward sent
- `prototype_viewed` - Prototype accessed

#### call_sessions
Inbound call records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | Campaign called |
| tracked_number_id | uuid | Number dialed |
| caller_phone | text | Inbound caller ID |
| recipient_id | uuid | Matched recipient |
| match_status | text | 'matched', 'unmatched', 'multiple' |
| agent_user_id | uuid | Assigned agent |
| call_started_at | timestamp | Call start time |
| call_answered_at | timestamp | When answered |
| call_ended_at | timestamp | Call end time |
| call_duration_seconds | integer | Call length |
| call_status | text | 'ringing', 'in-progress', 'completed', 'failed' |
| twilio_call_sid | text | Twilio call ID |
| recording_url | text | Recording URL |
| recording_sid | text | Recording SID |
| recording_duration | integer | Recording length |
| forward_to_number | text | Forwarded to |
| notes | text | Call notes |
| created_at | timestamp | Creation time |

## Indexes & Performance

### Key Indexes

```sql
-- Campaigns
CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_mail_date ON campaigns(mail_date);

-- Recipients
CREATE INDEX idx_recipients_audience_id ON recipients(audience_id);
CREATE INDEX idx_recipients_purl_token ON recipients(purl_token);

-- Events
CREATE INDEX idx_events_campaign_id ON events(campaign_id);
CREATE INDEX idx_events_recipient_id ON events(recipient_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_occurred_at ON events(occurred_at DESC);

-- Gift Cards
CREATE INDEX idx_gift_cards_pool_id ON gift_cards(pool_id);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_card_pools_client_id ON gift_card_pools(client_id);
CREATE INDEX idx_gift_card_pools_is_master ON gift_card_pools(is_master_pool);

-- Call Sessions
CREATE INDEX idx_call_sessions_campaign_id ON call_sessions(campaign_id);
CREATE INDEX idx_call_sessions_recipient_id ON call_sessions(recipient_id);
CREATE INDEX idx_call_sessions_started_at ON call_sessions(call_started_at DESC);
```

## Common Query Patterns

### Get campaigns with full details
```sql
SELECT 
  c.*,
  t.name as template_name,
  a.name as audience_name,
  COUNT(DISTINCT r.id) as recipient_count
FROM campaigns c
LEFT JOIN templates t ON t.id = c.template_id
LEFT JOIN audiences a ON a.id = c.audience_id
LEFT JOIN recipients r ON r.audience_id = c.audience_id
WHERE c.client_id = :client_id
GROUP BY c.id, t.name, a.name
ORDER BY c.created_at DESC;
```

### Get event metrics for campaign
```sql
SELECT 
  event_type,
  COUNT(*) as count
FROM events
WHERE campaign_id = :campaign_id
GROUP BY event_type;
```

### Get available gift cards by pool
```sql
SELECT 
  brand_name,
  card_value,
  available_cards
FROM gift_card_pools gcp
JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
WHERE gcp.client_id = :client_id
  AND gcp.available_cards > 0
ORDER BY brand_name, card_value;
```

## Data Retention & Cleanup

### Event Data
- Keep indefinitely for reporting
- Consider archiving events > 2 years old to separate table

### Call Recordings
- Twilio automatically deletes after 120 days
- Store critical recordings in Supabase Storage

### Gift Card Codes
- Never delete delivered cards (audit trail)
- Archive redeemed cards after 1 year

### Draft Campaigns
- Auto-delete drafts not modified in 90 days
- Prompt user before deletion

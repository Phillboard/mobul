# Audiences & Contact Management

## Overview

The Contacts system is a marketing-focused CRM designed for audience segmentation and campaign targeting. It provides permanent contact storage, reusable lists, dynamic segments, and integration with campaign recipients.

---

## Contacts

### Contact Records

The permanent master database of all contacts across campaigns.

**Core Fields:**
- `customer_code` - Unique identifier (required, auto-generated if not provided)
- `first_name`, `last_name` - Contact name
- `email`, `phone`, `mobile_phone` - Contact methods
- `company`, `job_title` - Professional information
- `address`, `address2`, `city`, `state`, `zip`, `country` - Mailing address

**Engagement Tracking:**
- `lifecycle_stage` - Lead, MQL, SQL, Opportunity, Customer, Evangelist
- `lead_score` - 0-100 scoring based on engagement
- `engagement_score` - Auto-calculated engagement metric
- `last_activity_date` - Most recent interaction
- `total_interactions` - Count of all touches
- `redemptions_count` - Gift cards redeemed
- `email_opens_count` - Email engagement

**Custom Fields:**
- `custom_fields` - JSONB column for industry-specific data
- Flexible schema per client
- Supports text, number, date, boolean, select types

**Contact Preferences:**
- `email_opt_out` - Email unsubscribe status
- `sms_opt_out` - SMS unsubscribe status
- `do_not_contact` - Global suppression

---

## Contact Lists

Static groups of contacts for campaign targeting.

### List Types

**Static Lists**
- Manually selected contacts
- Saved search results
- CSV import results
- Fixed membership (manual updates only)

**Use Cases:**
- One-time campaign audiences
- Event attendee lists
- Customer anniversaries
- VIP customer groups

### Creating Lists

**Manual Selection:**
```typescript
// Create list from selected contacts
const { data: list } = await supabase
  .from('contact_lists')
  .insert({
    client_id: clientId,
    name: 'Q1 2024 VIP Customers',
    list_type: 'static',
    contact_count: selectedContacts.length,
  })
  .select()
  .single();

// Add contacts to list
const members = selectedContacts.map(contactId => ({
  list_id: list.id,
  contact_id: contactId,
}));

await supabase
  .from('contact_list_members')
  .insert(members);
```

**CSV Import:**
- Upload CSV with contact data
- Map columns to contact fields
- Create new list with imported contacts
- Deduplicate based on email or customer_code

---

## Segments

Dynamic rule-based groups that auto-update based on contact criteria.

### Segment Rules

**Filter Types:**
- **Lifecycle Stage** - Lead, Customer, etc.
- **Lead Score Range** - e.g., 80-100
- **Lead Source** - Website, Referral, Event
- **Tags** - Has specific tags
- **Custom Fields** - Industry-specific criteria
- **Engagement** - Last activity date, email opens
- **Geographic** - State, zip code, city
- **Demographics** - Company, job title

**Rule Structure:**
```json
{
  "filter_rules": {
    "operator": "AND",
    "conditions": [
      {
        "field": "lifecycle_stage",
        "operator": "equals",
        "value": "opportunity"
      },
      {
        "field": "lead_score",
        "operator": "greater_than",
        "value": 75
      },
      {
        "field": "state",
        "operator": "in",
        "value": ["CA", "TX", "FL"]
      }
    ]
  }
}
```

### Creating Segments

**UI Builder:**
1. Navigate to **Contacts** → **Segments** → **Create Segment**
2. Name the segment
3. Add filter conditions
4. Preview matching contacts
5. Save segment

**SQL Query Generation:**
```typescript
function buildSegmentQuery(filterRules: FilterRules) {
  let query = supabase
    .from('contacts')
    .select('*');
  
  for (const condition of filterRules.conditions) {
    switch (condition.operator) {
      case 'equals':
        query = query.eq(condition.field, condition.value);
        break;
      case 'greater_than':
        query = query.gt(condition.field, condition.value);
        break;
      case 'in':
        query = query.in(condition.field, condition.value);
        break;
      case 'contains':
        query = query.ilike(condition.field, `%${condition.value}%`);
        break;
    }
  }
  
  return query;
}
```

### Pre-Built Smart Segments

**Champions** - High engagement contacts
- Engagement score 80-100
- Last activity within 30 days
- 2+ redemptions

**At Risk** - Declining engagement
- Engagement score 30-60
- Last activity 60-90 days ago
- No recent redemptions

**Hot Leads** - High-potential prospects
- Lifecycle stage: Lead or MQL
- Lead score > 75
- Tagged as "hot-lead"

**Dormant** - Inactive contacts
- Last activity > 180 days ago
- Engagement score < 30
- No suppression flags

---

## Tags

Flexible labeling system for contact categorization.

### Tag Categories

- **Interest** - Product interest, service type
- **Behavior** - Active, responsive, unengaged
- **Source** - Campaign origin, referral source
- **Status** - VIP, decision-maker, champion
- **Geographic** - Regional classifications

### Using Tags

**Adding Tags:**
```typescript
await supabase
  .from('contact_tags')
  .insert({
    contact_id: contactId,
    tag: 'hot-lead',
    tag_category: 'status',
  });
```

**Tag-Based Filtering:**
- Select list/segment
- Add tag filter
- Multiple tags use AND logic (must have all)

---

## Engagement Scoring

Auto-calculated metric reflecting contact engagement.

### Scoring Algorithm

**Recency (0-40 points):**
- Last 7 days: 40 points
- 8-30 days: 30 points
- 31-60 days: 20 points
- 61-90 days: 10 points
- 90+ days: 0 points

**Frequency (0-30 points):**
- 10+ interactions: 30 points
- 5-9 interactions: 20 points
- 2-4 interactions: 10 points
- 1 interaction: 5 points
- 0 interactions: 0 points

**Campaign Engagement (0-30 points):**
- Redemptions: 10 points each (max 20)
- Email opens: 2 points each (max 10)

**Total Score:** Sum of all factors (0-100)

### Score Interpretation

- **80-100 (Champions)** - Highly engaged, responsive contacts
- **50-79 (Engaged)** - Active, good engagement
- **20-49 (At Risk)** - Declining engagement
- **0-19 (Dormant)** - Inactive, low engagement

---

## Contact Import

### CSV Import Process

1. **Upload CSV File**
   - Navigate to **Contacts** → **Import**
   - Select CSV file
   - Choose import type (update existing or create new)

2. **Map Columns**
   - Match CSV columns to contact fields
   - Set customer_code column (or auto-generate)
   - Map standard fields
   - Map custom fields

3. **Preview & Validate**
   - Review sample records
   - Identify invalid data
   - Choose deduplication strategy

4. **Import**
   - Process records in batches
   - Create contact records
   - Create contact list (optional)
   - Show import summary

### Deduplication

**Match Strategies:**
- **Email** - Most common, assumes email uniqueness
- **Customer Code** - Explicit unique identifier
- **Phone** - Match on primary phone number
- **Name + Address** - Fuzzy matching on full address

**Conflict Resolution:**
- **Skip** - Keep existing, ignore import
- **Update** - Overwrite existing with import data
- **Create** - Create duplicate (not recommended)

---

## Contact-to-Campaign Flow

### Linking Contacts to Recipients

When a campaign is created with a contact list:

1. **Audience Record Created**
   ```typescript
   const { data: audience } = await supabase
     .from('audiences')
     .insert({
       client_id: campaign.client_id,
       name: `${campaign.name} - Recipients`,
       source: 'contact_list',
     })
     .select()
     .single();
   ```

2. **Recipients Generated**
   ```typescript
   const recipients = contacts.map(contact => ({
     campaign_id: campaign.id,
     audience_id: audience.id,
     contact_id: contact.id,
     redemption_token: generateToken(),
     first_name: contact.first_name,
     last_name: contact.last_name,
     email: contact.email,
     phone: contact.phone,
     address: contact.address,
     city: contact.city,
     state: contact.state,
     zip: contact.zip,
   }));
   
   await supabase.from('recipients').insert(recipients);
   ```

3. **Participation Tracked**
   ```typescript
   const participations = recipients.map(r => ({
     contact_id: r.contact_id,
     campaign_id: campaign.id,
     recipient_id: r.id,
     participation_status: 'sent',
   }));
   
   await supabase
     .from('contact_campaign_participation')
     .insert(participations);
   ```

### Redemption Updates to Contacts

When a recipient redeems a gift card:

```typescript
// Update contact engagement
await supabase
  .from('contacts')
  .update({
    last_activity_date: new Date(),
    redemptions_count: contact.redemptions_count + 1,
    total_interactions: contact.total_interactions + 1,
  })
  .eq('id', contact.id);

// Recalculate engagement score
await updateContactEngagementScore(contact.id);

// Update participation record
await supabase
  .from('contact_campaign_participation')
  .update({
    participation_status: 'redeemed',
    redeemed_at: new Date(),
  })
  .eq('recipient_id', recipient.id);
```

---

## Contact Activity Timeline

Unified view of all contact interactions:

- **Campaign Sends** - Mailed campaigns
- **Deliveries** - USPS confirmed
- **Landing Page Visits** - PURL engagement
- **Calls** - Inbound call sessions
- **Gift Card Redemptions** - Reward claims
- **Email Opens** - Email engagement
- **Notes** - Manual notes added by users
- **Lifecycle Changes** - Stage transitions
- **List Additions** - Added to lists/segments

### Timeline Query

```typescript
const { data: timeline } = await supabase
  .rpc('get_contact_timeline', {
    p_contact_id: contactId,
  });

// Returns chronologically sorted events
[
  {
    event_type: 'campaign_sent',
    event_date: '2024-01-15',
    campaign_name: 'Spring Promo',
    details: { recipient_count: 1 },
  },
  {
    event_type: 'landing_page_visit',
    event_date: '2024-01-18',
    campaign_name: 'Spring Promo',
    details: { url: 'https://example.com/xyz123' },
  },
  {
    event_type: 'gift_card_redeemed',
    event_date: '2024-01-20',
    campaign_name: 'Spring Promo',
    details: { brand: 'Amazon', amount: 25 },
  },
]
```

---

## Best Practices

1. **Use segments for recurring campaigns** - Dynamic segments auto-update
2. **Tag consistently** - Establish tag taxonomy across team
3. **Maintain contact hygiene** - Remove invalid emails, update addresses
4. **Monitor engagement scores** - Identify at-risk contacts
5. **Link contacts to recipients** - Enable lifecycle tracking
6. **Use custom fields** - Capture industry-specific data
7. **Respect opt-outs** - Honor email/SMS preferences
8. **Deduplicate regularly** - Prevent duplicate contact records

---

## Related Documentation

- [Campaigns](/admin/docs/features/campaigns)
- [Campaign Lifecycle](/admin/docs/features/campaign-lifecycle)
- [Gift Card Rewards](/admin/docs/features/gift-cards)
- [Lead Marketplace](/admin/docs/features/lead-marketplace)

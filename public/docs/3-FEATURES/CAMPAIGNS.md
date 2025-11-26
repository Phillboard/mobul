# Campaign Management

## Overview

Campaigns are the core workflow of the Mobul ACE Platform. A campaign represents a direct mail marketing initiative that includes mail pieces, recipients, tracking, and optional gift card rewards.

---

## Campaign Creation

### Quick Create

The fastest way to create a campaign with only 2 required fields:

1. **Campaign Name** - Descriptive name for the campaign
2. **Recipients** - Select a contact list or segment

All other settings have smart defaults and can be configured later.

### Campaign Creation Form

Navigate to **Campaigns** → **Create Campaign**

#### Essential Fields

- **Campaign Name** (required) - Example: "Spring 2024 Roof Inspection Promo"
- **Recipients** (required) - Select from:
  - **Contact Lists** - Static groups of contacts
  - **Segments** - Dynamic rule-based groups
  - **All Contacts** - Send to entire contact database

#### Optional Tag Filtering

Further refine recipients by applying tags:
- Multiple tags use AND logic (must have all selected tags)
- Useful for targeting specific subsets within a list

#### Mail Piece (Optional)

- **Select Existing Template** - Choose from Mail Library
- **Design Later** - Campaign created without mail piece, design before mailing

#### Advanced Options (Collapsed by Default)

**PURL & Tracking Settings**
- **Base Landing Page URL** - Domain for personalized URLs
- **Landing Page Mode**:
  - `Bridge` - Personalized landing page with token validation
  - `Redirect` - Direct redirect to external URL with token parameter
- **Landing Page** - Select existing landing page design
- **UTM Parameters** - Campaign tracking parameters
  - UTM Source
  - UTM Medium  
  - UTM Campaign

**Call Tracking**
- **Enable Call Tracking** - Track phone responses
- **Select Tracked Number** - Assign dedicated tracking number
- **Forward-To Number** - Where calls are routed

**Gift Card Rewards**
- **Enable Gift Card Rewards** - Incentivize engagement
- **Campaign Conditions** - Define qualification criteria
- **Gift Card Pool** - Assign reward inventory
- **SMS Template** - Delivery notification message

**Delivery Settings**
- **Mail Date** - Scheduled mailing date
- **Mail Size** - `4x6`, `6x9`, `6x11` (default: `4x6`)
- **Postage Class** - `standard`, `first_class` (default: `standard`)
- **Vendor** - Mail provider selection

---

## Campaign Lifecycle

Campaigns progress through 7 distinct statuses:

### 1. Draft
- Initial creation state
- Editable, not yet submitted
- No recipients generated
- Can be deleted without impact

### 2. Pending Approval
- Submitted for review
- Awaiting admin/agency approval
- Cannot be edited without rejection
- Approval workflow triggered

### 3. Approved
- Ready for mailing
- Recipients generated with unique tokens
- Gift card pools reserved (if applicable)
- Awaiting print vendor submission

### 4. Mailed
- Submitted to print vendor
- Mail pieces in production
- Tracking active
- Cannot be cancelled

### 5. Delivered
- USPS delivery confirmed via IMb tracking
- Landing page engagement monitored
- Call tracking active
- Gift card redemptions enabled

### 6. Active
- Campaign in progress
- Metrics being tracked
- Conditions being evaluated
- Rewards being delivered

### 7. Completed
- Campaign ended
- Final metrics calculated
- Archived for reporting
- Cannot be modified

---

## Campaign Components

### Recipients

When a campaign is created with a contact list:

1. **Audience Record Created** - Links campaign to source contacts
2. **Recipient Records Generated** - One per contact in list
3. **Unique Tokens Assigned** - Each recipient gets redemption code
4. **Contact Linkage** - Recipients track back to source contacts

Recipient fields:
- `redemption_token` - Unique identifier (required)
- `first_name`, `last_name` - Name fields (optional)
- `email`, `phone` - Contact info (optional)
- `address`, `city`, `state`, `zip` - Mailing address (optional)
- `custom_fields` - Industry-specific JSONB data (optional)

### Campaign Conditions

Define qualification criteria for gift card rewards:

```json
{
  "condition_number": 1,
  "condition_name": "Called and Scheduled",
  "trigger_type": "call_completed",
  "time_delay_hours": 0,
  "crm_event_name": "appointment_scheduled"
}
```

**Trigger Types:**
- `call_completed` - Call session reached qualified status
- `landing_page_visit` - Recipient visited PURL
- `form_submission` - Lead form submitted
- `crm_event` - External CRM webhook received

### Reward Configuration

Link gift card pools to campaign conditions:

```json
{
  "campaign_id": "...",
  "condition_number": 1,
  "gift_card_pool_id": "...",
  "reward_description": "$25 Amazon Gift Card",
  "sms_template": "Thanks for scheduling! Your $25 Amazon gift card: {{code}}"
}
```

---

## Campaign Actions

### Edit Campaign

- **Draft/Pending** - Full edit capabilities
- **Approved** - Limited edits (dates, settings only)
- **Mailed+** - Read-only, cannot modify

### Duplicate Campaign

Create a copy of an existing campaign:
- All settings preserved
- New campaign created in Draft status
- Recipients not copied (must select list again)

### Archive Campaign

Soft-delete a campaign:
- Moves to archived state
- Hidden from main campaign list
- Metrics preserved for reporting
- Can be restored by admin

### Submit for Approval

Transition from Draft → Pending Approval:
- Validation checks run
- Approval workflow triggered
- Admin/agency owner notified

### Approve/Reject Campaign

Admin/agency owner actions:
- **Approve** - Move to Approved status, generate recipients
- **Reject** - Return to Draft with rejection notes

### Submit to Mail Vendor

Transition from Approved → Mailed:
- Send campaign data to print vendor API
- Reserve gift card inventory
- Lock campaign for editing
- Track mail submission

---

## Campaign Analytics

Real-time metrics tracked for each campaign:

### Volume Metrics
- **Total Mailed** - Number of mail pieces sent
- **Total Delivered** - USPS confirmed deliveries
- **Total Landed** - Landing page visits
- **Total Called** - Incoming call sessions
- **Total Redeemed** - Gift cards delivered

### Performance Metrics
- **Delivery Rate** - (Delivered / Mailed) × 100
- **Response Rate** - (Landed / Delivered) × 100
- **Call Rate** - (Called / Delivered) × 100
- **Conversion Rate** - (Redeemed / Called) × 100

### Funnel Analysis
```
1000 Mailed
  ↓ 95% delivery rate
950 Delivered
  ↓ 12% response rate
114 Landed on Page
  ↓ 45% called
51 Called
  ↓ 60% completed call
31 Qualified
  ↓ 90% redeemed
28 Gift Cards Delivered
```

### Geographic Distribution
- Heat map showing response by zip code
- State-level performance comparison
- Urban vs rural engagement patterns

### Time-Based Trends
- Daily response trends
- Peak engagement hours
- Conversion velocity (days from mail to redemption)

---

## Campaign Templates

Save campaign configurations for reuse:

### Save as Template
1. Complete campaign setup
2. Click "Save as Template"
3. Name the template
4. Template available for future campaigns

### Create from Template
1. Click "Use Template"
2. Select saved template
3. New campaign pre-populated with settings
4. Modify as needed before creating

---

## Multi-Client Campaign Management

### Agency View

Agency owners see campaigns across all clients:
- **Filter by client** - View specific client campaigns
- **Aggregate metrics** - Total performance across portfolio
- **Client comparison** - Benchmark client performance

### Client View

Client users see only their campaigns:
- Campaign list filtered by `client_id`
- Cannot view other clients' campaigns
- Full access to their campaign analytics

---

## Campaign Integration Points

### External Systems

**CRM Integration**
- Push campaign events to external CRM
- Sync contact updates bidirectionally
- Trigger campaigns from CRM workflows

**Print Vendor APIs**
- PostGrid integration for mail submission
- Custom webhook support for mailhouses
- Real-time delivery status updates

**Gift Card Providers**
- Tillo API for digital gift card delivery
- Bulk code uploads for physical cards
- Automated provisioning on redemption

**Communication Platforms**
- Twilio for SMS delivery
- Call tracking and recording
- Voice transcription and analysis

---

## Best Practices

1. **Start simple** - Use quick create with defaults, configure later
2. **Test campaigns** - Run small test batches before full deployment
3. **Monitor metrics** - Track response rates and adjust strategy
4. **Use segments** - Dynamic segments auto-update for future campaigns
5. **Set up tracking** - Enable call tracking and PURLs for attribution
6. **Plan rewards** - Ensure sufficient gift card inventory before launch
7. **Schedule strategically** - Time mailings for maximum engagement
8. **Follow up** - Use CRM integration to track long-term conversions

---

## Related Documentation

- [Campaign Lifecycle](/admin/docs/features/campaign-lifecycle)
- [Audiences & Recipients](/admin/docs/features/audiences)
- [Gift Card Rewards](/admin/docs/features/gift-cards)
- [Landing Pages](/admin/docs/features/landing-pages)
- [Analytics & Reporting](/admin/docs/features/analytics)

# Campaign Lifecycle

## Overview

Every campaign in the Mobul ACE Platform progresses through a 7-stage lifecycle from initial draft to final completion. Understanding this workflow is critical for campaign managers and administrators.

---

## Lifecycle Stages

### 1. Draft

**Description:** Initial creation state for new campaigns.

**Characteristics:**
- Campaign is being configured
- All fields are editable
- No recipients have been generated
- No mail vendor submission
- No tracking or analytics active

**Available Actions:**
- Edit all campaign settings
- Save progress (auto-save every 30 seconds)
- Delete campaign
- Submit for approval

**Validation Requirements (Before Submission):**
- Campaign name provided
- Recipients selected (contact list or segment)
- Mail piece assigned (or "design later" selected)

**Who Can Perform Actions:**
- Campaign creator
- Admin users
- Agency owner (for client campaigns)

---

### 2. Pending Approval

**Description:** Campaign submitted and awaiting approval.

**Characteristics:**
- Campaign locked for editing
- Approval workflow active
- Admin/agency owner notified
- Rejection returns to Draft status

**Available Actions:**
- View campaign details (read-only)
- Approve campaign (admin/agency owner only)
- Reject campaign with notes (admin/agency owner only)

**Approval Process:**
1. User clicks "Submit for Approval"
2. Campaign transitions to Pending Approval
3. Notification sent to approvers
4. Approver reviews campaign settings
5. Approver approves or rejects with notes

**Who Can Approve:**
- Admin users (all campaigns)
- Agency owners (their client campaigns)
- Tech support (with permission)

**Rejection Handling:**
- Campaign returns to Draft status
- Rejection notes provided to creator
- Creator edits and resubmits

---

### 3. Approved

**Description:** Campaign approved and ready for mailing.

**Characteristics:**
- Recipients generated with unique redemption tokens
- Gift card inventory verified (if applicable)
- Tracked phone numbers assigned (if applicable)
- Ready for mail vendor submission

**System Actions (On Approval):**

```typescript
// Create audience record
const { data: audience } = await supabase
  .from('audiences')
  .insert({
    client_id: campaign.client_id,
    name: `${campaign.name} - Recipients`,
    source: 'contact_list',
  })
  .select()
  .single();

// Generate recipients with unique tokens
const recipients = contacts.map(contact => ({
  campaign_id: campaign.id,
  audience_id: audience.id,
  contact_id: contact.id,
  redemption_token: generateUniqueToken(),
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

// Verify gift card inventory availability
if (campaign.hasGiftCardRewards) {
  await verifyGiftCardInventory(campaign.id, recipients.length);
}

// Update campaign status
await supabase
  .from('campaigns')
  .update({ status: 'approved', audience_id: audience.id })
  .eq('id', campaign.id);
```

**Available Actions:**
- View campaign details
- Submit to mail vendor
- Edit limited settings (mail date, postage)
- Cancel campaign (before mailing)

**Who Can Perform Actions:**
- Admin users
- Agency owners
- Campaign creator

---

### 4. Mailed

**Description:** Campaign submitted to print vendor, mail in production.

**Characteristics:**
- Campaign data sent to mail vendor API
- Mail pieces being produced
- Cannot be cancelled or edited
- Tracking begins

**Mail Submission Process:**

```typescript
// Submit to PostGrid API
const response = await fetch('https://api.postgrid.com/v1/letters', {
  method: 'POST',
  headers: {
    'x-api-key': POSTGRID_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: recipients,
    template: campaign.template_id,
    merge_variables: campaign.merge_data,
    mail_type: campaign.postage,
  }),
});

// Log submission
await supabase.from('mail_submissions').insert({
  campaign_id: campaign.id,
  provider_type: 'postgrid',
  recipient_count: recipients.length,
  status: 'submitted',
  vendor_batch_id: response.batch_id,
  submitted_at: new Date(),
});

// Update campaign
await supabase
  .from('campaigns')
  .update({ 
    status: 'mailed',
    mail_date: new Date(),
  })
  .eq('id', campaign.id);
```

**Tracking Activation:**
- USPS Intelligent Mail Barcode (IMb) tracking
- Delivery status webhooks configured
- Landing page analytics enabled
- Call tracking active

**Available Actions:**
- View campaign details (read-only)
- Monitor delivery status
- View early analytics

---

### 5. Delivered

**Description:** USPS has confirmed delivery of mail pieces.

**Characteristics:**
- Delivery confirmation received via IMb tracking
- Landing pages receiving traffic
- Call tracking recording sessions
- Gift card redemptions enabled

**Delivery Confirmation:**

```typescript
// Webhook from mail vendor
export default async function handler(req: Request) {
  const { batch_id, letter_id, status, delivered_at } = await req.json();
  
  // Find recipient by vendor tracking
  const { data: recipient } = await supabase
    .from('recipients')
    .select('*')
    .eq('vendor_letter_id', letter_id)
    .single();
  
  if (status === 'delivered') {
    // Update recipient status
    await supabase
      .from('recipients')
      .update({ 
        status: 'delivered',
        delivered_at: new Date(delivered_at),
      })
      .eq('id', recipient.id);
    
    // Check if campaign fully delivered
    const { count: pending } = await supabase
      .from('recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', recipient.campaign_id)
      .neq('status', 'delivered');
    
    if (pending === 0) {
      // All delivered, transition campaign
      await supabase
        .from('campaigns')
        .update({ status: 'delivered' })
        .eq('id', recipient.campaign_id);
    }
  }
  
  return new Response('OK', { status: 200 });
}
```

**Available Actions:**
- View real-time analytics
- Monitor landing page visits
- Review call sessions
- Track gift card redemptions

---

### 6. Active

**Description:** Campaign in active engagement phase.

**Characteristics:**
- Recipients engaging with landing pages
- Calls being received and tracked
- Campaign conditions being evaluated
- Gift cards being provisioned and delivered
- Full analytics available

**Condition Evaluation:**

When a call session reaches "qualified" status:

```typescript
async function evaluateCampaignConditions(callSessionId: string) {
  const { data: session } = await supabase
    .from('call_sessions')
    .select('*, campaign:campaigns(*), recipient:recipients(*)')
    .eq('id', callSessionId)
    .single();
  
  // Check if call meets condition criteria
  const { data: conditions } = await supabase
    .from('campaign_conditions')
    .select('*')
    .eq('campaign_id', session.campaign_id)
    .eq('trigger_type', 'call_completed');
  
  for (const condition of conditions) {
    // Log condition met
    await supabase.from('call_conditions_met').insert({
      call_session_id: session.id,
      campaign_id: session.campaign_id,
      recipient_id: session.recipient_id,
      condition_number: condition.condition_number,
    });
    
    // Trigger gift card provisioning
    await provisionGiftCard(session.campaign_id, condition.condition_number, session.recipient_id);
  }
}
```

**Gift Card Delivery:**

```typescript
async function provisionGiftCard(campaignId: string, conditionNumber: number, recipientId: string) {
  // Get reward config with brand and denomination
  const { data: config } = await supabase
    .from('campaign_reward_configs')
    .select('*, brand:gift_card_brands(*)')
    .eq('campaign_id', campaignId)
    .eq('condition_number', conditionNumber)
    .single();
  
  // Call unified provisioning edge function
  const { data: giftCard } = await supabase.functions.invoke(
    'provision-gift-card-unified',
    {
      body: {
        campaignId,
        recipientId,
        brandId: config.brand_id,
        denomination: config.card_value,
        conditionNumber,
      },
    }
  );
  
  // Send SMS with code
  const { data: recipient } = await supabase
    .from('recipients')
    .select('phone, first_name')
    .eq('id', recipientId)
    .single();
  
  const message = config.sms_template
    .replace('{{first_name}}', recipient.first_name)
    .replace('{{code}}', giftCard.code);
  
  await sendSMS(recipient.phone, message);
}
```

**Available Actions:**
- Monitor real-time metrics
- View call recordings
- Review condition completions
- Track gift card delivery status
- Export campaign data

---

### 7. Completed

**Description:** Campaign has ended, final metrics calculated.

**Characteristics:**
- All metrics finalized
- Campaign archived for reporting
- No further engagement tracking
- Historical data preserved

**Completion Criteria:**

Campaigns transition to Completed when:
- Manual completion by admin/agency owner
- Auto-completion after 90 days of inactivity
- All gift card inventory exhausted

**Final Metrics Calculation:**

```typescript
async function finalizeCampaignMetrics(campaignId: string) {
  const metrics = await calculateFinalMetrics(campaignId);
  
  await supabase
    .from('campaign_metrics')
    .upsert({
      campaign_id: campaignId,
      total_mailed: metrics.totalMailed,
      total_delivered: metrics.totalDelivered,
      total_landed: metrics.totalLanded,
      total_called: metrics.totalCalled,
      total_qualified: metrics.totalQualified,
      total_redeemed: metrics.totalRedeemed,
      delivery_rate: metrics.deliveryRate,
      response_rate: metrics.responseRate,
      call_rate: metrics.callRate,
      conversion_rate: metrics.conversionRate,
      avg_cost_per_lead: metrics.avgCostPerLead,
      roi: metrics.roi,
    });
  
  await supabase
    .from('campaigns')
    .update({ 
      status: 'completed',
      completed_at: new Date(),
    })
    .eq('id', campaignId);
}
```

**Available Actions:**
- View final campaign report
- Export campaign data
- Duplicate campaign for reuse
- Archive campaign

---

## Status Transitions

### Valid Transitions

```
Draft → Pending Approval → Approved → Mailed → Delivered → Active → Completed
  ↓           ↓                ↓
Delete    Reject (→ Draft)   Cancel
```

### Transition Rules

| From | To | Condition | Action |
|------|-----|-----------|--------|
| Draft | Pending Approval | User submits | Notify approvers |
| Pending Approval | Approved | Admin approves | Generate recipients |
| Pending Approval | Draft | Admin rejects | Add rejection notes |
| Approved | Mailed | Submit to vendor | Lock campaign |
| Approved | Draft | Cancel before mail | Release reservations |
| Mailed | Delivered | USPS confirms | Enable redemptions |
| Delivered | Active | First engagement | Start tracking |
| Active | Completed | Manual or auto | Finalize metrics |

---

## Lifecycle Management

### Campaign Duration

Typical lifecycle timelines:

- **Draft → Approved:** 1-3 days (approval process)
- **Approved → Mailed:** 1-2 days (print production)
- **Mailed → Delivered:** 3-7 days (USPS delivery)
- **Delivered → Active:** Immediate (first engagement)
- **Active → Completed:** 30-90 days (engagement window)

### Auto-Completion Rules

Campaigns auto-complete when:
- **90 days** since last recipient engagement
- **30 days** since last gift card redemption
- **All gift cards** from pool have been delivered

### Manual Completion

Admins can manually complete campaigns:
- Before auto-completion period
- To finalize reporting early
- When campaign objectives met

---

## Related Documentation

- [Campaigns Overview](/admin/docs/features/campaigns)
- [Approval Workflows](/admin/docs/user-guides/admin-guide)
- [Gift Card Provisioning](/admin/docs/features/gift-cards)
- [Analytics & Reporting](/admin/docs/features/analytics)

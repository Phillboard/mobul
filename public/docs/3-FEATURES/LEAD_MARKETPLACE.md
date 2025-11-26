# Lead Marketplace

## Overview

The Lead Marketplace enables agencies and clients to purchase qualified leads from completed campaigns. Leads are filtered by vertical, geographic location, and qualification criteria.

---

## Lead Types

### Vertical Categories

Leads organized by industry:

**Home Services:**
- Roofing
- HVAC
- Windows & Doors
- Siding
- Solar
- Plumbing
- Electrical
- Landscaping

**Professional Services:**
- Insurance (Home, Auto, Life)
- Financial Services
- Legal Services
- Real Estate
- Medical/Dental

**Retail:**
- Automotive
- Home Improvement
- Luxury Goods
- Travel & Hospitality

### Lead Quality Tiers

**Tier 1 - Hot Leads** ($50-$100 per lead)
- Phone call completed
- Condition met (appointment scheduled, quote requested)
- Gift card redeemed
- Contact info verified
- Ready for immediate follow-up

**Tier 2 - Warm Leads** ($25-$50 per lead)
- Landing page form submitted
- Email/phone provided
- Expressed interest
- No call yet

**Tier 3 - Cold Leads** ($5-$15 per lead)
- QR code scanned or PURL visited
- No form submission
- Minimal engagement
- Requires nurturing

---

## Lead Attributes

### Standard Fields

**Contact Information:**
- First name, last name
- Email address
- Phone number (primary and mobile)
- Mailing address (street, city, state, zip)

**Demographics:**
- Age range
- Homeowner status
- Household income estimate
- Property value

**Engagement Data:**
- Campaign source
- Response date
- Landing page visited
- Form fields submitted
- Call duration (if called)
- Condition met (if applicable)

**Lead Scoring:**
- Engagement score (0-100)
- Lead quality tier (1-3)
- Estimated intent level
- Likelihood to convert

### Custom Fields

Industry-specific data captured via forms:

**Roofing:**
- Roof age
- Leak history
- Last inspection date
- Roof material
- Square footage

**HVAC:**
- System age
- Last service date
- Issues experienced
- Home square footage
- Preferred installation timeframe

**Solar:**
- Average electric bill
- Homeowner (yes/no)
- Credit score range
- Roof condition
- Shade concerns

---

## Search & Filtering

### Geographic Filters

**State-Level:**
- Select one or multiple states
- Filter leads by state of residence

**Zip Code:**
- Enter specific zip codes
- Radius search (e.g., within 50 miles of 90210)

**DMA (Designated Market Area):**
- Filter by media market
- Useful for regional advertising

### Demographic Filters

**Age Range:**
- 18-24, 25-34, 35-44, 45-54, 55-64, 65+

**Income Range:**
- $0-$50k, $50-$75k, $75-$100k, $100-$150k, $150k+

**Homeowner Status:**
- Homeowners only
- Renters included

**Property Value:**
- $0-$200k, $200-$400k, $400-$600k, $600k+

### Behavioral Filters

**Engagement Level:**
- Called (phone engagement)
- Form submitted (web engagement)
- QR scanned only (minimal engagement)

**Response Timeframe:**
- Last 7 days
- Last 30 days
- Last 90 days

**Lead Age:**
- Fresh (0-7 days old)
- Recent (8-30 days)
- Older (31-90 days)

**Exclusions:**
- Do Not Contact list
- Previously contacted
- Duplicate leads

---

## Lead Pricing

### Dynamic Pricing Model

Lead prices vary based on:

**Quality Factors:**
- Lead tier (Hot/Warm/Cold)
- Recency (newer = more expensive)
- Engagement level
- Completeness of data

**Market Factors:**
- Vertical demand (high-demand = higher price)
- Geographic competition
- Seasonality
- Supply/demand ratio

**Volume Discounts:**
- 1-10 leads: Full price
- 11-50 leads: 10% discount
- 51-100 leads: 15% discount
- 101+ leads: 20% discount

### Example Pricing

| Vertical | Tier 1 (Hot) | Tier 2 (Warm) | Tier 3 (Cold) |
|----------|-------------|---------------|---------------|
| Roofing | $75 | $35 | $10 |
| HVAC | $85 | $40 | $12 |
| Solar | $100 | $50 | $15 |
| Insurance | $65 | $30 | $8 |
| Windows | $70 | $35 | $10 |

---

## Purchasing Leads

### Purchase Flow

1. **Search & Filter**
   - Apply filters to find target leads
   - Preview matching lead count
   - See estimated cost

2. **Review Lead Sample**
   ```typescript
   // Preview 5 sample leads (no PII shown)
   const sampleLeads = [
     {
       location: "Dallas, TX 75201",
       age_range: "45-54",
       income_range: "$75-$100k",
       engagement: "Called + Form Submitted",
       vertical: "Roofing",
       tier: 1,
       price: "$75",
     },
     // ... 4 more samples
   ];
   ```

3. **Select Quantity**
   - Choose how many leads to purchase
   - See total cost with volume discount
   - View estimated ROI

4. **Confirm Purchase**
   - Review order summary
   - Confirm payment method
   - Agree to terms of service

5. **Download Leads**
   - CSV export with full contact details
   - API access for CRM integration
   - Leads marked as "sold" (no re-selling)

### Payment Methods

**Credits:**
- Pre-purchased lead credits
- $1,000 minimum purchase
- No expiration

**Direct Payment:**
- Credit card
- ACH transfer
- Invoice (for enterprise accounts)

### Delivery Methods

**CSV Export:**
```csv
first_name,last_name,email,phone,address,city,state,zip,vertical,tier,campaign_source,response_date
John,Smith,john.smith@example.com,214-555-0123,123 Main St,Dallas,TX,75201,roofing,1,Q1_2024_Roofing,2024-03-15
```

**API Integration:**
```typescript
// Fetch purchased leads via API
const { data: leads } = await fetch('/api/purchased-leads', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
});

leads.forEach(lead => {
  // Push to CRM
  crm.createLead({
    firstName: lead.first_name,
    lastName: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    source: 'Lead Marketplace',
  });
});
```

**CRM Integration:**
- HubSpot
- Salesforce
- Zoho CRM
- Pipedrive
- Custom webhooks

---

## Lead Exclusions

### Do Not Contact Lists

Upload suppression lists:

**DNC Types:**
- Internal DNC (your previous customers)
- Competitor leads (avoid conflicts)
- Unsubscribes
- Legal DNC (federal/state registries)

**Upload Process:**
```typescript
// Upload DNC list
await supabase.storage
  .from('dnc-lists')
  .upload(`${clientId}/dnc.csv`, file);

// Leads matching DNC are filtered out of search results
```

### De-duplication

Prevent purchasing duplicate leads:

**Match Criteria:**
- Email address (exact match)
- Phone number (exact match)
- Name + Address (fuzzy match)

**Duplicate Handling:**
- Exclude from search results
- Show "Previously purchased" warning
- Offer reduced price for duplicates (if allowed)

---

## Lead Verification

### Data Quality Checks

Before leads enter marketplace:

**Email Validation:**
- Syntax validation
- Domain verification
- Mailbox existence check
- Spam trap detection

**Phone Validation:**
- Number format validation
- Carrier lookup (mobile vs landline)
- Disconnected number detection
- DNC registry check

**Address Validation:**
- USPS address verification
- Standardization (abbreviations, case)
- Geocoding (lat/long)
- Property record matching

### Quality Guarantees

**Lead Replacement:**
- Invalid email → Replacement within 7 days
- Disconnected phone → Replacement within 7 days
- Bad address → Full refund

**Quality Metrics:**
- 95%+ valid email addresses
- 90%+ valid phone numbers
- 98%+ deliverable mailing addresses

---

## Compliance & Privacy

### Data Usage Terms

Purchased leads subject to:

**Usage Restrictions:**
- Single-use purchase (no re-selling)
- Contact within 90 days
- Respect opt-out requests
- TCPA compliance (phone)
- CAN-SPAM compliance (email)

**Privacy Requirements:**
- GDPR compliance (EU residents)
- CCPA compliance (CA residents)
- Secure data storage
- No unauthorized sharing

### Consent & Opt-Ins

All leads have consented to:
- Marketing communications
- Data sharing with partners
- Phone calls and SMS
- Email marketing

**Opt-Out Handling:**
- Lead can opt-out via email/SMS
- Buyer must honor opt-out
- Opt-out reported to platform
- Lead removed from marketplace

---

## Lead Management

### Purchase History

Track all lead purchases:

**Purchase Records:**
- Purchase date
- Lead count
- Total cost
- Filters used
- Download history

**Lead Status:**
- Downloaded
- Contacted
- Qualified
- Converted
- Lost/Dead

### Performance Tracking

Measure lead quality:

**Conversion Metrics:**
- Contact rate (% reached)
- Appointment rate (% scheduled)
- Close rate (% converted to customer)
- Average sale value
- ROI per lead

**Quality Feedback:**
- Rate lead quality (1-5 stars)
- Report bad leads
- Request replacement
- Share success stories

---

## Agency Features

### White-Label Marketplace

Agencies can:
- Brand marketplace with their logo
- Set custom pricing (markup on base price)
- Manage client access
- Track client purchases
- Earn commission on sales

### Lead Distribution

**Push Leads to Clients:**
- Automatically forward purchased leads to clients
- Apply client-specific pricing
- Track client usage and ROI
- Generate reports for clients

**Client Permissions:**
- Grant marketplace access
- Set spending limits
- Restrict verticals/geographies
- Approve purchases (optional)

---

## API Access

### Lead Search API

```typescript
POST /api/marketplace/search

{
  "vertical": "roofing",
  "states": ["TX", "CA"],
  "tier": [1, 2],
  "age_range": ["35-44", "45-54"],
  "limit": 100
}

Response:
{
  "count": 847,
  "estimated_cost": 32450,
  "sample_leads": [...]
}
```

### Lead Purchase API

```typescript
POST /api/marketplace/purchase

{
  "search_filters": {...},
  "quantity": 50,
  "payment_method": "credits"
}

Response:
{
  "purchase_id": "...",
  "lead_count": 50,
  "total_cost": 3750,
  "download_url": "https://..."
}
```

---

## Best Practices

1. **Target specific verticals** - Focus on your expertise
2. **Filter by quality** - Hot leads convert better
3. **Buy in volume** - Get volume discounts
4. **Act quickly** - Contact leads within 24 hours
5. **Upload DNC lists** - Avoid legal issues
6. **Track ROI** - Measure cost per acquisition
7. **Provide feedback** - Report bad leads for replacement
8. **Integrate with CRM** - Automate lead import
9. **Test small batches** - Validate quality before scaling
10. **Monitor conversion rates** - Optimize filters based on results

---

## Related Documentation

- [Campaigns](/admin/docs/features/campaigns)
- [Audiences](/admin/docs/features/audiences)
- [Analytics](/admin/docs/features/analytics)
- [REST API](/admin/docs/api-reference/rest-api)

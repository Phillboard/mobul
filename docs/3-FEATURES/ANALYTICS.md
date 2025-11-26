# Analytics & Reporting

## Overview

Comprehensive analytics track campaign performance from mail delivery through gift card redemption. Real-time dashboards provide insights into response rates, conversion funnels, and ROI.

---

## Key Performance Indicators (KPIs)

### Volume Metrics

**Total Mailed**
- Number of mail pieces sent to print vendor
- Initial campaign size

**Total Delivered**
- USPS confirmed deliveries via IMb tracking
- Base for calculating response rates

**Total Landed**
- Unique PURL visits or QR code scans
- First engagement signal

**Total Called**
- Inbound call sessions to tracked numbers
- Phone response metric

**Total Qualified**
- Calls meeting campaign condition criteria
- Sales-qualified leads

**Total Redeemed**
- Gift cards successfully delivered
- Ultimate conversion metric

### Performance Rates

**Delivery Rate**
```
(Total Delivered / Total Mailed) × 100
```
Target: 95%+ (industry standard)

**Response Rate**
```
(Total Landed / Total Delivered) × 100
```
Target: 3-8% (varies by industry/offer)

**Call Rate**
```
(Total Called / Total Delivered) × 100
```
Target: 2-5% (for campaigns with phone tracking)

**Conversion Rate**
```
(Total Qualified / Total Called) × 100
```
Target: 40-60% (for qualified calls)

**Redemption Rate**
```
(Total Redeemed / Total Qualified) × 100
```
Target: 80-95% (gift card fulfillment)

---

## Conversion Funnel

### Standard Funnel Stages

```
1. Mailed (100%)
   ↓
2. Delivered (95%)
   ↓
3. Landed on Page (12% of delivered = 11.4% of mailed)
   ↓
4. Called (45% of landed = 5.1% of mailed)
   ↓
5. Qualified Call (60% of called = 3.1% of mailed)
   ↓
6. Gift Card Redeemed (90% of qualified = 2.8% of mailed)
```

### Funnel Visualization

Dashboard displays:
- **Bar chart** - Stage volumes side-by-side
- **Waterfall chart** - Drop-off between stages
- **Percentage labels** - Conversion rates
- **Benchmark comparison** - Your campaign vs industry average

### Drop-off Analysis

Identify where recipients disengage:

**High drop-off between Delivered → Landed?**
- QR code not visible enough
- Offer not compelling
- PURL too complex to type
- Poor mail piece design

**High drop-off between Landed → Called?**
- Landing page not mobile-optimized
- Phone number not prominent
- Call-to-action not clear
- Slow page load time

**High drop-off between Called → Qualified?**
- Long hold times
- Agents not trained
- Call routing issues
- Offer confusion

**High drop-off between Qualified → Redeemed?**
- SMS delivery failures
- Invalid email addresses
- Gift card pool exhaustion
- Verification friction

---

## Geographic Analytics

### State-Level Performance

Heat map showing:
- **Response rate by state** - Color-coded by performance
- **Volume by state** - Mail pieces sent per state
- **Conversion by state** - Qualified leads per state

Example data:
| State | Mailed | Response Rate | Avg. Cost per Lead |
|-------|--------|---------------|-------------------|
| CA | 5,000 | 8.2% | $42.50 |
| TX | 3,500 | 6.5% | $38.20 |
| FL | 2,800 | 7.1% | $40.10 |
| NY | 2,200 | 5.8% | $45.30 |

### Zip Code Analysis

Drill down to zip code level:
- **Top performing zips** - Highest response rates
- **Urban vs rural** - Performance by density
- **Income correlation** - Response by median income
- **Demographic insights** - Age, homeownership, etc.

### Geographic Recommendations

System suggests:
- **Increase volume** in high-performing zips
- **Test new offers** in low-performing regions
- **Adjust messaging** based on demographics
- **Optimize mail size** by region (cost vs response)

---

## Time-Based Analytics

### Response Timeline

Track when engagement happens:

**Days Since Mail Date:**
- Day 0-3: Delivery window
- Day 4-7: Peak response (40% of total)
- Day 8-14: Secondary response (30% of total)
- Day 15-30: Long-tail response (20% of total)
- Day 30+: Stragglers (10% of total)

**Weekly Trends:**
```
Week 1: 450 responses (45%)
Week 2: 280 responses (28%)
Week 3: 150 responses (15%)
Week 4: 120 responses (12%)
```

### Hourly Call Patterns

Optimize staffing based on call volume:

**Peak Call Hours:**
- 10:00 AM - 11:00 AM (highest volume)
- 2:00 PM - 4:00 PM (secondary peak)
- Evening: 7:00 PM - 8:00 PM (after work)

**Day of Week:**
- Monday: 18% of calls
- Tuesday-Thursday: 22% each
- Friday: 12%
- Weekend: 4%

### Seasonal Trends

Compare campaigns across time:
- Q1 vs Q2 vs Q3 vs Q4 performance
- Holiday impact on response rates
- Weather correlation (roofing/HVAC campaigns)
- Economic factors (recession impact)

---

## Cost Analytics

### Cost per Acquisition (CPA)

```
CPA = Total Campaign Cost / Total Qualified Leads
```

**Cost Breakdown:**
- **Mail production** - $0.40-$0.80 per piece (postcard)
- **Postage** - $0.40 (standard) or $0.60 (first-class)
- **List purchase** - $0.05-$0.15 per contact
- **Gift cards** - $23.50 per $25 card (wholesale)
- **Platform fees** - $500-$2,000 per month

**Example:**
- 10,000 mail pieces at $0.60 each = $6,000
- 1,000 postage at $0.40 each = $400
- 300 gift cards at $23.50 each = $7,050
- Platform fees = $1,000
- **Total:** $14,450
- **Qualified leads:** 300
- **CPA:** $48.17 per lead

### Return on Investment (ROI)

```
ROI = (Revenue - Cost) / Cost × 100
```

**Example:**
- Campaign cost: $14,450
- 300 qualified leads
- Close rate: 20% = 60 customers
- Average sale: $5,000
- Revenue: $300,000
- **ROI:** (300,000 - 14,450) / 14,450 × 100 = **1,876%**

### Lifetime Value (LTV)

Calculate long-term customer value:

```
LTV = Average Sale × Repeat Purchases × Years Active
```

**Example:**
- Average initial sale: $5,000
- Annual repeat purchases: 1.5
- Customer lifespan: 8 years
- **LTV:** $5,000 × 1.5 × 8 = **$60,000**

**LTV to CAC Ratio:**
```
$60,000 / $48.17 = 1,245:1
```
(Exceptional ROI for direct mail campaigns)

---

## Campaign Comparison

### Multi-Campaign Dashboards

Compare campaigns side-by-side:

| Campaign | Mailed | Response Rate | CPA | ROI |
|----------|--------|---------------|-----|-----|
| Q1 Roofing | 10,000 | 7.2% | $48.17 | 1,876% |
| Q2 HVAC | 8,500 | 6.8% | $52.30 | 1,654% |
| Q3 Windows | 5,000 | 5.1% | $68.40 | 1,203% |

### A/B Test Results

Compare variants within a campaign:

| Variant | Traffic | Conversions | Conversion Rate | Winner |
|---------|---------|-------------|-----------------|--------|
| Control (4x6 postcard) | 50% | 342 | 6.8% | ❌ |
| Test (6x9 postcard) | 50% | 389 | 7.8% | ✅ |

**Statistical Significance:**
- p-value: 0.02 (significant)
- Confidence: 95%
- Lift: +14.6%

---

## Real-Time Dashboards

### Campaign Dashboard

Live metrics updated every 5 minutes:

**Top Section:**
- Total mailed, delivered, landed, called, qualified, redeemed
- Current response rate
- Active calls in progress
- Gift cards available

**Charts:**
- Response timeline (last 30 days)
- Hourly call volume (today)
- Geographic heat map
- Conversion funnel

**Recent Activity Feed:**
- Latest landing page visits
- Incoming calls
- Gift card redemptions
- Form submissions

### Call Center Dashboard

Real-time call monitoring:

**Active Calls:**
- Current call sessions
- Agent assignments
- Call duration
- Queue wait times

**Today's Stats:**
- Calls handled
- Average handle time
- Gift cards provisioned
- Condition completion rate

**Agent Performance:**
- Calls per agent
- Average call duration
- Qualification rate
- Customer satisfaction

---

## Export & Reporting

### Data Export Formats

**CSV Export:**
- Campaign summary
- Recipient-level data
- Call session logs
- Gift card redemptions
- Form submissions

**PDF Reports:**
- Executive summary
- Performance overview
- Geographic breakdown
- Funnel visualization
- Cost analysis

**API Access:**
- Real-time data via REST API
- Webhook notifications
- Custom integrations
- BI tool connections

### Scheduled Reports

Automated email reports:

**Daily:**
- Yesterday's activity summary
- Active campaign performance
- Low inventory alerts

**Weekly:**
- Week-over-week comparison
- Top performing campaigns
- Geographic insights

**Monthly:**
- Month-end summary
- Quarterly trend analysis
- Budget vs actual spend

---

## Attribution Tracking

### Multi-Touch Attribution

Track recipient journey across touchpoints:

```
1. Mail delivered (Day 0)
2. QR code scanned (Day 3)
3. Landing page visited (Day 3)
4. Form started (Day 3)
5. Form abandoned (Day 3)
6. Called tracked number (Day 5)
7. Qualified call completed (Day 5)
8. Gift card redeemed (Day 5)
9. Follow-up email opened (Day 7)
10. Appointment scheduled (Day 10)
```

### Attribution Models

**First-Touch:**
- Credit to initial campaign that introduced contact

**Last-Touch:**
- Credit to final touchpoint before conversion

**Linear:**
- Equal credit across all touchpoints

**Time-Decay:**
- More credit to recent touchpoints

**Position-Based:**
- 40% to first, 40% to last, 20% to middle touches

---

## Best Practices

1. **Set benchmarks** - Define target metrics before launch
2. **Monitor daily** - Check dashboards for anomalies
3. **Compare campaigns** - Learn from top performers
4. **Analyze drop-offs** - Fix funnel leaks
5. **Test variants** - A/B test everything
6. **Track costs** - Know your CPA and ROI
7. **Geographic targeting** - Focus on high-performing areas
8. **Time optimization** - Staff call center during peak hours
9. **Report regularly** - Share insights with stakeholders
10. **Act on data** - Use analytics to improve future campaigns

---

## Related Documentation

- [Campaigns](/admin/docs/features/campaigns)
- [Campaign Lifecycle](/admin/docs/features/campaign-lifecycle)
- [Event Tracking](/admin/docs/developer-guide/event-tracking)
- [REST API](/admin/docs/api-reference/rest-api)

# Create Your First Campaign

Step-by-step walkthrough to create, launch, and monitor your first direct mail campaign.

## Prerequisites

Before creating your first campaign, ensure you have:
- [ ] Completed your profile setup
- [ ] Imported at least one contact list (100+ contacts recommended)
- [ ] Prepared or selected a mail template design
- [ ] (Optional) Configured call tracking phone numbers
- [ ] (Optional) Purchased gift card inventory

## Step 1: Navigate to Campaign Creation

1. Click **Campaigns** → **All Campaigns** in the sidebar navigation
2. Click **Create Campaign** button (top-right)
3. You'll be taken to the campaign creation wizard

## Step 2: Campaign Basics

### Campaign Name
Enter a descriptive name that helps you identify this campaign:
- ✅ Good: "Spring 2024 - Roofing Special - North Dallas"
- ❌ Bad: "Campaign 1"

### Select Recipients

Choose your target audience:

**Option 1: Use Existing Contact List**
1. Select **Use Existing List**
2. Choose from your imported contact lists
3. (Optional) Apply tag filters to narrow the audience

**Option 2: Use Dynamic Segment**
1. Select **Use Segment**
2. Choose a pre-configured segment with filter rules
3. Segment will automatically update as contacts match criteria

**Audience Preview**
- Review the total count of recipients
- See a sample of contacts who will receive the mail

## Step 3: Select Mail Piece

### Choose Template
1. Browse your **Mail Library**
2. Select an existing template, or
3. Click **Design New** to create a template on-the-fly

### Mail Specifications
Configure your mail piece settings:

| Setting | Options | Recommended for First Campaign |
|---------|---------|-------------------------------|
| **Size** | 4x6, 6x9, 6x11, Letter | 4x6 Postcard |
| **Postage** | Standard, First Class | Standard |
| **Paper** | 14pt, 16pt Cardstock | 14pt Cardstock |

### Template Variables
If your template includes merge fields, you'll see a preview showing how recipient data will populate:
- `{FirstName}` → John
- `{Address}` → 123 Main St
- `{City}` → Dallas

## Step 4: Configure Landing Page (Optional)

Direct mail works best with digital follow-up. Configure your landing page:

### Landing Page Mode

**Bridge Page (Recommended)**
- Shows personalized landing page
- Includes lead capture form
- Tracks visitor engagement
- Best for lead generation

**Redirect Mode**
- Redirects directly to your website
- Adds UTM parameters for tracking
- Best for brand awareness

### Landing Page Content
1. Select a landing page template from your library, or
2. Create a new landing page using the visual builder
3. Customize headline, images, form fields
4. Preview on mobile and desktop

### Form Configuration
Configure what information you want to collect:
- Required fields: Name, Phone, Email
- Optional fields: Address, Best Time to Call, Notes
- Enable CAPTCHA to prevent spam

## Step 5: Set Up Tracking

Tracking is automatically configured but can be customized:

### PURL Settings
- **PURL Format**: `yourdomain.com/r/{token}`
- **Token Length**: 8 characters (default)
- **Unique**: Every recipient gets a unique PURL

### QR Code
- Automatically generated for each mail piece
- Links to the recipient's unique PURL
- Includes campaign attribution

### UTM Parameters
Track campaign in Google Analytics:
- **Source**: `direct-mail`
- **Medium**: `postcard`
- **Campaign**: Auto-populated from campaign name

### Call Tracking (Optional)
1. Enable call tracking
2. Select or provision tracking phone numbers
3. Set forward-to number (your business line)
4. Enable call recording (recommended)

## Step 6: Add Gift Card Rewards (Optional)

Incentivize engagement with automated gift card rewards:

### Configure Reward Conditions

**Condition 1: Landing Page Visit**
- Trigger: Recipient visits landing page
- Reward: $5 Amazon gift card
- Delivery: SMS or email

**Condition 2: Call Completion**
- Trigger: Call lasts 2+ minutes
- Reward: $10 Visa gift card
- Delivery: SMS (call center provides at end of call)

### Select Gift Card Brand & Denomination
1. Choose a gift card brand (e.g., Amazon, Starbucks, Visa)
2. Select the denomination amount (e.g., $5, $10, $25)
3. Ensure sufficient inventory for campaign size
4. System will reserve cards when campaign launches

## Step 7: Review Campaign

Before submitting, review all settings:

### Campaign Summary
- **Recipients**: 250 contacts
- **Mail Size**: 4x6 Postcard
- **Landing Page**: Enabled (Bridge mode)
- **Call Tracking**: Enabled (1 tracking number)
- **Gift Cards**: $5 Amazon on visit, $10 Visa on call

### Cost Estimate
- Printing & Postage: $0.75 × 250 = $187.50
- Call Tracking: $2.00/month
- Gift Cards (estimated 20% redemption): $750
- **Total Estimated Cost**: ~$940

### Pre-Flight Checklist
- ✅ All recipient addresses validated
- ✅ Template preview looks correct
- ✅ Landing page tested and responsive
- ✅ Call tracking number active
- ✅ Gift card inventory sufficient

## Step 8: Submit Campaign

1. Click **Review & Submit**
2. Confirm all details
3. Click **Submit to Print Vendor**

### What Happens Next

**Immediately:**
- Campaign status changes to "In Production"
- Recipient tokens and PURLs generated
- QR codes created for all mail pieces
- Gift cards reserved from pool

**Within 24-48 hours:**
- Print vendor receives print-ready files
- Mail pieces printed
- USPS tracking (IMb barcodes) activated

**Within 3-5 business days:**
- Mail pieces in transit
- First delivery tracking events appear

**Within 7-10 days:**
- First recipient visits landing page
- First calls received
- Gift card redemptions begin

## Step 9: Monitor Campaign Performance

### Campaign Dashboard
Navigate to **Campaigns** → Select your campaign → **Analytics**

Key metrics to watch:
- **Delivery Rate**: % of mail pieces delivered (target: 95%+)
- **Response Rate**: % of recipients who engaged (average: 3-8%)
- **Call Rate**: % of recipients who called (average: 1-3%)
- **Conversion Rate**: % who completed desired action (varies)
- **Gift Card Redemption**: % who redeemed rewards

### Real-Time Alerts
Enable notifications for:
- First landing page visit
- First call received
- Gift card inventory running low
- Campaign milestone reached (10%, 50%, 100% delivered)

### Daily Monitoring Tasks
1. Check delivery status
2. Review new leads from landing page
3. Listen to call recordings
4. Follow up on hot leads
5. Monitor gift card redemption rate

## Step 10: Optimize for Next Campaign

After your first campaign, analyze results:

### Questions to Answer
- Which neighborhoods responded best?
- What time of day did most calls come in?
- Did gift cards improve response rate?
- Which creative variant performed better? (if A/B testing)
- What was the actual cost per lead?

### Optimization Ideas
- Target high-performing ZIP codes
- Adjust call tracking hours
- Test different gift card amounts
- Refine landing page copy
- Try different mail sizes or formats

## Common First Campaign Mistakes

❌ **Too Large**: Start small (100-500 pieces), scale what works  
❌ **Poor Data Quality**: Clean and validate addresses before mailing  
❌ **No Clear CTA**: Make it obvious what you want recipients to do  
❌ **Weak Follow-Up**: Have a plan to respond quickly to leads  
❌ **Ignoring Analytics**: Monitor daily, adjust future campaigns  

## Success Metrics for First Campaign

| Metric | Good | Great | Exceptional |
|--------|------|-------|-------------|
| Delivery Rate | 90%+ | 95%+ | 98%+ |
| Response Rate | 2%+ | 5%+ | 10%+ |
| Call Rate | 0.5%+ | 1.5%+ | 3%+ |
| Gift Card Redemption | 15%+ | 30%+ | 50%+ |
| Cost Per Lead | <$100 | <$50 | <$25 |

## Next Steps

- [Understanding Campaign Lifecycle →](/docs/features/campaign-lifecycle)
- [Landing Page Best Practices →](/docs/features/landing-pages)
- [Analytics Deep Dive →](/docs/features/analytics)
- [Gift Card Strategy →](/docs/features/gift-cards)

## Getting Help

Your first campaign is a learning experience. Don't hesitate to:
- Contact your account manager
- Request a campaign strategy consultation
- Join a live training session
- Browse the Documentation section for tips

**Congratulations on launching your first campaign!** 🎉

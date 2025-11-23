# Help Center Content

## FAQ Categories

### Getting Started

#### How do I create my first campaign?
Navigate to Campaigns > Create New Campaign. Follow the wizard to set up your template, audience, landing page, and gift card rewards. The system will guide you through each step.

**Related**: Campaign creation wizard, Template selection

#### What file format should I use for audience uploads?
Upload CSV files with columns: first_name, last_name, email, phone, address, city, state, zip. Download our sample CSV template for reference.

**Related**: Data hygiene, Audience management

#### How long does it take to generate a landing page?
AI-generated landing pages typically take 30-60 seconds. You can customize the generated page using our visual editor or request AI modifications.

**Related**: AI features, Landing page editor

---

### Gift Cards

#### How do I add gift cards to my inventory?
Go to Gift Cards > Upload Cards. You can upload cards via CSV or purchase directly from our marketplace. Each card needs a unique code and value.

**Related**: Gift card pools, Marketplace

#### What happens if I run out of gift cards during a campaign?
The system will alert you when inventory is low (<100 cards). Campaigns will pause automatically if cards run out. You can top up your pool anytime.

**Related**: Inventory management, Campaign alerts

#### Can I check gift card balances?
Yes! Use the balance check feature in the Gift Cards section. Enter the card code to see current balance, redemption history, and status.

**Related**: Gift card validation, Balance API

---

### Campaigns

#### What are campaign conditions?
Conditions are triggers that determine when gift cards are delivered. Examples: immediate (on mail receipt), after call, after form submission, or after CRM event. You can set up multiple conditions per campaign.

**Related**: Conditional logic, CRM integration

#### How do I track campaign performance?
Go to Campaign Detail > Analytics tab. You'll see metrics like response rate, gift card redemption rate, condition completion, and ROI calculations.

**Related**: Analytics dashboard, Reporting

#### Can I pause or stop a campaign?
Yes, use the campaign status controls to pause or stop delivery. Already-sent items will complete, but new provisioning will halt.

**Related**: Campaign management, Status controls

---

### Call Center

#### How do agents redeem gift cards?
Agents access the Call Center Dashboard, enter the customer's redemption code, verify details, and provision the gift card. An SMS with card details is sent automatically.

**Related**: Agent training, Redemption flow

#### What if a customer lost their redemption code?
Search by phone number or email in the Call Center Dashboard. The system will show any codes associated with that customer.

**Related**: Customer lookup, Code recovery

#### How do we handle already-redeemed codes?
The system prevents double-redemption automatically and shows a clear message. Review the redemption history to confirm with the customer.

**Related**: Fraud prevention, Audit log

---

### Billing & Credits

#### How does billing work?
Choose from monthly subscription plans or prepaid credit packages. Campaigns deduct credits based on recipient count and features used. View detailed usage in Settings > Billing.

**Related**: Pricing plans, Usage tracking

#### What happens if I run out of credits?
Campaigns will pause when credits reach zero. Purchase additional credits or upgrade your plan to continue. You'll receive low-balance alerts.

**Related**: Credit management, Alerts

#### Can I get a refund for unused credits?
Monthly subscription credits expire at the end of each billing cycle. Prepaid credit packages are non-refundable but never expire.

**Related**: Billing policy, Credit expiration

---

## Video Tutorials

### Creating Your First Campaign (5:32)
**Covers:**
- Navigating to campaign creation
- Selecting a template
- Uploading audience CSV
- Configuring landing page
- Setting up gift card rewards
- Launching the campaign

**Key Timestamps:**
- 0:00 - Introduction
- 0:45 - Template selection
- 2:10 - Audience upload
- 3:30 - Landing page setup
- 4:50 - Review and launch

### Gift Card Management (4:18)
**Covers:**
- Uploading bulk gift cards
- Creating gift card pools
- Setting pool pricing
- Monitoring inventory
- Checking card balances

**Key Timestamps:**
- 0:00 - Overview of gift card system
- 1:20 - CSV upload process
- 2:45 - Creating pools
- 3:40 - Inventory management

### Call Center Operations (3:45)
**Covers:**
- Agent dashboard overview
- Looking up redemption codes
- Verifying customer information
- Provisioning gift cards
- Handling common issues

**Key Timestamps:**
- 0:00 - Dashboard tour
- 1:15 - Code lookup
- 2:30 - Redemption process
- 3:15 - Troubleshooting

### Landing Page Builder (6:12)
**Covers:**
- AI page generation
- Editing content and design
- Adding custom sections
- Publishing pages
- Tracking page analytics

**Key Timestamps:**
- 0:00 - AI generation demo
- 2:00 - Visual editor tools
- 4:20 - Custom sections
- 5:30 - Publishing and tracking

---

## Common Issues & Solutions

### Problem: CSV Upload Fails
**Symptoms**: Error message "Invalid file format"
**Causes**: 
- Wrong delimiter (must be comma)
- Missing required columns
- Special characters in data
**Solutions**:
1. Download sample CSV template
2. Verify all required columns present
3. Use UTF-8 encoding
4. Remove special characters
5. Try uploading smaller batch first

### Problem: Landing Page Won't Publish
**Symptoms**: Publish button disabled or grayed out
**Causes**:
- Page has validation errors
- Missing required content
- Image upload failed
**Solutions**:
1. Check for red error indicators
2. Ensure all required fields filled
3. Re-upload any failed images
4. Save draft and try again
5. Contact support if persists

### Problem: Gift Card SMS Not Delivered
**Symptoms**: Customer reports not receiving SMS
**Causes**:
- Invalid phone number
- Carrier blocking
- Twilio account issue
**Solutions**:
1. Verify phone number format (E.164)
2. Check SMS delivery logs
3. Resend SMS manually
4. Use email fallback
5. Check Twilio account status

### Problem: Can't See Campaign Analytics
**Symptoms**: Analytics tab shows no data
**Causes**:
- Campaign just launched (data not yet available)
- No tracking configured
- Insufficient permissions
**Solutions**:
1. Wait 1-2 hours for data collection
2. Verify tracking is enabled
3. Check user role permissions
4. Refresh analytics page
5. Contact admin if persists

---

## Best Practices

### Campaign Setup
- Start with small test audience (50-100)
- Review all settings before launch
- Set up low-inventory alerts
- Test landing page on mobile
- Prepare call center team

### Audience Management
- Clean data before upload
- Remove duplicates
- Verify postal addresses
- Update suppression lists
- Segment for better targeting

### Gift Card Inventory
- Maintain 2x buffer (2x expected redemptions)
- Diversify brands in pools
- Set expiration alerts
- Monitor redemption patterns
- Plan for peak periods

### Call Center Operations
- Train agents on all scenarios
- Create quick reference guides
- Monitor average handle time
- Track customer satisfaction
- Review daily redemption logs

---

## Contact Support

### Email Support
**support@yoursystem.com**
- Response time: Within 24 hours
- Priority support for paid plans
- Include account ID and error details

### Discord Community
**Join our community**: https://discord.gg/yourserver
- Real-time help from team and users
- Share tips and best practices
- Feature requests and feedback
- Product announcements

### Emergency Contact
**For critical issues** (system down, security concern):
- Call: 1-800-XXX-XXXX
- Available 24/7
- Escalates to engineering team

### Feedback
We love hearing from you!
- Feature requests: feedback@yoursystem.com
- Bug reports: bugs@yoursystem.com
- General feedback: Use in-app widget

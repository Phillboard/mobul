# System Configuration Setup Guide

## Required Environment Variables

Before launching the gift card redemption system to production, configure these environment variables in **Lovable Cloud → Settings → Secrets**.

---

## 🔴 CRITICAL (Required for Production)

### Company & Support Contact Information

```bash
# Your company name (used in customer communications)
COMPANY_NAME="Your Company Name"

# Customer support phone number (toll-free recommended)
# Format: 1-800-XXX-XXXX or (555) 123-4567
SUPPORT_PHONE_NUMBER="1-800-555-GIFT"

# Customer support email address
SUPPORT_EMAIL="support@yourcompany.com"
```

**Where these appear:**
- Error messages shown to customers
- SMS messages
- Call center scripts
- Email notifications

---

## 🟡 HIGH PRIORITY (Recommended)

### Alert & Monitoring Configuration

```bash
# Email addresses to receive system alerts (comma-separated)
# Example: "ops@company.com,admin@company.com,manager@company.com"
ALERT_EMAIL_RECIPIENTS="ops@yourcompany.com,admin@yourcompany.com"

# Slack webhook URL for real-time alerts
# Get this from: Slack → Your Workspace → Apps → Incoming Webhooks
ALERT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**Alert Types:**
- **Critical**: Pool empty, high error rate (>5%), SMS delivery spike (>10% failed)
- **Warning**: Low inventory (<20 cards), stuck cards, cron job failures
- **Info**: Daily summary reports

---

## 🟢 OPTIONAL (Nice to Have)

### External Service References

These are already configured with defaults but can be customized:

```bash
# Production app URL (auto-detected, can override)
APP_URL="https://yourapp.lovable.app"

# Twilio support number (defaults to real Twilio support)
TWILIO_SUPPORT_PHONE="1-888-843-9377"
```

---

## Setup Instructions

### Step 1: Gather Information

Before configuring, you need:

- [ ] Legal company name
- [ ] Customer support phone number (get from your phone provider)
- [ ] Customer support email (create distribution list if needed)
- [ ] Team email addresses for alerts
- [ ] Slack webhook URL (if using Slack alerts)

### Step 2: Configure in Lovable Cloud

1. Go to your project in Lovable
2. Click **Settings** (gear icon)
3. Navigate to **Cloud** → **Secrets**
4. Click **Add Secret** for each variable above
5. Enter the exact name (case-sensitive) and value
6. Click **Save**

### Step 3: Verify Configuration

After adding secrets, edge functions will automatically use them. Test by:

1. Trigger a redemption that fails
2. Check if error message shows your support phone number
3. Trigger a pool low stock scenario
4. Verify alert is sent to your configured channels

---

## Team Distribution Lists Setup

### Recommended Email Aliases

Create these distribution lists in your email provider:

```
ops@yourcompany.com          → Operations team (monitoring, alerts)
admin@yourcompany.com        → System administrators
inventory@yourcompany.com    → Gift card inventory managers
sms-team@yourcompany.com     → SMS delivery monitoring
devops@yourcompany.com       → Engineering/DevOps team
support@yourcompany.com      → Customer support team
```

Then use them in `ALERT_EMAIL_RECIPIENTS`:
```bash
ALERT_EMAIL_RECIPIENTS="ops@yourcompany.com,admin@yourcompany.com,devops@yourcompany.com"
```

---

## Slack Alert Setup (Optional but Recommended)

### Create Slack Channels

1. Create channels in your Slack workspace:
   ```
   #redemption-critical    → P0/P1 alerts (pool empty, system down)
   #redemption-alerts      → P2 warnings (low stock, stuck cards)
   #redemption-daily       → Daily summary reports
   ```

2. Add team members to each channel

### Configure Incoming Webhook

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name: "Gift Card Alerts"
4. Select your workspace
5. Click **Incoming Webhooks** → Toggle **On**
6. Click **Add New Webhook to Workspace**
7. Select channel: `#redemption-critical`
8. Copy the webhook URL (starts with `https://hooks.slack.com/services/`)
9. Add to Lovable Cloud secrets as `ALERT_SLACK_WEBHOOK_URL`

### Test Slack Alerts

```bash
# Test from terminal or Postman
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"🎉 Gift Card Alert System Connected!"}'
```

---

## Current Configuration Status

### Already Configured ✅
- `SUPABASE_URL` - Auto-managed by Lovable Cloud
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-managed by Lovable Cloud
- `SUPABASE_ANON_KEY` - Auto-managed by Lovable Cloud
- `TWILIO_ACCOUNT_SID` - For SMS delivery
- `TWILIO_AUTH_TOKEN` - For SMS delivery
- `TWILIO_PHONE_NUMBER` - Your Twilio sending number

### Needs Configuration ❌
- `COMPANY_NAME` - **REQUIRED**
- `SUPPORT_PHONE_NUMBER` - **REQUIRED**
- `SUPPORT_EMAIL` - **REQUIRED**
- `ALERT_EMAIL_RECIPIENTS` - Recommended
- `ALERT_SLACK_WEBHOOK_URL` - Recommended

---

## Validation Checklist

After configuration, verify:

- [ ] Error messages display your company name
- [ ] Support phone number appears in error messages
- [ ] Low stock alert was received (test with low threshold)
- [ ] Slack webhook works (if configured)
- [ ] Email alerts arrive (if configured)
- [ ] Call center agents see correct support info
- [ ] Customer-facing pages show proper branding

---

## Emergency Contact Sheet

Once configured, update your runbook with:

```
Emergency Contacts:
- Customer Support: ${SUPPORT_PHONE_NUMBER}
- Support Email: ${SUPPORT_EMAIL}
- Alert Channel: #redemption-critical (Slack)
- Ops Team: ${ALERT_EMAIL_RECIPIENTS}
```

---

## Security Notes

⚠️ **Never commit these values to git**
- All secrets stored securely in Lovable Cloud
- Secrets encrypted at rest
- Only accessible by edge functions
- Not exposed to client-side code

✅ **Safe to hardcode:**
- External service phone numbers (Twilio support, etc.)
- Public URLs
- Non-sensitive configuration

---

## Next Steps

1. Complete this configuration setup
2. Review [REDEMPTION_RUNBOOK.md](./REDEMPTION_RUNBOOK.md) and update emergency contacts
3. Set up Slack channels (if using Slack)
4. Test alerts end-to-end
5. Train call center staff on new support contacts
6. Update customer-facing materials with support info

---

**Last Updated:** 2025-01-24
**Maintained By:** Engineering Team

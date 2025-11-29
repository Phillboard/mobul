# Resend Email Provider Setup Guide

## Quick Setup (10 minutes)

### Step 1: Create Resend Account

1. Go to https://resend.com/
2. Click "Get Started" or "Sign Up"
3. Sign up with your email or GitHub account
4. Verify your email address

### Step 2: Domain Verification (Optional but Recommended)

**For Production:**
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records provided by Resend:
   - TXT record for verification
   - MX records (if using Resend for receiving)
   - DKIM records for authentication
5. Wait for verification (usually < 15 minutes)

**For Development/Testing:**
- Use Resend's test domain: `onboarding@resend.dev`
- No verification needed
- Perfect for testing

### Step 3: Get API Key

1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Give it a name: "Mobul ACE Production" or "Mobul ACE Development"
4. Select permissions: "Sending access"
5. Click "Create"
6. **Copy the API key immediately** (starts with `re_`)
7. **Save it securely** - you won't see it again!

### Step 4: Configure Supabase

1. Open your Supabase project dashboard
2. Go to "Project Settings" → "Edge Functions"
3. Click on "Secrets" or "Environment Variables"
4. Add the following secrets:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Mobul ACE Platform
ALERT_EMAIL_RECIPIENTS=admin@yourdomain.com,ops@yourdomain.com
```

**Notes:**
- `FROM_EMAIL`: Use `onboarding@resend.dev` for testing, or `noreply@yourdomain.com` for production (after domain verification)
- `FROM_NAME`: Your app name that appears in emails
- `ALERT_EMAIL_RECIPIENTS`: Comma-separated list of admin emails for alerts

### Step 5: Test Email Delivery

**Quick Test via Edge Function:**
```bash
# Test the send-gift-card-email function
curl -X POST https://your-project.supabase.co/functions/v1/send-gift-card-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "your-test-email@example.com",
    "giftCardCode": "TEST-1234-5678",
    "giftCardValue": 25,
    "brandName": "Amazon",
    "recipientName": "Test User"
  }'
```

**Or Test via Call Center:**
1. Navigate to `/call-center`
2. Enter any redemption code
3. Select "Email" delivery
4. Enter your test email
5. Provision card
6. Check inbox within 1 minute

---

## Resend Features

### Free Tier Includes:
- **3,000 emails per month**
- **100 emails per day**
- All features unlocked
- Email logs and analytics
- Domain verification
- Team management

### Paid Plans:
- **$20/month** - 50,000 emails
- **$80/month** - 250,000 emails
- **$250/month** - 1,000,000 emails
- Volume discounts available

### Why Resend?

**Pros:**
- Modern, developer-friendly API
- Excellent documentation
- Built-in TypeScript support
- Real-time webhooks
- Email preview in dashboard
- High deliverability rates
- Fast delivery (usually < 1 second)
- Generous free tier
- Clean, simple dashboard

**Cons:**
- Newer service (less track record than SendGrid)
- Fewer integrations than established providers
- Domain verification required for production volumes

---

## Configuration Details

### Email Templates Available:
1. **Gift Card Delivery** - `gift-card-delivery`
2. **Form Submission** - `form-submission-confirmation`
3. **Inventory Alert** - `inventory-alert`
4. **Campaign Approval** - `approval-notification`
5. **User Welcome** - `welcome-email`

### Email Sending Functions:
- `send-gift-card-email` - Gift card delivery
- `send-form-notification` - Form confirmations
- `send-inventory-alert` - Stock alerts
- `send-approval-notification` - Campaign approvals (future)
- `send-welcome-email` - User invitations (future)

### Email Tracking:
All emails logged to `email_delivery_logs` table:
```sql
SELECT 
  recipient_email,
  subject,
  template_name,
  delivery_status,
  sent_at
FROM email_delivery_logs
ORDER BY sent_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Email Not Sending

**Problem:** No emails arriving  
**Checks:**
1. Verify `RESEND_API_KEY` is set in Supabase secrets
2. Check key is correct (starts with `re_`)
3. Check from email is verified domain or test domain
4. Check Resend dashboard for errors
5. Check `email_delivery_logs` for error messages

**Solution:**
```sql
-- Check failed emails
SELECT * FROM email_delivery_logs 
WHERE delivery_status = 'failed' 
ORDER BY sent_at DESC 
LIMIT 10;
```

### Emails Going to Spam

**Problem:** Emails land in spam folder  
**Solutions:**
1. Complete domain verification (add all DNS records)
2. Warm up your domain (start with low volume)
3. Use verified FROM_EMAIL address
4. Check email content (avoid spam trigger words)
5. Monitor Resend reputation score

### Rate Limiting

**Problem:** "Rate limit exceeded" errors  
**Solutions:**
1. Check you're within free tier limits
2. Upgrade Resend plan if needed
3. Implement queuing for bulk emails
4. Add retry logic with exponential backoff

### Domain Verification Issues

**Problem:** Domain won't verify  
**Checks:**
1. DNS records added correctly
2. Wait 15-30 minutes for DNS propagation
3. Check DNS with: `dig TXT yourdomain.com`
4. Ensure no conflicting records
5. Contact Resend support if stuck

---

## Alternative Email Providers

If Resend doesn't work for your use case:

### SendGrid
- **Free:** 100 emails/day
- **Setup:** More complex
- **API:** Well-documented
- **Best for:** Established businesses

### AWS SES
- **Cost:** $0.10 per 1,000 emails
- **Setup:** Complex (AWS console)
- **API:** Robust
- **Best for:** High volume, lowest cost

### Mailgun
- **Free:** 5,000 emails/month
- **Setup:** Medium complexity
- **API:** Good documentation
- **Best for:** Transactional emails

### Postmark
- **Cost:** $15/month for 10,000 emails
- **Setup:** Easy
- **API:** Excellent
- **Best for:** Transactional emails

---

## Setup Complete Checklist

After completing setup:
- [ ] Resend account created
- [ ] Domain verified (or using test domain)
- [ ] API key generated and saved
- [ ] API key added to Supabase secrets
- [ ] FROM_EMAIL configured
- [ ] FROM_NAME configured
- [ ] ALERT_EMAIL_RECIPIENTS configured
- [ ] Test email sent successfully
- [ ] Test email received in inbox
- [ ] Email logs show "sent" status
- [ ] Email formatting looks good
- [ ] Links in email work
- [ ] No errors in Supabase logs

---

## Success Metrics

**After setup, you should have:**
- >95% email delivery rate
- <1 second average send time
- Zero bounces on valid emails
- Professional email formatting
- All emails tracked in database
- Admin alerts working
- Gift card emails delivering
- Form confirmations sending


# MVP Production Deployment Guide

## 🚀 Deployment Steps

### Step 1: Deploy Edge Functions (5 minutes)

Deploy the new email functions and updated edge functions:

```bash
cd supabase

# Deploy new email function
npx supabase functions deploy send-gift-card-email

# Deploy updated functions
npx supabase functions deploy provision-gift-card-for-call-center
npx supabase functions deploy send-inventory-alert
npx supabase functions deploy evaluate-conditions
npx supabase functions deploy send-form-notification

# Deploy demo data function (if needed)
npx supabase functions deploy enrich-demo-data
```

### Step 2: Run Database Migration (Automatic)

The email delivery logs migration will run automatically on next deployment:
- `supabase/migrations/20251128000003_email_delivery_logs.sql`

To manually run if needed:
```bash
npx supabase db push
```

### Step 3: Configure Environment Variables

#### In Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add the following secrets:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
ALERT_EMAIL_RECIPIENTS=admin@yourdomain.com,ops@yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Mobul ACE Platform
```

#### To Get Resend API Key:
1. Go to https://resend.com/
2. Sign up for an account (free tier available)
3. Verify your domain (or use their test domain for development)
4. Go to API Keys section
5. Create a new API key
6. Copy the key (starts with `re_`)

### Step 4: Test Email Delivery (10 minutes)

Test the email system:

1. **Test Gift Card Email:**
   - Provision a gift card via call center with email delivery
   - Check email inbox for delivery
   - Verify email formatting and content

2. **Test Form Submission:**
   - Submit an ACE form with email notification enabled
   - Check for confirmation email
   - Verify gift card included if applicable

3. **Test Inventory Alert:**
   - Manually trigger or wait for low inventory
   - Check admin email for alert
   - Verify alert formatting

4. **Check Email Logs:**
   ```sql
   SELECT * FROM email_delivery_logs 
   ORDER BY sent_at DESC 
   LIMIT 10;
   ```

### Step 5: Test Page Navigation (10 minutes)

Test the new gift card pages:

1. **Pool Detail Page:**
   - Navigate to /gift-cards
   - Click on any pool
   - Verify URL: `/gift-cards/pools/:poolId`
   - Test all tabs (Cards, History, Settings)
   - Test Export and Balance Check buttons

2. **Purchase Flow:**
   - Navigate to marketplace
   - Click "Purchase" on a pool
   - Verify URL: `/gift-cards/purchase/:poolId`
   - Complete purchase flow
   - Verify success page

3. **Record Purchase:**
   - Navigate to `/admin/gift-cards/record-purchase`
   - Fill in purchase details
   - Submit and verify success
   - Check purchase history displays

4. **Edit Pricing:**
   - From pool detail page, click "Edit Pricing"
   - Verify URL: `/admin/gift-cards/pools/:poolId/pricing`
   - Update pricing
   - Verify changes saved

### Step 6: Fix Data Issues (5 minutes)

#### Link Campaigns to Audiences:
```bash
# Option A: Use UI
# Navigate to /admin/data-simulation
# Click "Link Campaigns to Audiences" button

# Option B: Run SQL
```sql
UPDATE campaigns c
SET audience_id = (
  SELECT DISTINCT contact_list_id 
  FROM recipients r 
  WHERE r.campaign_id = c.id 
  LIMIT 1
)
WHERE audience_id IS NULL;
```

#### Populate Gift Card Pools:
```bash
# Option A: Navigate to /admin/data-simulation
# Use "Generate Demo Data" feature

# Option B: Upload cards manually
# Navigate to /gift-cards/purchase
# Upload CSV with gift cards
```

### Step 7: Run MVP Verification (5 minutes)

```bash
# Navigate to /admin/mvp-verification
# Run all system checks
# Export verification report
# Address any failing checks
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [x] All code changes committed
- [x] Email templates created
- [x] Email edge function created
- [x] Database migration created
- [x] New pages created
- [x] Routes updated
- [x] Navigation updated

### Deployment
- [ ] Edge functions deployed
- [ ] Database migration run
- [ ] Environment variables configured
- [ ] Resend account setup
- [ ] Domain verified in Resend

### Post-Deployment Testing
- [ ] Email delivery tested (gift card)
- [ ] Email delivery tested (form)
- [ ] Email delivery tested (alerts)
- [ ] Pool detail page tested
- [ ] Purchase flow tested
- [ ] Record purchase tested
- [ ] Edit pricing tested
- [ ] Campaign-audience links fixed
- [ ] Gift card pools populated
- [ ] MVP verification passed

### Production Readiness
- [ ] All tests passing
- [ ] No console errors
- [ ] Email logs tracking properly
- [ ] Navigation working smoothly
- [ ] Performance acceptable
- [ ] Documentation updated

---

## 🔧 Troubleshooting

### Email Not Sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend
3. Check email logs: `SELECT * FROM email_delivery_logs WHERE delivery_status = 'failed'`
4. Check edge function logs in Supabase dashboard

### Navigation Not Working
1. Clear browser cache
2. Check browser console for errors
3. Verify routes are added to App.tsx
4. Check lazy imports are correct

### Data Issues
1. Run campaign-audience linking SQL
2. Generate demo data via `/admin/data-simulation`
3. Check database constraints aren't blocking inserts

---

## 📊 Success Metrics

After deployment, verify:
- ✅ Email delivery rate > 95%
- ✅ Page load time < 2 seconds
- ✅ Zero console errors
- ✅ All gift card workflows functional
- ✅ Campaign analytics displaying
- ✅ Pool inventory accurate

---

## 🎉 Post-Deployment

### Monitor
1. Check Resend dashboard for email delivery stats
2. Monitor `email_delivery_logs` table
3. Watch for user feedback
4. Check error logs in Supabase

### Optimize
1. Adjust email templates based on feedback
2. Optimize page performance if needed
3. Add more test data as required
4. Update documentation with learnings

---

## 📝 Notes

**Email Provider Options:**
- Resend (recommended) - Simple, modern, great DX
- SendGrid - Enterprise, more features
- AWS SES - Cheapest, more complex
- Mailgun - Good middle ground

**Cost Estimates:**
- Resend: Free for 3,000 emails/month, then $20/month for 50k
- SendGrid: Free for 100 emails/day, then paid plans
- AWS SES: $0.10 per 1,000 emails

**Resend Benefits:**
- Simple API
- Great documentation
- Built for developers
- Excellent deliverability
- Real-time webhooks
- Email testing in development

---

*Generated: MVP Production Deployment Guide*
*Context improved by Giga AI - Uses reward distribution flow documentation*


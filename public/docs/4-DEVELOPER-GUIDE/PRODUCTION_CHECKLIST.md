# Production Deployment Checklist

## Code Complete

### Phase 1: Page Conversions
- [x] PoolDetail page created
- [x] PurchaseGiftCard page created
- [x] RecordPurchase page created
- [x] EditPoolPricing page created

### Phase 2: Email System
- [x] EmailLayout template
- [x] GiftCardDeliveryEmail template
- [x] FormSubmissionConfirmation template
- [x] InventoryAlertEmail template
- [x] ApprovalNotificationEmail template
- [x] WelcomeEmail template
- [x] email_delivery_logs migration
- [x] send-gift-card-email edge function
- [x] provision-gift-card-for-call-center updated
- [x] send-inventory-alert updated
- [x] evaluate-conditions updated
- [x] send-form-notification updated

### Phase 3: Navigation & Routes
- [x] 4 new routes added to App.tsx
- [x] Lazy imports configured
- [x] BrandPoolsView navigation updated
- [x] GiftCards page dialogs removed
- [x] AdminGiftCardMarketplace navigation updated

---

## Deployment Tasks

### 1. Database Migration
```bash
cd supabase
npx supabase db push
```
- [ ] Migration 20251128000003_email_delivery_logs.sql applied
- [ ] email_delivery_logs table created
- [ ] RLS policies active
- [ ] Indexes created

### 2. Edge Functions Deployment
```bash
# New function
npx supabase functions deploy send-gift-card-email

# Updated functions
npx supabase functions deploy provision-gift-card-for-call-center
npx supabase functions deploy send-inventory-alert
npx supabase functions deploy evaluate-conditions
npx supabase functions deploy send-form-notification

# Demo data function
npx supabase functions deploy enrich-demo-data
```

**Checklist:**
- [ ] send-gift-card-email deployed
- [ ] provision-gift-card-for-call-center deployed
- [ ] send-inventory-alert deployed
- [ ] evaluate-conditions deployed
- [ ] send-form-notification deployed
- [ ] enrich-demo-data deployed
- [ ] All functions show "healthy" status

### 3. Environment Variables

**Supabase Secrets to Add:**
- [ ] RESEND_API_KEY
- [ ] ALERT_EMAIL_RECIPIENTS
- [ ] FROM_EMAIL
- [ ] FROM_NAME

**Verification:**
```bash
# Check secrets are set (from Supabase dashboard)
# Project Settings → Edge Functions → Secrets
```

### 4. Resend Setup
- [ ] Account created at resend.com
- [ ] Domain verified (or using test domain)
- [ ] API key generated
- [ ] API key added to Supabase secrets
- [ ] Test email sent successfully

### 5. Data Fixes

**Campaign-Audience Linking:**
- [ ] Navigated to /admin/data-simulation
- [ ] Clicked "Link Campaigns to Audiences"
- [ ] OR ran SQL:
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
- [ ] Verified campaigns now have audience_id
- [ ] Analytics displaying correctly

**Gift Card Pools:**
- [ ] Pools have cards (check available_cards > 0)
- [ ] OR generated demo data
- [ ] OR uploaded CSV of cards
- [ ] Can successfully claim/provision cards

---

## Testing

### Email Functionality
- [ ] Gift card email sent successfully
- [ ] Form confirmation email received
- [ ] Inventory alert email delivered
- [ ] Email logs show "sent" status
- [ ] HTML rendering correct
- [ ] Links in emails work

### Page Navigation
- [ ] /gift-cards lists pools
- [ ] Click pool → navigates to /gift-cards/pools/:poolId
- [ ] Pool detail page shows all tabs
- [ ] /gift-cards/purchase/:poolId shows checkout flow
- [ ] Purchase completes successfully
- [ ] /admin/gift-cards/record-purchase works
- [ ] /admin/gift-cards/pools/:poolId/pricing works
- [ ] Back buttons navigate correctly
- [ ] Breadcrumbs work

### Gift Card Workflows
- [ ] Can view pool details
- [ ] Can check balances
- [ ] Can export CSV
- [ ] Can purchase cards
- [ ] Balance deducted correctly
- [ ] Can record admin purchase
- [ ] Can edit pool pricing
- [ ] Pricing analysis updates
- [ ] Can provision cards via call center
- [ ] Can redeem via form submission

### Data Integrity
- [ ] Campaigns show analytics
- [ ] Recipient counts accurate
- [ ] Pool counts accurate after claims
- [ ] Email logs populated
- [ ] No duplicate sends
- [ ] Atomic claiming prevents race conditions

---

## MVP Verification

### Run System Checks
- [ ] Navigate to /admin/mvp-verification
- [ ] All checks passing
- [ ] No critical errors
- [ ] Export verification report

### Critical Metrics
- [ ] Database: All tables present
- [ ] Auth: RLS policies active
- [ ] Functions: All deployed and healthy
- [ ] Features: Core workflows functional
- [ ] Performance: Load times < 3s
- [ ] Errors: No console errors

---

## Production Monitoring

### Day 1 Checks
- [ ] Email delivery rate > 95%
- [ ] No failed email logs
- [ ] All page loads successful
- [ ] No JavaScript errors
- [ ] Gift card claims working
- [ ] Users can navigate smoothly

### Week 1 Checks
- [ ] Email deliverability maintained
- [ ] Page performance acceptable
- [ ] No reported bugs
- [ ] Data integrity maintained
- [ ] Pool counts accurate

### Ongoing
- [ ] Monitor Resend dashboard
- [ ] Check email_delivery_logs weekly
- [ ] Review error logs
- [ ] Update email templates as needed
- [ ] Optimize based on feedback

---

## Rollback Plan

If issues occur:

### 1. Disable Email (Quick Fix)
```bash
# Remove or rename RESEND_API_KEY in Supabase secrets
# Emails will log but not send
```

### 2. Revert Navigation (If Needed)
```bash
git revert <commit-hash>
git push
```

### 3. Rollback Edge Functions
```bash
npx supabase functions deploy <function-name> --no-verify-jwt
# Or redeploy previous version
```

### 4. Rollback Migration (Last Resort)
```sql
DROP TABLE IF EXISTS email_delivery_logs CASCADE;
```

---

## Success Criteria

**System is production-ready when:**
- All checklist items completed
- All tests passing
- MVP verification green
- Email system functional
- Navigation working smoothly
- No critical errors
- Performance acceptable
- Documentation complete


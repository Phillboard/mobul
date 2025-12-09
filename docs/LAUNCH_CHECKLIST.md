# Launch Checklist

Final go/no-go checklist for ACE Engage production deployment.

**Date:** ___________  
**Deployment Lead:** ___________  
**Sign-off:** ___________

---

## Pre-Launch Requirements

### Code Quality ✅

- [x] TypeScript check passes (`npx tsc --noEmit`)
- [x] Linter passes (`npm run lint`)
- [x] Build succeeds (`npm run build`)
- [x] Tests pass (`npm test`)
- [ ] E2E tests completed
- [x] Code review completed
- [x] Security audit passed

### Documentation ✅

- [x] README.md updated
- [x] PLATFORM_DICTIONARY.md (terminology)
- [x] ENVIRONMENT_SETUP.md (env vars)
- [x] DEPLOYMENT_RUNBOOK.md (deployment steps)
- [x] OAUTH_SETUP.md (OAuth configuration)
- [ ] API documentation current
- [ ] User guides reviewed

---

## Infrastructure Setup

### Supabase Configuration

- [ ] Production project created
- [ ] Database migrations applied
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Edge functions deployed (all 66 functions)
- [ ] Edge function secrets configured
- [ ] Storage buckets created (`designs`, `uploads`)
- [ ] Realtime subscriptions configured
- [ ] Connection pooler enabled
- [ ] Backups configured (daily)

### Authentication

- [ ] Email/password auth enabled
- [ ] Google OAuth configured (optional)
- [ ] Apple OAuth configured (optional)
- [ ] Email templates customized
- [ ] Password policies set
- [ ] MFA available (if required)
- [ ] Session timeout configured

### External Services

**Twilio (SMS):**
- [ ] Production account set up
- [ ] Phone number(s) purchased
- [ ] Account SID configured
- [ ] Auth token configured
- [ ] Webhook endpoints configured

**Tillo (Gift Cards):**
- [ ] Production API access granted
- [ ] API keys configured
- [ ] Brand catalog synced
- [ ] Test redemption successful

**Gemini AI:**
- [ ] Production API key obtained
- [ ] Quota limits understood
- [ ] API key configured in environment

**Email Provider:**
- [ ] SendGrid/SMTP configured
- [ ] From address verified
- [ ] Email templates tested
- [ ] Unsubscribe links working

---

## Feature Verification

### Authentication & Authorization

- [ ] Email/password login works
- [ ] Google OAuth works (if enabled)
- [ ] Apple OAuth works (if enabled)
- [ ] Password reset works
- [ ] Role-based access control works
- [ ] Protected routes redirect properly
- [ ] Session persistence works

### Campaign Workflows

- [ ] Create campaign end-to-end
- [ ] Upload contacts/audience
- [ ] Design mail piece (new AI designer)
- [ ] Configure gift card rewards
- [ ] Set up conditions
- [ ] Launch campaign
- [ ] Track campaign analytics

### Gift Card System

- [ ] Upload gift card inventory
- [ ] Enable brands for clients
- [ ] Provision card from inventory
- [ ] Provision card from API (Tillo)
- [ ] Send card via SMS
- [ ] Send card via email
- [ ] Balance checking works
- [ ] Billing ledger accurate

### Designer System (NEW)

- [ ] NewMailDesigner page loads
- [ ] Upload background image
- [ ] Add text elements
- [ ] Add template tokens
- [ ] AI assistant responds
- [ ] Export to PDF works
- [ ] Save design to database

- [ ] NewLandingPageDesigner works
- [ ] Export to HTML works
- [ ] Responsive preview works

- [ ] NewEmailDesigner works
- [ ] Email-safe HTML export works

### Contact Management

- [ ] Import contacts from CSV
- [ ] Create contact lists
- [ ] Build segments
- [ ] Custom fields work
- [ ] Data enrichment from forms

### Call Center

- [ ] Redemption panel works
- [ ] Code validation works
- [ ] SMS opt-in flow works
- [ ] Gift card delivery works
- [ ] Call disposition recording works

### Landing Pages

- [ ] PURL generation works
- [ ] Form submissions captured
- [ ] Contact enrichment works
- [ ] Analytics tracking works
- [ ] Public access works (no auth required)

---

## Performance & Security

### Performance

- [ ] Page load time < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] Bundle size reasonable (<5MB)
- [ ] Images optimized
- [ ] CDN configured (if applicable)
- [ ] Caching headers set
- [ ] Database queries optimized
- [ ] Indexes on frequently queried columns

### Security

- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS properly configured
- [ ] Rate limiting on public endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] API keys not exposed in frontend
- [ ] Service role key not exposed
- [ ] RLS policies tested
- [ ] Audit logging enabled

### Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Alt text on images
- [ ] Form labels present
- [ ] Error messages clear
- [ ] Focus indicators visible

---

## Data & Compliance

### Data Management

- [ ] Backup strategy implemented
- [ ] Data retention policies set
- [ ] GDPR compliance reviewed
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] Data export capability tested

### Monitoring & Alerts

- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Alert notifications set up (Slack/email)
- [ ] Log retention configured
- [ ] Dashboard for ops team

---

## User Onboarding

### Platform Admin Setup

- [ ] Admin account created
- [ ] Default permissions configured
- [ ] API documentation accessible
- [ ] Support contacts configured

### Agency Onboarding Process

- [ ] Agency creation workflow tested
- [ ] Credit allocation works
- [ ] Gift card marketplace access
- [ ] Multi-client management works
- [ ] Agency dashboard functional

### Client Onboarding Process

- [ ] Client creation under agency works
- [ ] Credit allocation from agency works
- [ ] First campaign creation guided
- [ ] Gift card selection works
- [ ] Contact import tested

---

## Communication & Support

### Internal Team

- [ ] Engineering team briefed
- [ ] Support team trained
- [ ] Runbooks documented
- [ ] Escalation paths defined
- [ ] On-call schedule set

### External Communication

- [ ] Launch announcement prepared
- [ ] User notification emails ready
- [ ] Support documentation published
- [ ] Help center updated
- [ ] FAQ created

---

## Final Verification

### Pre-Launch (T-24 hours)

- [ ] Full system backup completed
- [ ] All team members notified
- [ ] Support team on standby
- [ ] Monitoring dashboards open
- [ ] Rollback plan reviewed
- [ ] Emergency contacts list updated

### Launch Day (T-0)

- [ ] Deploy to production (off-peak hours)
- [ ] Verify deployment successful
- [ ] Smoke test critical paths
- [ ] Monitor error rates
- [ ] Check system health dashboard
- [ ] Confirm with stakeholders

### Post-Launch (T+4 hours)

- [ ] No critical errors in logs
- [ ] User signups working
- [ ] First campaign created successfully
- [ ] Gift cards provisioning correctly
- [ ] SMS/email notifications sending
- [ ] Performance within acceptable limits
- [ ] Team debrief scheduled

---

## Go/No-Go Decision

**Deployment Approved By:**

- [ ] Engineering Lead: ___________  
- [ ] Product Owner: ___________  
- [ ] Security Lead: ___________  
- [ ] Operations Lead: ___________

**Deployment Decision:** GO / NO-GO (circle one)

**If NO-GO, blockers:**
- ___________
- ___________
- ___________

---

## Known Issues (Non-Blocking)

Document any known issues that are acceptable for launch:

1. DesignerCanvas uses simplified rendering (Fabric.js integration pending)
2. BillingSettings component duplicated in legacy folder (documented)
3. Template token terminology migration ongoing (customer_code → unique_code)

---

## Post-Launch Monitoring (Week 1)

**Daily Checks:**
- [ ] Error rates < 1%
- [ ] API response times < 2s
- [ ] Database CPU < 70%
- [ ] Edge function success rate > 99%
- [ ] User feedback reviewed

**Metrics to Track:**
- Active users
- Campaign creation rate
- Gift card redemption rate
- System uptime
- Support ticket volume

---

## Rollback Triggers

Immediately rollback if:
- Error rate > 5%
- Critical security vulnerability discovered
- Data corruption detected
- System unavailable > 5 minutes
- Payment processing fails

---

**Checklist Last Updated**: December 2024  
**Next Review**: Before each deployment


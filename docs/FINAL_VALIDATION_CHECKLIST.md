# Final Validation Checklist

## Phase 10: Final Cleanup & Validation

This checklist should be completed before any major release or deployment.

---

## 🏗️ Build Validation

### Compilation & Build
- [ ] **Clean build succeeds**: `npm run build` completes without errors
- [ ] **No TypeScript errors**: Zero compilation errors
- [ ] **No ESLint warnings**: All linting rules pass
- [ ] **No unused imports**: All imports are used
- [ ] **Bundle size acceptable**: < 2MB for main bundle
- [ ] **Code splitting working**: Lazy-loaded routes generate separate chunks

### Build Output Analysis
```bash
# Run build
npm run build

# Analyze bundle size
npm run build -- --mode production
npx vite-bundle-visualizer

# Check for large dependencies
du -sh dist/assets/*.js | sort -h
```

**Target Bundle Sizes:**
- Main bundle: < 500KB (gzipped)
- Vendor chunks: < 1MB (gzipped)
- Total assets: < 2MB (gzipped)

**Action Items if oversized:**
- [ ] Identify large dependencies
- [ ] Implement code splitting
- [ ] Lazy load heavy components (GrapesJS, Canvas)
- [ ] Remove unused dependencies

---

## 🎨 UI/UX Validation

### Visual Consistency
- [ ] **Design system used**: All colors use semantic tokens from `index.css`
- [ ] **No hardcoded colors**: No `text-white`, `bg-black`, etc. in components
- [ ] **Responsive design**: Works on mobile (375px), tablet (768px), desktop (1920px)
- [ ] **Dark mode**: All pages work in dark mode
- [ ] **Loading states**: All pages show proper loading indicators
- [ ] **Empty states**: All lists show helpful empty states
- [ ] **Error states**: All errors show user-friendly messages

### Components Checklist
- [ ] **EmptyState** component used consistently
- [ ] **ErrorState** component used consistently  
- [ ] **LoadingPage** component used consistently
- [ ] **Buttons** use proper variants from design system
- [ ] **Forms** have proper validation and error messages
- [ ] **Modals/Dialogs** are accessible and closable

---

## ⚡ Performance Validation

### Lighthouse Audit
Run Lighthouse on key pages:

```bash
# Install if needed
npm install -g lighthouse

# Run audit (after deploying)
lighthouse https://your-app.lovable.app --view
```

**Target Scores:**
- [ ] **Performance: 90+**
- [ ] **Accessibility: 95+**
- [ ] **Best Practices: 95+**
- [ ] **SEO: 90+**

**Pages to Audit:**
- [ ] Dashboard (`/`)
- [ ] Campaigns list (`/campaigns`)
- [ ] Campaign detail (`/campaigns/:id`)
- [ ] Template builder (`/template-builder/:id`)
- [ ] Gift cards (`/gift-cards`)
- [ ] Ace Forms (`/ace-forms`)

### Performance Metrics
- [ ] **First Contentful Paint (FCP)**: < 1.5s
- [ ] **Largest Contentful Paint (LCP)**: < 2.5s
- [ ] **Time to Interactive (TTI)**: < 3.5s
- [ ] **Cumulative Layout Shift (CLS)**: < 0.1
- [ ] **Total Blocking Time (TBT)**: < 300ms

### Database Performance
```sql
-- Check for missing indexes on frequently queried columns
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Check slow queries
SELECT 
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### React Query Optimization
- [ ] **StaleTime configured**: 5 minutes for most queries
- [ ] **GcTime configured**: 10 minutes
- [ ] **RefetchOnWindowFocus disabled**: For stable data
- [ ] **Retry strategy set**: 1 retry for queries, 0 for mutations

---

## 🔒 Security Validation

### RLS Policies
```sql
-- Verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return 0 rows (except maybe public tables)

-- Verify admin policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  definition
FROM pg_policies
WHERE schemaname = 'public'
AND definition LIKE '%admin%';
```

**Critical Tables Checklist:**
- [ ] `recipients` - RLS enabled with admin bypass
- [ ] `gift_cards` - RLS enabled with admin bypass
- [ ] `gift_card_pools` - RLS enabled with proper client access
- [ ] `campaigns` - RLS enabled with client access
- [ ] `error_logs` - RLS enabled (users see own, admins see all)
- [ ] `performance_metrics` - RLS enabled (admins only)
- [ ] `usage_analytics` - RLS enabled (admins only)

### Authentication & Authorization
- [ ] **Password validation**: 8+ chars, upper, lower, number (via `validate_password_strength()`)
- [ ] **Leaked password protection**: ⚠️ **REQUIRES MANUAL ACTION** - Enable in Supabase Dashboard
- [ ] **Session management**: Auto-refresh enabled
- [ ] **Role-based access**: Verified for admin, agency_owner, client_user, call_center
- [ ] **Permission checks**: All protected routes use `ProtectedRoute` or `PermissionGate`

### API Security
- [ ] **No exposed secrets**: All API keys in Supabase secrets
- [ ] **CORS configured**: Edge functions have proper CORS headers
- [ ] **Rate limiting**: Public endpoints have rate limiting (TODO if not implemented)
- [ ] **Input validation**: Edge functions validate all inputs
- [ ] **SQL injection prevention**: Using parameterized queries

### Security Scan
```bash
# Check for vulnerabilities in dependencies
npm audit

# Fix automatically if possible
npm audit fix

# Review high/critical vulnerabilities
npm audit --audit-level=high
```

**Action if vulnerabilities found:**
- [ ] Update vulnerable packages
- [ ] If no fix available, document and assess risk
- [ ] Consider alternative packages

### Code Security Checklist
- [ ] **No console.log in production**: All replaced with `logger` utility
- [ ] **No hardcoded secrets**: Check for API keys in code
- [ ] **No sensitive data in logs**: Review all logger calls
- [ ] **XSS protection**: All user input sanitized
- [ ] **CSRF protection**: Supabase handles this automatically

---

## 🧪 Functionality Testing

### Critical User Flows
- [ ] **User Authentication**
  - [ ] Sign up with email
  - [ ] Sign in with email
  - [ ] Password reset
  - [ ] Sign out

- [ ] **Campaign Creation**
  - [ ] Create new campaign
  - [ ] Upload audience
  - [ ] Select template
  - [ ] Configure gift card rewards
  - [ ] Launch campaign

- [ ] **Gift Card Management**
  - [ ] Create gift card pool
  - [ ] Upload gift cards (CSV)
  - [ ] Assign to campaign
  - [ ] Claim gift card (recipient view)
  - [ ] Track gift card deliveries

- [ ] **Call Center Operations**
  - [ ] View incoming calls
  - [ ] Match caller to recipient
  - [ ] Mark conditions as met
  - [ ] Provision gift card
  - [ ] Send SMS with gift card

- [ ] **Ace Forms**
  - [ ] Create form
  - [ ] Configure fields
  - [ ] Publish form
  - [ ] Submit form (public view)
  - [ ] View submissions

- [ ] **Admin Functions**
  - [ ] User management
  - [ ] Role assignment
  - [ ] Client management
  - [ ] View analytics
  - [ ] Access all data

### Edge Functions Testing
Test critical edge functions:

```bash
# Test handle-purl (public)
curl https://arzthloosvnasokxygfo.supabase.co/functions/v1/handle-purl?token=TEST123

# Test submit-lead-form (public)
curl -X POST https://arzthloosvnasokxygfo.supabase.co/functions/v1/submit-lead-form \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"test","email":"test@example.com"}'

# Check edge function logs
# (View in Lovable Cloud → Backend → Edge Functions → Logs)
```

**Critical Edge Functions Checklist:**
- [ ] `handle-purl` - PURL landing page generation
- [ ] `submit-lead-form` - Lead capture from landing pages
- [ ] `provision-gift-card-from-api` - API gift card provisioning
- [ ] `send-gift-card-sms` - SMS delivery
- [ ] `import-audience` - Bulk recipient import
- [ ] `generate-recipient-tokens` - PURL token generation
- [ ] `redeem-gift-card-embed` - Public gift card redemption

---

## 📊 Monitoring & Observability

### Error Tracking
```sql
-- Check recent errors (last 24 hours)
SELECT 
  error_type,
  COUNT(*) as error_count,
  MAX(occurred_at) as last_occurrence
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY error_count DESC;

-- Check unresolved errors
SELECT 
  error_type,
  error_message,
  COUNT(*) as occurrences
FROM error_logs
WHERE resolved = false
GROUP BY error_type, error_message
ORDER BY occurrences DESC
LIMIT 20;
```

**Action if high error rate:**
- [ ] Investigate top errors
- [ ] Fix critical issues
- [ ] Update error handling
- [ ] Add missing error boundaries

### Performance Monitoring
```sql
-- Check slow operations (last 24 hours)
SELECT 
  metric_type,
  metric_name,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as count
FROM performance_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_type, metric_name
HAVING AVG(duration_ms) > 1000  -- Slower than 1 second
ORDER BY avg_duration DESC;
```

**Action if slow operations:**
- [ ] Optimize slow queries
- [ ] Add caching where appropriate
- [ ] Consider pagination
- [ ] Add database indexes

### Usage Analytics
```sql
-- Check feature usage (last 7 days)
SELECT 
  feature_name,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users
FROM usage_analytics
WHERE occurred_at > NOW() - INTERVAL '7 days'
GROUP BY feature_name
ORDER BY usage_count DESC
LIMIT 20;
```

---

## 📝 Documentation Validation

### Documentation Completeness
- [ ] **README.md**: Up to date with setup instructions
- [ ] **ARCHITECTURE.md**: Reflects current architecture
- [ ] **DEVELOPER_GUIDE.md**: Onboarding guide complete
- [ ] **API_REFERENCE.md**: All edge functions documented
- [ ] **ENVIRONMENT_VARIABLES.md**: All secrets documented
- [ ] **BACKUP_STRATEGY.md**: Recovery procedures documented
- [ ] **PERMISSIONS.md**: Role system documented
- [ ] **DATA_MODEL.md**: Database schema documented

### Code Documentation
- [ ] **Complex functions**: Have JSDoc comments
- [ ] **Edge functions**: Have header comments with purpose/params
- [ ] **Utilities**: Have usage examples
- [ ] **Hooks**: Have parameter descriptions
- [ ] **Components**: Have prop type documentation

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] **All tests passing**: Unit, integration, E2E
- [ ] **No console errors**: Check browser console on all pages
- [ ] **No network errors**: Check Network tab for failed requests
- [ ] **Database migrations**: All applied successfully
- [ ] **Edge functions**: All deployed and tested
- [ ] **Secrets configured**: All required secrets set
- [ ] **Environment variables**: All configured correctly

### Deployment Steps
1. [ ] Create backup of production database
2. [ ] Tag release in git: `git tag v1.x.x`
3. [ ] Deploy frontend: Click "Publish" in Lovable
4. [ ] Verify edge functions deployed automatically
5. [ ] Run smoke tests on production
6. [ ] Monitor error logs for 30 minutes
7. [ ] Check performance metrics
8. [ ] Notify team of successful deployment

### Post-Deployment
- [ ] **Monitor errors**: Check error_logs table
- [ ] **Check performance**: Review performance_metrics
- [ ] **User testing**: Test critical flows manually
- [ ] **Analytics baseline**: Record metrics for comparison

### Rollback Plan (If Issues)
1. [ ] Identify issue severity
2. [ ] If critical: Restore from backup immediately
3. [ ] If non-critical: Create hotfix and redeploy
4. [ ] Document issue and resolution
5. [ ] Update tests to prevent recurrence

---

## ✅ Final Sign-Off

### Team Approval
- [ ] **Technical Lead**: Reviewed and approved
- [ ] **QA Engineer**: All tests passed
- [ ] **Product Owner**: Features validated
- [ ] **Security Officer**: Security scan approved

### Metrics Baseline
Record these metrics for future comparison:

```
Date: _______________
Build Size (gzipped): _______ MB
Lighthouse Score: Performance _____ / Accessibility _____ / Best Practices _____ / SEO _____
Average Page Load: _______ ms
Database Size: _______ MB
Active Users (last 7 days): _______
Error Rate (last 24h): _______ errors/hour
Average API Response Time: _______ ms
```

---

## 📋 Known Issues & Tech Debt

Document any known issues that aren't blocking:

### Known Issues
- [ ] Issue 1: [Description and workaround]
- [ ] Issue 2: [Description and workaround]

### Tech Debt
- [ ] Debt 1: [Description and plan to address]
- [ ] Debt 2: [Description and plan to address]

---

## 🎉 Launch Readiness

**Ready to Launch**: YES / NO

**If NO, what's blocking?**
- [ ] Blocker 1: [Description]
- [ ] Blocker 2: [Description]

**If YES, proceed with deployment!**

---

**Checklist Completed By**: _______________  
**Date**: _______________  
**Next Review Date**: _______________  

**Sign-off**: _______________

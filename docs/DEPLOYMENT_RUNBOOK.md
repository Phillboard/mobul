# Deployment Runbook

Step-by-step deployment process for ACE Engage platform.

---

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] OAuth providers configured
- [ ] Code reviewed and approved
- [ ] Staging environment tested

---

## Deployment Steps

### 1. Prepare for Deployment

```bash
# Pull latest from main
git checkout main
git pull origin main

# Verify clean state
git status

# Check for uncommitted changes
git diff
```

### 2. Run Pre-Deployment Tests

```bash
# TypeScript check
npx tsc --noEmit

# Linter
npm run lint

# Unit tests
npm test

# Build
npm run build
```

All checks must pass before proceeding.

### 3. Database Migrations

```bash
# Check pending migrations
supabase db diff

# Apply migrations (if any)
supabase db push

# Verify migration success
supabase db remote-commit

# Test edge functions locally
supabase functions serve
```

### 4. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy provision-gift-card-unified

# Verify deployment
supabase functions list
```

### 5. Configure Edge Function Secrets

In Supabase Dashboard → Edge Functions → Secrets, ensure all are set:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TILLO_API_KEY`
- `TILLO_SECRET_KEY`
- `SENDGRID_API_KEY`
- `SUPPORT_PHONE_NUMBER`
- `SUPPORT_EMAIL`

### 6. Deploy Frontend

**Vercel Deployment:**

```bash
# Build production bundle
npm run build

# Deploy to Vercel (if using Vercel CLI)
vercel --prod

# Or push to main branch (triggers auto-deploy)
git push origin main
```

**Manual Deployment:**

```bash
# Build
npm run build

# Upload dist/ folder to hosting provider
# - Vercel: Auto-deploys from GitHub
# - Netlify: Drag & drop dist/ folder
# - AWS S3: aws s3 sync dist/ s3://bucket-name
```

### 7. Verify Deployment

**Frontend Health Check:**
1. Navigate to production URL
2. Check login works (email/password)
3. Check OAuth providers (Google/Apple) - if configured
4. Verify dashboard loads
5. Test navigation to key pages

**Backend Health Check:**
1. Navigate to `/system-health`
2. Verify all systems green
3. Check edge functions responding
4. Verify database connections

**API Health Check:**

```bash
# Test edge function
curl https://your-project.supabase.co/functions/v1/validate-environment \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 8. Post-Deployment Verification

Check critical workflows:

- [ ] User can sign in
- [ ] Campaign creation works
- [ ] Contact import works
- [ ] Gift card provisioning works
- [ ] Email/SMS notifications sending
- [ ] Landing pages accessible
- [ ] Analytics tracking

### 9. Enable Monitoring

**Supabase Logs:**
- Auth logs: Authentication → Logs
- Database logs: Database → Logs
- Edge function logs: Edge Functions → Logs

**Application Monitoring:**
- Error tracking in Supabase
- Performance metrics
- User analytics

---

## Rollback Procedure

If deployment fails or issues are discovered:

### 1. Immediate Rollback (Frontend)

**Vercel:**
```bash
# In Vercel Dashboard
# Deployments → Previous deployment → Promote to Production
```

**Manual:**
```bash
# Deploy previous build
git revert HEAD
git push origin main
```

### 2. Database Rollback

```bash
# Identify migration to revert
supabase db remote-commit

# Create down migration
# Edit the migration file to add down migration
supabase db push --dry-run

# Apply rollback (carefully!)
supabase db reset --db-url "postgresql://..."
```

**WARNING:** Database rollbacks can cause data loss. Always backup first.

### 3. Edge Function Rollback

```bash
# Redeploy previous version
git checkout <previous-commit>
supabase functions deploy <function-name>
git checkout main
```

---

## Environment-Specific Deployment

### Development

```bash
# Use development Supabase project
# .env.local with dev credentials
npm run dev
```

### Staging

```bash
# Use staging Supabase project
# .env.staging with staging credentials
npm run build
# Deploy to staging.aceengage.com
```

### Production

```bash
# Use production Supabase project
# .env.production with prod credentials
npm run build
# Deploy to app.aceengage.com
```

---

## Database Seeding (First-Time Setup)

```bash
# Seed documentation
supabase functions invoke seed-documentation

# Create default organizations (if needed)
# Run SQL scripts in supabase/migrations/
```

---

## Common Deployment Issues

### Build Fails

**Error:** "Module not found" or import errors
- Check `package.json` dependencies
- Run `npm install`
- Clear cache: `rm -rf node_modules package-lock.json && npm install`

**Error:** TypeScript errors
- Run `npx tsc --noEmit` for details
- Fix type errors before deploying

### Edge Functions Fail

**Error:** "Missing environment variable"
- Check Supabase Dashboard → Edge Functions → Secrets
- Ensure all required secrets are set

**Error:** "CORS error"
- Verify CORS headers in function
- Check `_shared/cors.ts` is imported

### Frontend Shows Errors

**Error:** "Failed to fetch"
- Check Supabase URL and anon key
- Verify edge functions are deployed
- Check browser console for details

**Error:** OAuth redirect fails
- Verify OAuth providers configured in Supabase
- Check callback URLs match
- See `docs/OAUTH_SETUP.md`

---

## Performance Optimization

### Before Major Releases

1. Run Lighthouse audit
2. Check bundle size: `npm run build -- --analyze`
3. Optimize images in `/public`
4. Enable CDN for static assets
5. Configure caching headers

### Database Performance

```sql
-- Check for missing indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Check query performance
EXPLAIN ANALYZE SELECT ...;
```

---

## Security Hardening

### Pre-Launch Security Checklist

- [ ] All API keys in environment (not code)
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Edge functions use service role key (not anon key)
- [ ] CORS properly configured
- [ ] Rate limiting enabled on public endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] CSRF protection (for forms)

### Post-Launch Security

- [ ] Enable Supabase Vault for secrets
- [ ] Set up intrusion detection
- [ ] Configure backup strategy
- [ ] Enable audit logging
- [ ] Set up security alerts

---

## Maintenance Windows

**Recommended maintenance schedule:**
- Weekly: Review logs, check for errors
- Monthly: Dependency updates, security patches
- Quarterly: Performance review, optimization
- Annually: Major version upgrades, architecture review

---

## Emergency Contacts

**Platform Team:**
- Engineering Lead: [email]
- DevOps: [email]
- On-Call: [phone]

**External Services:**
- Supabase Support: support@supabase.com
- Twilio Support: 1-888-843-9377
- Tillo Support: [contact from Tillo]

---

## Deployment History Log

| Date | Version | Deployed By | Notes |
|------|---------|-------------|-------|
| 2024-12-09 | v1.0.0 | Platform Team | Initial launch with OAuth & AI designer |
| | | | |

---

**Last Updated**: December 2024  
**Maintainer**: Platform Engineering Team


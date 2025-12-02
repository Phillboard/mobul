# Deployment Checklist

## Pre-Deployment

### Database Verification
- [ ] Run `scripts/sql/migration-verification.sql` in Supabase SQL Editor
- [ ] Verify all critical tables exist
- [ ] Verify all critical functions exist
- [ ] Verify RLS is enabled on all tables
- [ ] Document current migration state

### Backup
- [ ] Create manual backup in Supabase Dashboard
- [ ] Download backup file to secure location
- [ ] Verify backup file integrity
- [ ] Document backup timestamp

### Migration Review
- [ ] Review list of pending migrations
- [ ] Identify dependencies between migrations
- [ ] Check for DROP statements
- [ ] Prepare rollback scripts for each migration

## Migration Execution

For each migration:

### Pre-Execution
- [ ] Create backup point
- [ ] Read migration file completely
- [ ] Identify affected tables/functions
- [ ] Prepare rollback script
- [ ] Test in development if possible

### Execution
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy migration content
- [ ] Review one final time
- [ ] Execute migration
- [ ] Check for errors
- [ ] Document execution time

### Post-Execution
- [ ] Verify tables created (if applicable)
- [ ] Verify functions created (if applicable)
- [ ] Verify indexes created (if applicable)
- [ ] Check RLS policies applied (if applicable)
- [ ] Restart local dev server
- [ ] Test affected features
- [ ] Monitor for errors

## Edge Function Deployment

### Pre-Deployment
- [ ] List current functions: `supabase functions list`
- [ ] Check recent logs: `supabase functions logs --tail`
- [ ] Verify environment variables are set
- [ ] Test functions locally if possible

### Deployment
- [ ] Run: `.\run-deployment-pipeline.ps1`
- [ ] Monitor deployment progress
- [ ] Check for deployment errors
- [ ] Verify all functions deployed

### Post-Deployment Testing
- [ ] Test critical functions manually
- [ ] Check function logs for errors
- [ ] Verify webhook endpoints respond
- [ ] Test authentication flows
- [ ] Test form submissions
- [ ] Test SMS sending
- [ ] Test email delivery

## Monitoring Setup

- [ ] Configure ALERT_EMAIL_RECIPIENTS environment variable
- [ ] Configure ALERT_SLACK_WEBHOOK_URL (optional)
- [ ] Test alert delivery
- [ ] Verify error logging works
- [ ] Check SystemHealth page displays data

## Post-Deployment

- [ ] Monitor error dashboard for 1 hour
- [ ] Check performance metrics
- [ ] Verify no regressions in existing features
- [ ] Update deployment documentation
- [ ] Notify team of completion

## Rollback Procedure (if needed)

- [ ] Stop accepting new traffic (if critical)
- [ ] Execute rollback SQL scripts in reverse order
- [ ] Redeploy previous edge function versions
- [ ] Verify system functionality
- [ ] Document incident
- [ ] Schedule post-mortem



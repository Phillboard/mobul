# Incident Response Playbook

## Overview

This playbook defines procedures for responding to production incidents for the ACE Engage platform.

---

## Severity Levels

### P0 - Critical (Complete Outage)

**Response Time**: Immediate  
**Impact**: Complete service unavailability  
**Examples**:
- Database completely down
- All edge functions failing
- Cannot access application
- Data breach detected

**Actions**:
1. Page on-call engineer immediately
2. Create incident channel: `#incident-YYYY-MM-DD-HH-MM`
3. Declare P0 incident in channel
4. Check Supabase status page
5. Review recent deployments
6. Notify stakeholders
7. Consider immediate rollback
8. Provide updates every 15 minutes

---

### P1 - High (Major Feature Down)

**Response Time**: 30 minutes  
**Impact**: Major feature unavailable or severely degraded  
**Examples**:
- SMS delivery completely failing
- Campaign creation broken
- Authentication not working
- Payment processing down

**Actions**:
1. Notify engineering team in Slack
2. Create incident channel: `#incident-P1-DESCRIPTION`
3. Check error logs
4. Identify affected users
5. Implement workaround if possible
6. Provide updates every 30 minutes

---

### P2 - Medium (Degraded Performance)

**Response Time**: 2 hours  
**Impact**: Service degraded but functional  
**Examples**:
- Slow query performance
- Intermittent failures
- Non-critical feature broken
- High error rate (<50% requests)

**Actions**:
1. Monitor metrics closely
2. Investigate root cause
3. Schedule fix within business hours
4. Notify affected users if significant

---

### P3 - Low (Minor Issue)

**Response Time**: Next business day  
**Impact**: Minor inconvenience  
**Examples**:
- UI bugs
- Non-critical features
- Typos or display issues

**Actions**:
1. Create bug ticket
2. Add to backlog
3. Prioritize in next sprint planning

---

## Incident Response Flow

### Phase 1: Detection & Triage (0-5 minutes)

**Detection Methods**:
- Automated monitoring alerts
- Error spike in logs
- User reports
- Team member discovery

**Immediate Actions**:
```
1. Acknowledge incident
2. Assess severity (P0/P1/P2/P3)
3. Create incident channel
4. Page appropriate team members
```

**Triage Questions**:
- What is not working?
- How many users are affected?
- Is data at risk?
- When did it start?
- What changed recently?

---

### Phase 2: Investigation (5-30 minutes)

**Check These First**:

1. **Supabase Status**
   ```
   https://status.supabase.com
   ```

2. **Error Logs**
   ```sql
   SELECT error_type, error_message, COUNT(*) as count
   FROM error_logs
   WHERE occurred_at > NOW() - INTERVAL '1 hour'
   GROUP BY error_type, error_message
   ORDER BY count DESC
   LIMIT 10;
   ```

3. **Function Logs**
   ```bash
   supabase functions logs --tail
   ```

4. **Recent Deployments**
   ```bash
   git log --oneline -10
   ```

5. **Database Health**
   ```sql
   SELECT 
     COUNT(*) as active_connections,
     SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as running_queries
   FROM pg_stat_activity;
   ```

**Investigation Checklist**:
- [ ] Check recent code deployments
- [ ] Check recent database migrations
- [ ] Check environment variable changes
- [ ] Check external service status (Twilio, etc.)
- [ ] Check rate limits
- [ ] Check disk space / database size
- [ ] Review performance metrics

---

### Phase 3: Mitigation (varies by severity)

**Quick Mitigation Options**:

1. **Rollback Deployment**
   ```bash
   git revert <COMMIT_HASH>
   git push
   # Trigger redeployment
   ```

2. **Rollback Edge Function**
   ```bash
   git checkout <PREVIOUS_COMMIT>
   supabase functions deploy FUNCTION_NAME
   ```

3. **Rollback Migration**
   ```sql
   -- Run rollback script from scripts/sql/rollbacks/
   ```

4. **Disable Feature**
   ```sql
   UPDATE campaigns SET status = 'paused' WHERE id = 'PROBLEMATIC_CAMPAIGN';
   ```

5. **Scale Resources** (if performance issue)
   ```
   - Upgrade database tier in Supabase
   - Increase edge function concurrency
   ```

**Mitigation Decision Tree**:
```
Is it a recent deployment? 
├─ YES → Rollback deployment
└─ NO → Continue investigating

Is it affecting all users?
├─ YES → Check platform status
└─ NO → Check user-specific data

Is error rate increasing?
├─ YES → Implement circuit breaker
└─ NO → Continue monitoring
```

---

### Phase 4: Recovery & Verification (ongoing)

**Verification Checklist**:
- [ ] Error rate returned to normal
- [ ] Key features tested and working
- [ ] Performance metrics within acceptable range
- [ ] No new errors appearing
- [ ] User feedback positive
- [ ] Monitoring shows stability

**Recovery Steps**:
1. Verify fix in non-production environment
2. Deploy fix to production
3. Monitor closely for 30 minutes
4. Test critical user flows
5. Check error logs
6. Verify metrics dashboard

**When to declare resolved**:
- Error rate < 1% for 30 minutes
- All critical features verified working
- No new related incidents
- Stakeholders notified of resolution

---

### Phase 5: Post-Incident Review (within 48 hours)

**Required Documentation**:

1. **Incident Timeline**
   ```
   - Detection time
   - Triage time
   - Mitigation start time
   - Resolution time
   - Total duration
   ```

2. **Impact Assessment**
   ```
   - Users affected
   - Revenue impact
   - Data loss (if any)
   - Reputation impact
   ```

3. **Root Cause Analysis**
   ```
   - What happened?
   - Why did it happen?
   - How did we detect it?
   - How did we fix it?
   ```

4. **Action Items**
   ```
   - What went well?
   - What could be improved?
   - Specific improvements to implement
   - Timeline for each improvement
   ```

**Post-Incident Meeting Agenda**:
1. Review timeline (5 min)
2. Discuss root cause (10 min)
3. Review response effectiveness (10 min)
4. Identify improvements (15 min)
5. Assign action items (5 min)
6. Set follow-up date (5 min)

---

## Communication Templates

### Internal - Incident Declaration (P0)

```
🚨 P0 INCIDENT DECLARED 🚨

Incident: [BRIEF_DESCRIPTION]
Severity: P0 - Critical
Impact: [USER_IMPACT]
Start Time: [TIMESTAMP]
Incident Lead: @[NAME]

Current Status: Investigating
Next Update: [TIME] (15 minutes)

Incident Channel: #incident-YYYY-MM-DD-HH-MM

DO NOT DEPLOY anything until all-clear given.
```

### Internal - Status Update

```
📊 INCIDENT UPDATE

Incident: [DESCRIPTION]
Time Elapsed: [DURATION]

Progress:
✅ [COMPLETED_ACTIONS]
🔄 [IN_PROGRESS_ACTIONS]
⏳ [PLANNED_ACTIONS]

Current Theory: [ROOT_CAUSE_THEORY]
ETA to Resolution: [ESTIMATE]

Next Update: [TIME]
```

### Internal - Resolution

```
✅ INCIDENT RESOLVED

Incident: [DESCRIPTION]
Duration: [TOTAL_TIME]
Resolution: [WHAT_WAS_DONE]

Impact:
- Users Affected: [COUNT]
- Services Affected: [LIST]
- Data Loss: [NONE/DETAILS]

Post-Incident Review: [DATE/TIME]
All-clear: Deployments may resume

Thank you to everyone who helped resolve this! 🙏
```

### Customer - P0 Notification

```
Subject: Service Disruption - [FEATURE] Temporarily Unavailable

We're currently experiencing an issue affecting [FEATURE]. 

What's affected: [DESCRIPTION]
Current status: Our team is investigating
Updates: We'll provide updates every 30 minutes

We sincerely apologize for the inconvenience. You can check 
our status page for real-time updates: [STATUS_PAGE_LINK]

- The ACE Engage Team
```

### Customer - Resolution Notification

```
Subject: Service Restored - [FEATURE] Back to Normal

The issue affecting [FEATURE] has been resolved.

Issue duration: [DURATION]
Affected services: [LIST]
Resolution: [BRIEF_DESCRIPTION]

Everything is now operating normally. If you continue to 
experience issues, please contact support.

Thank you for your patience.

- The ACE Engage Team
```

---

## Incident Escalation

### When to Escalate

- Incident not resolved within expected timeframe
- Severity increases (P2 → P1 → P0)
- Data breach suspected
- Legal or compliance implications
- Media attention likely

### Escalation Path

```
Level 1: On-call Engineer
  ↓ (if unresolved in 30 min)
Level 2: Engineering Lead
  ↓ (if P0 or unresolved in 1 hour)
Level 3: CTO / VP Engineering
  ↓ (if data breach or major outage)
Level 4: CEO / Executive Team
```

---

## Runbook: Common Incidents

### Database Connection Errors

**Symptoms**: Cannot connect to database

**Quick Checks**:
```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Check Supabase dashboard
# Check connection pool usage
```

**Solutions**:
1. Check connection string environment variables
2. Verify database is not paused (Supabase free tier)
3. Check connection pool limits
4. Review recent database migrations
5. Check Supabase status page

---

### Edge Function Timeouts

**Symptoms**: Functions timing out, 504 errors

**Quick Checks**:
```bash
# Check function logs
supabase functions logs FUNCTION_NAME --tail

# Check function execution time
```

**Solutions**:
1. Optimize slow queries in function
2. Add caching for expensive operations
3. Increase function timeout limit
4. Break into smaller functions
5. Add database indexes

---

### High Error Rate

**Symptoms**: Error logs showing many errors

**Quick Checks**:
```sql
-- Top errors in last hour
SELECT error_type, error_message, COUNT(*) 
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '1 hour'
GROUP BY error_type, error_message
ORDER BY COUNT(*) DESC;
```

**Solutions**:
1. Identify most common error
2. Check if recent deployment caused it
3. Roll back if deployment-related
4. Add error handling if missing
5. Fix root cause

---

### SMS Delivery Failures

**Symptoms**: SMS not being delivered

**Quick Checks**:
```sql
-- Check recent SMS delivery failures
SELECT phone_number, error_message, COUNT(*)
FROM sms_delivery_log
WHERE delivery_status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone_number, error_message;
```

**Solutions**:
1. Check Twilio account status
2. Verify Twilio credentials
3. Check account balance
4. Verify phone number format
5. Check rate limits
6. Review error messages from Twilio

---

## Tools & Resources

### Monitoring Dashboards

- **System Health**: `/admin/system-health`
- **Error Logs**: Supabase Dashboard → Database → error_logs table
- **Function Logs**: Supabase Dashboard → Edge Functions → Logs
- **Supabase Status**: https://status.supabase.com

### Useful Commands

```bash
# Check git history
git log --oneline --since="2 hours ago"

# View recent deployments
git log --grep="deploy" --oneline -10

# Check database size
# (run in Supabase SQL Editor)
SELECT pg_size_pretty(pg_database_size(current_database()));

# List all running functions
supabase functions list

# Tail function logs
supabase functions logs FUNCTION_NAME --tail --since=1h
```

### Contact Information

**Engineering Team**:
- Slack: #engineering
- On-call rotation: PagerDuty

**Infrastructure**:
- Supabase Support: support@supabase.io
- Supabase Dashboard: https://app.supabase.com

**External Services**:
- Twilio Support: https://www.twilio.com/console
- AWS Support: https://console.aws.amazon.com/support/

---

## Appendix: Incident Log Template

```markdown
# Incident Report: [INCIDENT_TITLE]

**Incident ID**: INC-YYYY-MM-DD-###  
**Severity**: [P0/P1/P2/P3]  
**Status**: [Open/Investigating/Mitigating/Resolved/Closed]  
**Incident Lead**: [NAME]  
**Start Time**: [TIMESTAMP]  
**End Time**: [TIMESTAMP]  
**Duration**: [HH:MM]

## Summary
[Brief description of what happened]

## Impact
- **Users Affected**: [NUMBER or PERCENTAGE]
- **Services Affected**: [LIST]
- **Revenue Impact**: [$ AMOUNT or NONE]
- **Data Loss**: [YES/NO - DETAILS]

## Timeline
- [HH:MM] - Incident detected
- [HH:MM] - Investigation started
- [HH:MM] - Root cause identified
- [HH:MM] - Mitigation deployed
- [HH:MM] - Incident resolved

## Root Cause
[Detailed explanation of what caused the incident]

## Resolution
[What was done to fix the issue]

## Action Items
- [ ] [ACTION ITEM 1] - Owner: [NAME] - Due: [DATE]
- [ ] [ACTION ITEM 2] - Owner: [NAME] - Due: [DATE]

## Lessons Learned
**What Went Well**:
- [ITEM 1]
- [ITEM 2]

**What Could Be Improved**:
- [ITEM 1]
- [ITEM 2]

## References
- Incident Channel: #incident-YYYY-MM-DD
- Related Tickets: [LINKS]
- Monitoring Dashboards: [LINKS]
```

---

**Last Updated**: December 2024  
**Next Review**: March 2025  
**Owner**: DevOps Team



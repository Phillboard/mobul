# Gift Card Redemption System - Operations Runbook

## Quick Reference

### Emergency Contacts
- **Tech Support Lead:** [Name] - [Phone]
- **Database Admin:** [Name] - [Phone]
- **Twilio Support:** 1-888-XXX-XXXX
- **On-Call Engineer:** [Rotation Schedule]

### Critical Links
- **Supabase Dashboard:** https://supabase.com/dashboard/project/arzthloosvnasokxygfo
- **Twilio Console:** https://console.twilio.com
- **Error Logs:** [Link to monitoring dashboard]
- **System Alerts:** [Link to Slack channel]

---

## Common Issues & Solutions

### Issue 1: "Pool Empty" - Customer Can't Redeem

**Symptoms:**
- Customer reports "out of cards" error
- Red "Empty" badge on inventory widget
- Critical alert received

**Diagnosis:**
```sql
-- Check pool status
SELECT 
  id,
  pool_name,
  available_cards,
  total_cards,
  purchase_method,
  api_provider
FROM gift_card_pools
WHERE id = '[POOL_ID]';
```

**Solution:**

**Option A: Upload More Cards (CSV)**
1. Navigate to Gift Cards → Pools
2. Click pool name → "Upload Cards"
3. Upload CSV with new cards
4. Verify import successful
5. Check `available_cards` increased

**Option B: API Fallback (if configured)**
1. Verify `purchase_method` = 'csv_with_fallback'
2. Check `api_provider` is set
3. Next redemption will auto-provision from API
4. Monitor for successful API call

**Option C: Emergency Manual Provision**
```sql
-- Manually add cards to pool
INSERT INTO gift_cards (
  pool_id,
  card_code,
  card_number,
  status
) VALUES
  ('[POOL_ID]', 'TEMP-0001', '1234567890123456', 'available'),
  ('[POOL_ID]', 'TEMP-0002', '1234567890123457', 'available');

-- Update pool counts
UPDATE gift_card_pools
SET 
  available_cards = available_cards + 2,
  total_cards = total_cards + 2
WHERE id = '[POOL_ID]';
```

**Prevention:**
- Set up alerts for low stock (20 cards)
- Configure automatic API fallback
- Monitor inventory daily

---

### Issue 2: SMS Not Delivered

**Symptoms:**
- Customer reports not receiving SMS
- `sms_delivery_log` shows "failed" status
- Retry attempts exhausted (retry_count = 3)

**Diagnosis:**
```sql
-- Check SMS delivery attempts
SELECT 
  id,
  phone_number,
  delivery_status,
  retry_count,
  error_message,
  created_at,
  last_retry_at
FROM sms_delivery_log
WHERE gift_card_id = '[CARD_ID]'
ORDER BY created_at DESC;
```

**Solution:**

**Step 1: Verify Phone Number**
```sql
SELECT phone FROM recipients WHERE id = '[RECIPIENT_ID]';
```
- Is it valid format? (E.164: +1XXXXXXXXXX)
- Is it a real number? (not 555-1234)

**Step 2: Check Twilio Status**
1. Log into Twilio Console
2. Search for recipient's phone number
3. Check message status and error code

**Common Twilio Errors:**
- `30007`: Message filtered (spam)
- `30008`: Unknown destination handset
- `21211`: Invalid 'To' phone number
- `21608`: Number unverified (sandbox mode)

**Step 3: Manual Resend**
Option A: Via UI
1. Agent clicks "Resend SMS" button on redemption panel
2. Verify new attempt logged

Option B: Via Email Fallback
```sql
-- Get recipient email
SELECT email FROM recipients WHERE id = '[RECIPIENT_ID]';

-- Send email manually with card details
-- (Use email template or send via support@)
```

**Step 4: Update Card Delivery**
```sql
-- Mark as manually delivered
UPDATE gift_card_deliveries
SET 
  sms_status = 'manually_delivered',
  sms_sent_at = NOW()
WHERE id = '[DELIVERY_ID]';
```

**Prevention:**
- Validate phone numbers during upload
- Monitor Twilio error rate
- Have email fallback ready

---

### Issue 3: "Too Many Attempts" Error

**Symptoms:**
- User gets "Too many attempts" error
- Returns 429 status code
- Legitimate user blocked

**Diagnosis:**
```sql
-- Check rate limit history
SELECT 
  identifier,
  action,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempt
FROM rate_limit_tracking
WHERE identifier = '[IP_ADDRESS]'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier, action;
```

**Solution:**

**Step 1: Verify Legitimate User**
- Check if attempts are from known customer IP
- Verify attempts are valid redemption codes
- Not brute force attack

**Step 2: Manual Override (if legitimate)**
```sql
-- Clear rate limit for specific IP
DELETE FROM rate_limit_tracking
WHERE identifier = '[IP_ADDRESS]'
AND created_at > NOW() - INTERVAL '1 hour';
```

**Step 3: Whitelist IP (if needed)**
```sql
-- Add to whitelist (if such table exists)
-- Or adjust rate limit specifically for this IP
```

**Prevention:**
- Educate users about attempt limits
- Consider IP whitelist for call center
- Monitor for false positives

---

### Issue 4: Card Stuck in "Claimed" Status

**Symptoms:**
- Card shows status = 'claimed'
- But no delivery record
- Inventory not returning to pool

**Diagnosis:**
```sql
-- Find stuck cards
SELECT 
  gc.id,
  gc.card_code,
  gc.status,
  gc.claimed_at,
  gc.claimed_by_recipient_id,
  sdl.delivery_status
FROM gift_cards gc
LEFT JOIN sms_delivery_log sdl ON gc.id = sdl.gift_card_id
WHERE gc.status = 'claimed'
AND gc.claimed_at < NOW() - INTERVAL '15 minutes'
AND (sdl.delivery_status IS NULL OR sdl.delivery_status NOT IN ('sent', 'delivered'));
```

**Solution:**

**Automatic (Should Run Every 10 Min):**
- Cleanup cron job handles this automatically
- Check if cron is running:
```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-stuck-cards-every-10min';
```

**Manual Fix (if needed immediately):**
```sql
-- Release stuck card back to pool
UPDATE gift_cards
SET 
  status = 'available',
  claimed_at = NULL,
  claimed_by_recipient_id = NULL
WHERE id = '[STUCK_CARD_ID]';

-- Update pool inventory
UPDATE gift_card_pools
SET 
  available_cards = available_cards + 1,
  claimed_cards = claimed_cards - 1
WHERE id = (SELECT pool_id FROM gift_cards WHERE id = '[STUCK_CARD_ID]');
```

**Prevention:**
- Ensure cleanup cron job is running
- Monitor stuck card count daily
- Alert if >5 cards stuck

---

### Issue 5: Duplicate Card Claims

**Symptoms:**
- Same card claimed twice
- Two recipients have same card_code
- Pool inventory count incorrect

**Diagnosis:**
```sql
-- Find duplicate claims
SELECT 
  card_code,
  COUNT(*) as claim_count,
  ARRAY_AGG(claimed_by_recipient_id) as recipients
FROM gift_cards
WHERE status = 'claimed'
GROUP BY card_code
HAVING COUNT(*) > 1;
```

**Solution:**

**Step 1: Determine Valid Claim**
```sql
-- Check which claim happened first
SELECT 
  gc.id,
  gc.card_code,
  gc.claimed_at,
  gc.claimed_by_recipient_id,
  r.first_name,
  r.last_name,
  r.phone
FROM gift_cards gc
JOIN recipients r ON r.id = gc.claimed_by_recipient_id
WHERE gc.card_code = '[DUPLICATE_CODE]'
ORDER BY gc.claimed_at;
```

**Step 2: Contact Second Recipient**
- Call recipient #2
- Apologize for issue
- Provision new card immediately
- Document incident

**Step 3: Fix Database**
```sql
-- Release second (invalid) claim
UPDATE gift_cards
SET 
  status = 'available',
  claimed_at = NULL,
  claimed_by_recipient_id = NULL
WHERE id = '[SECOND_CLAIM_ID]';

-- Provision new card for affected recipient
-- (Use normal redemption flow)
```

**Root Cause Analysis:**
- This should NEVER happen due to SKIP LOCKED
- If it does, investigate database transaction logs
- Check for application-level race condition
- Review recent code changes

---

### Issue 6: System Performance Degradation

**Symptoms:**
- Redemptions taking >5 seconds
- Timeouts occurring
- Database slow query alerts

**Diagnosis:**
```sql
-- Check active queries
SELECT 
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Check table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solution:**

**Step 1: Kill Long-Running Queries**
```sql
-- Cancel query (soft)
SELECT pg_cancel_backend([PID]);

-- Terminate connection (hard, if needed)
SELECT pg_terminate_backend([PID]);
```

**Step 2: Check Indexes**
```sql
-- Verify indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('gift_cards', 'recipients', 'gift_card_pools', 'sms_delivery_log');
```

**Step 3: Optimize Queries**
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM gift_cards
WHERE pool_id = '[POOL_ID]'
AND status = 'available'
LIMIT 1;
```

**Step 4: Upgrade Instance (if needed)**
1. Go to Settings → Cloud → Advanced
2. Upgrade instance size
3. Wait 10 minutes for upgrade
4. Monitor performance improvement

**Prevention:**
- Run VACUUM ANALYZE weekly
- Monitor database size and connections
- Set up performance alerts
- Index frequently queried columns

---

## Monitoring & Alerts

### Daily Health Checks
```sql
-- 1. Check SMS delivery rate (last 24 hours)
SELECT 
  delivery_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM sms_delivery_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY delivery_status;
-- Target: >98% 'sent' or 'delivered'

-- 2. Check for stuck cards
SELECT COUNT(*) as stuck_card_count
FROM gift_cards
WHERE status = 'claimed'
AND claimed_at < NOW() - INTERVAL '15 minutes'
AND id NOT IN (
  SELECT gift_card_id FROM sms_delivery_log 
  WHERE delivery_status IN ('sent', 'delivered')
);
-- Target: 0

-- 3. Check pool inventory levels
SELECT 
  pool_name,
  available_cards,
  low_stock_threshold,
  CASE
    WHEN available_cards = 0 THEN 'CRITICAL'
    WHEN available_cards <= low_stock_threshold THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM gift_card_pools
WHERE available_cards <= low_stock_threshold
ORDER BY available_cards;

-- 4. Check error rate
SELECT 
  error_type,
  COUNT(*) as error_count
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY error_count DESC;
-- Investigate if any single error_type > 10
```

### Cron Job Health Check
```sql
-- Verify cron jobs running
SELECT 
  jobname,
  schedule,
  last_run,
  next_run,
  active
FROM cron.job
WHERE jobname LIKE '%gift%' OR jobname LIKE '%sms%';

-- Check recent job execution
SELECT 
  jobname,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '1 hour'
ORDER BY start_time DESC;
```

---

## Escalation Procedures

### Severity Levels

**P0 - Critical (Respond immediately)**
- All redemptions failing
- Database down
- No cards available across ALL pools
- Estimated revenue impact: >$10K/hour

**P1 - High (Respond within 30 min)**
- Single pool empty (customers affected)
- SMS delivery rate <80%
- Performance degradation (>5s response time)
- Estimated revenue impact: $1K-$10K/hour

**P2 - Medium (Respond within 2 hours)**
- Non-critical errors
- Single customer issue
- Minor UI bugs
- Estimated revenue impact: <$1K/hour

**P3 - Low (Respond within 24 hours)**
- Feature requests
- Cosmetic issues
- Documentation updates

### Escalation Contacts
1. **On-Call Engineer** → Handles P0/P1
2. **Tech Lead** → Escalate if >1 hour unresolved
3. **CTO** → Escalate if >4 hours unresolved or widespread impact

---

## Rollback Procedures

### If New Code Causes Issues

**Step 1: Identify Bad Deploy**
- Check recent deployments (Git commits)
- Review error logs for new error types
- Compare metrics before/after deploy

**Step 2: Disable Problematic Feature**
```sql
-- Example: Disable SMS retry if causing issues
UPDATE cron.job
SET active = false
WHERE jobname = 'retry-failed-sms-every-5min';
```

**Step 3: Rollback Code (if needed)**
1. Revert to previous Git commit
2. Redeploy via Lovable
3. Verify system stability

**Step 4: Communicate**
- Notify team in Slack
- Update status page
- Document incident

---

## Post-Incident Review

After any P0/P1 incident, complete this template:

**Incident Report Template:**
```
Incident ID: INC-YYYYMMDD-###
Severity: [P0/P1/P2]
Date/Time: [Start] to [End]
Duration: [X hours Y minutes]

Summary:
[Brief description of what happened]

Impact:
- Customers Affected: [Number]
- Revenue Impact: [$Amount]
- Reputation Impact: [Low/Medium/High]

Root Cause:
[What caused the issue]

Resolution:
[How it was fixed]

Action Items:
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
- [ ] [Process improvement]

Lessons Learned:
[What we learned]
```

---

## Emergency Hotline Script

**For Call Center Agents:**

> "Thank you for calling [Company Name] Gift Card Support. I understand you're having trouble redeeming your gift card. Let me help you with that.
>
> [Pause for customer to explain]
>
> I see. Let me look up your code right now. Can you please spell out the code for me?
>
> [Enter code in system]
>
> **If code works:**
> Great news! I've found your gift card. You have a [Brand] gift card worth $[Amount]. I'm texting the details to your phone at [Number] right now. You should receive it within 30 seconds. Did you get it?
>
> **If pool empty:**
> I apologize, but we're temporarily experiencing high demand. Your gift card is definitely valid, and I've escalated this to our supervisor. You should expect a call back within 30 minutes with your card details. Can I confirm the best number to reach you at?
>
> **If code invalid:**
> I'm having trouble locating that code in our system. Let me verify - you said [repeat code]. Is that correct? Could you also confirm where you received this code from? [Check if typo or expired campaign]
>
> Is there anything else I can help you with today?"

---

## Backup Contacts

**Vendor Support:**
- **Twilio:** support@twilio.com | 1-888-XXX-XXXX
- **Supabase:** support@supabase.com
- **Lovable:** support@lovable.dev

**Internal Teams:**
- **Engineering:** #eng-alerts (Slack)
- **Customer Support:** #support (Slack)
- **Management:** #leadership (Slack)

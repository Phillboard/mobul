# Common Errors Reference

## Overview

Quick reference for the most common errors across the platform and their solutions.

---

## Database Errors

### Error: "relation does not exist"

**Example:** `relation "campaign_reward_configs" does not exist`

**Cause:** Code references old table name or migration not applied

**Solution:**
```bash
# Apply all migrations
supabase db push

# Or check migration status
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

### Error: "function does not exist"

**Example:** `function claim_gift_card_from_inventory() does not exist`

**Cause:** Database function not created (migration not applied)

**Solution:**
```bash
# Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%gift_card%';

# Apply migrations
supabase db push
```

### Error: "permission denied for table"

**Cause:** RLS policy blocking access

**Solution:**
```sql
-- Check user's role
SELECT role FROM user_roles WHERE user_id = auth.uid();

-- Check table policies
SELECT * FROM pg_policies WHERE tablename = 'TABLE_NAME';

-- Test specific access
SELECT * FROM TABLE_NAME LIMIT 1;
-- If returns 0 rows, RLS is blocking
```

---

## Authentication Errors

### Error: "JWT expired"

**Cause:** User session timed out

**Solution:**
- Refresh the page
- Log out and log back in
- Check session timeout settings

### Error: "Invalid JWT"

**Cause:** Token malformed or signature invalid

**Solution:**
1. Clear browser cache and cookies
2. Log out completely
3. Log back in
4. If persists, check Supabase auth configuration

### Error: "User not found"

**Cause:** User deleted or never created

**Solution:**
```sql
-- Check if user exists
SELECT id, email, deleted_at
FROM auth.users
WHERE email = 'user@example.com';

-- If deleted_at is set, user was deleted
```

---

## API Errors

### Error: "Failed to fetch"

**Cause:** Network issue or CORS problem

**Solution:**
1. Check browser console for CORS errors
2. Verify Supabase URL is correct
3. Check internet connection
4. Verify edge function is deployed
5. Check function logs for crashes

### Error: "504 Gateway Timeout"

**Cause:** Function execution exceeded timeout (60 seconds)

**Solution:**
1. Check function logs for slow queries
2. Optimize database queries
3. Add caching
4. Break into smaller operations

### Error: "429 Too Many Requests"

**Cause:** Rate limit exceeded

**Solution:**
- Wait before retrying
- Implement exponential backoff
- Check if rate limits need adjustment
- Cache repeated requests

---

## Edge Function Errors

### Error: "Environment variable not found"

**Example:** `TWILIO_ACCOUNT_SID environment variable is required`

**Solution:**
1. Go to Supabase Dashboard
2. Settings → Edge Functions → Secrets
3. Add the missing variable
4. Redeploy the function if needed

### Error: "Import not found"

**Cause:** Missing npm dependency or incorrect import path

**Solution:**
```typescript
// Use npm: prefix for external packages
import { createClient } from 'npm:@supabase/supabase-js@2';

// Use relative paths for shared code
import { corsHeaders } from '../_shared/cors.ts';
```

### Error: "Function not found"

**Cause:** Function not deployed or name mismatch

**Solution:**
```bash
# List deployed functions
supabase functions list

# Deploy missing function
supabase functions deploy FUNCTION_NAME
```

---

## Frontend Errors

### Error: "Cannot read property of undefined"

**Cause:** Null/undefined value not handled

**Common Pattern:**
```typescript
// Bad
const value = data.campaign.client.name; // Crashes if client is null

// Good
const value = data?.campaign?.client?.name ?? 'Unknown';
```

### Error: "Hydration mismatch"

**Cause:** Server and client render differently

**Solution:**
- Use `useEffect` for client-only code
- Check for `window` availability
- Ensure consistent data structure

### Error: "Too many re-renders"

**Cause:** Infinite render loop (usually in `useEffect`)

**Solution:**
```typescript
// Bad
useEffect(() => {
  setState(someValue); // Re-renders infinitely
});

// Good
useEffect(() => {
  setState(someValue);
}, [dependency]); // Only runs when dependency changes
```

---

## Performance Issues

### Issue: Page loads slowly

**Diagnostic:**
1. Open browser DevTools → Network tab
2. Check for slow queries (> 2 seconds)
3. Look for unnecessary requests
4. Check for large payloads

**Solutions:**
- Add database indexes
- Implement pagination
- Use React Query caching
- Lazy load components
- Optimize images

### Issue: High memory usage

**Cause:** Memory leak or large data sets

**Solution:**
- Implement virtualization for long lists
- Clean up subscriptions in `useEffect` cleanup
- Use pagination instead of loading all data
- Check for circular references

---

## Integration Errors

### Twilio Errors

**Error 21211:** Invalid "To" phone number
- **Fix:** Use E.164 format: `+15551234567`

**Error 21606:** "From" number not owned
- **Fix:** Verify number in Twilio Console → Phone Numbers

**Error 21408:** Permission denied
- **Fix:** Check account status and balance

### Tillo API Errors

**Error 401:** Unauthorized
- **Fix:** Verify API key and secret key

**Error 404:** Brand not found
- **Fix:** Check `tillo_brand_code` is correct

**Error 400:** Insufficient balance
- **Fix:** Add funds to Tillo account

---

## Data Issues

### Issue: Campaigns show "No audience"

**Diagnostic:**
```sql
SELECT 
  c.campaign_name,
  c.audience_id,
  a.name as audience_name,
  COUNT(r.id) as recipient_count
FROM campaigns c
LEFT JOIN audiences a ON a.id = c.audience_id
LEFT JOIN recipients r ON r.audience_id = a.id
GROUP BY c.id, c.campaign_name, c.audience_id, a.name;
```

**Fix:**
```sql
-- Link campaign to audience
UPDATE campaigns 
SET audience_id = (
  SELECT audience_id 
  FROM recipients 
  WHERE campaign_id = campaigns.id 
  LIMIT 1
)
WHERE audience_id IS NULL;
```

### Issue: Orphaned contacts (no audience)

**Diagnostic:**
```sql
SELECT COUNT(*) 
FROM recipients 
WHERE audience_id IS NULL;
```

**Fix:**
```sql
-- Create audience and assign orphaned contacts
WITH new_audience AS (
  INSERT INTO audiences (name, client_id, size)
  VALUES ('Imported Contacts', 'client-uuid', 
    (SELECT COUNT(*) FROM recipients WHERE audience_id IS NULL))
  RETURNING id
)
UPDATE recipients 
SET audience_id = (SELECT id FROM new_audience)
WHERE audience_id IS NULL;
```

---

## Build & Deployment Errors

### Error: "Type error" during build

**Cause:** TypeScript compilation error

**Solution:**
```bash
# Check for type errors
npx tsc --noEmit

# Fix errors then rebuild
npm run build
```

### Error: "Module not found"

**Cause:** Missing dependency or incorrect import

**Solution:**
```bash
# Install missing dependencies
npm install

# Or specific package
npm install missing-package

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Error: "Supabase CLI not authenticated"

**Solution:**
```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF
```

---

## Quick Diagnostic Commands

### Check System Health

```bash
# Test database connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Validate environment
curl https://YOUR_PROJECT.supabase.co/functions/v1/validate-environment \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Check function logs
supabase functions logs --tail
```

### Database Health

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Recent errors
SELECT * FROM error_logs
ORDER BY occurred_at DESC
LIMIT 20;
```

---

## Getting Help

### Self-Service

1. **Check This Guide** - Most common issues covered
2. **Check Function Logs** - Edge function logs in Supabase
3. **Check Database Logs** - SQL errors and slow queries
4. **Check Browser Console** - JavaScript errors
5. **Run Diagnostics** - Use SQL queries above

### Contact Support

**Include in Your Report:**
- Error message (exact text)
- Steps to reproduce
- Browser/device information
- Screenshots if applicable
- Relevant log entries
- Diagnostic query results

**Contact Methods:**
- Email: support@mobulace.com
- Chat: Dr. Phillip in admin panel
- Emergency: Use escalation procedure

---

## Related Documentation

- [Gift Cards Troubleshooting](GIFT_CARDS.md)
- [SMS Delivery Troubleshooting](SMS_DELIVERY.md)
- [Permissions Troubleshooting](PERMISSIONS.md)
- [Developer Guide](../4-DEVELOPER-GUIDE/)
- [Operations Guide](../8-OPERATIONS/)

---

**Last Updated:** December 4, 2024

# Edge Function Deployment & Testing Guide

## Overview

Guide for deploying and testing all 66 edge functions for the ACE Engage platform.

---

## Pre-Deployment Checklist

- [ ] All required environment variables configured in Supabase Dashboard
- [ ] Supabase CLI installed and authenticated
- [ ] Functions tested locally where possible
- [ ] Database migrations applied
- [ ] Team notified of deployment

---

## Deployment Options

### Option 1: Deploy All Functions (Recommended)

```powershell
# Windows (PowerShell)
.\run-deployment-pipeline.ps1

# This script will:
# 1. Check Supabase CLI installation
# 2. Verify project connection
# 3. Deploy all functions
# 4. Run verification tests
# 5. Display deployment summary
```

**Expected Duration**: 15-20 minutes

###Option 2: Deploy Individual Functions

```bash
# Deploy single function
supabase functions deploy FUNCTION_NAME --project-ref uibvxhwhkatjcwghnzpu

# Deploy with specific config
supabase functions deploy FUNCTION_NAME \
  --project-ref uibvxhwhkatjcwghnzpu \
  --no-verify-jwt # If public endpoint
```

### Option 3: Deploy by Category

```bash
# Deploy all authentication functions
supabase functions deploy accept-invitation generate-api-key send-user-invitation

# Deploy all campaign functions
supabase functions deploy evaluate-conditions complete-condition save-campaign-draft

# Deploy all communication functions
supabase functions deploy send-sms-opt-in send-email retry-failed-sms
```

---

## Post-Deployment Verification

### Automated Verification Script

**File**: `scripts/verify-edge-functions.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

interface FunctionTest {
  name: string;
  testPayload: any;
  expectedStatus: number;
  critical: boolean;
}

const criticalFunctions: FunctionTest[] = [
  {
    name: 'evaluate-conditions',
    testPayload: {
      recipientId: 'test-id',
      campaignId: 'test-id',
      eventType: 'form_submitted'
    },
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'send-sms-opt-in',
    testPayload: {
      recipientId: 'test-id',
      campaignId: 'test-id',
      phone: '+1234567890'
    },
    expectedStatus: 200,
    critical: true
  },
  // Add more critical functions
];

async function verifyFunctions() {
  console.log('🔍 Verifying edge function deployment...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    total: criticalFunctions.length
  };
  
  for (const test of criticalFunctions) {
    try {
      const { data, error } = await supabase.functions.invoke(
        test.name,
        { body: test.testPayload }
      );
      
      if (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        if (test.critical) results.failed++;
      } else {
        console.log(`✅ ${test.name}: OK`);
        results.passed++;
      }
    } catch (error: any) {
      console.log(`❌ ${test.name}: ${error.message}`);
      if (test.critical) results.failed++;
    }
  }
  
  console.log(`\n📊 Results: ${results.passed}/${results.total} passed`);
  
  if (results.failed > 0) {
    console.log(`\n⚠️  ${results.failed} critical functions failed`);
    process.exit(1);
  } else {
    console.log(`\n✅ All critical functions deployed successfully!`);
  }
}

verifyFunctions();
```

### Manual Verification Checklist

**Critical Functions** (Test these manually):

#### Authentication & User Management
- [ ] `accept-invitation` - User can accept invitation
- [ ] `send-user-invitation` - Invitation email sends
- [ ] `generate-api-key` - API key generates correctly

#### Campaign Operations
- [ ] `evaluate-conditions` - Conditions evaluate correctly
- [ ] `complete-condition` - Condition completes
- [ ] `save-campaign-draft` - Draft saves correctly
- [ ] `create-preview-link` - Preview link generates

#### Communication
- [ ] `send-sms-opt-in` - SMS sends (check Twilio dashboard)
- [ ] `send-email` - Email sends (check email provider)
- [ ] `handle-sms-response` - SMS response processed
- [ ] `retry-failed-sms` - Retry logic works

#### Forms & Tracking
- [ ] `handle-purl` - PURL redirects correctly
- [ ] `submit-lead-form` - Form submission saves
- [ ] `submit-ace-form` - ACE form processes
- [ ] `track-mail-delivery` - Mail tracking works

#### Call Center
- [ ] `handle-incoming-call` - Call webhook processes
- [ ] `update-call-status` - Call status updates
- [ ] `complete-call-disposition` - Disposition saves

#### System & Admin
- [ ] `generate-demo-data` - Demo data generates
- [ ] `cleanup-demo-data` - Cleanup works
- [ ] `export-database` - Export completes
- [ ] `send-inventory-alert` - Alert sends correctly

---

## Function Health Monitoring

### Check Function Status

```bash
# List all functions
supabase functions list --project-ref uibvxhwhkatjcwghnzpu

# Check function logs
supabase functions logs FUNCTION_NAME --project-ref uibvxhwhkatjcwghnzpu

# Tail logs in real-time
supabase functions logs FUNCTION_NAME --tail --project-ref uibvxhwhkatjcwghnzpu
```

### Query Function Health

```sql
-- Monitor error rate per function
SELECT 
  function_name,
  COUNT(*) as error_count,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count
FROM error_logs
WHERE function_name IS NOT NULL
  AND occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name
ORDER BY error_count DESC;

-- Check function performance
SELECT 
  metric_name as function_name,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  MIN(duration_ms) as min_duration,
  COUNT(*) as calls
FROM performance_metrics
WHERE metric_type = 'edge_function'
  AND recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_name
ORDER BY avg_duration DESC;
```

---

## Troubleshooting Deployment

### Issue: "function not found"

**Cause**: Function directory structure incorrect

**Solution**:
```bash
# Verify directory structure
ls supabase/functions/FUNCTION_NAME/
# Should contain: index.ts

# Redeploy
supabase functions deploy FUNCTION_NAME
```

### Issue: "import not found"

**Cause**: Missing npm dependencies or incorrect import path

**Solution**:
```typescript
// Use npm: prefix for external packages
import { createClient } from 'npm:@supabase/supabase-js@2';

// Use relative paths for shared code
import { corsHeaders } from '../_shared/cors.ts';
```

### Issue: "function timeout"

**Cause**: Function exceeds 60-second limit

**Solution**:
1. Optimize slow queries
2. Add caching
3. Break into smaller functions
4. Use background jobs for long tasks

### Issue: "environment variable not found"

**Cause**: Variable not set in Supabase Dashboard

**Solution**:
```bash
# Check available variables
supabase functions env list

# Set variable via dashboard:
# Settings → Edge Functions → Environment Variables
```

---

## Function Testing

### Local Testing

```bash
# Serve function locally
supabase functions serve FUNCTION_NAME --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/FUNCTION_NAME' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"test": "data"}'
```

### Integration Testing

```typescript
// File: src/test/edge-functions.test.ts

describe('Edge Functions Integration Tests', () => {
  test('evaluate-conditions handles valid request', async () => {
    const { data, error } = await supabase.functions.invoke(
      'evaluate-conditions',
      {
        body: {
          recipientId: testRecipientId,
          campaignId: testCampaignId,
          eventType: 'form_submitted'
        }
      }
    );
    
    expect(error).toBeNull();
    expect(data.success).toBe(true);
  });
  
  test('evaluate-conditions rejects invalid request', async () => {
    const { error } = await supabase.functions.invoke(
      'evaluate-conditions',
      { body: {} } // Missing required fields
    );
    
    expect(error).not.toBeNull();
  });
});
```

---

## Performance Monitoring

### Response Time Targets

| Function Type | Target | Acceptable | Critical |
|--------------|---------|------------|----------|
| Simple queries | <500ms | <1s | >2s |
| Complex operations | <1s | <2s | >5s |
| External API calls | <2s | <5s | >10s |

### Monitoring Queries

```sql
-- Slowest functions (last 24 hours)
SELECT 
  metric_name as function_name,
  AVG(duration_ms) as avg_ms,
  MAX(duration_ms) as max_ms,
  COUNT(*) as call_count
FROM performance_metrics
WHERE metric_type = 'edge_function'
  AND recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_name
HAVING AVG(duration_ms) > 1000 -- Over 1 second
ORDER BY avg_ms DESC;

-- Functions with high error rate
SELECT 
  function_name,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors,
  COUNT(*) as total_calls,
  (COUNT(*) FILTER (WHERE error_message IS NOT NULL)::FLOAT / COUNT(*) * 100) as error_rate
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '24 hours'
  AND function_name IS NOT NULL
GROUP BY function_name
HAVING (COUNT(*) FILTER (WHERE error_message IS NOT NULL)::FLOAT / COUNT(*) * 100) > 5 -- Over 5% error rate
ORDER BY error_rate DESC;
```

---

## Deployment Rollback

### Rollback Single Function

```bash
# Get previous version from git
git log --oneline -- supabase/functions/FUNCTION_NAME/

# Checkout previous version
git checkout COMMIT_HASH -- supabase/functions/FUNCTION_NAME/

# Redeploy
supabase functions deploy FUNCTION_NAME

# Restore current version in git
git checkout main -- supabase/functions/FUNCTION_NAME/
```

### Rollback All Functions

```bash
# Checkout previous commit
git checkout PREVIOUS_COMMIT

# Deploy all
.\run-deployment-pipeline.ps1

# Return to current
git checkout main
```

---

## Environment Variables Reference

### Required for All Functions

```bash
SUPABASE_URL=https://uibvxhwhkatjcwghnzpu.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Communication Functions

```bash
# For SMS functions
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# For email functions
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@mobulace.com
FROM_NAME=Mobul ACE
```

### Monitoring & Alerts

```bash
# For alert functions
ALERT_EMAIL_RECIPIENTS=ops@company.com,admin@company.com
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### AI Features

```bash
# For AI functions
GEMINI_API_KEY=...
```

### External Integrations

```bash
# For payment functions
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Success Criteria

Deployment is considered successful when:

- [ ] All 66 functions show as "deployed" in Supabase Dashboard
- [ ] No deployment errors in logs
- [ ] All critical functions respond to test requests
- [ ] No spike in error logs after deployment
- [ ] Function logs show normal activity
- [ ] Performance metrics within acceptable range
- [ ] User-facing features work correctly

---

**Last Updated**: December 2024  
**Owner**: DevOps Team



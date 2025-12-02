# Edge Functions Deployment & Verification Guide

## Overview
This guide covers deploying and verifying all 66 edge functions for production readiness.

## Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project linked
- Environment variables configured
- Service role key available

## Deployment Status Check

### Step 1: List Currently Deployed Functions
```powershell
# Check what's deployed
supabase functions list

# Expected output: List of all deployed functions
```

### Step 2: Check Recent Logs
```powershell
# View logs for all functions
supabase functions logs --tail

# View logs for specific function
supabase functions logs FUNCTION_NAME --tail
```

## Critical Functions Checklist

### Authentication & Security (3 functions)
- [ ] `generate-api-key` - API key generation
- [ ] `accept-invitation` - User invitations
- [ ] `send-user-invitation` - Invitation emails

**Test**: Create API key, send invitation

### Campaign Management (6 functions)
- [ ] `evaluate-conditions` - Condition evaluation engine ⚠️ CRITICAL
- [ ] `complete-condition` - Mark conditions complete
- [ ] `process-time-delayed-conditions` - Scheduled triggers
- [ ] `save-campaign-draft` - Auto-save functionality
- [ ] `save-campaign-version` - Version control
- [ ] `create-preview-link` - Shareable previews

**Test**: Create campaign, add condition, trigger evaluation

### Communication (4 functions)
- [ ] `send-sms-opt-in` - SMS opt-in requests ⚠️ CRITICAL
- [ ] `handle-sms-response` - SMS webhook handler
- [ ] `send-email` - Email delivery
- [ ] `retry-failed-sms` - SMS retry logic

**Test**: Send SMS, receive response, check email delivery

### Call Center (3 functions)
- [ ] `handle-incoming-call` - Call webhook ⚠️ CRITICAL
- [ ] `update-call-status` - Call status updates
- [ ] `complete-call-disposition` - Call completion

**Test**: Simulate call webhook, update status

### Analytics & Tracking (4 functions)
- [ ] `track-mail-delivery` - Mail tracking
- [ ] `handle-purl` - PURL redirects
- [ ] `submit-lead-form` - Form submissions
- [ ] `submit-ace-form` - ACE form processing

**Test**: Visit PURL, submit form

### System & Admin (6 functions)
- [ ] `cleanup-demo-data` - Demo data cleanup
- [ ] `generate-demo-data` - Demo data generation
- [ ] `export-database` - Database exports
- [ ] `monitor-gift-card-system` - System monitoring
- [ ] `send-inventory-alert` - Low inventory alerts
- [ ] `check-alert-triggers` - Alert processing

**Test**: Generate demo data, export database

### Integrations (5 functions)
- [ ] `dispatch-zapier-event` - Zapier outbound
- [ ] `zapier-incoming-webhook` - Zapier inbound
- [ ] `crm-webhook-receiver` - CRM webhooks
- [ ] `trigger-webhook` - Generic webhooks
- [ ] `stripe-webhook` - Payment webhooks

**Test**: Trigger Zapier event, receive webhook

### AI Features (3 functions)
- [ ] `ai-design-chat` - AI design assistant
- [ ] `generate-landing-page-ai` - AI landing pages
- [ ] `generate-ace-form-ai` - AI form generation

**Test**: Generate AI landing page

### Call Tracking (6 functions)
- [ ] `assign-tracked-numbers` - Number assignment
- [ ] `provision-twilio-number` - Provision number
- [ ] `release-twilio-number` - Release number
- [ ] `handle-call-webhook` - Call tracking
- [ ] `send-approval-notification` - Approval notices
- [ ] `send-form-notification` - Form notices

## Deployment Methods

### Option 1: Full Deployment (Recommended)
```powershell
# Deploy all functions at once
.\run-deployment-pipeline.ps1

# This runs:
# - Validates all functions
# - Deploys each function
# - Verifies deployment
# - Tests critical endpoints
```

### Option 2: Individual Deployment
```powershell
# Deploy specific function
supabase functions deploy FUNCTION_NAME

# Deploy with environment variables
supabase functions deploy FUNCTION_NAME --no-verify-jwt

# Deploy multiple functions
$functions = @(
  "evaluate-conditions",
  "send-sms-opt-in",
  "handle-incoming-call"
)

foreach ($func in $functions) {
  Write-Host "Deploying $func..." -ForegroundColor Cyan
  supabase functions deploy $func
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ $func deployed" -ForegroundColor Green
  } else {
    Write-Host "❌ $func failed" -ForegroundColor Red
  }
}
```

### Option 3: Selective Deployment (Critical Only)
```powershell
# Deploy only critical functions first
$criticalFunctions = @(
  "evaluate-conditions",
  "send-sms-opt-in",
  "handle-incoming-call",
  "handle-purl",
  "submit-lead-form"
)

foreach ($func in $criticalFunctions) {
  supabase functions deploy $func
}
```

## Environment Variables Configuration

### Required Variables
```bash
# Core Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Communication
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
RESEND_API_KEY=re_xxxxxx
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your App Name

# AI Features
GEMINI_API_KEY=AIxxxxxx

# Monitoring & Alerts
ALERT_EMAIL_RECIPIENTS=ops@company.com,admin@company.com
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
LOW_INVENTORY_THRESHOLD=50
CRITICAL_ERROR_THRESHOLD=5

# External Services
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Feature Flags
ENABLE_DEMO_MODE=false
ENABLE_DEBUG_LOGGING=false
```

### Set in Supabase Dashboard
1. Go to Settings → Edge Functions
2. Click "Add secret"
3. Add each variable
4. Redeploy functions after adding

## Verification Tests

### Test Script (PowerShell)
```powershell
# File: scripts/test-edge-functions.ps1

$supabaseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY

function Test-EdgeFunction {
    param($functionName, $body = @{})
    
    Write-Host "Testing $functionName..." -NoNewline
    
    try {
        $response = Invoke-RestMethod `
            -Uri "$supabaseUrl/functions/v1/$functionName" `
            -Method Post `
            -Headers @{
                "Authorization" = "Bearer $anonKey"
                "Content-Type" = "application/json"
            } `
            -Body ($body | ConvertTo-Json)
        
        Write-Host " ✅" -ForegroundColor Green
        return $true
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Test critical functions
$tests = @{
    "evaluate-conditions" = @{
        recipientId = "test"
        campaignId = "test"
    }
    "handle-purl" = @{}
}

$passed = 0
$failed = 0

foreach ($test in $tests.GetEnumerator()) {
    if (Test-EdgeFunction $test.Key $test.Value) {
        $passed++
    } else {
        $failed++
    }
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
```

### Manual Testing Checklist
- [ ] Visit /admin/demo-data - generate-demo-data works
- [ ] Create campaign - save-campaign-draft works
- [ ] Add recipient - recipient creation works
- [ ] Send SMS opt-in - send-sms-opt-in works
- [ ] Submit form - submit-lead-form works
- [ ] Check PURL - handle-purl works
- [ ] Test call webhook - handle-incoming-call works

## Troubleshooting

### Error: "Function not found"
**Solution**: Deploy function first, verify in Supabase Dashboard

### Error: "Invalid JWT"
**Solution**: Check if function requires authentication, update config.toml

### Error: "Environment variable not set"
**Solution**: Add variable in Supabase Dashboard, redeploy

### Error: "Timeout"
**Solution**: Function taking too long, optimize or increase timeout

### Error: "CORS error"
**Solution**: Check CORS headers in function response

## Post-Deployment Monitoring

### Check Function Health
```sql
-- Query function invocations
SELECT 
  function_name,
  COUNT(*) as invocations,
  AVG(execution_time) as avg_time_ms,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM function_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY function_name
ORDER BY invocations DESC;
```

### Monitor Error Rates
```typescript
// Check error logs
const { data: errors } = await supabase
  .from('error_logs')
  .select('*')
  .eq('category', 'edge_function')
  .gte('occurred_at', new Date(Date.now() - 3600000).toISOString());

console.log(`Edge function errors in last hour: ${errors?.length || 0}`);
```

### Set Up Alerts
- Configure ALERT_EMAIL_RECIPIENTS for critical errors
- Set up Slack webhook for real-time notifications
- Monitor error_logs table for spikes

## Success Criteria
- [ ] All 66 functions deployed without errors
- [ ] Critical functions respond to test requests
- [ ] Environment variables configured
- [ ] CORS headers working
- [ ] No errors in function logs
- [ ] Manual tests pass
- [ ] Monitoring alerts configured

## Next Steps
After successful deployment:
1. Run automated test suite
2. Monitor for 24 hours
3. Set up alerting (next todo)
4. Document any issues
5. Create runbook for common problems

## Recording Deployment

Create file: `EDGE_FUNCTIONS_DEPLOYMENT_LOG.md`

```markdown
# Edge Functions Deployment Log

## Date: YYYY-MM-DD
## Deployed by: YOUR_NAME

### Deployment Method
- [ ] Full deployment (all 66 functions)
- [ ] Selective (critical only)
- [ ] Individual functions

### Functions Deployed
- [x] evaluate-conditions (Success)
- [x] send-sms-opt-in (Success)
- [x] handle-incoming-call (Success)
[... list all 66]

### Environment Variables Configured
- [x] SUPABASE_URL
- [x] TWILIO credentials
- [x] Email settings
- [x] Alert settings
[... list all required]

### Tests Passed
- [x] Demo data generation
- [x] Campaign creation
- [x] SMS sending
- [x] Form submission
- [x] PURL redirect

### Issues Encountered
None

### Verification Results
- All functions responding
- No CORS errors
- Environment variables working
- Monitoring active

### Next Actions
1. Monitor for 24 hours
2. Set up alerting
3. Run load tests
4. Document performance baselines
```


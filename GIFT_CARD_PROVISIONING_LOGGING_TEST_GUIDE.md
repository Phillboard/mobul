# Gift Card Provisioning Logging Test Guide

This guide documents the comprehensive logging system and how to verify it's working correctly.

## What Was Implemented

### 1. Error Logger Schema Fix
- Fixed column mapping: `error_type` → `category`, `error_message` → `message`, `timestamp` → `occurred_at`
- Added structured error codes (GC-001 through GC-015)
- Added `logProvisioningCheckpoint()` for step-by-step tracing
- Added `logProvisioningError()` with automatic code assignment

### 2. Provisioning Trace Table
- New table: `gift_card_provisioning_trace`
- Tracks every step of provisioning with:
  - Request ID for correlation
  - Step number and name
  - Status (started/completed/failed/skipped)
  - Duration in milliseconds
  - Error details with structured codes

### 3. Enhanced Edge Functions
Both provisioning functions now log at every step:
- **provision-gift-card-unified**: 12 checkpoints
- **provision-gift-card-for-call-center**: 10 checkpoints

Each checkpoint logs:
- Step start time
- Relevant parameters
- Success/failure status
- Duration
- Detailed error information if failed

### 4. Diagnostic Function
- New endpoint: `diagnose-provisioning-setup`
- Checks: Tillo config, database functions, campaign setup, credits, inventory, recent failures

### 5. Enhanced UI
- New "Gift Cards" tab in System Health page
- Real-time success rate, failure count, avg duration
- Error distribution pie chart
- Expandable trace view for each failure
- Error code recommendations

### 6. Frontend Request Tracer
- `src/lib/request-tracer.ts`
- Client-side trace ID generation
- Error code lookup with recommendations

### 7. Monitoring Views
- `v_provisioning_health_hourly` - Hourly aggregations
- `v_top_provisioning_failures` - Most common errors
- `v_campaign_provisioning_stats` - Per-campaign stats
- `v_active_provisioning_issues` - Campaigns needing attention
- `v_provisioning_step_performance` - Step-level performance

---

## Deployment Steps

### 1. Push Database Migrations
```powershell
npx supabase db push
```

This will apply:
- `20251204300000_add_provisioning_trace_logging.sql`
- `20251204300001_create_provisioning_monitoring_views.sql`

### 2. Deploy Edge Functions
```powershell
# Deploy updated functions
supabase functions deploy provision-gift-card-unified
supabase functions deploy provision-gift-card-for-call-center
supabase functions deploy diagnose-provisioning-setup
```

### 3. Build and Deploy Frontend
```powershell
npm run build
# Deploy to your hosting provider
```

---

## Test Scenarios

### Test 1: Missing Campaign Configuration (GC-001)
**Setup**: Create a campaign with a condition that has NULL `brand_id` or `card_value`

**Expected Result**:
- Error code: `GC-001`
- Trace shows failure at "Get Condition Gift Card Config" step
- Error logged to `error_logs` with category `gift_card`
- UI shows recommendation to edit campaign

**Verification**:
```sql
SELECT * FROM gift_card_provisioning_trace 
WHERE error_code = 'GC-001' 
ORDER BY created_at DESC LIMIT 5;
```

### Test 2: No Inventory and No Tillo (GC-003/GC-004)
**Setup**: Use a brand with zero inventory and ensure Tillo API keys are not set

**Expected Result**:
- Error code: `GC-003` or `GC-004`
- Trace shows failure at "Check Inventory Availability" or "Check Tillo Configuration"
- Recommendation to upload inventory or configure Tillo

### Test 3: Insufficient Credits (GC-006)
**Setup**: Set client credits to 0 or less than denomination

**Expected Result**:
- Error code: `GC-006`
- Trace shows warning at "Check Entity Credits" step
- Message includes current balance and amount needed

### Test 4: Already Provisioned (GC-010)
**Setup**: Try to provision same recipient + campaign + brand twice

**Expected Result**:
- Error code: `GC-010`
- Trace shows failure at "Check if Already Provisioned" step
- Message indicates gift card already issued

### Test 5: Invalid Redemption Code (GC-011)
**Setup**: Enter non-existent redemption code in call center

**Expected Result**:
- Error code: `GC-011`
- Trace shows failure at "Lookup Recipient by Redemption Code" step
- Message suggests verifying code

### Test 6: Successful Provisioning
**Setup**: Valid configuration, inventory or Tillo, sufficient credits

**Expected Result**:
- All 12 steps show `completed` status
- No error code
- Gift card provisioned successfully
- Trace shows total duration

**Verification**:
```sql
SELECT * FROM v_provisioning_attempts 
WHERE overall_status = 'success' 
ORDER BY started_at DESC LIMIT 5;
```

---

## Viewing Logs

### Option 1: System Health UI
1. Go to **System Health** → **Gift Cards** tab
2. View real-time metrics at top
3. Click on any failure to expand trace
4. Use "View Full Trace" to see step-by-step details

### Option 2: Supabase Dashboard
1. Go to Supabase Dashboard → Edge Functions → Logs
2. Filter by function name
3. Search for request ID from UI

### Option 3: Direct Database Queries
```sql
-- Recent failures with details
SELECT * FROM get_recent_provisioning_failures(50, NULL, 24);

-- Error code statistics
SELECT * FROM get_provisioning_error_stats(24);

-- Full trace for a request
SELECT * FROM get_provisioning_trace('req_xxxxx');

-- Health metrics
SELECT * FROM get_provisioning_health(24);

-- Dashboard summary
SELECT * FROM get_provisioning_dashboard_summary();
```

---

## Console Log Format

Each provisioning attempt outputs structured logs:

```
╔══════════════════════════════════════════════════════════════════════╗
║ [UNIFIED-PROVISION] Request ID: req_xxxxx_xxxxx                      ║
╠══════════════════════════════════════════════════════════════════════╣
║ INPUT PARAMETERS:                                                     ║
║   campaignId: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx                   ║
║   recipientId: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx                  ║
║   brandId: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx                      ║
║   denomination: 25                                                    ║
╚══════════════════════════════════════════════════════════════════════╝
[STEP 1] Validate Input Parameters... ✓
[STEP 2] Getting billing entity... ✓
[STEP 3] Checking credits... ✓
...
```

On failure:
```
╔══════════════════════════════════════════════════════════════════════╗
║ [UNIFIED-PROVISION] ✗ FAILED - Request ID: req_xxxxx_xxxxx           ║
╠══════════════════════════════════════════════════════════════════════╣
║   Error Code: GC-001                                                  ║
║   Description: Missing campaign condition configuration               ║
║   Message: No gift card configured for campaign...                   ║
║   Failed Step: 5 - Get Condition Gift Card Config                    ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Running Diagnostics

Call the diagnostic endpoint to check setup before provisioning:

```javascript
const { data } = await supabase.functions.invoke('diagnose-provisioning-setup', {
  body: {
    campaignId: 'xxx',
    recipientId: 'xxx',
    brandId: 'xxx',
    denomination: 25,
  }
});

console.log(data);
// {
//   success: true,
//   overallStatus: 'healthy' | 'issues_found' | 'critical',
//   summary: { totalChecks, passed, failed, warnings, skipped },
//   checks: [...],
//   recommendations: [...],
//   recentFailures: [...]
// }
```

---

## Error Code Reference

| Code | Description | Can Retry | Needs Campaign Edit |
|------|-------------|-----------|---------------------|
| GC-001 | Missing brand_id/card_value | No | Yes |
| GC-002 | Brand not found | No | Yes |
| GC-003 | No inventory available | Yes | No |
| GC-004 | Tillo API not configured | No | No |
| GC-005 | Tillo API call failed | Yes | No |
| GC-006 | Insufficient credits | No | No |
| GC-007 | Billing transaction failed | No | No |
| GC-008 | Campaign billing not configured | No | Yes |
| GC-009 | Verification required | Yes | No |
| GC-010 | Already provisioned | No | No |
| GC-011 | Invalid redemption code | Yes | No |
| GC-012 | Missing parameters | Yes | No |
| GC-013 | Database function error | No | No |
| GC-014 | Delivery notification failed | Yes | No |
| GC-015 | Unknown error | Yes | No |

---

## Cleanup

Old trace data can be cleaned up:

```sql
-- Remove traces older than 30 days
SELECT cleanup_old_provisioning_traces(30);
```


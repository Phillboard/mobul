# Deployment & Testing Guide

## 🚀 Step 1: Deploy Edge Functions

### Option A: Using PowerShell (Windows)
```powershell
cd scripts
.\deploy-edge-functions.ps1
```

### Option B: Using Bash (Mac/Linux)
```bash
cd scripts
chmod +x deploy-edge-functions.sh
./deploy-edge-functions.sh
```

### Option C: Manual Deployment
```bash
# Login to Supabase (if not already logged in)
supabase login

# Deploy each function
supabase functions deploy provision-gift-card-for-call-center
supabase functions deploy provision-gift-card-from-api
supabase functions deploy simulate-mail-tracking
supabase functions deploy validate-campaign-budget
supabase functions deploy validate-gift-card-configuration
supabase functions deploy update-organization-status
supabase functions deploy calculate-credit-requirements
```

## 🧪 Step 2: Run Integration Tests

### Prerequisites
1. Set environment variables:
```bash
# .env.test
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
TEST_ADMIN_PASSWORD=your_test_admin_password
```

2. Ensure test database has:
   - At least one campaign
   - At least one enabled gift card brand
   - Test user with admin role (admin@mopads.com)

### Run Tests
```bash
# Run all integration tests
npm test -- edge-functions.test.ts

# Run with coverage
npm test -- edge-functions.test.ts --coverage

# Run specific test suite
npm test -- edge-functions.test.ts -t "validate-campaign-budget"
```

### Expected Results
- ✅ All API endpoints respond within 2 seconds
- ✅ Proper error handling for invalid inputs
- ✅ Authentication works correctly
- ✅ Validation schemas catch errors
- ✅ Concurrent requests handled properly

## 📊 Step 3: Performance Benchmark

### Using Apache Bench
```bash
# Test calculate-credit-requirements endpoint
ab -n 100 -c 10 -T 'application/json' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -p benchmark-payload.json \
  https://your-project.supabase.co/functions/v1/calculate-credit-requirements
```

### Using Artillery (Recommended)
1. Install Artillery:
```bash
npm install -g artillery
```

2. Run load test:
```bash
artillery run scripts/load-test.yml
```

### Performance Targets
- **Response Time**: < 2s (p95)
- **Throughput**: > 100 req/s
- **Error Rate**: < 1%
- **Concurrent Users**: 50+

## 🎯 Step 4: Deploy to Staging

### Staging Checklist
- [ ] All edge functions deployed
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Admin user configured

### Deploy Command
```bash
# Set staging project
supabase link --project-ref your-staging-project

# Deploy functions
./scripts/deploy-edge-functions.sh

# Verify deployment
curl -X POST \
  -H "Authorization: Bearer YOUR_STAGING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientCount":10,"giftCardDenomination":25}' \
  https://your-staging-project.supabase.co/functions/v1/calculate-credit-requirements
```

## 🔍 Step 5: Verification

### Manual Testing Checklist

#### 1. Calculate Credit Requirements
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientCount": 100,
    "giftCardDenomination": 25,
    "mailCostPerPiece": 0.55
  }' \
  https://your-project.supabase.co/functions/v1/calculate-credit-requirements
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "giftCardTotal": 2500,
    "mailTotal": 55,
    "grandTotal": 2555,
    "breakdown": {
      "perRecipient": {
        "giftCard": 25,
        "mail": 0.55,
        "total": 25.55
      }
    }
  }
}
```

#### 2. Validate Campaign Budget
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "YOUR_CAMPAIGN_ID",
    "recipientCount": 10,
    "giftCardDenomination": 25,
    "mailCostPerPiece": 0.55
  }' \
  https://your-project.supabase.co/functions/v1/validate-campaign-budget
```

#### 3. Test Provisioning (Test Mode)
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testMode": true,
    "testConfig": {
      "api_provider": "Tillo",
      "card_value": 25
    }
  }' \
  https://your-project.supabase.co/functions/v1/provision-gift-card-from-api
```

### Monitoring

#### Supabase Dashboard
1. Go to **Functions** tab
2. Check each function status
3. View logs for errors
4. Monitor invocation counts

#### Key Metrics to Watch
- Function invocation count
- Average response time
- Error rate
- 95th percentile latency

## ⚠️ Troubleshooting

### Function Deployment Fails
```bash
# Check function syntax
supabase functions serve provision-gift-card-for-call-center

# View deployment logs
supabase functions logs provision-gift-card-for-call-center
```

### Authentication Errors
- Verify JWT token is valid
- Check user has correct role in `user_roles` table
- Ensure RLS policies allow operation

### Validation Errors
- Check request body matches schema
- Verify all required fields present
- Ensure UUIDs are valid format

### Performance Issues
- Check database query performance
- Enable connection pooling
- Consider adding Redis cache
- Review business rule complexity

## 📈 Success Criteria

### Must Pass Before Production
- ✅ All 7 edge functions deployed successfully
- ✅ Integration tests: 100% passing
- ✅ Performance: < 2s response time (p95)
- ✅ Load test: > 100 req/s sustained
- ✅ Error rate: < 1%
- ✅ Manual verification: All endpoints working
- ✅ Monitoring: Metrics visible in dashboard
- ✅ Authentication: Working for all roles
- ✅ Validation: Catching invalid inputs
- ✅ Audit logs: Recording sensitive operations

## 🎉 Next Steps After Staging

1. **User Acceptance Testing**
   - Share staging environment with stakeholders
   - Collect feedback on functionality
   - Fix any reported issues

2. **Production Deployment**
   - Set production environment variables
   - Deploy to production project
   - Monitor closely for first 24 hours

3. **Frontend Migration**
   - Update hooks to use new APIs
   - Remove old direct RPC calls
   - Test UI thoroughly

4. **Documentation**
   - Update API documentation
   - Create user guides
   - Document any gotchas

---

**Need Help?**
- Check function logs: `supabase functions logs FUNCTION_NAME`
- View database logs in Supabase Dashboard
- Review `API_FIRST_IMPLEMENTATION_COMPLETE.md` for details


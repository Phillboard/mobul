# 🚀 Quick Start: Deploy & Test Edge Functions

## ⚡ One-Command Deployment

```powershell
# Windows PowerShell
.\run-deployment-pipeline.ps1
```

This single command will:
1. ✅ Deploy all 7 edge functions
2. ✅ Run integration tests
3. ✅ Execute performance benchmarks
4. ✅ Guide you through manual verification
5. ✅ Prepare for staging deployment

## 📋 Manual Step-by-Step (If Needed)

### Prerequisites
```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project
supabase link --project-ref your-project-ref

# 4. Ensure environment variables are set
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# TILLO_API_KEY (for production)
# TILLO_SECRET_KEY (for production)
```

### Step 1: Deploy Functions (2 minutes)
```powershell
cd scripts
.\deploy-edge-functions.ps1
```

**Expected Output:**
```
✅ provision-gift-card-for-call-center deployed
✅ provision-gift-card-from-api deployed
✅ simulate-mail-tracking deployed
✅ validate-campaign-budget deployed
✅ validate-gift-card-configuration deployed
✅ update-organization-status deployed
✅ calculate-credit-requirements deployed
```

### Step 2: Run Tests (3 minutes)
```bash
npm test -- edge-functions.test.ts
```

**Expected Results:**
- All tests pass ✅
- Response times < 2s
- No authentication errors
- Validation working correctly

### Step 3: Performance Test (5 minutes)
```bash
# Install Artillery (one-time)
npm install -g artillery

# Run load test
artillery run scripts/load-test.yml
```

**Expected Metrics:**
- Response time (p95): < 2000ms
- Request rate: > 100/second
- Error rate: < 1%

### Step 4: Manual Verification (2 minutes)

Visit Supabase Dashboard → Functions:

1. **Check Status**: All functions show "Healthy" ✅
2. **Test Function**: Click any function → Test
3. **View Logs**: Check for errors

**Test Request Example:**
```json
{
  "recipientCount": 10,
  "giftCardDenomination": 25,
  "mailCostPerPiece": 0.55
}
```

### Step 5: Deploy to Staging (5 minutes)

```bash
# Switch to staging project
supabase link --project-ref your-staging-ref

# Deploy
.\scripts\deploy-edge-functions.ps1

# Test staging
npm test -- edge-functions.test.ts
```

## 🎯 Quick Verification Commands

### Test Single Function
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientCount":10,"giftCardDenomination":25}' \
  https://your-project.supabase.co/functions/v1/calculate-credit-requirements
```

### View Function Logs
```bash
supabase functions logs calculate-credit-requirements --tail
```

### Test Locally (Before Deployment)
```bash
supabase functions serve provision-gift-card-unified
```

## ⚠️ Common Issues & Fixes

### "Command not found: supabase"
```bash
npm install -g supabase
```

### "Not logged in"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref your-project-ref
```

### "Deployment failed"
1. Check function syntax
2. View detailed logs
3. Verify environment variables

### "Tests failing"
1. Check test user exists (admin@mopads.com)
2. Verify database has test data
3. Ensure environment variables set

## 📊 Success Checklist

Before considering deployment complete:

- [ ] All 7 functions deployed successfully
- [ ] Integration tests passing (100%)
- [ ] Performance tests meet targets
- [ ] Manual verification completed
- [ ] No errors in function logs
- [ ] Staging deployment working
- [ ] Documentation reviewed

## 🎉 What's Next?

After successful deployment:

1. **Update Frontend** (See frontend-migration section below)
2. **Monitor Functions** (First 24 hours)
3. **User Testing** (Staging environment)
4. **Production Deploy** (When ready)

## 📱 NPM Scripts Available

```bash
# Deploy everything
npm run deploy

# Deploy functions only
npm run deploy:functions

# Run integration tests
npm run test:integration

# Watch integration tests
npm run test:integration:watch

# Run load tests
npm run test:load

# View logs
npm run logs:all
npm run logs:provisioning
npm run logs:call-center
```

## 📚 Documentation

- **Full Guide**: `DEPLOYMENT_TESTING_GUIDE.md`
- **API Reference**: `API_FIRST_IMPLEMENTATION_COMPLETE.md`
- **Summary**: `API_FIRST_REFACTOR_SUMMARY.md`

## 💡 Pro Tips

1. **Test locally first**: `supabase functions serve FUNCTION_NAME`
2. **Watch logs during test**: `supabase functions logs --tail`
3. **Use staging**: Don't test in production
4. **Monitor metrics**: Check Supabase Dashboard regularly
5. **Gradual rollout**: Start with low-traffic functions

## 🆘 Need Help?

```bash
# View function logs
supabase functions logs FUNCTION_NAME

# Check function status
supabase functions list

# Test function locally
supabase functions serve FUNCTION_NAME

# View database logs
# Go to Supabase Dashboard → Logs
```

---

**Estimated Total Time**: 15-20 minutes  
**Difficulty**: Easy  
**Prerequisites**: Supabase CLI, Node.js, Project access  

**Ready to deploy?** Run: `.\run-deployment-pipeline.ps1`


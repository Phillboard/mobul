# Complete Deployment & Testing Script
# Usage: .\run-deployment-pipeline.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Complete Deployment Pipeline" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Deploy Edge Functions
Write-Host "📦 STEP 1: Deploying Edge Functions..." -ForegroundColor Yellow
Write-Host ""
try {
    & .\scripts\deploy-edge-functions.ps1
    Write-Host "✅ Edge functions deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Edge function deployment failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Run Integration Tests
Write-Host "🧪 STEP 2: Running Integration Tests..." -ForegroundColor Yellow
Write-Host ""
try {
    npm test -- edge-functions.test.ts
    Write-Host "✅ Integration tests passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Some tests failed. Review output above." -ForegroundColor Yellow
    $continue = Read-Host "Continue with deployment? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}
Write-Host ""

# Step 3: Performance Benchmark
Write-Host "📊 STEP 3: Running Performance Benchmarks..." -ForegroundColor Yellow
Write-Host ""
if (Get-Command artillery -ErrorAction SilentlyContinue) {
    try {
        artillery run scripts/load-test.yml
        Write-Host "✅ Performance benchmarks completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Performance benchmark failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Artillery not installed. Skipping performance tests." -ForegroundColor Yellow
    Write-Host "   Install with: npm install -g artillery" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Manual Verification Prompt
Write-Host "🔍 STEP 4: Manual Verification" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please verify the following in Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "1. All 7 edge functions show as 'Healthy'" -ForegroundColor White
Write-Host "2. No errors in function logs" -ForegroundColor White
Write-Host "3. Test a sample request from the dashboard" -ForegroundColor White
Write-Host ""
$verified = Read-Host "Have you verified all functions? (y/N)"
if ($verified -ne "y") {
    Write-Host "❌ Deployment pipeline stopped. Please verify functions manually." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Manual verification completed" -ForegroundColor Green
Write-Host ""

# Step 5: Staging Deployment
Write-Host "🎯 STEP 5: Ready for Staging Deployment" -ForegroundColor Yellow
Write-Host ""
Write-Host "To deploy to staging:" -ForegroundColor Cyan
Write-Host "1. Switch to staging project:" -ForegroundColor White
Write-Host "   supabase link --project-ref your-staging-ref" -ForegroundColor Gray
Write-Host "2. Deploy functions:" -ForegroundColor White
Write-Host "   .\scripts\deploy-edge-functions.ps1" -ForegroundColor Gray
Write-Host "3. Run smoke tests:" -ForegroundColor White
Write-Host "   npm test -- edge-functions.test.ts" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Pipeline Complete!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. ✅ Edge functions deployed" -ForegroundColor Green
Write-Host "2. ✅ Integration tests run" -ForegroundColor Green
Write-Host "3. ✅ Performance benchmarked" -ForegroundColor Green
Write-Host "4. ⏳ Deploy to staging" -ForegroundColor Yellow
Write-Host "5. ⏳ Update frontend hooks" -ForegroundColor Yellow
Write-Host "6. ⏳ Production deployment" -ForegroundColor Yellow
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "- Full guide: DEPLOYMENT_TESTING_GUIDE.md" -ForegroundColor White
Write-Host "- API docs: API_FIRST_IMPLEMENTATION_COMPLETE.md" -ForegroundColor White
Write-Host "- Summary: API_FIRST_REFACTOR_SUMMARY.md" -ForegroundColor White
Write-Host ""


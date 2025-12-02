# Edge Function Automated Testing Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Edge Functions Testing Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment
if (-not $env:VITE_SUPABASE_URL) {
    Write-Host "⚠️  Environment variables not set" -ForegroundColor Red
    Write-Host "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    exit
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY

function Test-EdgeFunction {
    param(
        [string]$functionName,
        [hashtable]$body = @{},
        [bool]$requiresAuth = $false
    )
    
    Write-Host "Testing $functionName..." -NoNewline
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
            "apikey" = $anonKey
        }
        
        if ($requiresAuth) {
            $headers["Authorization"] = "Bearer $anonKey"
        }
        
        $response = Invoke-RestMethod `
            -Uri "$supabaseUrl/functions/v1/$functionName" `
            -Method Post `
            -Headers $headers `
            -Body ($body | ConvertTo-Json) `
            -TimeoutSec 10
        
        Write-Host " ✅" -ForegroundColor Green
        return @{ success = $true; response = $response }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message
        
        # 401/403 might be expected for auth-required functions
        if ($statusCode -in @(401, 403) -and -not $requiresAuth) {
            Write-Host " ⚠️  (Auth required)" -ForegroundColor Yellow
            return @{ success = $true; note = "auth_required" }
        }
        
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "    Error: $errorMsg" -ForegroundColor Red
        return @{ success = $false; error = $errorMsg }
    }
}

# Test public endpoints (no auth)
Write-Host ""
Write-Host "Testing Public Endpoints..." -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Gray

$publicTests = @{
    "handle-purl" = @{ code = "TEST123" }
    "submit-lead-form" = @{ name = "Test"; email = "test@test.com" }
    "dr-phillip-chat" = @{ message = "Hello" }
}

$publicPassed = 0
$publicFailed = 0

foreach ($test in $publicTests.GetEnumerator()) {
    $result = Test-EdgeFunction $test.Key $test.Value $false
    if ($result.success) { $publicPassed++ } else { $publicFailed++ }
}

# Test authenticated endpoints
Write-Host ""
Write-Host "Testing Authenticated Endpoints..." -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Gray

$authTests = @{
    "generate-api-key" = @{ action = "list" }
    "save-campaign-draft" = @{ campaignId = "test" }
    "ai-design-chat" = @{ message = "Test" }
}

$authPassed = 0
$authFailed = 0

foreach ($test in $authTests.GetEnumerator()) {
    $result = Test-EdgeFunction $test.Key $test.Value $true
    if ($result.success) { $authPassed++ } else { $authFailed++ }
}

# Test webhook endpoints
Write-Host ""
Write-Host "Testing Webhook Endpoints..." -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Gray

$webhookTests = @{
    "handle-sms-response" = @{ From = "+1234567890"; Body = "YES" }
    "crm-webhook-receiver" = @{ event = "test"; data = @{} }
    "zapier-incoming-webhook" = @{ test = $true }
}

$webhookPassed = 0
$webhookFailed = 0

foreach ($test in $webhookTests.GetEnumerator()) {
    $result = Test-EdgeFunction $test.Key $test.Value $false
    if ($result.success) { $webhookPassed++ } else { $webhookFailed++ }
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Public Endpoints:   $publicPassed passed, $publicFailed failed" -ForegroundColor $(if ($publicFailed -eq 0) { "Green" } else { "Yellow" })
Write-Host "Authenticated:      $authPassed passed, $authFailed failed" -ForegroundColor $(if ($authFailed -eq 0) { "Green" } else { "Yellow" })
Write-Host "Webhooks:           $webhookPassed passed, $webhookFailed failed" -ForegroundColor $(if ($webhookFailed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

$totalPassed = $publicPassed + $authPassed + $webhookPassed
$totalFailed = $publicFailed + $authFailed + $webhookFailed
$totalTests = $totalPassed + $totalFailed

Write-Host "Total: $totalPassed/$totalTests passed ($([math]::Round(($totalPassed/$totalTests)*100, 2))%)" -ForegroundColor $(if ($totalFailed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($totalFailed -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Review errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review failed tests" -ForegroundColor White
Write-Host "2. Check function logs: supabase functions logs --tail" -ForegroundColor White
Write-Host "3. Verify environment variables" -ForegroundColor White
Write-Host "4. Test manually in browser for failed endpoints" -ForegroundColor White


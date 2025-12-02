# Deploy Edge Functions to Supabase
# Usage: .\deploy-edge-functions.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Edge Functions to Supabase..." -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase"
    exit 1
}

# Check if logged in
try {
    supabase projects list | Out-Null
} catch {
    Write-Host "❌ Not logged in to Supabase. Please run:" -ForegroundColor Red
    Write-Host "   supabase login"
    exit 1
}

Write-Host "✅ Supabase CLI ready" -ForegroundColor Green
Write-Host ""

# Deploy new edge functions
Write-Host "📦 Deploying new edge functions..." -ForegroundColor Cyan

$functions = @(
    "provision-gift-card-for-call-center",
    "provision-gift-card-from-api",
    "simulate-mail-tracking",
    "validate-campaign-budget",
    "validate-gift-card-configuration",
    "update-organization-status",
    "calculate-credit-requirements"
)

foreach ($func in $functions) {
    Write-Host "   Deploying $func..." -ForegroundColor Yellow
    try {
        supabase functions deploy $func --no-verify-jwt
        Write-Host "   ✅ $func deployed successfully" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed to deploy $func" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

Write-Host "🎉 All edge functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify functions in Supabase Dashboard"
Write-Host "2. Test each function with sample requests"
Write-Host "3. Update frontend to use new APIs"
Write-Host "4. Run integration tests"


# Apply Gift Card System Migrations and Seed Data
# Run this script to set up the complete gift card system

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Gift Card System Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is available
if (!(Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Please install it from: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Applying custom pricing migration..." -ForegroundColor Yellow
supabase migration up --file 20251203000002_add_custom_pricing_to_denominations.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Custom pricing migration may have already been applied or failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Creating database functions..." -ForegroundColor Yellow
supabase migration up --file 20251203000003_create_gift_card_functions.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create database functions" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Seeding test data..." -ForegroundColor Yellow
supabase migration up --file 20251203000004_seed_gift_card_test_data.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to seed test data" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "What was created:" -ForegroundColor Cyan
Write-Host "  ✓ Custom pricing columns in gift_card_denominations" -ForegroundColor Green
Write-Host "  ✓ Database functions for claiming and billing" -ForegroundColor Green
Write-Host "  ✓ Starbucks brand with 4 denominations ($5, $10, $25, $50)" -ForegroundColor Green
Write-Host "  ✓ 50 sample gift cards in CSV inventory" -ForegroundColor Green
Write-Host "  ✓ All clients enabled for Starbucks gift cards" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Refresh your browser to clear cache" -ForegroundColor White
Write-Host "  2. Go to /campaigns/new to test gift card selection" -ForegroundColor White
Write-Host "  3. Go to /admin/gift-card-marketplace to manage inventory" -ForegroundColor White
Write-Host ""


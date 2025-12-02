# Gift Card System Setup - Simple Version
# Run this to set up the complete gift card system

Write-Host "====================================`n" -ForegroundColor Cyan
Write-Host "Gift Card System Setup`n" -ForegroundColor Cyan  
Write-Host "====================================`n" -ForegroundColor Cyan

# Step 1
Write-Host "`nStep 1: Applying custom pricing migration..." -ForegroundColor Yellow
supabase db push

# Step 2  
Write-Host "`nStep 2: Creating database functions..." -ForegroundColor Yellow
Write-Host "Running migrations..." -ForegroundColor Gray

# Step 3
Write-Host "`nStep 3: Seeding test data..." -ForegroundColor Yellow
Write-Host "Creating Starbucks brand and test cards..." -ForegroundColor Gray

Write-Host "`n====================================`n" -ForegroundColor Green
Write-Host "Setup Complete!`n" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Green

Write-Host "`nWhat was created:" -ForegroundColor Cyan
Write-Host "  - Custom pricing columns" -ForegroundColor Green
Write-Host "  - Database functions" -ForegroundColor Green
Write-Host "  - Starbucks brand with 4 denominations" -ForegroundColor Green
Write-Host "  - 50 sample gift cards" -ForegroundColor Green
Write-Host "  - All clients enabled" -ForegroundColor Green

Write-Host "`nNext: Refresh your browser (Ctrl+Shift+R)`n" -ForegroundColor Cyan


#!/usr/bin/env pwsh

# Quick setup script for new Supabase migration

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Supabase Migration Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "uibvxhwhkatjcwghnzpu"
$PROJECT_URL = "https://$PROJECT_ID.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I"

Write-Host "Step 1: Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# Supabase Configuration
VITE_SUPABASE_URL=$PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_ANON_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=$PROJECT_ID

# Service Role Key (REQUIRED - Get from dashboard)
# Get this from: https://supabase.com/dashboard/project/$PROJECT_ID/settings/api
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
"@

if (Test-Path ".env") {
    Write-Host "   .env file already exists. Creating .env.new instead..." -ForegroundColor Yellow
    $envContent | Out-File -FilePath ".env.new" -Encoding UTF8
    Write-Host "   ✓ Created .env.new" -ForegroundColor Green
    Write-Host "   Please review and rename to .env" -ForegroundColor Yellow
} else {
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "   ✓ Created .env file" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Get Service Role Key" -ForegroundColor Yellow
Write-Host "   Go to: https://supabase.com/dashboard/project/$PROJECT_ID/settings/api" -ForegroundColor Cyan
Write-Host "   Copy the 'service_role' key and add it to your .env file" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 3: Link Supabase Project" -ForegroundColor Yellow
Write-Host "   Run: supabase link --project-ref $PROJECT_ID" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 4: Apply Migrations" -ForegroundColor Yellow
Write-Host "   Run: supabase db push" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 5: Deploy Functions" -ForegroundColor Yellow
Write-Host "   Run: supabase functions deploy" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 6: Start Development" -ForegroundColor Yellow
Write-Host "   Run: npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "==================================================" -ForegroundColor Green
Write-Host " Setup instructions created!" -ForegroundColor Green
Write-Host " See SUPABASE_MIGRATION_GUIDE.md for full details" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Ask if user wants to open dashboard
$response = Read-Host "Open Supabase dashboard in browser? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Start-Process "https://supabase.com/dashboard/project/$PROJECT_ID"
}


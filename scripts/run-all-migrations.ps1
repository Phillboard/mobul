# ========================================
# ACE Engage - Complete Migration Runner
# ========================================
# This script runs all pending migrations
# Requires: Supabase CLI, Node.js, npm
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ACE Engage - Migration Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_REF = "uibvxhwhkatjcwghnzpu"
$MIGRATION_DIR = "supabase/migrations"
$SCRIPT_DIR = "scripts/sql"

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Supabase CLI
Write-Host "1. Checking Supabase CLI..." -NoNewline
try {
    $version = npx supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ Found (v$version)" -ForegroundColor Green
    } else {
        Write-Host " ✗ Not found" -ForegroundColor Red
        Write-Host "   Please install: npm install -g supabase" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " ✗ Error" -ForegroundColor Red
    exit 1
}

# Check .env file
Write-Host "2. Checking .env file..." -NoNewline
if (Test-Path ".env") {
    Write-Host " ✓ Found" -ForegroundColor Green
    
    # Check for BOM or special characters
    $envContent = Get-Content ".env" -Raw -Encoding UTF8
    if ($envContent -match '^\xEF\xBB\xBF' -or $envContent -match '»') {
        Write-Host ""
        Write-Host "   ⚠ WARNING: .env file has encoding issues" -ForegroundColor Red
        Write-Host "   Please fix encoding before continuing:" -ForegroundColor Red
        Write-Host "   1. Open .env in VS Code" -ForegroundColor Yellow
        Write-Host "   2. Click encoding in bottom-right corner" -ForegroundColor Yellow
        Write-Host "   3. Select 'Save with Encoding' → UTF-8 (not UTF-8 with BOM)" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y") {
            exit 1
        }
    }
} else {
    Write-Host " ✗ Not found" -ForegroundColor Red
    Write-Host "   Please create .env file with Supabase credentials" -ForegroundColor Red
    exit 1
}

# Check environment variables
Write-Host "3. Checking environment variables..." -NoNewline
$envVars = Get-Content ".env" -ErrorAction SilentlyContinue
$hasUrl = $envVars | Select-String "VITE_SUPABASE_URL"
$hasKey = $envVars | Select-String "SUPABASE_SERVICE_ROLE_KEY"

if ($hasUrl -and $hasKey) {
    Write-Host " ✓ Found" -ForegroundColor Green
} else {
    Write-Host " ✗ Missing" -ForegroundColor Red
    if (-not $hasUrl) {
        Write-Host "   Missing: VITE_SUPABASE_URL" -ForegroundColor Red
    }
    if (-not $hasKey) {
        Write-Host "   Missing: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Options" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Choose migration method:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Supabase CLI (Recommended)" -ForegroundColor Green
Write-Host "   - Automated execution" -ForegroundColor Gray
Write-Host "   - Proper migration tracking" -ForegroundColor Gray
Write-Host "   - Fast (one command)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open Supabase Dashboard" -ForegroundColor Cyan
Write-Host "   - Manual execution via SQL Editor" -ForegroundColor Gray
Write-Host "   - Visual feedback" -ForegroundColor Gray
Write-Host "   - Slower (127 migrations)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Generate migration script" -ForegroundColor Yellow
Write-Host "   - Creates SQL file with all migrations" -ForegroundColor Gray
Write-Host "   - Run manually in any SQL client" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Exit" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Method 1: Supabase CLI" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Step 1: Link project
        Write-Host "Step 1: Linking Supabase project..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Running: npx supabase link --project-ref $PROJECT_REF" -ForegroundColor Gray
        Write-Host ""
        
        npx supabase link --project-ref $PROJECT_REF
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "✗ Failed to link project" -ForegroundColor Red
            Write-Host "Please check your database password and try again" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "✓ Project linked successfully" -ForegroundColor Green
        Write-Host ""
        
        # Step 2: Push migrations
        Write-Host "Step 2: Applying migrations..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Running: npx supabase db push" -ForegroundColor Gray
        Write-Host ""
        
        npx supabase db push
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "✗ Migration failed" -ForegroundColor Red
            Write-Host "Check error messages above for details" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "✓ Migrations applied successfully" -ForegroundColor Green
        Write-Host ""
        
        # Step 3: Verify
        Write-Host "Step 3: Verifying migrations..." -ForegroundColor Yellow
        Write-Host ""
        npx supabase migration list
        Write-Host ""
        
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Next Steps" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Schema migrations complete! Now run data scripts:" -ForegroundColor Green
        Write-Host ""
        Write-Host "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Run these scripts in order:" -ForegroundColor Yellow
        Write-Host "   a. scripts/sql/seed-default-message-templates.sql" -ForegroundColor Gray
        Write-Host "   b. scripts/sql/seed-mvp-test-data.sql" -ForegroundColor Gray
        Write-Host "   c. scripts/sql/populate-gift-card-pools.sql" -ForegroundColor Gray
        Write-Host "   d. scripts/sql/verify-mvp-database.sql" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Run TypeScript migrations:" -ForegroundColor Yellow
        Write-Host "   npm run migrate:gift-cards" -ForegroundColor Gray
        Write-Host "   npm run migrate:gift-cards -- --apply" -ForegroundColor Gray
        Write-Host ""
    }
    
    "2" {
        Write-Host ""
        Write-Host "Opening Supabase Dashboard..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Manual Migration Steps:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Copy migration files from: $MIGRATION_DIR" -ForegroundColor Gray
        Write-Host "2. Paste into SQL Editor (link opening in browser)" -ForegroundColor Gray
        Write-Host "3. Run each migration in chronological order" -ForegroundColor Gray
        Write-Host "4. Start with: 20251110154551_*.sql" -ForegroundColor Gray
        Write-Host "5. End with: 20251201180000_*.sql" -ForegroundColor Gray
        Write-Host ""
        Write-Host "See MIGRATION_AUDIT_AND_PLAN.md for checklist" -ForegroundColor Yellow
        Write-Host ""
        
        Start-Process "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
    }
    
    "3" {
        Write-Host ""
        Write-Host "Generating combined migration script..." -ForegroundColor Yellow
        Write-Host ""
        
        $outputFile = "all-migrations-combined.sql"
        $header = @"
-- ========================================
-- ACE Engage - Combined Migration Script
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Total Migrations: 127
-- ========================================
-- 
-- IMPORTANT: Run this script in a transaction
-- BEGIN; at the start
-- COMMIT; at the end (or ROLLBACK; if errors)
-- 
-- ========================================

BEGIN;

"@
        
        Set-Content -Path $outputFile -Value $header
        
        $migrations = Get-ChildItem $MIGRATION_DIR -Filter "*.sql" | Sort-Object Name
        
        foreach ($migration in $migrations) {
            Write-Host "Adding: $($migration.Name)" -ForegroundColor Gray
            
            $content = @"

-- ========================================
-- Migration: $($migration.Name)
-- ========================================

"@
            Add-Content -Path $outputFile -Value $content
            Add-Content -Path $outputFile -Value (Get-Content $migration.FullName -Raw)
        }
        
        $footer = @"

-- ========================================
-- End of Migrations
-- ========================================

COMMIT;
-- ROLLBACK; -- Uncomment to rollback instead

"@
        Add-Content -Path $outputFile -Value $footer
        
        Write-Host ""
        Write-Host "✓ Generated: $outputFile" -ForegroundColor Green
        Write-Host ""
        Write-Host "To use this file:" -ForegroundColor Yellow
        Write-Host "1. Open in Supabase SQL Editor" -ForegroundColor Gray
        Write-Host "2. Review the migrations" -ForegroundColor Gray
        Write-Host "3. Run the entire script" -ForegroundColor Gray
        Write-Host ""
    }
    
    "4" {
        Write-Host ""
        Write-Host "Exiting..." -ForegroundColor Gray
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Script Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""


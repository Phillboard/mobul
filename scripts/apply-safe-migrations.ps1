# Safe Migrations Application Script
# This script guides you through applying all safe migrations in the correct order

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Safe Migrations Application Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$migrations = @(
    @{name="20251201100000_create_error_tracking_tables.sql"; desc="Error tracking & monitoring"},
    @{name="20251201160000_create_tags_system.sql"; desc="Tags system"},
    @{name="20251201170000_create_comments_system.sql"; desc="Comments system"},
    @{name="20251127000000_enhance_campaign_system_part1_schema.sql"; desc="Campaign enhancement 1/10"},
    @{name="20251127000001_enhance_campaign_system_part2_constraints.sql"; desc="Campaign enhancement 2/10"},
    @{name="20251127000002_enhance_campaign_system_part3_notifications.sql"; desc="Campaign enhancement 3/10"},
    @{name="20251127000003_enhance_campaign_system_part4_functions.sql"; desc="Campaign enhancement 4/10"},
    @{name="20251127000004_enhance_campaign_system_part5_notify_func.sql"; desc="Campaign enhancement 5/10"},
    @{name="20251127000005_enhance_campaign_system_part6_data_migration.sql"; desc="Campaign enhancement 6/10"},
    @{name="20251127000006_enhance_campaign_system_part7_grants.sql"; desc="Campaign enhancement 7/10"},
    @{name="20251127000007_enhance_campaign_system_part8_grants2.sql"; desc="Campaign enhancement 8/10"},
    @{name="20251127000008_enhance_campaign_system_part9_grants3.sql"; desc="Campaign enhancement 9/10"},
    @{name="20251127000009_enhance_campaign_system_part10_grants4.sql"; desc="Campaign enhancement 10/10"},
    @{name="20251202100000_add_organization_archive_columns.sql"; desc="Organization archive"},
    @{name="20251201110000_create_atomic_transaction_functions.sql"; desc="Atomic transactions"},
    @{name="20251201130000_create_validation_functions.sql"; desc="Validation functions"},
    @{name="20251201150000_create_bulk_operations_support.sql"; desc="Bulk operations"}
)

Write-Host "This script will help apply $($migrations.Count) safe migrations" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Red
Write-Host "   You must apply these manually via Supabase Dashboard SQL Editor" -ForegroundColor Red
Write-Host "   This script guides you through the process" -ForegroundColor Red
Write-Host ""
Write-Host "Before starting:" -ForegroundColor Yellow
Write-Host "1. Create a database backup" -ForegroundColor White
Write-Host "2. Run verification queries (scripts/sql/verification/check-migration-status.sql)" -ForegroundColor White
Write-Host "3. Open Supabase Dashboard in another window" -ForegroundColor White
Write-Host ""
$continue = Read-Host "Ready to begin? (y/n)"

if ($continue -ne "y") {
    Write-Host "Exiting..." -ForegroundColor Yellow
    exit
}

$appliedCount = 0
$skippedCount = 0
$logFile = "MIGRATION_APPLICATION_LOG_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

"Migration Application Log" | Out-File $logFile
"Date: $(Get-Date)" | Out-File $logFile -Append
"" | Out-File $logFile -Append

foreach ($migration in $migrations) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Migration $($appliedCount + $skippedCount + 1) of $($migrations.Count)" -ForegroundColor Yellow
    Write-Host "File: $($migration.name)" -ForegroundColor White
    Write-Host "Description: $($migration.desc)" -ForegroundColor White
    Write-Host "=========================================" -ForegroundColor Green
    
    $path = "supabase\migrations\$($migration.name)"
    
    if (Test-Path $path) {
        Write-Host "✅ File exists: $path" -ForegroundColor Green
        Write-Host ""
        Write-Host "Steps to apply:" -ForegroundColor Cyan
        Write-Host "1. Open Supabase Dashboard → SQL Editor" -ForegroundColor White
        Write-Host "2. Create new query" -ForegroundColor White
        Write-Host "3. Copy entire contents of file:" -ForegroundColor White
        Write-Host "   $path" -ForegroundColor Yellow
        Write-Host "4. Paste into SQL Editor" -ForegroundColor White
        Write-Host "5. Click 'Run'" -ForegroundColor White
        Write-Host "6. Check output for errors" -ForegroundColor White
        Write-Host ""
        
        # Offer to open file
        $open = Read-Host "Open migration file in notepad? (y/n)"
        if ($open -eq "y") {
            Start-Process notepad $path
        }
        
        Write-Host ""
        $apply = Read-Host "Have you successfully applied this migration? (y/n/s to skip)"
        
        if ($apply -eq "y") {
            Write-Host "✅ Marked as applied" -ForegroundColor Green
            "✅ APPLIED: $($migration.name) - $($migration.desc)" | Out-File $logFile -Append
            $appliedCount++
        } elseif ($apply -eq "s") {
            Write-Host "⏭️  Skipped" -ForegroundColor Yellow
            "⏭️  SKIPPED: $($migration.name) - $($migration.desc)" | Out-File $logFile -Append
            $skippedCount++
        } else {
            Write-Host "⚠️  Stopping. Please apply or skip migration before continuing" -ForegroundColor Red
            "" | Out-File $logFile -Append
            "❌ STOPPED at: $($migration.name)" | Out-File $logFile -Append
            Write-Host ""
            Write-Host "Progress saved to: $logFile" -ForegroundColor Cyan
            exit
        }
    } else {
        Write-Host "⚠️  File not found: $path" -ForegroundColor Red
        Write-Host "   Skipping..." -ForegroundColor Yellow
        "⚠️  NOT FOUND: $($migration.name)" | Out-File $logFile -Append
        $skippedCount++
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Migration Application Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "Applied: $appliedCount migrations" -ForegroundColor Green
Write-Host "Skipped: $skippedCount migrations" -ForegroundColor Yellow
Write-Host ""
Write-Host "Log file: $logFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run verification: scripts\sql\verification\check-migration-status.sql" -ForegroundColor White
Write-Host "2. Test application functionality" -ForegroundColor White
Write-Host "3. Visit System Health dashboard: /admin/system-health" -ForegroundColor White
Write-Host "4. Check error logs table for any issues" -ForegroundColor White
Write-Host "5. Proceed to deploy edge functions" -ForegroundColor White
Write-Host ""

"" | Out-File $logFile -Append
"Summary:" | Out-File $logFile -Append
"Applied: $appliedCount" | Out-File $logFile -Append
"Skipped: $skippedCount" | Out-File $logFile -Append
"" | Out-File $logFile -Append
"Log completed: $(Get-Date)" | Out-File $logFile -Append

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


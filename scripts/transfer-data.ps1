# =====================================================
# DATA TRANSFER SCRIPT
# Transfers data from OLD Supabase to NEW Supabase
# =====================================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ACE Engage - Data Transfer Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$OLD_PROJECT_ID = "arzthloosvnasokxygfo"
$NEW_PROJECT_ID = "uibvxhwhkatjcwghnzpu"

Write-Host "Source (OLD): $OLD_PROJECT_ID" -ForegroundColor Yellow
Write-Host "Target (NEW): $NEW_PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Get passwords
$OLD_DB_PASSWORD = Read-Host "Enter OLD database password" -AsSecureString
$NEW_DB_PASSWORD = Read-Host "Enter NEW database password" -AsSecureString

# Convert to plain text for connection strings
$OLD_PASS = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($OLD_DB_PASSWORD))
$NEW_PASS = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($NEW_DB_PASSWORD))

# Connection strings
$OLD_DB_URL = "postgresql://postgres:$OLD_PASS@db.$OLD_PROJECT_ID.supabase.co:5432/postgres"
$NEW_DB_URL = "postgresql://postgres:$NEW_PASS@db.$NEW_PROJECT_ID.supabase.co:5432/postgres"

Write-Host ""
Write-Host "Step 1: Exporting data from OLD database..." -ForegroundColor Yellow

# Export data (excluding system tables)
$EXPORT_FILE = "data_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Check if pg_dump is available
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDumpPath) {
    Write-Host "pg_dump not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Use Supabase Dashboard for manual transfer:" -ForegroundColor Yellow
    Write-Host "1. Go to https://supabase.com/dashboard/project/$OLD_PROJECT_ID/editor" -ForegroundColor White
    Write-Host "2. For each table, click '...' -> Export to CSV" -ForegroundColor White
    Write-Host "3. Go to https://supabase.com/dashboard/project/$NEW_PROJECT_ID/editor" -ForegroundColor White
    Write-Host "4. For each table, click 'Insert' -> Import from CSV" -ForegroundColor White
    exit 1
}

Write-Host "Exporting to $EXPORT_FILE..."

# Tables to export (in dependency order)
$TABLES = @(
    "organizations",
    "clients",
    "user_roles",
    "client_users",
    "org_members",
    "gift_card_brands",
    "gift_card_pools",
    "gift_cards",
    "templates",
    "landing_pages",
    "ace_forms",
    "contact_lists",
    "contacts",
    "contact_list_members",
    "audiences",
    "campaigns",
    "campaign_conditions",
    "campaign_reward_configs",
    "recipients",
    "events",
    "call_sessions",
    "gift_card_deliveries"
)

# Build table flags
$tableFlags = ($TABLES | ForEach-Object { "--table=public.$_" }) -join " "

# Export
$exportCmd = "pg_dump `"$OLD_DB_URL`" --data-only --no-owner --no-privileges --disable-triggers $tableFlags > $EXPORT_FILE"
Invoke-Expression $exportCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Export failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Export complete: $EXPORT_FILE" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Importing data to NEW database..." -ForegroundColor Yellow

# Import
$importCmd = "psql `"$NEW_DB_URL`" < $EXPORT_FILE"
Invoke-Expression $importCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Import failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Import complete!" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Data Transfer Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: User authentication data (auth.users) must be" -ForegroundColor Yellow
Write-Host "transferred manually via Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "  Authentication -> Users -> Export/Import" -ForegroundColor White



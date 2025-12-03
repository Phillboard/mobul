# Setup Wallet Pass Credentials for Apple Wallet and Google Wallet
# This script helps configure the required secrets in Supabase

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Wallet Pass Credentials Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "ERROR: Supabase CLI is not installed." -ForegroundColor Red
    Write-Host "Install it from: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "This script will help you set up wallet pass credentials." -ForegroundColor Green
Write-Host ""

# ============================================
# GOOGLE WALLET SETUP
# ============================================
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  GOOGLE WALLET SETUP" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor White
Write-Host "1. Go to https://pay.google.com/business/console" -ForegroundColor Gray
Write-Host "2. Create an Issuer Account (if not already done)" -ForegroundColor Gray
Write-Host "3. Note your Issuer ID (looks like: 3388000000022192xxx)" -ForegroundColor Gray
Write-Host "4. Go to Google Cloud Console: https://console.cloud.google.com" -ForegroundColor Gray
Write-Host "5. Enable the Google Wallet API" -ForegroundColor Gray
Write-Host "6. Create a Service Account with 'Wallet Object Issuer' role" -ForegroundColor Gray
Write-Host "7. Generate and download a JSON key for the service account" -ForegroundColor Gray
Write-Host ""

$setupGoogle = Read-Host "Do you want to set up Google Wallet credentials? (y/n)"
if ($setupGoogle -eq "y") {
    $googleIssuerId = Read-Host "Enter your Google Wallet Issuer ID"
    $googleServiceAccountPath = Read-Host "Enter the path to your service account JSON key file"
    
    if (Test-Path $googleServiceAccountPath) {
        $serviceAccountJson = Get-Content $googleServiceAccountPath -Raw
        # Escape the JSON for command line
        $escapedJson = $serviceAccountJson -replace '"', '\"'
        
        Write-Host "Setting Google Wallet secrets..." -ForegroundColor Green
        
        # Set the Issuer ID
        supabase secrets set GOOGLE_WALLET_ISSUER_ID="$googleIssuerId"
        
        # Set the service account JSON
        supabase secrets set GOOGLE_WALLET_SERVICE_ACCOUNT="$serviceAccountJson"
        
        Write-Host "Google Wallet secrets configured!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Service account file not found at: $googleServiceAccountPath" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================
# APPLE WALLET SETUP  
# ============================================
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  APPLE WALLET SETUP" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor White
Write-Host "1. Log into https://developer.apple.com" -ForegroundColor Gray
Write-Host "2. Go to Certificates, Identifiers & Profiles" -ForegroundColor Gray
Write-Host "3. Create a Pass Type ID (e.g., pass.com.mobulace.giftcard)" -ForegroundColor Gray
Write-Host "4. Create a certificate for that Pass Type ID" -ForegroundColor Gray
Write-Host "5. Export the certificate as a .p12 file with a password" -ForegroundColor Gray
Write-Host "6. Download Apple WWDR G4 certificate from:" -ForegroundColor Gray
Write-Host "   https://www.apple.com/certificateauthority/" -ForegroundColor Gray
Write-Host ""

$setupApple = Read-Host "Do you want to set up Apple Wallet credentials? (y/n)"
if ($setupApple -eq "y") {
    $appleTeamId = Read-Host "Enter your Apple Team ID (10 characters)"
    $applePassTypeId = Read-Host "Enter your Pass Type ID (e.g., pass.com.mobulace.giftcard)"
    $p12Path = Read-Host "Enter the path to your .p12 certificate file"
    $p12Password = Read-Host "Enter the password for the .p12 file"
    $wwdrPath = Read-Host "Enter the path to the Apple WWDR certificate (.cer or .pem)"
    
    if (Test-Path $p12Path) {
        # Convert .p12 to base64
        $p12Bytes = [System.IO.File]::ReadAllBytes($p12Path)
        $p12Base64 = [Convert]::ToBase64String($p12Bytes)
        
        Write-Host "Setting Apple Wallet secrets..." -ForegroundColor Green
        
        supabase secrets set APPLE_WALLET_TEAM_ID="$appleTeamId"
        supabase secrets set APPLE_WALLET_PASS_TYPE_ID="$applePassTypeId"
        supabase secrets set APPLE_WALLET_CERTIFICATE="$p12Base64"
        supabase secrets set APPLE_WALLET_CERTIFICATE_PASSWORD="$p12Password"
        
        if (Test-Path $wwdrPath) {
            $wwdrBytes = [System.IO.File]::ReadAllBytes($wwdrPath)
            $wwdrBase64 = [Convert]::ToBase64String($wwdrBytes)
            supabase secrets set APPLE_WWDR_CERTIFICATE="$wwdrBase64"
        }
        
        Write-Host "Apple Wallet secrets configured!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Certificate file not found at: $p12Path" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Deploy the wallet edge functions:" -ForegroundColor Gray
Write-Host "   supabase functions deploy generate-google-wallet-pass" -ForegroundColor Yellow
Write-Host "   supabase functions deploy generate-apple-wallet-pass" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test the wallet integration on mobile devices" -ForegroundColor Gray
Write-Host ""

# List current secrets to verify
Write-Host "Current secrets (names only):" -ForegroundColor White
supabase secrets list


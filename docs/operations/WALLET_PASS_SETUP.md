# Wallet Pass Integration Setup Guide

This guide covers setting up Apple Wallet and Google Wallet pass generation for gift cards.

## Overview

The wallet pass integration allows gift card recipients to add their gift cards to their phone's wallet app for easy access. The system automatically detects the user's device and generates the appropriate pass type.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  WalletButton.tsx - Detects platform, calls appropriate function │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               │               ▼
┌──────────────────┐       │    ┌──────────────────────┐
│ iOS Device       │       │    │ Android Device       │
│                  │       │    │                      │
│ generate-apple-  │       │    │ generate-google-     │
│ wallet-pass      │       │    │ wallet-pass          │
│                  │       │    │                      │
│ Returns: .pkpass │       │    │ Returns: Save URL    │
│ (binary file)    │       │    │ (Google Pay link)    │
└──────────────────┘       │    └──────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Desktop         │
                  │ Shows message:  │
                  │ "Open on mobile"│
                  └─────────────────┘
```

## Prerequisites

### For Google Wallet
- Google Cloud Project
- Google Wallet API enabled
- Service Account with Wallet API permissions
- Issuer Account in Google Pay & Wallet Console

### For Apple Wallet
- Apple Developer Program membership ($99/year)
- Pass Type ID certificate
- Apple WWDR G4 intermediate certificate

---

## Google Wallet Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your Project ID

### Step 2: Enable Google Wallet API
1. In Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Wallet API"
3. Click "Enable"

### Step 3: Create Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name: `wallet-pass-generator`
4. Grant role: `Wallet Object Issuer`
5. Click "Done"
6. Click on the created service account
7. Go to "Keys" tab
8. Click "Add Key" > "Create new key"
9. Select JSON format
10. Download the key file (keep it secure!)

### Step 4: Get Issuer ID
1. Go to [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Create an Issuer Account if you don't have one
3. Note your Issuer ID (looks like: `3388000000022192xxx`)

### Step 5: Add Secrets to Supabase
```powershell
# Set Google Wallet secrets
supabase secrets set GOOGLE_WALLET_ISSUER_ID="YOUR_ISSUER_ID"
supabase secrets set GOOGLE_WALLET_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

Or use the setup script:
```powershell
.\scripts\setup-wallet-credentials.ps1
```

---

## Apple Wallet Setup

### Step 1: Create Pass Type ID
1. Log into [Apple Developer Portal](https://developer.apple.com)
2. Go to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" > "+" button
4. Select "Pass Type IDs"
5. Enter description: "Mobul ACE Gift Cards"
6. Enter ID: `pass.com.mobulace.giftcard` (customize as needed)
7. Click "Register"

### Step 2: Create Pass Type ID Certificate
1. In the Identifiers list, click on your Pass Type ID
2. Click "Create Certificate"
3. Follow the instructions to create a CSR using Keychain Access
4. Upload the CSR
5. Download the certificate (.cer file)

### Step 3: Export as .p12
1. Double-click the downloaded .cer to add to Keychain
2. In Keychain Access, find the certificate under "My Certificates"
3. Right-click and select "Export..."
4. Choose .p12 format
5. Set a strong password (you'll need this later)
6. Save the file

### Step 4: Download Apple WWDR Certificate
1. Go to [Apple PKI](https://www.apple.com/certificateauthority/)
2. Download "Worldwide Developer Relations - G4" certificate
3. This is required for proper signing

### Step 5: Prepare Files for Supabase
Convert your certificates to base64:

**On macOS/Linux:**
```bash
# Convert .p12 to base64
base64 -i your-certificate.p12 > certificate.b64

# Convert WWDR to base64
base64 -i AppleWWDRCAG4.cer > wwdr.b64
```

**On Windows PowerShell:**
```powershell
# Convert .p12 to base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("your-certificate.p12")) | Out-File certificate.b64

# Convert WWDR to base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AppleWWDRCAG4.cer")) | Out-File wwdr.b64
```

### Step 6: Add Secrets to Supabase
```powershell
supabase secrets set APPLE_WALLET_TEAM_ID="YOUR_TEAM_ID"
supabase secrets set APPLE_WALLET_PASS_TYPE_ID="pass.com.mobulace.giftcard"
supabase secrets set APPLE_WALLET_CERTIFICATE="<content of certificate.b64>"
supabase secrets set APPLE_WALLET_CERTIFICATE_PASSWORD="your-p12-password"
supabase secrets set APPLE_WWDR_CERTIFICATE="<content of wwdr.b64>"
```

---

## Deployment

Deploy the edge functions:

```powershell
# Deploy both wallet functions
supabase functions deploy generate-google-wallet-pass
supabase functions deploy generate-apple-wallet-pass

# Or deploy all functions at once
.\scripts\deploy-edge-functions.ps1
```

---

## Testing

### Test Script
Run the test script to verify configuration:

```powershell
npx tsx scripts/test-wallet-functions.ts
```

Expected output if not configured:
```
🔵 Testing Google Wallet Pass Generation...
⚠️  Google Wallet is not configured (expected if secrets not set)

🍎 Testing Apple Wallet Pass Generation...
⚠️  Apple Wallet is not configured (expected if secrets not set)
```

Expected output when configured:
```
🔵 Testing Google Wallet Pass Generation...
✅ Google Wallet pass generated successfully!

🍎 Testing Apple Wallet Pass Generation...
✅ Apple Wallet pass generated successfully!
```

### Manual Testing
1. Open your app on a mobile device
2. Navigate to a gift card reveal page
3. Tap "Add to Apple Wallet" (iOS) or "Add to Google Wallet" (Android)
4. Verify the pass appears correctly in your wallet

---

## Troubleshooting

### Google Wallet Issues

**Error: "Google Wallet not configured"**
- Ensure both `GOOGLE_WALLET_ISSUER_ID` and `GOOGLE_WALLET_SERVICE_ACCOUNT` secrets are set
- Verify the service account JSON is valid

**Error: "Failed to import private key"**
- The service account key might be malformed
- Re-download the key from Google Cloud Console

**Pass doesn't appear in wallet**
- Check that the Issuer Account is properly set up
- Verify the Service Account has `Wallet Object Issuer` role

### Apple Wallet Issues

**Error: "Apple Wallet not configured"**
- Ensure all required secrets are set
- Check that certificates are properly base64 encoded

**Error: "Invalid certificate password"**
- Verify `APPLE_WALLET_CERTIFICATE_PASSWORD` matches the .p12 export password

**Error: "No private key found"**
- The .p12 file might not contain the private key
- Re-export from Keychain ensuring "Include private key" is selected

**Pass downloads but won't add to wallet**
- Verify the Pass Type ID matches what's registered in Apple Developer
- Check that the Team ID is correct (10 characters)
- Ensure WWDR certificate is included

---

## Security Notes

1. **Never commit credentials** - All secrets should be set via Supabase dashboard or CLI
2. **Rotate credentials regularly** - Especially the Apple certificate (expires yearly)
3. **Monitor usage** - Google Wallet API has quotas; monitor for unusual activity
4. **Test in staging first** - Always test with test/development credentials before production

---

## Environment Variables Reference

| Secret | Description | Required |
|--------|-------------|----------|
| `GOOGLE_WALLET_ISSUER_ID` | Your Google Wallet Issuer ID | Yes (for Google) |
| `GOOGLE_WALLET_SERVICE_ACCOUNT` | Service account JSON key | Yes (for Google) |
| `APPLE_WALLET_TEAM_ID` | Apple Developer Team ID (10 chars) | Yes (for Apple) |
| `APPLE_WALLET_PASS_TYPE_ID` | Pass Type ID (e.g., pass.com.x.y) | Yes (for Apple) |
| `APPLE_WALLET_CERTIFICATE` | Base64-encoded .p12 certificate | Yes (for Apple) |
| `APPLE_WALLET_CERTIFICATE_PASSWORD` | Password for .p12 file | Yes (for Apple) |
| `APPLE_WWDR_CERTIFICATE` | Base64-encoded WWDR certificate | Recommended |
| `WALLET_ALLOWED_ORIGINS` | Comma-separated allowed origins | Optional |


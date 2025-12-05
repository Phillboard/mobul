# Fix: GitHub Push Protection - Secret in Git History

## Problem
GitHub detected Google Cloud Service Account Credentials in commit `38fc84a96fb123372a32ae20b9811440ffe92e60` in the file `temp-google-wallet-secret.json`.

## Solution Options

### OPTION 1: Run the Automated Fix Script (RECOMMENDED)

1. **Double-click** the file `FIX_SECRET_ISSUE.bat` in this directory
2. Wait for it to complete (may take 5-10 minutes)
3. Check the output to ensure it says "Complete!"

### OPTION 2: Manual Command Line Fix

Open PowerShell in this directory and run these commands one by one:

```powershell
# 1. Create a backup branch (safety first!)
git branch backup-before-secret-removal

# 2. Remove the secret file from all git history
git filter-branch -f --index-filter "git rm --cached --ignore-unmatch temp-google-wallet-secret.json" --prune-empty -- --all

# 3. Clean up the backup references created by filter-branch
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin

# 4. Expire reflog and garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push to GitHub
git push --force origin main

# 6. Verify the file is gone from history
git log --all --full-history -- temp-google-wallet-secret.json
# (Should return nothing)
```

### OPTION 3: Allow the Secret (NOT RECOMMENDED)

If you need to push immediately and will fix it later:

1. Visit the URL from the error message:
   https://github.com/Phillboard/mobul/security/secret-scanning/unblock-secret/36OxPQSHfMKGTleQ3F0CWidRinT

2. Click "Allow secret" 

3. Push your changes

4. **IMPORTANT**: Immediately rotate/regenerate the credentials in Google Cloud Console!

## After Fixing

### 1. Verify the Push Worked

```powershell
git status
# Should say: "Your branch is up to date with 'origin/main'"
```

### 2. **CRITICAL SECURITY STEP**: Rotate the Credentials

The Google Cloud service account credentials were exposed in your git history. You MUST:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Find the service account that was in `temp-google-wallet-secret.json`
4. Delete the old key
5. Create a new key
6. Update your application configuration with the new key
7. **NEVER commit the new key to git**

### 3. Prevent Future Issues

The `.gitignore` file has been updated to include:
- `temp-google-wallet-secret.json`
- `*.p12` (certificate files)
- `*.key` (private keys)  
- `*.pem` (PEM certificates)
- `*.csr` (certificate signing requests)

Always store sensitive credentials in:
- Environment variables (`.env` files - already in `.gitignore`)
- Secret management services (e.g., GitHub Secrets, AWS Secrets Manager)
- Never commit them to git!

## Troubleshooting

### If filter-branch fails with "Cannot create a new backup"
Run: `git filter-branch --force ...` (add --force flag)

### If push still fails after running filter-branch
The problematic commit might be in a different branch. Run:
```powershell
# Find all branches containing the bad commit
git branch --all --contains 38fc84a96fb123372a32ae20b9811440ffe92e60

# Remove from each branch
git filter-branch -f --index-filter "git rm --cached --ignore-unmatch temp-google-wallet-secret.json" --prune-empty -- --all
```

### If you see "ref does not exist" errors
This is normal after filter-branch - it means the cleanup is working.

## Need Help?

If none of these options work, you can:
1. Create a new repository and migrate your code (nuclear option)
2. Contact GitHub support for help with secret scanning
3. Check the backup branch (`backup-before-secret-removal`) if something goes wrong

## Files Created
- `FIX_SECRET_ISSUE.bat` - Automated fix script
- `.gitignore` - Updated to prevent future credential commits
- This instruction file

---
Last updated: 2025-12-05

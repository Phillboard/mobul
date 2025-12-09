# OAuth Setup Guide

Complete guide for configuring Google and Apple OAuth authentication for ACE Engage.

---

## Overview

ACE Engage supports social sign-in via:
- **Google OAuth 2.0**
- **Apple Sign In**

Users can sign in with these providers alongside traditional email/password authentication.

---

## Prerequisites

- Supabase project set up
- Access to Supabase Dashboard
- Google Cloud Console access (for Google OAuth)
- Apple Developer account (for Apple Sign In)

---

## Part 1: Supabase Configuration

### 1.1 Access Supabase Dashboard

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your ACE Engage project
3. Navigate to **Authentication** → **Providers**

### 1.2 Enable OAuth Providers

1. Scroll to **Auth Providers** section
2. Enable **Google** and **Apple**
3. Note the callback URLs shown (you'll need these):
   - Format: `https://<project-ref>.supabase.co/auth/v1/callback`

---

## Part 2: Google OAuth Setup

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Name it: `ACE Engage OAuth`

### 2.2 Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in required fields:
   - **App name**: ACE Engage
   - **User support email**: Your support email
   - **Developer contact email**: Your developer email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
5. Save and continue

### 2.3 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `ACE Engage Web Client`
5. **Authorized JavaScript origins**:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)
6. **Authorized redirect URIs**:
   - Add the Supabase callback URL from step 1.2
   - Example: `https://abcdefg.supabase.co/auth/v1/callback`
7. Click **Create**
8. **IMPORTANT**: Copy the **Client ID** and **Client Secret**

### 2.4 Configure in Supabase

1. Return to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** provider
3. Enable it and enter:
   - **Client ID**: Paste from Google Console
   - **Client Secret**: Paste from Google Console
4. Save changes

---

## Part 3: Apple Sign In Setup

### 3.1 Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **App IDs** → **Continue**
5. Select **App** → **Continue**
6. Fill in:
   - **Description**: ACE Engage
   - **Bundle ID**: `com.aceengage.app` (use your domain)
7. Under **Capabilities**, enable **Sign In with Apple**
8. Click **Continue** → **Register**

### 3.2 Create Services ID

1. In **Identifiers**, click **+** again
2. Select **Services IDs** → **Continue**
3. Fill in:
   - **Description**: ACE Engage Web
   - **Identifier**: `com.aceengage.web` (different from App ID)
4. Check **Sign In with Apple**
5. Click **Configure** next to Sign In with Apple
6. **Primary App ID**: Select the App ID created in 3.1
7. **Domains and Subdomains**: Add your Supabase project domain
   - Example: `abcdefg.supabase.co`
8. **Return URLs**: Add Supabase callback URL from step 1.2
   - Example: `https://abcdefg.supabase.co/auth/v1/callback`
9. Save and Continue → Register

### 3.3 Create Private Key

1. Navigate to **Keys** → **+** button
2. **Key Name**: ACE Engage Apple Auth
3. Enable **Sign In with Apple**
4. Click **Configure** → Select your Primary App ID
5. Save → Continue → Register
6. **Download the .p8 file** - you won't be able to download again!
7. Note the **Key ID** shown

### 3.4 Get Team ID

1. In Apple Developer Portal, click your name (top right)
2. Note your **Team ID** (10-character code)

### 3.5 Configure in Supabase

1. Return to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Apple** provider
3. Enable it and enter:
   - **Services ID**: Your Services ID from step 3.2 (e.g., `com.aceengage.web`)
   - **Team ID**: Your Team ID from step 3.4
   - **Key ID**: The Key ID from step 3.3
   - **Private Key**: Open the .p8 file, copy the entire contents
4. Save changes

---

## Part 4: Application Configuration

### 4.1 Update Environment Variables

No additional environment variables needed! OAuth is configured entirely in Supabase.

### 4.2 Update Site URL

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain:
   - Development: `http://localhost:5173`
   - Production: `https://app.aceengage.com`

### 4.3 Configure Redirect URLs

1. In **Redirect URLs**, add:
   - `http://localhost:5173/auth/callback` (development)
   - `https://app.aceengage.com/auth/callback` (production)

---

## Part 5: Testing

### 5.1 Local Testing (Development)

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:5173/auth`
3. Click **Continue with Google** or **Continue with Apple**
4. Complete OAuth flow
5. Should redirect to dashboard with user signed in

### 5.2 Verify User Creation

1. In Supabase Dashboard → **Authentication** → **Users**
2. Find the new user
3. Check that `provider` field shows `google` or `apple`
4. Verify email is populated

### 5.3 Test Error Handling

Try these scenarios:
- Cancel OAuth flow midway → should return to auth page
- Use already-registered email → should link accounts or show error
- Deny permissions → should show error message

---

## Part 6: Production Deployment

### 6.1 Update Google OAuth URLs

1. Return to Google Cloud Console
2. Edit OAuth 2.0 Client
3. Add production URLs to:
   - **Authorized JavaScript origins**: `https://app.aceengage.com`
   - **Authorized redirect URIs**: Keep Supabase callback URL

### 6.2 Verify Apple Configuration

1. Ensure Apple Services ID has production domain
2. Confirm Return URLs include production callback

### 6.3 Update Supabase Site URL

1. Set Site URL to production domain
2. Add production callback to Redirect URLs

---

## Troubleshooting

### Google OAuth Issues

**Error: redirect_uri_mismatch**
- Verify redirect URI in Google Console exactly matches Supabase callback
- Check for trailing slashes, http vs https

**Error: invalid_client**
- Double-check Client ID and Secret in Supabase
- Regenerate credentials if needed

### Apple Sign In Issues

**Error: invalid_client**
- Verify Services ID matches exactly
- Check Team ID and Key ID are correct

**Error: invalid_grant**
- Private key may be incorrect or malformed
- Ensure entire .p8 file contents are pasted (including BEGIN/END lines)

**No email returned**
- Apple only provides email on first sign-in
- User can choose to hide email (you'll get a relay email)

### General OAuth Issues

**Callback hangs or shows error**
- Check browser console for errors
- Verify `/auth/callback` route exists in App.tsx
- Ensure AuthCallback component handles session correctly

**User signed in but no profile created**
- Check Supabase logs for errors
- Verify `profiles` table has triggers for user creation

---

## Security Best Practices

1. **Never commit credentials**
   - Client secrets, private keys should only be in Supabase Dashboard
   - Not in `.env` files or code

2. **Restrict OAuth scopes**
   - Only request `email` and `profile` scopes
   - Don't request unnecessary permissions

3. **Use HTTPS in production**
   - OAuth requires HTTPS for security
   - Local development can use HTTP

4. **Rotate keys periodically**
   - Change Apple private keys annually
   - Regenerate Google secrets if compromised

5. **Monitor failed attempts**
   - Check Supabase Auth logs regularly
   - Set up alerts for unusual patterns

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)

---

## Support

If you encounter issues not covered in this guide:
1. Check Supabase Dashboard logs
2. Review browser console errors
3. Consult #tech-support channel
4. Contact platform engineering team

---

**Last Updated**: December 2024  
**Maintainer**: Platform Engineering Team


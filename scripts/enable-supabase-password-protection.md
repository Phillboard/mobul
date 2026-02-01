# Enable Leaked Password Protection

## Manual Step Required

This setting must be enabled in the Supabase Dashboard and cannot be automated via migrations.

## Steps

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Mobul Ace Marketing SaaS**
3. Navigate to: **Authentication** > **Providers** > **Email**
4. Scroll to **Security** section
5. Enable **"Leaked password protection"**
6. Click **Save**

## What This Does

When enabled, Supabase Auth will check passwords against the [HaveIBeenPwned](https://haveibeenpwned.com/) database during:
- User registration
- Password changes/resets

Users will be prevented from using passwords that have been compromised in known data breaches.

## Alternative: Supabase CLI

If you have the Supabase CLI configured with proper permissions:

```bash
supabase --project-ref uibvxhwhkatjcwghnzpu auth config update --leaked-password-protection enabled
```

## Verification

After enabling, try to sign up with a common compromised password (e.g., "password123") - it should be rejected.

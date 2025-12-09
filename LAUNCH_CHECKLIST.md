# 🚀 ACE ENGAGE - COMPLETE LAUNCH CHECKLIST

**Project**: ACE Engage Direct Mail Platform  
**Repo**: https://github.com/Phillboard/mobul  
**Status**: Pre-Launch  
**Created**: December 8, 2024

---

## 📋 MASTER TASK OVERVIEW

| Phase | Name | Tasks | Est. Time | Priority |
|-------|------|-------|-----------|----------|
| 1 | OAuth Integration | 8 | 4-6 hours | 🔴 CRITICAL |
| 2 | System Code Review | 15 | 6-8 hours | 🔴 CRITICAL |
| 3 | Cleanup & Deduplication | 12 | 4-5 hours | 🟡 HIGH |
| 4 | Security Hardening | 10 | 3-4 hours | 🔴 CRITICAL |
| 5 | Production Checklist | 20 | 4-6 hours | 🔴 CRITICAL |

**Total Estimated Time**: 21-29 hours

---

## PHASE 1: OAUTH INTEGRATION (Google + Apple Sign-In)

### 1.1 Supabase Configuration
- [ ] **1.1.1** Enable Google OAuth in Supabase Dashboard → Authentication → Providers
- [ ] **1.1.2** Enable Apple OAuth in Supabase Dashboard → Authentication → Providers
- [ ] **1.1.3** Configure OAuth redirect URLs in Supabase

### 1.2 Google OAuth Setup
- [ ] **1.2.1** Create Google Cloud Console project (or use existing)
- [ ] **1.2.2** Enable Google+ API and OAuth consent screen
- [ ] **1.2.3** Create OAuth 2.0 Client ID (Web application)
- [ ] **1.2.4** Add authorized redirect URI: `https://[YOUR_SUPABASE_URL]/auth/v1/callback`
- [ ] **1.2.5** Copy Client ID and Secret to Supabase Dashboard
- [ ] **1.2.6** Add production domain to authorized JavaScript origins

### 1.3 Apple OAuth Setup
- [ ] **1.3.1** Create Apple Developer account (if not existing)
- [ ] **1.3.2** Create App ID with Sign in with Apple capability
- [ ] **1.3.3** Create Services ID for web authentication
- [ ] **1.3.4** Register domains and return URLs
- [ ] **1.3.5** Create and download private key
- [ ] **1.3.6** Copy Service ID, Team ID, Key ID, and Private Key to Supabase

### 1.4 Frontend Implementation
- [ ] **1.4.1** Update `src/contexts/AuthContext.tsx`:
  ```typescript
  // Add these methods to AuthContext
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  };
  
  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };
  ```

- [ ] **1.4.2** Create `src/pages/AuthCallback.tsx` for OAuth redirect handling
- [ ] **1.4.3** Update `src/pages/Auth.tsx` with OAuth buttons
- [ ] **1.4.4** Add OAuth callback route to router
- [ ] **1.4.5** Style OAuth buttons with proper brand icons (Google/Apple)

### 1.5 Testing
- [ ] **1.5.1** Test Google sign-in flow (new user)
- [ ] **1.5.2** Test Google sign-in flow (existing user)
- [ ] **1.5.3** Test Apple sign-in flow (new user)
- [ ] **1.5.4** Test Apple sign-in flow (existing user)
- [ ] **1.5.5** Verify profile creation on first OAuth sign-in
- [ ] **1.5.6** Test sign-out and re-sign-in

---

## PHASE 2: FULL SYSTEM CODE REVIEW

### 2.1 Authentication System Review
- [ ] **2.1.1** Review `src/contexts/AuthContext.tsx` - session management, role fetching
- [ ] **2.1.2** Review `src/components/ProtectedRoute.tsx` - route guards
- [ ] **2.1.3** Review `src/components/PermissionGate.tsx` - permission checks
- [ ] **2.1.4** Review `src/hooks/usePermissions.ts` - permission logic
- [ ] **2.1.5** Review `src/hooks/useUserRole.ts` - role determination
- [ ] **2.1.6** Verify RLS policies align with frontend permissions

### 2.2 Campaign System Review
- [ ] **2.2.1** Review `src/features/campaigns/` - all components and hooks
- [ ] **2.2.2** Review `src/hooks/useCampaignValidation.ts` - budget validation
- [ ] **2.2.3** Review `src/hooks/useCampaignConditions.ts` - condition logic
- [ ] **2.2.4** Review campaign edge functions in `supabase/functions/`
- [ ] **2.2.5** Verify campaign creation flow end-to-end
- [ ] **2.2.6** Check campaign-gift card linking logic

### 2.3 Gift Card System Review
- [ ] **2.3.1** Review `src/features/gift-cards/` - all components and hooks
- [ ] **2.3.2** Review `src/hooks/useGiftCardProvisioning.ts` - provisioning waterfall
- [ ] **2.3.3** Review `supabase/functions/provision-gift-card-unified/` - main provisioning
- [ ] **2.3.4** Review `supabase/functions/_shared/tillo-client.ts` - Tillo API
- [ ] **2.3.5** Verify balance checking flow
- [ ] **2.3.6** Test gift card redemption flow

### 2.4 Credit System Review
- [ ] **2.4.1** Review `src/hooks/useCreditManagement.ts` - credit operations
- [ ] **2.4.2** Review `src/hooks/useCreditManagement.enhanced.ts` - enhanced version
- [ ] **2.4.3** Verify hierarchical credit flow (Platform → Agency → Client)
- [ ] **2.4.4** Check credit allocation edge functions
- [ ] **2.4.5** Verify atomic credit operations

### 2.5 Contact/CRM System Review
- [ ] **2.5.1** Review `src/features/contacts/` - contact management
- [ ] **2.5.2** Review `src/hooks/useContacts.ts` - contact operations
- [ ] **2.5.3** Review CSV import functionality
- [ ] **2.5.4** Verify data enrichment flow
- [ ] **2.5.5** Check contact list segmentation

### 2.6 Call Center System Review
- [ ] **2.6.1** Review `src/features/call-center/` - call center components
- [ ] **2.6.2** Review SMS opt-in flow
- [ ] **2.6.3** Review `supabase/functions/send-gift-card-sms/` - SMS delivery
- [ ] **2.6.4** Verify Twilio integration
- [ ] **2.6.5** Test redemption code validation

### 2.7 Landing Page System Review
- [ ] **2.7.1** Review `src/features/landing-pages/` - page builder
- [ ] **2.7.2** Review AI landing page generation
- [ ] **2.7.3** Review GrapesJS integration
- [ ] **2.7.4** Verify PURL generation and tracking
- [ ] **2.7.5** Check public page rendering

### 2.8 Edge Function Review
- [ ] **2.8.1** Audit all 66 edge functions for error handling
- [ ] **2.8.2** Verify CORS configuration in all functions
- [ ] **2.8.3** Check rate limiting implementation
- [ ] **2.8.4** Verify logging is consistent
- [ ] **2.8.5** Check for hardcoded secrets (should be env vars)

---

## PHASE 3: CLEANUP & DEDUPLICATION

### 3.1 Identify Duplicate Files
Files to investigate and potentially consolidate:
- [ ] **3.1.1** `src/contexts/AuthContext.tsx` vs `src/core/auth/` - consolidate
- [ ] **3.1.2** Multiple grapesjs config files - consolidate
- [ ] **3.1.3** `src/lib/` vs `src/shared/` vs `src/core/` - organize per refactor plan
- [ ] **3.1.4** Check for duplicate utility functions across files

### 3.2 Remove Unused Files
- [ ] **3.2.1** Scan for unused components: `npx unimported`
- [ ] **3.2.2** Remove files from `docs-archive/` if no longer needed
- [ ] **3.2.3** Clean up `scripts/` - remove obsolete scripts
- [ ] **3.2.4** Remove unused migrations (if any are superseded)

### 3.3 Consolidate Hooks
Potential duplicates to review:
- [ ] **3.3.1** Multiple credit management hooks → consolidate to one
- [ ] **3.3.2** Multiple gift card hooks → organize by domain
- [ ] **3.3.3** Campaign-related hooks → group in features/campaigns/hooks/

### 3.4 Clean Up Types
- [ ] **3.4.1** Remove duplicate type definitions
- [ ] **3.4.2** Move types to appropriate feature modules
- [ ] **3.4.3** Ensure all types are exported from barrel files

### 3.5 Asset Cleanup
- [ ] **3.5.1** Remove Cursor workspace images from `mobul/assets/`
- [ ] **3.5.2** Optimize images in `public/`
- [ ] **3.5.3** Remove unused icons

### 3.6 Dependencies Audit
- [ ] **3.6.1** Run `npm audit` and fix vulnerabilities
- [ ] **3.6.2** Update outdated packages
- [ ] **3.6.3** Remove unused dependencies from package.json

---

## PHASE 4: SECURITY HARDENING

### 4.1 Environment Variables
- [ ] **4.1.1** Audit all env vars - ensure no secrets in code
- [ ] **4.1.2** Verify `.env` is in `.gitignore`
- [ ] **4.1.3** Document all required env vars
- [ ] **4.1.4** Remove any committed secrets from git history

### 4.2 RLS Policy Review
- [ ] **4.2.1** Audit all 442 RLS policies
- [ ] **4.2.2** Verify no policy allows unauthorized data access
- [ ] **4.2.3** Test RLS with different user roles
- [ ] **4.2.4** Check for missing policies on sensitive tables

### 4.3 API Security
- [ ] **4.3.1** Verify all edge functions check authentication
- [ ] **4.3.2** Implement rate limiting on public endpoints
- [ ] **4.3.3** Validate all user inputs
- [ ] **4.3.4** Check for SQL injection vulnerabilities
- [ ] **4.3.5** Verify CORS is properly configured

### 4.4 Frontend Security
- [ ] **4.4.1** Sanitize user-generated HTML content
- [ ] **4.4.2** Check for XSS vulnerabilities
- [ ] **4.4.3** Verify sensitive data isn't logged to console
- [ ] **4.4.4** Remove any API keys from frontend code

### 4.5 Data Protection
- [ ] **4.5.1** Verify PII is properly protected
- [ ] **4.5.2** Check gift card codes are encrypted/hashed where needed
- [ ] **4.5.3** Audit data retention policies
- [ ] **4.5.4** Ensure proper backup procedures

---

## PHASE 5: PRODUCTION CHECKLIST

### 5.1 Infrastructure Setup
- [ ] **5.1.1** Configure production Supabase project
- [ ] **5.1.2** Set up production database with migrations
- [ ] **5.1.3** Deploy all edge functions to production
- [ ] **5.1.4** Configure CDN/hosting (Vercel/Netlify)
- [ ] **5.1.5** Set up custom domain and SSL

### 5.2 Monitoring & Logging
- [ ] **5.2.1** Set up error tracking (Sentry/LogRocket)
- [ ] **5.2.2** Configure uptime monitoring
- [ ] **5.2.3** Set up performance monitoring
- [ ] **5.2.4** Configure alerting for critical errors
- [ ] **5.2.5** Set up database monitoring

### 5.3 Third-Party Services
- [ ] **5.3.1** Configure production Twilio account
- [ ] **5.3.2** Configure production Tillo API credentials
- [ ] **5.3.3** Set up production email provider (Resend/SendGrid)
- [ ] **5.3.4** Configure production Gemini API key
- [ ] **5.3.5** Set up Stripe for payments (if applicable)

### 5.4 Testing
- [ ] **5.4.1** Run full test suite
- [ ] **5.4.2** Perform manual QA on all critical flows
- [ ] **5.4.3** Test on multiple browsers (Chrome, Safari, Firefox, Edge)
- [ ] **5.4.4** Test on mobile devices
- [ ] **5.4.5** Load testing for expected traffic

### 5.5 Documentation
- [ ] **5.5.1** Update README with production setup
- [ ] **5.5.2** Document all API endpoints
- [ ] **5.5.3** Create runbook for common operations
- [ ] **5.5.4** Document disaster recovery procedures
- [ ] **5.5.5** Update user guides

### 5.6 Legal & Compliance
- [ ] **5.6.1** Review Terms of Service
- [ ] **5.6.2** Review Privacy Policy
- [ ] **5.6.3** Verify GDPR compliance (if applicable)
- [ ] **5.6.4** Verify SMS compliance (TCPA/opt-in)
- [ ] **5.6.5** Cookie consent implementation

### 5.7 Final Checklist
- [ ] **5.7.1** Remove all test/demo data from production
- [ ] **5.7.2** Disable debug logging
- [ ] **5.7.3** Verify production environment variables
- [ ] **5.7.4** Test all OAuth flows in production
- [ ] **5.7.5** Backup production database
- [ ] **5.7.6** Create rollback plan
- [ ] **5.7.7** Schedule launch window
- [ ] **5.7.8** Prepare launch announcement

---

## 🎯 QUICK WINS - DO FIRST

These can be done immediately with high impact:

1. **Remove Cursor workspace images** from `mobul/assets/c__Users_*` (easy cleanup)
2. **Fix TypeScript errors** - run `tsc --noEmit` and fix all
3. **Run npm audit** and fix security vulnerabilities
4. **Update .gitignore** to exclude any sensitive files
5. **Add OAuth buttons** to Auth.tsx (UI ready for Phase 1)

---

## 📊 PROGRESS TRACKING

Use this table to track progress:

| Task ID | Description | Status | Assigned | Notes |
|---------|-------------|--------|----------|-------|
| 1.1.1 | Enable Google OAuth | ⬜ Not Started | | |
| 1.1.2 | Enable Apple OAuth | ⬜ Not Started | | |
| ... | ... | ... | | |

Status Legend:
- ⬜ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked
- ⏸️ On Hold

---

## 📞 SUPPORT RESOURCES

- **Supabase Docs**: https://supabase.com/docs
- **Supabase OAuth Guide**: https://supabase.com/docs/guides/auth/social-login
- **Apple Sign-In Docs**: https://developer.apple.com/sign-in-with-apple/
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2

---

**Last Updated**: December 8, 2024
**Version**: 1.0

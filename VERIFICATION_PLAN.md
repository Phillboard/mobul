# COMPREHENSIVE SYSTEM VERIFICATION PLAN

## Purpose
After completing all 5 phases, run this verification to ensure everything works correctly before launch.

---

# VERIFICATION CHECKLIST

## V1: Build & Type Verification

### V1.1 Clean Build
```bash
# Must pass with zero errors
rm -rf node_modules/.vite dist
npm install
npm run build
```
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No warnings (or documented exceptions)
- [ ] Bundle size reasonable (< 5MB initial)

### V1.2 Type Safety
```bash
npx tsc --noEmit --strict
```
- [ ] Zero type errors
- [ ] No `any` types (or documented exceptions)
- [ ] All functions have return types

### V1.3 Linting
```bash
npm run lint
```
- [ ] Zero errors
- [ ] Warnings reviewed and acceptable

---

## V2: Authentication Verification

### V2.1 Email/Password Auth
- [ ] Sign up with new email works
- [ ] Email verification sent (if enabled)
- [ ] Sign in with existing account works
- [ ] Password requirements enforced
- [ ] Sign out clears session
- [ ] Protected routes redirect to /auth when logged out

### V2.2 Google OAuth
- [ ] "Sign in with Google" button visible
- [ ] Clicking redirects to Google
- [ ] After Google auth, redirects to /auth/callback
- [ ] Callback processes and redirects to /
- [ ] User profile created in database
- [ ] User can sign out and sign back in

### V2.3 Apple OAuth
- [ ] "Sign in with Apple" button visible
- [ ] Clicking redirects to Apple
- [ ] After Apple auth, redirects to /auth/callback
- [ ] Callback processes and redirects to /
- [ ] User profile created in database
- [ ] User can sign out and sign back in

### V2.4 Session Management
- [ ] Session persists on page refresh
- [ ] Session expires appropriately
- [ ] Multiple tabs maintain session
- [ ] Role/permissions load correctly

---

## V3: Terminology Verification

### V3.1 Code Consistency
Search codebase for violations:
```bash
# Should find ZERO results for misuse
grep -r "customer" src/ --include="*.ts" --include="*.tsx" | grep -v "// customer" | grep -v "Customer receives"
```

### V3.2 UI Labels
- [ ] "Agency" used correctly (not "company" for agency)
- [ ] "Client" used for businesses served by agencies
- [ ] "Customer" only used for mail recipients
- [ ] "Agent" used for call center users
- [ ] "Unique Code" consistent (not customer_code in UI)

### V3.3 Type Definitions Match Dictionary
- [ ] `src/types/` matches PLATFORM_DICTIONARY.md
- [ ] JSDoc comments explain business terms
- [ ] Terminology constants exist and are used

---

## V4: Designer System Verification

### V4.1 Designer Framework Exists
- [ ] `src/features/designer/` directory exists
- [ ] Types defined in `types/designer.ts`
- [ ] Token parser in `utils/tokenParser.ts`
- [ ] State hook in `hooks/useDesignerState.ts`
- [ ] History hook in `hooks/useDesignerHistory.ts`
- [ ] Export utilities exist

### V4.2 Designer Components Work
- [ ] DesignerCanvas renders
- [ ] BackgroundUploader uploads images
- [ ] ElementLibrary shows elements
- [ ] TokenInserter shows all standard tokens
- [ ] PropertiesPanel edits selected element
- [ ] LayerPanel shows layers

### V4.3 Canvas Functionality
- [ ] Can upload background image
- [ ] Can add text element
- [ ] Can add image element
- [ ] Can add shape element
- [ ] Can add QR code placeholder
- [ ] Can insert template tokens
- [ ] Can select elements
- [ ] Can move elements (drag)
- [ ] Can resize elements
- [ ] Can delete elements
- [ ] Undo works (Ctrl+Z)
- [ ] Redo works (Ctrl+Y)

### V4.4 Template Tokens
All these tokens work:
- [ ] `{{first_name}}` - inserts and previews
- [ ] `{{last_name}}` - inserts and previews
- [ ] `{{full_name}}` - inserts and previews
- [ ] `{{unique_code}}` - inserts and previews
- [ ] `{{company_name}}` - inserts and previews
- [ ] `{{purl}}` - inserts and previews
- [ ] `{{qr_code}}` - inserts and previews
- [ ] `{{gift_card_amount}}` - inserts and previews

### V4.5 AI Designer Chat
- [ ] Chat interface visible
- [ ] Can type message
- [ ] AI responds
- [ ] "Add headline" creates text element
- [ ] "Change color" modifies element
- [ ] "Insert first name" adds token
- [ ] Apply button works

### V4.6 Export Functionality
- [ ] Export to PDF works (mail designer)
- [ ] PDF has correct dimensions
- [ ] Export to HTML works (landing page)
- [ ] HTML is valid and renders
- [ ] Tokens preserved in export
- [ ] Preview with sample data works

### V4.7 Designer Pages
- [ ] /mail-designer route works
- [ ] /landing-page-designer route works
- [ ] /email-designer route works
- [ ] Can save design
- [ ] Can load saved design
- [ ] Design links to campaign correctly

---

## V5: GrapesJS Removal Verification

### V5.1 No GrapesJS Code
```bash
# All should return ZERO results
grep -r "grapesjs" src/ --include="*.ts" --include="*.tsx"
grep -r "GrapesJS" src/ --include="*.ts" --include="*.tsx"
grep -r "@grapesjs" package.json
```
- [ ] No grapesjs imports
- [ ] No grapesjs in package.json
- [ ] No grapesjs config files
- [ ] Old designer pages removed or refactored

---

## V6: Core Features Verification

### V6.1 Campaign Management
- [ ] Can create new campaign
- [ ] Campaign wizard steps work
- [ ] Can select mail design
- [ ] Can select audience
- [ ] Can configure gift card
- [ ] Can set conditions
- [ ] Can save as draft
- [ ] Can activate campaign
- [ ] Campaign detail page loads

### V6.2 Gift Card System
- [ ] Gift card pools load
- [ ] Can view pool inventory
- [ ] Balance checking works
- [ ] Provisioning flow works
- [ ] SMS delivery works (if configured)
- [ ] Redemption flow works

### V6.3 Contact/CRM
- [ ] Contacts list loads
- [ ] Can create contact
- [ ] Can edit contact
- [ ] Can import CSV
- [ ] Can create audience/list
- [ ] Can export contacts

### V6.4 Call Center
- [ ] Call center dashboard loads
- [ ] Can search by unique code
- [ ] Can process redemption
- [ ] SMS opt-in flow works
- [ ] Scripts load correctly

### V6.5 Landing Pages
- [ ] Landing page list loads
- [ ] Designer creates pages
- [ ] Public URL accessible
- [ ] PURL routing works
- [ ] Form submission works
- [ ] Tokens replaced correctly

---

## V7: Edge Functions Verification

### V7.1 Critical Functions Test
Test these edge functions work:
- [ ] `provision-gift-card-unified` - returns success
- [ ] `validate-redemption-code` - validates correctly
- [ ] `send-gift-card-sms` - sends (or errors gracefully without Twilio)
- [ ] `submit-lead-form` - creates contact
- [ ] `handle-purl` - routes correctly

### V7.2 Auth on Protected Functions
- [ ] Functions reject unauthenticated requests
- [ ] Functions check permissions
- [ ] Proper error codes returned

### V7.3 Input Validation
- [ ] Invalid input returns 400
- [ ] Missing required fields caught
- [ ] Type mismatches caught

---

## V8: Security Verification

### V8.1 No Secrets in Code
```bash
# Search for potential secrets
grep -r "sk_live" src/ supabase/
grep -r "api_key.*=" src/ supabase/
grep -r "password.*=" src/ supabase/
grep -r "secret.*=" src/ supabase/
```
- [ ] No hardcoded API keys
- [ ] No hardcoded passwords
- [ ] All secrets in environment variables

### V8.2 .gitignore Complete
- [ ] `.env` ignored
- [ ] `.env.local` ignored
- [ ] `*.key` ignored
- [ ] `*.pem` ignored
- [ ] `*.p12` ignored
- [ ] `node_modules/` ignored

### V8.3 No Sensitive Files in Repo
```bash
git ls-files | grep -E "\.(key|pem|p12|env)$"
```
- [ ] No key files tracked
- [ ] No environment files tracked

### V8.4 RLS Active
- [ ] All sensitive tables have RLS enabled
- [ ] Policies restrict by tenant/user

---

## V9: Performance Verification

### V9.1 Bundle Analysis
```bash
npm run build -- --analyze
```
- [ ] Initial bundle < 500KB
- [ ] Lazy loading implemented
- [ ] No duplicate large dependencies

### V9.2 Lighthouse Scores
Run on key pages:
- [ ] Dashboard: Performance > 70
- [ ] Campaign List: Performance > 70
- [ ] Designer: Performance > 60 (heavy page)

### V9.3 Load Times
- [ ] Initial page load < 3s
- [ ] Navigation between pages < 1s
- [ ] Designer loads < 5s

---

## V10: Documentation Verification

### V10.1 Required Docs Exist
- [ ] `README.md` - updated and accurate
- [ ] `PLATFORM_DICTIONARY.md` - complete
- [ ] `docs/OAUTH_SETUP.md` - complete
- [ ] `docs/ENVIRONMENT_SETUP.md` - complete
- [ ] `docs/DEPLOYMENT_RUNBOOK.md` - complete
- [ ] `docs/LAUNCH_CHECKLIST.md` - complete

### V10.2 Docs Are Accurate
- [ ] Setup instructions work when followed
- [ ] Environment variables list complete
- [ ] No references to removed features (GrapesJS)

---

## V11: Error Handling Verification

### V11.1 Network Errors
- [ ] Offline shows appropriate message
- [ ] API errors show user-friendly message
- [ ] Retry logic works where implemented

### V11.2 Form Validation
- [ ] Required fields enforced
- [ ] Invalid input shows error
- [ ] Errors clear when fixed

### V11.3 Error Boundaries
- [ ] Component crash doesn't break entire app
- [ ] Error boundary shows fallback UI
- [ ] Can recover from error state

---

## V12: Cross-Browser Testing

### V12.1 Chrome (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Designer functions correctly

### V12.2 Safari (Latest)
- [ ] All features work
- [ ] OAuth redirects work
- [ ] Designer functions correctly

### V12.3 Firefox (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Designer functions correctly

### V12.4 Edge (Latest)
- [ ] All features work
- [ ] No console errors
- [ ] Designer functions correctly

---

## V13: Mobile Responsiveness

### V13.1 Mobile Viewport (375px)
- [ ] Navigation works
- [ ] Auth pages usable
- [ ] Dashboard readable
- [ ] Tables scroll horizontally
- [ ] Touch targets adequate (44px min)

### V13.2 Tablet Viewport (768px)
- [ ] Layout adjusts appropriately
- [ ] Designer usable (may have limitations)
- [ ] No horizontal overflow

---

## V14: Accessibility Verification

### V14.1 Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus visible on all elements
- [ ] Can submit forms with Enter
- [ ] Can close modals with Escape

### V14.2 Screen Reader Basics
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Buttons have accessible names
- [ ] Headings in logical order

### V14.3 Color Contrast
- [ ] Text meets WCAG AA (4.5:1)
- [ ] Interactive elements distinguishable
- [ ] Errors not indicated by color alone

---

# VERIFICATION SUMMARY TEMPLATE

After running all checks, fill out:

```
## Verification Report

**Date**: _______________
**Verified By**: _______________
**Build Version**: _______________

### Results Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| V1: Build | /3 | | |
| V2: Auth | /4 | | |
| V3: Terminology | /3 | | |
| V4: Designer | /7 | | |
| V5: GrapesJS Removed | /1 | | |
| V6: Core Features | /5 | | |
| V7: Edge Functions | /3 | | |
| V8: Security | /4 | | |
| V9: Performance | /3 | | |
| V10: Documentation | /2 | | |
| V11: Error Handling | /3 | | |
| V12: Browsers | /4 | | |
| V13: Mobile | /2 | | |
| V14: Accessibility | /3 | | |

### Critical Issues Found
1. 
2. 
3. 

### Recommendations
1. 
2. 
3. 

### Launch Ready: YES / NO

**Signature**: _______________
```

---

# AUTOMATED TEST COMMANDS

Run these before manual testing:

```bash
# 1. Install dependencies fresh
rm -rf node_modules package-lock.json
npm install

# 2. Type check
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. Run tests
npm test

# 5. Build
npm run build

# 6. Check for secrets
grep -r "sk_live\|api_key\|password\|secret" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env" | grep -v "import.meta.env"

# 7. Check for grapesjs remnants
grep -ri "grapesjs" src/ package.json

# 8. Audit dependencies
npm audit

# 9. Check unused dependencies
npx depcheck

# 10. Bundle size
npm run build && du -sh dist/
```

---

**END OF VERIFICATION PLAN**

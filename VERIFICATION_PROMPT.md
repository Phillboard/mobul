# COMPREHENSIVE VERIFICATION PROMPT

Copy and paste this entire prompt into Cursor after completing all 5 phases.

---

```
You are performing a COMPREHENSIVE SYSTEM VERIFICATION before launch.

Read VERIFICATION_PLAN.md for the full checklist.

## YOUR MISSION

Run through EVERY verification category and report findings. Be thorough - this is the final check before production.

## EXECUTION STEPS

### Step 1: Build & Type Verification
Run these commands and report results:
```bash
rm -rf node_modules/.vite dist
npm run build
npx tsc --noEmit
npm run lint
```

Report:
- Build status (pass/fail)
- Number of type errors
- Number of lint errors
- Bundle size

### Step 2: Check for GrapesJS Remnants
Search for any remaining GrapesJS code:
```bash
grep -ri "grapesjs" src/ --include="*.ts" --include="*.tsx"
grep -r "@grapesjs" package.json
```

Report: List any files still containing GrapesJS references

### Step 3: Check for Secrets in Code
Search for potential hardcoded secrets:
```bash
grep -r "sk_live" src/ supabase/
grep -r "pk_live" src/ supabase/
grep -rE "api[_-]?key\s*[:=]" src/ supabase/ --include="*.ts"
grep -rE "password\s*[:=]" src/ supabase/ --include="*.ts"
grep -rE "secret\s*[:=]" src/ supabase/ --include="*.ts"
```

Report: List any potential secrets found (excluding env variable references)

### Step 4: Verify Terminology Consistency
Check that PLATFORM_DICTIONARY.md terms are used correctly:

1. Search for "customer" in UI-facing code - should only refer to mail recipients
2. Search for "company" - verify it's not used where "client" should be
3. Check that user roles match dictionary (admin, tech_support, agency_owner, company_owner, call_center, developer)

Report: List any terminology violations

### Step 5: Verify Designer System Structure
Check that the new designer framework exists:

Required files:
- src/features/designer/index.ts
- src/features/designer/types/designer.ts
- src/features/designer/utils/tokenParser.ts
- src/features/designer/hooks/useDesignerState.ts
- src/features/designer/hooks/useDesignerHistory.ts
- src/features/designer/hooks/useDesignerAI.ts
- src/features/designer/hooks/useDesignerExport.ts
- src/features/designer/components/DesignerCanvas.tsx
- src/features/designer/components/BackgroundUploader.tsx
- src/features/designer/components/ElementLibrary.tsx
- src/features/designer/components/TokenInserter.tsx
- src/features/designer/components/PropertiesPanel.tsx
- src/features/designer/components/LayerPanel.tsx
- src/features/designer/components/DesignerAIChat.tsx

Report: List which files exist and which are missing

### Step 6: Verify Template Tokens
Check src/features/designer/utils/tokenParser.ts (or src/lib/templates/tokens.ts) contains ALL standard tokens:

Required tokens:
- {{first_name}}
- {{last_name}}
- {{full_name}}
- {{unique_code}}
- {{company_name}}
- {{purl}}
- {{qr_code}}
- {{gift_card_amount}}

Report: List which tokens are defined and which are missing

### Step 7: Verify OAuth Implementation
Check that OAuth is properly implemented:

Required in src/contexts/AuthContext.tsx:
- signInWithGoogle function
- signInWithApple function
- Both exported in context value

Required files:
- src/pages/AuthCallback.tsx

Required in src/pages/Auth.tsx:
- Google sign-in button
- Apple sign-in button
- Error handling for OAuth errors

Required route:
- /auth/callback in App.tsx

Report: What's implemented and what's missing

### Step 8: Verify Edge Functions
Check critical edge functions exist and have proper structure:

Check these functions in supabase/functions/:
1. provision-gift-card-unified/index.ts
2. validate-redemption-code/index.ts
3. send-gift-card-sms/index.ts
4. submit-lead-form/index.ts
5. handle-purl/index.ts
6. allocate-credit/index.ts

For each, verify:
- Has CORS headers
- Has authentication check (where required)
- Has input validation
- Has error handling

Report: Status of each function

### Step 9: Verify Documentation
Check required documentation exists:

Required files:
- README.md (updated)
- PLATFORM_DICTIONARY.md
- docs/OAUTH_SETUP.md
- docs/ENVIRONMENT_SETUP.md (or similar)
- docs/DEPLOYMENT_RUNBOOK.md (or similar)

Report: Which docs exist and their completeness

### Step 10: Check for Unused Files
Identify files that may be unused:

1. Check for components not imported anywhere
2. Check for hooks not used
3. Check for old backup files (*_old.ts, *.bak, etc.)
4. Check for test/temp files that shouldn't be in repo

Report: List potentially unused files

### Step 11: Dependency Audit
Run:
```bash
npm audit
npx depcheck
```

Report:
- Number of vulnerabilities (critical, high, medium, low)
- List of unused dependencies
- List of missing dependencies

### Step 12: .gitignore Verification
Verify .gitignore includes:
- .env
- .env.local
- .env.*.local
- *.key
- *.pem
- *.p12
- node_modules/
- dist/
- .vercel/

Report: What's missing from .gitignore

---

## OUTPUT FORMAT

After running all checks, provide this report:

```
# VERIFICATION REPORT

## Summary
- **Date**: [current date]
- **Build**: [PASS/FAIL]
- **Types**: [# errors]
- **Lint**: [# errors]

## Critical Issues (Must Fix Before Launch)
1. [Issue]: [Description] - [File/Location]
2. ...

## Warnings (Should Fix)
1. [Warning]: [Description] - [File/Location]
2. ...

## Missing Components
### Designer System
- [ ] [Component]: [Status]
- ...

### OAuth
- [ ] [Component]: [Status]
- ...

### Documentation
- [ ] [Doc]: [Status]
- ...

## Security Findings
- [Finding 1]
- [Finding 2]
- ...

## Terminology Violations
- [Violation 1]: [File] - [Line/Context]
- ...

## Recommendations
1. [Priority 1 recommendation]
2. [Priority 2 recommendation]
3. ...

## Launch Readiness
**READY FOR LAUNCH**: [YES/NO]

**Blocking Issues**: [List any issues that MUST be fixed]

**Risk Assessment**: [LOW/MEDIUM/HIGH]
```

---

## AUTOMATIC FIXES

If you find issues, fix them immediately:
- Type errors: Fix the type
- Lint errors: Fix the code
- Missing imports: Add them
- Unused imports: Remove them
- Terminology violations: Update to match dictionary
- Missing .gitignore entries: Add them

Report what you fixed in the report.

---

Begin verification now. Start with Step 1.
```

---

## QUICK VERSION (Shorter Prompt)

If the full prompt is too long, use this condensed version:

```
Run comprehensive verification per VERIFICATION_PLAN.md.

Execute these checks:
1. npm run build && npx tsc --noEmit && npm run lint
2. Search for "grapesjs" remnants
3. Search for hardcoded secrets
4. Verify PLATFORM_DICTIONARY.md terms used correctly
5. Verify src/features/designer/ structure complete
6. Verify all 8 template tokens defined
7. Verify OAuth (signInWithGoogle, signInWithApple, AuthCallback)
8. Spot-check 5 edge functions for auth/validation
9. Verify docs exist (README, OAUTH_SETUP, DICTIONARY)
10. npm audit && npx depcheck
11. Verify .gitignore complete

Fix any issues you find immediately.

Output a verification report with:
- Critical issues (blocking launch)
- Warnings (should fix)
- Missing components
- Security findings
- Launch readiness: YES/NO
```

---

## AFTER CURSOR COMPLETES VERIFICATION

### If Issues Found:

```
Fix all CRITICAL issues identified in the verification report. 
Update LAUNCH_PROGRESS.md with fixes made.
Then re-run verification to confirm fixes.
```

### If Verification Passes:

```
Verification passed. Create a final LAUNCH_READY.md document that includes:
1. Summary of all systems verified
2. Known limitations
3. Manual steps required (OAuth provider setup, etc.)
4. Rollback procedure
5. Support contacts
6. Go-live checklist for launch day
```

---

## MANUAL TESTING CHECKLIST

After Cursor verification, YOU should manually test:

### Authentication
1. [ ] Create new account with email
2. [ ] Sign in with email
3. [ ] Sign in with Google (after configuring)
4. [ ] Sign in with Apple (after configuring)
5. [ ] Sign out
6. [ ] Password reset flow

### Designer
1. [ ] Open mail designer
2. [ ] Upload a background image
3. [ ] Add text element
4. [ ] Insert {{first_name}} token
5. [ ] Move and resize element
6. [ ] Use AI chat to add element
7. [ ] Export to PDF
8. [ ] Save design

### Campaign Flow
1. [ ] Create new campaign
2. [ ] Complete all wizard steps
3. [ ] Save as draft
4. [ ] View campaign detail

### Call Center
1. [ ] Search by unique code
2. [ ] Process redemption
3. [ ] Verify SMS flow (with Twilio configured)

---

*Run verification after all 5 phases complete. Address all critical issues before launch.*

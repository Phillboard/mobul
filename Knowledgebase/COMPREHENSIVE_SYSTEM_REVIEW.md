# MOBUL - COMPREHENSIVE SYSTEM REVIEW

**Date:** December 9, 2025  
**Reviewer:** Professional Development Team Assessment  
**Purpose:** Full codebase audit for new developer onboarding, duplicate removal, and system optimization  
**Status:** 🔴 CRITICAL ISSUES FOUND - Restructuring Required

---

## EXECUTIVE SUMMARY

### Overall Assessment: 6/10 (Functional but Needs Major Cleanup)

The Mobul platform is a **feature-rich** direct mail marketing system with powerful gift card integration. However, the codebase suffers from:

1. **CRITICAL: Massive code duplication** - Same components/hooks exist in 2-3 places
2. **Architecture fragmentation** - Three competing organizational patterns
3. **Migration overload** - 195+ database migration files
4. **Edge function sprawl** - 95 functions (README says 66 - 29 potentially orphaned)
5. **Root-level file chaos** - 25+ markdown files that should be in docs

**Bottom Line:** The system WORKS but is unmaintainable. A new developer would be completely lost trying to understand which files are canonical vs deprecated.

---

## CRITICAL FINDING #1: TRIPLE ARCHITECTURE DUPLICATION

### The Problem
The codebase has **THREE competing architectural patterns** with the SAME code duplicated across them:

```
ARCHITECTURE 1 (Legacy - Still Used):
src/components/     ← ~200 components
src/hooks/          ← ~80 hooks  
src/lib/            ← utilities

ARCHITECTURE 2 (Feature-Based - Partial Migration):
src/features/ace-forms/components/     ← SAME components duplicated!
src/features/gift-cards/hooks/         ← SAME hooks duplicated!
src/features/campaigns/utils/          ← SAME utilities duplicated!

ARCHITECTURE 3 (Clean Architecture - Barely Started):
src/shared/         ← MORE duplicates
src/core/           ← MORE duplicates
src/app/            ← Entry points only
```

### Evidence of Duplication

| Component/Hook | Location 1 | Location 2 | Location 3 |
|---------------|------------|------------|------------|
| `FormBuilder.tsx` | `components/ace-forms/` | `features/ace-forms/components/` | - |
| `GiftCardDisplay.tsx` | `components/ace-forms/` | `features/ace-forms/components/` | - |
| `useGiftCards.ts` | `hooks/` | `features/gift-cards/hooks/` | - |
| `useCampaignConditions.ts` | `hooks/` | `features/campaigns/hooks/` | - |
| `ErrorBoundary.tsx` | `components/` | `components/ErrorBoundaries/` | `shared/components/ErrorBoundaries/` |
| `KeyboardShortcutsHelp.tsx` | `components/ace-forms/` | `components/shared/` | `shared/components/` |
| `demo-data-generator.ts` | `lib/demo/` | `features/admin/demo/` | - |
| `billing-utils.ts` | `lib/gift-cards/` | `features/gift-cards/utils/` | - |

**Impact:** 
- Bugs fixed in one location may not be fixed in duplicates
- Confusion about which file to import
- Increased bundle size
- Maintenance nightmare

---

## CRITICAL FINDING #2: HOOKS DUPLICATION ANALYSIS

### Root `src/hooks/` Directory (80 files - ALL POTENTIALLY DUPLICATED)

These hooks exist BOTH in `src/hooks/` AND in `src/features/*/hooks/`:

**Gift Card Hooks (Duplicated):**
- `useGiftCards.ts` → exists in BOTH locations
- `useGiftCardBrands.ts` → exists in BOTH locations
- `useGiftCardPools.ts` → exists in BOTH locations
- `useGiftCardProvisioning.ts` → exists in BOTH locations
- `useGiftCardBilling.ts` → exists in BOTH locations
- `useGiftCardCostEstimate.ts` → exists in BOTH locations
- `useGiftCardDenominations.ts` → exists in BOTH locations
- `useBrandLookup.ts` → exists in BOTH locations
- `useClientGiftCards.ts` → exists in BOTH locations
- `useClientAvailableGiftCards.ts` → exists in BOTH locations

**Campaign Hooks (Duplicated):**
- `useCampaignConditions.ts` → exists in BOTH locations
- `useCampaignCostEstimate.ts` → exists in BOTH locations
- `useCampaignCreateForm.ts` → exists in BOTH locations
- `useCampaignGiftCardConfig.ts` → exists in BOTH locations
- `useCampaignValidation.ts` → exists in BOTH locations
- `useCampaignVersions.ts` → exists in BOTH locations
- `useCampaignWithRelations.ts` → exists in BOTH locations

**Contact Hooks (Duplicated):**
- `useContacts.ts` → exists in BOTH locations
- `useContactLists.ts` → exists in BOTH locations
- `useContactExport.ts` → exists in BOTH locations
- `useContactTags.ts` → exists in BOTH locations
- `useSmartCSVParser.ts` → exists in BOTH locations

**Call Center Hooks (Duplicated):**
- `useCallAnalytics.ts` → exists in BOTH locations
- `useCallCenterScripts.ts` → exists in BOTH locations
- `useCallTracking.ts` → exists in BOTH locations

**TOTAL DUPLICATED HOOKS: ~40+ files**

---

## CRITICAL FINDING #3: COMPONENTS DUPLICATION

### Same Pattern - Components Exist in Multiple Locations

**Ace Forms Components (30 files duplicated):**
```
src/components/ace-forms/FormBuilder.tsx
src/features/ace-forms/components/FormBuilder.tsx  ← DUPLICATE!
```

**Gift Card Components (35+ files duplicated):**
```
src/components/gift-cards/AddBrandDialog.tsx
src/features/gift-cards/components/AddBrandDialog.tsx  ← DUPLICATE!
```

**Call Center Components (20+ files duplicated):**
```
src/components/call-center/CallCenterRedemptionPanel.tsx
src/features/call-center/components/CallCenterRedemptionPanel.tsx  ← DUPLICATE!
```

---

## FINDING #4: ROOT-LEVEL FILE CHAOS

### 25+ Markdown Files at Root (Should Be in `/docs` or `/Knowledgebase`)

**Files That Should Move:**
- `AI_BACKGROUND_SYSTEM_PLAN.md` → `/Knowledgebase/plans/`
- `AI_BACKGROUND_SYSTEM_PROMPTS.md` → `/Knowledgebase/prompts/`
- `API_FIRST_MASTER_INDEX.md` → `/docs/`
- `CURSOR_PROMPTS.md` → `/Knowledgebase/prompts/`
- `CURSOR_QUICK_START.md` → `/Knowledgebase/`
- `DESIGNER_CLEANUP_PLAN.md` → `/Knowledgebase/plans/`
- `DESIGNER_CLEANUP_PROMPTS.md` → `/Knowledgebase/prompts/`
- `DESIGNER_FIX_PLAN.md` → `/Knowledgebase/plans/`
- `DESIGNER_FIX_PROMPTS.md` → `/Knowledgebase/prompts/`
- `LAUNCH_CHECKLIST.md` → `/docs/operations/`
- `LAUNCH_COMPLETE_REVIEW.md` → `/docs/`
- `LAUNCH_PRD.md` → `/Knowledgebase/`
- `LAUNCH_PROGRESS.md` → `/docs/`
- `LOGGING_POLICY.md` → `/docs/operations/`
- `PLATFORM_DICTIONARY.md` → `/Knowledgebase/`
- `REFACTOR_STATUS.md` → `/docs/`
- `VERIFICATION_PLAN.md` → `/docs/`
- `VERIFICATION_PROMPT.md` → `/Knowledgebase/prompts/`

**Recommended Root Files:**
- `README.md` ✅ Keep
- `.env.example` (missing - should create)
- `package.json` ✅ Keep
- Config files (vite, tailwind, tsconfig, etc.) ✅ Keep

---

## FINDING #5: DATABASE MIGRATION OVERLOAD

### 195+ Migration Files - Need Squashing

**Migration File Statistics:**
- Total migrations: 195+
- Date range: November 10, 2025 - December 2025
- Average: ~5-10 migrations per day during active development

**Problems:**
1. Many migrations are incremental fixes that could be squashed
2. Some migrations may have failed or been skipped
3. No clear migration naming convention (uses UUIDs)
4. Hard to understand migration history

**Recommendation:** Create a consolidated "baseline" migration for fresh deployments

---

## FINDING #6: EDGE FUNCTION DISCREPANCY

### README Claims 66 Functions - Actual Count: 95

**Actual Edge Functions (95 total):**

**AI & Generation (9):**
- ai-design-chat
- ai-landing-page-chat
- ai-landing-page-generate
- ai-landing-page-generate-simple
- dr-phillip-chat
- generate-ace-form-ai
- generate-landing-page-ai
- generate-prototype
- openai-chat

**Gift Card System (15):**
- check-gift-card-balance
- check-inventory-card-balance
- claim-and-provision-card
- import-gift-cards
- provision-gift-card
- provision-gift-card-for-call-center
- provision-gift-card-from-api
- provision-gift-card-unified
- purchase-gift-cards
- redeem-customer-code
- redeem-gift-card-embed
- transfer-admin-cards
- validate-gift-card-code
- validate-gift-card-configuration
- validate-redemption-code

**Campaign & Conditions (10):**
- complete-condition
- diagnose-campaign-config
- evaluate-conditions
- migrate-existing-campaigns
- process-time-delayed-conditions
- save-campaign-draft
- save-campaign-version
- validate-campaign-budget
- generate-recipient-tokens
- handle-purl

**Messaging (10):**
- send-admin-alert
- send-alert-notification
- send-approval-notification
- send-comment-notification
- send-email
- send-form-notification
- send-gift-card-email
- send-gift-card-sms
- send-inventory-alert
- send-sms-opt-in
- send-user-invitation
- send-verification-email
- retry-failed-sms

**Contact/Import (7):**
- export-audience
- import-audience
- import-campaign-codes
- import-contacts
- import-customer-codes
- approve-customer-code
- bulk-approve-codes

**Demo/Testing (7):**
- cleanup-demo-data
- cleanup-simulated-data
- cleanup-stuck-gift-cards
- enrich-demo-data
- generate-complete-demo-analytics
- generate-demo-data
- reset-demo-database
- seed-documentation
- simulate-mail-tracking

**Integrations (9):**
- crm-webhook-receiver
- dispatch-zapier-event
- eztexting-webhook
- handle-call-webhook
- handle-sms-response
- stripe-webhook
- trigger-webhook
- zapier-incoming-webhook
- lookup-tillo-brand

**Admin/System (10):**
- accept-invitation
- allocate-credit
- assign-tracked-numbers
- calculate-credit-requirements
- check-alert-triggers
- diagnose-provisioning-setup
- export-database
- export-pool-cards
- generate-api-key
- initialize-default-pipeline
- monitor-gift-card-system
- update-organization-status
- validate-environment

**Telephony (6):**
- handle-incoming-call
- complete-call-disposition
- provision-twilio-number
- release-twilio-number
- update-call-status
- submit-lead-form
- submit-ace-form

**Other (5):**
- create-preview-link
- generate-apple-wallet-pass
- generate-google-wallet-pass
- generate-favicon
- submit-to-vendor
- track-mail-delivery

**Potentially Orphaned Functions (Need Verification):**
- `provision-gift-card` vs `provision-gift-card-unified` (which is canonical?)
- `ai-landing-page-generate` vs `ai-landing-page-generate-simple` (both needed?)
- Multiple gift card provision functions - consolidation needed

---

## FINDING #7: KNOWN BROKEN FEATURES

### From Meeting Transcripts & Code Analysis:

**1. Dr. Phillip AI Chat - BROKEN**
- **Issue:** "No response from AI" error
- **Root Cause:** Response parsing mismatch (`data.content` vs `data.message`)
- **Location:** `src/components/DrPhillipChat.tsx`, edge function `dr-phillip-chat`
- **Status:** 🔴 Not Fixed

**2. Landing Page System - NEEDS REBUILD**
- **Issue:** From Nov 27 meeting: "I need to rebuild the landing page system"
- **Status:** 🟡 In Progress (AI features added but core system not rebuilt)

**3. Mail Designer System - NEEDS REBUILD**  
- **Issue:** From Nov 27 meeting: "I need to rebuild... the mail system"
- **Status:** 🟡 Partial (designer folder exists but incomplete)

**4. Campaign Wizard - Multiple Issues**
- Form validation inconsistent
- Some steps can be skipped improperly
- Gift card configuration sometimes not saved

**5. Call Center Redemption - V1 vs V2 Confusion**
- Two files: `CallCenterRedemptionPanel.tsx` and `CallCenterRedemptionPanelV2.tsx`
- Unclear which is production, which is deprecated

---

## FINDING #8: GITHUB ISSUES STATUS (11 Issues)

### ⚠️ ACTION REQUIRED: Need GitHub Issues Export

**You need to provide the 11 GitHub issues.** Here's how:

1. Go to your GitHub repository
2. Navigate to Issues tab
3. For each issue, copy:
   - Issue number and title
   - Description
   - Labels (open/closed)
   - Any comments
   - Related PRs

**Or run this command:**
```bash
gh issue list --repo Phillboard/mobul --state all --json number,title,state,labels,body
```

**Based on meeting transcripts, likely issues include:**
- Gift card provisioning bugs
- Campaign condition evaluation issues
- SMS opt-in flow problems
- Credit allocation edge cases
- User permission/role bugs

---

## FINDING #9: TECHNICAL DEBT SUMMARY

### High Priority Debt:

| Issue | Severity | Effort | Impact |
|-------|----------|--------|--------|
| Duplicate components (40+) | 🔴 Critical | High | Maintenance nightmare |
| Duplicate hooks (40+) | 🔴 Critical | High | Bug propagation risk |
| Triple architecture | 🔴 Critical | Very High | Confusion/Onboarding |
| 195 migrations | 🟡 Medium | Medium | Fresh deploy complexity |
| Root file chaos | 🟢 Low | Low | Organization |
| Edge function discrepancy | 🟡 Medium | Medium | Documentation accuracy |

### Code Quality Issues:

1. **Inconsistent imports** - Some files import from `@/components`, others from `@/features`
2. **Mixed export patterns** - Default vs named exports inconsistent
3. **Type safety gaps** - Some `any` types remain
4. **Missing error boundaries** - Not all features wrapped
5. **Inconsistent logging** - Mix of console.log and logger utility

---

## FINDING #10: DEPENDENCY ANALYSIS

### Package.json Review:

**Potentially Unused Dependencies:**
- `@anthropic-ai/sdk` - Only if Claude integration removed
- `openai` - If using Gemini only
- `canvas` (in node_modules) - Heavy, may not be needed
- `fabric` - Only used if visual editor active

**Missing Dependencies:**
- No `@types/react-color` (using react-color)
- No explicit test runner listed (vitest is there but minimal config)

**Version Concerns:**
- React 18.3.1 ✅ Current
- Vite 5.4.19 ✅ Current  
- TypeScript 5.8.3 ✅ Current
- Supabase 2.81.0 ✅ Current

**Bundle Size Concerns:**
- `fabric` - ~500KB (visual canvas library)
- `@grapesjs/*` - Large but necessary for visual editor
- `recharts` - Charts library, reasonable

---

## ARCHITECTURAL RECOMMENDATION

### Target Architecture (Clean Feature-Based):

```
src/
├── app/                    # Application entry point
│   ├── providers/          # All context providers
│   ├── routes/             # Route definitions
│   └── App.tsx             # Root component
│
├── core/                   # Shared infrastructure
│   ├── api/                # API client, error handling
│   ├── auth/               # Authentication (AuthProvider, hooks)
│   ├── config/             # Feature flags, settings
│   └── services/           # External services (email, monitoring)
│
├── features/               # Feature modules (CANONICAL LOCATION)
│   ├── ace-forms/
│   │   ├── components/     # Feature-specific components
│   │   ├── hooks/          # Feature-specific hooks
│   │   ├── types/          # Feature types
│   │   ├── utils/          # Feature utilities
│   │   └── index.ts        # Public exports
│   ├── campaigns/
│   ├── call-center/
│   ├── contacts/
│   ├── gift-cards/         # ⭐ CORE FEATURE
│   ├── landing-pages/
│   ├── mail-designer/
│   └── settings/
│
├── shared/                 # Truly shared utilities
│   ├── components/         # UI primitives (Button, Card, etc.)
│   ├── hooks/              # Generic hooks (useDebounce, etc.)
│   ├── types/              # Shared type definitions
│   └── utils/              # Pure utility functions
│
├── pages/                  # Route pages (thin wrappers)
│
└── integrations/           # External service clients
    └── supabase/
```

### Migration Strategy:

**Phase 1: Establish Canonical Locations**
- Designate `features/*/` as canonical for all feature code
- Keep `shared/` for truly generic code only
- Delete `components/`, `hooks/`, `lib/` after migration

**Phase 2: Deduplicate**
- For each duplicate, determine canonical version
- Update all imports to point to canonical
- Delete duplicates

**Phase 3: Consolidate**
- Merge 195 migrations into baseline + recent
- Audit edge functions, remove orphaned
- Clean root directory

---


## DATA I STILL NEED FROM YOU

Before I can create the complete fix plan, I need you to provide:

### 1. GitHub Issues Export (CRITICAL)
```bash
# Run this in your terminal:
gh issue list --repo Phillboard/mobul --state all --limit 100

# Or manually go to GitHub and copy each issue's:
# - Number, Title, Description, Status, Labels
```

### 2. Run These Diagnostic Commands

**Check for TypeScript errors:**
```bash
cd "C:\Users\Acer Nitro 5\Desktop\Cursor Mobul\mobul"
npx tsc --noEmit 2>&1 | head -100
```

**Check for unused exports:**
```bash
npx ts-prune | head -50
```

**Check npm for issues:**
```bash
npm audit
npm outdated
```

**Check for unused dependencies:**
```bash
npx depcheck
```

### 3. Test These Features & Report Status

Please manually test and tell me the status (Working/Broken/Partial):

| Feature | Test Action | Status |
|---------|-------------|--------|
| Dr. Phillip Chat | Click chat icon, send message | ? |
| Campaign Creation | Create new campaign via wizard | ? |
| Gift Card Selection | Select brand/denomination in campaign | ? |
| Call Center Redemption | Enter code, complete workflow | ? |
| Landing Page Creation | Create AI-generated landing page | ? |
| Contact Import | Upload CSV, verify import | ? |
| Form Builder | Create and save form | ? |

### 4. Confirm Current Production URL

What is the current production/staging URL so I can verify which features are deployed?

---

## PRELIMINARY ACTION PLAN

Based on current findings, here's the phased cleanup approach:

### PHASE 1: Documentation & Audit (Week 1)
**Goal:** Complete picture of what exists and what's broken

1. Export all GitHub issues
2. Run diagnostic commands
3. Test all major features
4. Document broken features
5. Create feature inventory

### PHASE 2: Architectural Consolidation (Week 2-3)
**Goal:** Single source of truth for all code

1. Establish canonical locations
2. Create import aliases
3. Migrate to feature-based architecture
4. Delete duplicates
5. Update all imports

### PHASE 3: Database & Migrations (Week 3)
**Goal:** Clean database state

1. Audit all 195 migrations
2. Create baseline migration
3. Squash redundant migrations
4. Document schema

### PHASE 4: Edge Functions Audit (Week 4)
**Goal:** Know exactly what functions exist and are used

1. Map each function to UI usage
2. Identify orphaned functions
3. Consolidate duplicates
4. Update documentation

### PHASE 5: Bug Fixes (Week 5-6)
**Goal:** Fix all known broken features

1. Dr. Phillip Chat fix
2. Campaign wizard fixes
3. Gift card provisioning audit
4. Call center workflow verification

### PHASE 6: Final Cleanup (Week 6)
**Goal:** Production-ready codebase

1. Remove all deprecated code
2. Update README
3. Create developer onboarding guide
4. Final testing

---

## CURSOR PROMPTS FOR CLEANUP

Once you provide the GitHub issues and test results, I will create detailed Cursor prompts for each phase. Here's a preview:

### Sample Prompt: Deduplicate Hooks

```markdown
# TASK: Deduplicate Gift Card Hooks

## Context
There are duplicate hooks in:
- src/hooks/useGiftCards.ts
- src/features/gift-cards/hooks/useGiftCards.ts

## Instructions
1. Compare both files to identify the most complete version
2. Designate src/features/gift-cards/hooks/useGiftCards.ts as canonical
3. Search codebase for all imports of the hooks version
4. Update all imports to use features version
5. Delete src/hooks/useGiftCards.ts
6. Repeat for all gift card hooks

## Files to Check
- useGiftCardBrands.ts
- useGiftCardPools.ts
- useGiftCardProvisioning.ts
- useGiftCardBilling.ts
- useGiftCardCostEstimate.ts
- useGiftCardDenominations.ts
- useBrandLookup.ts
- useClientGiftCards.ts
- useClientAvailableGiftCards.ts

## Verification
- Run `npm run build` - should complete without errors
- Run `npm run lint` - should be clean
- Test gift card selection in campaign wizard
```

---

## NEXT STEPS

**To proceed, please provide:**

1. ✅ GitHub issues export (11 issues)
2. ✅ TypeScript error output
3. ✅ Feature testing results
4. ✅ Production URL

**Once I have this data, I will create:**

1. `GITHUB_ISSUES_RESOLUTION_PLAN.md` - Issue-by-issue fix plan
2. `RESTRUCTURING_PLAN.md` - Detailed migration steps
3. `CLEANUP_CURSOR_PROMPTS.md` - Ready-to-use prompts
4. `DEVELOPER_ONBOARDING_GUIDE.md` - New developer handbook

---

## SUMMARY OF CRITICAL ISSUES

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 🔴 P0 | 80+ duplicate files | High | 2-3 weeks |
| 🔴 P0 | Triple architecture | High | 2 weeks |
| 🟡 P1 | 195 migrations | Medium | 1 week |
| 🟡 P1 | 29 undocumented edge functions | Medium | 1 week |
| 🟡 P1 | Dr. Phillip Chat broken | Medium | 1 day |
| 🟢 P2 | Root file chaos | Low | 1 day |
| 🟢 P2 | Missing .env.example | Low | 1 hour |

**Estimated Total Cleanup Time: 6-8 weeks** (with dedicated effort)

---

## APPENDIX A: COMPLETE FILE LISTING

### Files in `src/hooks/` (80 files - ALL potentially duplicated)

```
use-mobile.tsx
use-toast.ts
useAceForms.ts
useActivities.ts
useAPIKeys.ts
useBrandLookup.ts
useCallAnalytics.ts
useCallCenterScripts.ts
useCallTracking.ts
useCampaignConditions.ts
useCampaignCostEstimate.ts
useCampaignCreateForm.ts
useCampaignGiftCardConfig.ts
useCampaignParticipation.ts
useCampaignValidation.ts
useCampaignVersions.ts
useCampaignWithRelations.ts
useCanAccessClient.ts
useClientAvailableGiftCards.ts
useClientGiftCards.ts
useClientScopedQuery.ts
useContactExport.ts
useContactLists.ts
useContacts.ts
useContactTags.ts
useCRMIntegrations.ts
useCurrentUser.ts
useCustomFieldDefinitions.ts
useDashboardData.ts
useDebounce.ts
useDenominationPricing.ts
useDocumentation.ts
useDocumentationPermissions.ts
useDrPhillipPreference.ts
useEnhancedAnalytics.ts
useFeatureFlags.ts
useFormBuilderRHF.ts
useFormContext.ts
useFormSubmissionRateLimit.ts
useGiftCardBilling.ts
useGiftCardBrands.ts
useGiftCardCostEstimate.ts
useGiftCardDenominations.ts
useGiftCardPools.ts
useGiftCardProvisioning.ts
useGiftCards.ts
useIndividualCardInventory.ts
useInventoryUpload.ts
useInvitableRoles.ts
useKeyboardShortcuts.ts
useLandingPageAnalytics.ts
useLandingPages.ts
useListPreview.ts
useMailProviderSettings.ts
useManageableUsers.ts
useManageableUsersPaginated.ts
useMarkdownDocs.ts
useMenuItemCounts.ts
useMenuSearch.ts
useMessageTemplates.ts
useOptInStatus.ts
usePaginatedRecipients.ts
usePermissions.ts
usePoolInventory.ts
useRecipientEnrichment.ts
useSettingsTabs.ts
useSimplifiedGiftCardSelection.ts
useSmartCSVParser.ts
useTablePreferences.ts
useTags.ts
useTasks.ts
useTilloBrandSync.ts
useTwilioNumbers.ts
useUndo.ts
useUserRole.ts
useVisualEditor.ts
useWebhooks.ts
useZapierConnections.ts
```

### Files in `src/components/` (Partial - showing duplicated folders)

Folders that have EXACT duplicates in `src/features/*/components/`:
- `ace-forms/` (30 files)
- `activities/` (4 files)
- `admin/` (7 files)
- `agency/` (3 files)
- `agent/` (8 files)
- `analytics/` (3 files)
- `call-center/` (20 files)
- `campaigns/` (30+ files)
- `contacts/` (20 files)
- `dashboard/` (4 files)
- `documentation/` (14 files)
- `gift-cards/` (35+ files)
- `landing-pages/` (8 files)
- `settings/` (30+ files)

**TOTAL DUPLICATED COMPONENT FILES: ~150+**

---

## APPENDIX B: EDGE FUNCTION INVENTORY

### All 95 Edge Functions by Category

**AI & Chat (9):**
1. ai-design-chat
2. ai-landing-page-chat
3. ai-landing-page-generate
4. ai-landing-page-generate-simple
5. dr-phillip-chat
6. generate-ace-form-ai
7. generate-landing-page-ai
8. generate-prototype
9. openai-chat

**Gift Cards (15):**
1. check-gift-card-balance
2. check-inventory-card-balance
3. claim-and-provision-card
4. import-gift-cards
5. provision-gift-card
6. provision-gift-card-for-call-center
7. provision-gift-card-from-api
8. provision-gift-card-unified
9. purchase-gift-cards
10. redeem-customer-code
11. redeem-gift-card-embed
12. transfer-admin-cards
13. validate-gift-card-code
14. validate-gift-card-configuration
15. validate-redemption-code

**Messaging (13):**
1. send-admin-alert
2. send-alert-notification
3. send-approval-notification
4. send-comment-notification
5. send-email
6. send-form-notification
7. send-gift-card-email
8. send-gift-card-sms
9. send-inventory-alert
10. send-sms-opt-in
11. send-user-invitation
12. send-verification-email
13. retry-failed-sms

**Campaigns (10):**
1. complete-condition
2. diagnose-campaign-config
3. evaluate-conditions
4. migrate-existing-campaigns
5. process-time-delayed-conditions
6. save-campaign-draft
7. save-campaign-version
8. validate-campaign-budget
9. generate-recipient-tokens
10. handle-purl

**Import/Export (7):**
1. export-audience
2. export-database
3. export-pool-cards
4. import-audience
5. import-campaign-codes
6. import-contacts
7. import-customer-codes
8. import-gift-cards

**Code Approval (2):**
1. approve-customer-code
2. bulk-approve-codes

**Demo/Testing (9):**
1. cleanup-demo-data
2. cleanup-simulated-data
3. cleanup-stuck-gift-cards
4. enrich-demo-data
5. generate-complete-demo-analytics
6. generate-demo-data
7. reset-demo-database
8. seed-documentation
9. simulate-mail-tracking

**Webhooks/Integrations (8):**
1. crm-webhook-receiver
2. dispatch-zapier-event
3. eztexting-webhook
4. handle-call-webhook
5. handle-sms-response
6. stripe-webhook
7. trigger-webhook
8. zapier-incoming-webhook

**Telephony (6):**
1. complete-call-disposition
2. handle-incoming-call
3. provision-twilio-number
4. release-twilio-number
5. update-call-status
6. assign-tracked-numbers

**Admin/System (10):**
1. accept-invitation
2. allocate-credit
3. calculate-credit-requirements
4. check-alert-triggers
5. diagnose-provisioning-setup
6. generate-api-key
7. initialize-default-pipeline
8. monitor-gift-card-system
9. update-organization-status
10. validate-environment

**Forms (2):**
1. submit-ace-form
2. submit-lead-form

**Other (5):**
1. create-preview-link
2. generate-apple-wallet-pass
3. generate-google-wallet-pass
4. generate-favicon
5. submit-to-vendor
6. track-mail-delivery
7. lookup-tillo-brand

---

*Document generated: December 9, 2025*
*Next update: After receiving GitHub issues and test results*


---

## GITHUB ISSUES ANALYSIS COMPLETE ✅

### All 11 GitHub Issues Have Been Analyzed

**Full resolution plan created in: `GITHUB_ISSUES_RESOLUTION_PLAN.md`**

### Issue Summary Table

| # | Title | Priority | Root Cause | Effort |
|---|-------|----------|------------|--------|
| #17 | Create Campaign Multiple Failures | 🔴 CRITICAL | 5 bugs: UUID, CORS, dates, forms, buttons | 4-6h |
| #18 | Edit Campaign Not Saving | 🔴 CRITICAL | Data sync, query invalidation | 4-6h |
| #8 | Tasks Table Missing | 🔴 CRITICAL | Table doesn't exist | 30m |
| #11 | Activities Table Missing | 🔴 CRITICAL | Table doesn't exist | 30m |
| #12 | Call Scripts UUID Error | 🟡 HIGH | String IDs vs UUID | 1-2h |
| #9 | Dashboard Not Actionable | 🟡 HIGH | Missing onClick handlers | 1-2h |
| #15 | Rewards Tab 400 Error | 🟡 HIGH | Query/schema mismatch | 1-2h |
| #16 | Approvals Tab 400 Error | 🟡 HIGH | Query/schema mismatch | 1-2h |
| #13 | Call Scripts Stale Data | 🟢 MEDIUM | Form state not resetting | 1h |
| #14 | Comments Not Persisting | 🟢 MEDIUM | Insert + optimistic UI | 1-2h |
| #10 | Sidebar Search Attributes | 🟢 LOW | Missing id/name | 15m |

### Root Cause Categories

1. **Missing Database Tables (2 issues)**
   - `public.tasks` doesn't exist
   - `public.activities` doesn't exist

2. **Invalid Data Handling (2 issues)**
   - "none" string sent as UUID for landing page
   - "default-greeting" string IDs in call scripts

3. **CORS Configuration (1 issue)**
   - `save-campaign-draft` edge function missing headers

4. **Data Synchronization (3 issues)**
   - Campaign editor vs details showing different data
   - Query invalidation not happening after mutations
   - Optimistic UI showing success before confirmation

5. **Form State Management (2 issues)**
   - Forms not resetting between create/edit
   - Form data not pre-populating on edit

6. **Schema/Query Errors (2 issues)**
   - Invalid column names or relationships
   - Possible RLS blocking access

7. **UI/UX (2 issues)**
   - Buttons without handlers
   - Missing accessibility attributes

---

## UPDATED TECHNICAL DEBT SUMMARY

### Confirmed Issues from GitHub + Code Review

| Category | Issue Count | Severity | Estimated Fix Time |
|----------|-------------|----------|-------------------|
| Duplicate Files | 150+ components, 40+ hooks | 🔴 Critical | 2-3 weeks |
| Missing DB Tables | 2 (tasks, activities) | 🔴 Critical | 1 hour |
| Campaign CRUD Bugs | 10+ distinct bugs | 🔴 Critical | 2-3 days |
| CORS Issues | 1 edge function | 🟡 High | 30 min |
| Schema Mismatches | 3+ tables | 🟡 High | 1 day |
| Form State Bugs | 2 components | 🟢 Medium | 2 hours |
| UI Polish | 2 issues | 🟢 Low | 1 hour |

### TypeScript Status: ✅ CLEAN
No TypeScript errors detected - good foundation for refactoring.

### NPM Audit: ⚠️ 7 Vulnerabilities
- 6 moderate severity
- 1 high severity
- All fixable with `npm audit fix`

---

## FINAL DOCUMENTS CREATED

1. **COMPREHENSIVE_SYSTEM_REVIEW.md** (this document)
   - Full codebase analysis
   - Duplication findings
   - Architecture assessment
   - Technical debt inventory

2. **GITHUB_ISSUES_RESOLUTION_PLAN.md**
   - Issue-by-issue fix instructions
   - Root cause analysis
   - Code examples for each fix
   - Implementation order

3. **CLEANUP_CURSOR_PROMPTS.md**
   - 20 copy-paste ready prompts
   - Phased execution plan
   - Verification steps

---

## RECOMMENDED EXECUTION ORDER

### Week 1: Critical Bug Fixes
**Day 1:**
- Create `tasks` table migration (Issue #8)
- Create `activities` table migration (Issue #11)
- Fix CORS on `save-campaign-draft` (Issue #17)
- Run `npm audit fix`

**Day 2:**
- Fix landing page "none" UUID (Issue #17)
- Fix mail date timezone (Issues #17, #18)
- Fix "Create Landing Page" button (Issue #17)
- Fix forms persistence (Issue #17)

**Day 3:**
- Fix campaign edit sync (Issue #18)
- Fix call scripts UUID (Issue #12)
- Fix call scripts form state (Issue #13)
- Fix dashboard onboarding (Issue #9)

**Day 4:**
- Fix Rewards tab query (Issue #15)
- Fix Approvals tab query (Issue #16)
- Fix Comments persistence (Issue #14)
- Fix sidebar search attributes (Issue #10)

**Day 5:**
- Full regression testing
- Deploy fixes to staging
- Verify all 11 issues resolved

### Week 2-3: Code Deduplication
- Consolidate hooks to features/ folders
- Consolidate components to features/ folders
- Update all imports
- Delete duplicate files
- Clean root directory

### Week 4: Documentation & Polish
- Update README
- Create developer onboarding guide
- Archive old documentation
- Final testing

---

*Review Updated: December 10, 2025*
*GitHub Issues: 11 Open, All Analyzed*
*Next Action: Begin Phase 1 - Database Fixes*

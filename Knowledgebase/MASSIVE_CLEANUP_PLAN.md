# MASSIVE CLEANUP & CONSOLIDATION PLAN

**Date:** December 10, 2025  
**Goal:** Transform bloated codebase into lean, maintainable architecture  
**Current State:** ~1,000+ source files, ~200+ markdown files, massive duplication

---

## EXECUTIVE SUMMARY

### Current Bloat Analysis

| Category | Count | Action |
|----------|-------|--------|
| **Markdown Files** | ~200+ | Delete 150+, keep ~20 essential |
| **src/hooks/** | 78 files | Migrate to features/, delete folder |
| **src/components/** | 375 files | Migrate to features/, delete folder |
| **src/features/** | 433 files | KEEP as canonical location |
| **src/lib/** | 75 files | Consolidate into core/ |
| **src/shared/** | 33 files | Consolidate into shared/ |
| **src/core/** | 31 files | KEEP, absorb lib/ |
| **Root clutter** | 20+ files | Move/delete 15+ |

### Target Architecture (Post-Cleanup)

```
mobul/
├── README.md                    # Only essential .md at root
├── .env.example                 # Add this (currently missing)
├── package.json
├── [config files]               # vite, tsconfig, tailwind, etc.
├── docs/                        # ONLY if needed for static hosting
│   └── (minimal or empty)
├── scripts/                     # Keep deployment scripts here
├── supabase/                    # Migrations & edge functions
└── src/
    ├── app/                     # App entry, providers, routes
    ├── core/                    # API, auth, services (absorbs lib/)
    ├── features/                # CANONICAL - all feature code
    │   ├── ace-forms/
    │   ├── campaigns/
    │   ├── call-center/
    │   ├── contacts/
    │   ├── gift-cards/
    │   └── [other features]/
    ├── shared/                  # Truly shared UI components
    │   ├── components/          # Button, Input, Modal, etc.
    │   └── hooks/               # useDebounce, useMobile, etc.
    ├── pages/                   # Thin route wrappers only
    ├── types/                   # Global type definitions
    └── main.tsx
```

---

## PHASE 1: DELETE DOCUMENTATION BLOAT (Day 1)

### Files to DELETE Immediately

**1. dist/docs/ (58 files) - BUILD OUTPUT**
```
DELETE: dist/docs/
Reason: Regenerates on build, should not be in repo
```

**2. docs-archive/ (36 files) - OLD ARCHIVE**
```
DELETE: docs-archive/
Reason: Documentation moved to database, archive is obsolete
```

**3. public/docs/ (58 files) - DUPLICATE**
```
DELETE: public/docs/
Reason: Documentation is in database now, this is stale
```

**4. Root-level .md files (except README.md)**
```
DELETE:
- GITHUB_ISSUES_EXPORT.md (outdated - we have fresh export)
- GIT_SECRET_FIX_INSTRUCTIONS.md (one-time fix, done)
- LAUNCH_CHECKLIST.md (duplicate exists in docs/)
```

**5. Knowledgebase/ cleanup**
```
KEEP (essential for development):
- COMPREHENSIVE_SYSTEM_REVIEW.md
- GITHUB_ISSUES_RESOLUTION_PLAN.md
- CLEANUP_CURSOR_PROMPTS.md
- PLATFORM_DICTIONARY.md

DELETE (obsolete):
- # MOBUL - PLATFORM DICTIONARY.md (duplicate with #)
- AI_BACKGROUND_SYSTEM_PLAN.md
- AI_BACKGROUND_SYSTEM_PROMPTS.md
- CLEANUP_STATUS_REPORT.md
- CURSOR_PROMPTS.md (replaced by new one)
- CURSOR_QUICK_START.md
- DESIGNER_CLEANUP_PLAN.md
- DESIGNER_CLEANUP_PROMPTS.md
- DESIGNER_FIX_PLAN.md
- DESIGNER_FIX_PROMPTS.md
- LAUNCH_PRD.md
- VERIFICATION_PLAN.md
- VERIFICATION_PROMPT.md
```

**6. docs/ folder cleanup**
```
KEEP (essential operations):
- DEPLOYMENT_RUNBOOK.md
- ENVIRONMENT_SETUP.md
- OAUTH_SETUP.md
- operations/BACKUP_PROCEDURES.md
- operations/DISASTER_RECOVERY.md

DELETE (moved to database or obsolete):
- API_FIRST_MASTER_INDEX.md
- LAUNCH_CHECKLIST.md
- LAUNCH_COMPLETE_REVIEW.md
- LAUNCH_PROGRESS.md
- LOGGING_POLICY.md
- REFACTOR_STATUS.md
- operations/APPLY_MONITORING_MIGRATIONS.md
- operations/APPLY_SAFE_MIGRATIONS.md
- operations/CONFIGURE_MONITORING_ALERTS.md
- operations/DEPLOY_EDGE_FUNCTIONS.md
- operations/EDGE_FUNCTION_DEPLOYMENT.md (duplicate)
- operations/INCIDENT_RESPONSE.md
- operations/MIGRATION_GUIDE.md
- operations/MONITORING_SETUP.md
- operations/PERFORMANCE_GUIDE.md
- operations/SECURITY_AUDIT_HARDENING.md
- operations/SECURITY_HARDENING.md (duplicate)
- operations/WALLET_PASS_SETUP.md
```

### Estimated Reduction: ~150 markdown files deleted

---

## PHASE 2: ROOT DIRECTORY CLEANUP (Day 1)

### Files to MOVE

```
MOVE TO scripts/:
- deploy-for-mike-demo.ps1
- run-deployment-pipeline.ps1
- setup-new-supabase.ps1
- setup-new-supabase.sh
- remove_secrets.sh
- fix-doc-links.js

MOVE TO supabase/migrations/:
- APPLY_DOCS_MIGRATION.sql

MOVE TO Keys/:
- wallet_pass.cer → Keys/wallet_pass.cer
- wallet_pass.csr → Keys/wallet_pass.csr
- wallet_pass.key → Keys/wallet_pass.key
- wallet_pass.p12 → Keys/wallet_pass.p12
- wallet_pass.pem → Keys/wallet_pass.pem
- openssl_min.cnf → Keys/openssl_min.cnf
- pass.cer → Keys/pass.cer
```

### Files to DELETE

```
DELETE:
- FIX_SECRET_ISSUE.bat (one-time fix, done)
- bun.lockb (not using Bun, have package-lock.json)
```

### Files to CREATE

```
CREATE:
- .env.example (copy from .env with values removed)
```

---

## PHASE 3: HOOKS CONSOLIDATION (Day 2)

### Current State: 78 hooks in src/hooks/

### Migration Strategy

**Step 1: Delete EMPTY files**
```
DELETE (0 lines):
- src/hooks/useCampaignWithRelations.ts
- src/hooks/usePaginatedRecipients.ts
```

**Step 2: Move feature-specific hooks to features/**

| Hook | Move To |
|------|---------|
| useGiftCards.ts | features/gift-cards/hooks/ |
| useGiftCardBrands.ts | features/gift-cards/hooks/ |
| useGiftCardPools.ts | features/gift-cards/hooks/ |
| useGiftCardProvisioning.ts | features/gift-cards/hooks/ |
| useGiftCardBilling.ts | features/gift-cards/hooks/ |
| useGiftCardCostEstimate.ts | features/gift-cards/hooks/ |
| useGiftCardDenominations.ts | features/gift-cards/hooks/ |
| useBrandLookup.ts | features/gift-cards/hooks/ |
| useClientGiftCards.ts | features/gift-cards/hooks/ |
| useClientAvailableGiftCards.ts | features/gift-cards/hooks/ |
| usePoolInventory.ts | features/gift-cards/hooks/ |
| useIndividualCardInventory.ts | features/gift-cards/hooks/ |
| useTilloBrandSync.ts | features/gift-cards/hooks/ |
| useSimplifiedGiftCardSelection.ts | features/gift-cards/hooks/ |
| useDenominationPricing.ts | features/gift-cards/hooks/ |
| useCampaignConditions.ts | features/campaigns/hooks/ |
| useCampaignCostEstimate.ts | features/campaigns/hooks/ |
| useCampaignCreateForm.ts | features/campaigns/hooks/ |
| useCampaignGiftCardConfig.ts | features/campaigns/hooks/ |
| useCampaignValidation.ts | features/campaigns/hooks/ |
| useCampaignVersions.ts | features/campaigns/hooks/ |
| useCampaignParticipation.ts | features/campaigns/hooks/ |
| useContacts.ts | features/contacts/hooks/ |
| useContactLists.ts | features/contacts/hooks/ |
| useContactExport.ts | features/contacts/hooks/ |
| useContactTags.ts | features/contacts/hooks/ |
| useSmartCSVParser.ts | features/contacts/hooks/ |
| useCallAnalytics.ts | features/call-center/hooks/ |
| useCallCenterScripts.ts | features/call-center/hooks/ |
| useCallTracking.ts | features/call-center/hooks/ |
| useAceForms.ts | features/ace-forms/hooks/ |
| useFormBuilderRHF.ts | features/ace-forms/hooks/ |
| useFormContext.ts | features/ace-forms/hooks/ |
| useFormSubmissionRateLimit.ts | features/ace-forms/hooks/ |
| useLandingPages.ts | features/landing-pages/hooks/ |
| useLandingPageAnalytics.ts | features/landing-pages/hooks/ |
| useActivities.ts | features/activities/hooks/ |
| useTasks.ts | features/activities/hooks/ |
| useDocumentation.ts | features/documentation/hooks/ |
| useDocumentationPermissions.ts | features/documentation/hooks/ |
| useMarkdownDocs.ts | features/documentation/hooks/ |
| useDashboardData.ts | features/dashboard/hooks/ |
| useEnhancedAnalytics.ts | features/analytics/hooks/ |
| useMailProviderSettings.ts | features/email/hooks/ |
| useMessageTemplates.ts | features/email/hooks/ |

**Step 3: Move truly shared hooks to shared/hooks/**
```
MOVE TO src/shared/hooks/:
- useDebounce.ts
- use-mobile.tsx
- use-toast.ts
- useKeyboardShortcuts.ts
- useUndo.ts
- useTablePreferences.ts
- useMenuSearch.ts
```

**Step 4: Move auth/user hooks to core/auth/**
```
MOVE TO src/core/auth/:
- useCurrentUser.ts
- useUserRole.ts
- usePermissions.ts
- useCanAccessClient.ts
- useInvitableRoles.ts
- useManageableUsers.ts
- useManageableUsersPaginated.ts
```

**Step 5: Move settings hooks to features/settings/**
```
MOVE TO src/features/settings/hooks/:
- useSettingsTabs.ts
- useFeatureFlags.ts
- useAPIKeys.ts
- useCRMIntegrations.ts
- useWebhooks.ts
- useZapierConnections.ts
- useTwilioNumbers.ts
- useOptInStatus.ts
```

**Step 6: DELETE src/hooks/ folder entirely**

---

## PHASE 4: COMPONENTS CONSOLIDATION (Day 3-5)

### Current State: 375 files in src/components/

### Strategy: Move all to features/, delete folder

**Step 1: Map component folders to features**

| src/components/ | → | src/features/ |
|-----------------|---|---------------|
| ace-forms/ | → | features/ace-forms/components/ |
| activities/ | → | features/activities/components/ |
| admin/ | → | features/admin/components/ |
| agency/ | → | features/agency/components/ |
| agent/ | → | features/agent/components/ |
| analytics/ | → | features/analytics/components/ |
| audiences/ | → | features/audiences/components/ |
| call-center/ | → | features/call-center/components/ |
| campaigns/ | → | features/campaigns/components/ |
| contacts/ | → | features/contacts/components/ |
| dashboard/ | → | features/dashboard/components/ |
| documentation/ | → | features/documentation/components/ |
| email/ | → | features/email/components/ |
| gift-cards/ | → | features/gift-cards/components/ |
| landing-pages/ | → | features/landing-pages/components/ |
| mail/ | → | features/mail-designer/components/ |
| monitoring/ | → | features/admin/components/ |
| onboarding/ | → | features/onboarding/components/ |
| settings/ | → | features/settings/components/ |

**Step 2: Move shared UI components**

| src/components/ | → | src/shared/components/ |
|-----------------|---|------------------------|
| ui/* | → | shared/components/ui/ |
| shared/* | → | shared/components/ |
| layout/* | → | shared/components/layout/ |
| ErrorBoundary.tsx | → | shared/components/ |
| ErrorBoundaries/ | → | shared/components/ |
| NavLink.tsx | → | shared/components/ |
| CookieConsent.tsx | → | shared/components/ |

**Step 3: Move standalone files**

| File | → | Destination |
|------|---|-------------|
| DrPhillipChat.tsx | → | features/dashboard/components/ |
| DrPhillipChatWrapper.tsx | → | features/dashboard/components/ |

**Step 4: DELETE src/components/ folder entirely**

---

## PHASE 5: LIB CONSOLIDATION (Day 6)

### Current State: 75 files in src/lib/

### Strategy: Merge into core/ and feature utils/

**Move to core/services/:**
```
lib/ai/ → core/services/ai/
lib/auth/ → core/auth/
lib/services/ → core/services/
lib/system/ → core/services/system/
lib/performance/ → core/services/performance/
lib/web/ → core/services/web/
```

**Move to features/:**
```
lib/campaign/ → features/campaigns/utils/
lib/conditions/ → features/campaigns/utils/conditions/
lib/gift-cards/ → features/gift-cards/lib/
lib/tillo/ → features/gift-cards/lib/tillo/
lib/landing-pages/ → features/landing-pages/utils/
lib/templates/ → features/mail-designer/templates/
lib/export/ → features/contacts/utils/export/
```

**Move to shared/:**
```
lib/utils/ → shared/utils/
lib/validation/ → shared/utils/validation/
lib/demo/ → DELETE or → features/admin/demo/
lib/config/ → core/config/
```

**Move standalone files:**
```
lib/demo-data-generators.ts → features/admin/demo/
lib/errorLogger.ts → core/services/
lib/request-tracer.ts → core/services/
lib/terminology.ts → shared/utils/
```

**DELETE src/lib/ folder entirely**

---

## PHASE 6: DUPLICATE REMOVAL (Day 7-8)

### Process for Each Duplicate

1. **Compare both versions** (features/ vs old location)
2. **Keep the more complete one** in features/
3. **Update ALL imports** to use features/
4. **Delete the duplicate**

### High-Priority Duplicates

**Gift Card Components (35+ files)**
- Compare: src/components/gift-cards/ vs src/features/gift-cards/components/
- Keep: features/gift-cards/components/
- Delete: components/gift-cards/

**Campaign Components (30+ files)**
- Compare: src/components/campaigns/ vs src/features/campaigns/components/
- Keep: features/campaigns/components/
- Delete: components/campaigns/

**Form Builder Components (30+ files)**
- Compare: src/components/ace-forms/ vs src/features/ace-forms/components/
- Keep: features/ace-forms/components/
- Delete: components/ace-forms/

---

## PHASE 7: PAGES THINNING (Day 9)

### Current State: 71 page files

### Target: Pages should be thin wrappers

**Pattern to Follow:**
```typescript
// pages/Campaigns.tsx - GOOD (thin wrapper)
import { CampaignsPage } from '@/features/campaigns';

export default function Campaigns() {
  return <CampaignsPage />;
}
```

**Anti-Pattern to Remove:**
```typescript
// pages/Campaigns.tsx - BAD (too much logic)
export default function Campaigns() {
  const { data } = useQuery(...);
  const [state, setState] = useState(...);
  // 200+ lines of logic
}
```

### Pages to Refactor
Move logic into features/, keep pages as 5-10 line wrappers.

---

## PHASE 8: FINAL CLEANUP (Day 10)

### Remove Empty Folders
```bash
# After all migrations, remove empty directories
find src -type d -empty -delete
```

### Update Import Aliases
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@core/*": ["./src/core/*"]
    }
  }
}
```

### Final File Count Target

| Location | Before | After | Reduction |
|----------|--------|-------|-----------|
| Markdown files | ~200 | ~20 | 90% |
| src/hooks/ | 78 | 0 (deleted) | 100% |
| src/components/ | 375 | 0 (deleted) | 100% |
| src/lib/ | 75 | 0 (deleted) | 100% |
| src/features/ | 433 | ~500 | Absorbs others |
| src/shared/ | 33 | ~60 | Absorbs UI |
| src/core/ | 31 | ~80 | Absorbs lib |
| Root files | 38 | ~20 | 47% |

**Total Reduction: ~40% fewer files, 90% less duplication**

---

## ESTIMATED TIMELINE

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Delete docs bloat | 2 hours |
| 2 | Root cleanup | 1 hour |
| 3 | Hooks consolidation | 4 hours |
| 4 | Components consolidation | 8 hours |
| 5 | Lib consolidation | 4 hours |
| 6 | Duplicate removal | 6 hours |
| 7 | Pages thinning | 4 hours |
| 8 | Final cleanup | 2 hours |

**Total: ~31 hours (4-5 days of focused work)**

---

*Document Created: December 10, 2025*
*See CLEANUP_PROMPTS.md for executable prompts*

# MASSIVE CLEANUP EXECUTION PROMPTS

**Date:** December 10, 2025  
**Purpose:** Copy-paste ready prompts for systematic codebase cleanup  
**Prerequisite:** Read MASSIVE_CLEANUP_PLAN.md first

---

## ⚠️ IMPORTANT: BACKUP FIRST

Before running ANY prompts, commit your current state:
```bash
git add -A
git commit -m "Backup before massive cleanup"
git push
```

---

## PHASE 1: DELETE DOCUMENTATION BLOAT

### Prompt 1.1: Delete Build Output Docs

```
# TASK: Delete dist/docs folder (build output)

## Instructions
The dist/docs/ folder is build output that regenerates. Delete it entirely.

1. Delete the folder: dist/docs/
2. Verify .gitignore has dist/ listed
3. If dist/ is not in .gitignore, add it

## Command to run:
Remove-Item -Recurse -Force "dist/docs"

Execute this now.
```

---

### Prompt 1.2: Delete docs-archive Folder

```
# TASK: Delete docs-archive folder (obsolete archive)

## Instructions
The docs-archive/ folder contains old documentation that was already archived and is now obsolete since docs moved to database.

Delete the entire folder: docs-archive/

## Command to run:
Remove-Item -Recurse -Force "docs-archive"

Execute this now.
```

---

### Prompt 1.3: Delete public/docs Folder

```
# TASK: Delete public/docs folder (documentation is in database now)

## Instructions
Documentation has been migrated to the database. The public/docs/ folder (58 files) is stale and should be removed.

Delete the entire folder: public/docs/

## Command to run:
Remove-Item -Recurse -Force "public/docs"

Execute this now.
```

---

### Prompt 1.4: Clean Root Markdown Files

```
# TASK: Delete obsolete root-level .md files

## Instructions
Delete these files from the root directory:
- GITHUB_ISSUES_EXPORT.md (outdated)
- GIT_SECRET_FIX_INSTRUCTIONS.md (one-time fix, completed)
- LAUNCH_CHECKLIST.md (duplicate in docs/)

Keep ONLY:
- README.md

## Commands:
Remove-Item "GITHUB_ISSUES_EXPORT.md"
Remove-Item "GIT_SECRET_FIX_INSTRUCTIONS.md"
Remove-Item "LAUNCH_CHECKLIST.md"

Execute these deletions now.
```

---

### Prompt 1.5: Clean Knowledgebase Folder

```
# TASK: Clean up Knowledgebase folder - keep only essential files

## Files to KEEP (5 files):
- COMPREHENSIVE_SYSTEM_REVIEW.md
- GITHUB_ISSUES_RESOLUTION_PLAN.md
- MASSIVE_CLEANUP_PLAN.md (this plan)
- MASSIVE_CLEANUP_PROMPTS.md (this file)
- PLATFORM_DICTIONARY.md

## Files to DELETE (everything else):
- # ACE ENGAGE - PLATFORM DICTIONARY.md (duplicate with weird name)
- AI_BACKGROUND_SYSTEM_PLAN.md
- AI_BACKGROUND_SYSTEM_PROMPTS.md
- CLEANUP_CURSOR_PROMPTS.md (replaced)
- CLEANUP_STATUS_REPORT.md
- CURSOR_PROMPTS.md
- CURSOR_QUICK_START.md
- DESIGNER_CLEANUP_PLAN.md
- DESIGNER_CLEANUP_PROMPTS.md
- DESIGNER_FIX_PLAN.md
- DESIGNER_FIX_PROMPTS.md
- LAUNCH_PRD.md
- VERIFICATION_PLAN.md
- VERIFICATION_PROMPT.md

## Execute the deletions now.
```

---

### Prompt 1.6: Clean docs Folder

```
# TASK: Clean docs folder - keep only essential operations docs

## Files to KEEP in docs/:
- DEPLOYMENT_RUNBOOK.md
- ENVIRONMENT_SETUP.md
- OAUTH_SETUP.md
- operations/BACKUP_PROCEDURES.md
- operations/DISASTER_RECOVERY.md

## Files to DELETE in docs/:
- API_FIRST_MASTER_INDEX.md
- LAUNCH_CHECKLIST.md
- LAUNCH_COMPLETE_REVIEW.md
- LAUNCH_PROGRESS.md
- LOGGING_POLICY.md
- REFACTOR_STATUS.md

## Files to DELETE in docs/operations/:
- APPLY_MONITORING_MIGRATIONS.md
- APPLY_SAFE_MIGRATIONS.md
- CONFIGURE_MONITORING_ALERTS.md
- DEPLOY_EDGE_FUNCTIONS.md
- EDGE_FUNCTION_DEPLOYMENT.md
- INCIDENT_RESPONSE.md
- MIGRATION_GUIDE.md
- MONITORING_SETUP.md
- PERFORMANCE_GUIDE.md
- SECURITY_AUDIT_HARDENING.md
- SECURITY_HARDENING.md
- WALLET_PASS_SETUP.md

## Execute all deletions now.
```

---

## PHASE 2: ROOT DIRECTORY CLEANUP

### Prompt 2.1: Move Scripts to scripts/

```
# TASK: Move deployment scripts from root to scripts/

## Files to MOVE:
- deploy-for-mike-demo.ps1 → scripts/deploy-for-mike-demo.ps1
- run-deployment-pipeline.ps1 → scripts/run-deployment-pipeline.ps1
- setup-new-supabase.ps1 → scripts/setup-new-supabase.ps1
- setup-new-supabase.sh → scripts/setup-new-supabase.sh
- remove_secrets.sh → scripts/remove_secrets.sh
- fix-doc-links.js → scripts/fix-doc-links.js

## Commands:
Move-Item "deploy-for-mike-demo.ps1" "scripts/"
Move-Item "run-deployment-pipeline.ps1" "scripts/"
Move-Item "setup-new-supabase.ps1" "scripts/"
Move-Item "setup-new-supabase.sh" "scripts/"
Move-Item "remove_secrets.sh" "scripts/"
Move-Item "fix-doc-links.js" "scripts/"

Execute these moves now.
```

---

### Prompt 2.2: Move Keys and Certificates

```
# TASK: Move wallet pass certificates to Keys/ folder

## Files to MOVE from root to Keys/:
- wallet_pass.cer
- wallet_pass.csr
- wallet_pass.key
- wallet_pass.p12
- wallet_pass.pem
- openssl_min.cnf
- pass.cer

## Commands:
Move-Item "wallet_pass.cer" "Keys/"
Move-Item "wallet_pass.csr" "Keys/"
Move-Item "wallet_pass.key" "Keys/"
Move-Item "wallet_pass.p12" "Keys/"
Move-Item "wallet_pass.pem" "Keys/"
Move-Item "openssl_min.cnf" "Keys/"
Move-Item "pass.cer" "Keys/"

Execute these moves now.
```

---

### Prompt 2.3: Move SQL and Delete Obsolete

```
# TASK: Move SQL file and delete obsolete files

## MOVE:
- APPLY_DOCS_MIGRATION.sql → supabase/migrations/

## DELETE:
- FIX_SECRET_ISSUE.bat (one-time fix completed)
- bun.lockb (not using Bun)

## Commands:
Move-Item "APPLY_DOCS_MIGRATION.sql" "supabase/migrations/"
Remove-Item "FIX_SECRET_ISSUE.bat"
Remove-Item "bun.lockb"

Execute now.
```

---

### Prompt 2.4: Create .env.example

```
# TASK: Create .env.example file

## Instructions
Create a new file .env.example at the root with placeholder values for all environment variables in .env (without actual secrets).

1. Read the contents of .env
2. Create .env.example with the same keys but placeholder values like:
   - API keys → "your-api-key-here"
   - URLs → "https://your-project.supabase.co"
   - Secrets → "your-secret-here"

## Format example:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_TILLO_API_KEY=your-tillo-api-key-here

Create this file now by reading .env and making a safe template version.
```

---

## PHASE 3: HOOKS CONSOLIDATION

### Prompt 3.1: Delete Empty Hook Files

```
# TASK: Delete empty hook files (0 lines)

## Files with 0 lines to DELETE:
- src/hooks/useCampaignWithRelations.ts
- src/hooks/usePaginatedRecipients.ts

## Commands:
Remove-Item "src/hooks/useCampaignWithRelations.ts"
Remove-Item "src/hooks/usePaginatedRecipients.ts"

Execute now.
```

---

### Prompt 3.2: Migrate Gift Card Hooks

```
# TASK: Migrate gift card hooks to features/gift-cards/hooks/

## Instructions
For each hook below:
1. Check if a version already exists in src/features/gift-cards/hooks/
2. If both exist, compare them and keep the more complete one
3. If only src/hooks/ version exists, move it
4. Update ALL imports across the codebase to use @/features/gift-cards/hooks/
5. Delete the src/hooks/ version

## Hooks to migrate:
- useGiftCards.ts
- useGiftCardBrands.ts
- useGiftCardPools.ts
- useGiftCardProvisioning.ts
- useGiftCardBilling.ts
- useGiftCardCostEstimate.ts
- useGiftCardDenominations.ts
- useBrandLookup.ts
- useClientGiftCards.ts
- useClientAvailableGiftCards.ts
- usePoolInventory.ts
- useIndividualCardInventory.ts
- useTilloBrandSync.ts
- useSimplifiedGiftCardSelection.ts
- useDenominationPricing.ts

## Process:
1. Start with useGiftCards.ts
2. Show me both versions if they exist
3. Recommend which to keep
4. Update imports
5. Delete duplicate

Begin with useGiftCards.ts now.
```

---

### Prompt 3.3: Migrate Campaign Hooks

```
# TASK: Migrate campaign hooks to features/campaigns/hooks/

## Same process as gift card hooks for:
- useCampaignConditions.ts
- useCampaignCostEstimate.ts
- useCampaignCreateForm.ts
- useCampaignGiftCardConfig.ts
- useCampaignValidation.ts
- useCampaignVersions.ts
- useCampaignParticipation.ts

For each:
1. Check if version exists in features/campaigns/hooks/
2. Compare if both exist, keep more complete one
3. Update all imports to use @/features/campaigns/hooks/
4. Delete src/hooks/ version

Start with useCampaignConditions.ts.
```

---

### Prompt 3.4: Migrate Contact Hooks

```
# TASK: Migrate contact hooks to features/contacts/hooks/

## Hooks to migrate:
- useContacts.ts
- useContactLists.ts
- useContactExport.ts
- useContactTags.ts
- useSmartCSVParser.ts

Same process: compare, keep best, update imports, delete duplicate.
Start with useContacts.ts.
```

---

### Prompt 3.5: Migrate Call Center Hooks

```
# TASK: Migrate call center hooks to features/call-center/hooks/

## Hooks to migrate:
- useCallAnalytics.ts
- useCallCenterScripts.ts
- useCallTracking.ts

Same process: compare, keep best, update imports, delete duplicate.
```

---

### Prompt 3.6: Migrate Form Builder Hooks

```
# TASK: Migrate form builder hooks to features/ace-forms/hooks/

## Hooks to migrate:
- useAceForms.ts
- useFormBuilderRHF.ts
- useFormContext.ts
- useFormSubmissionRateLimit.ts

Same process: compare, keep best, update imports, delete duplicate.
```

---

### Prompt 3.7: Migrate Remaining Feature Hooks

```
# TASK: Migrate remaining feature-specific hooks

## Landing Pages → features/landing-pages/hooks/:
- useLandingPages.ts
- useLandingPageAnalytics.ts

## Activities → features/activities/hooks/:
- useActivities.ts
- useTasks.ts

## Documentation → features/documentation/hooks/:
- useDocumentation.ts
- useDocumentationPermissions.ts
- useMarkdownDocs.ts

## Dashboard → features/dashboard/hooks/:
- useDashboardData.ts

## Analytics → features/analytics/hooks/:
- useEnhancedAnalytics.ts

## Email → features/email/hooks/:
- useMailProviderSettings.ts
- useMessageTemplates.ts

Migrate each group, update imports, delete duplicates.
```

---

### Prompt 3.8: Move Shared Hooks

```
# TASK: Move truly shared/generic hooks to shared/hooks/

## Create src/shared/hooks/ if it doesn't exist

## Move these hooks there:
- useDebounce.ts
- use-mobile.tsx
- use-toast.ts
- useKeyboardShortcuts.ts
- useUndo.ts
- useTablePreferences.ts
- useMenuSearch.ts

## Commands:
New-Item -ItemType Directory -Force -Path "src/shared/hooks"
Move-Item "src/hooks/useDebounce.ts" "src/shared/hooks/"
Move-Item "src/hooks/use-mobile.tsx" "src/shared/hooks/"
Move-Item "src/hooks/use-toast.ts" "src/shared/hooks/"
Move-Item "src/hooks/useKeyboardShortcuts.ts" "src/shared/hooks/"
Move-Item "src/hooks/useUndo.ts" "src/shared/hooks/"
Move-Item "src/hooks/useTablePreferences.ts" "src/shared/hooks/"
Move-Item "src/hooks/useMenuSearch.ts" "src/shared/hooks/"

Then update all imports to use @/shared/hooks/

Execute now.
```

---

### Prompt 3.9: Move Auth Hooks to Core

```
# TASK: Move auth/user hooks to core/auth/hooks/

## Create src/core/auth/hooks/ if needed

## Move these hooks:
- useCurrentUser.ts
- useUserRole.ts
- usePermissions.ts
- useCanAccessClient.ts
- useInvitableRoles.ts
- useManageableUsers.ts
- useManageableUsersPaginated.ts

Then update all imports to use @/core/auth/hooks/

Execute now.
```

---

### Prompt 3.10: Move Settings Hooks

```
# TASK: Move settings-related hooks to features/settings/hooks/

## Move these hooks:
- useSettingsTabs.ts
- useFeatureFlags.ts
- useAPIKeys.ts
- useCRMIntegrations.ts
- useWebhooks.ts
- useZapierConnections.ts
- useTwilioNumbers.ts
- useOptInStatus.ts

Then update all imports.

Execute now.
```

---

### Prompt 3.11: Delete src/hooks/ Folder

```
# TASK: Delete the now-empty src/hooks/ folder

## Prerequisites
Verify all hooks have been migrated by checking the folder is empty or only has __tests__/

## If __tests__/ exists:
Move test files to their corresponding feature test folders

## Then delete:
Remove-Item -Recurse -Force "src/hooks"

Execute when ready.
```

---

## PHASE 4: COMPONENTS CONSOLIDATION

### Prompt 4.1: Migrate Feature Components - Gift Cards

```
# TASK: Consolidate gift-cards components

## Compare and merge:
- src/components/gift-cards/ → src/features/gift-cards/components/

## Process:
1. List all files in both directories
2. For each duplicate, compare and keep the more complete version in features/
3. For files only in components/, move them to features/
4. Update ALL imports to use @/features/gift-cards/components/
5. Delete src/components/gift-cards/

Start by listing both directories and showing duplicates.
```

---

### Prompt 4.2: Migrate Feature Components - Campaigns

```
# TASK: Consolidate campaigns components

## Compare and merge:
- src/components/campaigns/ → src/features/campaigns/components/

Same process: list, compare, merge, update imports, delete old folder.
```

---

### Prompt 4.3: Migrate Feature Components - Ace Forms

```
# TASK: Consolidate ace-forms components

## Compare and merge:
- src/components/ace-forms/ → src/features/ace-forms/components/

Same process: list, compare, merge, update imports, delete old folder.
```

---

### Prompt 4.4: Migrate Feature Components - Call Center

```
# TASK: Consolidate call-center components

## Compare and merge:
- src/components/call-center/ → src/features/call-center/components/

Same process.
```

---

### Prompt 4.5: Migrate Feature Components - Contacts

```
# TASK: Consolidate contacts components

## Compare and merge:
- src/components/contacts/ → src/features/contacts/components/

Same process.
```

---

### Prompt 4.6: Migrate Feature Components - All Remaining

```
# TASK: Consolidate all remaining feature component folders

## Folders to merge (each one):
- src/components/activities/ → src/features/activities/components/
- src/components/admin/ → src/features/admin/components/
- src/components/agency/ → src/features/agency/components/
- src/components/agent/ → src/features/agent/components/
- src/components/analytics/ → src/features/analytics/components/
- src/components/audiences/ → src/features/audiences/components/
- src/components/dashboard/ → src/features/dashboard/components/
- src/components/documentation/ → src/features/documentation/components/
- src/components/email/ → src/features/email/components/
- src/components/landing-pages/ → src/features/landing-pages/components/
- src/components/mail/ → src/features/mail-designer/components/
- src/components/monitoring/ → src/features/admin/components/monitoring/
- src/components/onboarding/ → src/features/onboarding/components/
- src/components/settings/ → src/features/settings/components/

For each: compare, merge to features/, update imports, delete old.
```

---

### Prompt 4.7: Move Shared UI Components

```
# TASK: Move shared UI components to shared/components/

## Move these folders to src/shared/components/:
- src/components/ui/ → src/shared/components/ui/
- src/components/shared/ → src/shared/components/
- src/components/layout/ → src/shared/components/layout/
- src/components/ErrorBoundaries/ → src/shared/components/ErrorBoundaries/

## Move these files:
- src/components/ErrorBoundary.tsx → src/shared/components/
- src/components/NavLink.tsx → src/shared/components/
- src/components/CookieConsent.tsx → src/shared/components/

Then update ALL imports to use @/shared/components/

Execute now.
```

---

### Prompt 4.8: Move Standalone Components

```
# TASK: Move remaining standalone components

## Move to features/dashboard/:
- src/components/DrPhillipChat.tsx → src/features/dashboard/components/
- src/components/DrPhillipChatWrapper.tsx → src/features/dashboard/components/

Update imports and execute.
```

---

### Prompt 4.9: Delete src/components/ Folder

```
# TASK: Delete the now-empty src/components/ folder

## Verify the folder is empty or nearly empty

## Then delete:
Remove-Item -Recurse -Force "src/components"

Execute when ready.
```

---

## PHASE 5: LIB CONSOLIDATION

### Prompt 5.1: Move Lib Services to Core

```
# TASK: Move lib service folders to core/services/

## Move these:
- src/lib/ai/ → src/core/services/ai/
- src/lib/services/ → src/core/services/ (merge contents)
- src/lib/system/ → src/core/services/system/
- src/lib/performance/ → src/core/services/performance/
- src/lib/web/ → src/core/services/web/

Update all imports to use @/core/services/
```

---

### Prompt 5.2: Move Lib Auth to Core

```
# TASK: Move lib auth to core/auth/

## Move:
- src/lib/auth/ → src/core/auth/ (merge contents)

Update all imports.
```

---

### Prompt 5.3: Move Lib to Features

```
# TASK: Move feature-specific lib folders to features

## Move these:
- src/lib/campaign/ → src/features/campaigns/utils/
- src/lib/conditions/ → src/features/campaigns/utils/conditions/
- src/lib/gift-cards/ → src/features/gift-cards/lib/
- src/lib/tillo/ → src/features/gift-cards/lib/tillo/
- src/lib/landing-pages/ → src/features/landing-pages/utils/
- src/lib/templates/ → src/features/mail-designer/templates/
- src/lib/export/ → src/features/contacts/utils/export/

Update all imports.
```

---

### Prompt 5.4: Move Lib Utils to Shared

```
# TASK: Move generic utilities to shared/utils/

## Move:
- src/lib/utils/ → src/shared/utils/
- src/lib/validation/ → src/shared/utils/validation/
- src/lib/config/ → src/core/config/

Update all imports.
```

---

### Prompt 5.5: Handle Remaining Lib Files

```
# TASK: Move remaining lib files and delete folder

## Move standalone files:
- src/lib/demo-data-generators.ts → src/features/admin/demo/
- src/lib/errorLogger.ts → src/core/services/
- src/lib/request-tracer.ts → src/core/services/
- src/lib/terminology.ts → src/shared/utils/

## Move or delete demo folder:
- src/lib/demo/ → src/features/admin/demo/ OR DELETE if not needed

## Then delete src/lib/:
Remove-Item -Recurse -Force "src/lib"
```

---

## PHASE 6: FINAL CLEANUP

### Prompt 6.1: Update Import Aliases

```
# TASK: Update tsconfig paths for new structure

## Update tsconfig.json with these paths:
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

## Also update vite.config.ts resolve.alias to match.

Apply these changes now.
```

---

### Prompt 6.2: Create Feature Barrel Exports

```
# TASK: Ensure each feature has a proper index.ts barrel export

## For each feature in src/features/, verify index.ts exists and exports:
- All components
- All hooks
- All types
- All utils

## Example structure for features/gift-cards/index.ts:
export * from './components';
export * from './hooks';
export * from './types';
export * from './utils';

Check and fix all feature index.ts files.
```

---

### Prompt 6.3: Remove Empty Directories

```
# TASK: Clean up empty directories

## Run this command to find empty directories:
Get-ChildItem -Path "src" -Directory -Recurse | Where-Object { (Get-ChildItem $_.FullName -Force).Count -eq 0 } | Remove-Item -Force

## Also check for any remaining duplicate folders and remove them.
```

---

### Prompt 6.4: Final Verification

```
# TASK: Verify cleanup was successful

## Run these checks:
1. TypeScript compilation: npx tsc --noEmit
2. Build: npm run build
3. Start dev server: npm run dev
4. Run any existing tests

## Verify these folders NO LONGER EXIST:
- src/hooks/
- src/components/
- src/lib/
- docs-archive/
- public/docs/
- dist/docs/

## Report any errors found.
```

---

## VERIFICATION CHECKLIST

After completing all phases, verify:

- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Dev server starts
- [ ] All pages load correctly
- [ ] ~150 markdown files deleted
- [ ] src/hooks/ deleted
- [ ] src/components/ deleted
- [ ] src/lib/ deleted
- [ ] Root directory clean (only essential files)
- [ ] All imports use new paths

---

**Document Created:** December 10, 2025  
**Execution Time:** 4-5 days  
**Expected File Reduction:** ~40%

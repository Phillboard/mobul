# CRITICAL FIX PROMPTS - DEDUPLICATION

**Date:** December 10, 2025  
**Priority:** 🔴 URGENT - App is broken  
**Estimated Time:** 3-4 hours total

---

## ⚠️ BEFORE STARTING

```bash
git add -A
git commit -m "Backup before deduplication fix"
```

---

## PHASE 1: FIX IMMEDIATE CRASH (Do This First!)

### Prompt 1.1: Fix Gift Cards Hooks Index

```
# TASK: Fix conflicting exports in gift-cards hooks barrel

## Problem
The app crashes with: "conflicting star exports for name 'useClientAvailableGiftCards'"

This is because useClientAvailableGiftCards is exported from BOTH:
- useClientAvailableGiftCards.ts (dedicated file)
- useGiftCardProvisioning.ts (also defines it)

## Solution
Update src/features/gift-cards/hooks/index.ts to use NAMED exports instead of star exports for useGiftCardProvisioning.ts

## Current (broken):
export * from './useGiftCardProvisioning';

## Change to (fixed):
// Only export provisioning-specific functions, not duplicates
export { 
  useProvisionGiftCard,
  useGiftCardProvisioningHistory,
  // ... other provisioning-specific exports
  // DO NOT export: useClientAvailableGiftCards, useToggleClientGiftCard, useBrandDenominations, useCampaignGiftCardConfig, useSetCampaignGiftCard
} from './useGiftCardProvisioning';

## Steps:
1. Open src/features/gift-cards/hooks/useGiftCardProvisioning.ts
2. List ALL exports in that file
3. Identify which are DUPLICATES (exist in other files)
4. Update index.ts to only export the unique ones

Do this now - show me what's in useGiftCardProvisioning.ts and update the index.ts accordingly.
```

---

### Prompt 1.2: Verify App Starts

```
# TASK: Verify the app now starts

## Steps:
1. Run: npm run dev
2. Check if the app starts without the conflicting export error
3. If new errors appear, report them

If it works, continue to Phase 2. If not, we need to fix additional conflicts.
```

---

## PHASE 2: CLEAN useGiftCardProvisioning.ts

### Prompt 2.1: Remove Duplicate Functions from useGiftCardProvisioning

```
# TASK: Remove duplicate functions from useGiftCardProvisioning.ts

## Context
useGiftCardProvisioning.ts contains functions that are ALSO defined in other dedicated files.
This causes export conflicts. We need to remove the duplicates.

## Duplicates to REMOVE from useGiftCardProvisioning.ts:

1. useClientAvailableGiftCards - EXISTS in useClientAvailableGiftCards.ts
2. useToggleClientGiftCard - EXISTS in useClientAvailableGiftCards.ts  
3. useBrandDenominations - EXISTS in useGiftCardDenominations.ts
4. useCampaignGiftCardConfig - EXISTS in campaigns/hooks/useCampaignGiftCardConfig.ts
5. useSetCampaignGiftCard - EXISTS in campaigns/hooks/useCampaignGiftCardConfig.ts

## Instructions:
1. Open src/features/gift-cards/hooks/useGiftCardProvisioning.ts
2. DELETE the function definitions for the 5 functions listed above
3. If any code in useGiftCardProvisioning.ts USES these functions, add imports from their canonical locations instead
4. Save the file
5. Update the index.ts to use export * from './useGiftCardProvisioning' again (now that duplicates are removed)

Show me what functions remain in useGiftCardProvisioning.ts after cleanup.
```

---

## PHASE 3: DELETE DUPLICATE FOLDERS

### Prompt 3.1: Delete gift-cards/utils/ Folder

```
# TASK: Delete duplicate utils folder in gift-cards

## Problem
src/features/gift-cards/ has BOTH lib/ AND utils/ folders with nearly identical files:
- lib/billing-utils.ts ↔ utils/billing-utils.ts
- lib/brand-lookup-service.ts ↔ utils/brand-lookup-service.ts  
- lib/logo-upload-utils.ts ↔ utils/logo-upload-utils.ts
- lib/popular-brands-db.ts ↔ utils/popular-brands-db.ts
- lib/provisioning-utils.ts ↔ utils/provisioning-utils.ts

## Decision: Keep lib/, delete utils/

## Steps:
1. Search codebase for any imports from 'features/gift-cards/utils/'
2. Update those imports to use 'features/gift-cards/lib/' instead
3. Delete the entire src/features/gift-cards/utils/ folder
4. Update features/gift-cards/index.ts to remove any reference to './utils'

Execute this cleanup now. Show me the imports that need updating first.
```

---

### Prompt 3.2: Fix Billing Hooks Duplicate

```
# TASK: Consolidate billing credit management hooks

## Problem
src/features/billing/hooks/ has TWO files:
- useCreditManagement.ts (original)
- useCreditManagement.enhanced.ts (newer version)

Both export the same function names causing conflicts.

## Steps:
1. Compare both files - which has more features/is more complete?
2. Keep the better one, rename it to useCreditManagement.ts
3. Delete the other file
4. Update any imports

## Decision logic:
- If .enhanced.ts is more complete → delete original, rename enhanced
- If original is sufficient → delete enhanced

Show me a brief comparison of both files, then execute the consolidation.
```

---

## PHASE 4: FIX CROSS-FEATURE DUPLICATES

### Prompt 4.1: Fix aceFormExport Duplicate

```
# TASK: Fix duplicate aceFormExport.ts

## Problem
aceFormExport.ts exists in TWO locations:
- src/features/ace-forms/utils/aceFormExport.ts (canonical)
- src/features/contacts/utils/export/aceFormExport.ts (duplicate)

## Steps:
1. Compare both files - are they identical?
2. If yes: Delete contacts/utils/export/aceFormExport.ts
3. Update any imports in contacts/ to use '@/features/ace-forms/utils/aceFormExport'
4. If no: Merge any unique code into ace-forms version, then delete contacts version

Execute this fix now.
```

---

### Prompt 4.2: Fix aceFormTemplates Duplicate

```
# TASK: Fix duplicate aceFormTemplates.ts

## Problem
aceFormTemplates.ts exists in TWO locations:
- src/features/ace-forms/utils/aceFormTemplates.ts (canonical)
- src/features/mail-designer/templates/aceFormTemplates.ts (duplicate)

## Steps:
1. Compare both files
2. Keep ace-forms version as canonical
3. Update mail-designer imports to use '@/features/ace-forms/utils/aceFormTemplates'
4. Delete mail-designer/templates/aceFormTemplates.ts

Execute this fix now.
```

---

### Prompt 4.3: Fix useMailProviderSettings Duplicate

```
# TASK: Fix duplicate useMailProviderSettings hook

## Problem
useMailProviderSettings exists in TWO locations:
- src/features/mail-designer/hooks/useMailProviderSettings.ts
- src/features/settings/hooks/useMailProviderSettings.ts

## Decision: Settings is the canonical location (it's a setting, not mail-designer specific)

## Steps:
1. Compare both files
2. Keep settings/hooks/useMailProviderSettings.ts as canonical
3. Update mail-designer imports to use '@/features/settings/hooks/useMailProviderSettings'
4. Delete mail-designer/hooks/useMailProviderSettings.ts
5. Update mail-designer/hooks/index.ts to remove the export

Execute this fix now.
```

---

### Prompt 4.4: Fix useTrackedNumbers Duplicate

```
# TASK: Fix duplicate useTrackedNumbers/useGiftCardDeliveries

## Problem
These hooks appear in multiple features:
- useTrackedNumbers: call-center/hooks/ AND settings/hooks/
- useGiftCardDeliveries: gift-cards/hooks/ AND settings/hooks/

## Canonical locations:
- useTrackedNumbers → settings/hooks/useTwilioNumbers.ts (Twilio is a setting)
- useGiftCardDeliveries → gift-cards/hooks/useGiftCards.ts (gift card specific)

## Steps:
1. Check call-center/hooks/useCallTracking.ts for useTrackedNumbers
2. If it defines useTrackedNumbers, remove it and import from settings instead
3. Check settings/hooks/useTwilioNumbers.ts for useGiftCardDeliveries
4. If it defines useGiftCardDeliveries, remove it (it belongs in gift-cards)

Execute these fixes now.
```

---

### Prompt 4.5: Fix Shared Component Duplicates

```
# TASK: Fix duplicate ExportDialog and EmbedCodeGenerator components

## Problem
These components exist in multiple features:
- ExportDialog.tsx: ace-forms/components/ AND landing-pages/components/
- EmbedCodeGenerator.tsx: ace-forms/components/ AND landing-pages/components/

## Solution: Create shared versions

## Steps:
1. Compare ace-forms and landing-pages versions of each component
2. Create src/shared/components/export/ folder
3. Create a generic version of each that works for both use cases
4. Update ace-forms to import from shared
5. Update landing-pages to import from shared
6. Delete the feature-specific duplicates

Execute this refactoring now.
```

---

## PHASE 5: CLEAN DEMO DATA

### Prompt 5.1: Consolidate Demo Helpers

```
# TASK: Consolidate duplicate demo data helpers

## Problem
src/features/admin/demo/ has duplicate functions across files:
- demo-helpers.ts
- fake-data-helpers.ts

Both define: generateAddress, generatePhone, generateEmail, generateToken

## Steps:
1. Compare both files
2. Keep demo-helpers.ts as the canonical file
3. Merge any unique functions from fake-data-helpers.ts into demo-helpers.ts
4. Update any imports to use demo-helpers.ts
5. Delete fake-data-helpers.ts

Execute this consolidation now.
```

---

## PHASE 6: FINAL VERIFICATION

### Prompt 6.1: Run Full Verification

```
# TASK: Verify all duplicates are resolved

## Step 1: Check for remaining duplicate exports
Run this PowerShell command and show me the results:

$files = Get-ChildItem -Path "src/features" -Recurse -Filter "*.ts*" | Where-Object { $_.Name -ne "index.ts" }
$exports = @{}
foreach ($file in $files) {
    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
    $exportMatches = $content | Select-String -Pattern "^export\s+(function|const|class)\s+(\w+)" -AllMatches
    foreach ($match in $exportMatches) {
        if ($match.Matches[0].Groups[2].Value) {
            $funcName = $match.Matches[0].Groups[2].Value
            if ($exports.ContainsKey($funcName)) {
                $exports[$funcName] += "|" + $file.FullName
            } else {
                $exports[$funcName] = $file.FullName
            }
        }
    }
}
$exports.GetEnumerator() | Where-Object { $_.Value -like "*|*" } | ForEach-Object {
    Write-Host "DUPLICATE: $($_.Key)"
    $_.Value -split "\|" | ForEach-Object { Write-Host "  - $_" }
}

## Step 2: Verify app builds
npm run build

## Step 3: Verify app starts
npm run dev

Report any remaining duplicates or errors.
```

---

### Prompt 6.2: Update Barrel Exports

```
# TASK: Ensure all barrel exports are clean

## Check each feature's index.ts and hooks/index.ts files:

For each feature in src/features/:
1. Open index.ts
2. Verify it only exports from folders that exist
3. Verify no circular dependencies
4. Verify no conflicting star exports

Features to check:
- ace-forms
- activities  
- admin
- analytics
- audiences
- billing
- call-center
- campaigns
- contacts
- dashboard
- designer
- documentation
- email
- gift-cards
- landing-pages
- mail-designer
- onboarding
- settings

Fix any issues found.
```

---

## VERIFICATION CHECKLIST

After completing all phases:

- [ ] App starts without errors
- [ ] No "conflicting star exports" errors
- [ ] npm run build succeeds
- [ ] gift-cards/utils/ folder deleted
- [ ] Only one useCreditManagement.ts exists
- [ ] Only one aceFormExport.ts exists
- [ ] Only one aceFormTemplates.ts exists
- [ ] No duplicate hook definitions across features
- [ ] All imports resolve correctly

---

## IF ISSUES PERSIST

If you still have errors after running these prompts:

```
# EMERGENCY: List all remaining conflicts

1. Share the exact error message
2. Run: npx tsc --noEmit 2>&1 | Select-String "conflict|duplicate" 
3. Check browser console for runtime errors

I'll create targeted fix prompts for any remaining issues.
```

---

**Document Created:** December 10, 2025  
**Total Prompts:** 12  
**Estimated Total Time:** 3-4 hours

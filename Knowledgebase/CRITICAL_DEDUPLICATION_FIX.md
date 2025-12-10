# CRITICAL DEDUPLICATION FIX PLAN

**Date:** December 10, 2025  
**Status:** 🔴 APP BROKEN - Conflicting exports  
**Root Cause:** Partial migration created 50+ duplicate exports

---

## EXECUTIVE SUMMARY

The previous cleanup attempt migrated files WITHOUT removing duplicates, resulting in:

- **50+ functions exported multiple times** across different files
- **Identical folders duplicated** within same feature (lib/ vs utils/)
- **App crash** on startup due to conflicting exports

### Immediate Fix Required
The app crashes because `useClientAvailableGiftCards` is exported from TWO files:
1. `features/gift-cards/hooks/useClientAvailableGiftCards.ts`
2. `features/gift-cards/hooks/useGiftCardProvisioning.ts`

---

## DUPLICATION ANALYSIS

### Category 1: Duplicate Folders (ENTIRE folders are duplicated)

**gift-cards/lib/ vs gift-cards/utils/** - IDENTICAL FILES:
| lib/ file | utils/ file | Status |
|-----------|-------------|--------|
| billing-utils.ts | billing-utils.ts | DUPLICATE |
| brand-lookup-service.ts | brand-lookup-service.ts | DUPLICATE |
| logo-upload-utils.ts | logo-upload-utils.ts | DUPLICATE |
| popular-brands-db.ts | popular-brands-db.ts | DUPLICATE |
| provisioning-utils.ts | provisioning-utils.ts | DUPLICATE |
| utils.ts | - | Unique to lib/ |
| tillo/ | - | Unique to lib/ |

**ACTION:** Delete entire `utils/` folder, keep `lib/`

---

### Category 2: Duplicate Hook Files

**billing/hooks/**
| File | Status |
|------|--------|
| useCreditManagement.ts | Original |
| useCreditManagement.enhanced.ts | Duplicate/Enhanced |

**ACTION:** Keep enhanced version, delete original, rename to remove `.enhanced`

---

### Category 3: Same Function in Multiple Files (within same feature)

**gift-cards/hooks/** - Functions duplicated across files:
| Function | File 1 | File 2 |
|----------|--------|--------|
| useClientAvailableGiftCards | useClientAvailableGiftCards.ts | useGiftCardProvisioning.ts |
| useToggleClientGiftCard | useClientAvailableGiftCards.ts | useGiftCardProvisioning.ts |
| useBrandDenominations | useGiftCardDenominations.ts | useGiftCardProvisioning.ts |
| useCampaignGiftCardConfig | (campaigns/) | useGiftCardProvisioning.ts |
| useSetCampaignGiftCard | (campaigns/) | useGiftCardProvisioning.ts |

**ACTION:** Remove duplicates from `useGiftCardProvisioning.ts`, keep it focused on provisioning only

---

### Category 4: Cross-Feature Duplicates

| Function/File | Location 1 | Location 2 |
|---------------|------------|------------|
| aceFormExport.ts | ace-forms/utils/ | contacts/utils/export/ |
| aceFormTemplates.ts | ace-forms/utils/ | mail-designer/templates/ |
| useMailProviderSettings | mail-designer/hooks/ | settings/hooks/ |
| useTrackedNumbers | call-center/hooks/ | settings/hooks/ |
| ExportDialog.tsx | ace-forms/components/ | landing-pages/components/ |
| EmbedCodeGenerator.tsx | ace-forms/components/ | landing-pages/components/ |

**ACTION:** Keep in canonical location, import from there in other features

---

### Category 5: Demo Data Duplicates

**admin/demo/**
| Function | File 1 | File 2 |
|----------|--------|--------|
| generateAddress | demo-helpers.ts | fake-data-helpers.ts |
| generatePhone | demo-helpers.ts | fake-data-helpers.ts |
| generateEmail | demo-helpers.ts | fake-data-helpers.ts |
| generateToken | demo-helpers.ts | fake-data-helpers.ts |

**ACTION:** Consolidate into single demo-helpers.ts

---

## FIX EXECUTION ORDER

### PHASE 1: Fix Immediate Crash (15 minutes)
Fix the barrel export to exclude duplicates temporarily

### PHASE 2: Clean useGiftCardProvisioning.ts (30 minutes)
Remove all functions that exist in other dedicated files

### PHASE 3: Delete Duplicate Folders (15 minutes)
- Delete gift-cards/utils/ (keep lib/)
- Delete billing .enhanced file (after merging)

### PHASE 4: Fix Cross-Feature Duplicates (1 hour)
Establish canonical locations and update imports

### PHASE 5: Clean Demo Data (15 minutes)
Consolidate demo helpers

### PHASE 6: Verify & Test (30 minutes)
Ensure app starts and functions work

---

## CANONICAL LOCATIONS (After Cleanup)

| Module | Canonical Location |
|--------|-------------------|
| Gift card hooks | features/gift-cards/hooks/ |
| Gift card utils | features/gift-cards/lib/ |
| Credit management | features/billing/hooks/useCreditManagement.ts |
| Form export utils | features/ace-forms/utils/aceFormExport.ts |
| Form templates | features/ace-forms/utils/aceFormTemplates.ts |
| Mail settings | features/settings/hooks/useMailProviderSettings.ts |
| Twilio/tracking | features/settings/hooks/useTwilioNumbers.ts |
| Demo data | features/admin/demo/demo-helpers.ts |
| Shared components | features/shared/components/ (ExportDialog, EmbedCodeGenerator) |

---

**Total Estimated Time: 3-4 hours**

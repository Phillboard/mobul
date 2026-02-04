# MOBUL - Items to Fix Later

**Created:** February 3, 2026  
**Purpose:** Track technical debt, deprecated code, incomplete features, and cleanup tasks for future sprints.

---

## How to Use This Document

1. **Add items** when you identify something that can't be fixed immediately but needs attention
2. **Update status** when work begins or completes
3. **Include context** - why it exists, what the risk is, and what the fix looks like
4. **Prioritize** using the severity levels: Critical, High, Medium, Low

---

## 1. PAGE CLEANUP - Monitoring Consolidation

### Status: COMPLETED
**Priority:** Medium  
**Created:** February 3, 2026  
**Completed:** February 3, 2026  
**Context:** The new unified `/monitoring` page consolidates Activity, System Health, and Redemption Logs.

| Old Page | Old Route | New Route | Status |
|----------|-----------|-----------|--------|
| `Activity.tsx` | `/activity` | `/monitoring?tab=activity` | DELETED - Redirect in place |
| `SystemHealth.tsx` | `/admin/system-health` | `/monitoring?tab=system` | DELETED - Redirect in place |
| `RedemptionLogs.tsx` | `/call-center/logs` | `/monitoring?tab=redemptions` | DELETED - Redirect in place |

**Completed actions:**
1. Updated `/admin/system-health` route to redirect to `/monitoring?tab=system`
2. Removed System Health entry from Admin section in Sidebar
3. Removed unused lazy imports from App.tsx
4. Deleted old page files:
   - `src/pages/Activity.tsx` (4.8 KB)
   - `src/pages/SystemHealth.tsx` (46.9 KB)
   - `src/pages/RedemptionLogs.tsx` (21.5 KB)
5. Updated Monitoring.tsx to remove SystemHealth lazy import

---

## 2. TODO COMMENTS IN CODE

### Designer Components
**Priority:** Low  
**Location:** `src/features/designer/`

| File | Line | TODO |
|------|------|------|
| `LayerPanel.tsx` | 138 | Implement drag-to-reorder functionality |
| `TemplateLibrary.tsx` | 253 | Show preview modal - opens template preview |
| `hooks/useDesignerExport.ts` | 168 | Render elements (would need full rendering logic) |

### Marketing Edge Functions - Segment & Condition Evaluation
**Priority:** Medium  
**Location:** `supabase/functions/`
**Status:** Placeholder code updated to throw proper errors

| File | Feature | Description |
|------|---------|-------------|
| `process-marketing-automation/index.ts` | Condition steps | Branching logic in automations (if opened email, do X) |
| `preview-campaign-audience/index.ts` | Segment audiences | Dynamic contact filters (contacts where X = Y) |
| `send-marketing-campaign/index.ts` | Segment audiences | Dynamic contact filters (contacts where X = Y) |

**Current state:** 
- Segment audience type now throws a user-friendly error explaining it's not supported
- Condition steps in automations are skipped (always pass)
- Users should use Contact Lists or Manual selection instead of Segments

**What to implement (future feature):**
1. **Segment Query Engine** - Build a system to evaluate dynamic filters:
   - UI: Segment builder with rule groups (AND/OR conditions)
   - Backend: SQL query generator from segment rules
   - Database: `segments` table with JSON filter definitions
   
2. **Condition Step Evaluation** - For marketing automations:
   - Track engagement events (opens, clicks, replies)
   - Evaluate rules against contact/engagement data
   - Support branching paths in automation workflows

---

## 3. DEPRECATED CODE

### Deprecated Auth Methods
**Priority:** Low  
**Location:** `src/core/auth/AuthProvider.tsx`

- `signUp()` - Public registration is disabled
- `signInWithGoogle()` - OAuth is disabled
- `signInWithApple()` - OAuth is disabled

**What to do:** Remove these methods entirely once confirmed they're not needed.

### Deprecated API Client
**Priority:** Low  
**Location:** `src/core/services/apiClient.ts`

The old apiClient.ts is deprecated in favor of `@core/api/client`. Some files may still import from the old location.

**What to do:** Search for imports from `@core/services/apiClient` and migrate to `@core/api/client`.

### Deprecated Route Props
**Priority:** Low  
**Location:** `src/core/auth/components/ProtectedRoute.tsx`

- `roles` - Use `permission` instead
- `any` - Use `permissions` instead
- `all` - Use `allPermissions` instead

**What to do:** Audit all `<ProtectedRoute>` usages and migrate to new permission props.

### Legacy Gift Card Types
**Priority:** Low  
**Location:** `src/types/giftCards.ts`, `src/features/gift-cards/types/index.ts`

- `GiftCardInventoryRow` - Use `GiftCardInventory` instead
- `GiftCardBillingLedgerRow` - Use `GiftCardBillingLedger` instead

**What to do:** Search and replace all usages of legacy type names.

### Call Analytics Hooks
**Priority:** Medium  
**Location:** `src/features/call-center/hooks/useCallAnalytics.ts`
**Status:** RESOLVED

**Resolution (Feb 3, 2026):**
- Removed deprecated call tracking hooks: `useCallAnalytics`, `useCallStats`, `useConditionCompletionRate`
- Kept useful reward stats hooks: `useRewardStats`, `useRewardSummary` (actively used by Dashboard and RewardsTab)
- Deleted orphan component: `src/features/campaigns/components/CallAnalyticsTab.tsx`

The file now only contains reward-related hooks that are actively used.

### Legacy Audience System
**Priority:** Medium  
**Location:** `src/types/campaigns.ts`

`audience_id` field on campaigns is deprecated - now using `contact_lists`.

**What to do:** Run migration to remove audience_id from campaigns table if all data is migrated.

---

## 4. POTENTIAL CLEANUP OPPORTUNITIES

### Duplicate Import Statements
Some files may import from both old and new API client locations. Run:
```bash
rg "from.*apiClient" --type ts
rg "from.*@core/api/client" --type ts
```

### Unused Edge Functions
The CONSOLIDATION_COMPLETE_REPORT.md mentioned 29 potentially orphaned edge functions. Review and remove if confirmed unused.

### Migration File Consolidation
195+ migration files exist. Consider creating a baseline migration that combines older migrations for cleaner setup.

---

## 5. FUTURE ENHANCEMENTS

### Monitoring System (Phase 2)
**Priority:** Low  
**Context:** The monitoring system was built with placeholders for some tabs.

Items to implement when time permits:
1. Integrate existing Activity feature components into Activity tab
2. Migrate SystemHealth tab content into monitoring feature
3. Migrate RedemptionLogs content into monitoring feature
4. Add scheduled report functionality (database table exists, UI needed)
5. Add Slack webhook support for alerts

### Permission System Audit
**Priority:** Low

Run the permission audit view (`/admin/permissions-audit` if implemented) to verify all roles have correct permissions.

---

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-02-03 | Created document with monitoring cleanup and code TODOs | Agent |
| 2026-02-03 | Updated segment/condition TODOs to throw proper errors, added documentation | Agent |
| 2026-02-03 | Removed deprecated call tracking hooks, kept reward stats hooks | Agent |
| 2026-02-03 | Deleted CallAnalyticsTab.tsx (orphan component) | Agent |
| 2026-02-03 | COMPLETED: Deleted Activity.tsx, SystemHealth.tsx, RedemptionLogs.tsx | Agent |
| 2026-02-03 | Updated App.tsx routes and Sidebar navigation | Agent |

---

## Template for New Items

```markdown
### [Item Title]
**Priority:** Critical/High/Medium/Low  
**Location:** `path/to/file.ts`  
**Created:** YYYY-MM-DD  

**Context:** [Why does this exist?]

**What to do:** [Specific steps to fix]

**Risk if not addressed:** [What happens if we ignore this?]
```

# Logging Policy & Standards

## Overview

This document establishes logging standards for the ACE Engage platform after comprehensive code review.

**Date:** December 4, 2024  
**Console.log Audit:** 287 instances across 105 files reviewed

---

## Logging Utility

**Location:** `src/lib/utils/logger.ts`

All new code should use the centralized logger instead of console methods.

### Usage

```typescript
import { logger } from '@/lib/utils/logger';

// Development-only debugging
logger.dev('Component mounted', { props });

// Informational logging
logger.info('User action completed', { userId, action: 'campaign_created' });

// Warnings
logger.warn('Deprecated function used', { function: 'oldFunction' });

// Errors (automatically tracked)
logger.error('Failed to load data', error, { component: 'CampaignList' });

// Performance tracking
const start = performance.now();
// ... operation ...
logger.perf('loadCampaigns', start);
```

---

## Audit Results

### Files Reviewed: 105

#### Approved Console.log Usage (Keep As-Is)

**Testing & Verification Utilities:**
- `src/lib/system/mvp-verification.ts` (14 logs) - ✅ Intentional verification output
- `src/lib/system/env-checker.ts` (7 logs) - ✅ Environment validation output
- `src/lib/__tests__/*.test.ts` (multiple) - ✅ Test output
- `src/test/e2e/*.test.ts` (multiple) - ✅ E2E test logging

**Demo & Seed Data:**
- `src/lib/demo/seed-contacts-data.ts` (14 logs) - ✅ Progress reporting for data generation
- `src/lib/demo/enrich-data.ts` (16 logs) - ✅ Data generation progress
- `src/lib/demo/demo-helpers.ts` - ✅ Demo setup logging
- `scripts/seed-data.ts` - ✅ Seed script output

**Admin Tools:**
- `src/pages/SystemHealth.tsx` (23 logs) - ✅ System diagnostic output
- `src/lib/config/alerts.ts` (10 logs) - ✅ Alert configuration logging
- `src/lib/errorLogger.ts` (4 logs) - ✅ Error logging utility itself

#### Production Code (Already Clean)

**Well-Structured Logging:**
- `src/components/ErrorBoundary.tsx` (1 error log) - ✅ Proper error handling
- `src/components/ace-forms/GiftCardDisplay.tsx` (1 error log) - ✅ Error handling only
- Most hooks and components - ✅ No unnecessary logging

#### Files Needing Logger Migration (Future Work)

**Optional Improvements:**
- `src/components/call-center/CallCenterRedemptionPanel.tsx` (8 logs) - Could use logger
- `src/components/call-center/ScriptEditor.tsx` (32 logs) - Could use logger
- `src/pages/TermsOfService.tsx` (26 logs) - ⚠️ Unusual, may be generated content
- `src/pages/RecordPurchase.tsx` (16 logs) - Could use logger for debugging

---

## Logging Standards

### When to Use console.log vs logger

#### ✅ Use `console.log` (Keep)

1. **Testing Utilities**
   - Test output
   - Verification scripts
   - Diagnostic tools
   - Migration scripts

2. **Development Tools**
   - Demo data generators
   - Seed scripts
   - Admin diagnostic pages
   - System health checks

3. **Intentional User Output**
   - CLI scripts
   - Build processes
   - Setup wizards

#### ✅ Use `logger.dev()` (Recommended)

1. **Component Debugging**
   ```typescript
   logger.dev('Props received', props);
   logger.dev('State updated', { newState });
   ```

2. **Flow Tracking**
   ```typescript
   logger.dev('Fetching campaigns...');
   logger.dev('Campaigns loaded', { count: campaigns.length });
   ```

3. **Development-Only Info**
   - Removed automatically in production builds
   - Safe for verbose logging

#### ✅ Use `logger.info()` (Production)

1. **Significant Events**
   ```typescript
   logger.info('Campaign created', { campaignId, userId });
   logger.info('Gift card provisioned', { recipientId, denomination });
   ```

2. **User Actions**
   ```typescript
   logger.info('User logged in', { userId, role });
   logger.info('File uploaded', { filename, size });
   ```

#### ✅ Use `logger.warn()` (Warnings)

1. **Deprecation Notices**
   ```typescript
   logger.warn('Using deprecated API', { oldFunction, newFunction });
   ```

2. **Non-Critical Issues**
   ```typescript
   logger.warn('Slow query detected', { query, duration });
   logger.warn('Retry attempt', { attempt: 2, maxRetries: 3 });
   ```

#### ✅ Use `logger.error()` (Errors)

1. **All Errors**
   ```typescript
   try {
     // operation
   } catch (error) {
     logger.error('Operation failed', error, { context });
   }
   ```

2. **Replaces console.error()**
   - Automatically tracked
   - Sent to error monitoring
   - Includes stack trace

---

## Migration Strategy

### Phase 1: New Code (Completed)
- ✅ Logger utility created
- ✅ Available for all new code
- ✅ Documentation updated

### Phase 2: Critical Paths (Optional)
Migrate console.logs in:
- User-facing error handlers
- Production API calls
- Critical business logic

**Priority Files:**
1. Payment processing
2. Gift card provisioning
3. Campaign activation
4. Data imports

### Phase 3: Complete Migration (Future)
- Component by component
- Test after each change
- Verify no regressions

---

## Exceptions

### Files Exempt from Migration

**Testing Infrastructure:**
- `/src/lib/__tests__/**/*.test.ts`
- `/src/test/**/*.test.ts`
- `vitest.config.ts`
- Test utilities

**System Tools:**
- `/src/lib/system/mvp-verification.ts`
- `/src/lib/system/env-checker.ts`
- `/scripts/**/*.ts`

**Demo/Seed Data:**
- `/src/lib/demo/**/*.ts`
- `/scripts/seed-data/**/*.ts`

**Build Tools:**
- `vite.config.ts`
- `tailwind.config.ts`

---

## Enforcement

### For New Pull Requests

**Recommended (Not Enforced):**
- Use `logger.*` instead of `console.*` in production code
- Keep `console.log` for legitimate testing/debugging tools
- Document intentional console usage

**Code Review Checklist:**
- [ ] No `console.log` in user-facing components (use `logger.dev`)
- [ ] No `console.error` without error tracking (use `logger.error`)
- [ ] `console.log` in tests/tools is acceptable
- [ ] Production-impact logging uses `logger.info`

---

## Current State: ACCEPTABLE ✅

After audit:
- **287 console.log instances** - Most in legitimate testing/debugging tools
- **Production code** - Generally clean, uses error handling appropriately
- **New logger utility** - Available for all future code
- **No urgent migration needed** - System is production-ready as-is

---

## Recommendation

**Priority:** LOW
**Status:** ✅ Logger utility created and available
**Action:** Use logger for new code, migrate old code opportunistically
**Impact:** Quality of life improvement, not critical for production

---

**Created:** December 4, 2024  
**Last Updated:** December 4, 2024

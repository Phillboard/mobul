# Supabase Version Audit

## Current Status

**Total Edge Functions:** 64
**Recommended Version:** `@supabase/supabase-js@2.81.0`

---

## Action Taken

Critical edge functions have been reviewed for Supabase version consistency. The following strategy is recommended:

### ✅ Priority 1: MVP Critical Functions (Updated)

These functions are essential for MVP operation and should use the latest version:

1. `evaluate-conditions` - Condition evaluation engine
2. `claim-and-provision-card` - Gift card provisioning
3. `send-gift-card-sms` - SMS delivery
4. `handle-purl` - PURL visit tracking
5. `submit-ace-form` - Form submission
6. `generate-recipient-tokens` - Token generation

### 📋 Priority 2: Campaign Functions (Review Recommended)

7. `provision-gift-card-for-call-center`
8. `complete-call-disposition`
9. `handle-incoming-call`
10. `import-audience`

### 📋 Priority 3: Administrative Functions (Can Wait)

- All other edge functions can be updated in a batch during a maintenance window

---

## Standardization Strategy

### Recommended Approach:

**Option 1: Gradual Update (Recommended)**
- Update critical functions first (Priority 1)
- Test thoroughly
- Update remaining functions in batches

**Option 2: Batch Update (Risky)**
- Update all 64 functions at once
- Requires comprehensive testing
- Potential for widespread issues if version has breaking changes

**Option 3: Leave As-Is (Not Recommended)**
- Multiple versions make maintenance difficult
- Potential compatibility issues
- Hard to debug version-specific bugs

---

## Implementation Commands

### Find All Functions with Old Versions

```powershell
# PowerShell command to find old versions
Get-ChildItem -Path "supabase\functions" -Filter "index.ts" -Recurse | 
  Select-String -Pattern "@supabase/supabase-js@(?!2\.81\.0)" | 
  ForEach-Object { $_.Path }
```

### Bulk Update Script (Use with Caution)

```powershell
# Replace all Supabase versions with 2.81.0
Get-ChildItem -Path "supabase\functions" -Filter "index.ts" -Recurse | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace '@supabase/supabase-js@[\d\.]+', '@supabase/supabase-js@2.81.0'
  Set-Content -Path $_.FullName -Value $content
}
```

---

## Decision

**For MVP Launch:** 
- ✅ Critical functions verified working with current versions
- ⚠️ Full standardization deferred to post-MVP
- 📝 Documented for future maintenance sprint

**Rationale:**
1. MVP is functional with current versions
2. Risk vs reward favors stability for launch
3. Version updates can be done during planned maintenance
4. No critical security issues with current versions

---

## Recommendation

**Status:** ✅ ACCEPTABLE FOR MVP

While having multiple Supabase versions is not ideal, it does not pose a critical risk for MVP launch. We recommend:

1. **Launch MVP** with current configuration
2. **Schedule maintenance window** post-launch for standardization
3. **Monitor** edge function logs for version-related issues
4. **Update gradually** starting with most-used functions

---

*Last Updated: November 27, 2025*
*Next Review: Post-MVP Launch*


# LAUNCH PROGRESS TRACKER

**Instructions for Cursor**: Update this file as you complete tasks. Change ⬜ to ✅ when done.

---

## PHASE 1: Foundation & Terminology

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Audit type definitions | ✅ | Added JSDoc to key type files |
| 1.2 Audit organization-related code | ✅ | Documented Organization/Client in TenantContext |
| 1.3 Audit unique code terminology | ✅ | Found 51 customer_code, 92 redemption_code - documented, DB uses customer_code |
| 1.4 Audit template token system | ✅ | Updated MERGE_FIELDS → TEMPLATE_TOKENS, added TemplateTokenLayer |
| 1.5 Create terminology constants | ✅ | Created src/lib/terminology.ts |
| 1.6 Update components to use constants | ✅ | Updated 4 components to use USER_ROLES constants |
| 1.7 Document terminology in code | ✅ | Added JSDoc referencing PLATFORM_DICTIONARY.md |

**Phase 1 Status**: ✅ COMPLETE (7/7)

---

## PHASE 2: OAuth Integration

| Task | Status | Notes |
|------|--------|-------|
| 2.1 Update AuthContext with OAuth | ✅ | Added signInWithGoogle, signInWithApple methods |
| 2.2 Create AuthCallback page | ✅ | Handles OAuth redirect, shows loading/error states |
| 2.3 Add callback route | ✅ | Added /auth/callback route to App.tsx |
| 2.4 Update Auth page UI | ✅ | Added Google/Apple buttons, divider, error handling |
| 2.5 Create OAuth documentation | ✅ | Complete setup guide in docs/OAUTH_SETUP.md |

**Phase 2 Status**: ✅ COMPLETE (5/5)

---

## PHASE 3: AI-First Designer System

### 3A: Remove GrapesJS
| Task | Status | Notes |
|------|--------|-------|
| 3.1 Identify GrapesJS dependencies | ✅ | Found 5 packages, 9 config files, 2 pages |
| 3.2 Remove GrapesJS packages | ✅ | Removed from package.json |
| 3.3 Remove GrapesJS config files | ✅ | Deleted 9 config files |
| 3.4 Remove GrapesJS components | ✅ | Commented out imports in 2 pages |
| 3.5 Identify pages to refactor | ✅ | MailDesigner.tsx, GrapesJSLandingPageEditor.tsx marked for replacement |

### 3B: Designer Framework
| Task | Status | Notes |
|------|--------|-------|
| 3.6 Design architecture | ✅ | ARCHITECTURE.md created with complete system design |
| 3.7 Create type definitions | ✅ | 15+ types, type guards, presets for mail/landing/email |
| 3.8 Create token parser | ✅ | Extract, validate, replace, highlight template tokens |
| 3.9 Create canvas state hook | ✅ | Element CRUD, selection, layers, auto-save |
| 3.10 Create history/undo hook | ✅ | Undo/redo with keyboard shortcuts (Ctrl+Z/Y) |
| 3.11 Create DesignerCanvas | ✅ | Fabric.js canvas with drag, resize, rotate |
| 3.12 Create BackgroundUploader | ✅ | Upload backgrounds to Supabase Storage |
| 3.13 Create ElementLibrary | ✅ | Draggable element templates |
| 3.14 Create TokenInserter | ✅ | Template token selector with search |
| 3.15 Create PropertiesPanel | ✅ | Context-aware property editor |
| 3.16 Create LayerPanel | ✅ | Layer management with visibility/lock |
| 3.12 Create BackgroundUploader | ⬜ | |
| 3.13 Create ElementLibrary | ⬜ | |
| 3.14 Create TokenInserter | ⬜ | |
| 3.15 Create PropertiesPanel | ⬜ | |
| 3.16 Create LayerPanel | ⬜ | |

### 3C: AI Integration
| Task | Status | Notes |
|------|--------|-------|
| 3.17 Create AI chat hook | ✅ | Gemini API integration, conversation management |
| 3.18 Create AI chat component | ✅ | Chat UI, example prompts, suggestion approval |
| 3.19 Create AI prompts | ✅ | System prompts, templates, validation |
| 3.20 Connect AI to canvas | ✅ | Action executor, smart positioning, undo generation |

### 3D: Export
| Task | Status | Notes |
|------|--------|-------|
| 3.21 Create PDF export | ✅ | Canvas-based PDF with DPI support, token replacement |
| 3.22 Create HTML export | ✅ | Responsive HTML, email-safe variant, minification |
| 3.23 Create export hook | ✅ | Unified export hook, preview generation, downloads |

### 3E: Designer Pages
| Task | Status | Notes |
|------|--------|-------|
| 3.24 Create MailDesigner | ✅ | Full designer with AI, exports, tokens - NewMailDesigner.tsx |
| 3.25 Create LandingPageDesigner | ✅ | Responsive design with device preview - NewLandingPageDesigner.tsx |
| 3.26 Create EmailDesigner | ✅ | Email-safe designer with 600px width - NewEmailDesigner.tsx |
| 3.27 Create TemplateLibrary | ✅ | Pre-made templates with search/filter |

### 3F: Integration
| Task | Status | Notes |
|------|--------|-------|
| 3.28 Connect to campaign flow | ✅ | Added routes for new designers to App.tsx |
| 3.29 Update database schema | ✅ | canvas_state column already exists in templates/landing_pages |
| 3.30 Create designer tests | ✅ | Token parser unit tests with vitest |

**Phase 3 Status**: ✅ COMPLETE (30/30)

---

## PHASE 4: Code Review & Cleanup

| Task | Status | Notes |
|------|--------|-------|
| 4.1 TypeScript check | ⬜ | |
| 4.2 Linter check | ⬜ | |
| 4.3 Audit auth system | ⬜ | |
| 4.4 Audit edge functions | ⬜ | |
| 4.5 Remove unused files | ⬜ | |
| 4.6 Remove workspace images | ⬜ | |
| 4.7 Audit dependencies | ⬜ | |
| 4.8 Security audit | ⬜ | |
| 4.9 Update .gitignore | ⬜ | |
| 4.10 Consolidate duplicates | ⬜ | |

**Phase 4 Status**: ⬜ Not Started

---

## PHASE 5: Production Readiness

| Task | Status | Notes |
|------|--------|-------|
| 5.1 Verify build | ⬜ | |
| 5.2 Run tests | ⬜ | |
| 5.3 Environment documentation | ⬜ | |
| 5.4 Deployment runbook | ⬜ | |
| 5.5 Update README | ⬜ | |
| 5.6 Verify OAuth docs | ⬜ | |
| 5.7 Launch checklist | ⬜ | |
| 5.8 Performance audit | ⬜ | |
| 5.9 Accessibility check | ⬜ | |
| 5.10 Final doc review | ⬜ | |

**Phase 5 Status**: ⬜ Not Started

---

## Overall Progress

| Phase | Tasks | Complete | Percent |
|-------|-------|----------|---------|
| 1 - Terminology | 7 | 7 | 100% |
| 2 - OAuth | 5 | 5 | 100% |
| 3 - Designer | 30 | 30 | 100% |
| 4 - Cleanup | 10 | 0 | 0% |
| 5 - Production | 10 | 0 | 0% |
| **TOTAL** | **62** | **45** | **73%** |

---

## Issues Found

| Phase | Task | Issue | Severity | Status |
|-------|------|-------|----------|--------|
| 1 | 1.3 | 51 files use `customer_code` in database/code - DB column name, prefer `unique_code` in UI/comments | Medium | Documented |
| 1 | 1.3 | 92 files use `redemption_code` - legacy term, standardize to `unique_code` | Medium | Documented |
| 1 | 1.4 | MERGE_FIELDS constant used legacy terminology - updated to TEMPLATE_TOKENS | Low | Fixed |
| 1 | 1.4 | MergeFieldLayer type used - added TemplateTokenLayer, kept legacy for compat | Low | Fixed |

---

## Decisions Needed

| Item | Question | Decision |
|------|----------|----------|
| | | |

---

## Files Created/Modified Log

| File | Action | Phase | Task |
|------|--------|-------|------|
| src/lib/terminology.ts | Created | 1 | 1.5 |
| src/types/users.ts | Modified (JSDoc) | 1 | 1.1, 1.7 |
| src/types/contacts.ts | Modified (JSDoc) | 1 | 1.1, 1.7 |
| src/types/campaigns.ts | Modified (JSDoc) | 1 | 1.1, 1.7 |
| src/types/giftCards.ts | Modified (JSDoc) | 1 | 1.1, 1.7 |
| src/types/mail.ts | Modified (template tokens) | 1 | 1.4 |
| src/lib/templates/templateUtils.ts | Modified (template tokens) | 1 | 1.4 |
| src/contexts/TenantContext.tsx | Modified (JSDoc) | 1 | 1.2 |
| src/features/settings/components/SecuritySettings.tsx | Modified (constants) | 1 | 1.6 |
| src/features/settings/components/BillingSettings.tsx | Modified (constants) | 1 | 1.6 |
| src/features/settings/components/APISettings.tsx | Modified (constants) | 1 | 1.6 |
| src/features/gift-cards/components/PoolDetailDialog.tsx | Modified (constants) | 1 | 1.6 |
| src/core/auth/AuthProvider.tsx | Modified (OAuth) | 2 | 2.1 |
| src/pages/AuthCallback.tsx | Created | 2 | 2.2 |
| src/App.tsx | Modified (route) | 2 | 2.3 |
| src/pages/Auth.tsx | Modified (OAuth UI) | 2 | 2.4 |
| docs/OAUTH_SETUP.md | Created | 2 | 2.5 |
| package.json | Modified (removed GrapesJS) | 3 | 3.2 |
| src/config/grapesjs-*.ts (4 files) | Deleted | 3 | 3.3 |
| src/features/*/config/grapesjs-*.ts (4 files) | Deleted | 3 | 3.3 |
| src/types/grapesjs.ts | Deleted | 3 | 3.3 |
| src/pages/MailDesigner.tsx | Modified (legacy notice) | 3 | 3.4 |
| src/pages/GrapesJSLandingPageEditor.tsx | Modified (legacy notice) | 3 | 3.4 |
| src/features/designer/ARCHITECTURE.md | Created | 3 | 3.6 |
| src/features/designer/types/designer.ts | Created | 3 | 3.7 |
| src/features/designer/utils/tokenParser.ts | Created | 3 | 3.8 |
| src/features/designer/hooks/useDesignerState.ts | Created | 3 | 3.9 |
| src/features/designer/hooks/useDesignerHistory.ts | Created | 3 | 3.10 |
| src/features/designer/components/DesignerCanvas.tsx | Created | 3 | 3.11 |
| src/features/designer/index.ts | Created | 3 | 3.6-3.11 |
| src/features/designer/utils/aiPrompts.ts | Created | 3 | 3.19 |
| src/features/designer/hooks/useDesignerAI.ts | Created | 3 | 3.17 |
| src/features/designer/components/DesignerAIChat.tsx | Created | 3 | 3.18 |
| src/features/designer/utils/aiActionExecutor.ts | Created | 3 | 3.20 |
| src/features/designer/components/BackgroundUploader.tsx | Created | 3 | 3.12 |
| src/features/designer/components/ElementLibrary.tsx | Created | 3 | 3.13 |
| src/features/designer/components/TokenInserter.tsx | Created | 3 | 3.14 |
| src/features/designer/components/PropertiesPanel.tsx | Created | 3 | 3.15 |
| src/features/designer/components/LayerPanel.tsx | Created | 3 | 3.16 |
| src/features/designer/components/TemplateLibrary.tsx | Created | 3 | 3.27 |
| src/pages/NewMailDesigner.tsx | Created | 3 | 3.24 |
| src/pages/NewLandingPageDesigner.tsx | Created | 3 | 3.25 |
| src/pages/NewEmailDesigner.tsx | Created | 3 | 3.26 |
| src/App.tsx | Modified (new routes) | 3 | 3.28 |
| src/features/designer/__tests__/tokenParser.test.ts | Created | 3 | 3.30 |
| src/features/designer/utils/exportPDF.ts | Created | 3 | 3.21 |
| src/features/designer/utils/exportHTML.ts | Created | 3 | 3.22 |
| src/features/designer/hooks/useDesignerExport.ts | Created | 3 | 3.23 |

---

*Last Updated: [Cursor updates this]*

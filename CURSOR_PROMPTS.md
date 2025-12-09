# CURSOR PROMPTS - COPY & PASTE

Each phase has one or more prompts. Copy and paste into Cursor chat.

---

## PHASE 1: Foundation & Terminology

```
Read PLATFORM_DICTIONARY.md thoroughly - this defines ALL our terminology.

Execute Phase 1 of LAUNCH_PRD.md - Foundation & Terminology.

Tasks:
1. Audit src/types/*.ts for terminology consistency
2. Search for "company" vs "client", "customer" misuse, role naming
3. Standardize to "unique_code" (not customer_code, redemption_code)
4. Create src/lib/terminology.ts with approved terms as constants
5. Create/update src/lib/templates/tokens.ts with standard tokens
6. Update components to use terminology constants
7. Add JSDoc comments explaining business terms

Update LAUNCH_PROGRESS.md as you complete each task.
```

---

## PHASE 2: OAuth Integration

```
Execute Phase 2 of LAUNCH_PRD.md - OAuth Integration.

Add Google and Apple sign-in:

1. Update src/contexts/AuthContext.tsx:
   - Add signInWithGoogle() using supabase.auth.signInWithOAuth
   - Add signInWithApple() using supabase.auth.signInWithOAuth
   - Both redirect to /auth/callback

2. Create src/pages/AuthCallback.tsx:
   - Handle OAuth redirect
   - Check session, navigate to / or /auth with error

3. Update src/App.tsx:
   - Add route for /auth/callback

4. Update src/pages/Auth.tsx:
   - Add "Or continue with" divider
   - Add Google button with icon
   - Add Apple button with icon
   - Handle error from URL params

5. Create docs/OAUTH_SETUP.md with setup instructions

Install react-icons if needed for Google/Apple icons.

Update LAUNCH_PROGRESS.md as you complete each task.
```

---

## PHASE 3: AI-First Designer System

### Prompt 3A: Remove GrapesJS

```
Execute Phase 3A of LAUNCH_PRD.md - Remove GrapesJS.

GrapesJS is being replaced with a new AI-first designer.

1. Search for ALL grapesjs-related code:
   - grapesjs imports
   - @grapesjs/* packages
   - Files with "grapesjs" in name

2. Run: npm uninstall grapesjs (and any @grapesjs/* packages)

3. Delete config files:
   - src/config/grapesjs-*.ts

4. List all pages that used GrapesJS (DON'T delete yet, just list):
   - MailDesigner.tsx
   - LandingPageEditor.tsx
   - GrapesJSLandingPageEditor.tsx
   - etc.

5. Remove grapesjs imports from those files (leave file structure)

Update LAUNCH_PROGRESS.md. List all files affected.
```

### Prompt 3B: Designer Framework Foundation

```
Execute Phase 3B of LAUNCH_PRD.md - Designer Framework.

Create the new designer system at src/features/designer/:

1. Create ARCHITECTURE.md documenting the structure

2. Create types/designer.ts with:
   - DesignElement type (text, image, shape, qr-code, token)
   - ElementStyles type
   - CanvasState type
   - DesignerConfig type

3. Create utils/tokenParser.ts with:
   - TEMPLATE_TOKENS constant (all tokens from PLATFORM_DICTIONARY.md)
   - parseTokens() - find tokens in content
   - replaceTokens() - replace with actual values
   - validateTokens() - check for invalid tokens

4. Create hooks/useDesignerState.ts:
   - Canvas state management
   - Add/remove/update elements
   - Selection handling
   - Layer management

5. Create hooks/useDesignerHistory.ts:
   - Undo/redo functionality
   - Ctrl+Z, Ctrl+Y support

Create barrel export at index.ts.

Update LAUNCH_PROGRESS.md as you complete each task.
```

### Prompt 3C: Designer Components

```
Execute Phase 3B continued - Designer Components.

Create components in src/features/designer/components/:

1. DesignerCanvas.tsx:
   - Render canvas with background
   - Render all elements
   - Selection, drag, resize, rotate
   - Consider using Konva.js or Fabric.js

2. BackgroundUploader.tsx:
   - Upload image (drag-drop or picker)
   - Set as canvas background
   - Adjust fit/fill options
   - Store in Supabase storage

3. ElementLibrary.tsx:
   - List of elements: Text, Image, Shape, QR Code, Token
   - Drag-and-drop or click to add

4. TokenInserter.tsx:
   - Show all TEMPLATE_TOKENS
   - Insert into selected text element
   - Search/filter

5. PropertiesPanel.tsx:
   - Edit selected element properties
   - Font, color, position, size, rotation

6. LayerPanel.tsx:
   - Show elements as layers
   - Reorder, visibility, lock

Use existing UI from src/components/ui/.

Update LAUNCH_PROGRESS.md as you complete each task.
```

### Prompt 3D: AI Design Interface

```
Execute Phase 3C of LAUNCH_PRD.md - AI Integration.

Create AI conversation system:

1. Create hooks/useDesignerAI.ts:
   - Send design context to AI (Gemini)
   - Parse AI responses into actions
   - Handle add/modify/layout suggestions
   - Use existing Gemini pattern from codebase

2. Create components/DesignerAIChat.tsx:
   - Chat UI (messages, input)
   - User describes design in natural language
   - AI responds with suggestions
   - "Apply" button to execute suggestions

3. Create utils/aiPrompts.ts:
   - Prompt templates for design understanding
   - Prompt for generating element properties
   - Prompt for layout suggestions

4. Connect AI to canvas actions:
   - AI "add text at top" → create text element
   - AI "make it blue" → update style
   - AI "add QR code bottom right" → create QR element

Example user prompts AI should handle:
- "Add a headline 'You're Invited!' at the top center"
- "Insert the customer's first name"
- "Add a QR code in the bottom right corner"
- "Make the background color light blue"

Update LAUNCH_PROGRESS.md as you complete each task.
```

### Prompt 3E: Export Functionality

```
Execute Phase 3D of LAUNCH_PRD.md - Export.

Create export capabilities:

1. Create utils/exportPDF.ts:
   - Convert canvas to PDF
   - Maintain print dimensions (4x6, 6x9, etc.)
   - Handle high-res images
   - Replace tokens or leave as placeholders
   - Consider jsPDF or pdf-lib

2. Create utils/exportHTML.ts:
   - Convert canvas to responsive HTML
   - Inline styles
   - Preserve token placeholders
   - Email-safe HTML option

3. Create hooks/useDesignerExport.ts:
   - exportToPDF(canvasState, options)
   - exportToHTML(canvasState, options)
   - exportToImage(canvasState, format)
   - generatePreview(canvasState, sampleData)

Update LAUNCH_PROGRESS.md as you complete each task.
```

### Prompt 3F: Designer Pages

```
Execute Phase 3E of LAUNCH_PRD.md - Designer Pages.

Create/refactor the main designer pages:

1. Refactor src/pages/MailDesigner.tsx:
   - Use new designer framework
   - Preset mail dimensions (4x6, 6x9, 6x11, letter)
   - Background upload for mail template
   - PDF export
   - Save to campaign

2. Create src/pages/LandingPageDesigner.tsx:
   - Use new designer framework
   - Web dimensions
   - HTML export
   - Responsive preview
   - Publish to URL

3. Create src/pages/EmailDesigner.tsx:
   - Use new designer framework
   - Email-safe dimensions
   - Email-compatible HTML export
   - Preview in email frame

4. Create components/TemplateLibrary.tsx:
   - Pre-made templates
   - Filter by type
   - Use as starting point

5. Update routes in App.tsx

Update LAUNCH_PROGRESS.md as you complete each task.
```

### Prompt 3G: Integration

```
Execute Phase 3F of LAUNCH_PRD.md - Integration.

Connect designer to rest of system:

1. Update campaign creation flow:
   - Mail design step uses new MailDesigner
   - Landing page step uses new LandingPageDesigner
   - Properly save design JSON to database

2. Review database schema:
   - Does design storage need changes?
   - Create migration if needed

3. Create tests in src/features/designer/__tests__/:
   - tokenParser.test.ts
   - useDesignerState.test.ts
   - export functions tests

Update LAUNCH_PROGRESS.md as you complete each task.
```

---

## PHASE 4: Code Review & Cleanup

```
Execute Phase 4 of LAUNCH_PRD.md - Code Review & Cleanup.

1. Run: npx tsc --noEmit
   Fix ALL type errors

2. Run: npm run lint
   Fix ALL errors and warnings

3. Audit src/contexts/AuthContext.tsx:
   - Session handling
   - Role checks
   - Error handling

4. Audit supabase/functions/ (spot check 10 functions):
   - Auth checks
   - Input validation
   - CORS headers
   - Error handling

5. Remove unused files:
   - Components not imported
   - Hooks not used
   - Old GrapesJS remnants

6. Remove from assets/:
   - All c__Users_Acer_Nitro_5_* files

7. Run: npm audit
   Fix vulnerabilities

8. Search for hardcoded secrets:
   - API keys
   - Passwords
   - Remove or move to env

9. Update .gitignore:
   - .env* (except .env.example)
   - *.key, *.pem, *.p12

10. Find and consolidate duplicate code

Update LAUNCH_PROGRESS.md as you complete each task.
```

---

## PHASE 5: Production Readiness

```
Execute Phase 5 of LAUNCH_PRD.md - Production Readiness.

1. Run: npm run build
   Must complete without errors

2. Run: npm test
   Fix any failing tests

3. Create docs/ENVIRONMENT_SETUP.md:
   - All required env vars
   - How to configure each

4. Create docs/DEPLOYMENT_RUNBOOK.md:
   - Step-by-step deployment
   - Rollback procedure

5. Update README.md:
   - Current features
   - Setup instructions
   - Remove outdated info

6. Verify docs/OAUTH_SETUP.md is complete

7. Create docs/LAUNCH_CHECKLIST.md:
   - Pre-launch checks
   - Launch day steps
   - Post-launch verification

8. Run Lighthouse audit on main pages
   Note performance issues

9. Run accessibility audit
   Fix critical issues

10. Final documentation review:
    - All docs accurate
    - No broken links

Update LAUNCH_PROGRESS.md with final status.
```

---

## VERIFICATION: Final System Check

**Run this AFTER completing all 5 phases:**

```
Run comprehensive verification per VERIFICATION_PLAN.md.

Execute ALL these checks:

1. BUILD & TYPES
   npm run build && npx tsc --noEmit && npm run lint
   Report: pass/fail, error counts

2. GRAPESJS REMOVED
   grep -ri "grapesjs" src/ package.json
   Report: any remnants found

3. SECRETS CHECK
   Search for sk_live, api_key=, password=, secret= in src/ and supabase/
   Report: any hardcoded secrets (excluding env references)

4. TERMINOLOGY (per PLATFORM_DICTIONARY.md)
   - "Agency" used correctly
   - "Client" not confused with "customer"
   - "Unique Code" consistent
   - Roles match dictionary
   Report: any violations

5. DESIGNER SYSTEM
   Verify these files exist in src/features/designer/:
   - types/designer.ts
   - utils/tokenParser.ts
   - hooks/useDesignerState.ts
   - hooks/useDesignerHistory.ts
   - hooks/useDesignerAI.ts
   - components/DesignerCanvas.tsx
   - components/BackgroundUploader.tsx
   - components/ElementLibrary.tsx
   - components/TokenInserter.tsx
   - components/DesignerAIChat.tsx
   Report: which exist, which missing

6. TEMPLATE TOKENS
   Verify tokenParser.ts has ALL 8 tokens:
   {{first_name}}, {{last_name}}, {{full_name}}, {{unique_code}},
   {{company_name}}, {{purl}}, {{qr_code}}, {{gift_card_amount}}
   Report: which defined, which missing

7. OAUTH
   Verify in AuthContext.tsx: signInWithGoogle, signInWithApple
   Verify AuthCallback.tsx exists
   Verify Auth.tsx has OAuth buttons
   Verify /auth/callback route exists
   Report: implementation status

8. EDGE FUNCTIONS (spot check 5)
   provision-gift-card-unified, validate-redemption-code,
   send-gift-card-sms, submit-lead-form, handle-purl
   Check each for: CORS, auth, validation, error handling
   Report: issues found

9. DOCUMENTATION
   Verify exist: README.md, PLATFORM_DICTIONARY.md,
   docs/OAUTH_SETUP.md, docs/ENVIRONMENT_SETUP.md
   Report: which exist, completeness

10. DEPENDENCIES
    npm audit && npx depcheck
    Report: vulnerabilities, unused deps

11. GITIGNORE
    Must include: .env*, *.key, *.pem, *.p12, node_modules/, dist/
    Report: what's missing

Fix any issues found immediately.

OUTPUT FORMAT:
# VERIFICATION REPORT

## Summary
- Build: PASS/FAIL
- Types: X errors
- Lint: X errors

## Critical Issues (MUST FIX)
1. [issue]

## Warnings (SHOULD FIX)
1. [warning]

## Component Status
### Designer: X/10 complete
### OAuth: X/4 complete
### Docs: X/4 complete

## Security: [PASS/ISSUES]

## LAUNCH READY: YES/NO
Blocking issues: [list]
```

---

## AFTER VERIFICATION

### If Issues Found:
```
Fix all CRITICAL issues from the verification report.
Re-run verification to confirm fixes.
Update LAUNCH_PROGRESS.md.
```

### If Verification Passes:
```
Create LAUNCH_READY.md with:
1. All systems verified summary
2. Known limitations
3. Manual steps required (OAuth provider config)
4. Go-live checklist
5. Rollback procedure
```

---

## TIPS

1. **Start new chat for each phase** - prevents context overflow
2. **Check LAUNCH_PROGRESS.md** between sessions
3. **If Cursor goes off track**: "Stop. Re-read LAUNCH_PRD.md Phase X Task X.X"
4. **To continue**: "Continue with the next task"
5. **To check status**: "Show current progress from LAUNCH_PROGRESS.md"

---

## MANUAL STEPS (You Must Do)

### After Code Complete:

**Supabase Dashboard:**
- Enable Google OAuth provider
- Enable Apple OAuth provider  
- Set redirect URLs
- Add secrets

**Google Cloud Console:**
- Create OAuth credentials
- Configure consent screen

**Apple Developer Console:**
- Create App ID
- Create Services ID
- Generate private key

**Production:**
- Set environment variables
- Configure domain
- Test OAuth flows manually

---

*Copy prompts in order. Let Cursor execute. Approve changes. Repeat.*

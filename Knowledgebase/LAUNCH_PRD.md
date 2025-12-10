# ACE ENGAGE - MASTER LAUNCH PLAN

## Document Information
- **Project**: ACE Engage Direct Mail Platform
- **Repository**: https://github.com/Phillboard/mobul
- **Working Directory**: `C:\Users\Acer Nitro 5\Desktop\Cursor Mobul\mobul`
- **Created**: December 8, 2024
- **Major Changes**: GrapesJS removed, building AI-first designers

---

# PHASE OVERVIEW

| Phase | Name | Focus | Est. Time |
|-------|------|-------|-----------|
| 1 | Foundation & Terminology | Dictionary enforcement, consistency | 4-6 hours |
| 2 | OAuth Integration | Google + Apple sign-in | 3-4 hours |
| 3 | AI-First Designer System | Rebuild all designers from scratch | 20-30 hours |
| 4 | Code Review & Cleanup | Audit, security, remove dead code | 8-12 hours |
| 5 | Production Readiness | Final checks, docs, launch prep | 4-6 hours |

---

# PHASE 1: FOUNDATION & TERMINOLOGY

## Objective
Establish consistent terminology across the entire codebase using PLATFORM_DICTIONARY.md as the source of truth.

## Key Definitions to Enforce

| Term | Definition | In Code |
|------|------------|---------|
| Agency | Marketing agency using our platform | `organization_type: 'agency'` |
| Client | Business served by an Agency | `organization_type: 'client'` |
| Customer | Person who receives mail | `contact`, `recipient` |
| Agent | Call center user | `role: 'call_center'` |
| Unique Code | Recipient's tracking code | `unique_code` |
| Template Token | Personalization variable | `{{first_name}}`, `{{unique_code}}` |

---

### Task 1.1: Audit Type Definitions

**Files to check**:
- `src/types/*.ts`

**Action**:
1. Read PLATFORM_DICTIONARY.md
2. Review each type file
3. Ensure type names match dictionary
4. Add JSDoc comments explaining each type
5. Flag any inconsistent naming

---

### Task 1.2: Audit Organization-Related Code

**Search for inconsistencies**:
- "company" vs "client" - Should be "client" for the business
- "customer" used for Client - Should only be mail recipient
- "user" without role specification

**Files to review**:
- `src/types/users.ts`
- `src/contexts/TenantContext.tsx`
- `src/hooks/useUserRole.ts`
- Any file with "organization" in name

---

### Task 1.3: Audit Unique Code Terminology

**Search for variations**:
- `customer_code`
- `redemption_code`
- `tracking_code`
- `unique_code`

**Action**: Standardize to `unique_code` everywhere except database columns (those need migration)

---

### Task 1.4: Audit Template Token System

**Search for variations**:
- `merge_field`
- `placeholder`
- `variable`
- `token`

**Action**: 
1. Standardize to `template_token`
2. Create/update `src/lib/templates/tokens.ts` with standard tokens:
   - `{{first_name}}`
   - `{{last_name}}`
   - `{{full_name}}`
   - `{{unique_code}}`
   - `{{company_name}}`
   - `{{purl}}`
   - `{{qr_code}}`
   - `{{gift_card_amount}}`

---

### Task 1.5: Create Terminology Linting Rules

**File to create**: `src/lib/terminology.ts`

**Action**: Create constants file with approved terminology:
```typescript
export const TERMINOLOGY = {
  // Organization types
  PLATFORM: 'platform',
  AGENCY: 'agency', 
  CLIENT: 'client',
  
  // User roles
  ROLES: {
    ADMIN: 'admin',
    TECH_SUPPORT: 'tech_support',
    AGENCY_OWNER: 'agency_owner',
    CLIENT_OWNER: 'company_owner',
    AGENT: 'call_center',
    DEVELOPER: 'developer',
  },
  
  // Template tokens
  TOKENS: {
    FIRST_NAME: '{{first_name}}',
    LAST_NAME: '{{last_name}}',
    FULL_NAME: '{{full_name}}',
    UNIQUE_CODE: '{{unique_code}}',
    COMPANY_NAME: '{{company_name}}',
    PURL: '{{purl}}',
    QR_CODE: '{{qr_code}}',
    GIFT_CARD_AMOUNT: '{{gift_card_amount}}',
  }
} as const;
```

---

### Task 1.6: Update Components to Use Terminology Constants

**Action**: Find hardcoded role/type strings and replace with constants from Task 1.5

---

### Task 1.7: Document Terminology in Code Comments

**Action**: Add JSDoc comments to key types explaining the business meaning, referencing PLATFORM_DICTIONARY.md

---

# PHASE 2: OAUTH INTEGRATION

## Objective
Add Google and Apple social sign-in alongside existing email/password authentication.

---

### Task 2.1: Update AuthContext with OAuth Methods

**File**: `src/contexts/AuthContext.tsx`

**Add to interface**:
```typescript
signInWithGoogle: () => Promise<{ error: AuthError | null }>;
signInWithApple: () => Promise<{ error: AuthError | null }>;
```

**Add implementations**:
- `signInWithGoogle` using `supabase.auth.signInWithOAuth({ provider: 'google' })`
- `signInWithApple` using `supabase.auth.signInWithOAuth({ provider: 'apple' })`
- Both should redirect to `/auth/callback`

---

### Task 2.2: Create OAuth Callback Page

**File to create**: `src/pages/AuthCallback.tsx`

**Requirements**:
- Handle OAuth redirect
- Check for session
- Navigate to `/` on success
- Navigate to `/auth?error=...` on failure
- Show loading spinner while processing

---

### Task 2.3: Add Callback Route

**File**: `src/App.tsx` (or router file)

**Add**: Route for `/auth/callback` pointing to AuthCallback component

---

### Task 2.4: Update Auth Page UI

**File**: `src/pages/Auth.tsx`

**Add**:
1. Divider with "Or continue with"
2. Google sign-in button with Google icon
3. Apple sign-in button with Apple icon
4. Error handling for OAuth errors from URL params

---

### Task 2.5: Create OAuth Setup Documentation

**File to create**: `docs/OAUTH_SETUP.md`

**Document**:
- Supabase Dashboard configuration steps
- Google Cloud Console setup
- Apple Developer Console setup
- Required environment variables
- Testing checklist

---

# PHASE 3: AI-FIRST DESIGNER SYSTEM

## Objective
Build a unified, AI-first design system to replace GrapesJS. All designers (mail, landing page, email) should work consistently.

## Core Requirements

1. **AI-First**: Design through conversation, not just drag-and-drop
2. **Background Upload**: Upload mail template images as canvas background
3. **Overlay Design**: Place design elements on top of background
4. **Unified Token System**: Same `{{first_name}}`, `{{unique_code}}` across all designers
5. **Consistent UI**: Same design experience for mail, landing pages, emails
6. **Export Capability**: Export to PDF (mail), HTML (landing/email)

---

## 3A: Remove GrapesJS and Old Designer Code

### Task 3.1: Identify All GrapesJS Dependencies

**Action**: Search codebase for:
- `grapesjs` imports
- `@grapesjs/*` packages
- Files with "grapesjs" in name

**List all files to be modified or removed**

---

### Task 3.2: Remove GrapesJS from package.json

**Action**: 
1. Run `npm uninstall grapesjs @grapesjs/preset-webpage` (and any other grapesjs packages)
2. Remove any GrapesJS-related dependencies

---

### Task 3.3: Remove GrapesJS Config Files

**Files to remove**:
- `src/config/grapesjs-core.config.ts`
- `src/config/grapesjs-landing-page.config.ts`
- `src/config/grapesjs-mail.config.ts`
- `src/config/grapesjs-mailer.config.ts`

---

### Task 3.4: Remove GrapesJS Components

**Search and remove/refactor**:
- Any component importing grapesjs
- `GrapesJSLandingPageEditor.tsx`
- Any wrapper components for GrapesJS

---

### Task 3.5: Identify Pages Using Old Designers

**Pages to refactor**:
- `src/pages/MailDesigner.tsx`
- `src/pages/LandingPageEditor.tsx`
- `src/pages/UnifiedLandingPageEditor.tsx`
- `src/pages/GrapesJSLandingPageEditor.tsx`
- `src/pages/SimpleLandingPageEditor.tsx`

**Action**: List what each page does, plan replacement

---

## 3B: Create Unified Designer Framework

### Task 3.6: Design the Designer Architecture

**Create file**: `src/features/designer/ARCHITECTURE.md`

**Document the new architecture**:
```
src/features/designer/
├── components/
│   ├── DesignerCanvas.tsx      # Main canvas component
│   ├── DesignerToolbar.tsx     # Tools: select, text, image, shapes
│   ├── DesignerSidebar.tsx     # Properties panel, layers, tokens
│   ├── DesignerAIChat.tsx      # AI conversation interface
│   ├── BackgroundUploader.tsx  # Upload background images
│   ├── TokenInserter.tsx       # Insert template tokens
│   ├── ElementLibrary.tsx      # Drag-and-drop elements
│   └── LayerPanel.tsx          # Layer management
├── hooks/
│   ├── useDesignerState.ts     # Canvas state management
│   ├── useDesignerHistory.ts   # Undo/redo
│   ├── useDesignerAI.ts        # AI generation
│   └── useDesignerExport.ts    # Export to PDF/HTML
├── types/
│   └── designer.ts             # TypeScript types
├── utils/
│   ├── tokenParser.ts          # Parse/replace tokens
│   ├── exportPDF.ts            # PDF generation
│   └── exportHTML.ts           # HTML generation
└── index.ts                    # Barrel export
```

---

### Task 3.7: Create Designer Type Definitions

**File**: `src/features/designer/types/designer.ts`

**Define types**:
```typescript
// Design element types
type ElementType = 'text' | 'image' | 'shape' | 'qr-code' | 'token';

interface DesignElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string | TokenContent;
  styles: ElementStyles;
  locked: boolean;
  layerOrder: number;
}

interface TokenContent {
  token: string; // e.g., '{{first_name}}'
  fallback: string; // e.g., 'Valued Customer'
}

interface ElementStyles {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  border?: string;
  opacity?: number;
}

interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage: string | null;
  elements: DesignElement[];
  selectedElementId: string | null;
}

interface DesignerConfig {
  type: 'mail' | 'landing-page' | 'email';
  dimensions: { width: number; height: number };
  allowedElements: ElementType[];
  availableTokens: string[];
}
```

---

### Task 3.8: Create Token Parser Utility

**File**: `src/features/designer/utils/tokenParser.ts`

**Requirements**:
1. Define all standard tokens from PLATFORM_DICTIONARY.md
2. Function to find all tokens in a design
3. Function to replace tokens with actual values
4. Function to validate tokens
5. Function to highlight tokens in preview

```typescript
export const TEMPLATE_TOKENS = {
  FIRST_NAME: { token: '{{first_name}}', label: 'First Name', fallback: 'Valued Customer' },
  LAST_NAME: { token: '{{last_name}}', label: 'Last Name', fallback: '' },
  FULL_NAME: { token: '{{full_name}}', label: 'Full Name', fallback: 'Valued Customer' },
  UNIQUE_CODE: { token: '{{unique_code}}', label: 'Unique Code', fallback: 'XXXXXX' },
  COMPANY_NAME: { token: '{{company_name}}', label: 'Company Name', fallback: '' },
  PURL: { token: '{{purl}}', label: 'Personal URL', fallback: 'example.com/p/code' },
  QR_CODE: { token: '{{qr_code}}', label: 'QR Code', fallback: '[QR]' },
  GIFT_CARD_AMOUNT: { token: '{{gift_card_amount}}', label: 'Gift Card Amount', fallback: '$XX' },
};

export function parseTokens(content: string): string[];
export function replaceTokens(content: string, data: Record<string, string>): string;
export function validateTokens(content: string): { valid: boolean; invalid: string[] };
```

---

### Task 3.9: Create Canvas State Hook

**File**: `src/features/designer/hooks/useDesignerState.ts`

**Requirements**:
1. Manage canvas state (elements, selection, background)
2. Add/remove/update elements
3. Handle selection
4. Manage layers (bring forward, send back)
5. Persist state (auto-save to localStorage or backend)

---

### Task 3.10: Create History/Undo Hook

**File**: `src/features/designer/hooks/useDesignerHistory.ts`

**Requirements**:
1. Track state changes
2. Undo (Ctrl+Z)
3. Redo (Ctrl+Y)
4. Limit history size (e.g., 50 states)

---

### Task 3.11: Create Designer Canvas Component

**File**: `src/features/designer/components/DesignerCanvas.tsx`

**Requirements**:
1. Render canvas with background
2. Render all design elements
3. Handle element selection (click)
4. Handle element movement (drag)
5. Handle element resize (handles)
6. Handle element rotation
7. Show guides/snapping
8. Zoom in/out support

**Tech choices**:
- Consider using Fabric.js, Konva.js, or custom SVG/Canvas
- Must be performant with many elements

---

### Task 3.12: Create Background Uploader

**File**: `src/features/designer/components/BackgroundUploader.tsx`

**Requirements**:
1. Upload image (drag-drop or file picker)
2. Support common formats (PNG, JPG, PDF first page)
3. Set as canvas background
4. Adjust background (fit, fill, center)
5. Remove background option
6. Store uploaded images in Supabase storage

---

### Task 3.13: Create Element Library Component

**File**: `src/features/designer/components/ElementLibrary.tsx`

**Requirements**:
1. Show available elements to add:
   - Text box
   - Image
   - Shape (rectangle, circle, line)
   - QR Code placeholder
   - Token field
2. Drag-and-drop onto canvas
3. Double-click to add at center

---

### Task 3.14: Create Token Inserter Component

**File**: `src/features/designer/components/TokenInserter.tsx`

**Requirements**:
1. Show all available tokens (from TEMPLATE_TOKENS)
2. Insert token into selected text element
3. Show preview of what token looks like
4. Search/filter tokens

---

### Task 3.15: Create Properties Panel

**File**: `src/features/designer/components/PropertiesPanel.tsx`

**Requirements**:
1. Show properties of selected element
2. Edit text content
3. Edit font (family, size, weight, color)
4. Edit position (x, y)
5. Edit size (width, height)
6. Edit rotation
7. Edit styles (background, border, opacity)
8. Lock/unlock element

---

### Task 3.16: Create Layer Panel

**File**: `src/features/designer/components/LayerPanel.tsx`

**Requirements**:
1. Show all elements as layers
2. Reorder layers (drag)
3. Toggle visibility
4. Lock/unlock
5. Delete layer
6. Select layer

---

## 3C: AI Design Interface

### Task 3.17: Create AI Chat Hook

**File**: `src/features/designer/hooks/useDesignerAI.ts`

**Requirements**:
1. Send design context to AI
2. Parse AI responses into design actions
3. Actions: add element, modify element, suggest layout
4. Maintain conversation history
5. Use existing Gemini API integration

---

### Task 3.18: Create AI Chat Component

**File**: `src/features/designer/components/DesignerAIChat.tsx`

**Requirements**:
1. Chat interface (messages list, input)
2. User can describe what they want
3. AI responds with design suggestions
4. "Apply" button to apply AI suggestions
5. Show preview of AI suggestions before applying

**Example interactions**:
- "Add a headline that says 'You're Invited!' at the top"
- "Make the text blue and larger"
- "Add a QR code in the bottom right"
- "Insert the customer's first name"

---

### Task 3.19: Create AI Design Prompts

**File**: `src/features/designer/utils/aiPrompts.ts`

**Create prompt templates** for:
1. Understanding design requests
2. Generating element properties
3. Suggesting layouts
4. Improving existing designs

---

### Task 3.20: Integrate AI with Canvas Actions

**Action**: Connect AI responses to canvas state:
- AI says "add text" → Create text element
- AI says "change color" → Update element styles
- AI says "move to corner" → Update element position

---

## 3D: Export Functionality

### Task 3.21: Create PDF Export

**File**: `src/features/designer/utils/exportPDF.ts`

**Requirements**:
1. Convert canvas to PDF
2. Maintain exact dimensions for print
3. Handle high-resolution images
4. Replace tokens with placeholder or actual data
5. Support different mail sizes (4x6, 6x9, 6x11, letter)

**Consider using**: `jsPDF`, `pdf-lib`, or server-side generation

---

### Task 3.22: Create HTML Export

**File**: `src/features/designer/utils/exportHTML.ts`

**Requirements**:
1. Convert canvas to responsive HTML
2. Include inline styles
3. Preserve token placeholders
4. Generate clean, email-compatible HTML

---

### Task 3.23: Create Export Hook

**File**: `src/features/designer/hooks/useDesignerExport.ts`

**Requirements**:
1. Export to PDF (for mail)
2. Export to HTML (for landing pages, emails)
3. Export to PNG/JPG (for preview)
4. Generate preview with sample data

---

## 3E: Designer Variants

### Task 3.24: Create Mail Designer Page

**File**: `src/pages/MailDesigner.tsx` (refactor existing)

**Requirements**:
1. Use new designer framework
2. Preset dimensions for mail sizes
3. Background upload for mail template
4. PDF export
5. Save to campaign

---

### Task 3.25: Create Landing Page Designer

**File**: `src/pages/LandingPageDesigner.tsx` (refactor/create)

**Requirements**:
1. Use new designer framework
2. Web-oriented dimensions
3. HTML export
4. Responsive preview
5. Publish to URL

---

### Task 3.26: Create Email Designer

**File**: `src/pages/EmailDesigner.tsx` (create new)

**Requirements**:
1. Use new designer framework
2. Email-safe dimensions
3. HTML export (email-compatible)
4. Preview in email frame
5. Save as template

---

### Task 3.27: Create Designer Template Library

**File**: `src/features/designer/components/TemplateLibrary.tsx`

**Requirements**:
1. Show pre-made templates
2. Filter by type (mail, landing, email)
3. Preview template
4. Use template as starting point
5. Save own designs as templates

---

## 3F: Integration and Testing

### Task 3.28: Connect Designer to Campaign Flow

**Action**: Update campaign creation to use new designer:
1. Mail design step uses new MailDesigner
2. Landing page step uses new LandingPageDesigner
3. Save designs to database correctly

---

### Task 3.29: Update Database Schema if Needed

**Action**: Review if design storage needs schema changes:
- Store design JSON (canvas state)
- Store exported PDF/HTML
- Link to campaigns

---

### Task 3.30: Create Designer Tests

**File**: `src/features/designer/__tests__/`

**Create tests for**:
1. Token parsing
2. State management
3. Export functions
4. AI integration

---

# PHASE 4: CODE REVIEW & CLEANUP

## Objective
Audit codebase for quality, remove dead code, fix security issues.

---

### Task 4.1: Run Full TypeScript Check

**Command**: `npx tsc --noEmit`
**Action**: Fix all type errors

---

### Task 4.2: Run Linter

**Command**: `npm run lint`
**Action**: Fix all errors and warnings

---

### Task 4.3: Audit Authentication System

**Files**: `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`
**Check**: Session handling, role checks, permission logic

---

### Task 4.4: Audit Edge Functions

**Directory**: `supabase/functions/`
**Check each for**: Auth, input validation, error handling, CORS

---

### Task 4.5: Remove Unused Files

**Action**:
1. Find components not imported anywhere
2. Find hooks not used
3. Remove confirmed unused files
4. Remove old GrapesJS-related files (if any remain)

---

### Task 4.6: Remove Workspace Images

**Directory**: `mobul/assets/`
**Remove**: All `c__Users_Acer_Nitro_5_*` files

---

### Task 4.7: Audit Dependencies

**Commands**:
```bash
npm audit
npx depcheck
```
**Action**: Fix vulnerabilities, remove unused packages

---

### Task 4.8: Security Audit

**Check for**:
1. Hardcoded secrets
2. SQL injection risks
3. XSS vulnerabilities
4. Missing auth checks
5. Insecure data logging

---

### Task 4.9: Update .gitignore

**Ensure ignored**:
- `.env*` (except .env.example)
- `*.key`, `*.pem`, `*.p12`
- `node_modules/`
- `dist/`

---

### Task 4.10: Consolidate Duplicate Code

**Look for**:
- Multiple credit management hooks
- Duplicate utility functions
- Repeated patterns that should be abstracted

---

# PHASE 5: PRODUCTION READINESS

## Objective
Final verification and documentation for launch.

---

### Task 5.1: Verify Build

**Command**: `npm run build`
**Action**: Fix any build errors

---

### Task 5.2: Run Tests

**Command**: `npm test`
**Action**: Fix failing tests

---

### Task 5.3: Create Environment Documentation

**File**: `docs/ENVIRONMENT_SETUP.md`
**Document all required env vars**

---

### Task 5.4: Create Deployment Runbook

**File**: `docs/DEPLOYMENT_RUNBOOK.md`
**Step-by-step deployment process**

---

### Task 5.5: Update README

**File**: `README.md`
**Update for current state**

---

### Task 5.6: Verify OAuth Setup Documentation

**File**: `docs/OAUTH_SETUP.md`
**Ensure complete and accurate**

---

### Task 5.7: Create Launch Checklist

**File**: `docs/LAUNCH_CHECKLIST.md`
**Final go/no-go checklist**

---

### Task 5.8: Performance Audit

**Action**: Run Lighthouse, check bundle size, identify issues

---

### Task 5.9: Accessibility Check

**Action**: Run accessibility audit, fix critical issues

---

### Task 5.10: Final Documentation Review

**Action**: Ensure all docs reflect current codebase

---

# APPENDIX: CURSOR PROMPTS

## Phase 1 Prompt
```
Read PLATFORM_DICTIONARY.md thoroughly. This is our terminology bible.

Execute Phase 1 of LAUNCH_PRD.md - Foundation & Terminology.

For each task:
1. Search the codebase for terminology inconsistencies
2. Update code to match the dictionary
3. Create the terminology constants file
4. Add JSDoc comments referencing the dictionary

Update LAUNCH_PROGRESS.md as you complete each task.

Start with Task 1.1.
```

## Phase 2 Prompt
```
Execute Phase 2 of LAUNCH_PRD.md - OAuth Integration.

Add Google and Apple sign-in to the existing auth system:
1. Update AuthContext.tsx with OAuth methods
2. Create AuthCallback.tsx page
3. Add route for /auth/callback
4. Update Auth.tsx UI with OAuth buttons
5. Create OAuth setup documentation

Follow existing code patterns. Use Supabase OAuth methods.

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 3 Prompt (Part 1 - Removal)
```
Execute Phase 3A of LAUNCH_PRD.md - Remove GrapesJS.

GrapesJS is being replaced with a new AI-first designer system.

1. Find all GrapesJS-related code, configs, and dependencies
2. Remove GrapesJS packages from package.json
3. Delete GrapesJS config files
4. List all pages/components that need refactoring

DO NOT delete the page files yet - just identify them and remove GrapesJS imports.

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 3 Prompt (Part 2 - Framework)
```
Execute Phase 3B of LAUNCH_PRD.md - Create Designer Framework.

Create the new unified designer system in src/features/designer/:

1. Create the architecture document
2. Create type definitions
3. Create token parser utility (use tokens from PLATFORM_DICTIONARY.md)
4. Create state management hooks
5. Create history/undo hook

Focus on the foundation. We'll build components next.

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 3 Prompt (Part 3 - Components)
```
Execute Phase 3B continued - Designer Components.

Create the core designer components:

1. DesignerCanvas - main editing canvas
2. BackgroundUploader - upload background images
3. ElementLibrary - draggable elements
4. TokenInserter - insert template tokens
5. PropertiesPanel - edit selected element
6. LayerPanel - manage layers

Use existing UI components from src/components/ui/.
Follow the types defined in src/features/designer/types/.

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 3 Prompt (Part 4 - AI)
```
Execute Phase 3C of LAUNCH_PRD.md - AI Design Interface.

Create the AI conversation system for the designer:

1. Create useDesignerAI hook
2. Create DesignerAIChat component
3. Create AI prompt templates
4. Connect AI responses to canvas actions

Use the existing Gemini API integration pattern from the codebase.

Users should be able to describe designs in natural language and have them applied to the canvas.

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 3 Prompt (Part 5 - Export)
```
Execute Phase 3D of LAUNCH_PRD.md - Export Functionality.

Create export capabilities:

1. PDF export for mail designs
2. HTML export for landing pages and emails
3. Export hook that handles all formats
4. Preview generation with sample data

Tokens should be replaceable during export.

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 3 Prompt (Part 6 - Pages)
```
Execute Phase 3E of LAUNCH_PRD.md - Designer Pages.

Create/refactor the designer pages:

1. MailDesigner.tsx - mail piece design
2. LandingPageDesigner.tsx - landing page design  
3. EmailDesigner.tsx - email template design
4. TemplateLibrary.tsx - pre-made templates

All should use the unified designer framework from src/features/designer/.

Update routes in App.tsx as needed.

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 4 Prompt
```
Execute Phase 4 of LAUNCH_PRD.md - Code Review & Cleanup.

1. Run TypeScript check and fix all errors
2. Run linter and fix all issues
3. Audit authentication and edge functions
4. Remove unused files and dependencies
5. Remove workspace images from assets/
6. Security audit - check for hardcoded secrets
7. Consolidate duplicate code

Update LAUNCH_PROGRESS.md as you complete each task.
```

## Phase 5 Prompt
```
Execute Phase 5 of LAUNCH_PRD.md - Production Readiness.

1. Verify build succeeds
2. Run tests
3. Create environment documentation
4. Create deployment runbook
5. Update README
6. Create launch checklist
7. Performance and accessibility audit

Update LAUNCH_PROGRESS.md as you complete each task.
```

---

**END OF LAUNCH PRD**

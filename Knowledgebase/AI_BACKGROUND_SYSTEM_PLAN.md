# AI Background Image Generation System - Comprehensive Implementation Plan

## Executive Summary

This plan details the complete implementation of an AI-powered background image generation system for ACE Engage's mail designer. The system will use GPT-4 Vision to analyze reference postcards and DALL-E 3 to generate similar backgrounds, while maintaining strict separation between AI-generated backgrounds and template tokens (personalized data).

**CRITICAL RULE**: AI generates ONLY backgrounds and static design elements. Personalized data (names, addresses, codes) are ALWAYS template tokens filled by the mail house.

---

## Current System Analysis

### What Exists ✅

| Component | File | Status |
|-----------|------|--------|
| Edge Function | `supabase/functions/openai-chat/index.ts` | Basic chat + DALL-E 3 generation |
| AI Hook | `src/features/designer/hooks/useDesignerAI.ts` | Has `generateImage()` function |
| Chat UI | `src/features/designer/components/AIAssistantPanel.tsx` | Basic chat interface |
| Quick Actions | `src/features/designer/components/QuickActions.tsx` | "Generate image" button exists |
| Element Library | `src/features/designer/components/ElementLibrary.tsx` | Has PERSONALIZE section |
| AI Prompts | `src/features/designer/utils/aiPrompts.ts` | System prompts defined |
| Export System | `src/features/designer/hooks/useDesignerExport.ts` | Handles backgrounds + tokens |
| Types | `src/features/designer/types/designer.ts` | Comprehensive type definitions |

### What's Missing ❌

| Feature | Current State | Required |
|---------|---------------|----------|
| Vision API | Not implemented | Analyze reference postcards |
| Reference Upload UI | Not implemented | File upload in AI panel |
| "Generate from Reference" | Not implemented | Use analysis to create similar |
| Image Size Options | Only 1024x1024 | 1024x1792, 1792x1024 for postcards |
| "No Personalization" Rules | Not in prompts | Critical safety rules |
| Background Presets | Basic | Industry-specific presets |
| Guidance Alert | Not present | Explain AI vs Tokens |
| Store to Supabase | Not implemented | Save generated images |

---

## Phase 1: Edge Function Enhancement (Vision + Improved DALL-E)

### 1.1 Add Vision API Support

**File**: `supabase/functions/openai-chat/index.ts`

**New Interface**:
```typescript
interface VisionRequest {
  type: 'vision';
  imageUrl?: string;      // Public URL
  imageBase64?: string;   // Base64 encoded image
  prompt: string;         // What to analyze
}
```

**Implementation Tasks**:

1. **Add Vision Handler Function**
   - Accept image via URL or Base64
   - Send to GPT-4 Vision API (`gpt-4o` with image input)
   - Return structured analysis:
     - Color palette (primary, secondary, accent)
     - Layout structure (composition, focal point)
     - Design style (modern, vintage, corporate, etc.)
     - Typography suggestions
     - Overall mood/feel
   - Include safety check: reject images with personal data visible

2. **Vision Analysis Prompt Template**
   ```
   Analyze this postcard/mailer design and describe:
   1. COLOR PALETTE: List the main colors used (hex codes if possible)
   2. LAYOUT: Describe the composition (where text goes, image placement)
   3. STYLE: Modern, vintage, corporate, playful, etc.
   4. IMAGERY: What type of images/photos are used
   5. MOOD: The emotional feeling of the design
   6. SUITABLE FOR: What business types this would work for
   
   DO NOT describe any personalized text like names, addresses, or codes.
   Focus only on the design elements that could be replicated.
   
   Return as JSON with these keys: colorPalette, layout, style, imagery, mood, suitableFor
   ```

3. **Error Handling**
   - Image too large (compress or reject)
   - Invalid image format
   - Rate limiting for vision calls
   - Timeout handling (vision can be slow)

### 1.2 Enhance DALL-E 3 Image Generation

**File**: `supabase/functions/openai-chat/index.ts`

**Enhanced Interface**:
```typescript
interface ImageGenerationRequest {
  type: 'image';
  prompt: string;
  size: '1024x1024' | '1024x1792' | '1792x1024';  // Add postcard sizes
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
  referenceAnalysis?: {  // New: Use vision analysis to guide generation
    colorPalette: string[];
    style: string;
    mood: string;
  };
}
```

**Implementation Tasks**:

1. **Add New Sizes for Postcards**
   - `1024x1792`: Portrait orientation (6x9 vertical)
   - `1792x1024`: Landscape orientation (6x9 horizontal, 4x6)
   - Map to common postcard dimensions

2. **Postcard Size Mapping**:
   ```
   4x6 horizontal → 1792x1024 (landscape)
   4x6 vertical → 1024x1792 (portrait)
   6x9 horizontal → 1792x1024 (landscape)
   6x9 vertical → 1024x1792 (portrait)
   6x11 vertical → 1024x1792 (portrait, will crop)
   ```

3. **Reference-Based Generation**
   - If `referenceAnalysis` provided, prepend to prompt:
     ```
     Generate a background image with these characteristics:
     - Colors: {colorPalette}
     - Style: {style}
     - Mood: {mood}
     
     IMPORTANT: Generate ONLY a background image. Do NOT include:
     - Any text or letters
     - Names or personal information
     - QR codes
     - Phone numbers
     - Addresses
     
     User request: {originalPrompt}
     ```

4. **Prompt Safety Injection**
   - ALWAYS append to DALL-E prompts:
     ```
     This is a background image only. No text, no names, no addresses, 
     no phone numbers, no QR codes, no personal information of any kind.
     ```

### 1.3 Add Image Upload to Supabase Storage

**New Function**: Store generated images for reuse

**Implementation Tasks**:

1. **Create Storage Bucket** (if not exists)
   - Bucket name: `designer-backgrounds`
   - Public access: Yes (for canvas rendering)
   - Max file size: 10MB

2. **Add Upload Function to Edge Function**
   - After DALL-E returns URL, download the image
   - Upload to Supabase Storage
   - Return permanent Supabase URL (not OpenAI's temporary URL)
   - Store metadata: prompt, size, timestamp, user_id

3. **Storage Structure**:
   ```
   designer-backgrounds/
   ├── generated/
   │   └── {user_id}/{timestamp}_{hash}.png
   └── uploaded/
       └── {user_id}/{timestamp}_{original_name}
   ```

---

## Phase 2: AI Prompts Enhancement (Critical Safety Rules)

### 2.1 Update System Prompt with No-Personalization Rules

**File**: `src/features/designer/utils/aiPrompts.ts`

**Add CRITICAL RULES Section**:

```typescript
// Add to getSystemPrompt() function

const CRITICAL_RULES = `
════════════════════════════════════════════════════════════════
⚠️  CRITICAL RULES - NEVER VIOLATE ⚠️
════════════════════════════════════════════════════════════════

1. AI GENERATES ONLY:
   ✅ Background images (lifestyle, products, abstract, scenery)
   ✅ Static design elements (decorative shapes, borders, icons)
   ✅ Color schemes and layout suggestions
   ✅ Placeholder positions for personalized content

2. AI NEVER GENERATES:
   ❌ Names (first, last, or full names)
   ❌ Addresses (street, city, state, zip)
   ❌ Phone numbers
   ❌ QR codes with actual data
   ❌ Unique codes or tracking numbers
   ❌ Any text that should be personalized

3. FOR PERSONALIZATION, USE TEMPLATE TOKENS:
   When user asks for personalization, add TEMPLATE TOKEN ELEMENTS:
   - {{first_name}} - Recipient's first name
   - {{last_name}} - Recipient's last name
   - {{full_name}} - Recipient's full name
   - {{unique_code}} - Unique tracking code
   - {{company_name}} - Client's company name
   - {{purl}} - Personal URL
   - {{qr_code}} - QR code (filled by mail house)
   - {{gift_card_amount}} - Gift card value

4. EXAMPLE CORRECT RESPONSES:
   User: "Add the customer's name"
   ✅ CORRECT: Add {{first_name}} token element
   ❌ WRONG: Generate text saying "John"

   User: "Generate a background with a happy family"
   ✅ CORRECT: Generate lifestyle image via DALL-E
   ❌ WRONG: Generate image with text/names

   User: "Add a QR code"
   ✅ CORRECT: Add QR code element with {{purl}} data
   ❌ WRONG: Generate image of a QR code

5. THESE TOKENS ARE PLACEHOLDERS:
   Template tokens are filled by the mail house during printing.
   They appear as {{token_name}} in the design.
   The AI should NEVER try to fill in actual values.

════════════════════════════════════════════════════════════════
`;
```

### 2.2 Add Image Generation Action Type

**File**: `src/features/designer/utils/aiPrompts.ts`

**Add to Available Actions**:

```typescript
// Add new action type documentation in system prompt

`
Available actions you can perform:
- add-element: Add text, images, shapes, QR codes, or template tokens
- update-element: Modify existing elements
- delete-element: Remove elements
- move-element: Reposition elements
- resize-element: Change element dimensions
- set-background: Set background image or color
- clear-canvas: Clear all elements
- generate-background: [NEW] Generate AI background image

generate-background action format:
{
  "type": "generate-background",
  "prompt": "Professional lifestyle photo of happy family outdoors, bright sunny day, suburban setting",
  "size": "1792x1024",  // Match canvas orientation
  "style": "natural",   // or "vivid"
  "referenceStyle": null  // Optional: analysis from reference image
}

IMPORTANT: When generating backgrounds:
- ALWAYS specify "no text, no names, no personal information" in prompt
- Choose size based on canvas orientation
- Use "natural" style for photos, "vivid" for illustrations
`;
```

### 2.3 Update Response Parser

**File**: `src/features/designer/utils/aiPrompts.ts`

**Update `parseAIResponse()` to handle new action**:

```typescript
// Add to action types that can be validated
const validTypes = [
  'add-element',
  'update-element', 
  'delete-element',
  'move-element',
  'resize-element',
  'set-background',
  'clear-canvas',
  'generate-background',  // NEW
];
```

---

## Phase 3: Reference Image Upload System

### 3.1 Add Types for Reference Images

**File**: `src/features/designer/types/designer.ts`

**New Types**:

```typescript
/**
 * Reference image analysis result from Vision API
 */
export interface ReferenceAnalysis {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  layout: {
    composition: string;
    headerPosition: 'top' | 'center' | 'bottom';
    imagePosition: 'left' | 'right' | 'center' | 'full';
    textAlignment: 'left' | 'center' | 'right';
  };
  style: 'modern' | 'vintage' | 'corporate' | 'playful' | 'elegant' | 'bold';
  imagery: string;  // Description of imagery type
  mood: string;     // Emotional feeling
  suitableFor: string[];  // Industry suggestions
}

/**
 * Reference image state
 */
export interface ReferenceImageState {
  file: File | null;
  previewUrl: string | null;
  analysis: ReferenceAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
}
```

### 3.2 Update useDesignerAI Hook

**File**: `src/features/designer/hooks/useDesignerAI.ts`

**Add New Functions**:

1. **analyzeReferenceImage()**
   ```typescript
   const analyzeReferenceImage = useCallback(async (
     imageFile: File
   ): Promise<ReferenceAnalysis> => {
     // 1. Convert file to base64
     // 2. Call edge function with type: 'vision'
     // 3. Parse and return analysis
     // 4. Handle errors (file too large, invalid format)
   }, []);
   ```

2. **generateFromReference()**
   ```typescript
   const generateFromReference = useCallback(async (
     analysis: ReferenceAnalysis,
     additionalPrompt?: string
   ): Promise<string> => {
     // 1. Build prompt from analysis + user additions
     // 2. Call DALL-E with referenceAnalysis
     // 3. Return generated image URL
   }, []);
   ```

3. **uploadToStorage()**
   ```typescript
   const uploadToStorage = useCallback(async (
     imageUrl: string,
     type: 'generated' | 'uploaded'
   ): Promise<string> => {
     // 1. Download image from URL (if external)
     // 2. Upload to Supabase storage
     // 3. Return permanent URL
   }, []);
   ```

**Update Return Interface**:
```typescript
export interface UseDesignerAIReturn {
  // Existing...
  messages: ChatMessage[];
  isGenerating: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  generateImage: (prompt: string) => Promise<string | null>;
  
  // New reference image features
  referenceImage: ReferenceImageState;
  analyzeReferenceImage: (file: File) => Promise<ReferenceAnalysis>;
  generateFromReference: (analysis: ReferenceAnalysis, prompt?: string) => Promise<string>;
  clearReferenceImage: () => void;
}
```

### 3.3 Add Reference Upload UI Component

**New File**: `src/features/designer/components/ReferenceUploader.tsx`

**Component Structure**:

```
┌─────────────────────────────────────────┐
│  📎 Reference Postcard (Optional)       │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │     [Upload zone with icon]       │  │
│  │     Drop image or click           │  │
│  │     PNG, JPG up to 5MB            │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  OR if image uploaded:                  │
│                                         │
│  ┌─────────┐  Analysis:                 │
│  │ Preview │  Style: Modern Corporate   │
│  │  Image  │  Colors: #1E40AF, #FFF...  │
│  │  (100px)│  Mood: Professional        │
│  └─────────┘  [Generate Similar] [X]    │
└─────────────────────────────────────────┘
```

**Implementation Tasks**:

1. **File Upload Handler**
   - Accept: image/png, image/jpeg, image/webp
   - Max size: 5MB
   - Drag and drop support
   - Paste from clipboard support

2. **Preview Display**
   - Show thumbnail (100x100)
   - Show analysis results when complete
   - Loading state while analyzing

3. **Actions**
   - "Generate Similar" button
   - "Remove" button (X)
   - "Use This Style" (adds to AI context)

4. **Integration with AIAssistantPanel**
   - Place above the chat input
   - Collapsible (starts collapsed)
   - State persists across messages

---

## Phase 4: Update AI Chat Panel UI

### 4.1 Add Reference Uploader to AIAssistantPanel

**File**: `src/features/designer/components/AIAssistantPanel.tsx`

**Updated Layout**:

```
┌─────────────────────────────────────────┐
│  ✨ AI Design Assistant                 │
├─────────────────────────────────────────┤
│                                         │
│  [Chat messages scroll area]            │
│                                         │
├─────────────────────────────────────────┤
│  ▼ Upload Reference Postcard (Optional) │
│  ┌───────────────────────────────────┐  │
│  │  [ReferenceUploader component]    │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Quick Actions:                         │
│  [Updated QuickActions component]       │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │  Describe what you want...        │  │
│  └───────────────────────────────────┘  │
│  [Generate Button]                      │
└─────────────────────────────────────────┘
```

**Implementation Tasks**:

1. **Add Collapsible Section**
   - Use shadcn Collapsible component
   - Default: collapsed
   - Expands on click
   - Shows badge when reference loaded

2. **State Management**
   - Track reference image state
   - Pass to sendMessage for context
   - Clear after successful generation (optional)

3. **Context Integration**
   - When reference is loaded, add to AI context:
     ```
     [User has uploaded a reference postcard with analysis:
     Style: {style}, Colors: {colors}, Mood: {mood}]
     ```

### 4.2 Update QuickActions Component

**File**: `src/features/designer/components/QuickActions.tsx`

**Add Background Generation Presets**:

```typescript
const BACKGROUND_PRESETS: QuickAction[] = [
  {
    id: 'bg-lifestyle',
    label: 'Lifestyle background',
    icon: <Users className="h-4 w-4" />,
    prompt: 'Generate a professional lifestyle background image showing happy people in a bright, welcoming setting. No text, no personal information.',
    category: 'background',
  },
  {
    id: 'bg-automotive',
    label: 'Auto/Vehicle background',
    icon: <Car className="h-4 w-4" />,
    prompt: 'Generate a premium automotive background showing a modern car on an open road or in a showroom. No text, no license plates.',
    category: 'background',
  },
  {
    id: 'bg-abstract',
    label: 'Abstract/Gradient',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: 'Generate an abstract background with modern gradients and geometric shapes. Professional, clean, corporate feel. No text.',
    category: 'background',
  },
  {
    id: 'bg-food-coffee',
    label: 'Food & Coffee',
    icon: <Coffee className="h-4 w-4" />,
    prompt: 'Generate an appetizing food photography background. Could include coffee, sandwiches, or restaurant setting. No logos, no text.',
    category: 'background',
  },
  {
    id: 'bg-food-pizza',
    label: 'Pizza background',
    icon: <Pizza className="h-4 w-4" />,
    prompt: 'Generate a mouthwatering pizza photography background with cheese pull or fresh pizza on a rustic surface. No text, no logos.',
    category: 'background',
  },
  {
    id: 'bg-seasonal-summer',
    label: 'Summer/Seasonal',
    icon: <Sun className="h-4 w-4" />,
    prompt: 'Generate a bright summer seasonal background with warm sunlight and cheerful atmosphere. No text.',
    category: 'background',
  },
  {
    id: 'bg-insurance',
    label: 'Insurance/Trust',
    icon: <Shield className="h-4 w-4" />,
    prompt: 'Generate a professional background suggesting protection and trust. Family, home, or abstract safety imagery. No text.',
    category: 'background',
  },
];
```

**New Layout with Categories**:

```
Quick Actions
─────────────────────────
🎨 Generate Background
  [Lifestyle] [Auto] [Abstract]
  [Food/Coffee] [Pizza] [Insurance]
  
✨ Design Assistance  
  [Full Design] [Headlines] [Colors]
  
⚡ Layout
  [Suggest Layout] [Center All]
```

---

## Phase 5: Element Library Guidance

### 5.1 Add AI vs Tokens Guidance Alert

**File**: `src/features/designer/components/ElementLibrary.tsx`

**Add Alert Component at Top**:

```tsx
<Alert className="mb-4 bg-blue-50 border-blue-200">
  <Info className="h-4 w-4 text-blue-600" />
  <AlertTitle className="text-blue-800">AI vs Personalization</AlertTitle>
  <AlertDescription className="text-blue-700 text-xs">
    <p className="mb-2">
      <strong>AI generates:</strong> Backgrounds, images, layouts
    </p>
    <p>
      <strong>For personalized data:</strong> Use template tokens below 
      (filled by mail house during printing)
    </p>
  </AlertDescription>
</Alert>
```

### 5.2 Reorganize PERSONALIZE Section

**Update PERSONALIZE_ELEMENTS**:

```typescript
const PERSONALIZE_ELEMENTS: ElementItem[] = [
  // Group 1: Name tokens
  {
    id: 'token-first-name',
    name: 'First Name',
    icon: User,
    template: {
      type: 'template-token',
      tokenContent: { token: '{{first_name}}', fallback: 'Friend' },
      // ...
    },
    description: '{{first_name}}',
  },
  {
    id: 'token-last-name',
    name: 'Last Name',
    icon: User,
    template: { /* ... */ },
    description: '{{last_name}}',
  },
  {
    id: 'token-full-name',
    name: 'Full Name',
    icon: Users,
    template: { /* ... */ },
    description: '{{full_name}}',
  },
  
  // Group 2: Tracking tokens
  {
    id: 'token-unique-code',
    name: 'Unique Code',
    icon: Hash,
    template: { /* ... */ },
    description: '{{unique_code}}',
  },
  {
    id: 'token-purl',
    name: 'Personal URL',
    icon: Link2,
    template: { /* ... */ },
    description: '{{purl}}',
  },
  
  // Group 3: Business tokens
  {
    id: 'token-company',
    name: 'Company Name',
    icon: Building,
    template: { /* ... */ },
    description: '{{company_name}}',
  },
  {
    id: 'token-gift-amount',
    name: 'Gift Card Amount',
    icon: Gift,
    template: { /* ... */ },
    description: '{{gift_card_amount}}',
  },
];
```

---

## Phase 6: Action Executor Updates

### 6.1 Add generate-background Action Handler

**File**: `src/features/designer/utils/aiActionExecutor.ts`

**Add New Action Handler**:

```typescript
case 'generate-background': {
  // 1. Extract prompt, size, style from action
  // 2. Call generateImage() from useDesignerAI
  // 3. Upload result to Supabase storage
  // 4. Call setBackgroundImage with permanent URL
  // 5. Return success/error
  
  const { prompt, size, style, referenceStyle } = action;
  
  // Build enhanced prompt
  let enhancedPrompt = prompt;
  if (referenceStyle) {
    enhancedPrompt = `Create a background matching this style: ${referenceStyle.style}, 
    colors: ${referenceStyle.colors.join(', ')}. ${prompt}`;
  }
  enhancedPrompt += ' No text, no names, no personal information, background only.';
  
  // Generate image
  const imageUrl = await generateImage(enhancedPrompt, size, style);
  
  // Store in Supabase
  const permanentUrl = await uploadToStorage(imageUrl);
  
  // Apply to canvas
  setBackgroundImage(permanentUrl);
  
  return { success: true, url: permanentUrl };
}
```

---

## Phase 7: Export System Verification

### 7.1 Verify Background + Token Separation

**File**: `src/features/designer/hooks/useDesignerExport.ts`

**Verification Tasks**:

1. **PDF Export Check**
   - Background image renders as embedded image
   - Template tokens render as `{{token_name}}` text
   - No token replacement unless `tokenData` provided
   - High resolution output (300 DPI)

2. **HTML Export Check**
   - Background as CSS background-image
   - Tokens preserved as text
   - Preview mode replaces tokens with sample data

3. **Add Export Metadata**
   ```typescript
   interface ExportMetadata {
     exportedAt: Date;
     backgroundSource: 'ai-generated' | 'uploaded' | 'none';
     backgroundUrl: string | null;
     tokensUsed: string[];  // List of template tokens in design
     tokensFilled: boolean;  // Whether tokens were replaced
   }
   ```

---

## Phase 8: Testing & Quality Assurance

### 8.1 Manual Testing Checklist

**Vision API Tests**:
- [ ] Upload JPG reference postcard → Analysis returned
- [ ] Upload PNG reference postcard → Analysis returned
- [ ] Upload WebP image → Handled or error shown
- [ ] Upload file > 5MB → Error shown
- [ ] Upload non-image file → Error shown
- [ ] Upload image with text → Analysis ignores text
- [ ] Network error during analysis → Graceful error handling

**Image Generation Tests**:
- [ ] "Generate lifestyle background" → Image created, no text
- [ ] "Generate automotive background" → Image created, no plates/text
- [ ] "Generate from reference" → Style matches reference
- [ ] Select 1792x1024 size → Landscape image created
- [ ] Select 1024x1792 size → Portrait image created
- [ ] Generated image saved to Supabase → URL works

**No-Personalization Rule Tests**:
- [ ] "Add customer's name" → Token added, NOT generated text
- [ ] "Generate image with the name John" → Name NOT in image
- [ ] "Add address" → Token added, NOT generated text
- [ ] "Generate QR code" → QR element added, NOT image

**UI Tests**:
- [ ] Reference uploader expands/collapses
- [ ] Uploaded image shows preview
- [ ] Analysis displays correctly
- [ ] "Generate Similar" triggers generation
- [ ] Quick actions work for all presets
- [ ] Guidance alert displays in element library

**Export Tests**:
- [ ] PDF export includes AI background → Yes
- [ ] PDF export shows tokens as {{token}} → Yes (when no data)
- [ ] PDF export replaces tokens → Yes (when data provided)
- [ ] HTML export includes background → Yes
- [ ] HTML export preserves tokens → Yes

### 8.2 Automated Tests to Add

**File**: `src/features/designer/__tests__/aiBackgroundSystem.test.ts`

```typescript
describe('AI Background System', () => {
  describe('Vision API', () => {
    it('should analyze reference image and return structured data');
    it('should reject files over 5MB');
    it('should handle network errors gracefully');
  });
  
  describe('Image Generation', () => {
    it('should append no-text rule to all prompts');
    it('should use correct size based on orientation');
    it('should incorporate reference analysis');
  });
  
  describe('No-Personalization Rules', () => {
    it('should add token element when user asks for name');
    it('should NOT generate text with personal info');
  });
  
  describe('Export', () => {
    it('should export background as image layer');
    it('should preserve template tokens in output');
  });
});
```

---

## Implementation Order Summary

### Sprint 1: Foundation (Days 1-3)
1. **Phase 1.1**: Add Vision API to edge function
2. **Phase 1.2**: Enhance DALL-E generation (sizes, safety)
3. **Phase 2.1**: Add critical no-personalization rules to prompts

### Sprint 2: Core Features (Days 4-6)
4. **Phase 1.3**: Add Supabase storage integration
5. **Phase 3.1**: Add types for reference images
6. **Phase 3.2**: Update useDesignerAI hook with new functions
7. **Phase 3.3**: Create ReferenceUploader component

### Sprint 3: UI Integration (Days 7-9)
8. **Phase 4.1**: Integrate reference uploader into AI panel
9. **Phase 4.2**: Update QuickActions with background presets
10. **Phase 5.1**: Add guidance alert to ElementLibrary
11. **Phase 5.2**: Reorganize personalization elements

### Sprint 4: Completion (Days 10-12)
12. **Phase 6.1**: Add generate-background action handler
13. **Phase 7.1**: Verify export system
14. **Phase 8**: Testing and QA

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/openai-chat/index.ts` | MODIFY | Add Vision API, enhance DALL-E, add storage |
| `src/features/designer/types/designer.ts` | MODIFY | Add ReferenceAnalysis types |
| `src/features/designer/utils/aiPrompts.ts` | MODIFY | Add no-personalization rules |
| `src/features/designer/hooks/useDesignerAI.ts` | MODIFY | Add reference image functions |
| `src/features/designer/components/ReferenceUploader.tsx` | CREATE | New component |
| `src/features/designer/components/AIAssistantPanel.tsx` | MODIFY | Add reference uploader |
| `src/features/designer/components/QuickActions.tsx` | MODIFY | Add background presets |
| `src/features/designer/components/ElementLibrary.tsx` | MODIFY | Add guidance, reorganize tokens |
| `src/features/designer/utils/aiActionExecutor.ts` | MODIFY | Add generate-background handler |
| `src/features/designer/__tests__/aiBackgroundSystem.test.ts` | CREATE | New tests |

---

## Environment Variables Required

```env
# Already exists
OPENAI_API_KEY=sk-...

# Verify these are set
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # For storage operations
```

---

## Success Criteria

1. ✅ User can upload reference postcard and see analysis
2. ✅ User can "Generate Similar" background from reference
3. ✅ AI NEVER generates personalized text in images
4. ✅ All personalization uses template tokens
5. ✅ Generated backgrounds save to Supabase storage
6. ✅ Export correctly separates backgrounds from tokens
7. ✅ Quick actions provide industry-specific backgrounds
8. ✅ Guidance clearly explains AI vs Tokens to users

---

**END OF PLAN**

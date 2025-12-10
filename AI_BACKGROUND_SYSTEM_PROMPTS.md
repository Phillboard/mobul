# AI Background System - Cursor Prompts

Copy and paste these prompts to Cursor in order.

---

## PHASE 1: Edge Function Enhancement

### Prompt 1.1: Add Vision API Support

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 1.1 for context.

Update supabase/functions/openai-chat/index.ts to add Vision API support.

REQUIREMENTS:

1. Add new request type 'vision':
```typescript
interface VisionRequest {
  type: 'vision';
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
}
```

2. Add handleVision() function:
- Accept image via URL or Base64
- Call GPT-4o with vision capability (gpt-4o model supports images natively)
- Use this analysis prompt:
```
Analyze this postcard/mailer design and describe:
1. COLOR PALETTE: List the main colors used (hex codes)
2. LAYOUT: Describe the composition
3. STYLE: Modern, vintage, corporate, playful, etc.
4. IMAGERY: What type of images/photos are used
5. MOOD: The emotional feeling
6. SUITABLE FOR: What businesses this would work for

DO NOT describe any text, names, addresses, or codes.
Focus only on design elements.

Return as JSON: { colorPalette, layout, style, imagery, mood, suitableFor }
```

3. Add error handling:
- Image too large → compress or reject (max 20MB for base64)
- Invalid format → return helpful error
- Add timeout handling (30 seconds)

4. Route requests:
```typescript
if (type === 'vision') {
  return await handleVision(payload);
}
```

DO NOT break existing chat and image functionality.
Test that 'chat' and 'image' types still work after changes.
```

---

### Prompt 1.2: Enhance DALL-E Generation

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 1.2 for context.

Update supabase/functions/openai-chat/index.ts to enhance image generation.

REQUIREMENTS:

1. Add new sizes for postcards:
```typescript
interface ImageGenerationRequest {
  type: 'image';
  prompt: string;
  size: '1024x1024' | '1024x1792' | '1792x1024';  // Add new sizes
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
  referenceAnalysis?: {  // NEW: For reference-based generation
    colorPalette: string[];
    style: string;
    mood: string;
  };
}
```

2. Update handleImageGeneration():
- Support new sizes (1024x1792 portrait, 1792x1024 landscape)
- If referenceAnalysis provided, prepend to prompt:
  "Create a background matching style: {style}, colors: {colors}, mood: {mood}. "

3. CRITICAL: Add safety prompt injection:
- ALWAYS append to every DALL-E prompt:
  " This is a background image only. No text, no names, no addresses, no phone numbers, no QR codes, no personal information of any kind."

4. Add size validation:
```typescript
const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
if (!validSizes.includes(size)) {
  throw new Error(`Invalid size. Valid: ${validSizes.join(', ')}`);
}
```

Verify DALL-E 3 API accepts these sizes (it does - they're official).
```

---

### Prompt 1.3: Add Supabase Storage Integration

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 1.3 for context.

Update supabase/functions/openai-chat/index.ts to save generated images.

REQUIREMENTS:

1. After DALL-E returns an image URL:
- Download the image from OpenAI's temporary URL
- Upload to Supabase Storage bucket "designer-backgrounds"
- Return the permanent Supabase URL instead of OpenAI's URL

2. Create helper function:
```typescript
async function saveToStorage(
  imageUrl: string,
  supabaseClient: any,
  userId?: string
): Promise<string> {
  // 1. Fetch image from URL
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  
  // 2. Generate unique filename
  const timestamp = Date.now();
  const hash = crypto.randomUUID().slice(0, 8);
  const path = `generated/${userId || 'anonymous'}/${timestamp}_${hash}.png`;
  
  // 3. Upload to Supabase
  const { data, error } = await supabaseClient.storage
    .from('designer-backgrounds')
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: false,
    });
  
  if (error) throw error;
  
  // 4. Get public URL
  const { data: urlData } = supabaseClient.storage
    .from('designer-backgrounds')
    .getPublicUrl(path);
  
  return urlData.publicUrl;
}
```

3. Update image generation response:
```typescript
return new Response(JSON.stringify({
  url: permanentUrl,  // Supabase URL, not OpenAI
  temporaryUrl: imageUrl,  // Keep original for debugging
  revisedPrompt: data.data[0]?.revised_prompt,
  storagePath: path,
}));
```

4. Handle storage errors gracefully - if upload fails, still return OpenAI URL.

NOTE: The storage bucket "designer-backgrounds" may need to be created manually in Supabase dashboard with public access.
```

---

## PHASE 2: AI Prompts Enhancement

### Prompt 2.1: Add No-Personalization Rules

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 2.1 for context.

Update src/features/designer/utils/aiPrompts.ts to add critical safety rules.

REQUIREMENTS:

1. Add CRITICAL_RULES constant at top of file:
```typescript
const CRITICAL_RULES = `
════════════════════════════════════════════════════════════════
⚠️  CRITICAL RULES - NEVER VIOLATE ⚠️
════════════════════════════════════════════════════════════════

1. AI GENERATES ONLY:
   ✅ Background images (lifestyle, products, abstract, scenery)
   ✅ Static design elements (decorative shapes, borders)
   ✅ Color schemes and layout suggestions
   ✅ Placeholder positions for personalized content

2. AI NEVER GENERATES:
   ❌ Names (first, last, or full names)
   ❌ Addresses (street, city, state, zip)
   ❌ Phone numbers
   ❌ QR codes with actual data
   ❌ Unique codes or tracking numbers
   ❌ Any text that should be personalized

3. FOR PERSONALIZATION, ALWAYS USE TEMPLATE TOKENS:
   When user asks for personalization, add TEMPLATE TOKEN ELEMENTS:
   - {{first_name}} - Recipient's first name
   - {{last_name}} - Recipient's last name
   - {{full_name}} - Recipient's full name
   - {{unique_code}} - Unique tracking code
   - {{company_name}} - Client's company name
   - {{purl}} - Personal URL
   - {{qr_code}} - QR code placeholder
   - {{gift_card_amount}} - Gift card value

4. CORRECT VS WRONG:
   User: "Add the customer's name"
   ✅ CORRECT: Add text element with content "{{first_name}}"
   ❌ WRONG: Generate text saying "John"

   User: "Generate a background with happy family"
   ✅ CORRECT: Generate lifestyle image via generate-background action
   ❌ WRONG: Generate image containing any text

   User: "Add a QR code"
   ✅ CORRECT: Add qr-code element with data "{{purl}}"
   ❌ WRONG: Generate image of a QR code

════════════════════════════════════════════════════════════════
`;
```

2. Update getSystemPrompt() to include CRITICAL_RULES:
```typescript
export function getSystemPrompt(designerType: DesignerType): string {
  const typeContext = { /* existing */ };
  
  return `${CRITICAL_RULES}

You are an expert design assistant helping users create ${typeContext[designerType]} designs.

// ... rest of existing prompt
`;
}
```

3. Add generate-background to available actions list in system prompt:
```
Available actions you can perform:
- add-element: Add text, images, shapes, QR codes, or template tokens
- update-element: Modify existing elements
- delete-element: Remove elements
- move-element: Reposition elements
- resize-element: Change element dimensions
- set-background: Set background image URL or color
- generate-background: [NEW] Generate AI background image
- clear-canvas: Clear all elements

generate-background action format:
{
  "type": "generate-background",
  "prompt": "Professional lifestyle photo, bright sunny day",
  "size": "1792x1024",
  "style": "natural"
}
```

4. Update validateDesignActions() to accept 'generate-background' type.

This is CRITICAL for preventing AI from generating personalized content in images.
```

---

## PHASE 3: Reference Image System

### Prompt 3.1: Add Reference Image Types

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 3.1 for context.

Update src/features/designer/types/designer.ts to add reference image types.

ADD these new types after the existing types:

```typescript
// ============================================================================
// Reference Image Types (for AI background generation)
// ============================================================================

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
  style: 'modern' | 'vintage' | 'corporate' | 'playful' | 'elegant' | 'bold' | 'minimal';
  imagery: string;
  mood: string;
  suitableFor: string[];
}

/**
 * Reference image state for upload flow
 */
export interface ReferenceImageState {
  file: File | null;
  previewUrl: string | null;
  analysis: ReferenceAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
}

/**
 * Image generation options
 */
export interface ImageGenerationOptions {
  prompt: string;
  size: '1024x1024' | '1024x1792' | '1792x1024';
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
  referenceAnalysis?: ReferenceAnalysis;
}
```

Also add 'generate-background' to the DesignAction type:
```typescript
export type DesignAction =
  | { type: 'add-element'; element: Partial<DesignElement> }
  | { type: 'update-element'; id: string; updates: Partial<DesignElement> }
  | { type: 'delete-element'; id: string }
  | { type: 'move-element'; id: string; x: number; y: number }
  | { type: 'resize-element'; id: string; width: number; height: number }
  | { type: 'set-background'; imageUrl?: string; color?: string }
  | { type: 'generate-background'; prompt: string; size?: string; style?: string }  // NEW
  | { type: 'clear-canvas' };
```
```

---

### Prompt 3.2: Update useDesignerAI Hook

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 3.2 for context.

Update src/features/designer/hooks/useDesignerAI.ts to add reference image functionality.

REQUIREMENTS:

1. Add new state for reference images:
```typescript
const [referenceImage, setReferenceImage] = useState<ReferenceImageState>({
  file: null,
  previewUrl: null,
  analysis: null,
  isAnalyzing: false,
  error: null,
});
```

2. Add analyzeReferenceImage function:
```typescript
const analyzeReferenceImage = useCallback(async (imageFile: File): Promise<ReferenceAnalysis> => {
  setReferenceImage(prev => ({ ...prev, isAnalyzing: true, error: null }));
  
  try {
    // Convert file to base64
    const base64 = await fileToBase64(imageFile);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(imageFile);
    setReferenceImage(prev => ({ ...prev, file: imageFile, previewUrl }));
    
    // Call vision API
    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        type: 'vision',
        imageBase64: base64,
      },
    });
    
    if (error) throw new Error(error.message);
    
    const analysis = data.analysis as ReferenceAnalysis;
    setReferenceImage(prev => ({ ...prev, analysis, isAnalyzing: false }));
    
    return analysis;
  } catch (err: any) {
    setReferenceImage(prev => ({ 
      ...prev, 
      isAnalyzing: false, 
      error: err.message 
    }));
    throw err;
  }
}, []);
```

3. Add generateFromReference function:
```typescript
const generateFromReference = useCallback(async (
  analysis: ReferenceAnalysis,
  additionalPrompt?: string
): Promise<string | null> => {
  const basePrompt = additionalPrompt || 'Generate a similar background';
  
  const { data, error } = await supabase.functions.invoke('openai-chat', {
    body: {
      type: 'image',
      prompt: basePrompt,
      size: '1792x1024',
      quality: 'hd',
      style: 'natural',
      referenceAnalysis: {
        colorPalette: Object.values(analysis.colorPalette),
        style: analysis.style,
        mood: analysis.mood,
      },
    },
  });
  
  if (error) throw new Error(error.message);
  return data.url;
}, []);
```

4. Add clearReferenceImage function:
```typescript
const clearReferenceImage = useCallback(() => {
  if (referenceImage.previewUrl) {
    URL.revokeObjectURL(referenceImage.previewUrl);
  }
  setReferenceImage({
    file: null,
    previewUrl: null,
    analysis: null,
    isAnalyzing: false,
    error: null,
  });
}, [referenceImage.previewUrl]);
```

5. Add helper function for base64 conversion:
```typescript
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/xxx;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

6. Update return interface to include new functions:
```typescript
return {
  // Existing
  messages,
  isGenerating,
  error,
  sendMessage,
  generateImage,
  applySuggestion,
  clearConversation,
  retryLastMessage,
  currentSuggestion,
  
  // NEW: Reference image features
  referenceImage,
  analyzeReferenceImage,
  generateFromReference,
  clearReferenceImage,
};
```

Import ReferenceImageState and ReferenceAnalysis from types.
```

---

### Prompt 3.3: Create ReferenceUploader Component

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 3.3 for context.

Create new file: src/features/designer/components/ReferenceUploader.tsx

REQUIREMENTS:

```tsx
/**
 * ReferenceUploader Component
 * 
 * Allows users to upload a reference postcard for style matching.
 * Analyzes the image and enables "generate similar" functionality.
 */

import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import type { ReferenceImageState, ReferenceAnalysis } from '../types/designer';

export interface ReferenceUploaderProps {
  referenceImage: ReferenceImageState;
  onFileSelect: (file: File) => Promise<void>;
  onGenerateSimilar: (analysis: ReferenceAnalysis) => Promise<void>;
  onClear: () => void;
  isGenerating?: boolean;
  className?: string;
}

export function ReferenceUploader({
  referenceImage,
  onFileSelect,
  onGenerateSimilar,
  onClear,
  isGenerating = false,
  className = '',
}: ReferenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum 5MB.');
        return;
      }
      await onFileSelect(file);
    }
  }, [onFileSelect]);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await onFileSelect(file);
    }
  }, [onFileSelect]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Empty state - show upload zone
  if (!referenceImage.file && !referenceImage.previewUrl) {
    return (
      <div className={className}>
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors"
        >
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Upload Reference</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drop a postcard to match its style
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Has image - show preview and analysis
  return (
    <Card className={`p-3 ${className}`}>
      <div className="flex gap-3">
        {/* Preview */}
        <div className="relative w-20 h-20 flex-shrink-0">
          {referenceImage.previewUrl && (
            <img
              src={referenceImage.previewUrl}
              alt="Reference"
              className="w-full h-full object-cover rounded"
            />
          )}
          <button
            onClick={onClear}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        
        {/* Analysis */}
        <div className="flex-1 min-w-0">
          {referenceImage.isAnalyzing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing design...
            </div>
          ) : referenceImage.error ? (
            <div className="text-sm text-red-500">{referenceImage.error}</div>
          ) : referenceImage.analysis ? (
            <>
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {referenceImage.analysis.style}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {referenceImage.analysis.mood}
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => onGenerateSimilar(referenceImage.analysis!)}
                disabled={isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Generate Similar
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
```

Export from index.ts.
```

---

## PHASE 4: UI Integration

### Prompt 4.1: Update AIAssistantPanel

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 4.1 for context.

Update src/features/designer/components/AIAssistantPanel.tsx to add reference uploader.

REQUIREMENTS:

1. Add import for ReferenceUploader and Collapsible:
```typescript
import { ReferenceUploader } from './ReferenceUploader';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ImageIcon } from 'lucide-react';
```

2. Update props interface:
```typescript
export interface AIAssistantPanelProps {
  // Existing
  messages: ChatMessage[];
  isGenerating: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onClearConversation: () => void;
  
  // NEW: Reference image
  referenceImage: ReferenceImageState;
  onReferenceSelect: (file: File) => Promise<void>;
  onGenerateFromReference: (analysis: ReferenceAnalysis) => Promise<void>;
  onClearReference: () => void;
  
  className?: string;
}
```

3. Add state for collapsible:
```typescript
const [referenceOpen, setReferenceOpen] = useState(false);
```

4. Add reference uploader section ABOVE quick actions:
```tsx
{/* Reference Image Upload - Collapsible */}
<Collapsible open={referenceOpen} onOpenChange={setReferenceOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
    <div className="flex items-center gap-2 text-sm">
      <ImageIcon className="h-4 w-4 text-muted-foreground" />
      <span>Reference Postcard</span>
      {referenceImage.analysis && (
        <Badge variant="secondary" className="text-xs">Loaded</Badge>
      )}
    </div>
    <ChevronDown className={`h-4 w-4 transition-transform ${referenceOpen ? 'rotate-180' : ''}`} />
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-2">
    <ReferenceUploader
      referenceImage={referenceImage}
      onFileSelect={onReferenceSelect}
      onGenerateSimilar={onGenerateFromReference}
      onClear={onClearReference}
      isGenerating={isGenerating}
    />
  </CollapsibleContent>
</Collapsible>

<div className="border-t my-4" />

{/* Quick Actions (existing) */}
<QuickActions ... />
```

5. When reference is loaded and user sends message, include context:
```typescript
const handleSend = () => {
  let message = inputValue.trim();
  
  // Add reference context if available
  if (referenceImage.analysis) {
    message = `[Reference style: ${referenceImage.analysis.style}, mood: ${referenceImage.analysis.mood}] ${message}`;
  }
  
  onSendMessage(message);
  setInputValue('');
};
```
```

---

### Prompt 4.2: Update QuickActions with Background Presets

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 4.2 for context.

Update src/features/designer/components/QuickActions.tsx to add background generation presets.

REQUIREMENTS:

1. Add new icons imports:
```typescript
import { 
  Sparkles, Lightbulb, Palette, LayoutGrid, Image,
  Users, Car, Coffee, Pizza, Sun, Shield, Building, Mountain
} from 'lucide-react';
```

2. Add BACKGROUND_PRESETS constant:
```typescript
const BACKGROUND_PRESETS: QuickAction[] = [
  {
    id: 'bg-lifestyle',
    label: 'Lifestyle',
    icon: <Users className="h-4 w-4" />,
    prompt: 'Generate a professional lifestyle background image showing happy people in a bright, welcoming setting. No text, no personal information, background only.',
  },
  {
    id: 'bg-automotive',
    label: 'Auto/Vehicle',
    icon: <Car className="h-4 w-4" />,
    prompt: 'Generate a premium automotive background showing a modern car on an open road or professional setting. No text, no license plates, no personal information.',
  },
  {
    id: 'bg-food-coffee',
    label: 'Coffee/Food',
    icon: <Coffee className="h-4 w-4" />,
    prompt: 'Generate an appetizing food and coffee photography background. Warm, inviting cafe or restaurant atmosphere. No logos, no text, no brand names.',
  },
  {
    id: 'bg-pizza',
    label: 'Pizza',
    icon: <Pizza className="h-4 w-4" />,
    prompt: 'Generate a mouthwatering pizza photography background with delicious cheese and toppings on a rustic surface. No text, no logos, no brand names.',
  },
  {
    id: 'bg-abstract',
    label: 'Abstract',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: 'Generate an abstract background with modern gradients, geometric shapes, and professional corporate feel. No text, clean design.',
  },
  {
    id: 'bg-insurance',
    label: 'Insurance/Trust',
    icon: <Shield className="h-4 w-4" />,
    prompt: 'Generate a professional background suggesting protection and trust. Family, home, or abstract safety imagery. Warm and trustworthy. No text.',
  },
  {
    id: 'bg-nature',
    label: 'Nature/Scenic',
    icon: <Mountain className="h-4 w-4" />,
    prompt: 'Generate a beautiful scenic nature background. Mountains, forests, or peaceful outdoor landscape. No text, no people.',
  },
  {
    id: 'bg-corporate',
    label: 'Corporate',
    icon: <Building className="h-4 w-4" />,
    prompt: 'Generate a professional corporate background. Modern office, business environment, or abstract professional design. No text, no logos.',
  },
];
```

3. Update component to show categories:
```tsx
export function QuickActions({
  actions = DEFAULT_QUICK_ACTIONS,
  onAction,
  isLoading = false,
  className = '',
}: QuickActionsProps) {
  return (
    <div className={className}>
      {/* Background Generation Section */}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        🎨 Generate Background
      </h4>
      <div className="flex flex-wrap gap-1 mb-4">
        {BACKGROUND_PRESETS.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onAction(action.prompt)}
            disabled={isLoading}
          >
            {action.icon}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>
      
      {/* Design Assistance Section */}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        ✨ Design Assistance
      </h4>
      <div className="space-y-1">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-start h-auto py-2 px-3 text-left"
            onClick={() => onAction(action.prompt)}
            disabled={isLoading}
          >
            <span className="text-purple-600 mr-2">{action.icon}</span>
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
```
```

---

## PHASE 5: Element Library Guidance

### Prompt 5.1: Add AI vs Tokens Guidance

```
Read AI_BACKGROUND_SYSTEM_PLAN.md Phase 5.1 for context.

Update src/features/designer/components/ElementLibrary.tsx to add guidance.

REQUIREMENTS:

1. Add imports:
```typescript
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, User, Users, Hash, Link2, Building, Gift } from 'lucide-react';
```

2. Add guidance alert at the TOP of the component return:
```tsx
return (
  <div className={className}>
    {/* AI vs Tokens Guidance */}
    <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-200 text-sm">
        AI vs Personalization
      </AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs mt-1">
        <p className="mb-1">
          <strong>AI generates:</strong> Backgrounds & images
        </p>
        <p>
          <strong>For names/data:</strong> Use tokens below (filled during print)
        </p>
      </AlertDescription>
    </Alert>
    
    <div className="space-y-6">
      {/* BUILD Section */}
      {renderSection('Build', BUILD_ELEMENTS)}

      {/* TRACK Section */}
      {renderSection('Track', TRACK_ELEMENTS)}

      {/* PERSONALIZE Section - Updated */}
      {renderSection('Personalize', PERSONALIZE_ELEMENTS)}
    </div>
    
    {/* ... rest of component */}
  </div>
);
```

3. Update PERSONALIZE_ELEMENTS for clarity:
```typescript
const PERSONALIZE_ELEMENTS: ElementItem[] = [
  {
    id: 'token-first-name',
    name: 'First Name',
    icon: User,
    template: {
      type: 'template-token',
      tokenContent: { token: '{{first_name}}', fallback: 'Friend', transform: 'none' },
      width: 120,
      height: 30,
      styles: { fontSize: 16, color: '#7C3AED' },
    },
    description: '{{first_name}}',
  },
  {
    id: 'token-full-name',
    name: 'Full Name',
    icon: Users,
    template: {
      type: 'template-token',
      tokenContent: { token: '{{full_name}}', fallback: 'Valued Customer', transform: 'none' },
      width: 180,
      height: 30,
      styles: { fontSize: 16, color: '#7C3AED' },
    },
    description: '{{full_name}}',
  },
  {
    id: 'token-unique-code',
    name: 'Unique Code',
    icon: Hash,
    template: {
      type: 'template-token',
      tokenContent: { token: '{{unique_code}}', fallback: 'CODE123', transform: 'uppercase' },
      width: 100,
      height: 30,
      styles: { fontSize: 14, fontFamily: 'monospace', color: '#059669' },
    },
    description: '{{unique_code}}',
  },
  {
    id: 'token-company',
    name: 'Company Name',
    icon: Building,
    template: {
      type: 'template-token',
      tokenContent: { token: '{{company_name}}', fallback: 'Our Company', transform: 'none' },
      width: 200,
      height: 30,
      styles: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    },
    description: '{{company_name}}',
  },
  {
    id: 'token-gift-amount',
    name: 'Gift Card Amount',
    icon: Gift,
    template: {
      type: 'template-token',
      tokenContent: { token: '{{gift_card_amount}}', fallback: '$25', transform: 'none' },
      width: 60,
      height: 30,
      styles: { fontSize: 18, fontWeight: 'bold', color: '#DC2626' },
    },
    description: '{{gift_card_amount}}',
  },
];
```

This makes it crystal clear that tokens are for personalization, AI is for backgrounds.
```

---

## PHASE 6: Testing

### Prompt 6.1: Complete Testing

```
I've implemented the AI Background System. Please help me test it.

Run through this checklist and verify each item works:

VISION API TESTS:
1. Upload a JPG reference postcard image
   - Does analysis return?
   - Is colorPalette, style, mood populated?

2. Upload a PNG image
   - Does it work the same as JPG?

3. Try uploading a file > 5MB
   - Does it show an error?

IMAGE GENERATION TESTS:
4. Use quick action "Lifestyle" background
   - Does it generate an image?
   - Is there ANY text in the generated image?
   
5. Use quick action "Pizza" background
   - Does it generate food imagery?
   - No logos or brand names visible?

6. Type "Generate a background with customer's name John"
   - Does the AI refuse and suggest using a token instead?

7. Generate from reference
   - Upload reference, click "Generate Similar"
   - Does the style match?

NO-PERSONALIZATION RULE TESTS:
8. Type "Add the customer's name"
   - Does it add {{first_name}} token (CORRECT)
   - Or does it generate text "John" (WRONG)

9. Type "Add their address"
   - Does it suggest template tokens?
   - Does it NOT generate actual address text?

10. Type "Add a QR code with their unique link"
    - Does it add a QR element with {{purl}} data?

UI TESTS:
11. Reference uploader shows in AI panel
12. Collapsible expands/collapses
13. Quick action buttons work
14. Guidance alert shows in Element Library

Report any failures found.
```

---

## Quick Reference: Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/openai-chat/index.ts` | Vision API, enhanced DALL-E, storage |
| `src/features/designer/types/designer.ts` | ReferenceAnalysis types |
| `src/features/designer/utils/aiPrompts.ts` | No-personalization rules |
| `src/features/designer/hooks/useDesignerAI.ts` | Reference image functions |
| `src/features/designer/components/ReferenceUploader.tsx` | NEW |
| `src/features/designer/components/AIAssistantPanel.tsx` | Reference uploader UI |
| `src/features/designer/components/QuickActions.tsx` | Background presets |
| `src/features/designer/components/ElementLibrary.tsx` | Guidance alert |

---

**END OF CURSOR PROMPTS**

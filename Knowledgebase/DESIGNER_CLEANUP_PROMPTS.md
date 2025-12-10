# Designer System Cleanup - Cursor Prompts

Copy and paste these prompts to Cursor in order to fix all issues.

---

## PHASE 1: Fix Critical AI Response Bug (MUST DO FIRST)

### Prompt 1.1: Fix Response Field Mismatch

```
CRITICAL BUG FIX: The AI is returning "No response from AI" error.

ROOT CAUSE:
- Edge function `supabase/functions/openai-chat/index.ts` returns `{ message: ... }`
- Hook `src/features/designer/hooks/useDesignerAI.ts` expects `{ content: ... }`

FIX in `src/features/designer/hooks/useDesignerAI.ts`:

In the `callOpenAI` function (around line 110-130), change:

FROM:
```typescript
if (!data?.content) {
  throw new Error('No response from AI');
}

return data.content;
```

TO:
```typescript
// Edge function returns "message" field, not "content"
if (!data?.message) {
  throw new Error('No response from AI');
}

return data.message;
```

Also update the `useQuickAI` hook at the bottom of the same file (around line 410-430):

FROM:
```typescript
if (!data?.content) {
  throw new Error('No response from AI');
}

return data.content;
```

TO:
```typescript
if (!data?.message) {
  throw new Error('No response from AI');
}

return data.message;
```

This is causing the "No response from AI" error shown in the screenshot.
```

---

## PHASE 2: Deploy Edge Function & Verify Secrets

### Prompt 2.1: Deploy Edge Function (RUN IN TERMINAL)

```
Run these commands in PowerShell to deploy the openai-chat edge function:

cd "C:\Users\Acer Nitro 5\Desktop\Cursor Mobul\mobul"

# Login to Supabase (if not already)
npx supabase login

# Deploy the edge function
npx supabase functions deploy openai-chat --project-ref YOUR_PROJECT_REF

# After deploying, go to Supabase Dashboard:
# 1. Settings → Edge Functions → openai-chat → Check if deployed
# 2. Settings → API → Project API Keys → Note the URL
# 3. Settings → Edge Functions → Secrets → Add OPENAI_API_KEY

If OPENAI_API_KEY is not set, add it:
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here --project-ref YOUR_PROJECT_REF

Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are also set for storage to work.
```

---

## PHASE 3: Apply Storage Migration

### Prompt 3.1: Check/Apply Storage Migration

```
Run these commands in PowerShell to verify storage buckets exist:

cd "C:\Users\Acer Nitro 5\Desktop\Cursor Mobul\mobul"

# Push migrations to apply any pending ones
npx supabase db push --project-ref YOUR_PROJECT_REF

# Or apply the specific migration manually in Supabase SQL Editor:
# Go to Supabase Dashboard → SQL Editor → New Query
# Copy and paste the contents of:
# supabase/migrations/20251210010000_create_designer_storage_buckets.sql
# Execute

# Verify buckets exist:
# Storage → Buckets → Should see:
#   - designs (for user uploads)
#   - designer-backgrounds (for AI-generated images)
```

---

## PHASE 4: Connect Reference Uploader to NewMailDesigner

### Prompt 4.1: Wire Up Reference Uploader Props

```
Update src/pages/NewMailDesigner.tsx to properly connect the Reference Uploader.

The AI hook already has these features:
- ai.referenceImage (state)
- ai.analyzeReferenceImage (function)
- ai.generateFromReference (function)
- ai.clearReferenceImage (function)

But they need to be passed to AIAssistantPanel.

Find where AIAssistantPanel is rendered (around line 350-370) and update it:

FROM:
```tsx
<AIAssistantPanel
  messages={ai.messages}
  isGenerating={ai.isGenerating}
  error={ai.error}
  onSendMessage={ai.sendMessage}
  onClearConversation={ai.clearConversation}
/>
```

TO:
```tsx
<AIAssistantPanel
  messages={ai.messages}
  isGenerating={ai.isGenerating}
  error={ai.error}
  onSendMessage={ai.sendMessage}
  onClearConversation={ai.clearConversation}
  // Reference image props - enable "Generate Similar" feature
  referenceImage={ai.referenceImage}
  onReferenceSelect={async (file) => {
    try {
      await ai.analyzeReferenceImage(file);
      toast({
        title: '📸 Reference Analyzed',
        description: 'Style extracted. Click "Generate Similar" to create matching background.',
      });
    } catch (err) {
      toast({
        title: 'Analysis Failed',
        description: err instanceof Error ? err.message : 'Could not analyze image',
        variant: 'destructive',
      });
    }
  }}
  onGenerateFromReference={async (analysis) => {
    try {
      const imageUrl = await ai.generateFromReference(analysis);
      if (imageUrl) {
        // Apply the generated background to canvas
        designerState.setBackgroundImage(imageUrl);
        toast({
          title: '✨ Background Generated',
          description: 'New background applied matching your reference style.',
        });
      }
    } catch (err) {
      toast({
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Could not generate image',
        variant: 'destructive',
      });
    }
  }}
  onClearReference={ai.clearReferenceImage}
/>
```

This enables the reference postcard upload and "Generate Similar" functionality.
```

---

## PHASE 5: Add Generate Background Action Handler

### Prompt 5.1: Handle Background Generation from Quick Actions

```
Update src/features/designer/utils/aiActionExecutor.ts to handle generate-background actions.

The AI might return actions like:
```json
{
  "type": "generate-background",
  "prompt": "Professional lifestyle photo...",
  "size": "1792x1024",
  "style": "natural"
}
```

Add handling for this action type in the executeDesignActions function.

Find the switch statement that handles action types and add:

```typescript
case 'generate-background': {
  // This action requires async image generation
  // For now, we'll add it as a pending action that the parent handles
  console.log('[ActionExecutor] generate-background action:', action);
  
  // We can't execute this synchronously - it needs to call the AI
  // The parent component (NewMailDesigner) should handle this
  // For now, log and skip
  console.warn('[ActionExecutor] generate-background requires async handling - skipping');
  
  // Return as a special case that needs parent handling
  break;
}
```

Also update the validateDesignActions function in aiPrompts.ts to recognize 'generate-background':

```typescript
const validTypes = [
  'add-element',
  'update-element',
  'delete-element',
  'move-element',
  'resize-element',
  'set-background',
  'generate-background',  // ADD THIS
  'clear-canvas',
];
```
```

---

## PHASE 6: Enhance Quick Action Image Generation

### Prompt 6.1: Make Quick Action Background Buttons Actually Generate Images

```
The Quick Action buttons (Lifestyle, Auto/Vehicle, Pizza, etc.) currently just send prompts to the AI chat.
They should actually generate images when clicked.

Update src/features/designer/components/QuickActions.tsx:

1. Add a new prop for direct image generation:
```typescript
export interface QuickActionsProps {
  actions?: QuickAction[];
  onAction: (prompt: string) => void;
  onGenerateBackground?: (prompt: string) => Promise<void>;  // NEW
  isLoading?: boolean;
  className?: string;
}
```

2. For background actions, check if onGenerateBackground is provided and use it:
```typescript
const handleBackgroundClick = async (action: QuickAction) => {
  if (onGenerateBackground) {
    // Direct image generation
    await onGenerateBackground(action.prompt);
  } else {
    // Fallback to chat
    onAction(action.prompt);
  }
};
```

3. Update the BACKGROUND_PRESETS button onClick:
```tsx
<Button
  key={action.id}
  variant="outline"
  size="sm"
  className="h-7 text-xs px-2"
  onClick={() => handleBackgroundClick(action)}
  disabled={isLoading}
>
  {action.icon}
  <span className="ml-1">{action.label}</span>
</Button>
```

Then in NewMailDesigner.tsx, pass the onGenerateBackground prop:
```tsx
<QuickActions
  onAction={handleQuickAction}
  onGenerateBackground={async (prompt) => {
    try {
      toast({ title: '🎨 Generating...', description: 'Creating background image...' });
      const imageUrl = await ai.generateImage(prompt);
      if (imageUrl) {
        designerState.setBackgroundImage(imageUrl);
        toast({ title: '✨ Background Applied!', description: 'Your new background is ready.' });
      }
    } catch (err) {
      toast({ title: 'Generation Failed', description: 'Could not generate image', variant: 'destructive' });
    }
  }}
  isLoading={ai.isGenerating}
/>
```
```

---

## PHASE 7: Verify & Test

### Prompt 7.1: Test Checklist

```
After applying all fixes, test the following:

1. AI CHAT TEST:
   - Type "Add a headline saying Welcome"
   - Should NOT show "No response from AI" error
   - Should add text element to canvas

2. QUICK ACTION TEST:
   - Click "Lifestyle" in GENERATE BACKGROUND section
   - Should show loading state
   - Should generate and apply background image

3. REFERENCE UPLOAD TEST:
   - Expand "Reference Postcard" section
   - Upload a sample postcard image
   - Should analyze and show style/mood
   - Click "Generate Similar"
   - Should create matching background

4. TOKEN TEST:
   - Drag {{first_name}} from PERSONALIZE section
   - Should appear on canvas with dashed border
   - Select it - should show Properties panel

5. EXPORT TEST:
   - Click Export
   - Download PDF
   - Tokens should show as {{token_name}} in PDF

Report any failures.
```

---

## PHASE 8: Optional Enhancements

### Prompt 8.1: Add Image Preview Before Applying

```
OPTIONAL: Add a preview modal before applying generated backgrounds.

Create src/features/designer/components/BackgroundPreviewModal.tsx:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BackgroundPreviewModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onApply: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function BackgroundPreviewModal({
  imageUrl,
  isOpen,
  onApply,
  onCancel,
  isApplying = false,
}: BackgroundPreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview Background</DialogTitle>
        </DialogHeader>
        
        <div className="relative aspect-[4/6] w-full overflow-hidden rounded-lg border">
          <img
            src={imageUrl}
            alt="Generated background preview"
            className="w-full h-full object-cover"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? 'Applying...' : 'Apply Background'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Then update NewMailDesigner to use preview before applying backgrounds.
```

### Prompt 8.2: Add Background Size Selection

```
OPTIONAL: Add size selection for generated backgrounds.

When generating a background, let user choose:
- 1024x1024 (Square)
- 1792x1024 (Landscape - 4x6 horizontal, 6x9 horizontal)
- 1024x1792 (Portrait - 4x6 vertical, 6x9 vertical)

Auto-select based on current canvas orientation.
```

---

## Quick Reference: Files Changed

| File | Change |
|------|--------|
| `src/features/designer/hooks/useDesignerAI.ts` | Fix `data.content` → `data.message` |
| `src/features/designer/utils/aiPrompts.ts` | Add 'generate-background' to valid types |
| `src/features/designer/utils/aiActionExecutor.ts` | Handle generate-background action |
| `src/pages/NewMailDesigner.tsx` | Connect Reference Uploader props |
| `src/features/designer/components/QuickActions.tsx` | Add onGenerateBackground prop |

---

## Quick Fix Summary

The MOST IMPORTANT fix is **Prompt 1.1** - changing `data.content` to `data.message` in the hook. This alone will fix the "No response from AI" error.

After that, deploy the edge function and set the OPENAI_API_KEY secret.

The other prompts are enhancements to make the system fully functional.

---

**START WITH PROMPT 1.1 - IT'S THE CRITICAL FIX**

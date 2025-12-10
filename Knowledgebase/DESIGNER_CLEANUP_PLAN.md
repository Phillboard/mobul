# Designer System Cleanup & Enhancement Plan

## Issues Identified from Screenshots

### 🔴 CRITICAL ISSUES

| Issue | Screenshot | Root Cause |
|-------|-----------|------------|
| **"No response from AI" error** | Image 7 | Hook expects `data.content` but edge function returns `data.message` |
| **Edge function may not be deployed** | Image 7 | `openai-chat` function needs to be deployed to Supabase |
| **OPENAI_API_KEY not configured** | Image 7 | Secret may not be set in Supabase dashboard |

### 🟡 MEDIUM ISSUES

| Issue | Screenshot | Description |
|-------|-----------|-------------|
| **Reference uploader not visible in AI panel** | Image 7 | ReferenceUploader exists but may not be connected properly |
| **Storage bucket migration** | N/A | Migration exists but may not have been applied |
| **Background presets working but AI broken** | Image 7 | Quick actions show up but can't execute |

### 🟢 WORKING CORRECTLY

| Feature | Screenshot | Status |
|---------|-----------|--------|
| ✅ AI vs Personalization guidance | Image 1, 2, 6, 8 | Shows correctly at top of Elements panel |
| ✅ Template tokens on canvas | Image 3, 6, 7, 8 | Rendering with dashed blue borders |
| ✅ Properties panel (Styles/Arrange/Effects) | Image 3, 4, 5, 6 | All tabs working |
| ✅ Layers panel | Image 1, 2 | Shows all elements correctly |
| ✅ GENERATE BACKGROUND quick actions | Image 7 | Lifestyle, Auto/Vehicle, Coffee/Food, Pizza, etc. |
| ✅ DESIGN ASSISTANCE quick actions | Image 7 | Generate full design, Headlines, Colors, Layout |
| ✅ Background upload section | Image 8 | Drag & drop area visible |
| ✅ Template Tokens section with Insert | Image 8 | Search and Insert button working |
| ✅ Front/Back toggle | Image 1, 2 | Working in header |
| ✅ Format dropdown (4x6 Postcard) | All images | Shows correctly |

---

## Phase 1: Fix Critical AI Communication Bug

### The Problem
```javascript
// Edge function returns:
return new Response(JSON.stringify({
  message: assistantMessage,  // ← Returns "message"
  usage: data.usage,
  model: data.model,
}));

// Hook expects:
if (!data?.content) {  // ← Looks for "content" ❌
  throw new Error('No response from AI');
}
return data.content;  // ← Should be data.message ❌
```

### Files to Fix
- `src/features/designer/hooks/useDesignerAI.ts` - Line ~123 and ~127

---

## Phase 2: Verify Edge Function Deployment

### Steps Required
1. Check if `openai-chat` function is deployed
2. Deploy if missing: `supabase functions deploy openai-chat`
3. Verify OPENAI_API_KEY is set in Supabase secrets
4. Test function directly via Supabase dashboard

---

## Phase 3: Apply Storage Migration

### Check Required
- Verify `designer-backgrounds` bucket exists
- If not, apply migration: `20251210010000_create_designer_storage_buckets.sql`

---

## Phase 4: Connect Reference Uploader Properly

### The Issue
The ReferenceUploader component exists and AIAssistantPanel has props for it, but the NewMailDesigner page may not be passing the props correctly.

---

## Phase 5: Minor Enhancements

1. Add loading state for background generation
2. Show generated image preview before applying
3. Add "undo" option after applying background
4. Show storage URL after image saved

---

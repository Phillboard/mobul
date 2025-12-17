# Unified Designer V3 - Implementation Complete

## Overview

The new unified designer system is now fully implemented with the following features:

### ✅ Phase 1: Nano Banana Pro Integration
- **Image Generation Service** (`services/imageGeneration.ts`)
  - Gemini 3 Pro Image (Nano Banana Pro) integration
  - Support for multiple aspect ratios (3:2, 2:3, 1:1, 16:9, 9:16)
  - Multiple resolutions (1K, 2K, 4K)
  - Automatic retry with exponential backoff

- **Prompt Builder** (`utils/promptBuilder.ts`)
  - Structured prompts for front/back/background generation
  - Gift card + food imagery integration
  - Brand color support for known brands
  - Proper exclusion of dynamic content from AI prompts

- **React Hook** (`hooks/useImageGeneration.ts`)
  - `useImageGeneration` - Main image generation hook
  - `useCanvasImageGeneration` - Canvas-aware generation
  - `useBatchImageGeneration` - Batch processing
  - Progress tracking and error handling

### ✅ Phase 2: Canvas Layer System
- **Layer Types** (`types/layers.ts`)
  - Background, Text, Image, Shape layers
  - QR Placeholder, Code Box, Phone Box
  - Complete TypeScript definitions
  - Factory functions for creating layers

- **Layer Management** (`hooks/useCanvasLayers.ts`)
  - Full CRUD operations
  - Z-index ordering (up/down/top/bottom)
  - Undo/Redo with history
  - Bulk operations

- **Layer Renderers** (`components/Layers/`)
  - `BackgroundLayerRenderer` - AI-generated backgrounds
  - `TextLayerRenderer` - Text with token highlighting
  - `ImageLayerRenderer` - Image overlays
  - `QRPlaceholderRenderer` - QR code placeholders
  - `CodeBoxRenderer` - Unique code display
  - `PhoneBoxRenderer` - Phone number display
  - `ShapeLayerRenderer` - Geometric shapes

- **Canvas Component** (`components/Canvas/NewDesignerCanvas.tsx`)
  - Main canvas with layer rendering
  - Selection and interaction
  - Preview mode support
  - Zoom and canvas info

- **Layers Panel** (`components/Panels/LayersPanel.tsx`)
  - Visual layer list with icons
  - Visibility and lock toggles
  - Reordering controls
  - Delete functionality

### ✅ Phase 3: Token System
- **Token Management** (`utils/tokenManagement.ts`)
  - 13 predefined tokens
  - Categorized (personalization, tracking, address, campaign)
  - Validation and extraction
  - Preview value replacement

- **Token UI** (`components/TokenInserter/TokenInserterPopover.tsx`)
  - Searchable token browser
  - Organized by category
  - Shows preview values
  - Required token indicators

- **Preview Toggle** (`components/PreviewModeToggle.tsx`)
  - Switch between tokens and preview
  - Full and compact versions
  - Visual indicators

### ✅ Phase 4: Special Elements
- **QR Placeholder** (Already in Layer renderers)
  - Placeholder for mail-merge QR codes
  - Multiple visual styles
  - Size customization

- **Code Box** (Already in Layer renderers)
  - 4 visual variants (ticket-stub, rounded, pill, plain)
  - Customizable colors
  - Token support

- **Phone Box** (Already in Layer renderers)
  - 4 visual variants (banner, button, plain, with-cta)
  - Icon support
  - CTA text option

- **Quick Actions** (`components/QuickActions/AddElementActions.tsx`)
  - One-click element addition
  - Preset configurations
  - Smart positioning

## Usage

### Basic Setup

```typescript
import { useCanvasLayers } from '@/features/designer/hooks/useCanvasLayers';
import { useImageGeneration } from '@/features/designer/hooks/useImageGeneration';
import { NewDesignerCanvas } from '@/features/designer/components/Canvas/NewDesignerCanvas';
import { LayersPanel } from '@/features/designer/components/Panels/LayersPanel';
import { PreviewModeToggle } from '@/features/designer/components/PreviewModeToggle';
import { AddElementActions } from '@/features/designer/components/QuickActions/AddElementActions';

function DesignerPage() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  
  const {
    layers,
    selectedLayerId,
    selectLayer,
    addLayer,
    updateLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    setBackgroundImage,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCanvasLayers();
  
  const {
    generateFrontDesign,
    isGenerating,
    error,
    result,
  } = useImageGeneration({
    onSuccess: (result) => {
      setBackgroundImage(result.imageUrl);
    },
  });
  
  return (
    <div className="flex gap-4">
      {/* Left Sidebar */}
      <div className="w-80">
        <AddElementActions onAddLayer={addLayer} />
        <LayersPanel
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={selectLayer}
          onToggleVisibility={(id) => {
            const layer = layers.find(l => l.id === id);
            if (layer) updateLayer(id, { visible: !layer.visible });
          }}
          onToggleLock={(id) => {
            const layer = layers.find(l => l.id === id);
            if (layer) updateLayer(id, { locked: !layer.locked });
          }}
          onDelete={deleteLayer}
          onReorder={(id, direction) => {
            if (direction === 'up') moveLayerUp(id);
            else moveLayerDown(id);
          }}
        />
      </div>
      
      {/* Center Canvas */}
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <PreviewModeToggle
            isPreviewMode={isPreviewMode}
            onToggle={setIsPreviewMode}
          />
          <div className="flex gap-2">
            <Button onClick={undo} disabled={!canUndo}>Undo</Button>
            <Button onClick={redo} disabled={!canRedo}>Redo</Button>
          </div>
        </div>
        
        <NewDesignerCanvas
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={selectLayer}
          onUpdateLayer={updateLayer}
          canvasConfig={{
            width: 1200,
            height: 1800,
            orientation: 'landscape',
            size: '6x4',
          }}
          isPreviewMode={isPreviewMode}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
```

### Generating Backgrounds

```typescript
import { contextFromCampaign } from '@/features/designer/utils/promptBuilder';

// Create context from campaign data
const context = contextFromCampaign({
  giftCardBrand: "Jimmy John's",
  giftCardAmount: 15,
  clientName: 'Acme Marketing',
  industry: 'automotive',
});

// Generate front design
await generateFrontDesign(context);

// Or generate background only
await generateBackground(context, 'photorealistic');
```

### Working with Tokens

```typescript
import { TokenInserterPopover } from '@/features/designer/components/TokenInserter/TokenInserterPopover';
import { createTextLayer } from '@/features/designer/types/layers';

// Add token text
<TokenInserterPopover
  onInsert={(token) => {
    addLayer(createTextLayer({
      content: `Hey ${token}!`,
      containsTokens: true,
    }));
  }}
/>
```

### Adding Special Elements

```typescript
import {
  createQRPlaceholderLayer,
  createCodeBoxLayer,
  createPhoneBoxLayer,
} from '@/features/designer/types/layers';

// Add QR placeholder
addLayer(createQRPlaceholderLayer());

// Add code box
addLayer(createCodeBoxLayer({
  labelText: 'YOUR CODE:',
  valueToken: '{{unique_code}}',
}));

// Add phone box
addLayer(createPhoneBoxLayer({
  phoneNumber: '1-800-XXX-XXXX',
}));
```

## Environment Setup

Add to your `.env` file:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## Key Concepts

### Layers vs Elements
- **Old System**: Used "elements" (from `types/designer.ts`)
- **New System**: Uses "layers" (from `types/layers.ts`)
- Layers support more features: visibility, locking, proper z-indexing

### Token Flow
1. **Design Time**: Show `{{first_name}}` with purple highlighting
2. **Preview Mode**: Show "John" (sample value)
3. **Mail Merge**: Replace with actual recipient data

### Background Generation
- AI generates static backgrounds with gift cards and imagery
- Dynamic content (phone, QR, codes) added as separate layers
- Prevents AI from generating placeholder text

## Migration from Old Designer

The old designer components still exist for backward compatibility. To migrate:

1. Replace `DesignerCanvas` with `NewDesignerCanvas`
2. Replace `useDesignerState` with `useCanvasLayers`
3. Update element types to layer types
4. Add preview mode toggle
5. Integrate image generation hook

## File Structure

```
src/features/designer/
├── components/
│   ├── Canvas/
│   │   └── NewDesignerCanvas.tsx
│   ├── Layers/
│   │   ├── LayerRenderer.tsx
│   │   ├── BackgroundLayerRenderer.tsx
│   │   ├── TextLayerRenderer.tsx
│   │   ├── QRPlaceholderRenderer.tsx
│   │   ├── CodeBoxRenderer.tsx
│   │   ├── PhoneBoxRenderer.tsx
│   │   ├── ImageLayerRenderer.tsx
│   │   └── ShapeLayerRenderer.tsx
│   ├── Panels/
│   │   └── LayersPanel.tsx
│   ├── TokenInserter/
│   │   └── TokenInserterPopover.tsx
│   ├── QuickActions/
│   │   └── AddElementActions.tsx
│   └── PreviewModeToggle.tsx
├── hooks/
│   ├── useCanvasLayers.ts
│   └── useImageGeneration.ts
├── services/
│   └── imageGeneration.ts
├── types/
│   └── layers.ts
├── utils/
│   ├── promptBuilder.ts
│   ├── tokenManagement.ts
│   ├── tokens.ts
│   └── presets.ts
└── NEW_DESIGNER_README.md
```

## Next Steps

1. **Integration**: Wire up the new designer in campaign wizard
2. **Testing**: Create comprehensive tests
3. **Documentation**: Add JSDoc comments
4. **Migration**: Gradually migrate old components
5. **Export**: Implement PDF/HTML export with token preservation

## Support

For questions or issues, refer to:
- `ARCHITECTURE.md` - System architecture
- `PLATFORM_DICTIONARY.md` - Terminology and tokens
- Individual component files - Detailed implementation docs


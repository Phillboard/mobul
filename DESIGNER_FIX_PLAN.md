# DESIGNER FIX PLAN - COMPREHENSIVE MULTI-PHASE

## Current Problems Identified

From the screenshot:
1. **Drag & drop not working** - Elements can't be dragged to canvas
2. **AI is on the RIGHT** - Should be LEFT for AI-first approach
3. **Canvas is non-functional** - No interaction working
4. **Layout is backwards** - AI should be primary, manual tools secondary

## Target Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    Mail Designer - Insurance Services Postcard    ↩ ↪  Export PDF  Save │
├─────────────────────────────────────────────────────────────────────────┤
│                    │                              │                      │
│  ✨ AI ASSISTANT   │                              │   PROPERTIES         │
│  ─────────────────│                              │   ─────────────────   │
│                    │                              │                      │
│  [Chat input...]   │      CANVAS                  │   Selected: None     │
│                    │      (Background Image)      │                      │
│  "Add headline..." │      ┌──────────────┐       │   Position: x, y     │
│  "Insert QR..."    │      │              │       │   Size: w × h        │
│  "Use first_name"  │      │   Design     │       │   Rotation: 0°       │
│                    │      │   Elements   │       │                      │
│  ─────────────────│      │   Here       │       │   Font: ...          │
│                    │      │              │       │   Color: ...         │
│  QUICK ADD         │      │              │       │   ─────────────────   │
│  ─────────────────│      └──────────────┘       │                      │
│  [Headline]        │                              │   LAYERS             │
│  [Body Text]       │                              │   ─────────────────   │
│  [Image]           │                              │   □ Headline         │
│  [QR Code]         │                              │   □ Body Text        │
│  [Token Field]     │                              │   □ QR Code          │
│                    │                              │                      │
│  ─────────────────│                              │   ─────────────────   │
│  UPLOAD BG         │                              │   TOKENS             │
│  [Drop zone]       │                              │   {{first_name}}     │
│                    │                              │   {{unique_code}}    │
│                    │                              │   {{company_name}}   │
└─────────────────────────────────────────────────────────────────────────┘
```

## New Layout Structure

**LEFT PANEL (Primary - AI First)**
1. AI Chat Interface (TOP - most prominent)
2. Quick Add Elements (below AI)
3. Background Upload (bottom)

**CENTER (Canvas)**
1. Functional canvas with actual element rendering
2. Selection handles
3. Drag/resize/rotate capability

**RIGHT PANEL (Secondary - Properties)**
1. Properties Panel (selected element)
2. Layers Panel
3. Tokens Reference

---

# PHASE 1: DIAGNOSE & UNDERSTAND CURRENT CODE

## Task 1.1: Map Current Designer Files

Find and document all designer-related files:
- Components in `src/features/designer/`
- Pages: `MailDesigner.tsx`, `LandingPageDesigner.tsx`, etc.
- Hooks: `useDesignerState.ts`, etc.
- Any canvas library being used

## Task 1.2: Identify Why Drag & Drop Fails

Check for:
- Event handlers not connected
- Canvas library not initialized
- State not updating on drag
- Missing drag-and-drop library setup

## Task 1.3: Document Current Component Structure

Create a map of:
- Which components exist
- How they're connected
- What props they expect
- What state they manage

---

# PHASE 2: FIX CORE CANVAS FUNCTIONALITY

## Task 2.1: Choose/Verify Canvas Library

Options:
- **Fabric.js** - Full-featured, good for this use case
- **Konva.js** - React-friendly, performant
- **Custom Canvas API** - More control, more work

Recommendation: **Fabric.js** or **Konva.js**

If not using a library, implement one. The canvas MUST support:
- Element rendering
- Selection
- Drag to move
- Resize handles
- Rotation

## Task 2.2: Implement Working Canvas

Create `src/features/designer/components/DesignerCanvas.tsx`:

```typescript
// Must handle:
- Render background image
- Render all elements from state
- Handle click to select
- Handle drag to move
- Handle resize via handles
- Handle keyboard (delete, arrow keys)
- Emit events for state updates
```

## Task 2.3: Fix Element State Management

The `useDesignerState` hook must:
```typescript
interface DesignerState {
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImage: string | null;
  };
  elements: DesignElement[];
  selectedId: string | null;
  history: DesignerState[];
  historyIndex: number;
}

// Actions that MUST work:
- addElement(element)
- updateElement(id, changes)
- deleteElement(id)
- selectElement(id)
- deselectAll()
- moveElement(id, x, y)
- resizeElement(id, width, height)
- reorderLayers(fromIndex, toIndex)
- setBackground(image)
- undo()
- redo()
```

## Task 2.4: Implement Drag from Library to Canvas

The drag-and-drop flow:
1. User clicks element in library (Headline, Body Text, etc.)
2. Element follows cursor (ghost preview)
3. User drops on canvas
4. Element is added at drop position
5. Element is auto-selected

Required:
- `onDragStart` on library items
- `onDragOver` on canvas (allow drop)
- `onDrop` on canvas (create element)

---

# PHASE 3: RESTRUCTURE LAYOUT (AI-FIRST)

## Task 3.1: Create New Layout Component

Create `src/features/designer/components/DesignerLayout.tsx`:

```typescript
<div className="flex h-screen">
  {/* LEFT PANEL - AI First */}
  <div className="w-80 border-r flex flex-col">
    <AIDesignChat />      {/* TOP - Most prominent */}
    <ElementLibrary />     {/* Middle */}
    <BackgroundUploader /> {/* Bottom */}
  </div>
  
  {/* CENTER - Canvas */}
  <div className="flex-1 bg-gray-100 p-8 overflow-auto">
    <DesignerCanvas />
  </div>
  
  {/* RIGHT PANEL - Properties */}
  <div className="w-72 border-l flex flex-col">
    <PropertiesPanel />   {/* Selected element props */}
    <LayerPanel />        {/* Layer list */}
    <TokensPanel />       {/* Token reference */}
  </div>
</div>
```

## Task 3.2: Redesign AI Chat Component

Move from right to left, make it PRIMARY:

```typescript
// AIDesignChat.tsx - NEW DESIGN
<div className="flex-1 flex flex-col p-4">
  <div className="flex items-center gap-2 mb-4">
    <Sparkles className="text-purple-500" />
    <h2 className="font-semibold">AI Design Assistant</h2>
  </div>
  
  {/* Chat messages */}
  <div className="flex-1 overflow-auto space-y-3">
    {messages.map(msg => <ChatMessage key={msg.id} {...msg} />)}
  </div>
  
  {/* Quick suggestions - clickable */}
  <div className="space-y-2 my-4">
    <QuickSuggestion text="Add a headline at the top" />
    <QuickSuggestion text="Insert customer's first name" />
    <QuickSuggestion text="Add QR code bottom right" />
  </div>
  
  {/* Input */}
  <div className="flex gap-2">
    <Input placeholder="Describe what you want..." />
    <Button><Send /></Button>
  </div>
</div>
```

## Task 3.3: Simplify Element Library

Make it compact since it's secondary:

```typescript
// ElementLibrary.tsx - Compact version
<div className="p-4 border-t">
  <h3 className="text-sm font-medium mb-2">Quick Add</h3>
  <div className="grid grid-cols-2 gap-2">
    <ElementButton icon={Type} label="Text" />
    <ElementButton icon={Image} label="Image" />
    <ElementButton icon={Square} label="Shape" />
    <ElementButton icon={QrCode} label="QR Code" />
    <ElementButton icon={Braces} label="Token" />
  </div>
</div>
```

## Task 3.4: Move Background Upload to Bottom Left

```typescript
// BackgroundUploader.tsx - Compact
<div className="p-4 border-t">
  <h3 className="text-sm font-medium mb-2">Background</h3>
  <div 
    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
    onDrop={handleDrop}
    onDragOver={handleDragOver}
  >
    <Upload className="mx-auto mb-2" />
    <p className="text-sm">Drop image or click</p>
  </div>
</div>
```

---

# PHASE 4: MAKE AI ACTUALLY WORK

## Task 4.1: Create AI Action Parser

The AI must translate natural language to canvas actions:

```typescript
// src/features/designer/utils/aiActionParser.ts

interface AIAction {
  type: 'add_element' | 'modify_element' | 'delete_element' | 'set_background';
  payload: any;
}

function parseAIResponse(response: string): AIAction[] {
  // AI returns structured JSON with actions
  // Parse and return action array
}

// Example AI response format:
{
  "actions": [
    {
      "type": "add_element",
      "payload": {
        "type": "text",
        "content": "You're Invited!",
        "position": { "x": "center", "y": "top" },
        "styles": { "fontSize": 32, "fontWeight": "bold" }
      }
    }
  ],
  "message": "I've added a headline at the top. Would you like me to style it differently?"
}
```

## Task 4.2: Create AI Prompt System

```typescript
// src/features/designer/utils/aiPrompts.ts

const SYSTEM_PROMPT = `
You are an AI design assistant for a mail/marketing designer.
You help users create designs by understanding their requests and generating actions.

CANVAS INFO:
- Size: {width}x{height}
- Current elements: {elementsSummary}
- Background: {hasBackground}

AVAILABLE ACTIONS:
1. add_element - Add text, image, shape, QR code, or token
2. modify_element - Change properties of existing element
3. delete_element - Remove an element
4. set_background - Set background color or suggest image

TEMPLATE TOKENS (use these for personalization):
- {{first_name}} - Recipient's first name
- {{last_name}} - Recipient's last name  
- {{unique_code}} - Tracking code
- {{company_name}} - Client's company
- {{purl}} - Personal URL
- {{qr_code}} - QR code
- {{gift_card_amount}} - Gift card value

POSITION SHORTCUTS:
- "top", "center", "bottom" for Y
- "left", "center", "right" for X
- "top-left", "top-right", "bottom-left", "bottom-right" for corners

Respond with JSON containing:
1. "actions" - Array of actions to perform
2. "message" - Friendly response to user

Always be helpful and suggest next steps.
`;
```

## Task 4.3: Connect AI to Canvas State

```typescript
// useDesignerAI.ts

function useDesignerAI() {
  const { addElement, updateElement, deleteElement } = useDesignerState();
  
  const executeActions = (actions: AIAction[]) => {
    actions.forEach(action => {
      switch (action.type) {
        case 'add_element':
          addElement(createElementFromAI(action.payload));
          break;
        case 'modify_element':
          updateElement(action.payload.id, action.payload.changes);
          break;
        case 'delete_element':
          deleteElement(action.payload.id);
          break;
      }
    });
  };
  
  const sendMessage = async (message: string) => {
    const response = await callGeminiAPI(message, canvasContext);
    const parsed = parseAIResponse(response);
    executeActions(parsed.actions);
    return parsed.message;
  };
  
  return { sendMessage, isLoading };
}
```

## Task 4.4: Make Quick Suggestions Functional

Clicking a suggestion should:
1. Send it as a message to AI
2. AI processes and returns actions
3. Actions are executed on canvas
4. AI response shown in chat

```typescript
<QuickSuggestion 
  text="Add a headline at the top"
  onClick={() => sendMessage("Add a headline at the top")}
/>
```

---

# PHASE 5: FIX PROPERTIES & LAYERS PANELS

## Task 5.1: Properties Panel Shows Selected Element

```typescript
// PropertiesPanel.tsx
function PropertiesPanel() {
  const { selectedElement, updateElement } = useDesignerState();
  
  if (!selectedElement) {
    return <div className="p-4 text-gray-500">Select an element to edit</div>;
  }
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">Properties</h3>
      
      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <Input label="X" value={selectedElement.x} onChange={...} />
        <Input label="Y" value={selectedElement.y} onChange={...} />
      </div>
      
      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <Input label="Width" value={selectedElement.width} onChange={...} />
        <Input label="Height" value={selectedElement.height} onChange={...} />
      </div>
      
      {/* Text-specific */}
      {selectedElement.type === 'text' && (
        <>
          <Textarea label="Content" value={selectedElement.content} />
          <FontSelector value={selectedElement.fontFamily} />
          <Input label="Font Size" type="number" value={selectedElement.fontSize} />
          <ColorPicker label="Color" value={selectedElement.color} />
        </>
      )}
    </div>
  );
}
```

## Task 5.2: Layers Panel with Drag Reorder

```typescript
// LayerPanel.tsx
function LayerPanel() {
  const { elements, selectedId, selectElement, reorderLayers } = useDesignerState();
  
  return (
    <div className="p-4">
      <h3 className="font-medium mb-2">Layers</h3>
      <DragDropContext onDragEnd={handleReorder}>
        <Droppable droppableId="layers">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {elements.map((el, index) => (
                <Draggable key={el.id} draggableId={el.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={cn(
                        "p-2 rounded cursor-pointer",
                        selectedId === el.id && "bg-blue-100"
                      )}
                      onClick={() => selectElement(el.id)}
                    >
                      <span>{el.type}: {el.content?.slice(0, 20)}</span>
                    </div>
                  )}
                </Draggable>
              ))}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
```

## Task 5.3: Tokens Panel for Quick Insert

```typescript
// TokensPanel.tsx
function TokensPanel() {
  const { selectedElement, updateElement } = useDesignerState();
  
  const insertToken = (token: string) => {
    if (selectedElement?.type === 'text') {
      const newContent = selectedElement.content + token;
      updateElement(selectedElement.id, { content: newContent });
    }
  };
  
  return (
    <div className="p-4 border-t">
      <h3 className="font-medium mb-2">Insert Token</h3>
      <div className="space-y-1">
        {TEMPLATE_TOKENS.map(token => (
          <button
            key={token.key}
            className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
            onClick={() => insertToken(token.value)}
          >
            <code className="text-purple-600">{token.value}</code>
            <span className="text-gray-500 ml-2">{token.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

# PHASE 6: FIX EXPORT FUNCTIONALITY

## Task 6.1: PDF Export Must Work

```typescript
// useDesignerExport.ts
function useDesignerExport() {
  const { canvas, elements } = useDesignerState();
  
  const exportToPDF = async () => {
    // Option 1: Use html2canvas + jsPDF
    const canvasElement = document.getElementById('designer-canvas');
    const image = await html2canvas(canvasElement);
    
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'in',
      format: [canvas.width / 96, canvas.height / 96] // Convert px to inches
    });
    
    pdf.addImage(image, 'PNG', 0, 0);
    pdf.save('design.pdf');
    
    // Option 2: Server-side generation for better quality
    // Send canvas state to edge function that generates PDF
  };
  
  return { exportToPDF };
}
```

## Task 6.2: Preview with Token Replacement

```typescript
const generatePreview = (sampleData: Record<string, string>) => {
  // Clone elements
  const previewElements = elements.map(el => ({
    ...el,
    content: el.type === 'text' 
      ? replaceTokens(el.content, sampleData)
      : el.content
  }));
  
  return previewElements;
};

// Sample data for preview
const SAMPLE_DATA = {
  first_name: 'John',
  last_name: 'Smith',
  unique_code: 'ABC123',
  company_name: 'Acme Insurance',
  purl: 'acme.com/p/ABC123',
  gift_card_amount: '$25'
};
```

---

# PHASE 7: ENSURE CONSISTENCY ACROSS DESIGNERS

## Task 7.1: Create Shared Designer Framework

All designers should use the SAME components:
- `DesignerLayout`
- `DesignerCanvas`
- `AIDesignChat`
- `ElementLibrary`
- `PropertiesPanel`
- `LayerPanel`
- `TokensPanel`

Only the CONFIG differs:

```typescript
// Mail Designer Config
const MAIL_CONFIG = {
  type: 'mail',
  dimensions: {
    '4x6': { width: 576, height: 384 },
    '6x9': { width: 864, height: 576 },
    '6x11': { width: 792, height: 1056 },
  },
  export: 'pdf',
  elements: ['text', 'image', 'shape', 'qr-code', 'token']
};

// Landing Page Config
const LANDING_CONFIG = {
  type: 'landing',
  dimensions: {
    desktop: { width: 1200, height: 'auto' },
    mobile: { width: 375, height: 'auto' },
  },
  export: 'html',
  elements: ['text', 'image', 'button', 'form', 'token']
};

// Email Config
const EMAIL_CONFIG = {
  type: 'email',
  dimensions: {
    standard: { width: 600, height: 'auto' },
  },
  export: 'html',
  elements: ['text', 'image', 'button', 'token']
};
```

## Task 7.2: Update Each Designer Page

```typescript
// MailDesigner.tsx
function MailDesigner() {
  return (
    <DesignerProvider config={MAIL_CONFIG}>
      <DesignerLayout />
    </DesignerProvider>
  );
}

// LandingPageDesigner.tsx
function LandingPageDesigner() {
  return (
    <DesignerProvider config={LANDING_CONFIG}>
      <DesignerLayout />
    </DesignerProvider>
  );
}

// EmailDesigner.tsx
function EmailDesigner() {
  return (
    <DesignerProvider config={EMAIL_CONFIG}>
      <DesignerLayout />
    </DesignerProvider>
  );
}
```

---

# PHASE 8: TESTING & VERIFICATION

## Task 8.1: Manual Testing Checklist

### Canvas Tests
- [ ] Can upload background image
- [ ] Background displays correctly
- [ ] Can add text element by clicking button
- [ ] Can add text element via AI
- [ ] Element appears on canvas
- [ ] Can select element by clicking
- [ ] Selected element shows handles
- [ ] Can drag element to move
- [ ] Can resize element with handles
- [ ] Can delete element (Delete key)
- [ ] Undo works (Ctrl+Z)
- [ ] Redo works (Ctrl+Y)

### AI Tests
- [ ] Can type message
- [ ] AI responds
- [ ] "Add headline" creates text at top
- [ ] "Add QR code" creates QR element
- [ ] "Insert first_name" adds token
- [ ] Quick suggestions work when clicked
- [ ] AI understands position words (top, bottom, left, right)

### Properties Panel Tests
- [ ] Shows "Select element" when nothing selected
- [ ] Shows properties when element selected
- [ ] Changing X/Y moves element
- [ ] Changing width/height resizes element
- [ ] Changing text content updates element
- [ ] Changing font/color updates element

### Layers Panel Tests
- [ ] Shows all elements
- [ ] Clicking layer selects element on canvas
- [ ] Can drag to reorder
- [ ] Reordering changes visual stacking

### Tokens Tests
- [ ] All 8 tokens listed
- [ ] Clicking token inserts into selected text
- [ ] Tokens display correctly in preview

### Export Tests
- [ ] Export PDF button works
- [ ] PDF has correct dimensions
- [ ] PDF shows all elements
- [ ] Tokens can be replaced with sample data

---

# SUMMARY: TASK LIST FOR CURSOR

## Phase 1: Diagnose (3 tasks)
- 1.1 Map all designer files
- 1.2 Identify why drag/drop fails
- 1.3 Document component structure

## Phase 2: Fix Canvas (4 tasks)
- 2.1 Choose/implement canvas library
- 2.2 Create working DesignerCanvas
- 2.3 Fix useDesignerState hook
- 2.4 Implement drag from library to canvas

## Phase 3: Restructure Layout (4 tasks)
- 3.1 Create new DesignerLayout (AI on left)
- 3.2 Redesign AIDesignChat component
- 3.3 Simplify ElementLibrary
- 3.4 Move BackgroundUploader to bottom left

## Phase 4: Make AI Work (4 tasks)
- 4.1 Create AI action parser
- 4.2 Create AI prompt system
- 4.3 Connect AI to canvas state
- 4.4 Make quick suggestions functional

## Phase 5: Fix Panels (3 tasks)
- 5.1 Properties panel shows selected element
- 5.2 Layers panel with drag reorder
- 5.3 Tokens panel for quick insert

## Phase 6: Fix Export (2 tasks)
- 6.1 PDF export must work
- 6.2 Preview with token replacement

## Phase 7: Consistency (2 tasks)
- 7.1 Create shared designer framework
- 7.2 Update each designer page

## Phase 8: Testing (1 task)
- 8.1 Complete manual testing checklist

**Total: 23 tasks**

---

**END OF DESIGNER FIX PLAN**

# DESIGNER FIX PLAN - AI-FIRST REDESIGN

## Current Problems Identified

Based on the screenshot:

1. **AI is Secondary** - AI panel is hidden on the right side under a tab, not the primary interface
2. **Drag & Drop Broken** - Elements don't drag to canvas
3. **Layout Wrong** - AI should be LEFT side, prominently visible
4. **Click to Add Not Working** - "Click to add to canvas" doesn't function
5. **Canvas Non-Interactive** - Can't interact with the empty canvas area
6. **No Visual Feedback** - No indication when dragging or hovering

---

## NEW DESIGN VISION: AI-FIRST LAYOUT

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    Mail Designer - Insurance Services Postcard     ↶ ↷  Export  Save │
├─────────────────────────────────────────────────────────────────────────────┤
│                           │                              │                   │
│   ✨ AI DESIGN ASSISTANT  │                              │   PROPERTIES      │
│   ═══════════════════════ │                              │   ════════════    │
│                           │                              │                   │
│   "Describe what you      │                              │   [No Selection]  │
│    want to create..."     │                              │                   │
│   ┌─────────────────┐     │        CANVAS               │   - Position      │
│   │                 │ ➤   │                              │   - Size          │
│   └─────────────────┘     │   ┌──────────────────────┐  │   - Style         │
│                           │   │                      │  │   - Font          │
│   Quick Actions:          │   │                      │  │                   │
│   [+ Headline]            │   │    (Upload BG or     │  │   ────────────    │
│   [+ QR Code]             │   │     Start with AI)   │  │                   │
│   [+ First Name Token]    │   │                      │  │   LAYERS          │
│                           │   │                      │  │   ════════════    │
│   ───────────────────     │   └──────────────────────┘  │   [Layer list]    │
│                           │                              │                   │
│   ELEMENTS (Manual)       │                              │   ────────────    │
│   ┌─────┬─────┬─────┐     │                              │                   │
│   │Text │Shape│Media│     │                              │   TOKENS          │
│   └─────┴─────┴─────┘     │                              │   ════════════    │
│   [Headline] [Image]      │                              │   {{first_name}}  │
│   [Body]     [QR]         │                              │   {{unique_code}} │
│                           │                              │   {{company}}     │
│   ───────────────────     │                              │                   │
│                           │                              │                   │
│   BACKGROUND              │                              │                   │
│   [Upload Image]          │                              │                   │
│   [Color Picker]          │                              │                   │
│                           │                              │                   │
└─────────────────────────────────────────────────────────────────────────────┘

LEFT PANEL (Primary - AI First):        CENTER (Canvas):           RIGHT PANEL (Context):
- AI Chat (always visible, top)         - Interactive canvas       - Properties of selected
- Quick action buttons                  - Drag targets work        - Layer management  
- Elements library (secondary)          - Shows background         - Token reference
- Background upload                     - Visual guides            - Export options
```

---

## PHASE 1: FIX CORE CANVAS FUNCTIONALITY

### Priority: Get drag & drop and basic interactions working

---

### Task 1.1: Audit Current Canvas Implementation

**Action**: Find and analyze current canvas code

```
Search for:
- src/features/designer/components/DesignerCanvas.tsx
- src/pages/MailDesigner.tsx
- Any file with "canvas" in name under src/

Identify:
- What library is being used (Fabric.js? Konva? Custom?)
- Why drag handlers aren't attached
- Why click handlers aren't working
```

**Report**: List the files found and the current implementation approach

---

### Task 1.2: Fix Canvas Event Handlers

**File**: `src/features/designer/components/DesignerCanvas.tsx`

**Requirements**:
1. Canvas must accept drop events
2. Canvas must handle click to select elements
3. Canvas must handle drag to move elements
4. Canvas must show drop target indicator when dragging over

**Implementation Pattern**:
```typescript
// Canvas needs these handlers
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  setIsDragOver(true);
};

const handleDragLeave = () => {
  setIsDragOver(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
  
  const elementType = e.dataTransfer.getData('element-type');
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;
  
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  addElement({
    type: elementType,
    x,
    y,
    // ... default properties
  });
};
```

---

### Task 1.3: Fix Element Drag Source

**File**: `src/features/designer/components/ElementLibrary.tsx`

**Requirements**:
1. Each element button must be draggable
2. Must set correct data transfer type
3. Must show drag preview

**Implementation Pattern**:
```typescript
const ElementButton = ({ type, label, icon }: ElementButtonProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('element-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onClick={() => addElementToCenter(type)}
      className="..."
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
```

---

### Task 1.4: Add Click-to-Add Functionality

**File**: `src/features/designer/components/ElementLibrary.tsx`

**Requirements**:
1. Clicking element button adds it to canvas center
2. Show toast/feedback when added
3. Select the newly added element

**Implementation**:
```typescript
const addElementToCenter = (type: ElementType) => {
  const canvasCenter = {
    x: canvasWidth / 2,
    y: canvasHeight / 2,
  };
  
  const newElement = createDefaultElement(type, canvasCenter);
  addElement(newElement);
  selectElement(newElement.id);
  
  toast({ title: `${type} added to canvas` });
};
```

---

### Task 1.5: Add Visual Feedback

**Requirements**:
1. Show border/highlight when dragging over canvas
2. Show selection handles on selected element
3. Show resize handles on corners/edges
4. Show rotation handle above element
5. Show guides when aligning elements

**CSS Classes to add**:
```css
.canvas-drag-over {
  border: 2px dashed #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.element-selected {
  outline: 2px solid #3b82f6;
}

.resize-handle {
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid #3b82f6;
  position: absolute;
}
```

---

## PHASE 2: RESTRUCTURE LAYOUT (AI-FIRST)

### Priority: Move AI to left side, make it the primary interface

---

### Task 2.1: Create New Layout Component

**File**: `src/features/designer/components/DesignerLayout.tsx`

**New Structure**:
```typescript
export function DesignerLayout({ 
  designerType,  // 'mail' | 'landing-page' | 'email'
  campaignId,
  onSave,
}: DesignerLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <DesignerHeader 
        title={title}
        onBack={handleBack}
        onSave={onSave}
        onExport={handleExport}
      />
      
      {/* Main Content - 3 Column */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - AI FIRST */}
        <LeftPanel className="w-80 border-r">
          <AIDesignChat />           {/* TOP - Always visible */}
          <QuickActions />           {/* Quick add buttons */}
          <Separator />
          <ElementLibrary />         {/* Manual elements */}
          <Separator />
          <BackgroundUploader />     {/* Background controls */}
        </LeftPanel>
        
        {/* CENTER - CANVAS */}
        <div className="flex-1 bg-gray-100 p-8 overflow-auto">
          <DesignerCanvas />
        </div>
        
        {/* RIGHT PANEL - CONTEXT */}
        <RightPanel className="w-72 border-l">
          <PropertiesPanel />        {/* Selected element props */}
          <Separator />
          <LayerPanel />             {/* Layer management */}
          <Separator />
          <TokenReference />         {/* Available tokens */}
        </RightPanel>
      </div>
    </div>
  );
}
```

---

### Task 2.2: Create AI-First Chat Component

**File**: `src/features/designer/components/AIDesignChat.tsx`

**Requirements**:
1. Always visible at TOP of left panel
2. Large, prominent input area
3. Quick example prompts
4. Chat history (collapsible)
5. "Apply" buttons on AI suggestions

**Layout**:
```typescript
export function AIDesignChat() {
  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h2 className="font-semibold">AI Design Assistant</h2>
      </div>
      
      {/* Input - PROMINENT */}
      <div className="relative">
        <Textarea
          placeholder="Describe what you want to create..."
          className="min-h-[80px] pr-12 resize-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button 
          size="icon" 
          className="absolute bottom-2 right-2"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Quick Examples - Clickable */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Try these:</p>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setInput(prompt)}
            className="text-left text-sm text-blue-600 hover:underline block"
          >
            "{prompt}"
          </button>
        ))}
      </div>
      
      {/* Chat History - Collapsible */}
      <Collapsible>
        <CollapsibleTrigger className="text-sm text-muted-foreground">
          Chat History ({messages.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 mt-2 max-h-48 overflow-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  "Add a headline that says 'You're Invited!' at the top",
  "Add a QR code in the bottom right corner",
  "Insert the customer's first name in a greeting",
  "Add the company logo in the top left",
  "Create a call-to-action button",
];
```

---

### Task 2.3: Create Quick Actions Component

**File**: `src/features/designer/components/QuickActions.tsx`

**Purpose**: One-click buttons for common actions

```typescript
export function QuickActions() {
  const { addElement, canvasState } = useDesignerState();

  const quickActions = [
    { 
      label: '+ Headline', 
      icon: Type, 
      action: () => addElement({ type: 'text', preset: 'headline' }) 
    },
    { 
      label: '+ QR Code', 
      icon: QrCode, 
      action: () => addElement({ type: 'qr-code' }) 
    },
    { 
      label: '+ {{first_name}}', 
      icon: User, 
      action: () => addElement({ type: 'token', token: '{{first_name}}' }) 
    },
    { 
      label: '+ Image', 
      icon: Image, 
      action: () => addElement({ type: 'image' }) 
    },
  ];

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-2">Quick Add</h3>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={action.action}
            className="justify-start"
          >
            <action.icon className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 2.4: Move Element Library Below AI

**File**: `src/features/designer/components/ElementLibrary.tsx`

**Requirements**:
1. Should be BELOW AI chat and Quick Actions
2. Collapsible (AI is primary)
3. Still has tabs: Text, Shapes, Media, Special
4. All items draggable AND clickable

```typescript
export function ElementLibrary() {
  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50">
        <h3 className="text-sm font-medium">Elements (Manual)</h3>
        <ChevronDown className="h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Tabs defaultValue="text" className="px-4 pb-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="shapes">Shapes</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="special">Special</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text">
            <div className="grid grid-cols-2 gap-2 mt-2">
              <DraggableElement type="headline" label="Headline" icon={Type} />
              <DraggableElement type="subheading" label="Subheading" icon={Type} />
              <DraggableElement type="body" label="Body Text" icon={Type} />
              <DraggableElement type="caption" label="Caption" icon={Type} />
            </div>
          </TabsContent>
          
          {/* ... other tabs */}
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

### Task 2.5: Update Right Panel

**File**: `src/features/designer/components/RightPanel.tsx`

**Requirements**:
1. Properties panel at top (context-sensitive)
2. Layers panel in middle
3. Token reference at bottom

```typescript
export function RightPanel() {
  const { selectedElement } = useDesignerState();

  return (
    <div className="flex flex-col h-full">
      {/* Properties - Takes available space */}
      <div className="flex-1 overflow-auto">
        <PropertiesPanel element={selectedElement} />
      </div>
      
      <Separator />
      
      {/* Layers - Fixed height */}
      <div className="h-48">
        <LayerPanel />
      </div>
      
      <Separator />
      
      {/* Tokens - Collapsible reference */}
      <Collapsible>
        <CollapsibleTrigger className="p-3 w-full text-left">
          <h3 className="text-sm font-medium">Available Tokens</h3>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <TokenReference />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

---

## PHASE 3: FIX AI INTEGRATION

### Priority: Make AI actually control the canvas

---

### Task 3.1: Fix AI Response Parsing

**File**: `src/features/designer/hooks/useDesignerAI.ts`

**Requirements**:
1. AI response must be parsed into actions
2. Actions must modify canvas state
3. Handle multiple actions in one response

**Implementation**:
```typescript
interface AIAction {
  type: 'add' | 'modify' | 'delete' | 'move';
  elementType?: ElementType;
  elementId?: string;
  properties?: Partial<DesignElement>;
  position?: { x: number; y: number };
}

function parseAIResponse(response: string): AIAction[] {
  // AI should return JSON actions
  try {
    const parsed = JSON.parse(response);
    return parsed.actions || [];
  } catch {
    // Fallback: try to understand natural language
    return parseNaturalLanguage(response);
  }
}

function executeActions(actions: AIAction[]) {
  actions.forEach(action => {
    switch (action.type) {
      case 'add':
        addElement(createElementFromAction(action));
        break;
      case 'modify':
        updateElement(action.elementId!, action.properties!);
        break;
      case 'delete':
        deleteElement(action.elementId!);
        break;
      case 'move':
        moveElement(action.elementId!, action.position!);
        break;
    }
  });
}
```

---

### Task 3.2: Improve AI Prompts

**File**: `src/features/designer/utils/aiPrompts.ts`

**System prompt for AI**:
```typescript
export const DESIGNER_SYSTEM_PROMPT = `
You are an AI design assistant for a mail/marketing designer tool.
You help users create designs by understanding their requests and returning structured actions.

CANVAS INFO:
- Canvas size: {{canvasWidth}}x{{canvasHeight}} pixels
- Current elements: {{elementsSummary}}
- Background: {{backgroundInfo}}

AVAILABLE ACTIONS:
1. ADD element: Create new text, image, shape, or QR code
2. MODIFY element: Change properties of existing element
3. DELETE element: Remove an element
4. MOVE element: Reposition an element

AVAILABLE TOKENS (for personalization):
- {{first_name}} - Recipient's first name
- {{last_name}} - Recipient's last name
- {{unique_code}} - Tracking code
- {{company_name}} - Client's company name
- {{purl}} - Personal URL
- {{qr_code}} - QR code placeholder
- {{gift_card_amount}} - Gift card value

RESPONSE FORMAT:
Return JSON with this structure:
{
  "message": "Human-friendly response",
  "actions": [
    {
      "type": "add",
      "elementType": "text",
      "properties": {
        "content": "You're Invited!",
        "x": 300,
        "y": 50,
        "fontSize": 32,
        "fontWeight": "bold",
        "color": "#000000"
      }
    }
  ]
}

POSITIONING GUIDELINES:
- Top: y = 20-100
- Center: y = canvas_height / 2
- Bottom: y = canvas_height - 100
- Left: x = 20-100
- Center: x = canvas_width / 2
- Right: x = canvas_width - 100

When user says "at the top", use y around 50.
When user says "bottom right", use x = width-100, y = height-100.
`;
```

---

### Task 3.3: Add AI Action Preview

**File**: `src/features/designer/components/AIActionPreview.tsx`

**Requirements**:
1. Before applying AI actions, show preview
2. User can approve or reject
3. Can modify individual actions

```typescript
export function AIActionPreview({ 
  actions, 
  onApply, 
  onReject,
  onModify 
}: AIActionPreviewProps) {
  return (
    <div className="border rounded-lg p-3 bg-purple-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">AI Suggestion</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReject}>
            Reject
          </Button>
          <Button size="sm" onClick={onApply}>
            Apply
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        {actions.map((action, i) => (
          <div key={i} className="text-sm bg-white p-2 rounded border">
            <span className="font-medium capitalize">{action.type}</span>
            {action.elementType && (
              <span className="text-muted-foreground"> {action.elementType}</span>
            )}
            {action.properties?.content && (
              <span className="block text-muted-foreground truncate">
                "{action.properties.content}"
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## PHASE 4: ENSURE CONSISTENCY ACROSS DESIGNERS

### Priority: Same experience for Mail, Landing Page, Email designers

---

### Task 4.1: Create Designer Config System

**File**: `src/features/designer/config/designerConfigs.ts`

```typescript
export interface DesignerConfig {
  type: 'mail' | 'landing-page' | 'email';
  name: string;
  dimensions: {
    width: number;
    height: number;
    unit: 'px' | 'in';
  };
  presets: DimensionPreset[];
  allowedElements: ElementType[];
  exportFormats: ExportFormat[];
  aiExamples: string[];
}

export const MAIL_DESIGNER_CONFIG: DesignerConfig = {
  type: 'mail',
  name: 'Mail Designer',
  dimensions: { width: 600, height: 400, unit: 'px' },
  presets: [
    { name: '4x6 Postcard', width: 600, height: 400 },
    { name: '6x9 Postcard', width: 900, height: 600 },
    { name: '6x11 Postcard', width: 1100, height: 600 },
    { name: 'Letter', width: 850, height: 1100 },
  ],
  allowedElements: ['text', 'image', 'shape', 'qr-code', 'token'],
  exportFormats: ['pdf', 'png'],
  aiExamples: [
    "Add a headline that says 'You're Invited!' at the top",
    "Add a QR code in the bottom right corner",
    "Insert the customer's first name in a greeting",
  ],
};

export const LANDING_PAGE_DESIGNER_CONFIG: DesignerConfig = {
  type: 'landing-page',
  name: 'Landing Page Designer',
  dimensions: { width: 1200, height: 800, unit: 'px' },
  presets: [
    { name: 'Desktop', width: 1200, height: 800 },
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
  ],
  allowedElements: ['text', 'image', 'shape', 'button', 'form', 'video', 'token'],
  exportFormats: ['html', 'png'],
  aiExamples: [
    "Create a hero section with headline and CTA",
    "Add a contact form",
    "Insert a video placeholder",
  ],
};

export const EMAIL_DESIGNER_CONFIG: DesignerConfig = {
  type: 'email',
  name: 'Email Designer',
  dimensions: { width: 600, height: 800, unit: 'px' },
  presets: [
    { name: 'Standard Email', width: 600, height: 800 },
  ],
  allowedElements: ['text', 'image', 'button', 'divider', 'token'],
  exportFormats: ['html'],
  aiExamples: [
    "Add a header with logo",
    "Create a two-column layout",
    "Add an unsubscribe footer",
  ],
};
```

---

### Task 4.2: Update Mail Designer Page

**File**: `src/pages/MailDesigner.tsx`

```typescript
import { DesignerLayout } from '@/features/designer/components/DesignerLayout';
import { MAIL_DESIGNER_CONFIG } from '@/features/designer/config/designerConfigs';

export default function MailDesigner() {
  const { campaignId } = useParams();
  
  return (
    <DesignerLayout
      config={MAIL_DESIGNER_CONFIG}
      campaignId={campaignId}
      onSave={handleSave}
      onExport={handleExport}
    />
  );
}
```

---

### Task 4.3: Update Landing Page Designer

**File**: `src/pages/LandingPageDesigner.tsx`

```typescript
import { DesignerLayout } from '@/features/designer/components/DesignerLayout';
import { LANDING_PAGE_DESIGNER_CONFIG } from '@/features/designer/config/designerConfigs';

export default function LandingPageDesigner() {
  const { pageId } = useParams();
  
  return (
    <DesignerLayout
      config={LANDING_PAGE_DESIGNER_CONFIG}
      pageId={pageId}
      onSave={handleSave}
      onExport={handleExport}
    />
  );
}
```

---

### Task 4.4: Update Email Designer

**File**: `src/pages/EmailDesigner.tsx`

```typescript
import { DesignerLayout } from '@/features/designer/components/DesignerLayout';
import { EMAIL_DESIGNER_CONFIG } from '@/features/designer/config/designerConfigs';

export default function EmailDesigner() {
  const { templateId } = useParams();
  
  return (
    <DesignerLayout
      config={EMAIL_DESIGNER_CONFIG}
      templateId={templateId}
      onSave={handleSave}
      onExport={handleExport}
    />
  );
}
```

---

## PHASE 5: TESTING & POLISH

---

### Task 5.1: Test All Interactions

**Checklist**:
- [ ] Drag element from library to canvas
- [ ] Click element to add to center
- [ ] Click element on canvas to select
- [ ] Drag element on canvas to move
- [ ] Resize element with handles
- [ ] Delete element with keyboard (Delete/Backspace)
- [ ] Undo (Ctrl+Z) works
- [ ] Redo (Ctrl+Y) works
- [ ] AI adds elements correctly
- [ ] AI modifies elements correctly
- [ ] Export PDF works (mail)
- [ ] Export HTML works (landing/email)
- [ ] Save design works
- [ ] Load design works

---

### Task 5.2: Test Token Insertion

**Checklist**:
- [ ] All 8 tokens available
- [ ] Tokens insert into text elements
- [ ] Tokens show preview with fallback
- [ ] Tokens export correctly
- [ ] AI can insert tokens

---

### Task 5.3: Test Background Upload

**Checklist**:
- [ ] Drag & drop upload works
- [ ] Click to browse works
- [ ] PNG, JPG, GIF, WEBP supported
- [ ] Background displays correctly
- [ ] Can remove background
- [ ] Background saves with design

---

### Task 5.4: Cross-Designer Consistency

**Verify same behavior in**:
- [ ] Mail Designer
- [ ] Landing Page Designer
- [ ] Email Designer

**All should have**:
- [ ] AI on left side
- [ ] Same element library
- [ ] Same token system
- [ ] Same interaction patterns

---

## FILE CHANGES SUMMARY

### Files to CREATE:
- `src/features/designer/components/DesignerLayout.tsx`
- `src/features/designer/components/QuickActions.tsx`
- `src/features/designer/components/RightPanel.tsx`
- `src/features/designer/components/AIActionPreview.tsx`
- `src/features/designer/config/designerConfigs.ts`

### Files to MODIFY:
- `src/features/designer/components/AIDesignChat.tsx` (move to left, make prominent)
- `src/features/designer/components/DesignerCanvas.tsx` (fix drop handlers)
- `src/features/designer/components/ElementLibrary.tsx` (fix drag, make collapsible)
- `src/features/designer/components/PropertiesPanel.tsx` (update for right side)
- `src/features/designer/components/LayerPanel.tsx` (update for right side)
- `src/features/designer/hooks/useDesignerAI.ts` (fix action parsing)
- `src/features/designer/utils/aiPrompts.ts` (improve prompts)
- `src/pages/MailDesigner.tsx` (use new layout)
- `src/pages/LandingPageDesigner.tsx` (use new layout)
- `src/pages/EmailDesigner.tsx` (use new layout)

---

**END OF DESIGNER FIX PLAN**

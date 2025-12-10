# DESIGNER FIX - CURSOR PROMPTS

Copy and paste these prompts to Cursor in order.

---

## PHASE 1: Diagnose Current State

```
Read DESIGNER_FIX_PLAN.md for context.

The Mail Designer is broken - drag and drop doesn't work, AI doesn't create elements, nothing is functional. I need you to diagnose the current state.

DO THIS NOW:

1. Find ALL designer-related files:
   - Search src/features/designer/
   - Search src/pages/ for *Designer*.tsx
   - Search src/hooks/ for useDesigner*
   - Check what canvas library is being used (Fabric.js? Konva? Custom?)

2. Read DesignerCanvas.tsx (or equivalent):
   - How are elements rendered?
   - Are event handlers connected?
   - Is there actual canvas/SVG rendering or just placeholders?

3. Read useDesignerState.ts (or equivalent):
   - Does addElement actually update state?
   - Is state being passed to canvas?
   - Are there console.logs we can check?

4. Read the element library component:
   - Is onDragStart implemented?
   - Is there drag-and-drop logic?
   - What happens on click?

5. Check AIDesignChat:
   - Does sendMessage call an API?
   - Does it parse responses into actions?
   - Is it connected to canvas state?

OUTPUT:
Create a diagnostic report:
- What files exist
- What's working vs broken
- Root cause of drag/drop failure
- Root cause of AI not creating elements
- What library (if any) is being used for canvas
- Recommended fix approach
```

---

## PHASE 2: Fix Core Canvas (Part 1 - State)

```
Based on the diagnosis, fix the core designer state management.

Read DESIGNER_FIX_PLAN.md Phase 2 for requirements.

FIX useDesignerState.ts (or create it):

The hook MUST manage this state:
```typescript
interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage: string | null;
}

interface DesignElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'qr-code' | 'token';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  styles: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
  };
  locked: boolean;
}

interface DesignerState {
  canvas: CanvasState;
  elements: DesignElement[];
  selectedId: string | null;
}
```

The hook MUST provide these actions that ACTUALLY WORK:
- addElement(element) - adds to elements array
- updateElement(id, changes) - merges changes into element
- deleteElement(id) - removes from array
- selectElement(id) - sets selectedId
- deselectAll() - sets selectedId to null
- moveElement(id, x, y) - updates position
- resizeElement(id, width, height) - updates size
- setBackgroundImage(url) - sets background
- undo() - reverts last change
- redo() - reapplies undone change

Add console.logs temporarily so we can verify state updates.

Test by calling addElement and checking if elements array grows.
```

---

## PHASE 2: Fix Core Canvas (Part 2 - Rendering)

```
Now fix the canvas rendering so elements actually appear.

FIX DesignerCanvas.tsx:

Requirements:
1. Must render a container div with explicit width/height from canvas state
2. Must show background image if set
3. Must render EACH element in the elements array
4. Each element must be positioned absolutely using x/y
5. Each element must be sized using width/height
6. Selected element must show a blue border or handles

Simple implementation (no library first):
```tsx
function DesignerCanvas() {
  const { canvas, elements, selectedId, selectElement } = useDesignerState();
  
  return (
    <div 
      id="designer-canvas"
      className="relative bg-white shadow-lg"
      style={{ 
        width: canvas.width, 
        height: canvas.height,
        backgroundImage: canvas.backgroundImage ? `url(${canvas.backgroundImage})` : undefined,
        backgroundSize: 'cover'
      }}
    >
      {elements.map(element => (
        <DesignElementRenderer
          key={element.id}
          element={element}
          isSelected={element.id === selectedId}
          onSelect={() => selectElement(element.id)}
        />
      ))}
    </div>
  );
}

function DesignElementRenderer({ element, isSelected, onSelect }) {
  return (
    <div
      className={cn(
        "absolute cursor-move",
        isSelected && "ring-2 ring-blue-500"
      )}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {element.type === 'text' && (
        <div style={{
          fontFamily: element.styles.fontFamily,
          fontSize: element.styles.fontSize,
          fontWeight: element.styles.fontWeight,
          color: element.styles.color,
        }}>
          {element.content}
        </div>
      )}
      {/* Add other element types */}
    </div>
  );
}
```

After this, manually test: Call addElement with a text element, verify it renders on canvas.
```

---

## PHASE 2: Fix Core Canvas (Part 3 - Drag & Drop)

```
Now add drag and drop from element library to canvas.

FIX ElementLibrary.tsx:

Make elements draggable:
```tsx
function ElementButton({ type, icon: Icon, label }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('element-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  return (
    <button
      draggable
      onDragStart={handleDragStart}
      className="p-3 border rounded hover:bg-gray-50 flex flex-col items-center"
    >
      <Icon className="w-5 h-5 mb-1" />
      <span className="text-xs">{label}</span>
    </button>
  );
}
```

UPDATE DesignerCanvas.tsx to accept drops:
```tsx
function DesignerCanvas() {
  const { addElement, canvas, elements } = useDesignerState();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('element-type');
    if (!type || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newElement = createDefaultElement(type, x, y);
    addElement(newElement);
  };
  
  return (
    <div 
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      // ... rest of props
    >
      {/* elements */}
    </div>
  );
}

function createDefaultElement(type: string, x: number, y: number) {
  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    width: type === 'text' ? 200 : 100,
    height: type === 'text' ? 40 : 100,
    rotation: 0,
    content: type === 'text' ? 'New Text' : '',
    styles: {
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
    },
    locked: false,
  };
}
```

TEST: Drag a "Headline" from library, drop on canvas, verify element appears.
```

---

## PHASE 3: Restructure Layout (AI on Left)

```
Now restructure the layout so AI is on the LEFT (primary position).

Read DESIGNER_FIX_PLAN.md Phase 3 for the target layout.

RESTRUCTURE DesignerLayout.tsx (or the main designer page):

NEW LAYOUT:
```tsx
function DesignerLayout() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="font-semibold">Mail Designer</h1>
            <p className="text-sm text-gray-500">Campaign Name</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon"><Undo2 /></Button>
          <Button variant="ghost" size="icon"><Redo2 /></Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - AI FIRST */}
        <div className="w-80 border-r flex flex-col bg-white">
          <AIDesignChat className="flex-1" />
          <ElementLibrary />
          <BackgroundUploader />
        </div>
        
        {/* CENTER - CANVAS */}
        <div className="flex-1 bg-gray-100 p-8 overflow-auto flex items-center justify-center">
          <DesignerCanvas />
        </div>
        
        {/* RIGHT PANEL - PROPERTIES */}
        <div className="w-72 border-l flex flex-col bg-white">
          <PropertiesPanel className="flex-1" />
          <LayerPanel />
          <TokensPanel />
        </div>
      </div>
    </div>
  );
}
```

Make sure:
- AI Chat is at TOP of left panel (most prominent)
- Element library is compact below AI
- Background upload is at bottom of left panel
- Properties/Layers/Tokens are on RIGHT

Apply this layout to MailDesigner.tsx page.
```

---

## PHASE 4: Make AI Actually Work

```
The AI chat exists but doesn't actually create elements. Fix this.

Read DESIGNER_FIX_PLAN.md Phase 4 for AI requirements.

1. CREATE src/features/designer/utils/aiActionParser.ts:
```typescript
export interface AIAction {
  type: 'add_element' | 'modify_element' | 'delete_element';
  payload: any;
}

export function parseAIResponse(responseText: string): { actions: AIAction[], message: string } {
  try {
    // AI should return JSON, try to parse it
    const json = JSON.parse(responseText);
    return {
      actions: json.actions || [],
      message: json.message || 'Done!'
    };
  } catch {
    // If not JSON, it's just a message
    return { actions: [], message: responseText };
  }
}

export function positionToCoordinates(
  position: string, 
  canvasWidth: number, 
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number
): { x: number, y: number } {
  const positions: Record<string, { x: number, y: number }> = {
    'top-left': { x: 20, y: 20 },
    'top': { x: (canvasWidth - elementWidth) / 2, y: 20 },
    'top-center': { x: (canvasWidth - elementWidth) / 2, y: 20 },
    'top-right': { x: canvasWidth - elementWidth - 20, y: 20 },
    'center': { x: (canvasWidth - elementWidth) / 2, y: (canvasHeight - elementHeight) / 2 },
    'bottom-left': { x: 20, y: canvasHeight - elementHeight - 20 },
    'bottom': { x: (canvasWidth - elementWidth) / 2, y: canvasHeight - elementHeight - 20 },
    'bottom-center': { x: (canvasWidth - elementWidth) / 2, y: canvasHeight - elementHeight - 20 },
    'bottom-right': { x: canvasWidth - elementWidth - 20, y: canvasHeight - elementHeight - 20 },
  };
  return positions[position] || positions['center'];
}
```

2. UPDATE useDesignerAI.ts to execute actions:
```typescript
function useDesignerAI() {
  const { addElement, updateElement, canvas } = useDesignerState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const executeActions = (actions: AIAction[]) => {
    actions.forEach(action => {
      if (action.type === 'add_element') {
        const { type, content, position, styles } = action.payload;
        const elementWidth = type === 'text' ? 200 : 100;
        const elementHeight = type === 'text' ? 40 : 100;
        const coords = positionToCoordinates(position, canvas.width, canvas.height, elementWidth, elementHeight);
        
        addElement({
          id: crypto.randomUUID(),
          type,
          content: content || 'New Text',
          x: coords.x,
          y: coords.y,
          width: elementWidth,
          height: elementHeight,
          rotation: 0,
          styles: {
            fontSize: styles?.fontSize || 16,
            fontWeight: styles?.fontWeight || 'normal',
            color: styles?.color || '#000000',
            ...styles
          },
          locked: false,
        });
      }
    });
  };
  
  const sendMessage = async (userMessage: string) => {
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      // Call Gemini or your AI endpoint
      const response = await fetch('/api/ai-design-chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, canvasState: canvas })
      });
      const data = await response.json();
      
      const { actions, message } = parseAIResponse(data.response);
      executeActions(actions);
      
      setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return { messages, sendMessage, isLoading };
}
```

3. Make quick suggestions clickable:
```tsx
// In AIDesignChat.tsx
const suggestions = [
  "Add a headline that says 'You're Invited!' at the top",
  "Add a QR code in the bottom right corner",
  "Insert the customer's first name in a greeting",
  "Add the company logo in the top left"
];

{suggestions.map(text => (
  <button
    key={text}
    onClick={() => sendMessage(text)}
    className="w-full text-left p-2 text-sm hover:bg-gray-100 rounded"
  >
    "{text}"
  </button>
))}
```

TEST: Type "Add a headline at the top" - verify element appears on canvas.
```

---

## PHASE 5: Fix Properties & Layers Panels

```
Fix the right side panels to actually work.

1. FIX PropertiesPanel.tsx:
```tsx
function PropertiesPanel() {
  const { elements, selectedId, updateElement } = useDesignerState();
  const selectedElement = elements.find(el => el.id === selectedId);
  
  if (!selectedElement) {
    return (
      <div className="p-4">
        <h3 className="font-medium text-gray-400">Properties</h3>
        <p className="text-sm text-gray-400 mt-2">Select an element to edit its properties</p>
      </div>
    );
  }
  
  const handleChange = (key: string, value: any) => {
    updateElement(selectedId, { [key]: value });
  };
  
  const handleStyleChange = (key: string, value: any) => {
    updateElement(selectedId, { 
      styles: { ...selectedElement.styles, [key]: value } 
    });
  };
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">Properties</h3>
      
      {/* Position */}
      <div>
        <label className="text-xs text-gray-500">Position</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Input 
            type="number" 
            value={selectedElement.x} 
            onChange={e => handleChange('x', parseInt(e.target.value))}
            placeholder="X"
          />
          <Input 
            type="number" 
            value={selectedElement.y}
            onChange={e => handleChange('y', parseInt(e.target.value))}
            placeholder="Y"
          />
        </div>
      </div>
      
      {/* Size */}
      <div>
        <label className="text-xs text-gray-500">Size</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Input 
            type="number" 
            value={selectedElement.width}
            onChange={e => handleChange('width', parseInt(e.target.value))}
            placeholder="Width"
          />
          <Input 
            type="number" 
            value={selectedElement.height}
            onChange={e => handleChange('height', parseInt(e.target.value))}
            placeholder="Height"
          />
        </div>
      </div>
      
      {/* Text-specific properties */}
      {selectedElement.type === 'text' && (
        <>
          <div>
            <label className="text-xs text-gray-500">Content</label>
            <Textarea 
              value={selectedElement.content}
              onChange={e => handleChange('content', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Font Size</label>
            <Input 
              type="number" 
              value={selectedElement.styles.fontSize || 16}
              onChange={e => handleStyleChange('fontSize', parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Color</label>
            <Input 
              type="color" 
              value={selectedElement.styles.color || '#000000'}
              onChange={e => handleStyleChange('color', e.target.value)}
              className="mt-1 h-10"
            />
          </div>
        </>
      )}
    </div>
  );
}
```

2. FIX LayerPanel.tsx:
```tsx
function LayerPanel() {
  const { elements, selectedId, selectElement, reorderLayers } = useDesignerState();
  
  return (
    <div className="p-4 border-t">
      <h3 className="font-medium mb-2">Layers</h3>
      <div className="space-y-1">
        {[...elements].reverse().map((element, index) => (
          <div
            key={element.id}
            onClick={() => selectElement(element.id)}
            className={cn(
              "p-2 rounded cursor-pointer flex items-center gap-2 text-sm",
              selectedId === element.id ? "bg-blue-100" : "hover:bg-gray-100"
            )}
          >
            {element.type === 'text' && <Type className="w-4 h-4" />}
            {element.type === 'image' && <Image className="w-4 h-4" />}
            {element.type === 'shape' && <Square className="w-4 h-4" />}
            {element.type === 'qr-code' && <QrCode className="w-4 h-4" />}
            <span className="truncate">
              {element.type === 'text' ? element.content.slice(0, 20) : element.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

3. FIX TokensPanel.tsx:
```tsx
const TOKENS = [
  { key: 'first_name', value: '{{first_name}}', label: 'First Name' },
  { key: 'last_name', value: '{{last_name}}', label: 'Last Name' },
  { key: 'full_name', value: '{{full_name}}', label: 'Full Name' },
  { key: 'unique_code', value: '{{unique_code}}', label: 'Unique Code' },
  { key: 'company_name', value: '{{company_name}}', label: 'Company Name' },
  { key: 'purl', value: '{{purl}}', label: 'Personal URL' },
  { key: 'qr_code', value: '{{qr_code}}', label: 'QR Code' },
  { key: 'gift_card_amount', value: '{{gift_card_amount}}', label: 'Gift Card Amount' },
];

function TokensPanel() {
  const { elements, selectedId, updateElement } = useDesignerState();
  const selectedElement = elements.find(el => el.id === selectedId);
  
  const insertToken = (tokenValue: string) => {
    if (selectedElement?.type === 'text') {
      updateElement(selectedId, {
        content: selectedElement.content + ' ' + tokenValue
      });
    }
  };
  
  return (
    <div className="p-4 border-t">
      <h3 className="font-medium mb-2">Insert Token</h3>
      <div className="space-y-1">
        {TOKENS.map(token => (
          <button
            key={token.key}
            onClick={() => insertToken(token.value)}
            disabled={selectedElement?.type !== 'text'}
            className="w-full text-left p-2 text-sm hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <code className="text-purple-600">{token.value}</code>
            <span className="text-gray-500 ml-2 text-xs">{token.label}</span>
          </button>
        ))}
      </div>
      {selectedElement?.type !== 'text' && (
        <p className="text-xs text-gray-400 mt-2">Select a text element to insert tokens</p>
      )}
    </div>
  );
}
```

TEST: Select a text element, change its content in properties, verify canvas updates.
```

---

## PHASE 6: Apply to All Designers

```
Now make sure the same framework works for ALL designer types.

1. Create a shared provider:
```typescript
// src/features/designer/context/DesignerProvider.tsx
interface DesignerConfig {
  type: 'mail' | 'landing' | 'email';
  defaultWidth: number;
  defaultHeight: number;
  exportFormat: 'pdf' | 'html';
}

const DesignerContext = createContext<{
  config: DesignerConfig;
  state: DesignerState;
  actions: DesignerActions;
} | null>(null);

export function DesignerProvider({ config, children }) {
  const designerState = useDesignerStateInternal(config);
  
  return (
    <DesignerContext.Provider value={{ config, ...designerState }}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesigner() {
  const context = useContext(DesignerContext);
  if (!context) throw new Error('useDesigner must be used within DesignerProvider');
  return context;
}
```

2. Update MailDesigner.tsx:
```tsx
const MAIL_CONFIG = {
  type: 'mail' as const,
  defaultWidth: 576,  // 4x6 at 96dpi
  defaultHeight: 384,
  exportFormat: 'pdf' as const,
};

export default function MailDesigner() {
  return (
    <DesignerProvider config={MAIL_CONFIG}>
      <DesignerLayout 
        title="Mail Designer"
        exportButton={<ExportPDFButton />}
      />
    </DesignerProvider>
  );
}
```

3. Create/Update LandingPageDesigner.tsx:
```tsx
const LANDING_CONFIG = {
  type: 'landing' as const,
  defaultWidth: 1200,
  defaultHeight: 800,
  exportFormat: 'html' as const,
};

export default function LandingPageDesigner() {
  return (
    <DesignerProvider config={LANDING_CONFIG}>
      <DesignerLayout 
        title="Landing Page Designer"
        exportButton={<ExportHTMLButton />}
      />
    </DesignerProvider>
  );
}
```

4. Create EmailDesigner.tsx:
```tsx
const EMAIL_CONFIG = {
  type: 'email' as const,
  defaultWidth: 600,
  defaultHeight: 800,
  exportFormat: 'html' as const,
};

export default function EmailDesigner() {
  return (
    <DesignerProvider config={EMAIL_CONFIG}>
      <DesignerLayout 
        title="Email Designer"
        exportButton={<ExportHTMLButton />}
      />
    </DesignerProvider>
  );
}
```

Ensure all three designers use the SAME components:
- DesignerLayout
- DesignerCanvas
- AIDesignChat
- ElementLibrary
- PropertiesPanel
- LayerPanel
- TokensPanel

Only the CONFIG differs.
```

---

## PHASE 7: Testing & Verification

```
Run through the complete testing checklist to verify everything works.

TEST EACH OF THESE MANUALLY:

CANVAS:
□ Upload a background image - verify it displays
□ Click "Headline" in element library - verify nothing happens (should need to drag)
□ Drag "Headline" to canvas - verify element appears at drop location
□ Click element on canvas - verify blue border/selection appears
□ Drag selected element - verify it moves
□ Press Delete key - verify element is deleted
□ Press Ctrl+Z - verify element comes back (undo)
□ Press Ctrl+Y - verify element goes away again (redo)

AI CHAT:
□ Type "Add a headline at the top" - verify element appears at top center
□ Type "Make it red" (with headline selected) - verify color changes
□ Type "Add a QR code in the bottom right" - verify QR placeholder appears
□ Click a quick suggestion - verify it works same as typing
□ Type "Insert the customer's first name" - verify {{first_name}} token appears

PROPERTIES PANEL:
□ With nothing selected - verify "Select an element" message
□ Select a text element - verify properties show
□ Change X value - verify element moves horizontally
□ Change Y value - verify element moves vertically
□ Change content text - verify element text updates
□ Change font size - verify text size changes
□ Change color - verify text color changes

LAYERS PANEL:
□ Add 3 elements - verify all 3 appear in layers
□ Click a layer - verify corresponding element is selected on canvas
□ Top element in layers should be top visually

TOKENS PANEL:
□ With text element selected - verify tokens are clickable
□ Click {{first_name}} - verify it's added to text content
□ With no element selected - verify tokens are disabled/grayed

EXPORT:
□ Click "Export PDF" - verify PDF downloads
□ Open PDF - verify all elements are visible
□ Verify PDF dimensions match design

Report any failures and fix them.
```

---

## QUICK FIX PROMPT (If only drag/drop is broken)

If most things work but drag/drop specifically is broken, use this focused fix:

```
The Mail Designer drag and drop is not working. Elements in the library cannot be dragged to the canvas.

Debug and fix:

1. Check ElementLibrary component:
   - Is `draggable={true}` set on element buttons?
   - Is `onDragStart` handler defined and setting dataTransfer?

2. Check DesignerCanvas component:
   - Is `onDragOver` handler calling `e.preventDefault()`?
   - Is `onDrop` handler defined?
   - Is `onDrop` reading from `e.dataTransfer.getData()`?
   - Is `onDrop` calling `addElement()`?

3. Check useDesignerState hook:
   - Is `addElement` actually adding to state?
   - Add console.log in addElement to verify it's called

4. Check element rendering:
   - After addElement, does the elements array update?
   - Is DesignerCanvas re-rendering when elements change?

Fix each issue found. Add console.logs to trace the flow:
- "Drag started with type: X"
- "Drop received at X, Y"
- "Adding element: {...}"
- "Elements array now has N items"

After fixing, remove the console.logs.
```

---

**Use these prompts in order. Start with Phase 1 diagnosis, then fix each part systematically.**

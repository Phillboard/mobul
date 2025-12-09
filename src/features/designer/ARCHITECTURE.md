# AI-First Designer System - Architecture

**Purpose**: Unified design system for mail pieces, landing pages, and emails with AI-powered creation.

**Replaces**: GrapesJS (removed in Phase 3A)

**Status**: In Development (Phase 3B)

---

## Design Principles

1. **AI-First**: Design through natural language conversation
2. **Unified**: Same framework for mail, landing pages, and emails
3. **Template Token Support**: Consistent `{{first_name}}`, `{{unique_code}}` across all designers
4. **Background Overlay**: Upload templates as background, design on top
5. **Export-Ready**: PDF for mail, HTML for landing/email

---

## Architecture Overview

```
src/features/designer/
├── components/          # React components
│   ├── DesignerCanvas.tsx       # Main editing canvas (Fabric.js)
│   ├── DesignerToolbar.tsx      # Tool selection bar
│   ├── DesignerSidebar.tsx      # Properties panel
│   ├── DesignerAIChat.tsx       # AI conversation interface
│   ├── BackgroundUploader.tsx   # Upload background images
│   ├── TokenInserter.tsx        # Insert template tokens
│   ├── ElementLibrary.tsx       # Draggable elements
│   ├── LayerPanel.tsx           # Layer management
│   ├── PropertiesPanel.tsx      # Element property editor
│   └── ExportDialog.tsx         # Export to PDF/HTML
├── hooks/               # State management hooks
│   ├── useDesignerState.ts      # Canvas state (elements, selection)
│   ├── useDesignerHistory.ts    # Undo/redo
│   ├── useDesignerAI.ts         # AI generation
│   └── useDesignerExport.ts     # Export functionality
├── types/               # TypeScript types
│   └── designer.ts              # All designer types
├── utils/               # Utility functions
│   ├── tokenParser.ts           # Parse/replace template tokens
│   ├── exportPDF.ts             # PDF generation
│   ├── exportHTML.ts            # HTML generation
│   └── canvasHelpers.ts         # Canvas manipulation helpers
└── ARCHITECTURE.md      # This file
```

---

## Core Technologies

### Canvas Rendering
- **Fabric.js** - HTML5 canvas framework
- Supports: drag, resize, rotate, layers, groups
- Export to image, JSON serialization

### AI Integration
- **Gemini API** - existing integration in codebase
- Natural language → design actions
- Template suggestions

### Export
- **jsPDF** - PDF generation for mail pieces
- Custom HTML generator - for landing pages/emails
- Token replacement during export

---

## Data Models

### DesignElement
Core building block for all design elements.

```typescript
interface DesignElement {
  id: string;                    // Unique identifier
  type: ElementType;             // 'text' | 'image' | 'shape' | 'qr-code' | 'token'
  x: number;                     // X position
  y: number;                     // Y position
  width: number;                 // Width
  height: number;                // Height
  rotation: number;              // Rotation in degrees
  zIndex: number;                // Layer order
  locked: boolean;               // Prevent editing
  visible: boolean;              // Show/hide
  content?: string | TokenContent; // Text or token
  src?: string;                  // Image URL
  styles: ElementStyles;         // Visual styles
}
```

### CanvasState
Complete state of the designer canvas.

```typescript
interface CanvasState {
  width: number;                 // Canvas width
  height: number;                // Canvas height
  backgroundColor: string;       // Canvas background color
  backgroundImage: string | null; // Uploaded background URL
  elements: DesignElement[];     // All design elements
  selectedElementIds: string[];  // Currently selected elements
}
```

### DesignerConfig
Configuration per designer type.

```typescript
interface DesignerConfig {
  type: 'mail' | 'landing-page' | 'email';
  dimensions: { width: number; height: number };
  allowedElements: ElementType[];
  availableTokens: TemplateToken[];
  exportFormat: 'pdf' | 'html';
}
```

**Preset Configs**:
- **Mail**: 1200x1800px (4x6 at 300dpi), PDF export
- **Landing Page**: 1920x1080px, HTML export, responsive
- **Email**: 600px width, HTML export, email-safe

---

## Component Responsibilities

### DesignerCanvas
- Render canvas with Fabric.js
- Handle element drag/drop, resize, rotate
- Selection management (single/multi)
- Grid/guides/snapping
- Zoom in/out

### DesignerToolbar
- Tool selection: Select, Text, Image, Shape, QR, Token
- Canvas actions: Undo, Redo, Clear, Grid toggle
- Zoom controls

### DesignerSidebar
- Tabs: Layers, Properties, Tokens, AI
- Context-aware (changes based on selection)

### DesignerAIChat
- Chat interface for AI design requests
- Parse AI responses into design actions
- Preview suggestions before applying
- Example prompts to guide users

### BackgroundUploader
- Upload image as canvas background
- Preview uploaded image
- Adjust: fit, fill, center, stretch
- Remove background

### TokenInserter
- List all available template tokens
- Search/filter tokens
- Click to insert into selected text element
- Preview token with sample data

### ElementLibrary
- Grid of draggable elements
- Categories: Text, Images, Shapes, Special
- Click to add to center of canvas
- Drag to add at specific position

### LayerPanel
- List all elements as layers
- Reorder via drag-and-drop
- Toggle visibility
- Lock/unlock layers
- Quick select by clicking layer
- Rename layers

### PropertiesPanel
- Element-specific property editors
- **Text**: font, size, color, alignment, line height
- **Image**: src, fit mode, filters
- **Shape**: fill, stroke, corner radius
- **All**: position, size, rotation, opacity

### ExportDialog
- Export options: format, quality, size
- Token replacement settings
- Preview before export
- Download or save to campaign

---

## State Management

### useDesignerState
Primary state hook for canvas.

**State**:
- `canvasState: CanvasState`
- `config: DesignerConfig`
- `isDirty: boolean`

**Actions**:
- `addElement(element: DesignElement)`
- `updateElement(id: string, updates: Partial<DesignElement>)`
- `deleteElement(id: string)`
- `selectElement(id: string)`
- `clearSelection()`
- `setBackgroundImage(url: string)`
- `resetCanvas()`

**Persistence**:
- Auto-save to localStorage every 30 seconds
- Save to backend on manual save
- Load existing design on mount

### useDesignerHistory
Undo/redo functionality.

**State**:
- `history: CanvasState[]`
- `currentIndex: number`

**Actions**:
- `undo()`
- `redo()`
- `canUndo: boolean`
- `canRedo: boolean`

**Implementation**:
- Track state changes in array
- Limit to 50 history states
- Keyboard shortcuts: Ctrl+Z, Ctrl+Y

### useDesignerAI
AI conversation and design generation.

**State**:
- `messages: ChatMessage[]`
- `isGenerating: boolean`

**Actions**:
- `sendMessage(text: string)`
- `applySuggestion(suggestion: DesignAction)`
- `clearConversation()`

**AI Capabilities**:
- Add elements: "Add a headline that says 'Welcome'"
- Modify elements: "Make the text blue and larger"
- Layout suggestions: "Center everything vertically"
- Token insertion: "Add the customer's first name"

### useDesignerExport
Export to PDF or HTML.

**Actions**:
- `exportToPDF(options: PDFExportOptions): Promise<Blob>`
- `exportToHTML(options: HTMLExportOptions): Promise<string>`
- `generatePreview(data: Record<string, string>): Promise<string>`

**Export Options**:
- Replace tokens with actual data or placeholders
- Quality settings (DPI for PDF)
- Responsive breakpoints (HTML)
- Email-safe HTML (inline styles, limited CSS)

---

## Template Token System

### Standard Tokens
From `PLATFORM_DICTIONARY.md`:
- `{{first_name}}` - Recipient's first name
- `{{last_name}}` - Recipient's last name
- `{{full_name}}` - Recipient's full name
- `{{unique_code}}` - Recipient's unique tracking code
- `{{company_name}}` - Client's company name
- `{{purl}}` - Personal URL
- `{{qr_code}}` - QR code image
- `{{gift_card_amount}}` - Gift card value

### Token Parsing
```typescript
// Find all tokens in text
const tokens = extractTokens("Hello {{first_name}}!"); // ['{{first_name}}']

// Replace tokens with data
const result = replaceTokens("Hello {{first_name}}!", {
  first_name: "John"
}); // "Hello John!"

// Validate tokens
const valid = validateTokens("{{first_name}} {{invalid_token}}"); 
// { valid: false, invalid: ['{{invalid_token}}'] }
```

### Token Elements
Special element type for dynamic content.

**Properties**:
- `tokenName`: Which token (e.g., "{{first_name}}")
- `fallback`: Default if no data (e.g., "Valued Customer")
- `format`: Text formatting (uppercase, titlecase, etc.)

**Rendering**:
- Design mode: Show `[First Name]` or fallback
- Preview mode: Replace with sample data
- Export: Replace with actual data or keep placeholder

---

## Workflow Examples

### Mail Piece Design
1. User uploads 4x6 mail template as background
2. AI: "Add a headline at the top saying 'Special Offer'"
3. Designer creates text element, centers it
4. User: "Add the customer's name below the headline"
5. Designer inserts `{{first_name}}` token
6. User: "Add a QR code in the bottom right"
7. Designer adds QR placeholder linked to PURL
8. Export to PDF for printing

### Landing Page Design
1. User: "Create a landing page for a car dealership promotion"
2. AI generates layout: header, hero, form, footer
3. User adjusts colors, adds logo image
4. Inserts `{{company_name}}` in header
5. Adds form fields (name, email, phone)
6. Export to HTML, publish to campaign URL

### Email Template
1. User: "Design a gift card delivery email"
2. AI creates email template with header, body, footer
3. Inserts `{{full_name}}`, `{{gift_card_amount}}` tokens
4. Adds button: "Claim Your ${gift_card_amount} Gift Card"
5. Export to email-safe HTML
6. Save as reusable template

---

## Performance Considerations

### Canvas Optimization
- Virtualization for large element counts
- Debounce element updates
- Lazy load images
- Throttle AI requests

### Export Optimization
- Worker threads for PDF generation
- Streaming HTML export
- Cached token replacements
- Batch operations

### Storage
- Compress canvas state JSON
- Image optimization before upload
- CDN for background templates
- Incremental saves (not full state)

---

## Future Enhancements

### Phase 1 (Current)
- Basic canvas with text, images, shapes
- Template token support
- PDF and HTML export
- Simple AI commands

### Phase 2 (Future)
- Drag-and-drop from asset library
- Pre-made templates
- Collaboration (multi-user editing)
- Version history

### Phase 3 (Future)
- Advanced AI: layout suggestions, design critique
- Animation support (for digital mail)
- A/B test variant generator
- Brand style guide enforcement

---

## Migration from GrapesJS

### Data Migration
Existing GrapesJS designs in database:
1. Parse `json_layers` field
2. Convert to new `DesignElement[]` format
3. Save as `canvas_state` field

### Compatibility
- Keep old data for rollback capability
- Run both systems in parallel during transition
- Migration script to convert all existing designs

### Deprecation Plan
1. Phase 3B-3E: Build new designer
2. Phase 3F: Run both systems
3. Phase 4: Migrate existing designs
4. Phase 5: Remove GrapesJS entirely

---

## Testing Strategy

### Unit Tests
- Token parser functions
- State management hooks
- Export utilities

### Integration Tests
- Canvas operations (add, move, delete)
- AI command parsing
- Export generates valid PDF/HTML

### E2E Tests
- Complete design workflow
- Save and load designs
- Export and verify output

---

## Documentation

### User Guides
- Getting started with the designer
- AI command reference
- Template token guide
- Export best practices

### Developer Docs
- Component API reference
- State hook documentation
- Adding new element types
- Extending AI capabilities

---

**Status**: Architecture defined ✅  
**Next Steps**: Implement types, then hooks, then components  
**Owner**: Platform Engineering Team  
**Last Updated**: December 2024


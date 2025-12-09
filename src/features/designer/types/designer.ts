/**
 * Designer Type Definitions
 * 
 * Types for the unified AI-first designer system.
 * Used for mail pieces, landing pages, and email templates.
 * 
 * @see ../ARCHITECTURE.md for complete system design
 * @see PLATFORM_DICTIONARY.md for template token definitions
 */

// ============================================================================
// Element Types
// ============================================================================

/**
 * Types of design elements that can be placed on the canvas
 */
export type ElementType = 
  | 'text'          // Text block
  | 'image'         // Image element
  | 'shape'         // Rectangle, circle, etc.
  | 'qr-code'       // QR code placeholder
  | 'template-token' // Dynamic content token
  | 'button'        // Clickable button (landing pages/emails)
  | 'form-field';   // Input field (landing pages/emails)

/**
 * Shape subtypes
 */
export type ShapeType = 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'line' 
  | 'polygon';

/**
 * Text alignment options
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * Font weight options
 */
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

// ============================================================================
// Template Tokens
// ============================================================================

/**
 * Template token content with fallback
 */
export interface TokenContent {
  /** Token string (e.g., "{{first_name}}") */
  token: string;
  /** Fallback value if token data not available */
  fallback: string;
  /** Text transformation to apply */
  transform?: 'uppercase' | 'lowercase' | 'titlecase' | 'none';
}

/**
 * Available template tokens from PLATFORM_DICTIONARY.md
 */
export const AVAILABLE_TOKENS = {
  FIRST_NAME: '{{first_name}}',
  LAST_NAME: '{{last_name}}',
  FULL_NAME: '{{full_name}}',
  UNIQUE_CODE: '{{unique_code}}',
  COMPANY_NAME: '{{company_name}}',
  PURL: '{{purl}}',
  QR_CODE: '{{qr_code}}',
  GIFT_CARD_AMOUNT: '{{gift_card_amount}}',
} as const;

export type TemplateToken = typeof AVAILABLE_TOKENS[keyof typeof AVAILABLE_TOKENS];

// ============================================================================
// Element Styles
// ============================================================================

/**
 * Visual styling properties for elements
 */
export interface ElementStyles {
  // Text styles
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  color?: string;
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacing?: number;
  
  // Container styles
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  
  // Visual effects
  opacity?: number;
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  
  // Transform
  scaleX?: number;
  scaleY?: number;
}

// ============================================================================
// Design Elements
// ============================================================================

/**
 * Base properties shared by all design elements
 */
export interface BaseElement {
  id: string;
  type: ElementType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  styles: ElementStyles;
  metadata?: Record<string, any>;
}

/**
 * Text element
 */
export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
}

/**
 * Image element
 */
export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt?: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
  };
}

/**
 * Shape element
 */
export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  points?: Array<{ x: number; y: number }>; // For polygons
}

/**
 * QR Code element
 */
export interface QRCodeElement extends BaseElement {
  type: 'qr-code';
  data: string; // URL or data to encode
  foregroundColor?: string;
  backgroundColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Template Token element (dynamic content)
 */
export interface TemplateTokenElement extends BaseElement {
  type: 'template-token';
  tokenContent: TokenContent;
}

/**
 * Button element (landing pages/emails only)
 */
export interface ButtonElement extends BaseElement {
  type: 'button';
  text: string;
  href?: string;
  action?: 'submit' | 'link' | 'custom';
}

/**
 * Form Field element (landing pages/emails only)
 */
export interface FormFieldElement extends BaseElement {
  type: 'form-field';
  fieldType: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select, radio
}

/**
 * Union type of all design elements
 */
export type DesignElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | QRCodeElement
  | TemplateTokenElement
  | ButtonElement
  | FormFieldElement;

// ============================================================================
// Canvas State
// ============================================================================

/**
 * Complete state of the design canvas
 */
export interface CanvasState {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Canvas background color */
  backgroundColor: string;
  /** Uploaded background image URL */
  backgroundImage: string | null;
  /** All design elements on the canvas */
  elements: DesignElement[];
  /** IDs of currently selected elements */
  selectedElementIds: string[];
  /** Canvas-level settings */
  settings?: {
    gridSize?: number;
    gridVisible?: boolean;
    snapToGrid?: boolean;
    showGuides?: boolean;
  };
}

// ============================================================================
// Designer Configuration
// ============================================================================

/**
 * Designer type (determines available features)
 */
export type DesignerType = 'mail' | 'landing-page' | 'email';

/**
 * Export format
 */
export type ExportFormat = 'pdf' | 'html' | 'png' | 'jpg';

/**
 * Designer configuration per type
 */
export interface DesignerConfig {
  /** Type of designer */
  type: DesignerType;
  /** Canvas dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Element types allowed in this designer */
  allowedElements: ElementType[];
  /** Available template tokens */
  availableTokens: TemplateToken[];
  /** Default export format */
  exportFormat: ExportFormat;
  /** Additional type-specific settings */
  settings?: {
    dpi?: number; // For print (mail)
    responsive?: boolean; // For web (landing/email)
    emailSafe?: boolean; // For email templates
  };
}

/**
 * Preset configurations for each designer type
 */
export const DESIGNER_PRESETS: Record<DesignerType, DesignerConfig> = {
  mail: {
    type: 'mail',
    dimensions: { width: 1200, height: 1800 }, // 4x6 at 300dpi
    allowedElements: ['text', 'image', 'shape', 'qr-code', 'template-token'],
    availableTokens: Object.values(AVAILABLE_TOKENS),
    exportFormat: 'pdf',
    settings: {
      dpi: 300,
      responsive: false,
      emailSafe: false,
    },
  },
  'landing-page': {
    type: 'landing-page',
    dimensions: { width: 1920, height: 1080 },
    allowedElements: ['text', 'image', 'shape', 'qr-code', 'template-token', 'button', 'form-field'],
    availableTokens: Object.values(AVAILABLE_TOKENS),
    exportFormat: 'html',
    settings: {
      responsive: true,
      emailSafe: false,
    },
  },
  email: {
    type: 'email',
    dimensions: { width: 600, height: 800 },
    allowedElements: ['text', 'image', 'shape', 'template-token', 'button'],
    availableTokens: Object.values(AVAILABLE_TOKENS),
    exportFormat: 'html',
    settings: {
      responsive: true,
      emailSafe: true, // Inline styles, limited CSS
    },
  },
};

// ============================================================================
// AI Integration
// ============================================================================

/**
 * AI chat message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Design action that AI can perform
 */
export type DesignAction =
  | { type: 'add-element'; element: Partial<DesignElement> }
  | { type: 'update-element'; id: string; updates: Partial<DesignElement> }
  | { type: 'delete-element'; id: string }
  | { type: 'move-element'; id: string; x: number; y: number }
  | { type: 'resize-element'; id: string; width: number; height: number }
  | { type: 'set-background'; imageUrl: string }
  | { type: 'clear-canvas' };

/**
 * AI suggestion response
 */
export interface AISuggestion {
  actions: DesignAction[];
  explanation: string;
  preview?: string; // Base64 preview image
}

// ============================================================================
// Export Options
// ============================================================================

/**
 * PDF export options
 */
export interface PDFExportOptions {
  /** Output quality/DPI */
  quality: 'low' | 'medium' | 'high' | 'print';
  /** Include bleed area */
  includeBleed?: boolean;
  /** Token replacement data */
  tokenData?: Record<string, string>;
  /** Use placeholders for missing tokens */
  usePlaceholders?: boolean;
}

/**
 * HTML export options
 */
export interface HTMLExportOptions {
  /** Include responsive CSS */
  responsive?: boolean;
  /** Inline all styles (for email) */
  inlineStyles?: boolean;
  /** Token replacement data */
  tokenData?: Record<string, string>;
  /** Generate email-safe HTML */
  emailSafe?: boolean;
}

/**
 * Image export options
 */
export interface ImageExportOptions {
  /** Output format */
  format: 'png' | 'jpg';
  /** Image quality (0-100 for JPG) */
  quality?: number;
  /** Scale multiplier */
  scale?: number;
  /** Token replacement data */
  tokenData?: Record<string, string>;
}

// ============================================================================
// History & Undo/Redo
// ============================================================================

/**
 * History state for undo/redo
 */
export interface HistoryState {
  canvasState: CanvasState;
  timestamp: Date;
  action?: string; // Human-readable action description
}

/**
 * History manager interface
 */
export interface HistoryManager {
  past: HistoryState[];
  present: CanvasState;
  future: HistoryState[];
  canUndo: boolean;
  canRedo: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isTextElement(element: DesignElement): element is TextElement {
  return element.type === 'text';
}

export function isImageElement(element: DesignElement): element is ImageElement {
  return element.type === 'image';
}

export function isShapeElement(element: DesignElement): element is ShapeElement {
  return element.type === 'shape';
}

export function isQRCodeElement(element: DesignElement): element is QRCodeElement {
  return element.type === 'qr-code';
}

export function isTemplateTokenElement(element: DesignElement): element is TemplateTokenElement {
  return element.type === 'template-token';
}

export function isButtonElement(element: DesignElement): element is ButtonElement {
  return element.type === 'button';
}

export function isFormFieldElement(element: DesignElement): element is FormFieldElement {
  return element.type === 'form-field';
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Partial updates for an element (used in state updates)
 */
export type ElementUpdate<T extends DesignElement = DesignElement> = {
  [K in keyof T]?: T[K];
};

/**
 * Selection state
 */
export interface Selection {
  elementIds: string[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Drag operation state
 */
export interface DragState {
  isDragging: boolean;
  elementId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Resize operation state
 */
export interface ResizeState {
  isResizing: boolean;
  elementId: string | null;
  handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
}


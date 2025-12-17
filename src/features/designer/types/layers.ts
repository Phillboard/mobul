/**
 * Layer System Type Definitions
 * 
 * Defines the layer-based canvas system for the unified designer.
 * Layers can be backgrounds, text, images, QR codes, code boxes, phone boxes, etc.
 */

// ============================================================================
// Layer Types
// ============================================================================

/**
 * Types of layers that can be placed on the canvas
 */
export type LayerType = 
  | 'background'       // AI-generated or uploaded background image
  | 'image'           // Uploaded image overlay
  | 'text'            // Text block (can contain tokens)
  | 'shape'           // Rectangle, circle, etc.
  | 'qr-placeholder'  // QR code placeholder (replaced at mail merge)
  | 'code-box'        // Unique code display box
  | 'phone-box';      // Phone number display

/**
 * Shape subtypes
 */
export type ShapeType = 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'line' 
  | 'polygon';

// ============================================================================
// Style Types
// ============================================================================

/**
 * Text styling properties
 */
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'light' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  textShadow?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

/**
 * Code box visual style
 */
export interface CodeBoxStyle {
  variant: 'ticket-stub' | 'rounded' | 'pill' | 'plain';
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
}

/**
 * Phone box visual style
 */
export interface PhoneBoxStyle {
  variant: 'banner' | 'button' | 'plain' | 'with-cta';
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  icon: boolean; // show phone icon
  ctaText?: string; // for 'with-cta' variant
}

// ============================================================================
// Base Layer Interface
// ============================================================================

/**
 * Base properties shared by all layers
 */
export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-100
  position: { x: number; y: number }; // percentage or pixels
  size: { width: number; height: number };
  rotation: number; // degrees
  zIndex: number;
}

// ============================================================================
// Specific Layer Types
// ============================================================================

/**
 * Background layer - AI-generated or uploaded background image
 */
export interface BackgroundLayer extends BaseLayer {
  type: 'background';
  imageUrl: string;
  fit: 'cover' | 'contain' | 'fill';
}

/**
 * Text layer - can contain static text or template tokens
 */
export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;           // "Hey {{first_name}}!" or static text
  containsTokens: boolean;   // true if content has {{tokens}}
  style: TextStyle;
}

/**
 * Image layer - uploaded image overlays, logos, etc.
 */
export interface ImageLayer extends BaseLayer {
  type: 'image';
  imageUrl: string;
  alt?: string;
  fit: 'cover' | 'contain' | 'fill' | 'none';
}

/**
 * Shape layer - geometric shapes
 */
export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  points?: Array<{ x: number; y: number }>; // For polygons
}

/**
 * QR Code placeholder layer
 * Actual QR codes are generated during mail merge
 */
export interface QRPlaceholderLayer extends BaseLayer {
  type: 'qr-placeholder';
  placeholderStyle: 'box' | 'dotted' | 'icon';
  label: string; // "QR" or "Scan Me"
}

/**
 * Code box layer - displays unique tracking codes
 */
export interface CodeBoxLayer extends BaseLayer {
  type: 'code-box';
  labelText: string;        // "YOUR CODE:"
  valueToken: string;       // "{{unique_code}}"
  style: CodeBoxStyle;
}

/**
 * Phone number display layer
 */
export interface PhoneBoxLayer extends BaseLayer {
  type: 'phone-box';
  phoneNumber: string;      // "1-800-555-SUBS"
  style: PhoneBoxStyle;
}

/**
 * Union type of all layer types
 */
export type CanvasLayer = 
  | BackgroundLayer
  | TextLayer
  | ImageLayer
  | ShapeLayer
  | QRPlaceholderLayer
  | CodeBoxLayer
  | PhoneBoxLayer;

// ============================================================================
// Canvas State
// ============================================================================

/**
 * Complete state of the canvas
 */
export interface CanvasState {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  canvasSize: { width: number; height: number };
  zoom: number; // 0.1 to 2.0
  gridVisible?: boolean;
  snapToGrid?: boolean;
}

// ============================================================================
// History for Undo/Redo
// ============================================================================

/**
 * History state entry
 */
export interface HistoryEntry {
  layers: CanvasLayer[];
  timestamp: number;
  action?: string; // Description of the action
}

/**
 * History state
 */
export interface HistoryState {
  past: HistoryEntry[];
  present: CanvasLayer[];
  future: HistoryEntry[];
}

// ============================================================================
// Type Guards
// ============================================================================

export function isBackgroundLayer(layer: CanvasLayer): layer is BackgroundLayer {
  return layer.type === 'background';
}

export function isTextLayer(layer: CanvasLayer): layer is TextLayer {
  return layer.type === 'text';
}

export function isImageLayer(layer: CanvasLayer): layer is ImageLayer {
  return layer.type === 'image';
}

export function isShapeLayer(layer: CanvasLayer): layer is ShapeLayer {
  return layer.type === 'shape';
}

export function isQRPlaceholderLayer(layer: CanvasLayer): layer is QRPlaceholderLayer {
  return layer.type === 'qr-placeholder';
}

export function isCodeBoxLayer(layer: CanvasLayer): layer is CodeBoxLayer {
  return layer.type === 'code-box';
}

export function isPhoneBoxLayer(layer: CanvasLayer): layer is PhoneBoxLayer {
  return layer.type === 'phone-box';
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Default text style
 */
export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  textAlign: 'left',
  lineHeight: 1.5,
  letterSpacing: 0,
};

/**
 * Default code box style
 */
export const DEFAULT_CODE_BOX_STYLE: CodeBoxStyle = {
  variant: 'ticket-stub',
  backgroundColor: '#FEF3C7',
  textColor: '#92400E',
  borderColor: '#D97706',
  fontSize: 14,
};

/**
 * Default phone box style
 */
export const DEFAULT_PHONE_BOX_STYLE: PhoneBoxStyle = {
  variant: 'banner',
  backgroundColor: '#CC0000',
  textColor: '#FFFFFF',
  fontSize: 24,
  icon: true,
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a unique layer ID
 */
export function generateLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new text layer with defaults
 */
export function createTextLayer(partial: Partial<TextLayer> = {}): TextLayer {
  return {
    id: generateLayerId(),
    name: partial.name || 'Text',
    type: 'text',
    visible: true,
    locked: false,
    opacity: 100,
    position: partial.position || { x: 50, y: 50 },
    size: partial.size || { width: 200, height: 40 },
    rotation: 0,
    zIndex: 0,
    content: partial.content || 'New Text',
    containsTokens: partial.containsTokens || false,
    style: partial.style || { ...DEFAULT_TEXT_STYLE },
    ...partial,
  };
}

/**
 * Create a new QR placeholder layer
 */
export function createQRPlaceholderLayer(partial: Partial<QRPlaceholderLayer> = {}): QRPlaceholderLayer {
  return {
    id: generateLayerId(),
    name: 'QR Code',
    type: 'qr-placeholder',
    visible: true,
    locked: false,
    opacity: 100,
    position: partial.position || { x: 10, y: 85 },
    size: partial.size || { width: 80, height: 80 },
    rotation: 0,
    zIndex: 0,
    placeholderStyle: partial.placeholderStyle || 'icon',
    label: partial.label || 'QR CODE',
    ...partial,
  };
}

/**
 * Create a new code box layer
 */
export function createCodeBoxLayer(partial: Partial<CodeBoxLayer> = {}): CodeBoxLayer {
  return {
    id: generateLayerId(),
    name: 'Unique Code',
    type: 'code-box',
    visible: true,
    locked: false,
    opacity: 100,
    position: partial.position || { x: 60, y: 90 },
    size: partial.size || { width: 200, height: 40 },
    rotation: 0,
    zIndex: 0,
    labelText: partial.labelText || 'YOUR CODE:',
    valueToken: partial.valueToken || '{{unique_code}}',
    style: partial.style || { ...DEFAULT_CODE_BOX_STYLE },
    ...partial,
  };
}

/**
 * Create a new phone box layer
 */
export function createPhoneBoxLayer(partial: Partial<PhoneBoxLayer> = {}): PhoneBoxLayer {
  return {
    id: generateLayerId(),
    name: 'Phone Number',
    type: 'phone-box',
    visible: true,
    locked: false,
    opacity: 100,
    position: partial.position || { x: 50, y: 85 },
    size: partial.size || { width: 250, height: 50 },
    rotation: 0,
    zIndex: 0,
    phoneNumber: partial.phoneNumber || '1-800-XXX-XXXX',
    style: partial.style || { ...DEFAULT_PHONE_BOX_STYLE },
    ...partial,
  };
}

/**
 * Create a background layer
 */
export function createBackgroundLayer(imageUrl: string, partial: Partial<BackgroundLayer> = {}): BackgroundLayer {
  return {
    id: generateLayerId(),
    name: 'Background',
    type: 'background',
    visible: true,
    locked: false,
    opacity: 100,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 }, // percentage
    rotation: 0,
    zIndex: 0,
    imageUrl,
    fit: 'cover',
    ...partial,
  };
}


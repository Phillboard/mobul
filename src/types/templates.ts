/**
 * Template & Design Type Definitions
 * 
 * Types for mail templates, canvas layers, and design system.
 */

import { Database } from "@/integrations/supabase/types";

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Template
 * Mail design template
 */
export type Template = Tables<'templates'>;

/**
 * Template Size
 * Physical dimensions of the template
 */
export type TemplateSize = '4x6' | '6x9' | '6x11' | 'letter' | 'trifold';

/**
 * Template with Relations
 * Template with commonly joined data
 */
export interface TemplateWithRelations extends Template {
  client?: Tables<'clients'>;
  campaigns?: Tables<'campaigns'>[];
}

/**
 * Canvas Data
 * Complete canvas configuration including layers and settings
 */
export interface CanvasData {
  version: string;
  canvasSize: {
    width: number;
    height: number;
  };
  backgroundColor?: string;
  backgroundImage?: string;
  layers: CanvasLayer[];
}

/**
 * Canvas Layer
 * Individual element on the canvas
 */
export type CanvasLayer = 
  | TextLayer 
  | ImageLayer 
  | ShapeLayer 
  | QRCodeLayer 
  | MergeFieldLayer;

/**
 * Base Layer Properties
 * Common properties for all layer types
 */
export interface BaseLayer {
  id: string;
  type: string;
  left: number;
  top: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  rotation?: number;
  opacity?: number;
}

/**
 * Text Layer
 * Text element with typography settings
 */
export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fill: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  width?: number;
}

/**
 * Image Layer
 * Raster image element
 */
export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  width?: number;
  height?: number;
  scaleX: number;
  scaleY: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

/**
 * Shape Layer
 * Vector shape element (rectangle, circle, etc.)
 */
export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'triangle' | 'polygon';
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

/**
 * QR Code Layer
 * Dynamic QR code element
 */
export interface QRCodeLayer extends BaseLayer {
  type: 'qr_code';
  data: string; // URL or merge field like {{purl}}
  size: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  foregroundColor?: string;
  backgroundColor?: string;
}

/**
 * Merge Field Layer
 * Personalized data placeholder (rendered as text)
 */
export interface MergeFieldLayer extends Omit<TextLayer, 'type'> {
  type: 'merge_field';
  fieldName: string; // e.g., "first_name", "company"
  fallbackText?: string;
}

/**
 * Template Dimensions Map
 * Standard sizes in pixels at 300 DPI
 */
export const TEMPLATE_DIMENSIONS: Record<TemplateSize, { width: number; height: number }> = {
  "4x6": { width: 1800, height: 1200 },
  "6x9": { width: 2700, height: 1800 },
  "6x11": { width: 3300, height: 1800 },
  letter: { width: 2550, height: 3300 },
  trifold: { width: 3300, height: 2550 },
};

/**
 * Available Merge Fields
 * Standard personalization fields
 */
export const MERGE_FIELDS = [
  { value: '{{first_name}}', label: 'First Name' },
  { value: '{{last_name}}', label: 'Last Name' },
  { value: '{{full_name}}', label: 'Full Name' },
  { value: '{{email}}', label: 'Email' },
  { value: '{{phone}}', label: 'Phone' },
  { value: '{{company}}', label: 'Company' },
  { value: '{{address}}', label: 'Address' },
  { value: '{{city}}', label: 'City' },
  { value: '{{state}}', label: 'State' },
  { value: '{{postal_code}}', label: 'Postal Code' },
  { value: '{{purl}}', label: 'Personalized URL' },
  { value: '{{qr_code}}', label: 'QR Code' },
] as const;

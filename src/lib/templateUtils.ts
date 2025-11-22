/**
 * Template & Design Utility Functions
 * 
 * Helper functions for template building, canvas operations, and design validation.
 */

import { TemplateSize, CanvasData, CanvasLayer, TEMPLATE_DIMENSIONS } from "@/types/templates";

/**
 * Get template dimensions in pixels
 * 
 * @param size - Template size identifier
 * @returns Width and height in pixels
 */
export function getTemplateDimensions(size: TemplateSize): { width: number; height: number } {
  return TEMPLATE_DIMENSIONS[size];
}

/**
 * Validate canvas size is within acceptable bounds
 * 
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns True if valid dimensions
 */
export function validateCanvasSize(width: number, height: number): boolean {
  return (
    width >= 300 &&
    width <= 10000 &&
    height >= 300 &&
    height <= 10000
  );
}

/**
 * Calculate estimated file size of template JSON
 * 
 * @param data - Canvas data
 * @returns Estimated size in bytes
 */
export function calculateTemplateFileSize(data: CanvasData): number {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size;
}

/**
 * Format file size for display
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get layer type display name
 * 
 * @param type - Layer type identifier
 * @returns Human-readable type name
 */
export function getLayerTypeName(type: string): string {
  switch (type) {
    case 'text':
      return 'Text';
    case 'image':
      return 'Image';
    case 'shape':
      return 'Shape';
    case 'qr_code':
      return 'QR Code';
    case 'merge_field':
      return 'Merge Field';
    default:
      return type;
  }
}

/**
 * Generate unique layer ID
 * 
 * @returns Unique layer identifier
 */
export function generateLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if layer is off canvas
 * 
 * @param layer - Canvas layer
 * @param canvasSize - Canvas dimensions
 * @returns True if layer is outside canvas bounds
 */
export function isLayerOffCanvas(
  layer: CanvasLayer,
  canvasSize: { width: number; height: number }
): boolean {
  if (!layer.left || !layer.top) return false;
  
  return (
    layer.left < 0 ||
    layer.top < 0 ||
    layer.left > canvasSize.width ||
    layer.top > canvasSize.height
  );
}

/**
 * Center layer on canvas
 * 
 * @param layer - Canvas layer
 * @param canvasSize - Canvas dimensions
 * @returns Layer with centered position
 */
export function centerLayerOnCanvas<T extends CanvasLayer>(
  layer: T,
  canvasSize: { width: number; height: number }
): T {
  const layerWidth = 'width' in layer ? (layer.width || 100) : 100;
  const layerHeight = 'height' in layer ? (layer.height || 100) : 100;
  
  return {
    ...layer,
    left: (canvasSize.width - layerWidth) / 2,
    top: (canvasSize.height - layerHeight) / 2,
  };
}

/**
 * Duplicate layer with offset
 * 
 * @param layer - Layer to duplicate
 * @param offsetX - Horizontal offset
 * @param offsetY - Vertical offset
 * @returns New layer with unique ID and offset position
 */
export function duplicateLayer<T extends CanvasLayer>(
  layer: T,
  offsetX: number = 20,
  offsetY: number = 20
): T {
  return {
    ...layer,
    id: generateLayerId(),
    left: layer.left + offsetX,
    top: layer.top + offsetY,
  };
}

/**
 * Reorder layers by moving one layer
 * 
 * @param layers - Array of layers
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns Reordered array
 */
export function reorderLayers<T extends CanvasLayer>(
  layers: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const result = [...layers];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  // Update zIndex to match new order
  return result.map((layer, index) => ({
    ...layer,
    zIndex: index,
  }));
}

/**
 * Validate layer has required properties
 * 
 * @param layer - Layer to validate
 * @returns True if valid
 */
export function validateLayer(layer: CanvasLayer): boolean {
  if (!layer.id || !layer.type) return false;
  if (typeof layer.left !== 'number' || typeof layer.top !== 'number') return false;
  
  switch (layer.type) {
    case 'text':
      return !!layer.text && !!layer.fontSize && !!layer.fontFamily;
    case 'image':
      return !!layer.src;
    case 'shape':
      return !!layer.shape;
    case 'qr_code':
      return !!layer.data && !!layer.size;
    default:
      return true;
  }
}

/**
 * Get template size display name
 * 
 * @param size - Template size identifier
 * @returns Human-readable size label
 */
export function getTemplateSizeLabel(size: TemplateSize): string {
  switch (size) {
    case '4x6':
      return '4" × 6" Postcard';
    case '6x9':
      return '6" × 9" Postcard';
    case '6x11':
      return '6" × 11" Postcard';
    case 'letter':
      return '8.5" × 11" Letter';
    case 'trifold':
      return '11" × 8.5" Trifold';
    default:
      return size;
  }
}

/**
 * Convert inches to pixels at 300 DPI
 * 
 * @param inches - Size in inches
 * @returns Size in pixels
 */
export function inchesToPixels(inches: number): number {
  return Math.round(inches * 300);
}

/**
 * Convert pixels to inches at 300 DPI
 * 
 * @param pixels - Size in pixels
 * @returns Size in inches
 */
export function pixelsToInches(pixels: number): number {
  return pixels / 300;
}

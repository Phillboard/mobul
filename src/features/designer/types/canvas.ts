/**
 * Canvas Configuration Types
 * Defines types and configurations for the unified designer canvas system
 */

export type PostcardSize = '6x4' | '6x9' | '4x6' | '9x6' | '6x11';

export type Orientation = 'landscape' | 'portrait';

export type DesignerMode = 'mail-front' | 'mail-back' | 'landing-page';

export interface CanvasConfig {
  // Size selection
  size: PostcardSize | 'landing-page';
  
  // Physical dimensions (for print)
  physicalWidth: number;  // inches
  physicalHeight: number; // inches
  
  // Orientation
  orientation: Orientation;
  
  // Current side (for mail)
  side: 'front' | 'back' | null;
  
  // DPI for print quality
  dpi: number; // typically 300
  
  // Calculated pixel dimensions at DPI
  pixelWidth: number;  // physicalWidth * dpi
  pixelHeight: number; // physicalHeight * dpi
  
  // Aspect ratio (width / height)
  aspectRatio: number;
  
  // Preview dimensions (for canvas display)
  previewWidth: number;
  previewHeight: number;
}

interface SizeConfigDefinition {
  name: string;
  displayName: string;
  width: number;  // inches
  height: number; // inches
  defaultOrientation: Orientation;
  description: string;
}

export const SIZE_CONFIGS: Record<PostcardSize, SizeConfigDefinition> = {
  '6x4': {
    name: '6x4',
    displayName: '6" × 4" Standard',
    width: 6,
    height: 4,
    defaultOrientation: 'landscape',
    description: 'Most popular size for direct mail'
  },
  '6x9': {
    name: '6x9',
    displayName: '6" × 9" Jumbo',
    width: 6,
    height: 9,
    defaultOrientation: 'portrait',
    description: 'Larger format for impact'
  },
  '4x6': {
    name: '4x6',
    displayName: '4" × 6" Small',
    width: 4,
    height: 6,
    defaultOrientation: 'portrait',
    description: 'Compact postcard size'
  },
  '9x6': {
    name: '9x6',
    displayName: '9" × 6" Jumbo Landscape',
    width: 9,
    height: 6,
    defaultOrientation: 'landscape',
    description: 'Large landscape format'
  },
  '6x11': {
    name: '6x11',
    displayName: '6" × 11" Oversized',
    width: 6,
    height: 11,
    defaultOrientation: 'portrait',
    description: 'Maximum impact oversized'
  }
};

/**
 * Get size configuration for a specific postcard size
 */
export function getSizeConfig(size: PostcardSize): SizeConfigDefinition {
  return SIZE_CONFIGS[size];
}

/**
 * Calculate aspect ratio from width and height
 */
export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Check if a canvas config is in landscape orientation
 */
export function isLandscape(config: CanvasConfig): boolean {
  return config.physicalWidth > config.physicalHeight;
}

/**
 * Check if a canvas config is in portrait orientation
 */
export function isPortrait(config: CanvasConfig): boolean {
  return config.physicalHeight > config.physicalWidth;
}

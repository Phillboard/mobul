/**
 * Canvas Configuration Hook
 * Manages canvas state including size, orientation, and preview dimensions
 */

import { useState, useEffect, useRef, RefObject, CSSProperties } from 'react';
import type { PostcardSize, Orientation, DesignerMode, CanvasConfig } from '../types/canvas';
import { SIZE_CONFIGS, calculateAspectRatio } from '../types/canvas';

export interface UseCanvasConfigOptions {
  initialSize?: PostcardSize;
  initialOrientation?: Orientation;
  initialSide?: 'front' | 'back';
  mode?: DesignerMode;
  containerRef?: RefObject<HTMLElement>;
}

export interface CanvasConfigReturn {
  // Current configuration
  config: CanvasConfig;
  
  // Setters
  setSize: (size: PostcardSize) => void;
  setOrientation: (orientation: Orientation) => void;
  setSide: (side: 'front' | 'back') => void;
  
  // Toggle helpers
  toggleOrientation: () => void;
  
  // Computed values
  isLandscape: boolean;
  isPortrait: boolean;
  displayDimensions: string;
  
  // Preview sizing
  previewStyle: CSSProperties;
}

const DEFAULT_DPI = 300;
const DEFAULT_CONTAINER_WIDTH = 800;
const DEFAULT_CONTAINER_HEIGHT = 600;

export function useCanvasConfig(options: UseCanvasConfigOptions = {}): CanvasConfigReturn {
  const {
    initialSize = '6x4',
    initialOrientation = 'landscape',
    initialSide = 'front',
    containerRef
  } = options;

  const [size, setSize] = useState<PostcardSize>(initialSize);
  const [orientation, setOrientation] = useState<Orientation>(initialOrientation);
  const [side, setSide] = useState<'front' | 'back'>(initialSide);
  const [containerDimensions, setContainerDimensions] = useState({
    width: DEFAULT_CONTAINER_WIDTH,
    height: DEFAULT_CONTAINER_HEIGHT
  });

  // Calculate config based on current size and orientation
  const config = calculateConfig(size, orientation, side, containerDimensions);

  // Handle container resize
  useEffect(() => {
    if (!containerRef?.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerDimensions({
          width: clientWidth || DEFAULT_CONTAINER_WIDTH,
          height: clientHeight || DEFAULT_CONTAINER_HEIGHT
        });
      }
    };

    // Initial measurement
    updateDimensions();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Handle size changes - reset to default orientation
  const handleSetSize = (newSize: PostcardSize) => {
    setSize(newSize);
    const sizeConfig = SIZE_CONFIGS[newSize];
    setOrientation(sizeConfig.defaultOrientation);
  };

  // Toggle orientation
  const toggleOrientation = () => {
    setOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape');
  };

  // Computed values
  const isLandscape = config.physicalWidth > config.physicalHeight;
  const isPortrait = config.physicalHeight > config.physicalWidth;
  const displayDimensions = `${config.physicalWidth}" × ${config.physicalHeight}"`;

  // Preview style
  const previewStyle: CSSProperties = {
    width: `${config.previewWidth}px`,
    height: `${config.previewHeight}px`,
    aspectRatio: `${config.aspectRatio}`,
    maxWidth: '100%',
    maxHeight: '100%',
  };

  return {
    config,
    setSize: handleSetSize,
    setOrientation,
    setSide,
    toggleOrientation,
    isLandscape,
    isPortrait,
    displayDimensions,
    previewStyle,
  };
}

/**
 * Calculate complete canvas configuration
 */
function calculateConfig(
  size: PostcardSize,
  orientation: Orientation,
  side: 'front' | 'back',
  containerDimensions: { width: number; height: number }
): CanvasConfig {
  const sizeConfig = SIZE_CONFIGS[size];
  
  // Determine physical dimensions based on orientation
  let physicalWidth = sizeConfig.width;
  let physicalHeight = sizeConfig.height;
  
  // Swap if current orientation differs from natural dimensions
  const naturalOrientation = physicalWidth > physicalHeight ? 'landscape' : 'portrait';
  if (orientation !== naturalOrientation) {
    [physicalWidth, physicalHeight] = [physicalHeight, physicalWidth];
  }

  // Calculate pixel dimensions at DPI
  const pixelWidth = physicalWidth * DEFAULT_DPI;
  const pixelHeight = physicalHeight * DEFAULT_DPI;

  // Calculate aspect ratio
  const aspectRatio = calculateAspectRatio(physicalWidth, physicalHeight);

  // Calculate preview dimensions to fit container
  const { previewWidth, previewHeight } = calculatePreviewDimensions(
    physicalWidth,
    physicalHeight,
    aspectRatio,
    containerDimensions
  );

  return {
    size,
    physicalWidth,
    physicalHeight,
    orientation,
    side,
    dpi: DEFAULT_DPI,
    pixelWidth,
    pixelHeight,
    aspectRatio,
    previewWidth,
    previewHeight,
  };
}

/**
 * Calculate preview dimensions that fit within container while maintaining aspect ratio
 */
function calculatePreviewDimensions(
  physicalWidth: number,
  physicalHeight: number,
  aspectRatio: number,
  container: { width: number; height: number }
): { previewWidth: number; previewHeight: number } {
  const { width: containerWidth, height: containerHeight } = container;
  
  // Add some padding (10% on each side)
  const availableWidth = containerWidth * 0.8;
  const availableHeight = containerHeight * 0.8;

  // Try width-constrained first
  let previewWidth = availableWidth;
  let previewHeight = availableWidth / aspectRatio;

  // If height exceeds available space, use height-constrained instead
  if (previewHeight > availableHeight) {
    previewHeight = availableHeight;
    previewWidth = availableHeight * aspectRatio;
  }

  return {
    previewWidth: Math.round(previewWidth),
    previewHeight: Math.round(previewHeight),
  };
}

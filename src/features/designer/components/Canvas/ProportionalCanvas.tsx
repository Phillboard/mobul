/**
 * Proportional Canvas Component
 * Renders design preview at exact aspect ratio of final output
 */

import React, { ReactNode, MouseEvent } from 'react';
import { cn } from '@/shared/utils';
import type { CanvasConfig } from '../../types/canvas';

export interface ProportionalCanvasProps {
  config: CanvasConfig;
  children: ReactNode;
  className?: string;
  showGrid?: boolean;
  showSafeZone?: boolean;
  zoom?: number;
  onCanvasClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

export function ProportionalCanvas({
  config,
  children,
  className,
  showGrid = false,
  showSafeZone = false,
  zoom = 1,
  onCanvasClick,
}: ProportionalCanvasProps) {
  const previewStyle = {
    width: `${config.previewWidth * zoom}px`,
    height: `${config.previewHeight * zoom}px`,
    aspectRatio: `${config.aspectRatio}`,
  };

  return (
    <div className={cn("canvas-container flex items-center justify-center w-full h-full bg-gray-100 overflow-hidden", className)}>
      <div className="canvas-wrapper p-6">
        <div 
          className="canvas-preview relative bg-white border border-gray-300 overflow-hidden transition-all duration-300 ease-in-out shadow-lg"
          style={previewStyle}
          onClick={onCanvasClick}
        >
          {showGrid && <GridOverlay />}
          {showSafeZone && <SafeZoneOverlay config={config} />}
          
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Grid overlay for alignment help
 */
function GridOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <svg className="w-full h-full">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

/**
 * Safe zone overlay - shows print safe area (0.125" from edges)
 */
function SafeZoneOverlay({ config }: { config: CanvasConfig }) {
  const BLEED_INCHES = 0.125;
  const bleedPercent = (BLEED_INCHES / config.physicalWidth) * 100;
  
  return (
    <div 
      className="absolute border-2 border-dashed border-blue-400 opacity-50 pointer-events-none"
      style={{
        top: `${bleedPercent}%`,
        left: `${bleedPercent}%`,
        right: `${bleedPercent}%`,
        bottom: `${bleedPercent}%`,
      }}
    />
  );
}

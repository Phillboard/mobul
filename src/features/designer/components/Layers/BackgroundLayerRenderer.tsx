/**
 * BackgroundLayerRenderer Component
 * 
 * Renders the background layer (AI-generated or uploaded image).
 */

import React from 'react';
import type { BackgroundLayer } from '../../types/layers';

export interface BackgroundLayerRendererProps {
  layer: BackgroundLayer;
}

export function BackgroundLayerRenderer({ layer }: BackgroundLayerRendererProps) {
  const fitStyles = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
  };
  
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: layer.opacity / 100,
      }}
    >
      <img
        src={layer.imageUrl}
        alt="Background"
        className={`w-full h-full ${fitStyles[layer.fit]}`}
        style={{
          transform: `rotate(${layer.rotation}deg)`,
        }}
      />
    </div>
  );
}


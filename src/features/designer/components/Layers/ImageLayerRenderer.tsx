/**
 * ImageLayerRenderer Component
 * 
 * Renders uploaded image overlays (logos, graphics, etc.).
 */

import React from 'react';
import { cn } from '@shared/utils/cn';
import type { ImageLayer } from '../../types/layers';

export interface ImageLayerRendererProps {
  layer: ImageLayer;
  isSelected: boolean;
  onClick: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

const FIT_STYLES = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
};

export function ImageLayerRenderer({
  layer,
  isSelected,
  onClick,
  onDragEnd,
}: ImageLayerRendererProps) {
  return (
    <div
      className={cn(
        "absolute overflow-hidden cursor-move",
        isSelected && "ring-2 ring-blue-500 ring-offset-2"
      )}
      style={{
        left: `${layer.position.x}%`,
        top: `${layer.position.y}%`,
        width: layer.size.width,
        height: layer.size.height,
        transform: `rotate(${layer.rotation}deg)`,
        opacity: layer.opacity / 100,
        zIndex: layer.zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <img
        src={layer.imageUrl}
        alt={layer.alt || 'Layer image'}
        className={cn("w-full h-full", FIT_STYLES[layer.fit])}
      />
    </div>
  );
}


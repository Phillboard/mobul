/**
 * ShapeLayerRenderer Component
 * 
 * Renders geometric shapes (rectangles, circles, etc.).
 */

import React from 'react';
import { cn } from '@shared/utils/cn';
import type { ShapeLayer } from '../../types/layers';

export interface ShapeLayerRendererProps {
  layer: ShapeLayer;
  isSelected: boolean;
  onClick: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

export function ShapeLayerRenderer({
  layer,
  isSelected,
  onClick,
  onDragEnd,
}: ShapeLayerRendererProps) {
  const renderShape = () => {
    switch (layer.shapeType) {
      case 'rectangle':
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: layer.fill,
              border: `${layer.strokeWidth}px solid ${layer.stroke}`,
            }}
          />
        );
        
      case 'circle':
      case 'ellipse':
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: layer.fill,
              border: `${layer.strokeWidth}px solid ${layer.stroke}`,
            }}
          />
        );
        
      case 'line':
        return (
          <div
            className="w-full h-full"
            style={{
              borderBottom: `${layer.strokeWidth}px solid ${layer.stroke}`,
            }}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div
      className={cn(
        "absolute cursor-move",
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
      {renderShape()}
    </div>
  );
}


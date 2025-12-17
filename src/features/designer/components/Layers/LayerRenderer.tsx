/**
 * LayerRenderer Component
 * 
 * Main dispatcher that renders the appropriate component for each layer type.
 */

import React from 'react';
import type { CanvasLayer } from '../../types/layers';
import { BackgroundLayerRenderer } from './BackgroundLayerRenderer';
import { TextLayerRenderer } from './TextLayerRenderer';
import { ImageLayerRenderer } from './ImageLayerRenderer';
import { QRPlaceholderRenderer } from './QRPlaceholderRenderer';
import { CodeBoxRenderer } from './CodeBoxRenderer';
import { PhoneBoxRenderer } from './PhoneBoxRenderer';
import { ShapeLayerRenderer } from './ShapeLayerRenderer';

export interface LayerRendererProps {
  layer: CanvasLayer;
  isSelected: boolean;
  isPreviewMode: boolean; // Show token values or actual tokens
  onClick: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

export function LayerRenderer({
  layer,
  isSelected,
  isPreviewMode,
  onClick,
  onDragEnd,
}: LayerRendererProps) {
  // Don't render invisible layers
  if (!layer.visible) return null;
  
  switch (layer.type) {
    case 'background':
      return <BackgroundLayerRenderer layer={layer} />;
      
    case 'text':
      return (
        <TextLayerRenderer
          layer={layer}
          isSelected={isSelected}
          isPreviewMode={isPreviewMode}
          onClick={onClick}
          onDragEnd={onDragEnd}
        />
      );
      
    case 'image':
      return (
        <ImageLayerRenderer
          layer={layer}
          isSelected={isSelected}
          onClick={onClick}
          onDragEnd={onDragEnd}
        />
      );
      
    case 'qr-placeholder':
      return (
        <QRPlaceholderRenderer
          layer={layer}
          isSelected={isSelected}
          onClick={onClick}
          onDragEnd={onDragEnd}
        />
      );
      
    case 'code-box':
      return (
        <CodeBoxRenderer
          layer={layer}
          isSelected={isSelected}
          isPreviewMode={isPreviewMode}
          onClick={onClick}
          onDragEnd={onDragEnd}
        />
      );
      
    case 'phone-box':
      return (
        <PhoneBoxRenderer
          layer={layer}
          isSelected={isSelected}
          onClick={onClick}
          onDragEnd={onDragEnd}
        />
      );
      
    case 'shape':
      return (
        <ShapeLayerRenderer
          layer={layer}
          isSelected={isSelected}
          onClick={onClick}
          onDragEnd={onDragEnd}
        />
      );
      
    default:
      return null;
  }
}


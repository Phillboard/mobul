/**
 * NewDesignerCanvas Component
 * 
 * Main canvas component that renders all layers with selection and interaction support.
 * This is the new layer-based canvas system for the unified designer.
 */

import React, { useRef, useMemo } from 'react';
import { cn } from '@shared/utils/cn';
import type { CanvasLayer } from '../../types/layers';
import { LayerRenderer } from '../Layers';

export interface CanvasConfig {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  size: string; // '6x4', '6x9', etc.
}

export interface DesignerCanvasProps {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  canvasConfig: CanvasConfig;
  isPreviewMode: boolean;
  zoom: number;
  className?: string;
}

export function NewDesignerCanvas({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  canvasConfig,
  isPreviewMode,
  zoom,
  className,
}: DesignerCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Calculate canvas dimensions based on config and zoom
  const canvasStyle = useMemo(() => {
    const baseWidth = 800; // Base preview width in pixels
    const aspectRatio = canvasConfig.orientation === 'landscape' 
      ? 3 / 2  // 6x4 landscape
      : 2 / 3; // 4x6 portrait
    
    const width = baseWidth * zoom;
    const height = width / aspectRatio;
    
    return {
      width,
      height,
      aspectRatio,
    };
  }, [canvasConfig.orientation, zoom]);
  
  // Sort layers by zIndex (bottom to top)
  const sortedLayers = useMemo(() => 
    [...layers].sort((a, b) => a.zIndex - b.zIndex),
    [layers]
  );
  
  // Handle canvas click (deselect layers)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectLayer(null);
    }
  };
  
  // Handle layer drag (placeholder - needs full drag implementation)
  const handleLayerDrag = (layerId: string, newPosition: { x: number; y: number }) => {
    onUpdateLayer(layerId, { position: newPosition });
  };
  
  return (
    <div 
      className={cn(
        "canvas-container flex items-center justify-center bg-gray-200 p-8 rounded-lg",
        className
      )}
    >
      <div className="relative">
        <div
          ref={canvasRef}
          className="canvas relative bg-white shadow-2xl overflow-hidden"
          style={{
            width: canvasStyle.width,
            height: canvasStyle.height,
          }}
          onClick={handleCanvasClick}
        >
          {/* Render all layers */}
          {sortedLayers.map(layer => (
            <LayerRenderer
              key={layer.id}
              layer={layer}
              isSelected={layer.id === selectedLayerId}
              isPreviewMode={isPreviewMode}
              onClick={() => onSelectLayer(layer.id)}
              onDragEnd={(pos) => handleLayerDrag(layer.id, pos)}
            />
          ))}
          
          {/* Show empty state if no layers */}
          {layers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">Empty Canvas</p>
                <p className="text-sm">Generate a background or add elements to get started</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Canvas info overlay */}
        <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {canvasConfig.size} • {canvasConfig.orientation} • {Math.round(zoom * 100)}%
        </div>
        
        {/* Preview mode indicator */}
        {isPreviewMode && (
          <div className="absolute top-4 right-4 bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium">
            Preview Mode
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * DesignerCanvas Component
 * 
 * Interactive canvas for element manipulation using DOM-based rendering.
 * Supports selection, dragging, resizing, and keyboard shortcuts.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type { CanvasState, DesignElement } from '../types/designer';

export interface DesignerCanvasProps {
  /** Current canvas state */
  canvasState: CanvasState;
  /** Callback when element is selected */
  onElementSelect?: (ids: string[]) => void;
  /** Callback when element is updated (dragged, resized, etc.) */
  onElementUpdate?: (id: string, updates: Partial<DesignElement>) => void;
  /** Callback when element is created (via click/drag) */
  onElementCreate?: (element: Partial<DesignElement>) => void;
  /** Current tool mode */
  toolMode?: 'select' | 'text' | 'image' | 'shape' | 'pan';
  /** Enable snap to grid */
  snapToGrid?: boolean;
  /** Grid size in pixels */
  gridSize?: number;
  /** Zoom level (1 = 100%) */
  zoom?: number;
  /** Read-only mode (no editing) */
  readOnly?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Bleed area in inches (extends beyond canvas) */
  bleedInches?: number;
  /** Safe margin in inches (inset from edge) */
  safeMarginInches?: number;
  /** DPI for converting inches to pixels */
  dpi?: number;
  /** Show bleed area visualization */
  showBleed?: boolean;
  /** Show safe margin visualization */
  showSafeMargin?: boolean;
  /** Show postage area (for postcards) */
  showPostageArea?: boolean;
}

interface DragState {
  isDragging: boolean;
  elementId: string | null;
  startX: number;
  startY: number;
  elementStartX: number;
  elementStartY: number;
}

interface ResizeState {
  isResizing: boolean;
  elementId: string | null;
  handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;
  startX: number;
  startY: number;
  elementStartX: number;
  elementStartY: number;
  elementStartW: number;
  elementStartH: number;
}

/**
 * DesignerCanvas component - Interactive DOM-based canvas
 */
export function DesignerCanvas({
  canvasState,
  onElementSelect,
  onElementUpdate,
  onElementCreate,
  toolMode = 'select',
  snapToGrid = false,
  gridSize = 10,
  zoom = 1,
  readOnly = false,
  className = '',
  bleedInches = 0.125,
  safeMarginInches = 0.25,
  dpi = 300,
  showBleed = true,
  showSafeMargin = true,
  showPostageArea = false,
}: DesignerCanvasProps) {
  // Convert inches to pixels
  const bleedPx = bleedInches * dpi;
  const safeMarginPx = safeMarginInches * dpi;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    elementId: null,
    startX: 0,
    startY: 0,
    elementStartX: 0,
    elementStartY: 0,
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    elementId: null,
    handle: null,
    startX: 0,
    startY: 0,
    elementStartX: 0,
    elementStartY: 0,
    elementStartW: 0,
    elementStartH: 0,
  });

  const selectedIds = canvasState.selectedElementIds || [];

  // Snap value to grid if enabled
  const snapValue = useCallback((value: number): number => {
    if (!snapToGrid || gridSize <= 0) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // ============================================================================
  // Selection Handlers
  // ============================================================================

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Click on empty canvas area deselects all
    if (e.target === containerRef.current || 
        (e.target as HTMLElement).classList.contains('canvas-background')) {
      console.log('[DesignerCanvas] Canvas clicked - deselecting all');
      onElementSelect?.([]);
    }
  }, [onElementSelect]);

  const handleElementClick = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (readOnly) return;

    const multiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
    
    if (multiSelect) {
      // Toggle selection
      const newSelection = selectedIds.includes(elementId)
        ? selectedIds.filter(id => id !== elementId)
        : [...selectedIds, elementId];
      console.log('[DesignerCanvas] Multi-select element:', elementId, newSelection);
      onElementSelect?.(newSelection);
    } else {
      console.log('[DesignerCanvas] Select element:', elementId);
      onElementSelect?.([elementId]);
    }
  }, [selectedIds, onElementSelect, readOnly]);

  // ============================================================================
  // Drag Handlers
  // ============================================================================

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (readOnly || toolMode !== 'select') return;

    const element = canvasState.elements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    // Select if not already selected
    if (!selectedIds.includes(elementId)) {
      onElementSelect?.([elementId]);
    }

    console.log('[DesignerCanvas] Start drag:', elementId);
    setDragState({
      isDragging: true,
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      elementStartX: element.x,
      elementStartY: element.y,
    });
  }, [canvasState.elements, selectedIds, onElementSelect, readOnly, toolMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState.isDragging && dragState.elementId) {
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;
      
      const newX = snapValue(dragState.elementStartX + dx);
      const newY = snapValue(dragState.elementStartY + dy);
      
      onElementUpdate?.(dragState.elementId, { x: newX, y: newY });
    }

    if (resizeState.isResizing && resizeState.elementId && resizeState.handle) {
      const dx = (e.clientX - resizeState.startX) / zoom;
      const dy = (e.clientY - resizeState.startY) / zoom;
      
      let newX = resizeState.elementStartX;
      let newY = resizeState.elementStartY;
      let newW = resizeState.elementStartW;
      let newH = resizeState.elementStartH;

      // Handle different resize handles
      switch (resizeState.handle) {
        case 'se':
          newW = Math.max(20, resizeState.elementStartW + dx);
          newH = Math.max(20, resizeState.elementStartH + dy);
          break;
        case 'sw':
          newX = resizeState.elementStartX + dx;
          newW = Math.max(20, resizeState.elementStartW - dx);
          newH = Math.max(20, resizeState.elementStartH + dy);
          break;
        case 'ne':
          newY = resizeState.elementStartY + dy;
          newW = Math.max(20, resizeState.elementStartW + dx);
          newH = Math.max(20, resizeState.elementStartH - dy);
          break;
        case 'nw':
          newX = resizeState.elementStartX + dx;
          newY = resizeState.elementStartY + dy;
          newW = Math.max(20, resizeState.elementStartW - dx);
          newH = Math.max(20, resizeState.elementStartH - dy);
          break;
        case 'n':
          newY = resizeState.elementStartY + dy;
          newH = Math.max(20, resizeState.elementStartH - dy);
          break;
        case 's':
          newH = Math.max(20, resizeState.elementStartH + dy);
          break;
        case 'e':
          newW = Math.max(20, resizeState.elementStartW + dx);
          break;
        case 'w':
          newX = resizeState.elementStartX + dx;
          newW = Math.max(20, resizeState.elementStartW - dx);
          break;
      }

      onElementUpdate?.(resizeState.elementId, {
        x: snapValue(newX),
        y: snapValue(newY),
        width: snapValue(newW),
        height: snapValue(newH),
      });
    }
  }, [dragState, resizeState, zoom, snapValue, onElementUpdate]);

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      console.log('[DesignerCanvas] End drag');
    }
    if (resizeState.isResizing) {
      console.log('[DesignerCanvas] End resize');
    }
    setDragState(prev => ({ ...prev, isDragging: false, elementId: null }));
    setResizeState(prev => ({ ...prev, isResizing: false, elementId: null, handle: null }));
  }, [dragState.isDragging, resizeState.isResizing]);

  // ============================================================================
  // Resize Handle Handlers
  // ============================================================================

  const handleResizeStart = useCallback((
    e: React.MouseEvent, 
    elementId: string, 
    handle: ResizeState['handle']
  ) => {
    e.stopPropagation();
    if (readOnly) return;

    const element = canvasState.elements.find(el => el.id === elementId);
    if (!element || element.locked) return;

    console.log('[DesignerCanvas] Start resize:', elementId, handle);
    setResizeState({
      isResizing: true,
      elementId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      elementStartX: element.x,
      elementStartY: element.y,
      elementStartW: element.width,
      elementStartH: element.height,
    });
  }, [canvasState.elements, readOnly]);

  // ============================================================================
  // Keyboard Handlers
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      if (selectedIds.length === 0) return;
      
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const selectedElement = canvasState.elements.find(el => el.id === selectedIds[0]);
      if (!selectedElement || selectedElement.locked) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          console.log('[DesignerCanvas] Delete key pressed');
          // Parent should handle delete via onElementUpdate or separate callback
          break;
        case 'ArrowUp':
          e.preventDefault();
          onElementUpdate?.(selectedElement.id, { 
            y: selectedElement.y - (e.shiftKey ? 10 : 1) 
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          onElementUpdate?.(selectedElement.id, { 
            y: selectedElement.y + (e.shiftKey ? 10 : 1) 
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onElementUpdate?.(selectedElement.id, { 
            x: selectedElement.x - (e.shiftKey ? 10 : 1) 
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          onElementUpdate?.(selectedElement.id, { 
            x: selectedElement.x + (e.shiftKey ? 10 : 1) 
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, canvasState.elements, onElementUpdate, readOnly]);

  // ============================================================================
  // Drop Handler (for drag from element library)
  // ============================================================================

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    try {
      const elementData = e.dataTransfer.getData('application/json');
      if (elementData) {
        const element = JSON.parse(elementData);
        console.log('[DesignerCanvas] Element dropped at:', x, y, element);
        onElementCreate?.({
          ...element,
          x: snapValue(x - (element.width || 100) / 2),
          y: snapValue(y - (element.height || 50) / 2),
        });
      }
    } catch (err) {
      console.error('[DesignerCanvas] Drop parse error:', err);
    }
  }, [zoom, snapValue, onElementCreate, readOnly]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // ============================================================================
  // Render Element
  // ============================================================================

  const renderElement = (element: DesignElement) => {
    const isSelected = selectedIds.includes(element.id);
    const { id, type, x, y, width, height, rotation, locked, visible, styles } = element;

    if (!visible) return null;

    const elementStyle: React.CSSProperties = {
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      transform: rotation ? `rotate(${rotation}deg)` : undefined,
      cursor: locked ? 'not-allowed' : (dragState.isDragging && dragState.elementId === id) ? 'grabbing' : 'grab',
      userSelect: 'none',
      opacity: styles.opacity ?? 1,
    };

    const renderElementContent = () => {
      switch (type) {
        case 'text':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                fontFamily: styles.fontFamily || 'Arial',
                fontSize: styles.fontSize || 16,
                fontWeight: styles.fontWeight || 'normal',
                color: styles.color || '#000000',
                textAlign: styles.textAlign || 'left',
                lineHeight: styles.lineHeight ? `${styles.lineHeight}px` : 'normal',
                backgroundColor: styles.backgroundColor,
                borderRadius: styles.borderRadius,
                padding: '4px',
                overflow: 'hidden',
                wordWrap: 'break-word',
              }}
            >
              {'content' in element ? element.content : ''}
            </div>
          );

        case 'image':
          return (
            <img
              src={'src' in element ? element.src : ''}
              alt={'alt' in element ? element.alt : 'Image'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: ('fit' in element ? element.fit : 'cover') || 'cover',
                borderRadius: styles.borderRadius,
              }}
              draggable={false}
            />
          );

        case 'shape':
          const shapeType = 'shapeType' in element ? element.shapeType : 'rectangle';
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: styles.backgroundColor || '#E5E7EB',
                borderColor: styles.borderColor || '#000000',
                borderWidth: styles.borderWidth || 1,
                borderStyle: styles.borderStyle || 'solid',
                borderRadius: shapeType === 'circle' ? '50%' : (styles.borderRadius || 0),
              }}
            />
          );

        case 'qr-code':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'backgroundColor' in element ? element.backgroundColor : '#ffffff',
                border: '2px dashed #4F46E5',
                borderRadius: 4,
              }}
            >
              <div className="text-center text-xs text-gray-500">
                <div className="text-2xl mb-1">📱</div>
                QR Code
              </div>
            </div>
          );

        case 'template-token':
          const tokenContent = 'tokenContent' in element ? element.tokenContent : { token: '{{token}}', fallback: '' };
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                border: '2px dashed #4F46E5',
                borderRadius: 4,
                fontFamily: styles.fontFamily || 'monospace',
                fontSize: styles.fontSize || 14,
                color: styles.color || '#4F46E5',
              }}
            >
              {tokenContent.token}
            </div>
          );

        case 'button':
          return (
            <button
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: styles.backgroundColor || '#4F46E5',
                color: styles.color || '#ffffff',
                borderRadius: styles.borderRadius || 4,
                fontWeight: styles.fontWeight || 'bold',
                fontSize: styles.fontSize || 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {'text' in element ? element.text : 'Button'}
            </button>
          );

        default:
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#f0f0f0',
                border: '1px dashed #ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#666',
              }}
            >
              {type}
            </div>
          );
      }
    };

    return (
      <div
        key={id}
        data-element-id={id}
        style={elementStyle}
        onClick={(e) => handleElementClick(e, id)}
        onMouseDown={(e) => handleElementMouseDown(e, id)}
        className={`designer-element ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      >
        {renderElementContent()}
        
        {/* Selection handles */}
        {isSelected && !locked && !readOnly && (
          <>
            {/* Resize handles */}
            {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((handle) => (
              <div
                key={handle}
                className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm cursor-${
                  handle === 'nw' || handle === 'se' ? 'nwse-resize' :
                  handle === 'ne' || handle === 'sw' ? 'nesw-resize' :
                  handle === 'n' || handle === 's' ? 'ns-resize' : 'ew-resize'
                }`}
                style={{
                  ...(handle.includes('n') ? { top: -6 } : {}),
                  ...(handle.includes('s') ? { bottom: -6 } : {}),
                  ...(handle.includes('w') ? { left: -6 } : {}),
                  ...(handle.includes('e') ? { right: -6 } : {}),
                  ...(handle === 'n' || handle === 's' ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                  ...(handle === 'e' || handle === 'w' ? { top: '50%', transform: 'translateY(-50%)' } : {}),
                }}
                onMouseDown={(e) => handleResizeStart(e, id, handle as ResizeState['handle'])}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      ref={containerRef}
      id="designer-canvas"
      className={`relative overflow-hidden ${className}`}
      style={{
        width: canvasState.width * zoom,
        height: canvasState.height * zoom,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        backgroundColor: canvasState.backgroundColor,
        backgroundImage: canvasState.backgroundImage 
          ? `url(${canvasState.backgroundImage})` 
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Safe Margin (inner dotted green line) */}
      {showSafeMargin && safeMarginPx > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: safeMarginPx,
            left: safeMarginPx,
            right: safeMarginPx,
            bottom: safeMarginPx,
            border: '2px dashed #22C55E',
            borderRadius: 2,
          }}
        />
      )}

      {/* Bleed Line (outer - shows trim area) */}
      {showBleed && bleedPx > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: -bleedPx,
            left: -bleedPx,
            right: -bleedPx,
            bottom: -bleedPx,
            border: '2px dashed #9CA3AF',
            backgroundColor: 'transparent',
          }}
        />
      )}

      {/* Postage Area (for postcards - top right corner) */}
      {showPostageArea && (
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            top: safeMarginPx,
            right: safeMarginPx,
            width: 120,
            height: 80,
            border: '1px dashed #F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            fontSize: 10,
            color: '#F59E0B',
          }}
        >
          Postage Area
        </div>
      )}

      {/* Grid overlay */}
      {canvasState.settings?.gridVisible && gridSize > 0 && (
        <div
          className="canvas-background absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }}
        />
      )}

      {/* Empty state */}
      {canvasState.elements.length === 0 && !canvasState.backgroundImage && (
        <div className="canvas-background absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <p className="text-lg font-medium">Empty Canvas</p>
            <p className="text-sm">Add elements from the library or use AI to design</p>
          </div>
        </div>
      )}

      {/* Elements sorted by zIndex */}
      {[...canvasState.elements]
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        .map(renderElement)}
    </div>
  );
}

/**
 * Export canvas state
 */
export function exportCanvasState(canvasState: CanvasState): CanvasState {
  return { ...canvasState };
}

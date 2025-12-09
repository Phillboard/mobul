/**
 * DesignerCanvas Component
 * 
 * Main editing canvas using Fabric.js for element manipulation.
 * Handles rendering, selection, drag, resize, and rotation.
 */

import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
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
}

/**
 * DesignerCanvas component
 * 
 * Note: This is a foundational implementation.
 * Full Fabric.js integration would require additional work for:
 * - Custom controls and handles
 * - Advanced shapes and drawing tools
 * - Text editing in-place
 * - Image filters and effects
 * - Touch/mobile support
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
}: DesignerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);

  // ============================================================================
  // Initialize Fabric Canvas
  // ============================================================================

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric canvas
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: canvasState.width,
      height: canvasState.height,
      backgroundColor: canvasState.backgroundColor,
      selection: !readOnly, // Enable/disable multi-selection
      preserveObjectStacking: true, // Maintain z-index order
    });

    fabricCanvasRef.current = fabricCanvas;
    setIsReady(true);

    // Configure default object properties
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#4F46E5',
      cornerSize: 10,
      borderColor: '#4F46E5',
      borderScaleFactor: 2,
    });

    // Cleanup
    return () => {
      fabricCanvas.dispose();
      fabricCanvasRef.current = null;
      setIsReady(false);
    };
  }, [canvasState.width, canvasState.height]); // Re-init if canvas size changes

  // ============================================================================
  // Update Canvas Properties
  // ============================================================================

  // Update background color
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setBackgroundColor(
      canvasState.backgroundColor,
      () => fabricCanvasRef.current?.renderAll()
    );
  }, [canvasState.backgroundColor]);

  // Update background image
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    if (canvasState.backgroundImage) {
      fabric.Image.fromURL(canvasState.backgroundImage, (img) => {
        if (!fabricCanvasRef.current) return;
        
        // Scale image to fit canvas
        img.scaleToWidth(canvasState.width);
        img.scaleToHeight(canvasState.height);
        
        fabricCanvasRef.current.setBackgroundImage(
          img,
          () => fabricCanvasRef.current?.renderAll()
        );
      });
    } else {
      fabricCanvasRef.current.setBackgroundImage(
        null as any,
        () => fabricCanvasRef.current?.renderAll()
      );
    }
  }, [canvasState.backgroundImage, canvasState.width, canvasState.height]);

  // Update zoom level
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setZoom(zoom);
    fabricCanvasRef.current.renderAll();
  }, [zoom]);

  // ============================================================================
  // Render Grid
  // ============================================================================

  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasState.settings?.gridVisible) return;

    const canvas = fabricCanvasRef.current;
    const gridLines: fabric.Line[] = [];

    // Create vertical lines
    for (let i = 0; i < canvasState.width; i += gridSize) {
      gridLines.push(
        new fabric.Line([i, 0, i, canvasState.height], {
          stroke: '#e5e7eb',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        })
      );
    }

    // Create horizontal lines
    for (let i = 0; i < canvasState.height; i += gridSize) {
      gridLines.push(
        new fabric.Line([0, i, canvasState.width, i], {
          stroke: '#e5e7eb',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        })
      );
    }

    // Add to canvas
    gridLines.forEach(line => canvas.add(line));
    canvas.sendToBack(...gridLines);
    canvas.renderAll();

    // Cleanup
    return () => {
      gridLines.forEach(line => canvas.remove(line));
      canvas.renderAll();
    };
  }, [canvasState.settings?.gridVisible, gridSize, canvasState.width, canvasState.height]);

  // ============================================================================
  // Sync Canvas State with Fabric Objects
  // ============================================================================

  useEffect(() => {
    if (!fabricCanvasRef.current || !isReady) return;

    const canvas = fabricCanvasRef.current;

    // Clear existing objects (except background and grid)
    canvas.getObjects().forEach(obj => {
      if (!(obj as any).isBackgroundOrGrid) {
        canvas.remove(obj);
      }
    });

    // Add elements from state
    canvasState.elements.forEach(element => {
      let fabricObject: fabric.Object | null = null;

      // Create Fabric object based on element type
      switch (element.type) {
        case 'text':
          if ('content' in element) {
            fabricObject = new fabric.Text(element.content, {
              left: element.x,
              top: element.y,
              fontSize: element.styles.fontSize || 16,
              fill: element.styles.color || '#000000',
              fontFamily: element.styles.fontFamily || 'Arial',
              fontWeight: element.styles.fontWeight || 'normal',
            });
          }
          break;

        case 'image':
          if ('src' in element && element.src) {
            fabric.Image.fromURL(element.src, (img) => {
              img.set({
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                angle: element.rotation,
              });
              (img as any).elementId = element.id;
              canvas.add(img);
              canvas.renderAll();
            });
            return; // Skip adding below since it's async
          }
          break;

        case 'shape':
          if ('shapeType' in element) {
            if (element.shapeType === 'rectangle') {
              fabricObject = new fabric.Rect({
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                fill: element.styles.backgroundColor || 'transparent',
                stroke: element.styles.borderColor || '#000000',
                strokeWidth: element.styles.borderWidth || 1,
                rx: element.styles.borderRadius || 0,
                ry: element.styles.borderRadius || 0,
              });
            } else if (element.shapeType === 'circle') {
              fabricObject = new fabric.Circle({
                left: element.x,
                top: element.y,
                radius: element.width / 2,
                fill: element.styles.backgroundColor || 'transparent',
                stroke: element.styles.borderColor || '#000000',
                strokeWidth: element.styles.borderWidth || 1,
              });
            }
          }
          break;

        case 'template-token':
          // Render as text placeholder
          if ('tokenContent' in element) {
            const displayText = `[${element.tokenContent.token}]`;
            fabricObject = new fabric.Text(displayText, {
              left: element.x,
              top: element.y,
              fontSize: element.styles.fontSize || 16,
              fill: '#4F46E5', // Purple to indicate it's a token
              fontFamily: element.styles.fontFamily || 'Arial',
              backgroundColor: '#EEF2FF',
            });
          }
          break;
      }

      if (fabricObject) {
        fabricObject.set({
          angle: element.rotation,
          opacity: element.styles.opacity || 1,
          selectable: !element.locked && !readOnly,
          hasControls: !element.locked && !readOnly,
        });

        // Store element ID for reference
        (fabricObject as any).elementId = element.id;

        canvas.add(fabricObject);
      }
    });

    canvas.renderAll();
  }, [canvasState.elements, isReady, readOnly]);

  // ============================================================================
  // Handle Selection Changes
  // ============================================================================

  useEffect(() => {
    if (!fabricCanvasRef.current || !onElementSelect) return;

    const canvas = fabricCanvasRef.current;

    const handleSelection = () => {
      const activeObjects = canvas.getActiveObjects();
      const selectedIds = activeObjects
        .map(obj => (obj as any).elementId)
        .filter(Boolean);
      
      onElementSelect(selectedIds);
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => onElementSelect([]));

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
    };
  }, [onElementSelect]);

  // ============================================================================
  // Handle Object Modifications
  // ============================================================================

  useEffect(() => {
    if (!fabricCanvasRef.current || !onElementUpdate || readOnly) return;

    const canvas = fabricCanvasRef.current;

    const handleModified = (e: fabric.IEvent) => {
      const obj = e.target;
      if (!obj || !(obj as any).elementId) return;

      const elementId = (obj as any).elementId;
      const updates: Partial<DesignElement> = {
        x: obj.left || 0,
        y: obj.top || 0,
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
        rotation: obj.angle || 0,
      };

      onElementUpdate(elementId, updates);
    };

    canvas.on('object:modified', handleModified);
    canvas.on('object:moving', handleModified);
    canvas.on('object:scaling', handleModified);
    canvas.on('object:rotating', handleModified);

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('object:moving', handleModified);
      canvas.off('object:scaling', handleModified);
      canvas.off('object:rotating', handleModified);
    };
  }, [onElementUpdate, readOnly]);

  // ============================================================================
  // Snap to Grid
  // ============================================================================

  useEffect(() => {
    if (!fabricCanvasRef.current || !snapToGrid) return;

    const canvas = fabricCanvasRef.current;

    const handleSnap = (e: fabric.IEvent) => {
      const obj = e.target;
      if (!obj) return;

      obj.set({
        left: Math.round((obj.left || 0) / gridSize) * gridSize,
        top: Math.round((obj.top || 0) / gridSize) * gridSize,
      });

      canvas.renderAll();
    };

    canvas.on('object:moving', handleSnap);

    return () => {
      canvas.off('object:moving', handleSnap);
    };
  }, [snapToGrid, gridSize]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`designer-canvas-container ${className}`}>
      <canvas ref={canvasRef} />
      
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-gray-600">Initializing canvas...</p>
        </div>
      )}
    </div>
  );
}

/**
 * Export canvas state from Fabric.js
 * Utility function to extract current state from Fabric canvas
 */
export function exportCanvasState(fabricCanvas: fabric.Canvas): Partial<CanvasState> {
  const objects = fabricCanvas.getObjects();
  
  // Convert Fabric objects back to DesignElements
  // This is a simplified version - full implementation would need more detail
  const elements: any[] = objects
    .filter(obj => (obj as any).elementId)
    .map(obj => ({
      id: (obj as any).elementId,
      x: obj.left || 0,
      y: obj.top || 0,
      width: (obj.width || 0) * (obj.scaleX || 1),
      height: (obj.height || 0) * (obj.scaleY || 1),
      rotation: obj.angle || 0,
    }));

  return {
    elements,
  };
}


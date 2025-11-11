import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, FabricText, Rect, Circle, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

interface CanvasProps {
  data: {
    version: string;
    canvasSize: { width: number; height: number };
    layers: any[];
  };
  onChange: (data: any) => void;
  onSelectLayer: (layer: any) => void;
  onDoubleClickLayer?: (layer: any) => void;
  onContextMenu?: (layer: any, e: MouseEvent) => void;
  selectedLayer: any;
  activeTool?: string | null;
  onDrop?: (elementType: string, position: { x: number; y: number }, elementData?: any) => void;
  showGrid?: boolean;
  showRulers?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  onExportBlob?: (exportFn: () => Promise<Blob | null>) => void;
}

export function Canvas({ 
  data, 
  onChange, 
  onSelectLayer, 
  onDoubleClickLayer,
  onContextMenu,
  selectedLayer, 
  activeTool, 
  onDrop,
  showGrid = false,
  showRulers = false,
  snapToGrid = false,
  gridSize = 20,
  onExportBlob,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [editingText, setEditingText] = useState<{
    object: any;
    text: string;
    position: { left: number; top: number; width: number; height: number };
  } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!onDrop || !containerRef.current || !canvasRef.current) return;

    try {
      const elementData = JSON.parse(e.dataTransfer.getData("application/json"));
      
      // Get the canvas position relative to the container
      const rect = containerRef.current.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate position relative to canvas, accounting for zoom
      const x = (e.clientX - canvasRect.left) / zoom;
      const y = (e.clientY - canvasRect.top) / zoom;

      onDrop(elementData.type, { x, y }, elementData);
    } catch (error) {
      console.error("Failed to parse drop data:", error);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!onDrop || !activeTool || !canvasRef.current) return;
    
    // Only handle clicks when a tool is active (not in select mode)
    if (activeTool === "text" || activeTool === "elements" || activeTool === "fields") {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - canvasRect.left) / zoom;
      const y = (e.clientY - canvasRect.top) / zoom;

      // Add element based on active tool
      if (activeTool === "text") {
        onDrop("text", { x, y });
      }
    }
  };

  const snapToGridValue = (value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  useEffect(() => {
    if (!canvasRef.current || !data.canvasSize) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: data.canvasSize.width,
      height: data.canvasSize.height,
      backgroundColor: "#ffffff",
    });

    fabricCanvasRef.current = canvas;
    
    // Expose export function to parent
    if (onExportBlob) {
      onExportBlob(exportAsBlob);
    }

    // Load layers
    loadLayers(canvas, data.layers);

    // Handle selection
    canvas.on("selection:created", (e: any) => {
      const selected = e.selected?.[0];
      if (selected?.layerData) {
        onSelectLayer(selected.layerData);
      }
    });

    canvas.on("selection:updated", (e: any) => {
      const selected = e.selected?.[0];
      if (selected?.layerData) {
        onSelectLayer(selected.layerData);
      }
    });

    canvas.on("selection:cleared", () => {
      onSelectLayer(null);
    });

    // Handle object modifications
    canvas.on("object:modified", () => {
      syncCanvasToData(canvas);
    });

    // Handle object moving with snap to grid
    canvas.on("object:moving", (e: any) => {
      if (snapToGrid && e.target) {
        e.target.set({
          left: snapToGridValue(e.target.left || 0),
          top: snapToGridValue(e.target.top || 0),
        });
      }
    });

    // Handle double-click on any element to open properties
    canvas.on("mouse:dblclick", (e: any) => {
      const target = e.target;
      if (target?.layerData && onDoubleClickLayer) {
        onDoubleClickLayer(target.layerData);
      }
    });

    // Handle right-click context menu
    const handleContextMenu = (e: any) => {
      e.e.preventDefault();
      if (e.target?.layerData && onContextMenu) {
        onContextMenu(e.target.layerData, e.e);
      }
    };
    canvas.on("mouse:down", (e: any) => {
      if (e.button === 3) { // Right click
        handleContextMenu(e);
      }
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update layers when data changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !data.canvasSize) return;
    const canvas = fabricCanvasRef.current;
    canvas.clear();
    loadLayers(canvas, data.layers);
  }, [data.layers]);

  // Update grid when settings change
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.renderAll();
  }, [showGrid, gridSize]);

  const loadLayers = async (canvas: FabricCanvas, layers: any[]) => {
    for (const layer of layers) {
      let obj: any = null;

      if (layer.type === "text") {
        obj = new FabricText(layer.text || "Text", {
          left: layer.left || 100,
          top: layer.top || 100,
          fontSize: layer.fontSize || 24,
          fontFamily: layer.fontFamily || "Arial",
          fill: layer.fill || "#000000",
          fontWeight: layer.fontWeight || "normal",
          fontStyle: layer.fontStyle || "normal",
        });
      } else if (layer.type === "shape") {
        if (layer.shape === "rectangle") {
          obj = new Rect({
            left: layer.left || 100,
            top: layer.top || 100,
            width: layer.width || 200,
            height: layer.height || 100,
            fill: layer.fill || "#cccccc",
            stroke: layer.stroke || "#000000",
            strokeWidth: layer.strokeWidth || 1,
          });
        } else if (layer.shape === "circle") {
          obj = new Circle({
            left: layer.left || 100,
            top: layer.top || 100,
            radius: layer.radius || 50,
            fill: layer.fill || "#cccccc",
            stroke: layer.stroke || "#000000",
            strokeWidth: layer.strokeWidth || 1,
          });
        }
      } else if (layer.type === "image" && layer.src) {
        try {
          const img = await FabricImage.fromURL(layer.src);
          img.set({
            left: layer.left || 100,
            top: layer.top || 100,
            scaleX: layer.scaleX || 1,
            scaleY: layer.scaleY || 1,
          });
          obj = img;
        } catch (error) {
          console.error("Failed to load image:", error);
        }
      } else if (layer.type === "qr_code") {
        // Create placeholder for QR code
        const size = layer.size || 200;
        const qrRect = new Rect({
          left: layer.left || 100,
          top: layer.top || 100,
          width: size,
          height: size,
          fill: "#ffffff",
          stroke: "#000000",
          strokeWidth: 2,
          rx: 4,
          ry: 4,
        });
        
        // Add text label
        const label = new FabricText("QR Code\n(Generated at print)", {
          left: (layer.left || 100) + size / 2,
          top: (layer.top || 100) + size / 2,
          fontSize: 14,
          fontFamily: "Arial",
          fill: "#666666",
          textAlign: "center",
          originX: "center",
          originY: "center",
        });
        
        // Group them together
        obj = qrRect;
        canvas.add(qrRect);
        canvas.add(label);
      }

      if (obj) {
        obj.layerData = layer;
        canvas.add(obj);
      }
    }
    canvas.renderAll();
  };

  const syncCanvasToData = (canvas: FabricCanvas) => {
    const objects = canvas.getObjects();
    const updatedLayers = objects.map((obj: any) => {
      const baseData = obj.layerData || {};
      
      if (obj instanceof FabricText) {
        return {
          ...baseData,
          type: "text",
          text: obj.text,
          left: obj.left,
          top: obj.top,
          fontSize: obj.fontSize,
          fontFamily: obj.fontFamily,
          fill: obj.fill,
          fontWeight: obj.fontWeight,
          fontStyle: obj.fontStyle,
        };
      } else if (obj instanceof Rect) {
        return {
          ...baseData,
          type: "shape",
          shape: "rectangle",
          left: obj.left,
          top: obj.top,
          width: obj.width * (obj.scaleX || 1),
          height: obj.height * (obj.scaleY || 1),
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
        };
      } else if (obj instanceof Circle) {
        return {
          ...baseData,
          type: "shape",
          shape: "circle",
          left: obj.left,
          top: obj.top,
          radius: obj.radius * (obj.scaleX || 1),
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
        };
      } else if (obj instanceof FabricImage) {
        return {
          ...baseData,
          type: "image",
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
        };
      } else if (baseData.type === "qr_code") {
        return {
          ...baseData,
          type: "qr_code",
          left: obj.left,
          top: obj.top,
          size: baseData.size || 200,
        };
      }
      return baseData;
    });

    onChange({
      ...data,
      layers: updatedLayers,
    });
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.25, 2);
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom);
    }
  };

  const handleTextEditComplete = () => {
    if (!editingText || !fabricCanvasRef.current) return;

    editingText.object.set("text", editingText.text);
    fabricCanvasRef.current.renderAll();
    syncCanvasToData(fabricCanvasRef.current);
    setEditingText(null);
  };

  const handleTextEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextEditComplete();
    } else if (e.key === "Escape") {
      setEditingText(null);
    }
  };

  // Export canvas as blob for thumbnail generation
  const exportAsBlob = async (): Promise<Blob | null> => {
    if (!fabricCanvasRef.current) return null;
    
    try {
      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 0.3, // Scale down for thumbnail
      });
      
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Failed to export canvas:', error);
      return null;
    }
  };

  // Safety check - don't render if canvas size is not defined
  if (!data || !data.canvasSize) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-builder-canvas">
        <div className="text-muted-foreground">Loading canvas...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-builder-canvas">
      <div className="flex items-center justify-center gap-4 p-3 bg-builder-sidebar border-b border-border shadow-sm shrink-0">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="hover:bg-builder-tool-hover transition-all"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[60px] text-center bg-background px-3 py-1 rounded-md border border-border">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= 2}
          className="hover:bg-builder-tool-hover transition-all"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-8 flex items-center justify-center min-h-0">
        <div className="relative">
          {/* Horizontal Ruler */}
          {showRulers && (
            <div 
              className="absolute -top-6 left-0 h-6 bg-muted border-b border-border text-xs flex items-end"
              style={{ width: `${data.canvasSize.width * zoom}px` }}
            >
              {Array.from({ length: Math.floor(data.canvasSize.width / 100) + 1 }).map((_, i) => (
                <div key={i} className="relative" style={{ width: `${100 * zoom}px` }}>
                  <span className="absolute bottom-0 left-0 px-1 text-muted-foreground">
                    {i * 100}
                  </span>
                  <div className="absolute bottom-0 left-0 w-px h-2 bg-border" />
                </div>
              ))}
            </div>
          )}

          {/* Vertical Ruler */}
          {showRulers && (
            <div 
              className="absolute -left-6 top-0 w-6 bg-muted border-r border-border text-xs"
              style={{ height: `${data.canvasSize.height * zoom}px` }}
            >
              {Array.from({ length: Math.floor(data.canvasSize.height / 100) + 1 }).map((_, i) => (
                <div key={i} className="relative" style={{ height: `${100 * zoom}px` }}>
                  <span className="absolute top-0 left-0 px-1 text-muted-foreground writing-mode-vertical">
                    {i * 100}
                  </span>
                  <div className="absolute top-0 left-0 h-px w-2 bg-border" />
                </div>
              ))}
            </div>
          )}

          <div 
            ref={containerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleCanvasClick}
            className={`border-2 border-border shadow-2xl bg-white rounded-lg overflow-hidden transition-all duration-300 relative ${
              activeTool && activeTool !== "select" 
                ? "cursor-crosshair hover:shadow-3xl hover:border-primary" 
                : "hover:shadow-3xl"
            }`}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            <canvas ref={canvasRef} />
            
            {/* Grid Overlay */}
            {showGrid && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={data.canvasSize.width}
                height={data.canvasSize.height}
                style={{ opacity: 0.3 }}
              >
                <defs>
                  <pattern
                    id="grid"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-muted-foreground"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Inline text editor */}
      {editingText && (
        <input
          type="text"
          value={editingText.text}
          onChange={(e) =>
            setEditingText({ ...editingText, text: e.target.value })
          }
          onBlur={handleTextEditComplete}
          onKeyDown={handleTextEditKeyDown}
          autoFocus
          className="fixed z-50 bg-background text-foreground border-2 border-primary rounded px-2 py-1 outline-none shadow-lg"
          style={{
            left: `${editingText.position.left}px`,
            top: `${editingText.position.top}px`,
            minWidth: `${editingText.position.width}px`,
            fontSize: `${(editingText.object.fontSize || 24) * zoom}px`,
            fontFamily: editingText.object.fontFamily || "Arial",
            fontWeight: editingText.object.fontWeight || "normal",
            fontStyle: editingText.object.fontStyle || "normal",
          }}
        />
      )}
    </div>
  );
}

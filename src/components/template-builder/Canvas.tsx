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
  selectedLayer: any;
  activeTool?: string | null;
  onDrop?: (elementType: string, position: { x: number; y: number }, elementData?: any) => void;
}

export function Canvas({ data, onChange, onSelectLayer, selectedLayer, activeTool, onDrop }: CanvasProps) {
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

  useEffect(() => {
    if (!canvasRef.current || !data.canvasSize) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: data.canvasSize.width,
      height: data.canvasSize.height,
      backgroundColor: "#ffffff",
    });

    fabricCanvasRef.current = canvas;

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

    // Handle double-click on text elements
    canvas.on("mouse:dblclick", (e: any) => {
      const target = e.target;
      if (target instanceof FabricText) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        setEditingText({
          object: target,
          text: target.text || "",
          position: {
            left: canvasRect.left + (target.left || 0) * zoom,
            top: canvasRect.top + (target.top || 0) * zoom,
            width: (target.width || 100) * zoom,
            height: (target.height || 50) * zoom,
          },
        });
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

  return (
    <div className="flex-1 flex flex-col bg-builder-canvas">
      <div className="flex items-center justify-center gap-4 p-4 bg-builder-sidebar border-b border-border shadow-sm">
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

      <div className="flex-1 overflow-auto p-12 flex items-center justify-center">
        <div 
          ref={containerRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleCanvasClick}
          className={`border-2 border-border shadow-2xl bg-white rounded-lg overflow-hidden transition-all duration-300 ${
            activeTool && activeTool !== "select" 
              ? "cursor-crosshair hover:shadow-3xl hover:border-primary" 
              : "hover:shadow-3xl"
          }`}
        >
          <canvas ref={canvasRef} />
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

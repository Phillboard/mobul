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
}

export function Canvas({ data, onChange, onSelectLayer, selectedLayer }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);

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
        <div className="border-2 border-border shadow-2xl bg-white rounded-lg overflow-hidden hover:shadow-3xl transition-shadow duration-300">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

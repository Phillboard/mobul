import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VerticalToolbar } from "@/components/template-builder/v2/VerticalToolbar";
import { TopActionBar } from "@/components/template-builder/v2/TopActionBar";
import { CanvasWrapper } from "@/components/template-builder/v2/CanvasWrapper";
import { PreviewModal } from "@/components/template-builder/PreviewModal";
import { LayersPanel } from "@/components/template-builder/LayersPanel";
import { BackgroundPanel } from "@/components/template-builder/BackgroundPanel";
import { ElementsPanel } from "@/components/template-builder/ElementsPanel";
import { FieldsPanel } from "@/components/template-builder/FieldsPanel";
import { UploadPanel } from "@/components/template-builder/UploadPanel";
import { GridSettings } from "@/components/template-builder/GridSettings";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import { Type } from "lucide-react";
import { toast } from "sonner";

export default function TemplateBuilderV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [zoom, setZoom] = useState(1);

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Initialize history with empty canvas
  const history = useCanvasHistory<any>({
    version: "1.0",
    canvasSize: { width: 1800, height: 1200 },
    layers: [],
  });

  useEffect(() => {
    if (template?.json_layers) {
      history.reset(template.json_layers);
    } else if (template) {
      const sizeMap: Record<string, { width: number; height: number }> = {
        "4x6": { width: 1800, height: 1200 },
        "6x9": { width: 2700, height: 1800 },
        "6x11": { width: 3300, height: 1800 },
        letter: { width: 2550, height: 3300 },
        trifold: { width: 3300, height: 2550 },
      };
      const size = sizeMap[template.size] || sizeMap["4x6"];
      history.reset({
        version: "1.0",
        canvasSize: size,
        layers: [],
      });
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("templates")
        .update({ json_layers: data, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["template", id] });
      toast.success("Template saved");
    },
    onError: (error: any) => {
      toast.error("Failed to save template: " + error.message);
    },
  });

  const handleSave = async () => {
    if (!history.state) return;
    setIsSaving(true);
    await saveMutation.mutateAsync(history.state);
    setIsSaving(false);
  };

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!history.state || !id) return;
    
    const timer = setTimeout(() => {
      handleSave();
    }, 5000);

    return () => clearTimeout(timer);
  }, [history.state]);

  const addLayer = (layer: any) => {
    if (!history.state) return;
    const newLayer = {
      ...layer,
      id: `layer-${Date.now()}`,
      zIndex: history.state.layers.length,
      visible: true,
      locked: false,
    };
    history.set({
      ...history.state,
      layers: [...history.state.layers, newLayer],
    });
  };

  const handleAddText = () => {
    addLayer({
      type: "text",
      text: "New Text",
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#000000",
      left: 100,
      top: 100,
      fontWeight: "normal",
    });
  };

  const handleAddShape = (shape: "rectangle" | "circle") => {
    if (shape === "rectangle") {
      addLayer({
        type: "shape",
        shape: "rectangle",
        width: 200,
        height: 100,
        fill: "#cccccc",
        stroke: "#000000",
        strokeWidth: 1,
        left: 100,
        top: 100,
      });
    } else {
      addLayer({
        type: "shape",
        shape: "circle",
        radius: 50,
        fill: "#cccccc",
        stroke: "#000000",
        strokeWidth: 1,
        left: 100,
        top: 100,
      });
    }
  };

  const handleAddQRCode = () => {
    addLayer({
      type: "qr_code",
      data: "{{purl}}",
      size: 200,
      left: 100,
      top: 100,
    });
  };

  const handleAddField = (field: string) => {
    if (field === "{{qr_code}}") {
      handleAddQRCode();
    } else {
      addLayer({
        type: "text",
        text: field,
        fontSize: 24,
        fontFamily: "Arial",
        fill: "#000000",
        left: 100,
        top: 100,
        fontWeight: "normal",
      });
    }
  };

  const handleCanvasDrop = (elementType: string, position: { x: number; y: number }, elementData?: any) => {
    const { x, y } = position;

    if (elementType === "text") {
      addLayer({
        type: "text",
        text: "New Text",
        fontSize: 24,
        fontFamily: "Arial",
        fill: "#000000",
        left: x - 50,
        top: y - 12,
        fontWeight: "normal",
      });
    } else if (elementType === "rectangle") {
      addLayer({
        type: "shape",
        shape: "rectangle",
        width: 200,
        height: 100,
        fill: "#cccccc",
        stroke: "#000000",
        strokeWidth: 1,
        left: x - 100,
        top: y - 50,
      });
    } else if (elementType === "circle") {
      addLayer({
        type: "shape",
        shape: "circle",
        radius: 50,
        fill: "#cccccc",
        stroke: "#000000",
        strokeWidth: 1,
        left: x - 50,
        top: y - 50,
      });
    } else if (elementType === "qr") {
      addLayer({
        type: "qr_code",
        data: "{{purl}}",
        size: 200,
        left: x - 100,
        top: y - 100,
      });
    } else if (elementType === "field" && elementData?.value) {
      if (elementData.value === "{{qr_code}}") {
        addLayer({
          type: "qr_code",
          data: "{{purl}}",
          size: 200,
          left: x - 100,
          top: y - 100,
        });
      } else {
        addLayer({
          type: "text",
          text: elementData.value,
          fontSize: 24,
          fontFamily: "Arial",
          fill: "#000000",
          left: x - 50,
          top: y - 12,
          fontWeight: "normal",
        });
      }
    }

    toast.success("Element added to canvas");
  };

  const handleImageAdd = (url: string) => {
    addLayer({
      type: "image",
      src: url,
      left: 100,
      top: 100,
      scaleX: 1,
      scaleY: 1,
    });
  };

  const handleBackgroundChange = (color: string) => {
    if (!history.state) return;
    history.set({
      ...history.state,
      backgroundColor: color,
    });
  };

  const handleBackgroundImageChange = (url: string) => {
    addLayer({
      type: "image",
      src: url,
      left: 0,
      top: 0,
      scaleX: 1,
      scaleY: 1,
    });
  };

  const handleToggleVisibility = (layerId: string) => {
    if (!history.state) return;
    history.set({
      ...history.state,
      layers: history.state.layers.map((l: any) =>
        l.id === layerId ? { ...l, visible: l.visible !== false ? false : true } : l
      ),
    });
  };

  const handleToggleLock = (layerId: string) => {
    if (!history.state) return;
    history.set({
      ...history.state,
      layers: history.state.layers.map((l: any) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      ),
    });
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!history.state) return;
    history.set({
      ...history.state,
      layers: history.state.layers.filter((l: any) => l.id !== layerId),
    });
    if (selectedLayer?.id === layerId) {
      setSelectedLayer(null);
    }
  };

  const handleDuplicateLayer = (layerId: string) => {
    if (!history.state) return;
    const layer = history.state.layers.find((l: any) => l.id === layerId);
    if (layer) {
      const newLayer = {
        ...layer,
        id: `layer-${Date.now()}`,
        left: (layer.left || 0) + 20,
        top: (layer.top || 0) + 20,
      };
      history.set({
        ...history.state,
        layers: [...history.state.layers, newLayer],
      });
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div>Loading template...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div>Template not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopActionBar
        templateName={template.name}
        onBack={() => navigate("/templates")}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSave={handleSave}
        onPreview={() => setPreviewOpen(true)}
        isSaving={isSaving}
        lastSaved={lastSaved}
        hasSelection={!!selectedLayer}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <VerticalToolbar
          activeTool={activeTool}
          onToolSelect={(tool) => {
            setActiveTool(activeTool === tool ? null : tool);
          }}
        />

        {/* Tool Panels */}
        {activeTool === "text" && (
          <div className="w-64 border-r border-border bg-background">
            <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
              <h3 className="font-semibold flex items-center gap-2">
                <Type className="h-5 w-5 text-primary" />
                Text Tool
              </h3>
              <p className="text-xs text-muted-foreground mt-2">
                Click anywhere on the canvas to add text
              </p>
            </div>
            <div className="p-4">
              <button
                onClick={handleAddText}
                className="w-full h-20 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all hover:scale-105"
              >
                <Type className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Add Text</span>
              </button>
            </div>
          </div>
        )}

        {activeTool === "elements" && (
          <ElementsPanel
            onAddText={handleAddText}
            onAddShape={handleAddShape}
            onAddQRCode={handleAddQRCode}
            onDragStart={() => {}}
          />
        )}

        {activeTool === "images" && (
          <UploadPanel onImageAdd={handleImageAdd} />
        )}

        {activeTool === "qr" && (
          <div className="w-64 border-r border-border bg-background">
            <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
              <h3 className="font-semibold">QR Codes</h3>
              <p className="text-xs text-muted-foreground mt-2">
                Add personalized QR codes
              </p>
            </div>
            <div className="p-4">
              <button
                onClick={handleAddQRCode}
                className="w-full h-20 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all hover:scale-105"
              >
                <span className="text-sm font-medium">Add QR Code</span>
              </button>
            </div>
          </div>
        )}

        {activeTool === "background" && (
          <BackgroundPanel
            backgroundColor={history.state?.backgroundColor || "#FFFFFF"}
            onBackgroundChange={handleBackgroundChange}
            onBackgroundImageChange={handleBackgroundImageChange}
          />
        )}

        {activeTool === "layers" && (
          <LayersPanel
            layers={history.state?.layers || []}
            selectedLayerId={selectedLayer?.id || null}
            onSelectLayer={setSelectedLayer}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onReorderLayers={(layers) => {
              history.set({ ...history.state, layers });
            }}
          />
        )}

        {activeTool === "fields" && (
          <FieldsPanel 
            onAddField={handleAddField}
            onDragStart={() => {}}
          />
        )}

        {activeTool === "settings" && (
          <GridSettings
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
            showRulers={showRulers}
            onShowRulersChange={setShowRulers}
            snapToGrid={snapToGrid}
            onSnapToGridChange={setSnapToGrid}
            gridSize={gridSize}
            onGridSizeChange={setGridSize}
          />
        )}

        <CanvasWrapper
          data={history.state}
          onChange={(data) => history.set(data)}
          onSelectLayer={setSelectedLayer}
          selectedLayer={selectedLayer}
          activeTool={activeTool}
          onDrop={handleCanvasDrop}
          showGrid={showGrid}
          showRulers={showRulers}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
        />
      </div>

      {previewOpen && history.state && (
        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          template={template}
          canvasData={history.state}
        />
      )}
    </div>
  );
}

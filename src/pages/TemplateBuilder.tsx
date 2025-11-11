import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Canvas } from "@/components/template-builder/Canvas";
import { ToolSidebar } from "@/components/template-builder/ToolSidebar";
import { PropertiesPanel } from "@/components/template-builder/PropertiesPanel";
import { TopToolbar } from "@/components/template-builder/TopToolbar";
import { PreviewModal } from "@/components/template-builder/PreviewModal";
import { LayersPanel } from "@/components/template-builder/LayersPanel";
import { BackgroundPanel } from "@/components/template-builder/BackgroundPanel";
import { ElementsPanel } from "@/components/template-builder/ElementsPanel";
import { FieldsPanel } from "@/components/template-builder/FieldsPanel";
import { UploadPanel } from "@/components/template-builder/UploadPanel";
import { Type } from "lucide-react";
import { toast } from "sonner";

export default function TemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [canvasData, setCanvasData] = useState<any>(null);
  const [selectedLayer, setSelectedLayer] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

  useEffect(() => {
    if (template?.json_layers) {
      setCanvasData(template.json_layers);
    } else if (template) {
      // Initialize empty canvas
      const sizeMap: Record<string, { width: number; height: number }> = {
        "4x6": { width: 1800, height: 1200 },
        "6x9": { width: 2700, height: 1800 },
        "6x11": { width: 3300, height: 1800 },
        letter: { width: 2550, height: 3300 },
        trifold: { width: 3300, height: 2550 },
      };
      const size = sizeMap[template.size] || sizeMap["4x6"];
      setCanvasData({
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
    if (!canvasData) return;
    setIsSaving(true);
    await saveMutation.mutateAsync(canvasData);
    setIsSaving(false);
  };

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!canvasData || !id) return;
    
    const timer = setTimeout(() => {
      handleSave();
    }, 5000);

    return () => clearTimeout(timer);
  }, [canvasData]);

  const addLayer = (layer: any) => {
    if (!canvasData) return;
    const newLayer = {
      ...layer,
      id: `layer-${Date.now()}`,
      zIndex: canvasData.layers.length,
      visible: true,
      locked: false,
    };
    setCanvasData({
      ...canvasData,
      layers: [...canvasData.layers, newLayer],
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
        left: x - 50, // Center the element on cursor
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
    if (!canvasData) return;
    setCanvasData({
      ...canvasData,
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
    if (!canvasData) return;
    setCanvasData({
      ...canvasData,
      layers: canvasData.layers.map((l: any) =>
        l.id === layerId ? { ...l, visible: l.visible !== false ? false : true } : l
      ),
    });
  };

  const handleToggleLock = (layerId: string) => {
    if (!canvasData) return;
    setCanvasData({
      ...canvasData,
      layers: canvasData.layers.map((l: any) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      ),
    });
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!canvasData) return;
    setCanvasData({
      ...canvasData,
      layers: canvasData.layers.filter((l: any) => l.id !== layerId),
    });
    if (selectedLayer?.id === layerId) {
      setSelectedLayer(null);
    }
  };

  const handleDuplicateLayer = (layerId: string) => {
    if (!canvasData) return;
    const layer = canvasData.layers.find((l: any) => l.id === layerId);
    if (layer) {
      const newLayer = {
        ...layer,
        id: `layer-${Date.now()}`,
        left: (layer.left || 0) + 20,
        top: (layer.top || 0) + 20,
      };
      setCanvasData({
        ...canvasData,
        layers: [...canvasData.layers, newLayer],
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div>Loading template...</div>
        </div>
      </Layout>
    );
  }

  if (!template) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div>Template not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <TopToolbar
          templateName={template.name}
          onSave={handleSave}
          onPreview={() => setPreviewOpen(true)}
          onBack={() => navigate("/templates")}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <ToolSidebar
            activeTool={activeTool}
            onToolSelect={(tool) => {
              setActiveTool(activeTool === tool ? null : tool);
            }}
          />
          
          {activeTool === "text" && (
            <div className="w-64 border-r border-border bg-background">
              <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
                <h3 className="font-semibold flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Text Tool
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Click anywhere on the canvas to add text, or drag from below
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

          {activeTool === "upload" && (
            <UploadPanel onImageAdd={handleImageAdd} />
          )}

          {activeTool === "background" && (
            <BackgroundPanel
              backgroundColor={canvasData?.backgroundColor || "#FFFFFF"}
              onBackgroundChange={handleBackgroundChange}
              onBackgroundImageChange={handleBackgroundImageChange}
            />
          )}

          {activeTool === "layers" && (
            <LayersPanel
              layers={canvasData?.layers || []}
              selectedLayerId={selectedLayer?.id || null}
              onSelectLayer={setSelectedLayer}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onDeleteLayer={handleDeleteLayer}
              onDuplicateLayer={handleDuplicateLayer}
              onReorderLayers={(layers) => {
                setCanvasData({ ...canvasData, layers });
              }}
            />
          )}

          {activeTool === "fields" && (
            <FieldsPanel 
              onAddField={handleAddField}
              onDragStart={() => {}}
            />
          )}
          
          <div className="flex-1 bg-muted/20 overflow-auto">
            {canvasData && (
              <Canvas
                data={canvasData}
                onChange={setCanvasData}
                onSelectLayer={setSelectedLayer}
                selectedLayer={selectedLayer}
                activeTool={activeTool}
                onDrop={handleCanvasDrop}
              />
            )}
          </div>
          
          {selectedLayer && (
            <PropertiesPanel
              layer={selectedLayer}
              onUpdate={(updates: any) => {
                if (!canvasData || !selectedLayer) return;
                setCanvasData({
                  ...canvasData,
                  layers: canvasData.layers.map((l: any) =>
                    l.id === selectedLayer.id ? { ...l, ...updates } : l
                  ),
                });
              }}
              onDelete={() => {
                if (!canvasData || !selectedLayer) return;
                setCanvasData({
                  ...canvasData,
                  layers: canvasData.layers.filter((l: any) => l.id !== selectedLayer.id),
                });
                setSelectedLayer(null);
              }}
              onClose={() => setSelectedLayer(null)}
            />
          )}
        </div>
      </div>

      <PreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={template}
        canvasData={canvasData}
      />
    </Layout>
  );
}

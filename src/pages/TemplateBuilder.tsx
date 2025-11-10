import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Canvas } from "@/components/template-builder/Canvas";
import { ToolSidebar } from "@/components/template-builder/ToolSidebar";
import { PropertiesPanel } from "@/components/template-builder/PropertiesPanel";
import { TopToolbar } from "@/components/template-builder/TopToolbar";
import { PreviewModal } from "@/components/template-builder/PreviewModal";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function TemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [canvasData, setCanvasData] = useState<any>(null);
  const [selectedLayer, setSelectedLayer] = useState<any>(null);
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
            onAddLayer={(layer: any) => {
              if (!canvasData) return;
              const newLayer = {
                ...layer,
                id: `layer-${Date.now()}`,
                zIndex: canvasData.layers.length,
              };
              setCanvasData({
                ...canvasData,
                layers: [...canvasData.layers, newLayer],
              });
            }}
          />
          
          <div className="flex-1 bg-muted/20 overflow-auto">
            {canvasData && (
              <Canvas
                data={canvasData}
                onChange={setCanvasData}
                onSelectLayer={setSelectedLayer}
                selectedLayer={selectedLayer}
              />
            )}
          </div>
          
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
          />
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

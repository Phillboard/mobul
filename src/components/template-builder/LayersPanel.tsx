import { Eye, EyeOff, Lock, Unlock, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Layer {
  id: string;
  type: string;
  text?: string;
  visible?: boolean;
  locked?: boolean;
  [key: string]: any;
}

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layer: Layer) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onReorderLayers: (layers: Layer[]) => void;
}

export function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onDuplicateLayer,
}: LayersPanelProps) {
  const getLayerLabel = (layer: Layer) => {
    if (layer.type === "text") return layer.text?.substring(0, 20) || "Text";
    if (layer.type === "image") return "Image";
    if (layer.type === "shape") return layer.shape === "rectangle" ? "Rectangle" : "Circle";
    if (layer.type === "qr_code") return "QR Code";
    return layer.type;
  };

  return (
    <div className="w-64 border-r border-border bg-builder-sidebar shadow-sm">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-bold text-base">Layers</h3>
        <p className="text-xs text-muted-foreground mt-1">Manage canvas layers</p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-3 space-y-2">
          {layers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No layers yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add elements to get started
              </p>
            </div>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg hover:bg-builder-tool-hover cursor-pointer group transition-all duration-200 border border-transparent",
                  selectedLayerId === layer.id && "bg-builder-tool-active/10 border-builder-tool-active shadow-sm"
                )}
                onClick={() => onSelectLayer(layer)}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", selectedLayerId === layer.id && "text-builder-tool-active")}>
                    {getLayerLabel(layer)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{layer.type}</p>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-builder-tool-active hover:text-white transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                  >
                    {layer.visible !== false ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-builder-tool-active hover:text-white transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock(layer.id);
                    }}
                  >
                    {layer.locked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-builder-tool-active hover:text-white transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive hover:text-white transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

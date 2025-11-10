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
    <div className="w-64 border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Layers</h3>
        <p className="text-xs text-muted-foreground">Manage canvas layers</p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2 space-y-1">
          {layers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No layers yet. Add elements to get started.
            </p>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer group",
                  selectedLayerId === layer.id && "bg-accent"
                )}
                onClick={() => onSelectLayer(layer)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getLayerLabel(layer)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{layer.type}</p>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                  >
                    {layer.visible !== false ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock(layer.id);
                    }}
                  >
                    {layer.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
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

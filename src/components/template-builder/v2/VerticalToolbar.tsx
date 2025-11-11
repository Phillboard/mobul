import {
  Type,
  Square,
  Image,
  Layers,
  Settings,
  FileText,
  QrCode,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerticalToolbarProps {
  activeTool: string | null;
  onToolSelect: (tool: string) => void;
}

const tools = [
  { id: "text", icon: Type, label: "Text" },
  { id: "elements", icon: Square, label: "Elements" },
  { id: "images", icon: Image, label: "Images" },
  { id: "qr", icon: QrCode, label: "QR Codes" },
  { id: "background", icon: Palette, label: "Background" },
  { id: "fields", icon: FileText, label: "Merge Fields" },
  { id: "layers", icon: Layers, label: "Layers" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function VerticalToolbar({ activeTool, onToolSelect }: VerticalToolbarProps) {
  return (
    <TooltipProvider>
      <div className="w-16 bg-builder-sidebar border-r border-border flex flex-col items-center py-4 gap-2 shrink-0">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  onClick={() => onToolSelect(tool.id)}
                  className={`w-12 h-12 transition-all ${
                    isActive
                      ? "bg-builder-tool-active text-white hover:bg-builder-tool-active/90"
                      : "hover:bg-builder-tool-hover"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

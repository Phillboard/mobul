import { Type, Image, Layers, Palette, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolSidebarProps {
  activeTool: string | null;
  onToolSelect: (tool: string) => void;
}

const tools = [
  { id: "text", icon: Type, label: "Text" },
  { id: "elements", icon: Package, label: "Elements" },
  { id: "upload", icon: Image, label: "Upload" },
  { id: "background", icon: Palette, label: "Background" },
  { id: "layers", icon: Layers, label: "Layers" },
  { id: "fields", icon: FileText, label: "Fields" },
];

export function ToolSidebar({ activeTool, onToolSelect }: ToolSidebarProps) {
  return (
    <div className="w-20 border-r border-border bg-background flex flex-col items-center py-4 gap-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        
        return (
          <Button
            key={tool.id}
            variant="ghost"
            size="icon"
            className={cn(
              "w-16 h-16 flex flex-col gap-1 hover:bg-accent relative",
              isActive && "bg-accent text-accent-foreground"
            )}
            onClick={() => onToolSelect(tool.id)}
            title={tool.label}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[10px] font-medium">{tool.label}</span>
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
            )}
          </Button>
        );
      })}
    </div>
  );
}

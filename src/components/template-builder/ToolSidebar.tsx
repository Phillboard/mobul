import { Type, Image, Layers, Palette, FileText, Package, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  { id: "grid", icon: Grid3x3, label: "Grid" },
];

export function ToolSidebar({ activeTool, onToolSelect }: ToolSidebarProps) {
  return (
    <TooltipProvider>
      <div className="w-20 border-r border-border bg-builder-sidebar flex flex-col items-center py-6 gap-3 shadow-sm">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          
          return (
            <Tooltip key={tool.id} delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-16 h-16 flex flex-col gap-1.5 hover:bg-builder-tool-hover transition-all duration-200 relative group",
                    isActive && "bg-builder-tool-active text-white shadow-lg scale-105"
                  )}
                  onClick={() => onToolSelect(tool.id)}
                >
                  <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                  <span className={cn("text-[9px] font-semibold", isActive ? "text-white" : "text-muted-foreground")}>
                    {tool.label}
                  </span>
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r shadow-lg" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                <p className="font-semibold">{tool.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tool.id === "text" && "Click canvas to add text"}
                  {tool.id === "elements" && "Drag shapes to canvas"}
                  {tool.id === "upload" && "Upload your images"}
                  {tool.id === "background" && "Set canvas background"}
                  {tool.id === "layers" && "Manage all layers"}
                  {tool.id === "fields" && "Add merge fields"}
                  {tool.id === "grid" && "Configure grid & guides"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

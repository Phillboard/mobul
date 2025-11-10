import { Type, Square, Circle, Minus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ElementsPanelProps {
  onAddText: () => void;
  onAddShape: (shape: "rectangle" | "circle") => void;
  onAddQRCode: () => void;
  onDragStart?: (elementType: string, elementData?: any) => void;
}

const elements = [
  { id: "text", icon: Type, label: "Text", action: "text" },
  { id: "rectangle", icon: Square, label: "Rectangle", action: "rectangle" },
  { id: "circle", icon: Circle, label: "Circle", action: "circle" },
  { id: "qr", icon: QrCode, label: "QR Code", action: "qr" },
];

export function ElementsPanel({ onAddText, onAddShape, onAddQRCode, onDragStart }: ElementsPanelProps) {
  const handleElementClick = (action: string) => {
    if (action === "text") {
      onAddText();
    } else if (action === "rectangle" || action === "circle") {
      onAddShape(action as "rectangle" | "circle");
    } else if (action === "qr") {
      onAddQRCode();
    }
  };

  const handleDragStart = (e: React.DragEvent, element: typeof elements[0]) => {
    e.dataTransfer.effectAllowed = "copy";
    const elementData = {
      type: element.action,
      label: element.label,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(elementData));
    if (onDragStart) {
      onDragStart(element.action);
    }
  };

  return (
    <div className="w-64 border-r border-border bg-builder-sidebar shadow-sm">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-bold text-base">Elements</h3>
        <p className="text-xs text-muted-foreground mt-1">Add elements to canvas</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {elements.map((element) => {
          const Icon = element.icon;
          return (
            <Button
              key={element.id}
              variant="outline"
              draggable
              onDragStart={(e) => handleDragStart(e, element)}
              className="h-24 flex flex-col gap-2 hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all duration-200 hover:scale-105 hover:shadow-lg group cursor-move"
              onClick={() => handleElementClick(element.action)}
            >
              <Icon className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">{element.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

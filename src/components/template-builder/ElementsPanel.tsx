import { Type, Square, Circle, Minus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ElementsPanelProps {
  onAddText: () => void;
  onAddShape: (shape: "rectangle" | "circle") => void;
  onAddQRCode: () => void;
}

const elements = [
  { id: "text", icon: Type, label: "Text", action: "text" },
  { id: "rectangle", icon: Square, label: "Rectangle", action: "rectangle" },
  { id: "circle", icon: Circle, label: "Circle", action: "circle" },
  { id: "qr", icon: QrCode, label: "QR Code", action: "qr" },
];

export function ElementsPanel({ onAddText, onAddShape, onAddQRCode }: ElementsPanelProps) {
  const handleElementClick = (action: string) => {
    if (action === "text") {
      onAddText();
    } else if (action === "rectangle" || action === "circle") {
      onAddShape(action as "rectangle" | "circle");
    } else if (action === "qr") {
      onAddQRCode();
    }
  };

  return (
    <div className="w-64 border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Elements</h3>
        <p className="text-xs text-muted-foreground">Add elements to canvas</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {elements.map((element) => {
          const Icon = element.icon;
          return (
            <Button
              key={element.id}
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:bg-accent hover:border-primary"
              onClick={() => handleElementClick(element.action)}
            >
              <Icon className="h-8 w-8" />
              <span className="text-sm font-medium">{element.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

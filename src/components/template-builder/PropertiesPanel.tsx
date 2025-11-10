import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, X } from "lucide-react";

interface PropertiesPanelProps {
  layer: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function PropertiesPanel({ layer, onUpdate, onDelete, onClose }: PropertiesPanelProps) {
  if (!layer) return null;

  return (
    <div className="w-80 border-l border-border bg-background overflow-y-auto animate-slide-in-right">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Properties</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="left" className="text-xs">X Position</Label>
            <Input
              id="left"
              type="number"
              value={layer.left || 0}
              onChange={(e) => onUpdate({ left: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="top" className="text-xs">Y Position</Label>
            <Input
              id="top"
              type="number"
              value={layer.top || 0}
              onChange={(e) => onUpdate({ top: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Text-specific properties */}
        {layer.type === "text" && (
          <>
            <div>
              <Label htmlFor="text" className="text-xs">Text Content</Label>
              <Input
                id="text"
                value={layer.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="fontSize" className="text-xs">Font Size</Label>
              <Input
                id="fontSize"
                type="number"
                value={layer.fontSize || 24}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="fontFamily" className="text-xs">Font Family</Label>
              <Select
                value={layer.fontFamily || "Arial"}
                onValueChange={(value) => onUpdate({ fontFamily: value })}
              >
                <SelectTrigger id="fontFamily">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fontWeight" className="text-xs">Font Weight</Label>
              <Select
                value={layer.fontWeight || "normal"}
                onValueChange={(value) => onUpdate({ fontWeight: value })}
              >
                <SelectTrigger id="fontWeight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fill" className="text-xs">Text Color</Label>
              <Input
                id="fill"
                type="color"
                value={layer.fill || "#000000"}
                onChange={(e) => onUpdate({ fill: e.target.value })}
              />
            </div>
          </>
        )}

        {/* Shape-specific properties */}
        {layer.type === "shape" && (
          <>
            {layer.shape === "rectangle" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="width" className="text-xs">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      value={layer.width || 100}
                      onChange={(e) => onUpdate({ width: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      value={layer.height || 100}
                      onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}

            {layer.shape === "circle" && (
              <div>
                <Label htmlFor="radius" className="text-xs">Radius</Label>
                <Input
                  id="radius"
                  type="number"
                  value={layer.radius || 50}
                  onChange={(e) => onUpdate({ radius: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="shapeFill" className="text-xs">Fill Color</Label>
              <Input
                id="shapeFill"
                type="color"
                value={layer.fill || "#cccccc"}
                onChange={(e) => onUpdate({ fill: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="stroke" className="text-xs">Stroke Color</Label>
              <Input
                id="stroke"
                type="color"
                value={layer.stroke || "#000000"}
                onChange={(e) => onUpdate({ stroke: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="strokeWidth" className="text-xs">Stroke Width</Label>
              <Input
                id="strokeWidth"
                type="number"
                value={layer.strokeWidth || 1}
                onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) })}
              />
            </div>
          </>
        )}

        {/* QR Code properties */}
        {layer.type === "qr_code" && (
          <div>
            <Label htmlFor="qrSize" className="text-xs">QR Code Size</Label>
            <Input
              id="qrSize"
              type="number"
              value={layer.size || 200}
              onChange={(e) => onUpdate({ size: parseInt(e.target.value) })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

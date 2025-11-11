import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Square, Circle as CircleIcon } from "lucide-react";

interface ShapeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ShapeConfig) => void;
  initialData?: ShapeConfig;
}

export interface ShapeConfig {
  shape: "rectangle" | "circle";
  width?: number;
  height?: number;
  radius?: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rx?: number;
  ry?: number;
}

export function ShapeDialog({ open, onOpenChange, onSave, initialData }: ShapeDialogProps) {
  const [config, setConfig] = useState<ShapeConfig>({
    shape: "rectangle",
    width: 200,
    height: 100,
    radius: 50,
    fill: "#cccccc",
    stroke: "#000000",
    strokeWidth: 1,
    rx: 0,
    ry: 0,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setConfig({ ...config, ...initialData });
    }
  }, [initialData]);

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.shape === "rectangle" ? (
              <Square className="h-5 w-5 text-primary" />
            ) : (
              <CircleIcon className="h-5 w-5 text-primary" />
            )}
            Shape Properties
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shape Type */}
          <div className="space-y-2">
            <Label htmlFor="shape">Shape Type</Label>
            <Select
              value={config.shape}
              onValueChange={(value: "rectangle" | "circle") => setConfig({ ...config, shape: value })}
            >
              <SelectTrigger id="shape">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4" />
                    Rectangle
                  </div>
                </SelectItem>
                <SelectItem value="circle">
                  <div className="flex items-center gap-2">
                    <CircleIcon className="h-4 w-4" />
                    Circle
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dimensions */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-sm">Dimensions</h4>
            
            {config.shape === "rectangle" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={config.width}
                    onChange={(e) => setConfig({ ...config, width: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={config.height}
                    onChange={(e) => setConfig({ ...config, height: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="radius">Radius (px)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={config.radius}
                  onChange={(e) => setConfig({ ...config, radius: parseInt(e.target.value) || 0 })}
                  min={1}
                />
              </div>
            )}

            {config.shape === "rectangle" && (
              <div className="space-y-2">
                <Label>Corner Radius: {config.rx || 0}px</Label>
                <Slider
                  value={[config.rx || 0]}
                  onValueChange={([value]) => setConfig({ ...config, rx: value, ry: value })}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Fill Color */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="fill">Fill Color</Label>
            <div className="flex gap-2">
              <Input
                id="fill"
                type="color"
                value={config.fill}
                onChange={(e) => setConfig({ ...config, fill: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={config.fill}
                onChange={(e) => setConfig({ ...config, fill: e.target.value })}
                placeholder="#cccccc"
              />
            </div>
          </div>

          {/* Stroke */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-sm">Stroke</h4>
            
            <div className="space-y-2">
              <Label htmlFor="stroke">Stroke Color</Label>
              <div className="flex gap-2">
                <Input
                  id="stroke"
                  type="color"
                  value={config.stroke}
                  onChange={(e) => setConfig({ ...config, stroke: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={config.stroke}
                  onChange={(e) => setConfig({ ...config, stroke: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stroke Width: {config.strokeWidth}px</Label>
              <Slider
                value={[config.strokeWidth]}
                onValueChange={([value]) => setConfig({ ...config, strokeWidth: value })}
                min={0}
                max={20}
                step={1}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2 border-t pt-4">
            <Label>Preview</Label>
            <div className="p-8 bg-muted rounded-md flex items-center justify-center">
              {config.shape === "rectangle" ? (
                <div
                  style={{
                    width: `${Math.min(config.width || 0, 200)}px`,
                    height: `${Math.min(config.height || 0, 150)}px`,
                    backgroundColor: config.fill,
                    border: `${config.strokeWidth}px solid ${config.stroke}`,
                    borderRadius: `${config.rx || 0}px`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: `${Math.min(config.radius || 0, 100) * 2}px`,
                    height: `${Math.min(config.radius || 0, 100) * 2}px`,
                    backgroundColor: config.fill,
                    border: `${config.strokeWidth}px solid ${config.stroke}`,
                    borderRadius: "50%",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {initialData ? "Update" : "Add"} Shape
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

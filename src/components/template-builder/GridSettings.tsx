import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Grid3x3, Ruler } from "lucide-react";

interface GridSettingsProps {
  showGrid: boolean;
  onShowGridChange: (show: boolean) => void;
  showRulers: boolean;
  onShowRulersChange: (show: boolean) => void;
  snapToGrid: boolean;
  onSnapToGridChange: (snap: boolean) => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
}

export function GridSettings({
  showGrid,
  onShowGridChange,
  showRulers,
  onShowRulersChange,
  snapToGrid,
  onSnapToGridChange,
  gridSize,
  onGridSizeChange,
}: GridSettingsProps) {
  return (
    <div className="w-64 border-r border-border bg-background overflow-y-auto">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <h3 className="font-semibold flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-primary" />
          Grid & Guides
        </h3>
        <p className="text-xs text-muted-foreground mt-2">
          Configure alignment helpers
        </p>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-grid" className="text-sm font-medium">
              Show Grid
            </Label>
            <Switch
              id="show-grid"
              checked={showGrid}
              onCheckedChange={onShowGridChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Display grid lines on canvas
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="snap-grid" className="text-sm font-medium">
              Snap to Grid
            </Label>
            <Switch
              id="snap-grid"
              checked={snapToGrid}
              onCheckedChange={onSnapToGridChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically align elements to grid
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="grid-size" className="text-sm font-medium">
            Grid Size: {gridSize}px
          </Label>
          <Slider
            id="grid-size"
            min={10}
            max={100}
            step={5}
            value={[gridSize]}
            onValueChange={([value]) => onGridSizeChange(value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Adjust grid spacing
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-rulers" className="text-sm font-medium flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Show Rulers
            </Label>
            <Switch
              id="show-rulers"
              checked={showRulers}
              onCheckedChange={onShowRulersChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Display measurement rulers
          </p>
        </div>
      </div>
    </div>
  );
}

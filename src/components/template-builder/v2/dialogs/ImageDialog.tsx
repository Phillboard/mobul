import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Upload } from "lucide-react";

interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ImageConfig) => void;
  initialData?: ImageConfig;
}

export interface ImageConfig {
  src: string;
  fitMode: "fit" | "fill" | "stretch";
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

export function ImageDialog({ open, onOpenChange, onSave, initialData }: ImageDialogProps) {
  const [config, setConfig] = useState<ImageConfig>({
    src: "",
    fitMode: "fit",
    opacity: 100,
    brightness: 100,
    contrast: 100,
    saturation: 100,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setConfig({ ...config, src: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Image Properties
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Upload/Replace */}
          <div className="space-y-2">
            <Label htmlFor="imageUpload">Image</Label>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById("imageUpload")?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {config.src ? "Replace Image" : "Upload Image"}
              </Button>
              <input
                id="imageUpload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {config.src && (
            <>
              {/* Fit Mode */}
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="fitMode">Fit Mode</Label>
                <Select
                  value={config.fitMode}
                  onValueChange={(value: "fit" | "fill" | "stretch") =>
                    setConfig({ ...config, fitMode: value })
                  }
                >
                  <SelectTrigger id="fitMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit">Fit (maintain aspect ratio)</SelectItem>
                    <SelectItem value="fill">Fill (crop to fit)</SelectItem>
                    <SelectItem value="stretch">Stretch (ignore aspect ratio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Opacity */}
              <div className="space-y-2 border-t pt-4">
                <Label>Opacity: {config.opacity}%</Label>
                <Slider
                  value={[config.opacity]}
                  onValueChange={([value]) => setConfig({ ...config, opacity: value })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              {/* Filters */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm">Filters</h4>

                <div className="space-y-2">
                  <Label>Brightness: {config.brightness}%</Label>
                  <Slider
                    value={[config.brightness]}
                    onValueChange={([value]) => setConfig({ ...config, brightness: value })}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contrast: {config.contrast}%</Label>
                  <Slider
                    value={[config.contrast]}
                    onValueChange={([value]) => setConfig({ ...config, contrast: value })}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Saturation: {config.saturation}%</Label>
                  <Slider
                    value={[config.saturation]}
                    onValueChange={([value]) => setConfig({ ...config, saturation: value })}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfig({
                      ...config,
                      brightness: 100,
                      contrast: 100,
                      saturation: 100,
                      opacity: 100,
                    })
                  }
                >
                  Reset Filters
                </Button>
              </div>

              {/* Preview */}
              <div className="space-y-2 border-t pt-4">
                <Label>Preview</Label>
                <div className="p-4 bg-muted rounded-md flex items-center justify-center">
                  <img
                    src={config.src}
                    alt="Preview"
                    className="max-w-full max-h-64 object-contain"
                    style={{
                      opacity: config.opacity / 100,
                      filter: `brightness(${config.brightness}%) contrast(${config.contrast}%) saturate(${config.saturation}%)`,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!config.src}>
            {initialData ? "Update" : "Add"} Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";

interface TextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: TextConfig) => void;
  initialData?: TextConfig;
}

export interface TextConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  fill: string;
  textAlign: string;
  letterSpacing: number;
  lineHeight: number;
}

const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
];

export function TextDialog({ open, onOpenChange, onSave, initialData }: TextDialogProps) {
  const [config, setConfig] = useState<TextConfig>({
    text: "New Text",
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: "normal",
    fontStyle: "normal",
    fill: "#000000",
    textAlign: "left",
    letterSpacing: 0,
    lineHeight: 1.2,
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

  const insertMergeField = (field: string) => {
    setConfig({ ...config, text: config.text + field });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            Text Properties
          </DialogTitle>
          <DialogDescription>
            Customize text content, fonts, colors, and formatting options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Text Content */}
          <div className="space-y-2">
            <Label htmlFor="text">Text Content</Label>
            <Textarea
              id="text"
              placeholder="Enter your text..."
              value={config.text}
              onChange={(e) => setConfig({ ...config, text: e.target.value })}
              rows={4}
              className="font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-muted-foreground w-full">Insert merge fields:</p>
              {[
                "{{first_name}}",
                "{{last_name}}",
                "{{company}}",
                "{{address1}}",
                "{{city}}",
                "{{state}}",
                "{{zip}}",
              ].map((field) => (
                <Button
                  key={field}
                  variant="outline"
                  size="sm"
                  onClick={() => insertMergeField(field)}
                  className="text-xs"
                >
                  {field}
                </Button>
              ))}
            </div>
          </div>

          {/* Font Settings */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-sm">Font Settings</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select
                  value={config.fontFamily}
                  onValueChange={(value) => setConfig({ ...config, fontFamily: value })}
                >
                  <SelectTrigger id="fontFamily">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font Size: {config.fontSize}px</Label>
                <Slider
                  value={[config.fontSize]}
                  onValueChange={([value]) => setConfig({ ...config, fontSize: value })}
                  min={8}
                  max={120}
                  step={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Font Style</Label>
              <div className="flex gap-2">
                <ToggleGroup
                  type="single"
                  value={config.fontWeight}
                  onValueChange={(value) => value && setConfig({ ...config, fontWeight: value })}
                >
                  <ToggleGroupItem value="normal" aria-label="Normal weight">
                    Normal
                  </ToggleGroupItem>
                  <ToggleGroupItem value="bold" aria-label="Bold">
                    <Bold className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>

                <ToggleGroup
                  type="single"
                  value={config.fontStyle}
                  onValueChange={(value) => value && setConfig({ ...config, fontStyle: value })}
                >
                  <ToggleGroupItem value="normal" aria-label="Normal style">
                    Normal
                  </ToggleGroupItem>
                  <ToggleGroupItem value="italic" aria-label="Italic">
                    <Italic className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="fill">Text Color</Label>
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
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-2 border-t pt-4">
            <Label>Text Alignment</Label>
            <ToggleGroup
              type="single"
              value={config.textAlign}
              onValueChange={(value) => value && setConfig({ ...config, textAlign: value })}
            >
              <ToggleGroupItem value="left" aria-label="Align left">
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Align center">
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Align right">
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="justify" aria-label="Justify">
                <AlignJustify className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Spacing */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold text-sm">Spacing</h4>
            
            <div className="space-y-2">
              <Label>Letter Spacing: {config.letterSpacing}px</Label>
              <Slider
                value={[config.letterSpacing]}
                onValueChange={([value]) => setConfig({ ...config, letterSpacing: value })}
                min={-5}
                max={20}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <Label>Line Height: {config.lineHeight.toFixed(1)}</Label>
              <Slider
                value={[config.lineHeight]}
                onValueChange={([value]) => setConfig({ ...config, lineHeight: value })}
                min={0.5}
                max={3}
                step={0.1}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2 border-t pt-4">
            <Label>Preview</Label>
            <div className="p-4 bg-muted rounded-md flex items-center justify-center min-h-[100px]">
              <p
                style={{
                  fontFamily: config.fontFamily,
                  fontSize: `${Math.min(config.fontSize, 32)}px`,
                  fontWeight: config.fontWeight,
                  fontStyle: config.fontStyle,
                  color: config.fill,
                  textAlign: config.textAlign as any,
                  letterSpacing: `${config.letterSpacing}px`,
                  lineHeight: config.lineHeight,
                }}
              >
                {config.text || "Preview text"}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!config.text}>
            {initialData ? "Update" : "Add"} Text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

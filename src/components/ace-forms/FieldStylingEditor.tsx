import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldStyling } from "@/types/aceForms";

interface FieldStylingEditorProps {
  styling?: FieldStyling;
  onUpdate: (styling: FieldStyling) => void;
}

export function FieldStylingEditor({ styling = {}, onUpdate }: FieldStylingEditorProps) {
  const handleUpdate = (key: keyof FieldStyling, value: string) => {
    onUpdate({
      ...styling,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Field Styling</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Border Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={styling.borderColor || "#e5e7eb"}
              onChange={(e) => handleUpdate("borderColor", e.target.value)}
              className="w-16 h-9 p-1"
            />
            <Input
              value={styling.borderColor || ""}
              onChange={(e) => handleUpdate("borderColor", e.target.value)}
              placeholder="#e5e7eb"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Background Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={styling.backgroundColor || "#ffffff"}
              onChange={(e) => handleUpdate("backgroundColor", e.target.value)}
              className="w-16 h-9 p-1"
            />
            <Input
              value={styling.backgroundColor || ""}
              onChange={(e) => handleUpdate("backgroundColor", e.target.value)}
              placeholder="#ffffff"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Text Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={styling.textColor || "#000000"}
              onChange={(e) => handleUpdate("textColor", e.target.value)}
              className="w-16 h-9 p-1"
            />
            <Input
              value={styling.textColor || ""}
              onChange={(e) => handleUpdate("textColor", e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Border Radius</Label>
          <Input
            value={styling.borderRadius || ""}
            onChange={(e) => handleUpdate("borderRadius", e.target.value)}
            placeholder="8px"
          />
        </div>
      </CardContent>
    </Card>
  );
}

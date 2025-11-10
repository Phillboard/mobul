import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BackgroundPanelProps {
  backgroundColor: string;
  onBackgroundChange: (color: string) => void;
  onBackgroundImageChange: (url: string) => void;
}

const commonColors = [
  { name: "White", value: "#FFFFFF" },
  { name: "Light Gray", value: "#F5F5F5" },
  { name: "Blue", value: "#1a4d7c" },
  { name: "Dark Blue", value: "#0F172A" },
  { name: "Green", value: "#16A34A" },
  { name: "Red", value: "#DC2626" },
  { name: "Orange", value: "#EA580C" },
  { name: "Purple", value: "#9333EA" },
];

export function BackgroundPanel({
  backgroundColor,
  onBackgroundChange,
  onBackgroundImageChange,
}: BackgroundPanelProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async () => {
    if (!imageFile) return;

    try {
      setUploading(true);
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `template-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("templates")
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("templates")
        .getPublicUrl(filePath);

      onBackgroundImageChange(publicUrl);
      setImageFile(null);
      toast.success("Background image uploaded");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-64 border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Background</h3>
        <p className="text-xs text-muted-foreground">Customize canvas background</p>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <Label className="text-sm font-medium mb-3 block">Color</Label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {commonColors.map((color) => (
              <button
                key={color.value}
                className="w-12 h-12 rounded-md border-2 border-border hover:border-primary transition-colors"
                style={{ backgroundColor: color.value }}
                onClick={() => onBackgroundChange(color.value)}
                title={color.name}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              type="color"
              value={backgroundColor}
              onChange={(e) => onBackgroundChange(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={backgroundColor}
              onChange={(e) => onBackgroundChange(e.target.value)}
              className="flex-1"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 block">Background Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="mb-2"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={handleImageUpload}
            disabled={!imageFile || uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Background"}
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onBackgroundChange("#FFFFFF")}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to White
        </Button>
      </div>
    </div>
  );
}

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
    <div className="w-64 border-r border-border bg-builder-sidebar shadow-sm">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-bold text-base">Background</h3>
        <p className="text-xs text-muted-foreground mt-1">Customize canvas background</p>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <Label className="text-sm font-bold mb-3 block">Color</Label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {commonColors.map((color) => (
              <button
                key={color.value}
                className="w-12 h-12 rounded-lg border-2 border-border hover:border-builder-tool-active hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
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
              className="w-20 h-10 cursor-pointer hover:border-primary transition-colors"
            />
            <Input
              type="text"
              value={backgroundColor}
              onChange={(e) => onBackgroundChange(e.target.value)}
              className="flex-1 font-mono text-sm"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-bold mb-3 block">Background Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="mb-2 cursor-pointer hover:border-primary transition-colors"
          />
          <Button
            variant="outline"
            className="w-full hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all duration-200"
            onClick={handleImageUpload}
            disabled={!imageFile || uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Background"}
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all duration-200"
          onClick={() => onBackgroundChange("#FFFFFF")}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to White
        </Button>
      </div>
    </div>
  );
}

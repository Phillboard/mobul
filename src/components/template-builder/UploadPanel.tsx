import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadPanelProps {
  onImageAdd: (url: string) => void;
}

export function UploadPanel({ onImageAdd }: UploadPanelProps) {
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

      onImageAdd(publicUrl);
      setImageFile(null);
      toast.success("Image added to canvas");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-64 border-r border-border bg-builder-sidebar shadow-sm">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-bold text-base">Upload</h3>
        <p className="text-xs text-muted-foreground mt-1">Add images to canvas</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-bold mb-2 block">Select Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="mb-3 cursor-pointer hover:border-primary transition-colors"
          />
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col gap-2 hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all duration-200 hover:scale-105 group"
            onClick={handleImageUpload}
            disabled={!imageFile || uploading}
          >
            <Upload className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">
              {uploading ? "Uploading..." : "Add to Canvas"}
            </span>
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              📁 Supported: JPG, PNG, SVG
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              📊 Max size: 10MB
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              🖨️ Recommended: 300 DPI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="w-64 border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Upload</h3>
        <p className="text-xs text-muted-foreground">Add images to canvas</p>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Select Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="mb-3"
          />
          <Button
            variant="outline"
            className="w-full h-20 flex flex-col gap-2 hover:bg-accent hover:border-primary"
            onClick={handleImageUpload}
            disabled={!imageFile || uploading}
          >
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">
              {uploading ? "Uploading..." : "Add to Canvas"}
            </span>
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Supported formats: JPG, PNG, SVG
            <br />
            Max size: 10MB
            <br />
            Recommended: 300 DPI for print
          </p>
        </div>
      </div>
    </div>
  );
}

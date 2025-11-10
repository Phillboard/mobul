import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Type, Square, Circle, Image, Layers, FileText } from "lucide-react";
import { MergeFieldSelector } from "./MergeFieldSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ToolSidebarProps {
  onAddLayer: (layer: any) => void;
}

export function ToolSidebar({ onAddLayer }: ToolSidebarProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleAddText = () => {
    onAddLayer({
      type: "text",
      text: "New Text",
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#000000",
      left: 100,
      top: 100,
      fontWeight: "normal",
    });
  };

  const handleAddShape = (shape: "rectangle" | "circle") => {
    if (shape === "rectangle") {
      onAddLayer({
        type: "shape",
        shape: "rectangle",
        width: 200,
        height: 100,
        fill: "#cccccc",
        stroke: "#000000",
        strokeWidth: 1,
        left: 100,
        top: 100,
      });
    } else {
      onAddLayer({
        type: "shape",
        shape: "circle",
        radius: 50,
        fill: "#cccccc",
        stroke: "#000000",
        strokeWidth: 1,
        left: 100,
        top: 100,
      });
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) return;

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `template-images/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("templates")
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("templates")
        .getPublicUrl(filePath);

      onAddLayer({
        type: "image",
        src: publicUrl,
        left: 100,
        top: 100,
        scaleX: 1,
        scaleY: 1,
      });

      setImageFile(null);
      toast.success("Image added to canvas");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    }
  };

  const handleAddMergeField = (field: string) => {
    if (field === "{{qr_code}}") {
      onAddLayer({
        type: "qr_code",
        data: "{{purl}}",
        size: 200,
        left: 100,
        top: 100,
      });
    } else {
      onAddLayer({
        type: "text",
        text: field,
        fontSize: 24,
        fontFamily: "Arial",
        fill: "#000000",
        left: 100,
        top: 100,
        fontWeight: "normal",
      });
    }
  };

  return (
    <div className="w-64 border-r border-border bg-background p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Tools</h2>
      
      <Tabs defaultValue="elements" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="elements">Elements</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
        </TabsList>
        
        <TabsContent value="elements" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Text</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleAddText}
            >
              <Type className="mr-2 h-4 w-4" />
              Add Text
            </Button>
          </div>
          
          <div>
            <Label className="text-sm font-medium mb-2 block">Shapes</Label>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAddShape("rectangle")}
              >
                <Square className="mr-2 h-4 w-4" />
                Rectangle
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAddShape("circle")}
              >
                <Circle className="mr-2 h-4 w-4" />
                Circle
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Upload Image</Label>
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
              disabled={!imageFile}
            >
              <Image className="mr-2 h-4 w-4" />
              Add to Canvas
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="fields" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Merge Fields</Label>
            <p className="text-xs text-muted-foreground mb-4">
              Add personalized fields that will be replaced with recipient data
            </p>
            <MergeFieldSelector onSelect={handleAddMergeField} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

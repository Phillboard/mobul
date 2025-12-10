/**
 * UploadDesignStep - Optional step for self-mailers
 * 
 * Allows them to upload an image of their mail piece design.
 * This image is used by AI to generate a matching landing page.
 * 
 * This step is SKIPPABLE - not required.
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Upload, Image, X, Sparkles, ArrowRight, Info } from "lucide-react";
import { cn } from '@shared/utils/cn';
import { useToast } from '@shared/hooks';
import { supabase } from '@core/services/supabase';
import type { CampaignFormData } from "@/types/campaigns";

interface UploadDesignStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function UploadDesignStep({ clientId, initialData, onNext, onBack }: UploadDesignStepProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    (initialData as any).design_image_url || null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    (initialData as any).design_image_url || null
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}-design.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('campaign-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(fileName);

      setUploadedUrl(publicUrl);
      toast({
        title: "Design uploaded",
        description: "Your mail design has been uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your design. Please try again.",
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedUrl(null);
    setPreviewUrl(null);
  };

  const handleNext = () => {
    onNext({ design_image_url: uploadedUrl } as any);
  };

  const handleSkip = () => {
    onNext({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Upload Your Mail Design (Optional)</h2>
        <p className="text-muted-foreground mt-2">
          Upload an image of your mail piece so our AI can create a matching landing page
        </p>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>AI-Powered:</strong> When you upload your mail design, our AI will analyze it to 
          generate a landing page that matches your branding, colors, and style automatically.
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      <Card className={cn(
        "transition-all",
        isDragging && "border-primary ring-2 ring-primary",
        !previewUrl && "border-dashed"
      )}>
        <CardContent className="pt-6">
          {!previewUrl ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center py-12 rounded-lg",
                "cursor-pointer hover:bg-muted/50 transition-colors",
                isDragging && "bg-primary/5"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('design-upload')?.click()}
            >
              <input
                id="design-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">
                {isDragging ? "Drop your image here" : "Upload your mail design"}
              </h3>
              
              <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
                Drag and drop an image, or click to browse. Supported formats: JPEG, PNG, GIF, WebP (max 10MB)
              </p>
              
              <Button variant="outline" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Choose File"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Mail design preview"
                  className="w-full max-h-96 object-contain rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Image className="h-4 w-4" />
                <span>Design uploaded successfully</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info about what this does */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Why upload your design?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Our AI will extract colors, fonts, and branding from your mail piece</p>
          <p>• The generated landing page will match your campaign's visual identity</p>
          <p>• Skip this step if you want to design your landing page from scratch</p>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip This Step
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button onClick={handleNext} disabled={isUploading}>
            {uploadedUrl ? "Continue with Design" : "Continue"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}


import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { GeneratePageRequest } from "@/types/landingPages";
import { toast } from "sonner";

interface ImageUploadFormProps {
  onGenerate: (request: GeneratePageRequest) => void;
  isGenerating: boolean;
}

export function ImageUploadForm({ onGenerate, isGenerating }: ImageUploadFormProps) {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setUploadedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedImage || !imagePreview) {
      toast.error('Please upload an image');
      return;
    }

    // In a real implementation, you would upload the image to storage first
    // For now, we'll pass the data URL directly
    const request: GeneratePageRequest = {
      prompt: additionalInstructions || 'Convert this mailer to a landing page, maintaining the style and branding.',
      imageUrl: imagePreview, // In production, this would be a storage URL
      provider,
    };

    onGenerate(request);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload Area */}
      <div className="space-y-2">
        <Label>Upload Mailer Image *</Label>
        {!imagePreview ? (
          <label
            htmlFor="image-upload"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
            <input
              id="image-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </label>
        ) : (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Uploaded mailer"
              className="w-full h-auto max-h-96 object-contain rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Additional Instructions */}
      <div className="space-y-2">
        <Label htmlFor="instructions">Additional Instructions (optional)</Label>
        <Textarea
          id="instructions"
          placeholder="Example: Make it more modern, emphasize the call-to-action, use blue as the primary color"
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          The AI will analyze your mailer and recreate it as a web page. Add any specific changes you'd like.
        </p>
      </div>

      {/* AI Provider */}
      <div className="space-y-2">
        <Label htmlFor="provider">AI Provider</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
          <SelectTrigger id="provider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI (GPT-4 Vision)</SelectItem>
            <SelectItem value="anthropic">Anthropic (Claude 3 Vision)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isGenerating || !uploadedImage}
      >
        <ImageIcon className="mr-2 h-5 w-5" />
        Analyze & Generate
      </Button>
    </form>
  );
}


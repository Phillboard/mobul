import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Link2, FileText, Sparkles, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { VariationSelector } from "./VariationSelector";

interface AIGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (landingPageId: string) => void;
  clientId: string;
}

export function AIGenerationDialog({ open, onOpenChange, onSuccess, clientId }: AIGenerationDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  
  const [sourceType, setSourceType] = useState<"description" | "url" | "image">("description");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  
  const [giftCardBrand, setGiftCardBrand] = useState("Amazon");
  const [giftCardValue, setGiftCardValue] = useState(25);
  const [userAction, setUserAction] = useState("called in");
  
  const [showVariations, setShowVariations] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [landingPageId, setLandingPageId] = useState<string>("");
  const [extractedBranding, setExtractedBranding] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => setUploadedFile(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const validateInput = () => {
    if (sourceType === "description" && !description.trim()) {
      toast({ title: "Missing input", description: "Please describe your business", variant: "destructive" });
      return false;
    }
    if (sourceType === "url" && !websiteUrl.trim()) {
      toast({ title: "Missing input", description: "Please provide website URL", variant: "destructive" });
      return false;
    }
    if (sourceType === "image" && !uploadedFile) {
      toast({ title: "Missing input", description: "Please upload an image", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!validateInput()) return;

    setIsGenerating(true);
    setProgress(0);
    setStatusText("Analyzing your brand...");

    try {
      const progressSteps = [
        { percent: 15, text: "Analyzing your brand...", delay: 2000 },
        { percent: 40, text: "Creating Modern Minimalist design...", delay: 12000 },
        { percent: 65, text: "Creating Bold & Energetic design...", delay: 12000 },
        { percent: 90, text: "Creating Professional Luxury design...", delay: 12000 },
        { percent: 95, text: "Finalizing...", delay: 3000 }
      ];

      const progressPromise = (async () => {
        for (const step of progressSteps) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
          setProgress(step.percent);
          setStatusText(step.text);
        }
      })();

      const { data, error } = await supabase.functions.invoke('generate-landing-page', {
        body: {
          sourceType,
          sourceUrl: websiteUrl,
          sourceFile: uploadedFile,
          sourceDescription: description,
          clientId,
          giftCardBrand,
          giftCardValue,
          userAction
        }
      });

      await progressPromise;

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Generation failed');

      setProgress(100);
      setStatusText("Complete!");
      setLandingPageId(data.landingPageId);
      setVariations(data.variations);
      setExtractedBranding(data.branding);

      setTimeout(() => setShowVariations(true), 500);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleVariationSelect = async (variationId: string) => {
    try {
      const { data: page } = await supabase
        .from('landing_pages')
        .select('content_json')
        .eq('id', landingPageId)
        .single();

      if (!page) throw new Error('Page not found');

      const contentJson = page.content_json as any;
      const fullVariation = contentJson.variations.find((v: any) => v.id === variationId);

      const updatedContent = {
        ...contentJson,
        selectedVariation: contentJson.variations.findIndex((v: any) => v.id === variationId),
        pages: [{ name: 'Home', component: fullVariation.component }]
      };

      const { error } = await supabase
        .from('landing_pages')
        .update({
          content_json: updatedContent,
          html_content: fullVariation.component
        })
        .eq('id', landingPageId);

      if (error) throw error;

      toast({ title: "Design selected!", description: "Opening editor..." });
      onSuccess(landingPageId);
      resetDialog();

    } catch (error: any) {
      toast({ title: "Selection failed", description: error.message, variant: "destructive" });
    }
  };

  const resetDialog = () => {
    setIsGenerating(false);
    setProgress(0);
    setStatusText("");
    setDescription("");
    setWebsiteUrl("");
    setUploadedFile(null);
    setShowVariations(false);
    setVariations([]);
    setLandingPageId("");
    setExtractedBranding(null);
    onOpenChange(false);
  };

  if (showVariations && variations.length > 0) {
    return (
      <VariationSelector
        open={showVariations}
        onOpenChange={setShowVariations}
        variations={variations}
        landingPageId={landingPageId}
        branding={extractedBranding}
        onSelect={handleVariationSelect}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Landing Page Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Describe
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Website
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="description">Describe Your Business</Label>
                <Textarea
                  id="description"
                  placeholder="We're a plumbing company serving residential customers in Austin, TX..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="mt-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourbusiness.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="mt-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="upload">Upload Image or Flyer</Label>
                <div className="mt-2">
                  <input
                    id="upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('upload')?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadedFile ? "Change Image" : "Choose Image"}
                  </Button>
                  {uploadedFile && (
                    <img src={uploadedFile} alt="Preview" className="mt-4 max-h-48 rounded-lg mx-auto" />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <Label htmlFor="brand">Gift Card Brand</Label>
              <Select value={giftCardBrand} onValueChange={setGiftCardBrand}>
                <SelectTrigger id="brand" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amazon">Amazon</SelectItem>
                  <SelectItem value="Visa">Visa</SelectItem>
                  <SelectItem value="Target">Target</SelectItem>
                  <SelectItem value="Starbucks">Starbucks</SelectItem>
                  <SelectItem value="Walmart">Walmart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Card Value ($)</Label>
              <Input
                id="value"
                type="number"
                value={giftCardValue}
                onChange={(e) => setGiftCardValue(parseInt(e.target.value))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="action">User Action</Label>
              <Select value={userAction} onValueChange={setUserAction}>
                <SelectTrigger id="action" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="called in">Called in</SelectItem>
                  <SelectItem value="booked online">Booked online</SelectItem>
                  <SelectItem value="visited showroom">Visited showroom</SelectItem>
                  <SelectItem value="requested quote">Requested quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-3 pt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center animate-pulse">
                {statusText}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={resetDialog} disabled={isGenerating} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate 3 Designs
                </>
              )}
            </Button>
          </div>

          {!isGenerating && (
            <p className="text-xs text-center text-muted-foreground">
              ⏱️ Estimated time: 30-45 seconds
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

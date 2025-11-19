import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Globe, Upload, FileText, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VariationSelector } from "./VariationSelector";

interface AIGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pageId: string) => void;
}

interface ExtractedBranding {
  companyName: string;
  industry: string;
  primaryColor: string;
  accentColor: string;
  tagline?: string;
}

export function AIGenerationDialog({ open, onOpenChange, onSuccess }: AIGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "image" | "description">("description");
  const { currentClient } = useTenant();
  
  // Variations state
  const [variations, setVariations] = useState<any[]>([]);
  const [showVariations, setShowVariations] = useState(false);
  const [generatedPageId, setGeneratedPageId] = useState<string | null>(null);
  
  // Input fields
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  
  // Gift card fields (always visible)
  const [giftCardBrand, setGiftCardBrand] = useState("Amazon");
  const [giftCardValue, setGiftCardValue] = useState("25");
  const [userAction, setUserAction] = useState("Called in");
  
  // Extracted branding preview
  const [extractedBranding, setExtractedBranding] = useState<ExtractedBranding | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const giftCardBrands = [
    "Amazon", "Visa", "Starbucks", "Target", "Walmart", "Best Buy", "Apple"
  ];

  const userActions = [
    "Called in", "Signed up", "Scheduled consultation", "Completed survey", 
    "Requested quote", "Booked appointment"
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB");
      return;
    }
    
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, or PDF");
      return;
    }
    
    setUploadedFile(file);
  };

  const validateInput = (): boolean => {
    if (!giftCardBrand || !userAction || !currentClient) {
      toast.error("Please fill all gift card details");
      return false;
    }

    if (sourceType === "url" && !websiteUrl.trim()) {
      toast.error("Please enter a website URL");
      return false;
    }
    
    if (sourceType === "image" && !uploadedFile) {
      toast.error("Please upload a flyer or image");
      return false;
    }
    
    if (sourceType === "description" && !description.trim()) {
      toast.error("Please describe your company");
      return false;
    }
    
    return true;
  };

  const handleGenerate = async () => {
    if (!validateInput()) return;

    setIsGenerating(true);
    setGenerationProgress("Analyzing your input...");
    
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      const progressMessages = [
        "Analyzing your input...",
        "Extracting branding information...",
        "Designing layout...",
        "Creating visual elements...",
        "Generating content...",
        "Finalizing your page..."
      ];
      
      let progressIndex = 0;
      progressInterval = setInterval(() => {
        progressIndex = (progressIndex + 1) % progressMessages.length;
        setGenerationProgress(progressMessages[progressIndex]);
      }, 3000);

      let requestBody: any = {
        sourceType,
        giftCardBrand,
        giftCardValue: parseInt(giftCardValue),
        userAction,
        clientId: currentClient!.id,
      };

      if (sourceType === "url") {
        requestBody.sourceUrl = websiteUrl;
      } else if (sourceType === "image" && uploadedFile) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(uploadedFile);
        });
        requestBody.sourceImage = base64;
      } else if (sourceType === "description") {
        requestBody.sourceDescription = description;
      }

      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: requestBody,
      });

      if (error) {
        console.error("Error generating page:", error);
        throw new Error(error.message || "Failed to generate page");
      }

      if (!data?.id) {
        throw new Error("No page ID returned from generation");
      }

      // Show extracted branding if available
      if (data.extractedBranding) {
        setExtractedBranding(data.extractedBranding);
      }

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Show variations if available
      if (data.variations && data.variations.length > 1) {
        setVariations(data.variations);
        setGeneratedPageId(data.id);
        setShowVariations(true);
        setIsGenerating(false);
      } else {
        toast.success("Landing page generated! Opening visual editor...");
        onSuccess(data.id);
        onOpenChange(false);
        resetForm();
        
        // Navigate to GrapesJS visual editor
        setTimeout(() => {
          window.location.href = `/landing-pages/${data.id}/visual-editor`;
        }, 500);
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate landing page");
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  const resetForm = () => {
    setWebsiteUrl("");
    setUploadedFile(null);
    setDescription("");
    setExtractedBranding(null);
    setVariations([]);
    setShowVariations(false);
    setGeneratedPageId(null);
  };

  const handleVariationSelect = async (variationId: string) => {
    if (!generatedPageId) return;
    
    try {
      const selectedVariation = variations.find(v => v.id === variationId);
      if (!selectedVariation) return;

      // Get current content_json
      const { data: currentPage } = await supabase
        .from('landing_pages')
        .select('content_json')
        .eq('id', generatedPageId)
        .single();

      // Update the landing page with selected variation
      const { error } = await supabase
        .from('landing_pages')
        .update({ 
          html_content: selectedVariation.html,
          content_json: {
            ...(currentPage?.content_json as any || {}),
            selectedVariation: variations.findIndex(v => v.id === variationId)
          }
        })
        .eq('id', generatedPageId);

      if (error) throw error;

      toast.success("Design selected successfully!");
      onSuccess(generatedPageId);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error selecting variation:", error);
      toast.error("Failed to select design");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Gift Card Landing Page
          </DialogTitle>
          <DialogDescription>
            Tell us about your company - we'll handle the rest
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Method Tabs */}
          <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description" className="text-xs sm:text-sm">
                <FileText className="h-4 w-4 mr-1" />
                Describe
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs sm:text-sm">
                <Globe className="h-4 w-4 mr-1" />
                Website
              </TabsTrigger>
              <TabsTrigger value="image" className="text-xs sm:text-sm">
                <Upload className="h-4 w-4 mr-1" />
                Flyer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="space-y-3 mt-4">
              <Label htmlFor="description">Describe your company</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., We provide premium auto warranty coverage for luxury vehicles. Our service includes 24/7 roadside assistance and comprehensive protection plans."
                rows={5}
                disabled={isGenerating}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                AI will analyze your description and create an industry-appropriate landing page
              </p>
            </TabsContent>

            <TabsContent value="url" className="space-y-3 mt-4">
              <Label htmlFor="websiteUrl">Your company website</Label>
              <Input
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                AI will analyze your website and extract branding, colors, and content
              </p>
            </TabsContent>

            <TabsContent value="image" className="space-y-3 mt-4">
              <Label>Upload a flyer or marketing material</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3 hover:border-primary transition-colors">
                {uploadedFile ? (
                  <div className="space-y-2">
                    <Check className="h-8 w-8 mx-auto text-green-500" />
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                      disabled={isGenerating}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <label htmlFor="fileUpload">
                        <Button variant="outline" size="sm" asChild disabled={isGenerating}>
                          <span className="cursor-pointer">Choose File</span>
                        </Button>
                      </label>
                      <input
                        id="fileUpload"
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isGenerating}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, or PDF up to 5MB
                    </p>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                AI will extract colors, logo, and content from your flyer
              </p>
            </TabsContent>
          </Tabs>

          {/* Gift Card Details - Always Visible */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm">Gift Card Details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="giftCardBrand">Brand</Label>
                <Select value={giftCardBrand} onValueChange={setGiftCardBrand} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {giftCardBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="giftCardValue">Value ($)</Label>
                <Input
                  id="giftCardValue"
                  type="number"
                  min="5"
                  max="500"
                  value={giftCardValue}
                  onChange={(e) => setGiftCardValue(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="userAction">User completed</Label>
              <Select value={userAction} onValueChange={setUserAction} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Extracted Branding Preview */}
          {extractedBranding && (
            <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <h3 className="font-medium text-sm">AI Extracted Branding</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Company:</span>{" "}
                  <span className="font-medium">{extractedBranding.companyName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Industry:</span>{" "}
                  <span className="font-medium">{extractedBranding.industry}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Primary:</span>
                  <div 
                    className="w-6 h-6 rounded border" 
                    style={{ backgroundColor: extractedBranding.primaryColor }}
                  />
                  <span className="text-xs">{extractedBranding.primaryColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Accent:</span>
                  <div 
                    className="w-6 h-6 rounded border" 
                    style={{ backgroundColor: extractedBranding.accentColor }}
                  />
                  <span className="text-xs">{extractedBranding.accentColor}</span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                Advanced Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div>
                <Label htmlFor="additionalInstructions">Additional Instructions</Label>
                <Textarea
                  id="additionalInstructions"
                  placeholder="Any specific requirements or customizations..."
                  rows={3}
                  disabled={isGenerating}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {generationProgress}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Page
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <VariationSelector
      open={showVariations}
      onOpenChange={setShowVariations}
      variations={variations}
      onSelect={handleVariationSelect}
    />
  </>
  );
}

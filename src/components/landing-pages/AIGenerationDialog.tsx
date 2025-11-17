import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Code, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { EmbedCodeGenerator } from "./EmbedCodeGenerator";

interface AIGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pageId: string) => void;
}

export function AIGenerationDialog({ open, onOpenChange, onSuccess }: AIGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [activeTab, setActiveTab] = useState<"landing" | "embed">("landing");
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const { currentClient } = useTenant();
  
  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [accentColor, setAccentColor] = useState("#fbbf24");
  const [giftCardBrand, setGiftCardBrand] = useState("");
  const [giftCardValue, setGiftCardValue] = useState("25");
  const [userAction, setUserAction] = useState("");
  const [additionalPrompt, setAdditionalPrompt] = useState("");

  const industries = [
    "Auto Warranty", "Insurance", "Solar Energy", "Home Services", "Financial Services",
    "Healthcare", "Real Estate", "Legal Services", "Home Security", "HVAC"
  ];

  const giftCardBrands = [
    "Starbucks", "Amazon", "Visa", "Target", "Walmart", "Best Buy", "Apple", "Netflix"
  ];

  const userActions = [
    "Called in", "Signed up", "Scheduled consultation", "Completed survey", 
    "Attended webinar", "Requested quote", "Booked appointment"
  ];

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter company name");
      return;
    }
    if (!industry) {
      toast.error("Please select industry");
      return;
    }
    if (!giftCardBrand) {
      toast.error("Please select gift card brand");
      return;
    }
    if (!userAction) {
      toast.error("Please select user action");
      return;
    }
    if (!currentClient) {
      toast.error("No client selected");
      return;
    }

    if (activeTab === "embed") {
      setShowEmbedCode(true);
      return;
    }

    setIsGenerating(true);
    setGenerationProgress("Analyzing your requirements...");
    
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      // Simulate progress updates
      const progressMessages = [
        "Analyzing your requirements...",
        "Designing layout and structure...",
        "Creating visual elements...",
        "Generating compelling content...",
        "Adding industry-specific features...",
        "Finalizing your landing page..."
      ];
      
      let progressIndex = 0;
      progressInterval = setInterval(() => {
        progressIndex = (progressIndex + 1) % progressMessages.length;
        setGenerationProgress(progressMessages[progressIndex]);
      }, 3000);

      // Build comprehensive prompt with all context
      const contextPrompt = `Create a client-branded landing page for ${companyName}, a ${industry} company. 
      
CLIENT DETAILS:
- Company: ${companyName}
- Industry: ${industry}
- Primary Brand Color: ${primaryColor}
- Accent Color: ${accentColor}

REWARD DETAILS:
- Gift Card: $${giftCardValue} ${giftCardBrand}
- User completed action: ${userAction}

${additionalPrompt ? `ADDITIONAL REQUIREMENTS:\n${additionalPrompt}` : ''}

Generate a professional, conversion-optimized thank-you page that:
1. Thanks the customer for ${userAction.toLowerCase()}
2. Reinforces ${companyName}'s brand and expertise in ${industry}
3. Delivers the $${giftCardValue} ${giftCardBrand} gift card as a reward
4. Builds trust with industry-specific credibility signals`;

      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: {
          prompt: contextPrompt,
          clientId: currentClient.id,
          companyName,
          industry,
          primaryColor,
          accentColor,
          giftCardBrand,
          giftCardValue: parseInt(giftCardValue),
          userAction,
          includeCodeEntry: true,
          fullPage: true,
        },
      });

      if (error) throw error;

      if (progressInterval) clearInterval(progressInterval);
      setGenerationProgress("");
      toast.success("Landing page generated!");
      onSuccess(data.id);
      onOpenChange(false);
      
      // Reset form
      setCompanyName("");
      setIndustry("");
      setGiftCardBrand("");
      setUserAction("");
      setAdditionalPrompt("");
    } catch (error: any) {
      console.error("Error generating landing page:", error);
      toast.error(error.message || "Failed to generate landing page");
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Gift Card Experience
            </DialogTitle>
            <DialogDescription>
              Choose between a full landing page or just the embeddable form widget
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "landing" | "embed")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="landing" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Full Landing Page
              </TabsTrigger>
              <TabsTrigger value="embed" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Embed Form Only
              </TabsTrigger>
            </TabsList>

            <TabsContent value="landing" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Client Company Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        placeholder="Elite Auto Warranty"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="industry">Industry *</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger id="industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((ind) => (
                            <SelectItem key={ind} value={ind}>
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="userAction">User Action *</Label>
                      <Select value={userAction} onValueChange={setUserAction}>
                        <SelectTrigger id="userAction">
                          <SelectValue placeholder="What did they do?" />
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
                    <div>
                      <Label htmlFor="primaryColor">Primary Brand Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#1e40af"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accentColor"
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#fbbf24"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-3">Gift Card Reward</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="giftCardBrand">Brand *</Label>
                      <Select value={giftCardBrand} onValueChange={setGiftCardBrand}>
                        <SelectTrigger id="giftCardBrand">
                          <SelectValue placeholder="Select brand" />
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
                      <Label htmlFor="giftCardValue">Value ($) *</Label>
                      <Input
                        id="giftCardValue"
                        type="number"
                        min="5"
                        step="5"
                        value={giftCardValue}
                        onChange={(e) => setGiftCardValue(e.target.value)}
                        placeholder="25"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="additionalPrompt">Additional Instructions (Optional)</Label>
                  <Textarea
                    id="additionalPrompt"
                    placeholder="e.g., Professional tone, emphasize 24/7 support, include customer testimonial..."
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !companyName || !industry || !giftCardBrand || !userAction}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {generationProgress || "Generating..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Page
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4 mt-4">
              <div className="text-center py-8">
                <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Get Embeddable Form Code</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Get a ready-to-use code snippet you can paste into any website, WordPress, Shopify, or CMS
                </p>
                <Button onClick={() => setShowEmbedCode(true)}>
                  <Code className="mr-2 h-4 w-4" />
                  Get Embed Code
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EmbedCodeGenerator
        open={showEmbedCode}
        onOpenChange={setShowEmbedCode}
        campaignId=""
      />
    </>
  );
}

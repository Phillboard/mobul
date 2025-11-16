import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"landing" | "embed">("landing");
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const { currentClient } = useTenant();

  const landingExamples = [
    "Luxury Starbucks gift card page with elegant green gradient, coffee imagery, and premium feel",
    "Bold Marco's Pizza page with vibrant red design, pizza photos, and appetizing visuals",
    "Modern Amazon gift card page with dynamic orange accents, product imagery, and sleek layout",
  ];

  const embedExamples = [
    "Simple form for Starbucks gift cards",
    "Minimal Marco's Pizza redemption widget",
    "Clean Amazon gift card entry form",
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!currentClient) {
      toast.error("No client selected");
      return;
    }

    if (activeTab === "embed") {
      // For embed, just show the code generator
      setShowEmbedCode(true);
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: {
          prompt: prompt.trim(),
          clientId: currentClient.id,
          includeCodeEntry: true,
          fullPage: true, // Request a full beautiful page
        },
      });

      if (error) throw error;

      toast.success("Landing page generated!");
      onSuccess(data.id);
      onOpenChange(false);
      setPrompt("");
    } catch (error: any) {
      console.error("Error generating landing page:", error);
      toast.error(error.message || "Failed to generate landing page");
    } finally {
      setIsGenerating(false);
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

            <TabsContent value="landing" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe your landing page
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Be specific about brand, colors, style, and imagery for the best results
                </p>
                <Textarea
                  placeholder="e.g., Luxury Starbucks gift card page with elegant green gradient, coffee imagery, and premium feel"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Example prompts:</p>
                <div className="space-y-2">
                  {landingExamples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(example)}
                      className="text-left text-xs text-muted-foreground hover:text-foreground w-full p-2 rounded hover:bg-muted transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
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

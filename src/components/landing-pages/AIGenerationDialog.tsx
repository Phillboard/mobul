import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

interface AIGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (pageId: string) => void;
}

export function AIGenerationDialog({ open, onOpenChange, onSuccess }: AIGenerationDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentClient } = useTenant();

  const examples = [
    "Professional page for Starbucks gift cards with green theme",
    "Modern page for Marco's Pizza gift cards with red and white colors",
    "Simple and clean page for Amazon gift cards with orange accent",
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

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: {
          prompt: prompt.trim(),
          clientId: currentClient.id,
          includeCodeEntry: true,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Landing Page with AI
          </DialogTitle>
          <DialogDescription>
            Describe the landing page you want for your gift card redemption campaign.
            The AI will create a complete page optimized for conversions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Describe your landing page
            </label>
            <Textarea
              placeholder="e.g., Professional page for Starbucks gift cards with green theme and modern design"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Example prompts:</p>
            <div className="space-y-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(example)}
                  className="text-left text-sm text-muted-foreground hover:text-foreground w-full p-2 rounded hover:bg-muted transition-colors"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

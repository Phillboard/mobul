import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FormConfig } from "@/types/aceForms";

interface AIFormGeneratorProps {
  onGenerated: (name: string, description: string, config: FormConfig) => void;
}

export function AIFormGenerator({ onGenerated }: AIFormGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please describe the form you want to create",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ace-form-ai", {
        body: { prompt },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Call parent with generated form
      onGenerated(data.name, data.description, data.config);

      toast({
        title: "Form Generated!",
        description: "Your form has been created with AI. You can now customize it.",
      });
    } catch (error: any) {
      console.error("AI generation error:", error);
      
      let errorMessage = "Failed to generate form. Please try again.";
      if (error.message?.includes("Rate limit")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes("credits")) {
        errorMessage = "AI credits exhausted. Please add credits to continue.";
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Describe Your Form</Label>
        <Textarea
          id="ai-prompt"
          placeholder="Example: Create a customer feedback form with gift card redemption. Include fields for name, email, rating, and comments."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={generating}
        />
        <p className="text-xs text-muted-foreground">
          Describe what kind of form you need and what information you want to collect.
        </p>
      </div>

      <Button 
        onClick={handleGenerate} 
        disabled={generating || !prompt.trim()}
        className="w-full"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Form with AI
          </>
        )}
      </Button>

      <div className="border-t pt-4 space-y-2">
        <p className="text-sm font-medium">Example Prompts:</p>
        <div className="space-y-2">
          {[
            "Event registration form with gift card giveaway",
            "Customer satisfaction survey with incentive",
            "Product feedback form for a restaurant",
            "Contest entry form with prize redemption",
          ].map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              disabled={generating}
              className="block w-full text-left text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

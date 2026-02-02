import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useToast } from '@shared/hooks';
import { FormConfig } from "@/types/aceForms";
import { useFormContext } from '@/features/forms/hooks';
import { Badge } from "@/shared/components/ui/badge";

interface AIFormGeneratorProps {
  onGenerated: (name: string, description: string, config: FormConfig) => void;
}

export function AIFormGenerator({ onGenerated }: AIFormGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const { context, getContextualPrompts } = useFormContext();
  const contextualPrompts = getContextualPrompts();

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
      const data = await callEdgeFunction<{ error?: string; name: string; description: string; config: FormConfig }>(
        Endpoints.ai.generateForm,
        { 
          prompt,
          context: {
            companyName: context.companyName,
            industry: context.industry,
            giftCardBrands: context.giftCardBrands,
          }
        }
      );

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
      {/* Context Badge */}
      {context.hasData && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="font-normal">
            {context.companyName}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {context.industry}
          </Badge>
          {context.giftCardBrands.length > 0 && (
            <Badge variant="outline" className="font-normal">
              {context.giftCardBrands[0]}
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Describe Your Form</Label>
        <Textarea
          id="ai-prompt"
          placeholder={`Example: ${contextualPrompts[0] || "Create a customer feedback form with gift card redemption. Include fields for name, email, rating, and comments."}`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={generating}
        />
        <p className="text-xs text-muted-foreground">
          Describe what kind of form you need and what information you want to collect from your customers.
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
        <p className="text-sm font-medium">Smart Suggestions for {context.companyName}:</p>
        <div className="space-y-2">
          {contextualPrompts.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              disabled={generating}
              className="block w-full text-left text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted/50 transition-all duration-200"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

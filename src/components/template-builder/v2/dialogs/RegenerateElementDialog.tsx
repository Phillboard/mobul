import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface RegenerateElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layer: any;
  canvasData: any;
  onRegenerate: (newLayer: any) => void;
}

export function RegenerateElementDialog({
  open,
  onOpenChange,
  layer,
  canvasData,
  onRegenerate,
}: RegenerateElementDialogProps) {
  const [prompt, setPrompt] = useState("");

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const otherLayers = canvasData.layers.filter((l: any) => l.id !== layer.id);
      
      const { data, error } = await supabase.functions.invoke(
        'regenerate-template-element',
        {
          body: {
            layerId: layer.id,
            currentLayer: layer,
            templateContext: {
              otherLayers: otherLayers.map((l: any) => ({
                type: l.type,
                name: l.name,
                x: l.x || l.left,
                y: l.y || l.top,
                width: l.width,
                height: l.height,
              }))
            },
            userRequest: prompt,
            canvasSize: canvasData.canvasSize
          }
        }
      );

      if (error) throw error;
      if (!data?.regeneratedLayer) throw new Error('No regenerated layer received');

      return data.regeneratedLayer;
    },
    onSuccess: (newLayer) => {
      toast.success("Element regenerated!");
      onRegenerate(newLayer);
      onOpenChange(false);
      setPrompt("");
    },
    onError: (error: any) => {
      console.error("Regeneration error:", error);
      if (error.message?.includes('Rate limit')) {
        toast.error("AI rate limit reached. Please try again in a moment.");
      } else if (error.message?.includes('credits')) {
        toast.error("AI credits exhausted. Please add credits in Settings.");
      } else {
        toast.error("Failed to regenerate: " + (error.message || "Unknown error"));
      }
    },
  });

  const getSuggestions = () => {
    if (layer.type === 'text') {
      return [
        "Make it bolder and more attention-grabbing",
        "Change to a warmer color scheme",
        "Make the text larger and centered",
        "Add more urgency to the message"
      ];
    } else if (layer.type === 'rect') {
      return [
        "Make it stand out more with a gradient",
        "Change to a complementary color",
        "Add rounded corners",
        "Make it slightly transparent"
      ];
    }
    return [
      "Make it more prominent",
      "Change the color scheme",
      "Adjust the size and position"
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Regenerate Element with AI
          </DialogTitle>
          <DialogDescription>
            Describe how you'd like to change this {layer?.type || 'element'}. AI will regenerate it while maintaining design consistency.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Current Element</Label>
            <div className="mt-2 p-3 bg-muted rounded-md text-sm">
              <div><strong>Type:</strong> {layer?.type}</div>
              <div><strong>Name:</strong> {layer?.name || 'Unnamed'}</div>
              {layer?.text && <div><strong>Text:</strong> {layer.text}</div>}
              {layer?.fill && (
                <div className="flex items-center gap-2">
                  <strong>Color:</strong>
                  <div 
                    className="w-6 h-6 rounded border" 
                    style={{ backgroundColor: layer.fill }}
                  />
                  {layer.fill}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="prompt">
              How would you like to change it? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Make the headline bolder, use a bright red color, and increase the font size to be more eye-catching"
              rows={4}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Quick suggestions:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {getSuggestions().map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={regenerateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || !prompt.trim()}
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

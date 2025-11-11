import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AITemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function AITemplateDialog({ open, onOpenChange, clientId }: AITemplateDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [size, setSize] = useState<"4x6" | "6x9" | "6x11" | "letter" | "trifold">("4x6");
  const [industryVertical, setIndustryVertical] = useState<string>("rei_postcard");

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Call AI edge function to generate design
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        'generate-template-design',
        {
          body: { description, size, industryVertical }
        }
      );

      if (aiError) throw aiError;
      if (!aiData?.templateData) throw new Error('No template data received from AI');

      // Create the template with AI-generated layers
      const { data: template, error: createError } = await supabase
        .from("templates")
        .insert({
          name: name || "AI Generated Template",
          size,
          industry_vertical: industryVertical as any,
          client_id: clientId,
          json_layers: aiData.templateData,
        })
        .select()
        .single();

      if (createError) throw createError;
      return template;
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("AI template created! Opening designer...");
      onOpenChange(false);
      // Navigate to template builder
      navigate(`/template-builder/${template.id}`);
    },
    onError: (error: any) => {
      console.error("Template generation error:", error);
      if (error.message?.includes('Rate limit')) {
        toast.error("AI rate limit reached. Please try again in a moment.");
      } else if (error.message?.includes('credits')) {
        toast.error("AI credits exhausted. Please add credits in Settings.");
      } else {
        toast.error("Failed to generate template: " + (error.message || "Unknown error"));
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please describe your template");
      return;
    }
    generateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Template Designer
          </DialogTitle>
          <DialogDescription>
            Describe your postcard and AI will create a professional design for you. 
            You can then customize it in the template builder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Sale Postcard"
            />
          </div>

          <div>
            <Label htmlFor="description">
              Describe Your Template <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: A promotional postcard for 50% off coffee drinks. Large bold headline '50% OFF Your Favorite Coffee', warm brown and cream colors, coffee cup imagery, 'Visit Today' button at bottom, include merge fields for personalization."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be specific: mention headlines, text content, colors, call-to-action, and any merge fields you want
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="size">Postcard Size</Label>
              <Select value={size} onValueChange={(val: any) => setSize(val)}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4x6">4×6 Postcard</SelectItem>
                  <SelectItem value="6x9">6×9 Postcard</SelectItem>
                  <SelectItem value="6x11">6×11 Postcard</SelectItem>
                  <SelectItem value="letter">8.5×11 Letter</SelectItem>
                  <SelectItem value="trifold">11×8.5 Trifold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select value={industryVertical} onValueChange={setIndustryVertical}>
                <SelectTrigger id="industry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rei_postcard">Real Estate Investment</SelectItem>
                  <SelectItem value="roofing_services">Roofing Services</SelectItem>
                  <SelectItem value="restaurant_promo">Restaurant / Food Service</SelectItem>
                  <SelectItem value="auto_service">Auto Service</SelectItem>
                  <SelectItem value="auto_warranty">Auto Warranty</SelectItem>
                  <SelectItem value="auto_buyback">Auto Buyback</SelectItem>
                  <SelectItem value="healthcare_checkup">Healthcare</SelectItem>
                  <SelectItem value="legal_services">Legal Services</SelectItem>
                  <SelectItem value="financial_advisor">Financial Services</SelectItem>
                  <SelectItem value="fitness_gym">Fitness / Gym</SelectItem>
                  <SelectItem value="retail_promo">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending || !description.trim()}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Template
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

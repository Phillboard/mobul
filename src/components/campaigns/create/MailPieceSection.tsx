import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import type { CampaignFormData } from "@/types/campaigns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MailPieceSectionProps {
  form: UseFormReturn<Partial<CampaignFormData>>;
  clientId: string;
}

export function MailPieceSection({ form, clientId }: MailPieceSectionProps) {
  const navigate = useNavigate();
  const templateId = form.watch("template_id");
  const size = form.watch("size") || "4x6";

  const { data: templates } = useQuery({
    queryKey: ["mail", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Mail Piece
        </CardTitle>
        <CardDescription>
          Select an existing template or design later
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template">Template (optional)</Label>
          <div className="flex gap-2">
            <Select
              value={templateId}
              onValueChange={(value) => form.setValue("template_id", value)}
            >
              <SelectTrigger id="template" className="flex-1">
                <SelectValue placeholder="Choose a template or skip" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/mail-designer/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Design New
            </Button>
          </div>
        </div>

        {/* Size Selection */}
        <div className="space-y-3">
          <Label>Mail Size</Label>
          <RadioGroup
            value={size}
            onValueChange={(value) => form.setValue("size", value as "4x6" | "6x9" | "6x11" | "letter" | "trifold")}
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="4x6" id="size-4x6" />
              <Label htmlFor="size-4x6" className="cursor-pointer font-normal">
                4×6 Postcard
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="6x9" id="size-6x9" />
              <Label htmlFor="size-6x9" className="cursor-pointer font-normal">
                6×9 Postcard
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="6x11" id="size-6x11" />
              <Label htmlFor="size-6x11" className="cursor-pointer font-normal">
                6×11 Postcard
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="letter" id="size-letter" />
              <Label htmlFor="size-letter" className="cursor-pointer font-normal">
                Letter
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="trifold" id="size-trifold" />
              <Label htmlFor="size-trifold" className="cursor-pointer font-normal">
                Trifold
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}

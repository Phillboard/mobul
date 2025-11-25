import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import type { CampaignFormData } from "@/types/campaigns";

const setupSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100),
  template_id: z.string().nullable(),
  size: z.enum(["4x6", "6x9", "6x11", "letter", "trifold"], {
    required_error: "Mail size is required",
  }),
});

type SetupFormData = z.infer<typeof setupSchema>;

interface CampaignSetupStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onCancel: () => void;
}

export function CampaignSetupStep({ clientId, initialData, onNext, onCancel }: CampaignSetupStepProps) {
  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: initialData.name || "",
      template_id: initialData.template_id || null,
      size: initialData.size || "4x6",
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["mail", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("client_id", clientId)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const selectedTemplateId = form.watch("template_id");
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const onSubmit = (data: SetupFormData) => {
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Campaign Setup</h2>
        <p className="text-muted-foreground mt-2">
          Start by naming your campaign and selecting a mail piece
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Spring 2025 Roofing Promo" {...field} />
                </FormControl>
                <FormDescription>
                  Choose a descriptive name that identifies this campaign
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="template_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mail Piece (Optional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a mail piece" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="none">None (design later)</SelectItem>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          {template.thumbnail_url && (
                            <img
                              src={template.thumbnail_url}
                              alt=""
                              className="w-6 h-6 object-cover rounded"
                            />
                          )}
                          <span>{template.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select an existing mail piece or design one later
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedTemplate && (
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {selectedTemplate.thumbnail_url && (
                    <img
                      src={selectedTemplate.thumbnail_url}
                      alt={selectedTemplate.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{selectedTemplate.name}</h4>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Size: {selectedTemplate.size}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mail Size</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="4x6">4×6 Postcard</SelectItem>
                    <SelectItem value="6x9">6×9 Postcard</SelectItem>
                    <SelectItem value="6x11">6×11 Postcard</SelectItem>
                    <SelectItem value="letter">Letter (#10)</SelectItem>
                    <SelectItem value="trifold">Tri-fold Self-Mailer</SelectItem>
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <FormDescription>
                    Pre-filled from selected mail piece: {selectedTemplate.size}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Next: Select Audience</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

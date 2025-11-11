import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import type { CampaignFormData } from "../CreateCampaignWizard";
import { addDays } from "date-fns";

const step2Schema = z.object({
  lp_mode: z.enum(["bridge", "redirect"]),
  base_lp_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  utm_source: z.string().min(1, "UTM source is required"),
  utm_medium: z.string().min(1, "UTM medium is required"),
  utm_campaign: z.string().min(1, "UTM campaign is required"),
}).refine((data) => {
  if (data.lp_mode === "redirect" && !data.base_lp_url) {
    return false;
  }
  return true;
}, {
  message: "Base URL is required for external redirect",
  path: ["base_lp_url"],
});

type Step2FormData = z.infer<typeof step2Schema>;

interface PURLSettingsStepProps {
  clientId: string;
  formData: Partial<CampaignFormData>;
  onBack: () => void;
  onNext: (data: Partial<CampaignFormData>) => void;
}

export function PURLSettingsStep({
  clientId,
  formData,
  onBack,
  onNext,
}: PURLSettingsStepProps) {
  const queryClient = useQueryClient();

  // Generate slug from campaign name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const form = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      lp_mode: formData.lp_mode || "bridge",
      base_lp_url: formData.base_lp_url || "",
      utm_source: formData.utm_source || "directmail",
      utm_medium: formData.utm_medium || "postcard",
      utm_campaign: formData.utm_campaign || generateSlug(formData.name || ""),
    },
  });

  // Update utm_campaign when campaign name changes
  useEffect(() => {
    if (formData.name) {
      form.setValue("utm_campaign", generateSlug(formData.name));
    }
  }, [formData.name, form]);

  const lpMode = form.watch("lp_mode");
  const baseUrl = form.watch("base_lp_url");
  const utmSource = form.watch("utm_source");
  const utmMedium = form.watch("utm_medium");
  const utmCampaign = form.watch("utm_campaign");

  // Generate example URL
  const exampleUrl = () => {
    const base = lpMode === "bridge" 
      ? "https://yoursite.com/l"
      : baseUrl || "https://example.com/offer";
    const token = "abc123";
    const params = new URLSearchParams({
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      rid: `rec_${token}`,
    });
    return `${base}/${token}?${params.toString()}`;
  };

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Step2FormData) => {
      const campaignData = {
        client_id: clientId,
        name: formData.name!,
        template_id: formData.template_id,
        size: formData.size!,
        audience_id: formData.audience_id!,
        postage: formData.postage!,
        mail_date:
          formData.mail_date_mode === "asap"
            ? addDays(new Date(), 3).toISOString().split("T")[0]
            : formData.mail_date?.toISOString().split("T")[0],
        lp_mode: data.lp_mode,
        base_lp_url: data.base_lp_url || null,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        status: "draft" as const,
      };

      const { error } = await supabase.from("campaigns").insert([campaignData]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created as draft");
      onNext(form.getValues());
    },
    onError: (error) => {
      toast.error("Failed to create campaign");
      console.error(error);
    },
  });

  const onSubmit = (data: Step2FormData) => {
    createCampaignMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="lp_mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Landing Page Mode</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="bridge" id="bridge" className="mt-1" />
                    <div className="flex-1">
                      <label htmlFor="bridge" className="font-medium cursor-pointer block">
                        Hosted Bridge Page
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Use our hosted landing page with your branding. Great for tracking
                        and lead capture before redirecting to your site.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="redirect" id="redirect" className="mt-1" />
                    <div className="flex-1">
                      <label htmlFor="redirect" className="font-medium cursor-pointer block">
                        External Redirect
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Redirect directly to your website URL with tracking parameters.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {lpMode === "bridge" && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Bridge Page Preview</h4>
                  <p className="text-sm text-muted-foreground">
                    Recipients will see a branded landing page with your logo and message
                    before being redirected to your main website. This increases engagement
                    and provides better tracking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {lpMode === "redirect" && (
          <FormField
            control={form.control}
            name="base_lp_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Landing Page URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://yourdomain.com/special-offer"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The URL where recipients will land when they scan or visit their
                  personalized link
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">UTM Tracking Parameters</h3>
          <p className="text-sm text-muted-foreground">
            These parameters help you track campaign performance in Google Analytics
          </p>

          <FormField
            control={form.control}
            name="utm_source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UTM Source</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Campaign source (e.g., directmail)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="utm_medium"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UTM Medium</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Campaign medium (e.g., postcard, letter)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="utm_campaign"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UTM Campaign</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Campaign identifier (auto-generated from campaign name)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Card className="bg-muted/50 border-2">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Example Personalized URL</h4>
              </div>
              <code className="text-xs block p-3 bg-background rounded border break-all">
                {exampleUrl()}
              </code>
              <p className="text-xs text-muted-foreground">
                Each recipient gets a unique URL with their token (abc123) and tracking
                parameters
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={createCampaignMutation.isPending}>
            {createCampaignMutation.isPending
              ? "Creating..."
              : "Create Campaign (Draft)"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

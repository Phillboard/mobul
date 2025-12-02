/**
 * MethodNameStep - Compact, modern step for campaign name and mailing method
 * 
 * Features:
 * - Compact layout with inline fields
 * - Visual card selection for mailing method
 * - Contextual help with popovers
 * - Real-time validation
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  // Truck - kept for ACE fulfillment when re-enabled
  HelpCircle, 
  ArrowRight, 
  Calendar,
  Check,
  FileText
} from "lucide-react";
import type { CampaignFormData, MailingMethod } from "@/types/campaigns";

const schema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters").max(100),
  // ACE fulfillment temporarily disabled - keeping "self" as the only option
  mailing_method: z.enum(["self"]).default("self"),
  mail_date: z.string().optional(),
  campaign_status: z.enum(["draft", "mailed"]).default("draft"),
});

interface MethodNameStepProps {
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onCancel: () => void;
}

export function MethodNameStep({ initialData, onNext, onCancel }: MethodNameStepProps) {
  // ACE fulfillment temporarily disabled - defaulting to "self"
  const [selectedMethod, setSelectedMethod] = useState<MailingMethod | null>(
    initialData.mailing_method || "self"
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData.name || "",
      mailing_method: initialData.mailing_method || "self",
      mail_date: initialData.mail_date || "",
      campaign_status: (initialData as any).campaign_status || "draft",
    },
    mode: "onChange",
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    onNext(data);
  };

  const handleMethodSelect = (method: MailingMethod) => {
    setSelectedMethod(method);
    form.setValue("mailing_method", method);
    // Trigger form validation to re-check all fields
    form.trigger();
  };

  const campaignStatus = form.watch("campaign_status");

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Combined Campaign Details Section */}
          <div className="space-y-4">
            {/* Campaign Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-base font-semibold">
                    <FileText className="h-4 w-4 text-primary" />
                    Campaign Name
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" side="right">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Naming Tips</h4>
                          <p className="text-xs text-muted-foreground">
                            Include product, season, or audience. E.g., "Spring 2025 Auto Warranty" or "Q4 Roofing Promo"
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Spring 2025 Auto Warranty Promo"
                      className="h-11"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mail Date and Status - Inline Row */}
            {selectedMethod === "self" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mail_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Mail Date
                        <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-10"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="campaign_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Mailing Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "draft"}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Not mailed yet</SelectItem>
                          <SelectItem value="mailed">Already mailed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Status indicator */}
            {selectedMethod === "self" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${campaignStatus === "mailed" ? "bg-green-500" : "bg-amber-500"}`} />
                {campaignStatus === "mailed" 
                  ? "Campaign will activate immediately for call center processing"
                  : "Campaign will be saved as draft until you mail"}
              </div>
            )}
          </div>

          {/* Mailing Method - Compact Card */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Delivery Method</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Self-Service</Badge>
            </div>

            <FormField
              control={form.control}
              name="mailing_method"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2.5">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">I'm Mailing Myself</h3>
                              <div className="rounded-full bg-primary p-0.5">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Upload contacts with unique codes • We handle redemption & gift card delivery
                            </p>
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1">
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" side="left">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Self-Mailing</h4>
                                <p className="text-xs text-muted-foreground">
                                  You handle printing and mailing with your own mail house. 
                                  We provide code tracking, call center support, and gift card fulfillment.
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 
                    ============================================================
                    ACE FULFILLMENT - TEMPORARILY DISABLED
                    Keep this code for future use, do not delete
                    ============================================================
                    <Card
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg",
                        selectedMethod === "ace_fulfillment"
                          ? "border-primary border-2 bg-primary/5"
                          : "border-2 hover:border-primary/50"
                      )}
                      onClick={() => handleMethodSelect("ace_fulfillment")}
                    >
                      <CardContent className="p-6 text-center relative">
                        {selectedMethod === "ace_fulfillment" && (
                          <div className="absolute top-4 right-4">
                            <div className="rounded-full bg-primary p-1">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                        <Truck className="h-16 w-16 mx-auto mb-4 text-primary" />
                        <h3 className="font-bold text-lg mb-2">ACE Handles Mailing</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Full-service: We design, print, and mail everything for you.
                        </p>
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <strong>Full Service</strong> - We handle design, printing, and delivery
                        </div>
                      </CardContent>
                    </Card>
                    */}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2 border-t">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!form.formState.isValid}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}


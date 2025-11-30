/**
 * MethodNameStep - Modern combined step for campaign name and mailing method
 * 
 * Features:
 * - Hero-style campaign name input
 * - Visual card selection for mailing method
 * - Contextual help with popovers
 * - Real-time validation
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Mail, 
  Truck, 
  HelpCircle, 
  ArrowRight, 
  Sparkles,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { CampaignFormData, MailingMethod } from "@/types/campaigns";

const schema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters").max(100),
  mailing_method: z.enum(["self", "ace_fulfillment"]),
});

interface MethodNameStepProps {
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onCancel: () => void;
}

export function MethodNameStep({ initialData, onNext, onCancel }: MethodNameStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<MailingMethod | null>(
    initialData.mailing_method || null
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData.name || "",
      mailing_method: initialData.mailing_method || ("" as any),
    },
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold">Create Your Campaign</h2>
        </div>
        <p className="text-muted-foreground text-lg">
          Let's start with the basics. Give your campaign a name and choose how you'll deliver it.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Campaign Name - Hero Input */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Campaign Name
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Campaign Name Tips</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose a descriptive name that helps you identify this campaign later. 
                        Include the product, season, or target audience.
                      </p>
                      <div className="text-sm text-muted-foreground">
                        <strong>Examples:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Spring 2025 Roofing Promo</li>
                          <li>Q4 Auto Warranty Campaign</li>
                          <li>New Customer Welcome - Jan 2025</li>
                        </ul>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardTitle>
              <CardDescription>
                This helps you identify and organize your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="e.g., Spring 2025 Auto Warranty Promo"
                        className="text-xl py-6 font-medium"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Mailing Method Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">How will you deliver the mail?</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Mailing Options</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Self-Mailing:</strong> You handle printing and sending. We provide codes and redemption tracking.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>ACE Fulfillment:</strong> We handle everything - design, printing, and mailing for you.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <FormField
              control={form.control}
              name="mailing_method"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Self-Mailing Card */}
                      <Card
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-lg",
                          selectedMethod === "self"
                            ? "border-primary border-2 bg-primary/5"
                            : "border-2 hover:border-primary/50"
                        )}
                        onClick={() => handleMethodSelect("self")}
                      >
                        <CardContent className="p-6 text-center relative">
                          {selectedMethod === "self" && (
                            <div className="absolute top-4 right-4">
                              <div className="rounded-full bg-primary p-1">
                                <Check className="h-4 w-4 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                          <Mail className="h-16 w-16 mx-auto mb-4 text-primary" />
                          <h3 className="font-bold text-lg mb-2">I'm Mailing Myself</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            You already have your designs and mail house. We'll provide codes and handle redemption.
                          </p>
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            <strong>Most Common</strong> - Quick setup, just upload your codes
                          </div>
                        </CardContent>
                      </Card>

                      {/* ACE Fulfillment Card */}
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
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="lg"
              disabled={!form.formState.isValid || !selectedMethod}
              className="min-w-[180px]"
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


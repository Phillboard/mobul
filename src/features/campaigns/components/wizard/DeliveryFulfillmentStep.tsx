import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Package, DollarSign, Truck } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from '@shared/utils/cn';
import { useCampaignCostEstimate } from "@/hooks/useCampaignCostEstimate";
import type { CampaignFormData } from "@/types/campaigns";

const deliverySchema = z.object({
  postage: z.enum(["first_class", "standard"]),
  mail_date_mode: z.enum(["asap", "scheduled"]),
  mail_date: z.date().nullable(),
}).refine((data) => {
  if (data.mail_date_mode === "scheduled" && !data.mail_date) {
    return false;
  }
  return true;
}, {
  message: "Mail date is required when scheduling",
  path: ["mail_date"],
});

type DeliveryFormData = z.infer<typeof deliverySchema>;

interface DeliveryFulfillmentStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  recipientCount: number;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function DeliveryFulfillmentStep({ 
  clientId, 
  initialData, 
  recipientCount,
  onNext, 
  onBack 
}: DeliveryFulfillmentStepProps) {
  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      postage: initialData.postage || "standard",
      mail_date_mode: initialData.mail_date_mode || "asap",
      mail_date: initialData.mail_date || null,
    },
  });

  const mailDateMode = form.watch("mail_date_mode");
  const postage = form.watch("postage");
  const minDate = addDays(new Date(), 3);

  const costEstimate = useCampaignCostEstimate({
    size: initialData.size,
    postage,
    recipientCount,
  });

  const { data: mailProvider } = useQuery({
    queryKey: ['mail-provider-settings', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mail_provider_settings')
        .select('provider_type, postgrid_enabled, custom_enabled, custom_provider_name')
        .eq('client_id', clientId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const onSubmit = (data: DeliveryFormData) => {
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Delivery & Fulfillment</h2>
        <p className="text-muted-foreground mt-2">
          Configure when and how your mail will be sent
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="postage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postage Class</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="first_class" id="first_class" className="mt-1" />
                      <div className="flex-1">
                        <label htmlFor="first_class" className="font-medium cursor-pointer block">
                          First Class
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Faster delivery (2-5 days) • $0.73/piece
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="standard" id="standard" className="mt-1" />
                      <div className="flex-1">
                        <label htmlFor="standard" className="font-medium cursor-pointer block">
                          Standard Mail
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Standard delivery (5-10 days) • $0.48/piece
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="mail_date_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mail Date</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="asap" id="asap" />
                        <label htmlFor="asap" className="cursor-pointer">
                          ASAP ({format(minDate, "MMM d, yyyy")})
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="scheduled" id="scheduled" />
                        <label htmlFor="scheduled" className="cursor-pointer">
                          Schedule Date
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mailDateMode === "scheduled" && (
              <FormField
                control={form.control}
                name="mail_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < minDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Minimum 3 business days from today
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Mail Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mailProvider ? (
                <Alert>
                  <Package className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">
                      {mailProvider.postgrid_enabled && "PostGrid"}
                      {mailProvider.custom_enabled && mailProvider.custom_provider_name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Mail will be submitted via your configured provider
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    No mail provider configured. Configure in Settings → Mail Provider
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {costEstimate && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Recipients</div>
                    <div className="text-2xl font-bold">{recipientCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Mail Size</div>
                    <div className="text-2xl font-bold">{initialData.size}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Postage</div>
                    <div className="text-2xl font-bold">
                      {postage === "first_class" ? "First" : "Standard"}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Printing:</span>
                    <span className="font-mono">{costEstimate.formattedPrinting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Postage:</span>
                    <span className="font-mono">{costEstimate.formattedPostage}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Estimated Total:</span>
                    <span className="font-mono">{costEstimate.formattedTotal}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Next: Review & Create</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

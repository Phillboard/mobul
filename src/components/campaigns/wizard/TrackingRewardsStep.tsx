import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Gift, AlertCircle } from "lucide-react";
import { useTrackedNumbers } from "@/hooks/useCallTracking";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";
import type { CampaignFormData, LandingPageMode } from "@/types/campaigns";

const trackingRewardsSchema = z.object({
  enableCallTracking: z.boolean().default(false),
  trackedNumberId: z.string().optional(),
  lp_mode: z.enum(["bridge", "purl", "direct"]).default("bridge"),
  base_lp_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  utm_source: z.string().min(1, "UTM source is required"),
  utm_medium: z.string().min(1, "UTM medium is required"),
  utm_campaign: z.string().min(1, "UTM campaign is required"),
  condition1PoolId: z.string().optional(),
  condition1SmsTemplate: z.string().optional(),
}).refine((data) => {
  if ((data.lp_mode === "direct" || data.lp_mode === "purl") && !data.base_lp_url) {
    return false;
  }
  return true;
}, {
  message: "Base URL is required for external redirect",
  path: ["base_lp_url"],
});

type TrackingRewardsFormData = z.infer<typeof trackingRewardsSchema>;

interface TrackingRewardsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function TrackingRewardsStep({ clientId, initialData, onNext, onBack }: TrackingRewardsStepProps) {
  const { data: trackedNumbers, isLoading: loadingNumbers } = useTrackedNumbers(clientId);
  const { pools: giftCardPools, isLoading: loadingPools } = useGiftCardPools(clientId);

  // Generate slug from campaign name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const form = useForm<TrackingRewardsFormData>({
    resolver: zodResolver(trackingRewardsSchema),
    defaultValues: {
      enableCallTracking: initialData.enableCallTracking || false,
      trackedNumberId: initialData.trackedNumberId,
      lp_mode: initialData.lp_mode || "bridge",
      base_lp_url: initialData.base_lp_url || "",
      utm_source: initialData.utm_source || "directmail",
      utm_medium: initialData.utm_medium || "postcard",
      utm_campaign: initialData.utm_campaign || generateSlug(initialData.name || ""),
      condition1PoolId: initialData.condition1PoolId,
      condition1SmsTemplate: initialData.condition1SmsTemplate || "Hi {first_name}! Thanks for calling. Your ${value} {provider} gift card: {code}",
    },
  });

  const enableCallTracking = form.watch("enableCallTracking");
  const lpMode = form.watch("lp_mode");

  const availableNumbers = trackedNumbers?.filter(n => n.status === 'available') || [];
  const availablePools = giftCardPools?.filter(p => (p.available_cards || 0) > 0) || [];

  const onSubmit = (data: TrackingRewardsFormData) => {
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tracking & Rewards</h2>
        <p className="text-muted-foreground mt-2">
          Configure call tracking, personalized URLs, and automated rewards
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Call Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enableCallTracking"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Call Tracking</FormLabel>
                      <FormDescription>
                        Track inbound calls and trigger automated gift card rewards
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {enableCallTracking && (
                <>
                  {loadingNumbers ? (
                    <p className="text-sm text-muted-foreground">Loading numbers...</p>
                  ) : availableNumbers.length > 0 ? (
                    <FormField
                      control={form.control}
                      name="trackedNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an available number" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableNumbers.map((number) => (
                                <SelectItem key={number.id} value={number.id}>
                                  {number.phone_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No available phone numbers. Configure Twilio in settings to provision numbers.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Card className="border-2 border-primary/10">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Identity Verification Reward
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="condition1PoolId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gift Card Pool</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a gift card pool" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingPools ? (
                                  <SelectItem value="loading" disabled>Loading pools...</SelectItem>
                                ) : availablePools.length > 0 ? (
                                  availablePools.map((pool) => (
                                    <SelectItem key={pool.id} value={pool.id}>
                                      {pool.pool_name} - ${pool.card_value} ({pool.available_cards} available)
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>No pools with available cards</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="condition1SmsTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMS Template</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Hi {first_name}! Your ${value} reward: {code}"
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Variables: {'{first_name}'}, {'{last_name}'}, {'{value}'}, {'{provider}'}, {'{code}'}
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>

          {/* PURL Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personalized URLs (PURL)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                              Use our hosted landing page with your branding
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 border rounded-lg">
                          <RadioGroupItem value="direct" id="direct" className="mt-1" />
                          <div className="flex-1">
                            <label htmlFor="direct" className="font-medium cursor-pointer block">
                              External Redirect
                            </label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Redirect directly to your website with tracking
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {lpMode === "direct" && (
                <FormField
                  control={form.control}
                  name="base_lp_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Landing Page URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourdomain.com/special-offer" {...field} />
                      </FormControl>
                      <FormDescription>
                        Where recipients will land when they visit their personalized link
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="utm_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Source</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Next: Delivery Settings</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

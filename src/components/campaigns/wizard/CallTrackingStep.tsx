import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Gift, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTrackedNumbers } from "@/hooks/useCallTracking";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";

const callTrackingSchema = z.object({
  enableCallTracking: z.boolean(),
  trackedNumberId: z.string().optional(),
  provisionNew: z.boolean().default(false),
  
  // Condition 1
  condition1Enabled: z.boolean().default(true),
  condition1Name: z.string().default("Identity Verified"),
  condition1PoolId: z.string().optional(),
  condition1SmsTemplate: z.string().optional(),
  
  // Condition 2
  condition2Enabled: z.boolean().default(false),
  condition2Name: z.string().default("Appointment Set"),
  condition2TriggerType: z.enum(["manual_agent", "crm_webhook"]).default("manual_agent"),
  condition2CrmEvent: z.string().optional(),
  condition2PoolId: z.string().optional(),
  condition2SmsTemplate: z.string().optional(),
  
  // Condition 3
  condition3Enabled: z.boolean().default(false),
  condition3Name: z.string().default("Sale Closed"),
  condition3TriggerType: z.enum(["manual_agent", "crm_webhook"]).default("manual_agent"),
  condition3CrmEvent: z.string().optional(),
  condition3PoolId: z.string().optional(),
  condition3SmsTemplate: z.string().optional(),
});

type CallTrackingFormData = z.infer<typeof callTrackingSchema>;

interface CallTrackingStepProps {
  clientId: string;
  formData: any;
  onBack: () => void;
  onNext: (data: CallTrackingFormData) => void;
}

export function CallTrackingStep({ clientId, formData, onBack, onNext }: CallTrackingStepProps) {
  const { data: trackedNumbers, isLoading: loadingNumbers } = useTrackedNumbers(clientId);
  const { pools: giftCardPools, isLoading: loadingPools } = useGiftCardPools(clientId);

  const form = useForm<CallTrackingFormData>({
    resolver: zodResolver(callTrackingSchema),
    defaultValues: {
      enableCallTracking: formData.enableCallTracking ?? false,
      trackedNumberId: formData.trackedNumberId,
      provisionNew: formData.provisionNew ?? false,
      
      condition1Enabled: formData.condition1Enabled ?? true,
      condition1Name: formData.condition1Name ?? "Identity Verified",
      condition1PoolId: formData.condition1PoolId,
      condition1SmsTemplate: formData.condition1SmsTemplate ?? "Hi {first_name}! Thanks for calling. Your ${value} {provider} gift card: {code}",
      
      condition2Enabled: formData.condition2Enabled ?? false,
      condition2Name: formData.condition2Name ?? "Appointment Set",
      condition2TriggerType: formData.condition2TriggerType ?? "manual_agent",
      condition2CrmEvent: formData.condition2CrmEvent,
      condition2PoolId: formData.condition2PoolId,
      condition2SmsTemplate: formData.condition2SmsTemplate ?? "Great news {first_name}! Your ${value} {provider} reward: {code}",
      
      condition3Enabled: formData.condition3Enabled ?? false,
      condition3Name: formData.condition3Name ?? "Sale Closed",
      condition3TriggerType: formData.condition3TriggerType ?? "manual_agent",
      condition3CrmEvent: formData.condition3CrmEvent,
      condition3PoolId: formData.condition3PoolId,
      condition3SmsTemplate: formData.condition3SmsTemplate ?? "Congratulations {first_name}! Your ${value} {provider} bonus: {code}",
    },
  });

  const enableCallTracking = form.watch("enableCallTracking");
  const condition2Enabled = form.watch("condition2Enabled");
  const condition3Enabled = form.watch("condition3Enabled");
  const condition2TriggerType = form.watch("condition2TriggerType");
  const condition3TriggerType = form.watch("condition3TriggerType");

  const availableNumbers = trackedNumbers?.filter(n => n.status === 'available') || [];
  const availablePools = giftCardPools?.filter(p => (p.available_cards || 0) > 0) || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="enableCallTracking"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Enable Call Tracking
                  </FormLabel>
                  <FormDescription>
                    Track inbound calls and trigger automated gift card rewards
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {enableCallTracking && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Tracked Phone Number
                  </CardTitle>
                  <CardDescription>
                    Assign a phone number to track calls for this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingNumbers ? (
                    <p className="text-sm text-muted-foreground">Loading numbers...</p>
                  ) : availableNumbers.length > 0 ? (
                    <FormField
                      control={form.control}
                      name="trackedNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Number</FormLabel>
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
                        No available phone numbers. You'll need to provision a new number from Twilio.
                      </AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="provisionNew"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Provision New Number</FormLabel>
                          <FormDescription>
                            Automatically provision a new Twilio number (requires Twilio configuration)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Reward Conditions
                  </CardTitle>
                  <CardDescription>
                    Configure up to 3 automated gift card rewards triggered during calls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Condition 1 */}
                  <div className="space-y-4 border-b border-border pb-6">
                    <FormField
                      control={form.control}
                      name="condition1Enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel className="text-base">Condition 1 (Immediate)</FormLabel>
                            <FormDescription>Triggered when agent verifies caller identity</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition1Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Identity Verified" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

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
                            Available variables: {'{first_name}'}, {'{last_name}'}, {'{value}'}, {'{provider}'}, {'{code}'}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Condition 2 */}
                  <div className="space-y-4 border-b border-border pb-6">
                    <FormField
                      control={form.control}
                      name="condition2Enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel className="text-base">Condition 2</FormLabel>
                            <FormDescription>Second milestone reward (e.g., appointment set)</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {condition2Enabled && (
                      <>
                        <FormField
                          control={form.control}
                          name="condition2Name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Condition Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Appointment Set" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="condition2TriggerType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trigger Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="manual_agent">Manual (Agent clicks button)</SelectItem>
                                  <SelectItem value="crm_webhook">CRM Webhook</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {condition2TriggerType === "crm_webhook" && (
                          <FormField
                            control={form.control}
                            name="condition2CrmEvent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CRM Event Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="appointment.completed" />
                                </FormControl>
                                <FormDescription>
                                  The event name your CRM sends in the webhook
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="condition2PoolId"
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
                                  {availablePools.map((pool) => (
                                    <SelectItem key={pool.id} value={pool.id}>
                                      {pool.pool_name} - ${pool.card_value} ({pool.available_cards} available)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="condition2SmsTemplate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SMS Template</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={3} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  {/* Condition 3 */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="condition3Enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel className="text-base">Condition 3</FormLabel>
                            <FormDescription>Final milestone reward (e.g., sale closed)</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {condition3Enabled && (
                      <>
                        <FormField
                          control={form.control}
                          name="condition3Name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Condition Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Sale Closed" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="condition3TriggerType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trigger Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="manual_agent">Manual (Agent clicks button)</SelectItem>
                                  <SelectItem value="crm_webhook">CRM Webhook</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {condition3TriggerType === "crm_webhook" && (
                          <FormField
                            control={form.control}
                            name="condition3CrmEvent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CRM Event Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="deal.won" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="condition3PoolId"
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
                                  {availablePools.map((pool) => (
                                    <SelectItem key={pool.id} value={pool.id}>
                                      {pool.pool_name} - ${pool.card_value} ({pool.available_cards} available)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="condition3SmsTemplate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SMS Template</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={3} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit">Next</Button>
        </div>
      </form>
    </Form>
  );
}

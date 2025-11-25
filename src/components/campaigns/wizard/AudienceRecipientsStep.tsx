import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useAudiencePreview } from "@/hooks/useAudiencePreview";
import type { CampaignFormData } from "@/types/campaigns";

const audienceSchema = z.object({
  audience_id: z.string().min(1, "Audience is required"),
});

type AudienceFormData = z.infer<typeof audienceSchema>;

interface AudienceRecipientsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function AudienceRecipientsStep({ clientId, initialData, onNext, onBack }: AudienceRecipientsStepProps) {
  const form = useForm<AudienceFormData>({
    resolver: zodResolver(audienceSchema),
    defaultValues: {
      audience_id: initialData.audience_id || "",
    },
  });

  const selectedAudienceId = form.watch("audience_id");

  const { data: audiences } = useQuery({
    queryKey: ["audiences", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audiences")
        .select("id, name, valid_count, status")
        .eq("client_id", clientId)
        .eq("status", "ready")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: giftCardPools } = useQuery({
    queryKey: ["gift-card-pools", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, pool_name, available_cards, total_cards")
        .eq("client_id", clientId)
        .order("pool_name");

      if (error) throw error;
      return data;
    },
  });

  const { data: recipientPreview, isLoading: loadingPreview } = useAudiencePreview(
    selectedAudienceId,
    !!selectedAudienceId
  );

  const selectedAudience = audiences?.find(a => a.id === selectedAudienceId);

  const onSubmit = (data: AudienceFormData) => {
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audience & Recipients</h2>
        <p className="text-muted-foreground mt-2">
          Select which audience will receive this campaign
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="audience_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Audience</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an audience" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background z-50">
                    {audiences?.map((audience) => (
                      <SelectItem key={audience.id} value={audience.id}>
                        {audience.name} ({audience.valid_count} recipients)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Recipients will be imported from this audience
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedAudience && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recipient Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {selectedAudience.valid_count.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recipients in {selectedAudience.name}
                  </p>
                </CardContent>
              </Card>

              {recipientPreview && recipientPreview.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sample Recipients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipientPreview.map((recipient) => (
                          <TableRow key={recipient.id}>
                            <TableCell>
                              {recipient.first_name} {recipient.last_name}
                            </TableCell>
                            <TableCell className="text-sm">{recipient.email || '—'}</TableCell>
                            <TableCell className="text-sm">{recipient.phone || '—'}</TableCell>
                            <TableCell className="text-sm">
                              {recipient.city && recipient.state 
                                ? `${recipient.city}, ${recipient.state}` 
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 5 of {selectedAudience.valid_count} recipients
                    </p>
                  </CardContent>
                </Card>
              )}

              {giftCardPools && giftCardPools.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Gift Card Inventory Check</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {giftCardPools.map(pool => {
                      const audienceCount = selectedAudience.valid_count;
                      const isLow = pool.available_cards < audienceCount;
                      const isSufficient = pool.available_cards >= audienceCount;
                      
                      return (
                        <Alert key={pool.id} variant={isLow ? "destructive" : "default"}>
                          <div className="flex items-start gap-3">
                            {isSufficient ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5" />
                            )}
                            <div className="flex-1">
                              <AlertDescription>
                                <div className="font-semibold">{pool.pool_name}</div>
                                <div className="text-sm mt-1">
                                  {pool.available_cards} available cards
                                  {isLow && (
                                    <span className="text-red-600 ml-2">
                                      (Need {audienceCount}, short by {audienceCount - pool.available_cards})
                                    </span>
                                  )}
                                </div>
                              </AlertDescription>
                            </div>
                          </div>
                        </Alert>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="flex justify-between gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={!selectedAudienceId}>
              Next: Configure Tracking
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

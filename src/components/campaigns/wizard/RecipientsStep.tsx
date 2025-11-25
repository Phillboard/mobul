import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useListPreview } from "@/hooks/useListPreview";
import { useContactTags } from "@/hooks/useContactTags";
import { TagSelector } from "./TagSelector";
import type { CampaignFormData } from "@/types/campaigns";

const recipientsSchema = z.object({
  contact_list_id: z.string().min(1, "List or segment is required"),
  recipient_source: z.enum(["list", "segment"]).default("list"),
  tag_filters: z.array(z.string()).optional(),
});

type RecipientsFormData = z.infer<typeof recipientsSchema>;

interface RecipientsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function RecipientsStep({ clientId, initialData, onNext, onBack }: RecipientsStepProps) {
  const [sourceType, setSourceType] = useState<"list" | "segment">(
    initialData.recipient_source || "list"
  );

  const form = useForm<RecipientsFormData>({
    resolver: zodResolver(recipientsSchema),
    defaultValues: {
      contact_list_id: initialData.contact_list_id || "",
      recipient_source: initialData.recipient_source || "list",
      tag_filters: initialData.tag_filters || [],
    },
  });

  const selectedListId = form.watch("contact_list_id");
  const selectedTags = form.watch("tag_filters") || [];

  const { data: contactLists } = useQuery({
    queryKey: ["contact-lists", clientId, sourceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_lists")
        .select("id, name, contact_count, list_type")
        .eq("client_id", clientId)
        .eq("list_type", sourceType === "list" ? "static" : "dynamic")
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

  const { data: availableTags } = useContactTags(clientId);

  const { data: contactPreview, isLoading: loadingPreview } = useListPreview(
    selectedListId,
    !!selectedListId
  );

  const selectedList = contactLists?.find(l => l.id === selectedListId);

  const onSubmit = (data: RecipientsFormData) => {
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Recipients</h2>
        <p className="text-muted-foreground mt-2">
          Choose a contact list or segment for this campaign
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={sourceType}
                onValueChange={(value) => {
                  setSourceType(value as "list" | "segment");
                  form.setValue("recipient_source", value as "list" | "segment");
                  form.setValue("contact_list_id", ""); // Reset selection
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list">📋 Lists</TabsTrigger>
                  <TabsTrigger value="segment">🔄 Segments</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-sm text-muted-foreground mt-2">
                {sourceType === "list" 
                  ? "Static contact lists - manually curated groups"
                  : "Dynamic segments - automatically update based on rules"}
              </p>
            </CardContent>
          </Card>

          <FormField
            control={form.control}
            name="contact_list_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select {sourceType === "list" ? "List" : "Segment"}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${sourceType}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background z-50">
                    {contactLists?.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.contact_count || 0} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Recipients will be imported from this {sourceType}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {availableTags && availableTags.length > 0 && (
            <FormField
              control={form.control}
              name="tag_filters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filter by Tags (Optional)</FormLabel>
                  <FormControl>
                    <TagSelector
                      selectedTags={field.value || []}
                      availableTags={availableTags}
                      onTagsChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Only contacts with these tags will be included
                  </FormDescription>
                </FormItem>
              )}
            />
          )}

          {selectedList && (
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
                    {selectedList.contact_count?.toLocaleString() || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contacts in {selectedList.name}
                  </p>
                  {selectedTags.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Filtered by {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
                    </p>
                  )}
                </CardContent>
              </Card>

              {contactPreview && contactPreview.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sample Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Tags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contactPreview.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell>
                              {contact.first_name} {contact.last_name}
                            </TableCell>
                            <TableCell className="text-sm">{contact.email || '—'}</TableCell>
                            <TableCell className="text-sm">{contact.phone || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {contact.tags?.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {contact.tags && contact.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{contact.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 5 of {selectedList.contact_count || 0} contacts
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
                      const contactCount = selectedList.contact_count || 0;
                      const isLow = pool.available_cards < contactCount;
                      const isSufficient = pool.available_cards >= contactCount;
                      
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
                                      (Need {contactCount}, short by {contactCount - pool.available_cards})
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
            <Button type="submit" disabled={!selectedListId}>
              Next: Configure Tracking
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

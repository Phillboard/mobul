import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import type { CampaignFormData } from "@/types/campaigns";
import { useContactLists } from "@/hooks/useContactLists";
import { useListPreview } from "@/hooks/useListPreview";
import { useContactTags } from "@/hooks/useContactTags";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagSelector } from "../wizard/TagSelector";
import { Users, Filter } from "lucide-react";

interface RecipientsSectionProps {
  form: UseFormReturn<Partial<CampaignFormData>>;
  clientId: string;
}

export function RecipientsSection({ form, clientId }: RecipientsSectionProps) {
  const recipientSource = form.watch("recipient_source") || "list";
  const contactListId = form.watch("contact_list_id");
  const tagFilters = form.watch("tag_filters") || [];

  const { data: staticLists } = useContactLists("static");
  const { data: segments } = useContactLists("dynamic");
  const { data: availableTags } = useContactTags(clientId);

  const { data: preview } = useListPreview(contactListId, tagFilters || []);

  const handleSourceChange = (value: string) => {
    form.setValue("recipient_source", value as "list" | "segment");
    form.setValue("contact_list_id", undefined);
    form.setValue("tag_filters", []);
  };

  const handleListChange = (value: string) => {
    form.setValue("contact_list_id", value);
  };

  const handleTagsChange = (tags: string[]) => {
    form.setValue("tag_filters", tags);
  };

  const currentLists = recipientSource === "segment" ? segments : staticLists;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Recipients
        </CardTitle>
        <CardDescription>
          Who will receive this campaign?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={recipientSource} onValueChange={handleSourceChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">📋 Lists</TabsTrigger>
            <TabsTrigger value="segment">🔄 Segments</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="list-select">
                Select List <span className="text-destructive">*</span>
              </Label>
              <Select value={contactListId} onValueChange={handleListChange}>
                <SelectTrigger id="list-select">
                  <SelectValue placeholder="Choose a contact list" />
                </SelectTrigger>
                <SelectContent>
                  {currentLists?.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.contact_count || 0} contacts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="segment" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="segment-select">
                Select Segment <span className="text-destructive">*</span>
              </Label>
              <Select value={contactListId} onValueChange={handleListChange}>
                <SelectTrigger id="segment-select">
                  <SelectValue placeholder="Choose a dynamic segment" />
                </SelectTrigger>
                <SelectContent>
                  {currentLists?.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name} ({segment.contact_count || 0} contacts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tag Filter */}
        {contactListId && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by tags (optional)
            </Label>
            <TagSelector
              selectedTags={tagFilters}
              onTagsChange={handleTagsChange}
              availableTags={availableTags?.map(t => ({ tag: t.tag, count: t.count })) || []}
            />
          </div>
        )}

        {/* Recipient Count */}
        {preview && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground text-lg">{preview.length}</span> recipient{preview.length !== 1 ? "s" : ""} will receive this campaign
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

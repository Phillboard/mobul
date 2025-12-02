import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Lock, Save, History } from "lucide-react";
import { canEditCampaignField } from "@/lib/validation/campaignValidation";

interface EditCampaignDialogProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCampaignDialog({ 
  campaignId, 
  open, 
  onOpenChange 
}: EditCampaignDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("settings");
  const [formData, setFormData] = useState<any>({});

  // Fetch campaign details
  const { data: campaign, isLoading, error: campaignError } = useQuery({
    queryKey: ["campaign-edit", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) {
        console.error("Failed to fetch campaign:", error);
        throw error;
      }
      setFormData(data);
      return data;
    },
    enabled: open && !!campaignId,
  });

  // Fetch landing pages for selection
  const { data: landingPages } = useQuery({
    queryKey: ["landing-pages-for-edit", campaign?.client_id],
    queryFn: async () => {
      if (!campaign?.client_id) return [];
      
      const { data, error } = await supabase
        .from("landing_pages")
        .select("id, name, public_url")
        .eq("client_id", campaign.client_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Failed to fetch landing pages:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!campaign?.client_id,
  });

  // Fetch gift card brands for rewards (replaced old pools system)
  const { data: giftCardBrands } = useQuery({
    queryKey: ["gift-card-brands-for-edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_brands")
        .select("id, brand_name")
        .eq("is_active", true)
        .order("brand_name");

      if (error) {
        console.warn("Failed to fetch gift card brands:", error);
        return [];
      }
      return data || [];
    },
    enabled: open,
  });

  // Fetch version history (optional - may not exist yet)
  const { data: versions } = useQuery({
    queryKey: ["campaign-versions", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_versions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.warn("Version history not available:", error);
        return [];
      }
      return data || [];
    },
    enabled: open && !!campaignId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Try to create version snapshot (optional - table may not exist)
      try {
        await supabase
          .from("campaign_versions")
          .insert({
            campaign_id: campaignId,
            version_number: (campaign?.version || 0) + 1,
            changes: formData,
            previous_state: campaign,
          });
      } catch (versionError) {
        console.warn("Version history not available:", versionError);
        // Continue without versioning
      }

      // Build update object with only changed fields
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      // Only update fields that have changed and are allowed to be updated
      if (formData.name !== campaign.name) updates.name = formData.name;
      if (formData.mail_date !== campaign.mail_date) updates.mail_date = formData.mail_date;
      if (formData.status !== campaign.status) updates.status = formData.status;
      if (formData.landing_page_id !== campaign.landing_page_id) updates.landing_page_id = formData.landing_page_id;
      if (formData.rewards_enabled !== campaign.rewards_enabled) updates.rewards_enabled = formData.rewards_enabled;
      if (formData.reward_brand_id !== campaign.reward_brand_id) updates.reward_brand_id = formData.reward_brand_id;
      if (formData.reward_condition !== campaign.reward_condition) updates.reward_condition = formData.reward_condition;

      // Update campaign
      const { error: updateError } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", campaignId);

      if (updateError) {
        console.error("Campaign update error:", updateError);
        throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-edit", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campaign Updated",
        description: "Your changes have been saved successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Save mutation error:", error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <p>Loading campaign details...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (campaignError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Campaign</AlertTitle>
            <AlertDescription>
              {campaignError instanceof Error ? campaignError.message : "Failed to load campaign details"}
            </AlertDescription>
          </Alert>
          <Button onClick={() => onOpenChange(false)} className="mt-4">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (!campaign) return null;

  const settingsEditable = canEditCampaignField(campaign.status, "name", campaign.editable_after_publish);
  const landingPageEditable = canEditCampaignField(campaign.status, "landing_page_id", campaign.editable_after_publish);
  const rewardsEditable = canEditCampaignField(campaign.status, "reward_pool_id", campaign.editable_after_publish);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
          <DialogDescription>
            Update campaign settings. Note: Codes and recipients cannot be changed after creation.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="landing-page">Landing Page</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!settingsEditable.canEdit}
                />
                {!settingsEditable.canEdit && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {settingsEditable.reason}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mail_date">Mail Date</Label>
                <Input
                  id="mail_date"
                  type="date"
                  value={formData.mail_date || ""}
                  onChange={(e) => setFormData({ ...formData, mail_date: e.target.value })}
                  disabled={campaign.status === "mailed"}
                />
                {campaign.status === "mailed" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Cannot change mail date after campaign has been mailed
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || ""}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_production">In Production</SelectItem>
                    <SelectItem value="mailed">Mailed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="landing-page" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can change the landing page at any time, even after the campaign is published.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="landing_page">Select Landing Page</Label>
                <Select
                  value={formData.landing_page_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, landing_page_id: value })}
                  disabled={!landingPageEditable.canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a landing page..." />
                  </SelectTrigger>
                  <SelectContent>
                    {landingPages?.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.landing_page_id && landingPages?.length > 0 && (
                <div className="border rounded-lg p-3 bg-muted">
                  <div className="font-medium">
                    Current: {landingPages.find(lp => lp.id === formData.landing_page_id)?.name || 'Unknown'}
                  </div>
                  {landingPages.find(lp => lp.id === formData.landing_page_id)?.public_url && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {landingPages.find(lp => lp.id === formData.landing_page_id)?.public_url}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can adjust reward settings, but be careful if cards have already been claimed.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="rewards_enabled">Rewards Enabled</Label>
                <Select
                  value={formData.rewards_enabled ? "true" : "false"}
                  onValueChange={(value) => setFormData({ ...formData, rewards_enabled: value === "true" })}
                  disabled={!rewardsEditable.canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.rewards_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reward_brand">Gift Card Brand</Label>
                    <Select
                      value={formData.reward_brand_id || ""}
                      onValueChange={(value) => setFormData({ ...formData, reward_brand_id: value })}
                      disabled={!rewardsEditable.canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        {giftCardBrands?.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.brand_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Note: Gift card rewards are now configured per condition in campaign conditions
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reward_condition">Reward Condition</Label>
                    <Select
                      value={formData.reward_condition || "form_submission"}
                      onValueChange={(value) => setFormData({ ...formData, reward_condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="form_submission">Form Submission</SelectItem>
                        <SelectItem value="call_completed">Call Completed</SelectItem>
                        <SelectItem value="immediate">Immediate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <h3 className="font-medium">Version History</h3>
                <Badge variant="outline">v{campaign.version || 1}</Badge>
              </div>

              {versions && versions.length > 0 ? (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div key={version.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Version {version.version_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(version.created_at).toLocaleString()}
                          </div>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      {version.changes && Object.keys(version.changes).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Changed: {Object.keys(version.changes).join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No version history available.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


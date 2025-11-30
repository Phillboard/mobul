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
  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign-edit", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          landing_pages (id, name, public_url),
          gift_card_pools (id, pool_name, card_value, available_cards)
        `)
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      setFormData(data);
      return data;
    },
    enabled: open,
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.client_id,
  });

  // Fetch gift card pools for selection
  const { data: giftCardPools } = useQuery({
    queryKey: ["gift-card-pools-for-edit", campaign?.client_id],
    queryFn: async () => {
      if (!campaign?.client_id) return [];
      
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, pool_name, card_value, available_cards")
        .eq("client_id", campaign.client_id)
        .order("pool_name");

      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.client_id,
  });

  // Fetch version history
  const { data: versions } = useQuery({
    queryKey: ["campaign-versions", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_versions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Create version snapshot first
      const { error: versionError } = await supabase
        .from("campaign_versions")
        .insert({
          campaign_id: campaignId,
          version_number: (campaign?.version || 0) + 1,
          changes: formData,
          previous_state: campaign,
        });

      if (versionError) throw versionError;

      // Update campaign
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          ...formData,
          version: (campaign?.version || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (updateError) throw updateError;
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

              {campaign.landing_pages && (
                <div className="border rounded-lg p-3 bg-muted">
                  <div className="font-medium">Current: {campaign.landing_pages.name}</div>
                  {campaign.landing_pages.public_url && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {campaign.landing_pages.public_url}
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
                    <Label htmlFor="reward_pool">Gift Card Pool</Label>
                    <Select
                      value={formData.reward_pool_id || ""}
                      onValueChange={(value) => setFormData({ ...formData, reward_pool_id: value })}
                      disabled={!rewardsEditable.canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a pool..." />
                      </SelectTrigger>
                      <SelectContent>
                        {giftCardPools?.map((pool) => (
                          <SelectItem key={pool.id} value={pool.id}>
                            {pool.pool_name} - ${pool.card_value} ({pool.available_cards} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              {campaign.gift_card_pools && (
                <div className="border rounded-lg p-3 bg-muted">
                  <div className="font-medium">Current Pool: {campaign.gift_card_pools.pool_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ${campaign.gift_card_pools.card_value} • {campaign.gift_card_pools.available_cards} available
                  </div>
                </div>
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
            {saveMutation.isPending ? "Saving..." : "Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


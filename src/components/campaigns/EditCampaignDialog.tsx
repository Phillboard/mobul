import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Lock, Save, History, Plus, Trash2, Gift } from "lucide-react";
import { canEditCampaignField } from "@/lib/validation/campaignValidation";
import { SimpleBrandDenominationSelector } from "@/components/gift-cards/SimpleBrandDenominationSelector";

// Trigger types matching the modern condition system
const TRIGGER_TYPES = [
  { 
    value: "manual_agent", 
    label: "Agent Accepted", 
    description: "Call center agent marks condition as met"
  },
  { 
    value: "call_completed", 
    label: "Call Completed", 
    description: "Automatically triggers when call ends"
  },
  { 
    value: "form_submitted", 
    label: "Form Submitted", 
    description: "Customer submits the landing page form"
  },
  { 
    value: "time_delay", 
    label: "Time Delay", 
    description: "Automatic trigger after specified time"
  },
];

interface Condition {
  id: string;
  condition_number: number;
  condition_name: string;
  trigger_type: string;
  brand_id?: string;
  card_value?: number;
  brand_name?: string;
  sms_template?: string;
  is_active: boolean;
}

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
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [conditionsLoaded, setConditionsLoaded] = useState(false);

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

  // Fetch campaign conditions
  const { data: existingConditions } = useQuery({
    queryKey: ["campaign-conditions-edit", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_conditions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("condition_number");

      if (error) {
        console.warn("Failed to fetch conditions:", error);
        return [];
      }
      return data || [];
    },
    enabled: open && !!campaignId,
  });

  // Load conditions into state when fetched
  useEffect(() => {
    if (existingConditions && !conditionsLoaded) {
      if (existingConditions.length > 0) {
        setConditions(existingConditions.map(c => ({
          id: c.id,
          condition_number: c.condition_number,
          condition_name: c.condition_name,
          trigger_type: c.trigger_type,
          brand_id: c.brand_id || undefined,
          card_value: c.card_value || undefined,
          sms_template: c.sms_template || "Hi {first_name}! Your ${value} {provider} gift card: {link}",
          is_active: c.is_active,
        })));
      } else {
        // Default condition if none exist
        setConditions([{
          id: crypto.randomUUID(),
          condition_number: 1,
          condition_name: "Listened to sales call",
          trigger_type: "manual_agent",
          sms_template: "Hi {first_name}! Thanks for your time. Here's your ${value} {provider} gift card: {link}",
          is_active: true,
        }]);
      }
      setConditionsLoaded(true);
    }
  }, [existingConditions, conditionsLoaded]);

  // Reset conditions loaded state when dialog closes
  useEffect(() => {
    if (!open) {
      setConditionsLoaded(false);
    }
  }, [open]);

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

  // Condition management functions
  const handleAddCondition = () => {
    if (conditions.length >= 3) {
      toast({
        title: "Maximum Conditions",
        description: "You can only have up to 3 conditions per campaign.",
        variant: "destructive",
      });
      return;
    }

    const newCondition: Condition = {
      id: crypto.randomUUID(),
      condition_number: conditions.length + 1,
      condition_name: `Condition ${conditions.length + 1}`,
      trigger_type: "manual_agent",
      sms_template: "Hi {first_name}! Your ${value} {provider} gift card: {link}",
      is_active: true,
    };
    setConditions([...conditions, newCondition]);
  };

  const handleRemoveCondition = (id: string) => {
    if (conditions.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one condition is required when rewards are enabled.",
        variant: "destructive",
      });
      return;
    }

    const newConditions = conditions
      .filter((c) => c.id !== id)
      .map((c, index) => ({ ...c, condition_number: index + 1 }));
    setConditions(newConditions);
  };

  const handleUpdateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate: 'mailed' and 'in_production' statuses require either:
      // 1. Self-mailer (mailing_method = 'self')
      // 2. Landing page
      // 3. Form
      const statusRequiresDestination = ['mailed', 'in_production'].includes(formData.status);
      const isSelfMailer = formData.mailing_method === 'self';
      const hasLandingPage = !!formData.landing_page_id;
      const hasForm = !!formData.form_id;
      
      if (statusRequiresDestination && !isSelfMailer && !hasLandingPage && !hasForm) {
        throw new Error(`Cannot set status to "${formData.status}" without a landing page or form. Self-mailers are exempt from this requirement.`);
      }

      // Validate conditions if rewards are enabled
      if (formData.rewards_enabled) {
        const activeConditions = conditions.filter(c => c.is_active);
        if (activeConditions.length === 0) {
          throw new Error("At least one active condition is required when rewards are enabled.");
        }

        const missingGiftCards = activeConditions.filter(c => !c.brand_id || !c.card_value);
        if (missingGiftCards.length > 0) {
          throw new Error("Please select a gift card reward for all active conditions.");
        }
      }

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

      // Update campaign
      const { error: updateError } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", campaignId);

      if (updateError) {
        console.error("Campaign update error:", updateError);
        throw updateError;
      }

      // Save conditions to campaign_conditions table
      // Delete existing conditions first
      await supabase
        .from("campaign_conditions")
        .delete()
        .eq("campaign_id", campaignId);

      // Insert updated conditions
      if (formData.rewards_enabled && conditions.length > 0) {
        const conditionsToInsert = conditions.map(c => ({
          campaign_id: campaignId,
          condition_number: c.condition_number,
          condition_name: c.condition_name,
          trigger_type: c.trigger_type,
          brand_id: c.brand_id || null,
          card_value: c.card_value || null,
          sms_template: c.sms_template || null,
          is_active: c.is_active,
        }));

        const { error: conditionsError } = await supabase
          .from("campaign_conditions")
          .insert(conditionsToInsert as any);

        if (conditionsError) {
          console.error("Conditions insert error:", conditionsError);
          throw conditionsError;
        }

        // Update campaign_gift_card_config table for call center
        await supabase
          .from("campaign_gift_card_config")
          .delete()
          .eq("campaign_id", campaignId);

        const giftCardConfigs = conditions
          .filter(c => c.brand_id && c.card_value && c.is_active)
          .map(c => ({
            campaign_id: campaignId,
            condition_number: c.condition_number,
            brand_id: c.brand_id,
            denomination: c.card_value,
          }));

        if (giftCardConfigs.length > 0) {
          const { error: configError } = await supabase
            .from("campaign_gift_card_config")
            .insert(giftCardConfigs as any);

          if (configError) {
            console.error("Gift card config insert error:", configError);
            // Don't throw - this table might not exist in all deployments
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-edit", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-conditions-edit", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-conditions", campaignId] });
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
                {['mailed', 'in_production'].includes(formData.status) && 
                  formData.mailing_method !== 'self' && 
                  !formData.landing_page_id && 
                  !formData.form_id && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    A landing page or form is required for "{formData.status}" status (unless self-mailing)
                  </p>
                )}
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

              {/* Rewards Master Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="rewards_enabled" className="text-base font-medium">
                    Rewards Enabled
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable gift card rewards for this campaign
                  </p>
                </div>
                <Switch
                  id="rewards_enabled"
                  checked={formData.rewards_enabled || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, rewards_enabled: checked })}
                  disabled={!rewardsEditable.canEdit}
                />
              </div>

              {/* Conditions Editor - Only shown when rewards enabled */}
              {formData.rewards_enabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Reward Conditions</h3>
                      <p className="text-sm text-muted-foreground">
                        Define when customers earn their gift card rewards
                      </p>
                    </div>
                    {conditions.length < 3 && (
                      <Button onClick={handleAddCondition} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Condition
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {conditions.map((condition, index) => (
                      <Card key={condition.id} className={!condition.is_active ? "opacity-60" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                  {index + 1}
                                </span>
                                Condition {condition.condition_number}
                              </CardTitle>
                              <Badge variant={condition.is_active ? "default" : "secondary"}>
                                {condition.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={condition.is_active}
                                onCheckedChange={(checked) =>
                                  handleUpdateCondition(condition.id, { is_active: checked })
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCondition(condition.id)}
                                disabled={conditions.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Condition Name */}
                            <div className="space-y-2">
                              <Label>Condition Name</Label>
                              <Input
                                value={condition.condition_name}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    condition_name: e.target.value,
                                  })
                                }
                                placeholder="e.g., Listened to sales call"
                              />
                            </div>

                            {/* Trigger Type */}
                            <div className="space-y-2">
                              <Label>Trigger</Label>
                              <Select
                                value={condition.trigger_type}
                                onValueChange={(value) =>
                                  handleUpdateCondition(condition.id, { trigger_type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {TRIGGER_TYPES.find(t => t.value === condition.trigger_type)?.description}
                              </p>
                            </div>
                          </div>

                          {/* Gift Card Reward */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Gift className="h-4 w-4" />
                              Gift Card Reward *
                            </Label>
                            {campaign?.client_id && (
                              <SimpleBrandDenominationSelector
                                clientId={campaign.client_id}
                                value={condition.brand_id && condition.card_value ? {
                                  brand_id: condition.brand_id,
                                  card_value: condition.card_value,
                                  brand_name: condition.brand_name,
                                } : null}
                                onChange={(selection) =>
                                  handleUpdateCondition(condition.id, {
                                    brand_id: selection?.brand_id,
                                    card_value: selection?.card_value,
                                    brand_name: selection?.brand_name,
                                  })
                                }
                                showAvailability={true}
                              />
                            )}
                          </div>

                          {/* SMS Template */}
                          <div className="space-y-2">
                            <Label>Gift Card SMS Message</Label>
                            <Textarea
                              value={condition.sms_template || ""}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, {
                                  sms_template: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder="Hi {first_name}! Your ${value} {provider} gift card: {link}"
                            />
                            <p className="text-xs text-muted-foreground">
                              Variables: {"{first_name}"}, {"{last_name}"}, {"{value}"}, {"{provider}"}, {"{link}"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {conditions.length < 3 && (
                    <Button onClick={handleAddCondition} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Condition
                    </Button>
                  )}
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
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

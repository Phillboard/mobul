/**
 * AudiencesRewardsStep - Modern combined step for audiences and rewards
 * 
 * Features:
 * - Split layout: Audiences (left) | Rewards (right)
 * - Inline audience/list creation
 * - Visual reward builder
 * - Smart defaults and guidance
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/contexts/TenantContext";
import { 
  Users, 
  Gift, 
  ArrowRight, 
  Plus,
  List,
  Upload,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CampaignFormData } from "@/types/campaigns";
import { format } from "date-fns";
import { cn } from "@/lib/utils/utils";
import { useToast } from "@/hooks/use-toast";
import { SimpleBrandDenominationSelector } from "@/components/gift-cards/SimpleBrandDenominationSelector";
import { CreateListWithCSVDialog } from "./CreateListWithCSVDialog";

interface AudiencesRewardsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
  isEditMode?: boolean;
  campaignStatus?: string;
}

export function AudiencesRewardsStep({
  clientId,
  initialData,
  onNext,
  onBack,
  isEditMode,
  campaignStatus,
}: AudiencesRewardsStepProps) {
  const { toast } = useToast();
  const { currentUser } = useTenant();
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === 'platform_admin';
  
  const [selectedListId, setSelectedListId] = useState<string>(
    initialData.contact_list_id || ""
  );
  const [selectedConditions, setSelectedConditions] = useState<any[]>(
    initialData.conditions || []
  );
  const [showTracking, setShowTracking] = useState(false);
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);

  // Tracking settings state
  const [trackingSettings, setTrackingSettings] = useState({
    lp_mode: initialData.lp_mode || 'bridge',
    base_lp_url: initialData.base_lp_url || '',
    utm_source: initialData.utm_source || 'directmail',
    utm_medium: initialData.utm_medium || 'postcard',
    utm_campaign: initialData.utm_campaign || initialData.name || '',
  });

  // Fetch contact lists
  const { data: contactLists, isLoading: loadingLists } = useQuery({
    queryKey: ["contact-lists", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_lists")
        .select("*, contact_list_members(count)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Transform to include proper count
      return (data as any[])?.map(list => ({
        ...list,
        contact_count: Array.isArray(list.contact_list_members) 
          ? list.contact_list_members[0]?.count || 0
          : 0
      })) || [];
    },
  });

  const selectedList = contactLists?.find((l) => l.id === selectedListId);

  const handleNext = async () => {
    if (!selectedListId) {
      toast({
        title: "Audience Required",
        description: "Please select a contact list to continue",
        variant: "destructive",
      });
      return;
    }

    // Validate conditions if any exist - STRICT VALIDATION
    if (selectedConditions.length > 0) {
      const missingNames = selectedConditions.filter((c) => !c.condition_name || !c.condition_name.trim());
      if (missingNames.length > 0) {
        toast({
          title: "Condition Name Required",
          description: "Please provide a name for all reward conditions",
          variant: "destructive",
        });
        return;
      }

      // ENHANCED: Strict validation for gift card brand and value
      const missingBrand = selectedConditions.filter((c) => !c.brand_id || c.brand_id === "" || c.brand_id === null);
      const missingValue = selectedConditions.filter((c) => !c.card_value || c.card_value === 0 || c.card_value === null);
      
      if (missingBrand.length > 0 || missingValue.length > 0) {
        const issues = [];
        if (missingBrand.length > 0) {
          issues.push(`${missingBrand.length} condition(s) missing brand selection`);
        }
        if (missingValue.length > 0) {
          issues.push(`${missingValue.length} condition(s) missing denomination`);
        }
        
        toast({
          title: "Incomplete Gift Card Configuration",
          description: `All conditions must have both a brand AND a value selected. ${issues.join(', ')}.`,
          variant: "destructive",
        });
        
        // Log for debugging
        console.error('[AudiencesRewardsStep] Validation failed:', {
          conditions: selectedConditions.map(c => ({
            name: c.condition_name,
            brand_id: c.brand_id,
            card_value: c.card_value,
            hasBrand: !!c.brand_id && c.brand_id !== "",
            hasValue: !!c.card_value && c.card_value !== 0,
          })),
        });
        return;
      }

      // Note: Inventory validation happens at provisioning time
      // CSV inventory is used first, then Tillo API as fallback
      // No need to block campaign creation here
      
      // Log success for debugging with full details
      console.log('[AudiencesRewardsStep] Validation passed:', {
        conditionCount: selectedConditions.length,
        allHaveBrand: selectedConditions.every(c => c.brand_id),
        allHaveValue: selectedConditions.every(c => c.card_value),
        conditions: selectedConditions.map(c => ({
          name: c.condition_name,
          brand_id: c.brand_id,
          brand_id_type: typeof c.brand_id,
          card_value: c.card_value,
          card_value_type: typeof c.card_value,
          brand_name: c.brand_name,
        })),
      });
    }

    // Log what we're passing to onNext
    const dataToPass = {
      contact_list_id: selectedListId,
      recipient_count: selectedList?.contact_count || 0,
      conditions: selectedConditions.length > 0 ? selectedConditions : undefined,
      audience_selection_complete: true,
      selected_audience_type: 'list',
      ...trackingSettings,
    };
    
    console.log('[AudiencesRewardsStep] Passing to onNext:', {
      hasConditions: !!dataToPass.conditions,
      conditionCount: dataToPass.conditions?.length || 0,
      conditions: dataToPass.conditions?.map((c: any) => ({
        condition_name: c.condition_name,
        brand_id: c.brand_id,
        card_value: c.card_value,
      })),
    });

    onNext(dataToPass);
  };

  const addCondition = () => {
    const conditionNumber = selectedConditions.length + 1;
    const defaultNames = [
      "Listened to sales call",
      "Purchased",
      `Condition ${conditionNumber}`,
    ];
    
    const newCondition = {
      id: `temp-${Date.now()}`,
      condition_number: conditionNumber,
      condition_name: defaultNames[conditionNumber - 1] || `Condition ${conditionNumber}`,
      trigger_type: "manual_agent",
      brand_id: "",
      card_value: 0,
      sms_template: "",
      is_active: true,
    };
    setSelectedConditions([...selectedConditions, newCondition]);
  };

  const updateCondition = (index: number, updates: Partial<any>) => {
    console.log('[AudiencesRewardsStep] updateCondition called:', {
      index,
      updates,
      updates_brand_id: updates.brand_id,
      updates_card_value: updates.card_value,
    });
    
    const updated = [...selectedConditions];
    updated[index] = { ...updated[index], ...updates };
    
    console.log('[AudiencesRewardsStep] Updated condition:', {
      index,
      brand_id: updated[index].brand_id,
      card_value: updated[index].card_value,
      condition_name: updated[index].condition_name,
    });
    
    setSelectedConditions(updated);
  };

  const removeCondition = (index: number) => {
    setSelectedConditions(selectedConditions.filter((_, i) => i !== index));
  };

  // Handle new list creation from CSV import
  const handleListCreated = (listId: string, listName: string) => {
    // Refresh the contact lists query
    queryClient.invalidateQueries({ queryKey: ["contact-lists", clientId] });
    // Auto-select the newly created list
    setSelectedListId(listId);
    toast({
      title: "List Created",
      description: `"${listName}" has been created and selected for this campaign`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold">Setup Your Campaign</h2>
        </div>
        <p className="text-muted-foreground text-lg">
          Choose your audience and configure rewards
        </p>
      </div>

      {/* Split Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* LEFT: Audiences */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Campaign Audience
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">About Audiences</h4>
                    <p className="text-sm text-muted-foreground">
                      Select an existing contact list for this campaign. Each contact should have a unique code already assigned (from your mail piece).
                    </p>
                    <p className="text-sm text-muted-foreground">
                      When contacts call in with their code, agents can validate and trigger rewards through the call center.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
            <CardDescription>
              Select who will receive this campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingLists ? (
              <p className="text-sm text-muted-foreground">Loading lists...</p>
            ) : contactLists && contactLists.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Contact List</Label>
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a contact list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contactLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          <div className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            {list.name}
                            <Badge variant="secondary" className="ml-2">
                              {list.contact_count || 0}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedList && (
                  <Alert className="border-primary/50 bg-primary/5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div>
                          <strong className="text-foreground">{selectedList.name}</strong>
                        </div>
                        <div className="text-sm">
                          {selectedList.contact_count || 0} contacts with unique codes ready for redemption
                        </div>
                        {selectedList.description && (
                          <div className="text-sm text-muted-foreground">
                            {selectedList.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created {format(new Date(selectedList.created_at), "PP")}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                  onClick={() => setShowCreateListDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New List
                </Button>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <p className="text-sm font-medium">No contact lists yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first list to get started
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowCreateListDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Contact List
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Rewards */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Rewards & Conditions
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">About Rewards</h4>
                    <p className="text-sm text-muted-foreground">
                      Set up conditions that trigger gift card rewards. For example, "Customer completed sales call" or "Form submitted".
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
            <CardDescription>
              Configure reward triggers (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedConditions.length > 0 ? (
              <div className="space-y-3">
                {selectedConditions.map((condition, index) => (
                  <Card key={condition.id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Condition {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      
                      {/* Condition Name Input */}
                      <div className="space-y-2">
                        <Label className="text-xs">Condition Name</Label>
                        <Input
                          value={condition.condition_name}
                          onChange={(e) =>
                            updateCondition(index, { condition_name: e.target.value })
                          }
                          placeholder="e.g., Listened to sales call"
                          className="text-sm"
                        />
                      </div>
                      
                      {/* Trigger Type Dropdown */}
                      <div className="space-y-2">
                        <Label className="text-xs">Trigger Type</Label>
                        <Select
                          value={condition.trigger_type}
                          onValueChange={(value) => {
                            if (value !== "coming_soon") {
                              updateCondition(index, { trigger_type: value });
                            }
                          }}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual_agent">Agent Accepted</SelectItem>
                            {isAdmin ? (
                              <>
                                <SelectItem value="call_completed">Call Completed</SelectItem>
                                <SelectItem value="form_submitted">Form Submitted</SelectItem>
                              </>
                            ) : (
                              <SelectItem value="coming_soon" disabled>
                                More triggers (Coming Soon)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {!isAdmin && (
                          <p className="text-xs text-muted-foreground">
                            Additional triggers available for admins
                          </p>
                        )}
                      </div>
                      
                      {/* Simplified Gift Card Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs">Gift Card Reward *</Label>
                        <SimpleBrandDenominationSelector
                          clientId={clientId}
                          value={condition.brand_id && condition.card_value ? {
                            brand_id: condition.brand_id,
                            card_value: condition.card_value,
                            brand_name: condition.brand_name
                          } : null}
                          onChange={(selection) => {
                            if (!selection) {
                              updateCondition(index, {
                                brand_id: null,
                                card_value: null,
                                brand_name: null
                              });
                            } else {
                              updateCondition(index, {
                                brand_id: selection.brand_id,
                                card_value: selection.card_value,
                                brand_name: selection.brand_name
                              });
                            }
                          }}
                          showAvailability={true}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <p className="text-sm font-medium">No rewards configured</p>
                  <p className="text-sm text-muted-foreground">
                    Add conditions to trigger gift card rewards
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={addCondition}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Reward Condition
            </Button>

            {selectedConditions.length > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {selectedConditions.length} reward{selectedConditions.length > 1 ? 's' : ''} configured
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tracking & Analytics Settings */}
      <Card className="border-2">
        <CardHeader className="cursor-pointer" onClick={() => setShowTracking(!showTracking)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Tracking & Analytics Settings</CardTitle>
            </div>
            {showTracking ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <CardDescription>
            Configure PURLs, QR codes, and UTM parameters for tracking campaign performance
          </CardDescription>
        </CardHeader>
        {showTracking && (
          <CardContent className="space-y-4">
            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                <strong>How tracking works:</strong> Each contact's unique code (from your mail piece) is used to track redemptions. When they call in, the code validates their identity and triggers rewards after conditions are met.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lp-mode">Landing Page Mode</Label>
                <Select
                  value={trackingSettings.lp_mode}
                  onValueChange={(value) => setTrackingSettings({ ...trackingSettings, lp_mode: value })}
                >
                  <SelectTrigger id="lp-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bridge">Bridge Page</SelectItem>
                    <SelectItem value="redirect">Direct Redirect</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How visitors are directed from their unique code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url">Base Landing Page URL</Label>
                <Input
                  id="base-url"
                  type="url"
                  placeholder="https://yoursite.com/offer"
                  value={trackingSettings.base_lp_url}
                  onChange={(e) => setTrackingSettings({ ...trackingSettings, base_lp_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  The URL where visitors will land (code appended automatically)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">UTM Parameters (for Google Analytics)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="utm-source" className="text-xs">Source</Label>
                  <Input
                    id="utm-source"
                    placeholder="directmail"
                    value={trackingSettings.utm_source}
                    onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_source: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="utm-medium" className="text-xs">Medium</Label>
                  <Input
                    id="utm-medium"
                    placeholder="postcard"
                    value={trackingSettings.utm_medium}
                    onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_medium: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="utm-campaign" className="text-xs">Campaign</Label>
                  <Input
                    id="utm-campaign"
                    placeholder="Campaign name"
                    value={trackingSettings.utm_campaign}
                    onChange={(e) => setTrackingSettings({ ...trackingSettings, utm_campaign: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
          disabled={!selectedListId}
          className="min-w-[180px]"
        >
          Continue to Design
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Create List with CSV Dialog */}
      <CreateListWithCSVDialog
        open={showCreateListDialog}
        onOpenChange={setShowCreateListDialog}
        clientId={clientId}
        onListCreated={handleListCreated}
      />
    </div>
  );
}


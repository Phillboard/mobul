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
import { useQuery } from "@tanstack/react-query";
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

interface AudiencesRewardsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function AudiencesRewardsStep({
  clientId,
  initialData,
  onNext,
  onBack,
}: AudiencesRewardsStepProps) {
  const { toast } = useToast();
  const { currentUser } = useTenant();
  const isAdmin = currentUser?.role === 'platform_admin';
  
  const [selectedListId, setSelectedListId] = useState<string>(
    initialData.contact_list_id || ""
  );
  const [selectedConditions, setSelectedConditions] = useState<any[]>(
    initialData.conditions || []
  );
  const [showTracking, setShowTracking] = useState(false);

  // Tracking settings state
  const [trackingSettings, setTrackingSettings] = useState({
    lp_mode: initialData.lp_mode || 'purl',
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
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch gift card pools
  const { data: giftCardPools } = useQuery({
    queryKey: ["gift-card-pools", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select(`
          id,
          pool_name,
          card_value,
          available_cards,
          total_cards,
          is_active,
          created_at,
          gift_card_brands (
            brand_name
          )
        `)
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedList = contactLists?.find((l) => l.id === selectedListId);

  const getPoolStatus = (availableCards: number) => {
    if (availableCards === 0) return { label: 'empty', color: 'text-red-600' };
    if (availableCards <= 20) return { label: 'low stock', color: 'text-yellow-600' };
    return { label: 'active', color: 'text-green-600' };
  };

  const formatPoolDisplay = (pool: any) => {
    const brandName = pool.gift_card_brands?.brand_name || pool.pool_name;
    const status = getPoolStatus(pool.available_cards);
    return `${brandName} | $${pool.card_value} (${status.label})`;
  };

  const handleNext = async () => {
    if (!selectedListId) {
      toast({
        title: "Audience Required",
        description: "Please select a contact list to continue",
        variant: "destructive",
      });
      return;
    }

    // Validate conditions if any exist
    if (selectedConditions.length > 0) {
      const missingNames = selectedConditions.filter((c) => !c.condition_name.trim());
      if (missingNames.length > 0) {
        toast({
          title: "Condition Name Required",
          description: "Please provide a name for all reward conditions",
          variant: "destructive",
        });
        return;
      }

      const missingPools = selectedConditions.filter((c) => !c.brand_id || !c.card_value);
      if (missingPools.length > 0) {
        toast({
          title: "Gift Card Required",
          description: "Please select a gift card reward for all conditions",
          variant: "destructive",
        });
        return;
      }

      // NEW: Validate inventory availability for each condition
      for (const condition of selectedConditions) {
        try {
          const { data: availabilityData, error } = await supabase
            .rpc('get_brand_denomination_info', {
              p_client_id: clientId,
              p_brand_id: condition.brand_id,
              p_card_value: condition.card_value
            });

          if (error) {
            console.error('Failed to check inventory:', error);
            toast({
              title: "Validation Error",
              description: "Could not verify gift card availability. Please try again.",
              variant: "destructive",
            });
            return;
          }

          const availableCount = availabilityData?.[0]?.available_count || 0;
          
          if (availableCount === 0) {
            toast({
              title: "No Cards Available",
              description: `No ${condition.brand_name} $${condition.card_value} gift cards are available. Please select a different reward or add inventory.`,
              variant: "destructive",
            });
            return;
          }

          // Warn if inventory is low
          if (availableCount < 10) {
            toast({
              title: "Low Inventory Warning",
              description: `Only ${availableCount} cards available for ${condition.brand_name} $${condition.card_value}. Consider adding more inventory.`,
              variant: "default",
            });
          }
        } catch (err) {
          console.error('Inventory check error:', err);
        }
      }
    }

    onNext({
      contact_list_id: selectedListId,
      recipient_count: selectedList?.contact_count || 0,
      conditions: selectedConditions.length > 0 ? selectedConditions : undefined,
      audience_selection_complete: true,
      selected_audience_type: 'list',
      ...trackingSettings,
    });
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
    const updated = [...selectedConditions];
    updated[index] = { ...updated[index], ...updates };
    setSelectedConditions(updated);
  };

  const removeCondition = (index: number) => {
    setSelectedConditions(selectedConditions.filter((_, i) => i !== index));
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
                      Select an existing contact list for this campaign. Each contact will receive a unique redemption code.
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
                          {selectedList.contact_count || 0} contacts will receive unique codes
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

                <Button variant="outline" className="w-full" size="sm">
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
                <Button size="sm">
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
                            card_value: condition.card_value
                          } : null}
                          onChange={(selection) =>
                            updateCondition(index, {
                              brand_id: selection.brand_id,
                              card_value: selection.card_value,
                              brand_name: selection.brand_name
                            })
                          }
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
                <strong>How tracking works:</strong> Each recipient gets a unique code that's embedded in their personalized landing page URL (PURL) and QR code. This lets you track who visits, submits forms, and redeems rewards.
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
                    <SelectItem value="purl">PURL (Personalized URL)</SelectItem>
                    <SelectItem value="bridge">Bridge Page</SelectItem>
                    <SelectItem value="redirect">Direct Redirect</SelectItem>
                    <SelectItem value="none">No Landing Page</SelectItem>
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
    </div>
  );
}


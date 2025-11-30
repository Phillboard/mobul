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
  Sparkles
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
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedList = contactLists?.find((l) => l.id === selectedListId);

  const handleNext = () => {
    if (!selectedListId) {
      toast({
        title: "Audience Required",
        description: "Please select a contact list to continue",
        variant: "destructive",
      });
      return;
    }

    onNext({
      contact_list_id: selectedListId,
      recipient_count: selectedList?.contact_count || 0,
      conditions: selectedConditions.length > 0 ? selectedConditions : undefined,
      audience_selection_complete: true,
      selected_audience_type: 'list',
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
      gift_card_pool_id: "",
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
                      
                      {/* Gift Card Pool Selection */}
                      {giftCardPools && giftCardPools.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs">Gift Card Pool</Label>
                          <Select
                            value={condition.gift_card_pool_id}
                            onValueChange={(value) =>
                              updateCondition(index, { gift_card_pool_id: value })
                            }
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select pool..." />
                            </SelectTrigger>
                            <SelectContent>
                              {giftCardPools.map((pool) => (
                                <SelectItem key={pool.id} value={pool.id}>
                                  {pool.pool_name} - ${pool.card_value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Phone, Webhook, Gift, Zap, AlertCircle, AlertTriangle, DollarSign, Edit } from "lucide-react";
import { useCampaignConditions } from "@/features/campaigns/hooks/useCampaignConditions";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ConditionsDisplayProps {
  campaignId: string;
}

const triggerTypeIcons: Record<string, any> = {
  manual_agent: Phone,
  crm_event: Webhook,
  time_delay: Zap,
  mail_delivered: Mail,
  call_completed: Phone,
};

const formatConditionType = (type: string) => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export function ConditionsDisplay({ campaignId }: ConditionsDisplayProps) {
  const navigate = useNavigate();
  const { conditions, isLoading } = useCampaignConditions(campaignId);

  // Fetch brand names for conditions that have brand_id set
  const brandIds = conditions
    ?.filter(c => c.brand_id)
    .map(c => c.brand_id) || [];
  
  const { data: brands } = useQuery({
    queryKey: ["gift-card-brands-for-conditions", brandIds],
    queryFn: async () => {
      if (brandIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("gift_card_brands")
        .select("id, brand_name, logo_url")
        .in("id", brandIds);
      
      if (error) throw error;
      
      // Create a map of brand_id to brand info
      return data.reduce((acc, brand) => {
        acc[brand.id] = brand;
        return acc;
      }, {} as Record<string, { id: string; brand_name: string; logo_url: string | null }>);
    },
    enabled: brandIds.length > 0,
  });

  // Check for conditions missing gift card config
  const conditionsNeedingConfig = conditions?.filter(
    c => c.is_active && (!c.brand_id || !c.card_value || c.card_value === 0)
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Conditions</CardTitle>
          <CardDescription>Loading conditions...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!conditions || conditions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Conditions</CardTitle>
          <CardDescription>No automated conditions configured</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This campaign doesn't have any automated triggers or rewards set up.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning Alert for conditions needing configuration */}
      {conditionsNeedingConfig.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Gift Card Configuration Required</AlertTitle>
          <AlertDescription>
            <div className="space-y-3">
              <p>
                {conditionsNeedingConfig.length} condition(s) are missing gift card configuration. 
                Gift cards cannot be provisioned for these conditions until they are configured.
              </p>
              <div className="space-y-1">
                <p className="font-medium text-sm">Conditions needing configuration:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {conditionsNeedingConfig.map(c => (
                    <li key={c.id}>
                      Condition {c.condition_number}: {c.condition_name}
                      {!c.brand_id && !c.card_value && " (missing brand and value)"}
                      {!c.brand_id && c.card_value && " (missing brand)"}
                      {c.brand_id && (!c.card_value || c.card_value === 0) && " (missing value)"}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/campaigns/${campaignId}/edit`)}
                className="mt-2"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Campaign to Configure Gift Cards
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campaign Conditions</CardTitle>
          <CardDescription>
            Automated triggers and rewards for this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conditions.map((condition, index) => {
              const TriggerIcon = triggerTypeIcons[condition.trigger_type] || Mail;
              const brand = condition.brand_id ? brands?.[condition.brand_id] : null;
              const isConfigured = condition.brand_id && condition.card_value && condition.card_value > 0;

              return (
                <div key={condition.id || index} className="relative">
                  <div className={`flex items-center gap-4 p-4 border rounded-lg bg-card ${!isConfigured && condition.is_active ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                    {/* Step Number */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${!isConfigured && condition.is_active ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
                      {condition.condition_number}
                    </div>

                    {/* Condition Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TriggerIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {condition.condition_name}
                        </span>
                        {!condition.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {!isConfigured && condition.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Not Configured
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Trigger: {formatConditionType(condition.trigger_type)}
                      </div>

                      {/* Gift Card Configuration */}
                      {isConfigured ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Gift className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">Reward:</span>
                          <div className="flex items-center gap-2">
                            {brand?.logo_url && (
                              <img src={brand.logo_url} alt={brand.brand_name} className="h-4 w-4 object-contain" />
                            )}
                            <span className="font-medium">{brand?.brand_name || 'Gift Card'}</span>
                            <Badge variant="secondary">
                              <DollarSign className="h-3 w-3" />
                              {condition.card_value}
                            </Badge>
                          </div>
                        </div>
                      ) : condition.is_active ? (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span>No gift card configured - provisioning will fail</span>
                        </div>
                      ) : null}

                      {/* Additional Details */}
                      {condition.crm_event_name && (
                        <div className="text-xs text-muted-foreground">
                          <Webhook className="h-3 w-3 inline mr-1" />
                          CRM Event: {condition.crm_event_name}
                        </div>
                      )}
                      
                      {condition.time_delay_hours && (
                        <div className="text-xs text-muted-foreground">
                          <Zap className="h-3 w-3 inline mr-1" />
                          Delay: {condition.time_delay_hours} hours
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow between conditions */}
                  {index < conditions.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
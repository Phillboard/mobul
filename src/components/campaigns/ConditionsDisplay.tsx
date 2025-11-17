import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Mail, Phone, Webhook, Gift, Zap } from "lucide-react";
import { useCampaignConditions } from "@/hooks/useCampaignConditions";
import { Skeleton } from "@/components/ui/skeleton";

interface ConditionsDisplayProps {
  campaignId: string;
}

const conditionTypeIcons: Record<string, any> = {
  mail_delivered: Mail,
  call_completed: Phone,
  qr_scanned: Mail,
  purl_visited: Mail,
  form_submitted: Mail,
  time_delay: Zap,
  manual_trigger: Zap,
};

const triggerActionIcons: Record<string, any> = {
  send_gift_card: Gift,
  send_sms: Phone,
  trigger_webhook: Webhook,
  update_crm: Webhook,
  send_email: Mail,
};

const formatConditionType = (type: string) => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export function ConditionsDisplay({ campaignId }: ConditionsDisplayProps) {
  const { conditions, isLoading } = useCampaignConditions(campaignId);

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
            const ConditionIcon = conditionTypeIcons[condition.condition_type] || Mail;
            const ActionIcon = triggerActionIcons[condition.trigger_action] || Gift;

            return (
              <div key={condition.id || index} className="relative">
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                  {/* Step Number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {condition.condition_number}
                  </div>

                  {/* Condition Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <ConditionIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatConditionType(condition.condition_type)}
                      </span>
                      {condition.is_required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      <ActionIcon className="h-4 w-4" />
                      <span>{formatConditionType(condition.trigger_action)}</span>
                    </div>

                    {/* Additional Details */}
                    {condition.gift_card_pool_id && (
                      <div className="text-xs text-muted-foreground">
                        <Gift className="h-3 w-3 inline mr-1" />
                        Gift card will be sent
                      </div>
                    )}
                    
                    {condition.sms_template && (
                      <div className="text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 inline mr-1" />
                        SMS: {condition.sms_template.substring(0, 50)}
                        {condition.sms_template.length > 50 ? '...' : ''}
                      </div>
                    )}
                    
                    {condition.webhook_url && (
                      <div className="text-xs text-muted-foreground">
                        <Webhook className="h-3 w-3 inline mr-1" />
                        Webhook: {condition.webhook_url}
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
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useCompleteCondition } from '@/features/call-center/hooks';
import { CheckCircle2, Gift } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";

interface ConditionTriggersProps {
  callSession: any;
}

export function ConditionTriggers({ callSession }: ConditionTriggersProps) {
  const completeCondition = useCompleteCondition();
  const [selectedCondition, setSelectedCondition] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const conditions = callSession.campaigns?.campaign_conditions?.filter(
    (c: any) => c.trigger_action === 'send_gift_card' && c.condition_type === 'call_completed'
  ) || [];
  
  const metConditions = new Set(
    (callSession.campaigns?.call_conditions_met || [])
      .filter((c: any) => c.call_session_id === callSession.id)
      .map((c: any) => c.condition_number)
  );

  const handleTrigger = (conditionNumber: number) => {
    setSelectedCondition(conditionNumber);
    setNotes("");
  };

  const handleConfirm = () => {
    if (selectedCondition) {
      completeCondition.mutate({
        callSessionId: callSession.id,
        campaignId: callSession.campaign_id,
        recipientId: callSession.recipient_id,
        conditionNumber: selectedCondition,
        notes: notes.trim() || undefined,
      });
      setSelectedCondition(null);
      setNotes("");
    }
  };

  if (conditions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reward Conditions</CardTitle>
          <CardDescription>No call-based reward conditions configured for this campaign</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="h-5 w-5 mr-2" />
            Reward Conditions
          </CardTitle>
          <CardDescription>
            Trigger conditions when the caller completes specific actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {conditions.map((condition: any) => {
            const isMet = metConditions.has(condition.condition_number);
            const configJson = condition.config_json || {};
            const giftCardPoolId = condition.gift_card_pool_id;

            return (
              <div
                key={condition.condition_number}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">Condition {condition.condition_number}</Badge>
                    {condition.is_required && (
                      <Badge variant="secondary">Required</Badge>
                    )}
                    {isMet && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {configJson.description || `Call completed - Condition ${condition.condition_number}`}
                  </p>
                  {giftCardPoolId && configJson.pool_name && (
                    <p className="text-sm text-muted-foreground">
                      Reward: ${configJson.card_value || 0} {configJson.provider || 'Gift Card'}
                    </p>
                  )}
                  {condition.sms_template && (
                    <p className="text-xs text-muted-foreground mt-1">
                      SMS will be sent upon completion
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleTrigger(condition.condition_number)}
                  disabled={isMet || completeCondition.isPending}
                  variant={isMet ? "outline" : "default"}
                >
                  {isMet ? "Completed" : "Trigger"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={selectedCondition !== null} onOpenChange={() => setSelectedCondition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Condition {selectedCondition}</DialogTitle>
            <DialogDescription>
              {selectedCondition && 
                conditions.find((c: any) => c.condition_number === selectedCondition)?.config_json?.description || 
                'Complete this condition to trigger the reward'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this condition..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCondition(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={completeCondition.isPending}>
              {completeCondition.isPending ? "Processing..." : "Confirm & Send Reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

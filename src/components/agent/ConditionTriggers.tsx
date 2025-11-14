import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompleteCondition } from "@/hooks/useCallTracking";
import { CheckCircle2, Gift } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ConditionTriggersProps {
  callSession: any;
}

export function ConditionTriggers({ callSession }: ConditionTriggersProps) {
  const completeCondition = useCompleteCondition();
  const [selectedCondition, setSelectedCondition] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const rewardConfigs = callSession.campaigns?.campaign_reward_configs || [];
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
        conditionNumber: selectedCondition as 1 | 2 | 3,
        notes: notes.trim() || undefined,
      });
      setSelectedCondition(null);
      setNotes("");
    }
  };

  const getConditionConfig = (conditionNumber: number) => {
    return rewardConfigs.find((rc: any) => rc.condition_number === conditionNumber);
  };

  if (rewardConfigs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reward Conditions</CardTitle>
          <CardDescription>No reward conditions configured for this campaign</CardDescription>
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
          {[1, 2, 3].map((conditionNumber) => {
            const config = getConditionConfig(conditionNumber);
            const isMet = metConditions.has(conditionNumber);
            
            if (!config) return null;

            const pool = config.gift_card_pools;

            return (
              <div
                key={conditionNumber}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">Condition {conditionNumber}</Badge>
                    {isMet && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {config.reward_description || `Condition ${conditionNumber}`}
                  </p>
                  {pool && (
                    <p className="text-sm text-muted-foreground">
                      Reward: ${pool.card_value} {pool.provider} Gift Card
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleTrigger(conditionNumber)}
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
              {selectedCondition && getConditionConfig(selectedCondition)?.reward_description}
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

import { Button } from "@/components/ui/button";
import { ConditionBuilder } from "../ConditionBuilder";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Condition {
  id?: string;
  condition_number: number;
  condition_type: string;
  trigger_action: string;
  sequence_order: number;
  is_required: boolean;
  gift_card_pool_id?: string;
  sms_template?: string;
  webhook_url?: string;
  config_json?: Record<string, any>;
}

interface ConditionsStepProps {
  campaignId?: string;
  clientId: string;
  conditions: Condition[];
  onConditionsChange: (conditions: Condition[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ConditionsStep({
  campaignId,
  clientId,
  conditions,
  onConditionsChange,
  onNext,
  onBack,
}: ConditionsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Campaign Conditions</h2>
        <p className="text-muted-foreground mt-2">
          Set up automated triggers and rewards based on recipient actions
        </p>
      </div>

      <ConditionBuilder
        campaignId={campaignId}
        clientId={clientId}
        conditions={conditions}
        onChange={onConditionsChange}
      />

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
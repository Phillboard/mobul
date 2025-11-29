/**
 * SummaryStep - Final review before campaign creation
 * 
 * Shows complete cost breakdown:
 * - Self-mailers: Gift card costs only
 * - ACE fulfillment: Print + Postage + Gift cards
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Mail, 
  Users, 
  FileText, 
  Link as LinkIcon, 
  Gift, 
  Layout, 
  Check,
  DollarSign,
  Printer,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ValidationChecklist } from "./ValidationChecklist";
import { useCampaignValidation } from "@/hooks/useCampaignValidation";
import { useCampaignCostEstimate } from "@/hooks/useCampaignCostEstimate";
import { useGiftCardCostEstimate } from "@/hooks/useGiftCardCostEstimate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SummaryStepProps {
  formData: any;
  clientId: string;
  recipientCount: number;
  onBack: () => void;
  onConfirm: () => void;
  isCreating?: boolean;
  onSaveDraft?: () => void;
}

export function SummaryStep({
  formData,
  clientId,
  recipientCount,
  onBack,
  onConfirm,
  isCreating,
  onSaveDraft,
}: SummaryStepProps) {
  const validation = useCampaignValidation(formData, clientId);
  const isSelfMailer = formData.mailing_method === 'self';

  // Print costs (only for ACE fulfillment)
  const printCostEstimate = useCampaignCostEstimate({
    size: formData.size,
    postage: formData.postage,
    recipientCount,
    mailingMethod: formData.mailing_method,
  });

  // Gift card costs (uses 5% default redemption rate)
  const conditions = formData.conditions || [];
  const { data: giftCardCostEstimate } = useGiftCardCostEstimate({
    conditions,
    recipientCount,
    clientId,
  });

  // Calculate totals
  const printTotal = printCostEstimate?.total || 0;
  const giftCardTotal = giftCardCostEstimate?.totalCost || 0;
  const grandTotal = printTotal + giftCardTotal;

  const getSizeName = (size: string) => {
    const sizes: Record<string, string> = {
      "4x6": "4\" × 6\" Postcard",
      "6x9": "6\" × 9\" Postcard",
      "6x11": "6\" × 11\" Postcard",
      letter: "Letter (8.5\" × 11\")",
      trifold: "Tri-fold Brochure",
    };
    return sizes[size] || size;
  };

  const getPostageName = (postage: string) => {
    return postage === "first_class" ? "First Class" : "Standard";
  };

  const getTriggerName = (trigger: string) => {
    const triggers: Record<string, string> = {
      manual_agent: "Agent Accepted",
      call_completed: "Call Completed",
      form_submitted: "Form Submitted",
      time_delay: "Time Delay",
    };
    return triggers[trigger] || trigger.replace(/_/g, ' ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Review & Create</h2>
        <p className="text-muted-foreground mt-2">
          Review your campaign details before creating
        </p>
      </div>

      <ValidationChecklist checks={validation.checks} />

      {/* Cost Estimate Card */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Estimated Campaign Cost</h3>
        </div>

        <div className="space-y-4">
          {/* Print/Postage - ACE Fulfillment only */}
          {!isSelfMailer && printCostEstimate && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Printer className="h-4 w-4" />
                Mail Production & Delivery
              </div>
              <div className="pl-6 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Printing ({recipientCount.toLocaleString()} pieces):</span>
                  <span>{printCostEstimate.formattedPrinting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Postage ({getPostageName(formData.postage)}):</span>
                  <span>{printCostEstimate.formattedPostage}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Mail Subtotal:</span>
                  <span>{printCostEstimate.formattedTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* Gift Card Costs */}
          {giftCardCostEstimate ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gift className="h-4 w-4" />
                Gift Card Rewards
              </div>
              <div className="pl-6 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    ~{giftCardCostEstimate.estimatedRedemptions.toLocaleString()} est. redemptions × ${giftCardCostEstimate.cardValue.toFixed(2)}:
                  </span>
                  <span>{giftCardCostEstimate.formattedTotalCost}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on {giftCardCostEstimate.redemptionRate}% redemption rate, includes {giftCardCostEstimate.feePercentage}% fee
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gift className="h-4 w-4" />
                Gift Card Rewards
              </div>
              <div className="pl-6 text-sm text-muted-foreground">
                No gift card pools linked to conditions yet
              </div>
            </div>
          )}

          {/* Grand Total */}
          <Separator />
          <div className="flex justify-between items-center pt-2">
            <span className="font-semibold text-lg">Estimated Total:</span>
            <span className="font-bold text-xl text-primary">
              {formatCurrency(grandTotal)}
            </span>
          </div>
          
          {recipientCount === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload codes/recipients to see accurate cost estimates
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Campaign Details Card */}
      <Card className="p-6 space-y-4">
        {/* Campaign Details */}
        <div>
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4" />
            Campaign Details
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{formData.name || "Untitled"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fulfillment:</span>
              <Badge variant="outline">
                {isSelfMailer ? "Self-Mailing" : "ACE Fulfillment"}
              </Badge>
            </div>
            {!isSelfMailer && formData.size && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mail Size:</span>
                <span>{getSizeName(formData.size)}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Codes */}
        <div>
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            Codes & Recipients
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Codes Uploaded:</span>
              <span>{recipientCount > 0 ? `${recipientCount.toLocaleString()} codes` : "None yet"}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Conditions */}
        <div>
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4" />
            Reward Conditions
          </h4>
          <div className="space-y-2 text-sm">
            {formData.conditions && formData.conditions.length > 0 ? (
              formData.conditions.filter((c: any) => c.is_active).map((condition: any, idx: number) => (
                <div key={condition.id || idx} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{condition.condition_name}</span>
                  </div>
                  <Badge variant="secondary">{getTriggerName(condition.trigger_type)}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-2">
                No conditions configured
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Landing Page / Form */}
        <div>
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Layout className="h-4 w-4" />
            Customer Page
          </h4>
          <div className="space-y-2 text-sm">
            {formData.landing_page_id ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Landing Page:</span>
                <Badge variant="outline" className="text-green-600">Selected</Badge>
              </div>
            ) : formData.selected_form_ids && formData.selected_form_ids.length > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ACE Form:</span>
                <Badge variant="outline" className="text-green-600">Selected</Badge>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-2">
                No page or form selected (can add later)
              </div>
            )}
          </div>
        </div>

        {/* Delivery - Only for ACE fulfillment */}
        {!isSelfMailer && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4" />
                Delivery Settings
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Postage:</span>
                  <Badge variant="outline">{getPostageName(formData.postage)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mail Date:</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formData.mail_date_mode === "asap"
                      ? "As Soon As Possible"
                      : formData.mail_date
                      ? format(new Date(formData.mail_date), "PPP")
                      : "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* UTM Tracking */}
        {(formData.utm_source || formData.utm_medium) && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <LinkIcon className="h-4 w-4" />
                Tracking
              </h4>
              <div className="space-y-2 text-sm">
                {formData.utm_source && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTM Source:</span>
                    <span className="font-mono text-xs">{formData.utm_source}</span>
                  </div>
                )}
                {formData.utm_medium && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTM Medium:</span>
                    <span className="font-mono text-xs">{formData.utm_medium}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <Mail className="h-4 w-4 inline mr-2" />
          This campaign will be created as a <strong>draft</strong>. You can review and
          make changes before activating.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isCreating}>
          Back
        </Button>
        <div className="flex gap-2">
          {onSaveDraft && (
            <Button type="button" variant="outline" onClick={onSaveDraft} disabled={isCreating}>
              Save as Draft
            </Button>
          )}
          <Button 
            onClick={onConfirm} 
            disabled={isCreating || !validation.isValid}
            size="lg"
          >
            {isCreating ? "Creating Campaign..." : "Create Campaign"}
          </Button>
        </div>
      </div>
    </div>
  );
}

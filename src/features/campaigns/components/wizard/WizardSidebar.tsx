/**
 * WizardSidebar - Campaign cost summary sidebar
 * 
 * Shows appropriate cost estimates based on mailing method:
 * - Self-mailers: Gift card costs only (no print)
 * - ACE fulfillment: Print + Postage + Gift card costs
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Users, DollarSign, AlertTriangle, Gift, Printer } from "lucide-react";
import { useCampaignCostEstimate } from "../../hooks/useCampaignCostEstimate";
import { useCampaignValidation } from "../../hooks/useCampaignValidation";
import { useGiftCardCostEstimate } from "@/features/gift-cards/hooks/useGiftCardCostEstimate";
import type { MailingMethod } from "@/types/campaigns";

interface WizardSidebarProps {
  formData: any;
  recipientCount: number;
  clientId: string;
  mailingMethod?: MailingMethod;
}

export function WizardSidebar({ formData, recipientCount, clientId, mailingMethod: propMailingMethod }: WizardSidebarProps) {
  const mailingMethod = propMailingMethod || formData.mailing_method as MailingMethod | undefined;
  const isSelfMailer = mailingMethod === 'self';

  // Print/postage costs (only for ACE fulfillment)
  const printCostEstimate = useCampaignCostEstimate({
    size: formData.size,
    postage: formData.postage,
    recipientCount,
    mailingMethod,
  });

  // Gift card costs (for all campaigns with conditions)
  // Uses 5% default redemption rate based on historical data
  const conditions = formData.conditions || [];
  const { data: giftCardCostEstimate, isLoading: loadingGiftCardCost } = useGiftCardCostEstimate({
    conditions,
    recipientCount,
    clientId,
  });

  const validation = useCampaignValidation(formData, clientId);
  const errorCount = validation.checks.filter(c => c.status === 'error').length;
  const warningCount = validation.checks.filter(c => c.status === 'warning').length;

  // Calculate grand total
  const printTotal = printCostEstimate?.total || 0;
  const giftCardTotal = giftCardCostEstimate?.totalCost || 0;
  const grandTotal = printTotal + giftCardTotal;

  const hasAnyCosts = printCostEstimate || giftCardCostEstimate;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-base">Campaign Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          {/* Campaign Name & Method */}
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium truncate">
                {formData.name || "Untitled Campaign"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isSelfMailer ? "Self-mailing" : "ACE Fulfillment"}
                {!isSelfMailer && formData.size && (
                  <> • {formData.size} • {formData.postage === "first_class" ? "First Class" : "Standard"}</>
                )}
              </div>
            </div>
          </div>

          {/* Recipient Count */}
          {recipientCount > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {recipientCount.toLocaleString()} recipients
              </span>
            </div>
          )}

          {/* Cost Estimates */}
          {hasAnyCosts && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Cost Estimate</span>
                </div>

                {/* Print/Postage Costs - Only for ACE Fulfillment */}
                {printCostEstimate && (
                  <div className="pl-6 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium mb-1">
                      <Printer className="h-3 w-3" />
                      Mail Costs
                    </div>
                    <div className="flex justify-between pl-5">
                      <span className="text-muted-foreground">Printing:</span>
                      <span>{printCostEstimate.formattedPrinting}</span>
                    </div>
                    <div className="flex justify-between pl-5">
                      <span className="text-muted-foreground">Postage:</span>
                      <span>{printCostEstimate.formattedPostage}</span>
                    </div>
                    <div className="flex justify-between pl-5 font-medium">
                      <span>Subtotal:</span>
                      <span>{printCostEstimate.formattedTotal}</span>
                    </div>
                  </div>
                )}

                {/* Gift Card Costs - Always show if conditions have pools */}
                {giftCardCostEstimate && (
                  <div className="pl-6 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium mb-1">
                      <Gift className="h-3 w-3" />
                      Gift Card Costs
                    </div>
                    <div className="flex justify-between pl-5">
                      <span className="text-muted-foreground">
                        ~{giftCardCostEstimate.estimatedRedemptions.toLocaleString()} redemptions × ${giftCardCostEstimate.cardValue.toFixed(2)}:
                      </span>
                      <span>{giftCardCostEstimate.formattedTotalCost}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground pl-5">
                      ({giftCardCostEstimate.redemptionRate}% est. rate, includes {giftCardCostEstimate.feePercentage}% fee)
                    </div>
                  </div>
                )}

                {loadingGiftCardCost && (
                  <div className="pl-6 text-xs text-muted-foreground">
                    Calculating gift card costs...
                  </div>
                )}

                {/* Grand Total */}
                {(printCostEstimate || giftCardCostEstimate) && (
                  <>
                    <Separator className="my-2" />
                    <div className="pl-6 flex justify-between font-semibold text-sm">
                      <span>Estimated Total:</span>
                      <span className="text-primary">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(grandTotal)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* No costs message for self-mailers without conditions */}
          {isSelfMailer && !giftCardCostEstimate && !loadingGiftCardCost && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Cost Estimate</span>
                </div>
                <p className="pl-6">
                  Select gift card pools in conditions to see estimated costs.
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Validation Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Status</span>
            </div>
            <div className="pl-6 space-y-1">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorCount} Error{errorCount > 1 ? 's' : ''}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                  {warningCount} Warning{warningCount > 1 ? 's' : ''}
                </Badge>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                  Ready
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

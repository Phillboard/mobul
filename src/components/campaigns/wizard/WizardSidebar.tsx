import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Users, DollarSign, AlertTriangle } from "lucide-react";
import { useCampaignCostEstimate } from "@/hooks/useCampaignCostEstimate";
import { useCampaignValidation } from "@/hooks/useCampaignValidation";

interface WizardSidebarProps {
  formData: any;
  recipientCount: number;
  clientId: string;
}

export function WizardSidebar({ formData, recipientCount, clientId }: WizardSidebarProps) {
  const costEstimate = useCampaignCostEstimate({
    size: formData.size,
    postage: formData.postage,
    recipientCount,
  });

  const validation = useCampaignValidation(formData, clientId);
  const errorCount = validation.checks.filter(c => c.status === 'error').length;
  const warningCount = validation.checks.filter(c => c.status === 'warning').length;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-base">Campaign Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium truncate">
                {formData.name || "Untitled Campaign"}
              </div>
              {formData.size && (
                <div className="text-xs text-muted-foreground">
                  {formData.size} • {formData.postage === "first_class" ? "First Class" : "Standard"}
                </div>
              )}
            </div>
          </div>

          {recipientCount > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {recipientCount.toLocaleString()} recipients
              </span>
            </div>
          )}

          {costEstimate && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Cost Estimate</span>
                </div>
                <div className="pl-6 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Printing:</span>
                    <span>{costEstimate.formattedPrinting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Postage:</span>
                    <span>{costEstimate.formattedPostage}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{costEstimate.formattedTotal}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

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

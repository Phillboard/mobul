import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Circle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CampaignFormData } from "@/types/campaigns";
import { useCampaignCostEstimate } from "../../hooks/useCampaignCostEstimate";
import { useListPreview } from "@/hooks/useListPreview";

interface CampaignSidebarProps {
  form: UseFormReturn<Partial<CampaignFormData>>;
  clientId: string;
}

export function CampaignSidebar({ form, clientId }: CampaignSidebarProps) {
  const formData = form.watch();
  
  const { data: recipientPreview } = useListPreview(
    formData.contact_list_id,
    formData.tag_filters || []
  );

  const recipientCount = recipientPreview?.length || 0;

  const costEstimate = useCampaignCostEstimate({
    size: formData.size,
    postage: formData.postage,
    recipientCount,
  });

  const validationChecks = [
    { label: "Campaign name", isValid: !!formData.name && formData.name.length > 0 },
    { label: "Recipients selected", isValid: !!formData.contact_list_id && recipientCount > 0 },
    { label: "Mail piece", isValid: !!formData.template_id || true }, // Optional
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Campaign Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign Details */}
        <div className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Name:</span>{" "}
            <span className="font-medium">{formData.name || "—"}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Recipients:</span>{" "}
            <span className="font-medium">{recipientCount}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Mail Size:</span>{" "}
            <span className="font-medium">{formData.size || "4×6"}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Postage:</span>{" "}
            <span className="font-medium capitalize">{formData.postage || "standard"}</span>
          </div>
        </div>

        {/* Cost Estimate */}
        {costEstimate && (
          <>
            <div className="border-t pt-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Printing:</span>
                  <span>{costEstimate.formattedPrinting}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Postage:</span>
                  <span>{costEstimate.formattedPostage}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Est. Total:</span>
                  <span>{costEstimate.formattedTotal}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Validation Status */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Validation</p>
          <div className="space-y-2">
            {validationChecks.map((check, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {check.isValid ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={check.isValid ? "text-foreground" : "text-muted-foreground"}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

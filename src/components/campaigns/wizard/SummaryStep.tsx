import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Users, FileText, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

interface SummaryStepProps {
  formData: any;
  onBack: () => void;
  onConfirm: () => void;
  isCreating?: boolean;
}

export function SummaryStep({
  formData,
  onBack,
  onConfirm,
  isCreating,
}: SummaryStepProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Campaign Summary</h3>
        <p className="text-sm text-muted-foreground">
          Review your campaign details before creating
        </p>
      </div>

      <Card className="p-6 space-y-4">
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
              <span className="text-muted-foreground">Size:</span>
              <span>{getSizeName(formData.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template:</span>
              <span>{formData.template_id ? "Selected" : "None"}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            Audience & Delivery
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Audience:</span>
              <span>{formData.audience_id ? "Selected" : "None"}</span>
            </div>
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

        <Separator />

        <div>
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <LinkIcon className="h-4 w-4" />
            Campaign Conditions
          </h4>
          <div className="space-y-2 text-sm">
            {formData.conditions && formData.conditions.length > 0 ? (
              formData.conditions.map((condition: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground">Condition {index + 1}:</span>
                  <span className="text-right">
                    {condition.condition_type.replace(/_/g, ' ')} → {condition.trigger_action.replace(/_/g, ' ')}
                  </span>
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

        <div>
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <LinkIcon className="h-4 w-4" />
            Personalized URLs
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode:</span>
              <Badge variant="outline">
                {formData.lp_mode === "bridge" ? "Bridge Page" : "Direct Redirect"}
              </Badge>
            </div>
            {formData.lp_mode === "redirect" && formData.base_lp_url && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base URL:</span>
                <span className="text-xs truncate max-w-[200px]">
                  {formData.base_lp_url}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">UTM Source:</span>
              <span className="font-mono text-xs">{formData.utm_source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UTM Medium:</span>
              <span className="font-mono text-xs">{formData.utm_medium}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UTM Campaign:</span>
              <span className="font-mono text-xs">{formData.utm_campaign || "auto-generated"}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <Mail className="h-4 w-4 inline mr-2" />
          This campaign will be created as a <strong>draft</strong>. You can review and
          make changes before sending to production.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isCreating}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={isCreating}>
          {isCreating ? "Creating..." : "Create Campaign"}
        </Button>
      </div>
    </div>
  );
}

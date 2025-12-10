import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { 
  Calendar, 
  Users, 
  Mail, 
  FileCheck, 
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Lock
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CampaignProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

interface ComplianceItem {
  id: string;
  label: string;
  checked: boolean;
}

export function CampaignProofDialog({
  open,
  onOpenChange,
  campaignId,
}: CampaignProofDialogProps) {
  const queryClient = useQueryClient();
  const [complianceChecks, setComplianceChecks] = useState<ComplianceItem[]>([
    { id: "return_address", label: "Return address present", checked: false },
    { id: "postage_indicia", label: "Proper postage indicia", checked: false },
    { id: "disclaimers", label: "Required disclaimers (based on vertical)", checked: false },
    { id: "qr_scannable", label: "QR codes scannable", checked: false },
  ]);

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaign-proof", campaignId],
    queryFn: async () => {
      // Fetch campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select(`
          *,
          audiences (
            id,
            name,
            valid_count
          ),
          templates (
            id,
            name,
            thumbnail_url,
            size
          )
        `)
        .eq("id", campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Fetch first 3 recipients with QR codes
      if (campaign.audience_id) {
        const { data: recipients, error: recipientsError } = await supabase
          .from("recipients")
          .select("id, first_name, last_name, token, address1, city, state, zip")
          .eq("audience_id", campaign.audience_id)
          .limit(3);

        if (recipientsError) throw recipientsError;

        // Build PURLs and QR URLs for each recipient
        const recipientsWithUrls = recipients?.map((recipient) => {
          const baseUrl = campaign.lp_mode === 'redirect' && campaign.base_lp_url 
            ? campaign.base_lp_url 
            : 'https://engage.yourdomain.com/l';
          
          const params = new URLSearchParams({
            utm_source: campaign.utm_source || 'directmail',
            utm_medium: campaign.utm_medium || 'postcard',
            utm_campaign: campaign.utm_campaign || '',
            rid: `rec_${recipient.token}`,
          });
          
          const purl = `${baseUrl}/${recipient.token}?${params.toString()}`;
          
          const { data: { publicUrl } } = supabase.storage
            .from('qr-codes')
            .getPublicUrl(`${campaign.id}/${recipient.id}.png`);

          return {
            ...recipient,
            purl,
            qr_url: publicUrl,
          };
        });

        return { ...campaign, sampleRecipients: recipientsWithUrls || [] };
      }

      return { ...campaign, sampleRecipients: [] };
    },
    enabled: open,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "approved" })
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-proof", campaignId] });
      toast.success("Campaign approved for production");
    },
    onError: (error) => {
      toast.error(`Failed to approve campaign: ${error.message}`);
    },
  });

  const handleCheckChange = (id: string, checked: boolean) => {
    setComplianceChecks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    );
  };

  const allChecksComplete = complianceChecks.every((check) => check.checked);
  const isApproved = campaignData?.status === "approved";

  const handleApprove = () => {
    if (!allChecksComplete) {
      toast.error("Please complete all compliance checks before approving");
      return;
    }
    approveMutation.mutate();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading campaign proof...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!campaignData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Campaign Proof Review</DialogTitle>
              <DialogDescription>
                Review and approve campaign before sending to production
              </DialogDescription>
            </div>
            <Badge
              variant={isApproved ? "default" : "secondary"}
              className="ml-2"
            >
              {isApproved && <Lock className="h-3 w-3 mr-1" />}
              {campaignData.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Campaign Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{campaignData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mail Piece</p>
                  <p className="font-medium">{campaignData.templates?.name || "No mail piece"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Audience Size</p>
                    <p className="font-medium">
                      {campaignData.audiences?.valid_count || 0} recipients
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Mail Date</p>
                    <p className="font-medium">
                      {campaignData.mail_date
                        ? format(new Date(campaignData.mail_date), "MMM d, yyyy")
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Postage Class</p>
                    <p className="font-medium capitalize">
                      {campaignData.postage?.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mail Size</p>
                  <p className="font-medium">{campaignData.size?.toUpperCase()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mail Piece Preview */}
          {campaignData.templates?.thumbnail_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mail Piece Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <img
                    src={campaignData.templates.thumbnail_url}
                    alt="Template preview"
                    className="w-full max-w-md mx-auto rounded shadow-lg"
                  />
                </div>
                {campaignData.sampleRecipients.length > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Sample Merge Data:</p>
                    <p className="text-sm text-muted-foreground">
                      {campaignData.sampleRecipients[0].first_name}{" "}
                      {campaignData.sampleRecipients[0].last_name}
                      <br />
                      {campaignData.sampleRecipients[0].address1}
                      <br />
                      {campaignData.sampleRecipients[0].city},{" "}
                      {campaignData.sampleRecipients[0].state}{" "}
                      {campaignData.sampleRecipients[0].zip}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sample PURLs and QR Codes */}
          {campaignData.sampleRecipients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample PURLs & QR Codes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaignData.sampleRecipients.map((recipient, index) => (
                  <div key={recipient.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={recipient.qr_url}
                          alt="QR Code"
                          className="w-24 h-24 rounded border bg-white p-2"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          Recipient {index + 1}: {recipient.first_name}{" "}
                          {recipient.last_name}
                        </p>
                        <div className="mt-2 flex items-start gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <a
                            href={recipient.purl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {recipient.purl}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Compliance Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {allChecksComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                Compliance Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {complianceChecks.map((check) => (
                <div key={check.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={check.id}
                    checked={check.checked}
                    onCheckedChange={(checked) =>
                      handleCheckChange(check.id, checked as boolean)
                    }
                    disabled={isApproved}
                  />
                  <label
                    htmlFor={check.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {check.label}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex gap-3">
              {!isApproved && (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Request Changes
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={!allChecksComplete || approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {approveMutation.isPending
                      ? "Approving..."
                      : "Approve for Production"}
                  </Button>
                </>
              )}
              {isApproved && (
                <Button className="bg-primary">
                  Submit to Print Vendor
                </Button>
              )}
            </div>
          </div>

          {isApproved && (
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Campaign Approved
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      This campaign is locked and ready for production. No further edits
                      can be made.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * SummaryStep - Final review before campaign creation
 * 
 * Shows complete cost breakdown:
 * - Self-mailers: Gift card costs only
 * - ACE fulfillment: Print + Postage + Gift cards
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle,
  List,
  CheckCircle2,
  Image
} from "lucide-react";
import { format } from "date-fns";
import { ValidationChecklist } from "./ValidationChecklist";
import { useCampaignValidation } from "@/hooks/useCampaignValidation";
import { useCampaignCostEstimate } from "@/hooks/useCampaignCostEstimate";
import { useGiftCardCostEstimate } from "@/hooks/useGiftCardCostEstimate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  // Fetch contact list details if one was selected
  const { data: contactList } = useQuery({
    queryKey: ["contact-list", formData.contact_list_id],
    queryFn: async () => {
      if (!formData.contact_list_id) return null;
      const { data, error } = await supabase
        .from("contact_lists")
        .select("*")
        .eq("id", formData.contact_list_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!formData.contact_list_id,
  });

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
        <h2 className="text-2xl font-bold">Review & Create Campaign</h2>
        <p className="text-muted-foreground mt-2">
          Review all campaign details before creating. Click any section to expand.
        </p>
      </div>

      <ValidationChecklist checks={validation.checks} />

      {/* Campaign Overview Card */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {formData.name || "Untitled Campaign"}
              </CardTitle>
              <CardDescription className="mt-1">
                {isSelfMailer ? "Self-Mailer Campaign" : "ACE Fulfillment Campaign"}
              </CardDescription>
            </div>
            <Badge variant={validation.isValid ? "default" : "destructive"} className="text-sm px-3 py-1">
              {validation.isValid ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ready
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Issues Found
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Cost Estimate Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-6 w-6 text-primary" />
          <h3 className="font-semibold text-xl">Estimated Campaign Cost</h3>
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
                  <span className="font-medium">{printCostEstimate.formattedPrinting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Postage ({getPostageName(formData.postage)}):</span>
                  <span className="font-medium">{printCostEstimate.formattedPostage}</span>
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
                  <span className="font-medium">{giftCardCostEstimate.formattedTotalCost}</span>
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
          <div className="flex justify-between items-center pt-2 bg-background/50 p-3 rounded-lg">
            <span className="font-semibold text-lg">Estimated Total:</span>
            <span className="font-bold text-2xl text-primary">
              {formatCurrency(grandTotal)}
            </span>
          </div>
          
          {recipientCount === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload codes/select audience to see accurate cost estimates
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Detailed Configuration Accordion */}
      <Accordion type="multiple" defaultValue={["overview", "audience", "conditions"]} className="w-full">
        
        {/* Campaign Details */}
        <AccordionItem value="overview">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Campaign Details
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Campaign Name:</span>
                  <span className="font-medium">{formData.name || "Untitled"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fulfillment Method:</span>
                  <Badge variant="outline">
                    {isSelfMailer ? "Self-Mailing" : "ACE Fulfillment"}
                  </Badge>
                </div>
                {!isSelfMailer && formData.size && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Mail Size:</span>
                      <span className="text-sm font-medium">{getSizeName(formData.size)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Audience Details */}
        <AccordionItem value="audience">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience & Recipients
              <Badge variant="secondary" className="ml-2">
                {recipientCount > 0 ? `${recipientCount.toLocaleString()} recipients` : "Not configured"}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-3">
                {contactList ? (
                  <>
                    <div className="flex items-start gap-3">
                      <List className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold">{contactList.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">{contactList.description || "Contact list"}</div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Type: {contactList.list_type || 'Standard'}</span>
                          <span>Created: {format(new Date(contactList.created_at), 'PP')}</span>
                        </div>
                      </div>
                      <Badge variant="default" className="shrink-0">
                        {contactList.contact_count || 0} contacts
                      </Badge>
                    </div>
                    <Alert className="mt-3">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Unique redemption codes will be auto-generated for all contacts when campaign is created.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : formData.codes_uploaded ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Codes uploaded via CSV: {recipientCount > 0 ? `${recipientCount} recipients` : "Pending upload"}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No audience selected or codes uploaded
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Conditions & Rewards */}
        <AccordionItem value="conditions">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Reward Conditions
              <Badge variant="secondary" className="ml-2">
                {conditions.filter((c: any) => c.is_active).length} active
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6">
                {formData.conditions && formData.conditions.length > 0 ? (
                  <div className="space-y-3">
                    {formData.conditions.filter((c: any) => c.is_active).map((condition: any, idx: number) => (
                      <div key={condition.id || idx} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium">{condition.condition_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{getTriggerName(condition.trigger_type)}</div>
                          </div>
                        </div>
                        <Badge variant="default">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-6">
                    <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conditions configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Landing Page / Form */}
        <AccordionItem value="landing">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Customer Experience
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-3">
                {formData.landing_page_id ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Landing Page: <strong>Selected</strong></span>
                  </div>
                ) : formData.selected_form_ids && formData.selected_form_ids.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm">ACE Form: <strong>Selected ({formData.selected_form_ids.length})</strong></span>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No landing page or form selected (can be added later)
                    </AlertDescription>
                  </Alert>
                )}
                {(formData.utm_source || formData.utm_medium) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <LinkIcon className="h-3 w-3" />
                        UTM Tracking
                      </div>
                      {formData.utm_source && (
                        <div className="flex justify-between text-sm pl-5">
                          <span className="text-muted-foreground">Source:</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{formData.utm_source}</code>
                        </div>
                      )}
                      {formData.utm_medium && (
                        <div className="flex justify-between text-sm pl-5">
                          <span className="text-muted-foreground">Medium:</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{formData.utm_medium}</code>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Delivery Settings - ACE only */}
        {!isSelfMailer && (
          <AccordionItem value="delivery">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Delivery Settings
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Postage Class:</span>
                    <Badge variant="outline">{getPostageName(formData.postage)}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Mail Date:</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formData.mail_date_mode === "asap"
                        ? "As Soon As Possible"
                        : formData.mail_date
                        ? format(new Date(formData.mail_date), "PPP")
                        : "Not set"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        )}

      </Accordion>

      <div className="bg-muted/50 p-4 rounded-lg border">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Mail className="h-4 w-4" />
          This campaign will be created as a <strong className="text-foreground">draft</strong>. You can review and make changes before activating.
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t">
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
            className="min-w-[180px]"
          >
            {isCreating ? (
              <>
                <Printer className="h-4 w-4 mr-2 animate-pulse" />
                Creating Campaign...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

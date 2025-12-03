import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Search, Gift, Copy, RotateCcw, CheckCircle, AlertCircle, User, Mail, Phone, MessageSquare, Loader2, ArrowRight, Send, Info, XCircle, SkipForward, ThumbsUp, ThumbsDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PoolInventoryWidget } from "./PoolInventoryWidget";
import { ResendSmsButton } from "./ResendSmsButton";
import { OptInStatusIndicator } from "./OptInStatusIndicator";
import { useOptInStatus } from "@/hooks/useOptInStatus";

type WorkflowStep = "code" | "optin" | "contact" | "condition" | "complete";
type VerificationMethod = "sms" | "email" | "skipped";
type DispositionType = "positive" | "negative";

// Disposition options
const POSITIVE_DISPOSITIONS = [
  { value: "verified_verbally", label: "Verified Verbally", description: "Customer confirmed identity over the phone" },
  { value: "already_opted_in", label: "Already Opted In", description: "Customer previously opted in to SMS" },
  { value: "vip_customer", label: "VIP Customer", description: "Special customer, skip verification required" },
];

const NEGATIVE_DISPOSITIONS = [
  { value: "do_not_call", label: "Do Not Call", description: "Add to Do Not Call list" },
  { value: "not_interested", label: "Not Interested", description: "Customer declined offer" },
  { value: "wrong_number", label: "Wrong Number", description: "Phone number is incorrect" },
  { value: "call_back_later", label: "Call Back Later", description: "Schedule a follow-up call" },
  { value: "invalid_contact", label: "Invalid Contact", description: "Contact info is invalid" },
];

interface CampaignGiftCardConfig {
  id: string;
  brand_id: string;
  denomination: number;
  condition_number: number;
}

interface RecipientData {
  id: string;
  redemption_code: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  approval_status: string;
  audiences?: {
    id: string;
    name: string;
    campaigns?: Array<{
      id: string;
      name: string;
      campaign_conditions?: Array<{
        id: string;
        condition_number: number;
        condition_name: string;
        is_active: boolean;
      }>;
      campaign_gift_card_config?: CampaignGiftCardConfig[];
    }>;
  };
}

interface GiftCardData {
  id: string;
  card_code: string;
  card_number: string | null;
  card_value?: number;
  expiration_date: string | null;
  gift_card_pools?: {
    id: string;
    pool_name: string;
    card_value: number;
    provider: string | null;
    gift_card_brands?: {
      brand_name: string;
      logo_url: string | null;
      balance_check_url: string | null;
    } | null;
  };
}

interface ProvisionResult {
  success: boolean;
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  giftCard: GiftCardData;
}

interface CallCenterRedemptionPanelProps {
  onRecipientLoaded?: (data: { clientId?: string; campaignId?: string; recipient: RecipientData; step: WorkflowStep }) => void;
}

export function CallCenterRedemptionPanel({ onRecipientLoaded }: CallCenterRedemptionPanelProps) {
  const { toast } = useToast();
  
  // Step 1: Code Entry
  const [step, setStep] = useState<WorkflowStep>("code");
  const [redemptionCode, setRedemptionCode] = useState("");
  const [recipient, setRecipient] = useState<RecipientData | null>(null);
  
  // Step 2: SMS Opt-In (NEW STEP)
  const [cellPhone, setCellPhone] = useState("");
  const [isSendingOptIn, setIsSendingOptIn] = useState(false);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  
  // Verification alternatives
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("sms");
  const [showSkipDisposition, setShowSkipDisposition] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState<string>("");
  const [isSendingEmailVerification, setIsSendingEmailVerification] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [isSubmittingDisposition, setIsSubmittingDisposition] = useState(false);
  
  // Step 3: Contact Method (for SMS delivery)
  const [phone, setPhone] = useState("");
  
  // Step 4: Condition Selection
  const [selectedConditionId, setSelectedConditionId] = useState("");
  
  // Step 5: Result
  const [result, setResult] = useState<ProvisionResult | null>(null);

  // Real-time opt-in status tracking
  const optInStatus = useOptInStatus(callSessionId, recipient?.id || null);

  // Get client name for SMS message
  const campaign = recipient?.audiences?.campaigns?.[0];
  const clientName = (campaign as any)?.clients?.name || "Your provider";

  // Pre-fill phone from recipient if available
  useEffect(() => {
    if (recipient) {
      if (recipient.phone) {
        setPhone(recipient.phone);
        setCellPhone(recipient.phone);
      }
    }
  }, [recipient]);

  // Auto-advance to contact step when opted in
  useEffect(() => {
    if (optInStatus.isOptedIn && step === "optin") {
      toast({
        title: "Customer Opted In!",
        description: "You can now proceed with the gift card provisioning.",
      });
      setStep("contact");
    }
  }, [optInStatus.isOptedIn, step, toast]);

  // Send SMS opt-in
  const sendOptInSms = async () => {
    if (!cellPhone || !recipient || !campaign) return;
    
    setIsSendingOptIn(true);
    try {
      const { data, error} = await supabase.functions.invoke('send-sms-opt-in', {
        body: {
          recipient_id: recipient.id,
          campaign_id: campaign.id,
          call_session_id: callSessionId,
          phone: cellPhone,
          client_name: clientName,
          custom_message: (campaign as any).sms_opt_in_message || undefined, // Pass campaign's custom opt-in message
        }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Pre-fill delivery phone with opt-in phone
      setPhone(cellPhone);
      
      toast({
        title: "Opt-in SMS Sent!",
        description: "Ask customer to reply YES to continue. You can proceed with the spiel while waiting.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send SMS",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSendingOptIn(false);
    }
  };

  // Send email verification link
  const sendEmailVerification = async () => {
    if (!recipient?.email || !campaign) {
      toast({
        title: "No Email Address",
        description: "This customer doesn't have an email address on file.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingEmailVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          recipient_id: recipient.id,
          campaign_id: campaign.id,
          email: recipient.email,
          client_name: clientName,
          recipient_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setEmailVerificationSent(true);
      setVerificationMethod("email");
      
      toast({
        title: "Verification Email Sent!",
        description: `Email sent to ${recipient.email}. Customer must click the link to verify.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmailVerification(false);
    }
  };

  // Handle skip verification with disposition
  const handleSkipDisposition = async (disposition: string) => {
    if (!recipient || !campaign) return;
    
    setIsSubmittingDisposition(true);
    const isPositive = POSITIVE_DISPOSITIONS.some(d => d.value === disposition);
    
    try {
      // Update recipient with disposition and verification method
      const { error: updateError } = await supabase
        .from('recipients')
        .update({
          verification_method: 'skipped',
          disposition: disposition,
          approval_status: isPositive ? 'pending' : 'rejected',
        })
        .eq('id', recipient.id);
      
      if (updateError) throw updateError;
      
      // If positive disposition with skipped verification, continue to delivery
      if (isPositive) {
        toast({
          title: "Proceeding with Positive Disposition",
          description: `Verification skipped with disposition: ${POSITIVE_DISPOSITIONS.find(d => d.value === disposition)?.label}`,
        });
        
        // Continue to delivery step
        setVerificationMethod("skipped");
        setSelectedDisposition(disposition);
        setShowSkipDisposition(false);
        setStep("contact");
      } else {
        // Negative disposition - end the call flow
        toast({
          title: "Call Marked",
          description: `Disposition recorded: ${NEGATIVE_DISPOSITIONS.find(d => d.value === disposition)?.label}`,
        });
        
        // Reset to start for next call
        handleStartNew();
      }
    } catch (error: any) {
      toast({
        title: "Failed to record disposition",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDisposition(false);
    }
  };

  // Step 1: Look up recipient by redemption code
  // Uses the existing data model: recipients → audiences → campaigns
  const lookupMutation = useMutation({
    mutationFn: async (code: string) => {
      console.log('[CALL-CENTER] Looking up code:', code.toUpperCase());

      // Primary lookup: recipients table with redemption_code
      // This is the working data model: recipients → audiences → campaigns
      const { data: recipient, error: recipientError } = await supabase
        .from("recipients")
        .select(`
          *,
          audiences!inner (
            id,
            name,
            campaigns!inner (
              id,
              name,
              status,
              client_id,
              sms_opt_in_message,
              clients (id, name),
              campaign_conditions (*),
              campaign_gift_card_config (*)
            )
          )
        `)
        .eq("redemption_code", code.toUpperCase())
        .maybeSingle();

      if (recipient) {
        console.log('[CALL-CENTER] Found recipient:', recipient.id);
        
        // Check campaign status - only allow active campaigns for redemption
        // Active statuses: in_production, mailed, scheduled
        const campaign = recipient.audiences?.campaigns?.[0];
        if (campaign) {
          const status = campaign.status;
          const activeStatuses = ["in_production", "mailed", "scheduled"];
          
          if (!activeStatuses.includes(status)) {
            // Provide specific error messages for non-active statuses
            if (status === "draft") {
              throw new Error("This contact is in a draft campaign that hasn't been activated yet. Please activate the campaign first.");
            } else if (status === "completed") {
              throw new Error("This campaign has been completed. The redemption period has ended.");
            } else if (status === "proofed") {
              throw new Error("This campaign is still being reviewed. It needs to be moved to 'In Production' or 'Mailed' status.");
            } else {
              throw new Error(`This campaign has status '${status}' which is not eligible for redemption. Campaign must be 'In Production', 'Mailed', or 'Scheduled'.`);
            }
          }
        }

        // Check if already redeemed
        if (recipient.approval_status === "redeemed") {
          throw new Error("This code has already been redeemed");
        }
        
        return recipient as RecipientData;
      }

      // Secondary lookup: Try contacts table with customer_code
      // This handles cases where unique codes are stored on contacts
      console.log('[CALL-CENTER] Trying contacts.customer_code lookup...');
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, customer_code")
        .eq("customer_code", code.toUpperCase())
        .maybeSingle();

      if (contact) {
        console.log('[CALL-CENTER] Found contact:', contact.id, '- checking for campaign assignment...');
        
        // Find a recipient record linked to this contact
        const { data: linkedRecipient, error: linkError } = await supabase
          .from("recipients")
          .select(`
            *,
            audiences!inner (
              id,
              name,
              campaigns!inner (
                id,
                name,
                status,
                client_id,
                clients (id, name),
                campaign_conditions (*),
                campaign_gift_card_config (*)
              )
            )
          `)
          .eq("contact_id", contact.id)
          .maybeSingle();

        if (linkedRecipient) {
          console.log('[CALL-CENTER] Found linked recipient via contact');
          
          // Check campaign status - only allow active campaigns for redemption
          // Active statuses: in_production, mailed, scheduled
          const campaign = linkedRecipient.audiences?.campaigns?.[0];
          if (campaign) {
            const status = campaign.status;
            const activeStatuses = ["in_production", "mailed", "scheduled"];
            
            if (!activeStatuses.includes(status)) {
              // Provide specific error messages for non-active statuses
              if (status === "draft") {
                throw new Error("This contact is in a draft campaign that hasn't been activated yet. Please activate the campaign first.");
              } else if (status === "completed") {
                throw new Error("This campaign has been completed. The redemption period has ended.");
              } else if (status === "proofed") {
                throw new Error("This campaign is still being reviewed. It needs to be moved to 'In Production' or 'Mailed' status.");
              } else {
                throw new Error(`This campaign has status '${status}' which is not eligible for redemption. Campaign must be 'In Production', 'Mailed', or 'Scheduled'.`);
              }
            }
          }
          
          if (linkedRecipient.approval_status === "redeemed") {
            throw new Error("This code has already been redeemed");
          }
          
          // Return with the contact's customer_code as redemption_code
          return {
            ...linkedRecipient,
            redemption_code: contact.customer_code,
          } as RecipientData;
        }
        
        // Contact exists but not assigned to a campaign
        throw new Error("Contact found but not assigned to any active campaign. Please add this contact to a campaign first.");
      }

      // Nothing found
      console.log('[CALL-CENTER] Code not found in recipients or contacts');
      throw new Error("Code not found. Please verify the code and ensure the contact has been added to an active campaign.");
    },
    onSuccess: (data) => {
      setRecipient(data);
      // NEW: Go to opt-in step first instead of contact
      setStep("optin");
      
      // Notify parent with recipient data and clientId
      const recipientCampaign = data.audiences?.campaigns?.[0];
      if (onRecipientLoaded && recipientCampaign) {
        onRecipientLoaded({
          clientId: (recipientCampaign as any).client_id,
          campaignId: recipientCampaign.id,
          recipient: data,
          step: "optin"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Step 3: Provision gift card
  const provisionMutation = useMutation({
    mutationFn: async () => {
      if (!recipient || !selectedConditionId) {
        throw new Error("Missing required information");
      }

      if (!phone) {
        throw new Error("Please enter phone number");
      }

      const condition = recipient.audiences?.campaigns?.[0]?.campaign_conditions?.find(
        c => c.id === selectedConditionId
      );

      const { data, error } = await supabase.functions.invoke("provision-gift-card-for-call-center", {
        body: {
          redemptionCode: recipient.redemption_code,
          deliveryPhone: phone,
          deliveryEmail: null,
          conditionNumber: condition?.condition_number,
          conditionId: selectedConditionId,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);
      return data as ProvisionResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("complete");
      toast({
        title: "Gift Card Provisioned",
        description: "Successfully redeemed gift card for customer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartNew = () => {
    setStep("code");
    setRedemptionCode("");
    setRecipient(null);
    setCellPhone("");
    setCallSessionId(null);
    setPhone("");
    setSelectedConditionId("");
    setResult(null);
    setVerificationMethod("sms");
    setShowSkipDisposition(false);
    setSelectedDisposition("");
    setEmailVerificationSent(false);
  };

  const copyAllDetails = () => {
    if (!result?.giftCard) return;

    const card = result.giftCard;
    const pool = card.gift_card_pools;
    const brand = pool?.gift_card_brands;
    const value = pool?.card_value || card.card_value || 0;

    const details = `${brand?.brand_name || pool?.provider || "Gift Card"}
Value: $${value.toFixed(2)}
Code: ${card.card_code}
${card.card_number ? `Card Number: ${card.card_number}` : ""}
${card.expiration_date ? `Expires: ${new Date(card.expiration_date).toLocaleDateString()}` : ""}`;

    navigator.clipboard.writeText(details);
    toast({
      title: "Copied!",
      description: "All gift card details copied to clipboard",
    });
  };

  // campaign is already declared at line 113, so we just use it here
  const activeConditions = campaign?.campaign_conditions?.filter(c => c.is_active) || [];
  
  // Get gift card config for selected condition (marketplace model)
  const giftCardConfig = campaign?.campaign_gift_card_config?.find(
    gc => gc.condition_number === parseInt(selectedConditionId)
  );
  
  // For backward compatibility with PoolInventoryWidget, we'll pass config instead of poolId
  const poolId = giftCardConfig ? `${giftCardConfig.brand_id}-${giftCardConfig.denomination}` : null;

  return (
    <div className="space-y-6">
      {/* Progress Indicator - Updated with Opt-in step */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Badge variant={["code", "optin", "contact", "condition", "complete"].includes(step) ? "default" : "outline"}>
          1. Code
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge 
          variant={["optin", "contact", "condition", "complete"].includes(step) ? "default" : "outline"}
          className={step === "optin" && optInStatus.isPending ? "animate-pulse bg-yellow-500" : ""}
        >
          2. Opt-In
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={["contact", "condition", "complete"].includes(step) ? "default" : "outline"}>
          3. Contact
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={["condition", "complete"].includes(step) ? "default" : "outline"}>
          4. Condition
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === "complete" ? "default" : "outline"}>
          5. Complete
        </Badge>
      </div>

      {/* Step 1: Code Entry */}
      {step === "code" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Enter Confirmation Code
            </CardTitle>
            <CardDescription>
              Enter the unique confirmation code provided by the customer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Confirmation Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g., ABC-1234)"
                  className="text-lg font-mono uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      lookupMutation.mutate(redemptionCode.trim());
                    }
                  }}
                />
                <Button
                  onClick={() => lookupMutation.mutate(redemptionCode.trim())}
                  disabled={lookupMutation.isPending || !redemptionCode.trim()}
                  className="min-w-[120px]"
                >
                  {lookupMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Look Up
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: SMS Opt-In (NEW - Critical Flow) */}
      {step === "optin" && recipient && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Cell Phone & SMS Opt-In
            </CardTitle>
            <CardDescription>
              Get the customer's cell phone first - this sends the opt-in SMS automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer info */}
            {(recipient.first_name || recipient.last_name) && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {recipient.first_name} {recipient.last_name}
                </span>
                <Badge variant="outline" className="ml-auto">
                  Code: {recipient.redemption_code}
                </Badge>
              </div>
            )}

            {/* Cell phone input and send button */}
            <div className="space-y-3">
              <Label htmlFor="cellphone" className="text-base font-semibold">
                Customer's Cell Phone Number
              </Label>
              <div className="flex gap-2">
                <Input
                  id="cellphone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={cellPhone}
                  onChange={(e) => setCellPhone(e.target.value)}
                  disabled={optInStatus.status !== 'not_sent' && optInStatus.status !== 'invalid_response'}
                  className="text-lg"
                />
                <Button 
                  onClick={sendOptInSms}
                  disabled={
                    !cellPhone || 
                    isSendingOptIn || 
                    (optInStatus.status !== 'not_sent' && optInStatus.status !== 'invalid_response')
                  }
                  className="min-w-[140px]"
                >
                  {isSendingOptIn ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Opt-In SMS
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Real-time opt-in status indicator */}
            <OptInStatusIndicator 
              status={optInStatus.status} 
              response={optInStatus.response}
              sentAt={optInStatus.sentAt}
              responseAt={optInStatus.responseAt}
              onRefresh={optInStatus.refresh}
              isLoading={optInStatus.isLoading}
            />

            {/* Instructions for agent */}
            {optInStatus.isPending && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>While waiting:</strong> Continue with your sales spiel. The status will update 
                  automatically when the customer replies. Ask them to check their phone and reply YES.
                </AlertDescription>
              </Alert>
            )}

            {/* Cannot proceed warning */}
            {optInStatus.isOptedOut && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Customer opted out.</strong> You cannot proceed with gift card provisioning 
                  for this customer as they declined marketing messages.
                </AlertDescription>
              </Alert>
            )}

            <Separator className="my-4" />

            {/* Alternative Verification Options */}
            {!showSkipDisposition && (
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Alternative Verification Methods</Label>
                <div className="flex flex-wrap gap-2">
                  {/* Email Verification Button */}
                  <Button
                    variant="outline"
                    onClick={sendEmailVerification}
                    disabled={!recipient?.email || isSendingEmailVerification || emailVerificationSent}
                    className="flex-1 min-w-[140px]"
                  >
                    {isSendingEmailVerification ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : emailVerificationSent ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Email Sent
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Verify via Email
                      </>
                    )}
                  </Button>
                  
                  {/* Skip Verification Button */}
                  <Button
                    variant="secondary"
                    onClick={() => setShowSkipDisposition(true)}
                    className="flex-1 min-w-[140px]"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip Verification
                  </Button>
                </div>
                
                {!recipient?.email && (
                  <p className="text-xs text-muted-foreground">
                    Email verification not available - no email on file
                  </p>
                )}
              </div>
            )}

            {/* Skip Verification - Disposition Selection */}
            {showSkipDisposition && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Select Disposition</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSkipDisposition(false)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
                
                {/* Positive Dispositions - Customer gets gift card */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <ThumbsUp className="h-4 w-4" />
                    Positive (Customer Gets Gift Card)
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    ⚠️ Admin will be notified if you skip verification with a positive disposition
                  </p>
                  <div className="grid gap-2">
                    {POSITIVE_DISPOSITIONS.map((disposition) => (
                      <Button
                        key={disposition.value}
                        variant="outline"
                        className="justify-start h-auto py-2 border-green-200 hover:bg-green-50 hover:border-green-400"
                        onClick={() => handleSkipDisposition(disposition.value)}
                        disabled={isSubmittingDisposition}
                      >
                        <div className="text-left">
                          <div className="font-medium">{disposition.label}</div>
                          <div className="text-xs text-muted-foreground">{disposition.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Negative Dispositions - No gift card */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <ThumbsDown className="h-4 w-4" />
                    Negative (No Gift Card)
                  </div>
                  <div className="grid gap-2">
                    {NEGATIVE_DISPOSITIONS.map((disposition) => (
                      <Button
                        key={disposition.value}
                        variant="outline"
                        className="justify-start h-auto py-2 border-red-200 hover:bg-red-50 hover:border-red-400"
                        onClick={() => handleSkipDisposition(disposition.value)}
                        disabled={isSubmittingDisposition}
                      >
                        <div className="text-left">
                          <div className="font-medium">{disposition.label}</div>
                          <div className="text-xs text-muted-foreground">{disposition.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleStartNew}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button
                onClick={() => setStep("contact")}
                disabled={!optInStatus.isOptedIn && !emailVerificationSent}
                className="flex-1"
              >
                {optInStatus.isOptedIn ? (
                  <>
                    Continue to Delivery
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : emailVerificationSent ? (
                  <>
                    Continue (Email Sent)
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  "Waiting for Opt-In..."
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Contact Method (Delivery) */}
      {step === "contact" && recipient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Gift Card SMS Delivery
            </CardTitle>
            <CardDescription>
              Enter the phone number to send the gift card via text message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Opt-in status badge */}
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">Customer Opted In</span>
              </div>
              <span className="text-sm text-green-600">Ready to proceed</span>
            </div>

            {/* Show customer name if available */}
            {(recipient.first_name || recipient.last_name) && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {recipient.first_name} {recipient.last_name}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number for SMS Delivery</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {cellPhone && phone === cellPhone && (
                  <p className="text-xs text-muted-foreground">
                    ✓ Using the same number from opt-in
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("optin")}>
                Back
              </Button>
              <Button
                onClick={() => setStep("condition")}
                disabled={!phone}
                className="flex-1"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Condition Selection */}
      {step === "condition" && recipient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Select Condition Completed
            </CardTitle>
            <CardDescription>
              Which condition did the customer complete?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Opt-in validation reminder - only show if not opted in AND not skipped with positive disposition */}
            {!optInStatus.isOptedIn && !(verificationMethod === "skipped" && POSITIVE_DISPOSITIONS.some(d => d.value === selectedDisposition)) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Customer has not opted in via SMS. 
                  You should not proceed unless they have explicitly opted in.
                </AlertDescription>
              </Alert>
            )}
            
            {campaign && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Campaign</div>
                <div className="font-medium">{campaign.name}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={selectedConditionId} onValueChange={setSelectedConditionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the condition the customer completed" />
                </SelectTrigger>
                <SelectContent>
                  {activeConditions.map((condition) => (
                    <SelectItem key={condition.id} value={condition.id}>
                      Condition {condition.condition_number}: {condition.condition_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("contact")}>
                Back
              </Button>
              {(() => {
                // Check if verification was completed via any method
                const hasValidVerification = optInStatus.isOptedIn || 
                  (verificationMethod === "skipped" && POSITIVE_DISPOSITIONS.some(d => d.value === selectedDisposition)) ||
                  (verificationMethod === "email");
                
                return (
                  <Button
                    onClick={() => provisionMutation.mutate()}
                    disabled={!selectedConditionId || provisionMutation.isPending || !hasValidVerification}
                    className="flex-1"
                  >
                    {provisionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Provisioning...
                      </>
                    ) : !hasValidVerification ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Requires Opt-In
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4 mr-2" />
                        Provision Gift Card
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Gift Card Display */}
      {step === "complete" && result && (
        <>
          {/* Pool Inventory */}
          {result.giftCard.gift_card_pools?.id && (
            <PoolInventoryWidget poolId={result.giftCard.gift_card_pools.id} />
          )}

          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Gift Card Provisioned
                </span>
                <Button onClick={copyAllDetails} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </CardTitle>
              <CardDescription>
                Share these details with the customer
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Customer Info */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {result.recipient.firstName} {result.recipient.lastName}
                </span>
                {result.recipient.phone && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{result.recipient.phone}</span>
                  </>
                )}
              </div>

              {/* Brand and Value */}
              <div className="text-center space-y-2">
                {result.giftCard.gift_card_pools?.gift_card_brands?.logo_url && (
                  <img
                    src={result.giftCard.gift_card_pools.gift_card_brands.logo_url}
                    alt={result.giftCard.gift_card_pools.gift_card_brands.brand_name}
                    className="h-12 mx-auto object-contain"
                  />
                )}
                <div className="text-4xl font-bold text-primary">
                  ${(result.giftCard.gift_card_pools?.card_value || result.giftCard.card_value || 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.giftCard.gift_card_pools?.gift_card_brands?.brand_name || 
                   result.giftCard.gift_card_pools?.provider || "Gift Card"}
                </div>
              </div>

              <Separator />

              {/* Card Details */}
              <div className="space-y-3">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Gift Card Code</div>
                  <div className="font-mono text-xl font-bold tracking-wider">
                    {result.giftCard.card_code}
                  </div>
                </div>

                {result.giftCard.card_number && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Card Number</div>
                    <div className="font-mono text-lg font-semibold">
                      {result.giftCard.card_number}
                    </div>
                  </div>
                )}

                {result.giftCard.expiration_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Expires: {new Date(result.giftCard.expiration_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {result.giftCard.gift_card_pools?.gift_card_brands?.balance_check_url && (
                  <div className="pt-2">
                    <a
                      href={result.giftCard.gift_card_pools.gift_card_brands.balance_check_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Check balance online →
                    </a>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {result.recipient.phone && (
                  <ResendSmsButton
                    giftCardId={result.giftCard.id}
                    recipientId={result.recipient.id}
                    recipientPhone={result.recipient.phone}
                    giftCardCode={result.giftCard.card_code}
                    giftCardValue={result.giftCard.gift_card_pools?.card_value || result.giftCard.card_value || 0}
                    brandName={result.giftCard.gift_card_pools?.gift_card_brands?.brand_name || 
                               result.giftCard.gift_card_pools?.provider}
                    cardNumber={result.giftCard.card_number || undefined}
                  />
                )}
                
                <Button onClick={handleStartNew} variant="outline" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Redeem Another Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

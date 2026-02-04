import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { logger } from '@/core/services/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { useToast } from '@shared/hooks';
import { Search, Gift, Copy, RotateCcw, CheckCircle, AlertCircle, User, Mail, Phone, MessageSquare, Loader2, ArrowRight, ArrowLeft, Send, Info, XCircle, SkipForward, ThumbsUp, ThumbsDown, ExternalLink, ClipboardCopy, StickyNote, ChevronDown, ChevronRight, Save, Clock, UserX } from "lucide-react";
import { Separator } from "@/shared/components/ui/separator";
import { Textarea } from "@/shared/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { EnrichmentPanel } from "./EnrichmentPanel";
import { ResendSmsButton } from "./ResendSmsButton";
import { OptInStatusIndicator } from "./OptInStatusIndicator";
import { CampaignSelectionStep } from "./steps/CampaignSelectionStep";
import { useOptInStatus } from '@/features/settings/hooks';
import { useRedemptionLogger } from '../hooks/useRedemptionLogger';
import { formatPhoneNumber } from '@/shared/utils/formatPhone';
import { useTenant } from '@/contexts/TenantContext';

type WorkflowStep = "code" | "campaign_select" | "optin" | "condition" | "complete";
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

// Error code descriptions and recommendations for better user guidance
const PROVISIONING_ERROR_INFO: Record<string, { description: string; recommendation: string; canRetry: boolean }> = {
  'GC-001': { description: 'Campaign condition missing gift card config', recommendation: 'Contact admin to configure gift card brand and value for this campaign condition.', canRetry: false },
  'GC-002': { description: 'Gift card brand not found', recommendation: 'The configured brand may have been deleted or disabled. Contact admin.', canRetry: false },
  'GC-003': { description: 'No gift card inventory available', recommendation: 'No cards in stock. Admin needs to upload inventory or configure Tillo API.', canRetry: true },
  'GC-004': { description: 'Tillo API not configured', recommendation: 'Admin must configure Tillo API credentials or upload gift card inventory.', canRetry: false },
  'GC-005': { description: 'Tillo API call failed', recommendation: 'External API issue. Wait a moment and try again. If persistent, contact admin.', canRetry: true },
  'GC-006': { description: 'Insufficient credits', recommendation: 'Client/agency account needs more credits. Contact admin to add funds.', canRetry: false },
  'GC-007': { description: 'Billing transaction failed', recommendation: 'Database error. Card may be provisioned - check before retrying. Contact support.', canRetry: false },
  'GC-008': { description: 'Campaign billing not configured', recommendation: 'Campaign missing client/billing setup. Contact admin.', canRetry: false },
  'GC-009': { description: 'Recipient verification required', recommendation: 'Customer must complete SMS opt-in or email verification first.', canRetry: true },
  'GC-010': { description: 'Gift card already provisioned', recommendation: 'This customer already received a gift card for this condition.', canRetry: false },
  'GC-011': { description: 'Invalid redemption code', recommendation: 'Verify the code and ensure customer is in an active campaign.', canRetry: true },
  'GC-012': { description: 'Missing required parameters', recommendation: 'Some required information was not provided. Try again.', canRetry: true },
  'GC-013': { description: 'Database function error', recommendation: 'System error. Contact admin to check database migrations.', canRetry: false },
  'GC-014': { description: 'SMS/Email delivery failed', recommendation: 'Card was provisioned but delivery notification failed. Try resending.', canRetry: true },
  'GC-015': { description: 'Unknown provisioning error', recommendation: 'Unexpected error. Check request ID in System Health for details.', canRetry: true },
};

interface ProvisioningError {
  message: string;
  errorCode?: string;
  requestId?: string;
  canRetry?: boolean;
  requiresCampaignEdit?: boolean;
}

interface CampaignGiftCardConfig {
  id: string;
  brand_id: string;
  denomination: number;
  condition_number: number;
}

// Existing gift card assignment for previously redeemed recipients
interface ExistingCard {
  id: string;
  giftCardId: string;
  conditionId: string;
  conditionName: string;
  conditionNumber: number;
  cardCode: string;
  cardNumber?: string;
  cardValue: number;
  brandName: string;
  brandLogo?: string;
  assignedAt: string;
  deliveredAt?: string;
  deliveryStatus: string;
  // Campaign info for the gift card (may differ from recipient's current campaign)
  campaignId?: string;
  campaignName?: string;
  campaignStatus?: string;
  clientName?: string;
}

interface RecipientData {
  id: string;
  redemption_code: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  approval_status: string;
  campaign_id?: string;  // Direct campaign link
  campaign?: {           // Direct campaign data (replaces audiences.campaigns)
    id: string;
    name: string;
    status?: string;
    client_id?: string;
    sms_opt_in_message?: string;
    clients?: { id: string; name: string };
    campaign_conditions?: Array<{
      id: string;
      condition_number: number;
      condition_name: string;
      is_active: boolean;
      brand_id?: string | null;
      card_value?: number | null;
    }>;
    campaign_gift_card_config?: CampaignGiftCardConfig[];
  };
  audience?: {           // Simplified audience data
    id: string;
    name: string;
  };
  // Legacy support - will be populated from campaign for backward compatibility
  audiences?: {
    id: string;
    name: string;
    campaigns?: Array<{
      id: string;
      name: string;
      status?: string;
      client_id?: string;
      sms_opt_in_message?: string;
      clients?: { id: string; name: string };
      campaign_conditions?: Array<{
        id: string;
        condition_number: number;
        condition_name: string;
        is_active: boolean;
        brand_id?: string | null;
        card_value?: number | null;
      }>;
      campaign_gift_card_config?: CampaignGiftCardConfig[];
    }>;
  };
  // Previously redeemed gift cards for this recipient
  existingCards?: ExistingCard[];
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
  const { logStep, startNewSession, getSessionId } = useRedemptionLogger();
  const { currentClient, currentOrg } = useTenant();
  
  // Cross-client warning dialog state
  const [showCrossClientWarning, setShowCrossClientWarning] = useState(false);
  const [pendingRecipients, setPendingRecipients] = useState<RecipientData[]>([]);
  const [crossClientInfo, setCrossClientInfo] = useState<{ clientName: string; clientId: string } | null>(null);
  
  // Step 1: Code Entry
  const [step, setStep] = useState<WorkflowStep>("code");
  const [redemptionCode, setRedemptionCode] = useState("");
  const [recipient, setRecipient] = useState<RecipientData | null>(null);
  
  // Campaign Selection (when code matches multiple campaigns)
  const [multipleRecipients, setMultipleRecipients] = useState<RecipientData[]>([]);
  
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
  
  // Simulation mode for testing - skip real SMS sending
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationCountdown, setSimulationCountdown] = useState(0);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Step 3: Contact Method (merged into opt-in step)
  const [phone, setPhone] = useState("");
  const [showDifferentDeliveryPhone, setShowDifferentDeliveryPhone] = useState(false);

  // Call notes
  const [callNotes, setCallNotes] = useState("");
  
  // Step 4: Condition Selection
  const [selectedConditionId, setSelectedConditionId] = useState("");
  
  // Step 5: Result
  const [result, setResult] = useState<ProvisionResult | null>(null);
  
  // Error tracking for comprehensive error display
  const [provisioningError, setProvisioningError] = useState<ProvisioningError | null>(null);

  // Mark Ineligible dialog state
  const [showIneligibleDialog, setShowIneligibleDialog] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState("");
  const [ineligibleNote, setIneligibleNote] = useState("");
  const [isMarkingIneligible, setIsMarkingIneligible] = useState(false);

  // Real-time opt-in status tracking
  const optInStatus = useOptInStatus(callSessionId, recipient?.id || null);

  // Get client name for SMS message - now using direct campaign link
  const campaign = recipient?.campaign || recipient?.audiences?.campaigns?.[0];
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

  // Auto-notification when opted in (no longer auto-advances - agent continues collecting data)
  useEffect(() => {
    if (optInStatus.isOptedIn && step === "optin") {
      // Set delivery phone to cell phone if not already set
      if (!phone || phone === cellPhone) {
        setPhone(cellPhone);
      }
      toast({
        title: "Customer Opted In!",
        description: "You can now proceed with the gift card provisioning.",
      });
    }
  }, [optInStatus.isOptedIn, step, toast, cellPhone, phone]);

  // Handle campaign selection when multiple recipients match the code
  const handleCampaignSelect = (selectedRecipient: RecipientData) => {
    console.log('[CALL-CENTER] Campaign selected:', {
      recipientId: selectedRecipient.id,
      campaignId: selectedRecipient.campaign?.id,
      campaignName: selectedRecipient.campaign?.name,
    });
    
    // Log campaign selection
    logStep({
      stepName: 'campaign_select',
      stepNumber: 2,
      status: 'success',
      recipientId: selectedRecipient.id,
      campaignId: selectedRecipient.campaign?.id,
      redemptionCode: selectedRecipient.redemption_code,
      requestPayload: {
        availableCampaigns: multipleRecipients.length,
        selectedCampaignName: selectedRecipient.campaign?.name,
      },
    });
    
    setRecipient(selectedRecipient);
    setMultipleRecipients([]);
    
    // Notify parent with recipient data
    const recipientCampaign = selectedRecipient.campaign;
    if (onRecipientLoaded && recipientCampaign) {
      onRecipientLoaded({
        clientId: (recipientCampaign as any).client_id,
        campaignId: recipientCampaign.id,
        recipient: selectedRecipient,
        step: "optin"
      });
    }
    
    setStep("optin");
    
    toast({
      title: "Campaign Selected",
      description: `Proceeding with ${recipientCampaign?.name || 'selected campaign'}`,
    });
  };

  // Handle resend of existing gift card (for previously redeemed codes)
  const handleResendExistingCard = (selectedRecipient: RecipientData, existingCard: ExistingCard) => {
    console.log('[CALL-CENTER] Resending existing card:', {
      recipientId: selectedRecipient.id,
      cardId: existingCard.giftCardId,
      brandName: existingCard.brandName,
      cardValue: existingCard.cardValue,
    });
    
    // Log the resend action
    logStep({
      stepName: 'resend_existing_card',
      stepNumber: 6,
      status: 'started',
      recipientId: selectedRecipient.id,
      campaignId: selectedRecipient.campaign?.id,
      redemptionCode: selectedRecipient.redemption_code,
      requestPayload: {
        existingCardId: existingCard.id,
        giftCardId: existingCard.giftCardId,
        brandName: existingCard.brandName,
        cardValue: existingCard.cardValue,
        conditionName: existingCard.conditionName,
      },
    });
    
    // Set the recipient
    setRecipient(selectedRecipient);
    setMultipleRecipients([]);
    
    // Pre-fill phone if available
    if (selectedRecipient.phone) {
      setPhone(selectedRecipient.phone);
      setCellPhone(selectedRecipient.phone);
    }
    
    // Transform existing card data into ProvisionResult format
    const resendResult: ProvisionResult = {
      success: true,
      recipient: {
        id: selectedRecipient.id,
        firstName: selectedRecipient.first_name || '',
        lastName: selectedRecipient.last_name || '',
        phone: selectedRecipient.phone,
        email: selectedRecipient.email,
      },
      giftCard: {
        id: existingCard.giftCardId,
        card_code: existingCard.cardCode,
        card_number: existingCard.cardNumber || null,
        card_value: existingCard.cardValue,
        expiration_date: null,
        gift_card_pools: {
          id: existingCard.giftCardId,
          pool_name: existingCard.brandName,
          card_value: existingCard.cardValue,
          provider: existingCard.brandName,
          gift_card_brands: {
            brand_name: existingCard.brandName,
            logo_url: existingCard.brandLogo || null,
            balance_check_url: null,
          },
        },
      },
    };
    
    // Set the result and skip to complete step
    setResult(resendResult);
    setStep("complete");
    
    // Log success
    logStep({
      stepName: 'resend_existing_card',
      stepNumber: 6,
      status: 'success',
      recipientId: selectedRecipient.id,
      campaignId: selectedRecipient.campaign?.id,
      redemptionCode: selectedRecipient.redemption_code,
      responsePayload: {
        cardId: existingCard.giftCardId,
        brandName: existingCard.brandName,
        cardValue: existingCard.cardValue,
      },
    });
    
    toast({
      title: "Previously Redeemed Card Found",
      description: `Showing existing ${existingCard.brandName} $${existingCard.cardValue.toFixed(2)} gift card. Use the resend button to send it again.`,
    });
  };

  // Send SMS opt-in
  const sendOptInSms = async () => {
    const smsStartTime = Date.now();
    
    // Debug logging to help diagnose issues
    console.log('[SEND-OPT-IN] Attempting to send SMS:', {
      hasCellPhone: !!cellPhone,
      hasRecipient: !!recipient,
      hasCampaign: !!campaign,
      campaignId: campaign?.id,
      recipientId: recipient?.id,
    });

    // Provide user feedback for missing data instead of silent return
    if (!campaign) {
      console.error('[SEND-OPT-IN] Campaign is missing!', { recipient });
      
      // Log validation failure
      await logStep({
        stepName: 'sms_opt_in',
        stepNumber: 3,
        status: 'failed',
        recipientId: recipient?.id,
        redemptionCode: recipient?.redemption_code,
        errorCode: 'MISSING_CAMPAIGN',
        errorMessage: 'Campaign data is not available for this recipient',
      });
      
      toast({
        title: "Cannot Send SMS",
        description: "Campaign data is not available for this recipient. The recipient may not be properly linked to a campaign.",
        variant: "destructive",
      });
      return;
    }
    
    if (!cellPhone) {
      toast({
        title: "Phone Required",
        description: "Please enter a cell phone number first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!recipient) {
      toast({
        title: "No Recipient",
        description: "Please look up a redemption code first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingOptIn(true);
    
    // Log SMS opt-in started
    await logStep({
      stepName: 'sms_opt_in',
      stepNumber: 3,
      status: 'started',
      recipientId: recipient.id,
      campaignId: campaign.id,
      callSessionId: callSessionId || undefined,
      redemptionCode: recipient.redemption_code,
      requestPayload: {
        phone: cellPhone,
        clientName,
        hasCustomMessage: !!(campaign as any).sms_opt_in_message,
      },
    });
    
    try {
      console.log('[SEND-OPT-IN] Calling edge function with:', {
        recipient_id: recipient.id,
        campaign_id: campaign.id,
        phone: cellPhone,
        client_name: clientName,
      });
      
      const data = await callEdgeFunction<{ error?: string; messageSid?: string; provider?: string; call_session_id?: string }>(
        Endpoints.messaging.sendOptIn,
        {
          recipient_id: recipient.id,
          campaign_id: campaign.id,
          call_session_id: callSessionId,
          phone: cellPhone,
          client_name: clientName,
          custom_message: (campaign as any).sms_opt_in_message || undefined, // Pass campaign's custom opt-in message
        }
      );
      
      console.log('[SEND-OPT-IN] Edge function response:', { data });
      
      if (data.error) throw new Error(data.error);
      
      // Log SMS success
      await logStep({
        stepName: 'sms_opt_in',
        stepNumber: 3,
        status: 'success',
        recipientId: recipient.id,
        campaignId: campaign.id,
        callSessionId: callSessionId || undefined,
        redemptionCode: recipient.redemption_code,
        responsePayload: {
          messageSid: data.messageSid,
          provider: data.provider,
          callSessionId: data.call_session_id,
        },
        durationMs: Date.now() - smsStartTime,
      });
      
      // Log to recipient_audit_log for Recent Activity sidebar
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user && recipient?.id) {
          await supabase.from('recipient_audit_log').insert({
            recipient_id: recipient.id,
            action: 'sms_sent',
            performed_by_user_id: user.user.id,
            call_session_id: callSessionId,
            metadata: {
              sms_type: 'opt_in',
              phone: cellPhone,
              campaign_id: campaign.id,
              campaign_name: campaign.name,
            },
          });
        }
      } catch (auditError) {
        logger.warn('[CALL-CENTER] Failed to log SMS to recipient_audit_log:', auditError);
      }
      
      // Pre-fill delivery phone with opt-in phone
      setPhone(cellPhone);

      // Refresh opt-in status after short delay to sync 'pending' state from DB.
      // This enables the polling fallback (which only runs when status === 'pending').
      setTimeout(() => optInStatus.refresh(), 500);

      toast({
        title: "Opt-in SMS Sent!",
        description: "Ask customer to reply YES to continue. You can proceed with the spiel while waiting.",
      });
    } catch (error: any) {
      console.error('[SEND-OPT-IN] Error:', error);
      
      // Try to extract the actual error from the edge function response body
      let actualError = error.message || 'Failed to send SMS';
      let errorCode = 'SMS_SEND_FAILED';
      
      // Parse error body from edge function if available (FunctionsHttpError)
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorData = await error.context.json();
          console.log('[SEND-OPT-IN] Parsed edge function error:', errorData);
          actualError = errorData.error || errorData.message || actualError;
          errorCode = errorData.errorCode || errorCode;
        } catch (parseErr) {
          console.warn('[SEND-OPT-IN] Could not parse error context:', parseErr);
        }
      }
      
      // Log SMS failure with detailed error
      await logStep({
        stepName: 'sms_opt_in',
        stepNumber: 3,
        status: 'failed',
        recipientId: recipient.id,
        campaignId: campaign.id,
        callSessionId: callSessionId || undefined,
        redemptionCode: recipient.redemption_code,
        errorCode: errorCode,
        errorMessage: actualError,
        errorStack: error.stack,
        durationMs: Date.now() - smsStartTime,
      });
      
      toast({
        title: "Failed to send SMS",
        description: actualError || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSendingOptIn(false);
    }
  };

  // Simulate SMS opt-in (for testing - no real SMS sent)
  const simulateSmsOptIn = async () => {
    if (!cellPhone || !recipient || !campaign) return;
    
    setIsSimulating(true);
    setIsSimulatedMode(true);
    setSimulationCountdown(10);
    setPhone(cellPhone);
    
    toast({
      title: "🧪 Simulated SMS Sent",
      description: "Simulating opt-in response in 10 seconds...",
    });
    
    // Update recipient to pending status in database
    await supabase
      .from('recipients')
      .update({
        sms_opt_in_status: 'pending',
        sms_opt_in_sent_at: new Date().toISOString(),
        verification_method: 'sms',
      })
      .eq('id', recipient.id);
    
    // Start countdown
    simulationTimerRef.current = setInterval(() => {
      setSimulationCountdown(prev => {
        if (prev <= 1) {
          // Clear interval
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          // Trigger the opt-in simulation
          simulateOptInConfirmation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Complete the simulation - mark as opted in
  const simulateOptInConfirmation = async () => {
    if (!recipient) return;
    
    // Update recipient to opted_in in the database
    await supabase
      .from('recipients')
      .update({
        sms_opt_in_status: 'opted_in',
        sms_opt_in_response: 'YES (SIMULATED)',
        sms_opt_in_response_at: new Date().toISOString(),
      })
      .eq('id', recipient.id);
    
    setIsSimulating(false);
    
    toast({
      title: "✅ Simulated Opt-In Confirmed!",
      description: "Customer has been marked as opted in (simulated).",
    });
    
    // Refresh opt-in status
    optInStatus.refresh();
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

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
      const data = await callEdgeFunction<{ error?: string }>(
        Endpoints.messaging.sendVerificationEmail,
        {
          recipient_id: recipient.id,
          campaign_id: campaign.id,
          email: recipient.email,
          client_name: clientName,
          recipient_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
        }
      );
      
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
  // Returns ALL matching recipients since codes can exist in multiple campaigns
  const lookupMutation = useMutation({
    mutationFn: async (code: string) => {
      const lookupStartTime = Date.now();
      logger.debug('[CALL-CENTER] Looking up code:', code.toUpperCase());
      
      // Log lookup started
      await logStep({
        stepName: 'code_lookup',
        stepNumber: 1,
        status: 'started',
        redemptionCode: code.toUpperCase(),
        requestPayload: { code: code.toUpperCase() },
      });

      // Primary lookup: Get ALL recipients with this code (not maybeSingle!)
      // Codes are unique per audience, so the same code can exist in multiple campaigns
      // Also fetch existing gift card assignments to check for previous redemptions
      const { data: recipients, error: recipientError } = await supabase
        .from("recipients")
        .select(`
          *,
          campaign:campaigns (
            id,
            name,
            status,
            client_id,
            sms_opt_in_message,
            mail_date,
            created_at,
            clients (id, name),
            campaign_conditions (*),
            campaign_gift_card_config (*)
          ),
          audience:audiences (
            id,
            name
          ),
          recipient_gift_cards (
            id,
            campaign_id,
            gift_card_id,
            inventory_card_id,
            condition_id,
            assigned_at,
            delivered_at,
            delivery_status,
            campaign:campaigns (
              id,
              name,
              status,
              client_id,
              clients (id, name)
            ),
            campaign_conditions (
              condition_name,
              condition_number
            )
          )
        `)
        .eq("redemption_code", code.toUpperCase());

      if (recipientError) {
        throw new Error("Failed to lookup code: " + recipientError.message);
      }

      if (!recipients || recipients.length === 0) {
        throw new Error("Code not found. Please verify the code and ensure the contact has been added to an active campaign.");
      }

      console.log(`[CALL-CENTER] Found ${recipients.length} recipient(s) with code:`, code.toUpperCase());

      // Fetch gift cards from gift_card_inventory for ALL recipients (secondary query)
      // This is needed because the reverse FK join might not work reliably
      const recipientIds = recipients.map(r => r.id);
      const { data: inventoryCards, error: inventoryError } = await supabase
        .from("gift_card_inventory")
        .select(`
          id,
          card_code,
          card_number,
          denomination,
          status,
          assigned_to_recipient_id,
          assigned_to_campaign_id,
          assignment_condition_id,
          assigned_at,
          delivered_at,
          provider,
          brand:gift_card_brands (
            id,
            brand_name,
            logo_url
          ),
          campaign:campaigns!gift_card_inventory_assigned_to_campaign_id_fkey (
            id,
            name,
            status,
            client_id,
            clients (id, name)
          ),
          condition:campaign_conditions!gift_card_inventory_assignment_condition_id_fkey (
            id,
            condition_name,
            condition_number
          )
        `)
        .in("assigned_to_recipient_id", recipientIds);

      if (inventoryError) {
        console.warn('[CALL-CENTER] Error fetching gift_card_inventory:', inventoryError);
      } else {
        console.log(`[CALL-CENTER] Found ${inventoryCards?.length || 0} gift cards in inventory for recipients`);
      }

      // Group inventory cards by recipient_id for easy lookup
      const inventoryByRecipient = new Map<string, any[]>();
      if (inventoryCards) {
        for (const card of inventoryCards) {
          const recipientId = card.assigned_to_recipient_id;
          if (!inventoryByRecipient.has(recipientId)) {
            inventoryByRecipient.set(recipientId, []);
          }
          inventoryByRecipient.get(recipientId)!.push(card);
        }
      }

      // For each recipient, try to populate campaign if missing (via audience fallback)
      for (const recipient of recipients) {
        // Attach inventory cards to recipient
        recipient.gift_card_inventory = inventoryByRecipient.get(recipient.id) || [];
        
        if (!recipient.campaign && recipient.audience_id) {
          console.log('[CALL-CENTER] Recipient', recipient.id, 'missing campaign, trying audience fallback...');
          const { data: audienceCampaign } = await supabase
            .from("campaigns")
            .select(`
              id,
              name,
              status,
              client_id,
              sms_opt_in_message,
              mail_date,
              created_at,
              clients (id, name),
              campaign_conditions (*),
              campaign_gift_card_config (*)
            `)
            .eq("audience_id", recipient.audience_id)
            .maybeSingle();
          
          if (audienceCampaign) {
            recipient.campaign = audienceCampaign;
            
            // Backfill campaign_id on recipient for future lookups (fire and forget)
            supabase
              .from("recipients")
              .update({ campaign_id: audienceCampaign.id })
              .eq("id", recipient.id)
              .then(() => console.log('[CALL-CENTER] Backfilled campaign_id for recipient:', recipient.id));
          }
        }
      }

      // Filter to only recipients with valid campaigns in active statuses
      // Also include recipients who have gift cards from active campaigns (even if their current campaign is inactive)
      const activeStatuses = ["in_production", "mailed", "scheduled"];
      const validRecipients = recipients.filter(r => {
        // Check if recipient's current campaign is active
        const currentCampaignActive = r.campaign && activeStatuses.includes(r.campaign.status);
        
        // Check if recipient has any gift cards from active campaigns (from recipient_gift_cards)
        const hasActiveGiftCardsFromJunction = r.recipient_gift_cards?.some((rgc: any) => {
          const cardCampaign = rgc.campaign;
          return cardCampaign && activeStatuses.includes(cardCampaign.status);
        });
        
        // Check if recipient has any gift cards from gift_card_inventory
        const hasActiveGiftCardsFromInventory = r.gift_card_inventory?.some((gci: any) => {
          const cardCampaign = gci.campaign;
          return cardCampaign && activeStatuses.includes(cardCampaign.status);
        });
        
        // Also include if they have ANY gift cards (regardless of campaign status) - for resend functionality
        const hasAnyGiftCards = (r.recipient_gift_cards?.length > 0) || (r.gift_card_inventory?.length > 0);
        
        // Include if either current campaign is active OR has gift cards
        return currentCampaignActive || hasActiveGiftCardsFromJunction || hasActiveGiftCardsFromInventory || hasAnyGiftCards;
      });

      console.log(`[CALL-CENTER] After filtering: ${validRecipients.length} recipient(s) in active campaigns or with gift cards`);

      // Transform gift cards from BOTH sources into existingCards format
      // Source 1: recipient_gift_cards junction table
      // Source 2: gift_card_inventory table (direct assignment)
      for (const recipient of validRecipients) {
        const existingCards: ExistingCard[] = [];
        
        // Source 1: recipient_gift_cards junction table
        if (recipient.recipient_gift_cards && Array.isArray(recipient.recipient_gift_cards)) {
          for (const rgc of recipient.recipient_gift_cards) {
            const condition = rgc.campaign_conditions;
            const cardCampaign = rgc.campaign;
            
            existingCards.push({
              id: rgc.id,
              giftCardId: rgc.gift_card_id || rgc.inventory_card_id,
              conditionId: rgc.condition_id,
              conditionName: condition?.condition_name || 'Unknown Condition',
              conditionNumber: condition?.condition_number || 0,
              cardCode: '****',
              cardNumber: undefined,
              cardValue: 0,
              brandName: 'Gift Card',
              brandLogo: undefined,
              assignedAt: rgc.assigned_at,
              deliveredAt: rgc.delivered_at || undefined,
              deliveryStatus: rgc.delivery_status || 'unknown',
              campaignId: cardCampaign?.id || rgc.campaign_id,
              campaignName: cardCampaign?.name,
              campaignStatus: cardCampaign?.status,
              clientName: cardCampaign?.clients?.name,
            });
          }
        }
        
        // Source 2: gift_card_inventory table (direct assignment)
        if (recipient.gift_card_inventory && Array.isArray(recipient.gift_card_inventory)) {
          for (const gci of recipient.gift_card_inventory) {
            // Skip if this card ID is already in existingCards (avoid duplicates)
            const alreadyIncluded = existingCards.some(ec => ec.giftCardId === gci.id);
            if (alreadyIncluded) continue;
            
            const condition = gci.condition;
            const cardCampaign = gci.campaign;
            const brand = gci.brand;
            
            existingCards.push({
              id: gci.id,
              giftCardId: gci.id,
              conditionId: gci.assignment_condition_id,
              conditionName: condition?.condition_name || 'Unknown Condition',
              conditionNumber: condition?.condition_number || 0,
              cardCode: gci.card_code || '****',
              cardNumber: gci.card_number || undefined,
              cardValue: gci.denomination || 0,
              brandName: brand?.brand_name || gci.provider || 'Gift Card',
              brandLogo: brand?.logo_url || undefined,
              assignedAt: gci.assigned_at,
              deliveredAt: gci.delivered_at || undefined,
              deliveryStatus: gci.status || 'unknown',
              campaignId: cardCampaign?.id || gci.assigned_to_campaign_id,
              campaignName: cardCampaign?.name,
              campaignStatus: cardCampaign?.status,
              clientName: cardCampaign?.clients?.name,
            });
          }
        }
        
        recipient.existingCards = existingCards;
        
        if (existingCards.length > 0) {
          console.log(`[CALL-CENTER] Recipient ${recipient.id} has ${existingCards.length} existing card(s):`, 
            existingCards.map((c: any) => ({ 
              campaignId: c.campaignId, 
              campaignName: c.campaignName,
              cardValue: c.cardValue,
              brandName: c.brandName 
            }))
          );
        }
      }

      // If no valid recipients found, provide helpful error
      if (validRecipients.length === 0) {
        // Check why they were filtered out
        const hasCampaigns = recipients.some(r => r.campaign);
        if (!hasCampaigns) {
          throw new Error("Code found but recipient is not linked to any campaign. Please contact support.");
        }
        // All campaigns are in non-active status
        const statuses = recipients.map(r => r.campaign?.status).filter(Boolean);
        if (statuses.includes("draft")) {
          throw new Error("This contact is in a draft campaign that hasn't been activated yet.");
        }
        if (statuses.includes("completed")) {
          throw new Error("This campaign has been completed. The redemption period has ended.");
        }
        throw new Error("No active campaigns found for this code.");
      }

      // Return all valid recipients - caller will handle single vs multiple
      return validRecipients as RecipientData[];
    },
    onSuccess: (recipients: RecipientData[]) => {
      console.log('[CALL-CENTER] onSuccess - Found', recipients.length, 'recipient(s)');
      
      // Log lookup success
      logStep({
        stepName: 'code_lookup',
        stepNumber: 1,
        status: 'success',
        redemptionCode: redemptionCode.toUpperCase(),
        responsePayload: {
          recipientCount: recipients.length,
          recipients: recipients.map(r => ({
            id: r.id,
            campaignId: r.campaign?.id,
            campaignName: r.campaign?.name,
            campaignStatus: r.campaign?.status,
            clientId: r.campaign?.client_id,
            clientName: r.campaign?.clients?.name,
          })),
        },
      });
      
      // Validate client/organization context
      // Check if any recipient belongs to a different organization or client
      if (currentClient) {
        const currentClientId = currentClient.id;
        const currentOrgId = currentOrg?.id;
        
        // Check for recipients from different clients
        const crossClientRecipients = recipients.filter(r => {
          const recipientClientId = r.campaign?.client_id;
          return recipientClientId && recipientClientId !== currentClientId;
        });
        
        if (crossClientRecipients.length > 0) {
          // Check if any are from a different organization (hard block)
          const differentOrgRecipients = crossClientRecipients.filter(r => {
            const recipientOrgId = r.campaign?.clients?.org_id;
            return recipientOrgId && currentOrgId && recipientOrgId !== currentOrgId;
          });
          
          if (differentOrgRecipients.length > 0) {
            // Hard error - different organization
            toast({
              title: "Access Denied",
              description: "This code belongs to a different organization. You cannot access it.",
              variant: "destructive",
            });
            return;
          }
          
          // Same org, different client - show warning and allow confirmation
          const sameClientRecipients = recipients.filter(r => {
            const recipientClientId = r.campaign?.client_id;
            return !recipientClientId || recipientClientId === currentClientId;
          });
          
          if (sameClientRecipients.length === 0) {
            // All recipients are from different clients - show warning dialog
            const firstCrossClient = crossClientRecipients[0];
            const clientName = firstCrossClient.campaign?.clients?.name || 'another client';
            const clientId = firstCrossClient.campaign?.client_id || '';
            
            setCrossClientInfo({ clientName, clientId });
            setPendingRecipients(recipients);
            setShowCrossClientWarning(true);
            
            toast({
              title: "Different Client Detected",
              description: `This code belongs to ${clientName}. Please confirm to proceed.`,
              variant: "default",
            });
            return;
          }
          
          // Mix of same-client and cross-client - warn but continue with all
          // The agent can see which client each campaign belongs to in the selection
          toast({
            title: "Multiple Clients",
            description: "Some campaigns belong to different clients. Review carefully before selecting.",
            variant: "default",
          });
        }
      }
      
      // Proceed with normal flow
      processRecipients(recipients);
    },
    onError: (error: Error) => {
      // Log lookup failure
      logStep({
        stepName: 'code_lookup',
        stepNumber: 1,
        status: 'failed',
        redemptionCode: redemptionCode.toUpperCase(),
        errorMessage: error.message,
        errorStack: error.stack,
      });
      
      toast({
        title: "Lookup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to process recipients after validation
  const processRecipients = (recipients: RecipientData[]) => {
    if (recipients.length === 1) {
      // Single match - check if previously redeemed
      const data = recipients[0];
      const hasExistingCards = data.existingCards && data.existingCards.length > 0;
      
      console.log('[CALL-CENTER] Single recipient found:', {
        id: data.id,
        hasCampaign: !!data.campaign,
        campaignId: data.campaign?.id,
        campaignName: data.campaign?.name,
        hasExistingCards,
        existingCardsCount: data.existingCards?.length || 0,
      });
      
      // If recipient has existing cards, show campaign selection step to offer resend option
      if (hasExistingCards) {
        console.log('[CALL-CENTER] Recipient has existing cards, showing selection for resend option');
        setMultipleRecipients([data]);
        setRecipient(null);
        setStep("campaign_select");
        
        toast({
          title: "Previously Redeemed",
          description: `This code has ${data.existingCards!.length} existing gift card(s). You can resend or redeem another condition.`,
        });
      } else {
        // No existing cards - proceed directly to opt-in
        setRecipient(data);
        setMultipleRecipients([]);
        
        // Notify parent with recipient data
        const recipientCampaign = data.campaign;
        if (onRecipientLoaded && recipientCampaign) {
          onRecipientLoaded({
            clientId: (recipientCampaign as any).client_id,
            campaignId: recipientCampaign.id,
            recipient: data,
            step: "optin"
          });
        }
        
        setStep("optin");
      }
    } else {
      // Multiple matches - show campaign selection UI
      console.log('[CALL-CENTER] Multiple recipients found, showing selection:', 
        recipients.map(r => ({ id: r.id, campaign: r.campaign?.name }))
      );
      
      setMultipleRecipients(recipients);
      setRecipient(null);
      setStep("campaign_select");
      
      toast({
        title: "Multiple Campaigns Found",
        description: `This code exists in ${recipients.length} campaigns. Please select the correct one.`,
      });
    }
  };

  // Handle confirmation of cross-client access
  const handleCrossClientConfirm = () => {
    setShowCrossClientWarning(false);
    if (pendingRecipients.length > 0) {
      processRecipients(pendingRecipients);
      setPendingRecipients([]);
    }
    setCrossClientInfo(null);
  };

  // Handle cancellation of cross-client access
  const handleCrossClientCancel = () => {
    setShowCrossClientWarning(false);
    setPendingRecipients([]);
    setCrossClientInfo(null);
    setRedemptionCode("");
  };

  // Step 3: Provision gift card with comprehensive error handling
  const provisionMutation = useMutation({
    mutationFn: async () => {
      const provisionStartTime = Date.now();
      
      // Clear previous error
      setProvisioningError(null);
      
      if (!recipient || !selectedConditionId) {
        throw new Error("Missing required information");
      }

      const provCampaign = recipient.campaign || recipient.audiences?.campaigns?.[0];
      const condition = provCampaign?.campaign_conditions?.find(
        c => c.id === selectedConditionId
      );

      if (!provCampaign?.id) {
        throw new Error("Campaign not found for recipient");
      }

      if (!condition?.brand_id || !condition?.card_value) {
        throw new Error("Gift card configuration missing for this condition. Please configure the brand and value in campaign settings.");
      }

      // Log provision started
      await logStep({
        stepName: 'provision',
        stepNumber: 5,
        status: 'started',
        recipientId: recipient.id,
        campaignId: provCampaign.id,
        callSessionId: callSessionId || undefined,
        redemptionCode: recipient.redemption_code,
        requestPayload: {
          conditionId: selectedConditionId,
          conditionName: condition.condition_name,
          brandId: condition.brand_id,
          cardValue: condition.card_value,
          verificationMethod,
        },
      });

      // Pass IDs directly - recipient was already looked up on frontend
      // SMS delivery is disabled for now, card will be displayed in UI
      console.log('[Provision] Calling Edge Function with:', {
        recipientId: recipient.id,
        campaignId: provCampaign.id,
        brandId: condition.brand_id,
        denomination: condition.card_value,
        conditionId: selectedConditionId,
        phone: phone,
      });

      let data: any;
      try {
        data = await callEdgeFunction(
          Endpoints.giftCards.provisionForCallCenter,
          {
            recipientId: recipient.id,
            campaignId: provCampaign.id,
            brandId: condition.brand_id,
            denomination: condition.card_value,
            conditionId: selectedConditionId,
            phone: phone, // Pass the updated phone number from the call center rep
          }
        );
        console.log('[Provision] Edge Function response:', { data });
      } catch (error: any) {
        console.error('[Provision] Edge Function error:', error);
        
        const provError: ProvisioningError = {
          message: error.message || 'Edge Function error',
          errorCode: error.code,
          canRetry: true,
        };
        setProvisioningError(provError);
        throw error;
      }
      
      if (!data?.success) {
        // Extract detailed error information from the response
        const provError: ProvisioningError = {
          message: data?.message || data?.error || 'Provisioning failed',
          errorCode: data?.errorCode,
          requestId: data?.requestId,
          canRetry: data?.canRetry,
          requiresCampaignEdit: data?.requiresCampaignEdit,
        };
        setProvisioningError(provError);
        throw new Error(data?.message || data?.error || 'Provisioning failed');
      }
      
      // Transform the edge function response to match UI expected format
      const transformedResult: ProvisionResult = {
        recipient: {
          id: recipient?.id || '',
          firstName: recipient?.first_name || '',
          lastName: recipient?.last_name || '',
          phone: phone || recipient?.phone || null, // Use the updated phone from call center rep
          email: recipient?.email || null,
        },
        giftCard: {
          id: data.card?.id || '',
          card_code: data.card?.cardCode || '',
          card_number: data.card?.cardNumber || null,
          card_value: data.card?.denomination || 0,
          expiration_date: data.card?.expirationDate || null,
          // Map to legacy structure for backward compatibility
          gift_card_pools: {
            id: data.card?.id || '',
            pool_name: data.card?.brandName || 'Gift Card',
            card_value: data.card?.denomination || 0,
            provider: data.card?.brandName,
            gift_card_brands: {
              id: '',
              brand_name: data.card?.brandName || 'Gift Card',
              logo_url: data.card?.brandLogo || null,
              balance_check_url: null,
            },
          },
        },
      };
      
      return transformedResult;
    },
    onSuccess: async (data) => {
      // Log provision success
      logStep({
        stepName: 'provision',
        stepNumber: 5,
        status: 'success',
        recipientId: recipient?.id,
        campaignId: campaign?.id,
        callSessionId: callSessionId || undefined,
        redemptionCode: recipient?.redemption_code,
        responsePayload: {
          cardId: data.giftCard?.id,
          brandName: data.giftCard?.gift_card_pools?.gift_card_brands?.brand_name,
          cardValue: data.giftCard?.card_value,
        },
      });
      
      // Log to recipient_audit_log for Recent Activity sidebar
      // This is what AgentRecentRedemptions queries to show recent agent activity
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user && recipient?.id) {
          await supabase.from('recipient_audit_log').insert({
            recipient_id: recipient.id,
            action: 'gift_card_assigned',
            performed_by_user_id: user.user.id,
            call_session_id: callSessionId,
            metadata: {
              card_value: data.giftCard?.card_value,
              card_code: data.giftCard?.card_code,
              card_id: data.giftCard?.id,
              brand_name: data.giftCard?.gift_card_pools?.gift_card_brands?.brand_name || 
                          data.giftCard?.gift_card_pools?.provider || 'Gift Card',
              campaign_id: campaign?.id,
              campaign_name: campaign?.name,
              condition_id: selectedConditionId,
            },
          });
          logger.debug('[CALL-CENTER] Logged gift card assignment to recipient_audit_log');
        }
      } catch (auditError) {
        // Don't fail the whole operation if audit logging fails
        logger.warn('[CALL-CENTER] Failed to log to recipient_audit_log:', auditError);
      }
      
      setResult(data);
      setProvisioningError(null);
      setStep("complete");
      toast({
        title: "Gift Card Provisioned",
        description: "Successfully redeemed gift card for customer.",
      });
    },
    onError: (error: any) => {
      // Log provision failure
      logStep({
        stepName: 'provision',
        stepNumber: 5,
        status: 'failed',
        recipientId: recipient?.id,
        campaignId: campaign?.id,
        callSessionId: callSessionId || undefined,
        redemptionCode: recipient?.redemption_code,
        errorCode: provisioningError?.errorCode || error.code,
        errorMessage: error.message || 'Unknown error occurred',
        errorStack: error.stack,
        responsePayload: provisioningError ? {
          requestId: provisioningError.requestId,
          canRetry: provisioningError.canRetry,
          requiresCampaignEdit: provisioningError.requiresCampaignEdit,
        } : undefined,
      });
      
      // If we haven't already set the error details, try to extract them
      if (!provisioningError) {
        setProvisioningError({
          message: error.message || 'Unknown error occurred',
          canRetry: true,
        });
      }
      
      toast({
        title: "Redemption Failed",
        description: error.message || 'An error occurred',
        variant: "destructive",
      });
    },
  });

  const handleStartNew = () => {
    // Start a new logging session for the next redemption attempt
    startNewSession();

    setStep("code");
    setRedemptionCode("");
    setRecipient(null);
    setMultipleRecipients([]);
    setCellPhone("");
    setCallSessionId(null);
    setPhone("");
    setSelectedConditionId("");
    setResult(null);
    setProvisioningError(null);
    setVerificationMethod("sms");
    setShowSkipDisposition(false);
    setSelectedDisposition("");
    setEmailVerificationSent(false);
    setCallNotes("");
    setShowDifferentDeliveryPhone(false);
    // Reset simulation state
    setIsSimulatedMode(false);
    setIsSimulating(false);
    setSimulationCountdown(0);
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
  };

  // Mark customer as ineligible and reset workflow
  const handleMarkIneligible = async () => {
    if (!recipient || !ineligibleReason) return;
    setIsMarkingIneligible(true);
    try {
      // Update recipient with rejection
      await supabase
        .from('recipients')
        .update({
          approval_status: 'rejected',
          disposition: ineligibleReason,
          rejection_reason: ineligibleNote || ineligibleReason,
        })
        .eq('id', recipient.id);

      // Log to audit trail
      await supabase.from('recipient_audit_log').insert({
        recipient_id: recipient.id,
        action: 'rejected',
        performed_by_user_id: (await supabase.auth.getUser()).data.user?.id,
        call_session_id: callSessionId,
        metadata: {
          reason: ineligibleReason,
          note: ineligibleNote,
          step: step,
        },
      });

      await logStep({
        stepName: 'mark_ineligible',
        stepNumber: 99,
        status: 'success',
        recipientId: recipient.id,
        campaignId: campaign?.id,
        callSessionId: callSessionId || undefined,
        redemptionCode: recipient.redemption_code,
        responsePayload: { reason: ineligibleReason, note: ineligibleNote },
      });

      toast({
        title: "Customer Marked Ineligible",
        description: `Reason: ${ineligibleReason === 'condition_not_met' ? 'Did Not Complete Condition' : ineligibleReason === 'not_interested' ? 'Not Interested' : ineligibleNote || ineligibleReason}`,
      });

      setShowIneligibleDialog(false);
      setIneligibleReason("");
      setIneligibleNote("");
      handleStartNew();
    } catch (error: any) {
      toast({
        title: "Failed to mark ineligible",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsMarkingIneligible(false);
    }
  };

  // Navigate back from opt-in step without resetting all state
  const handleBackFromOptIn = () => {
    // Go back to campaign selection if we came through that path, otherwise code entry
    if (multipleRecipients.length > 0) {
      setStep("campaign_select");
    } else {
      setStep("code");
    }
    // Clear opt-in-specific transient state but preserve recipient and phone data
    setShowSkipDisposition(false);
    setEmailVerificationSent(false);
    setShowDifferentDeliveryPhone(false);
  };

  // Resend opt-in SMS - resets status and re-sends
  const resendOptInSms = async () => {
    if (!recipient || !cellPhone) return;

    setIsSendingOptIn(true);

    try {
      // Reset the opt-in status in the database to bypass the 5-minute cooldown
      await supabase
        .from('recipients')
        .update({
          sms_opt_in_status: 'not_sent',
          sms_opt_in_sent_at: null,
          sms_opt_in_response: null,
          sms_opt_in_response_at: null,
        })
        .eq('id', recipient.id);

      // Refresh the status indicator
      optInStatus.refresh();

      // Wait briefly for status to update before sending again
      await new Promise(resolve => setTimeout(resolve, 300));

      // Now call the standard send function
      await sendOptInSms();
    } catch (error: any) {
      console.error('[RESEND-OPT-IN] Error:', error);
      toast({
        title: "Resend Failed",
        description: error.message || "Failed to resend opt-in SMS. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOptIn(false);
    }
  };
  
  // Helper to copy request ID to clipboard
  const copyRequestId = () => {
    if (provisioningError?.requestId) {
      navigator.clipboard.writeText(provisioningError.requestId);
      toast({
        title: "Copied!",
        description: "Request ID copied to clipboard for support",
      });
    }
  };

  const copyAllDetails = () => {
    if (!result?.giftCard) return;

    const card = result.giftCard;
    const pool = card.gift_card_pools;
    const brand = pool?.gift_card_brands;
    const value = pool?.card_value || card.card_value || 0;

    const details = `${brand?.brand_name || pool?.provider || "Gift Card"}
Value: $${value.toFixed(2)}
${card.card_number ? `Card Number: ${card.card_number}` : ""}
Code: ${card.card_code}
${card.expiration_date ? `Expires: ${new Date(card.expiration_date).toLocaleDateString()}` : ""}`;

    navigator.clipboard.writeText(details);
    toast({
      title: "Copied!",
      description: "All gift card details copied to clipboard",
    });
  };

  // Handle condition selection with logging
  const handleConditionSelect = (conditionId: string) => {
    const provCampaign = recipient?.campaign || recipient?.audiences?.campaigns?.[0];
    const selectedCondition = provCampaign?.campaign_conditions?.find(
      (c: any) => c.id === conditionId
    );
    
    // Log condition selection
    logStep({
      stepName: 'condition_select',
      stepNumber: 4,
      status: 'success',
      recipientId: recipient?.id,
      campaignId: provCampaign?.id,
      callSessionId: callSessionId || undefined,
      redemptionCode: recipient?.redemption_code,
      requestPayload: {
        conditionId,
        conditionName: selectedCondition?.condition_name,
        conditionNumber: selectedCondition?.condition_number,
        brandId: selectedCondition?.brand_id,
        cardValue: selectedCondition?.card_value,
        isConfigured: !!(selectedCondition?.brand_id && selectedCondition?.card_value),
      },
    });
    
    setSelectedConditionId(conditionId);
  };

  // campaign is already declared at line 113, so we just use it here
  const activeConditions = campaign?.campaign_conditions?.filter(c => c.is_active) || [];
  
  // Get gift card config for selected condition (marketplace model)
  const giftCardConfig = campaign?.campaign_gift_card_config?.find(
    gc => gc.condition_number === parseInt(selectedConditionId)
  );
  
  // For backward compatibility with PoolInventoryWidget, we'll pass config instead of poolId
  const poolId = giftCardConfig ? `${giftCardConfig.brand_id}-${giftCardConfig.denomination}` : null;

  // Check if selected condition has valid gift card configuration
  const selectedCondition = activeConditions.find(c => c.id === selectedConditionId);
  const isConditionConfigured = selectedCondition 
    ? (selectedCondition.brand_id != null && selectedCondition.card_value != null && selectedCondition.card_value > 0)
    : false;
  
  // Helper to check if any condition is missing gift card config (for warnings)
  const conditionsNeedingConfig = activeConditions.filter(
    c => !c.brand_id || !c.card_value || c.card_value === 0
  );

  return (
    <div className="space-y-6">
      {/* Progress Indicator - Clean 3-step design */}
      <div className="flex items-center justify-center gap-1">
        {/* Step 1: Code */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          ["code", "campaign_select", "optin", "condition", "complete"].includes(step)
            ? "bg-primary text-primary-foreground"
            : "bg-slate-100 text-slate-500"
        }`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
          Code
        </div>
        <div className="w-8 h-0.5 bg-slate-200" />
        
        {/* Step 2: Verify */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          ["optin", "condition", "complete"].includes(step)
            ? "bg-primary text-primary-foreground"
            : "bg-slate-100 text-slate-500"
        } ${step === "optin" && optInStatus.isPending ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
          Verify
        </div>
        <div className="w-8 h-0.5 bg-slate-200" />
        
        {/* Step 3: Condition */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          ["condition", "complete"].includes(step)
            ? "bg-primary text-primary-foreground"
            : "bg-slate-100 text-slate-500"
        }`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">3</span>
          Condition
        </div>
        <div className="w-8 h-0.5 bg-slate-200" />
        
        {/* Step 4: Complete */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          step === "complete"
            ? "bg-green-600 text-white"
            : "bg-slate-100 text-slate-500"
        }`}>
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">4</span>
          Complete
        </div>
      </div>

      {/* Step 1: Code Entry */}
      {step === "code" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Gift className="h-5 w-5 text-primary" />
              Enter Confirmation Code
            </CardTitle>
            <CardDescription>
              Enter the customer's unique code to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="h-14 text-2xl font-mono uppercase text-center tracking-wider"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      lookupMutation.mutate(redemptionCode.trim());
                    }
                  }}
                />
                <Button
                  onClick={() => lookupMutation.mutate(redemptionCode.trim())}
                  disabled={lookupMutation.isPending || !redemptionCode.trim()}
                  className="h-14 px-6"
                  size="lg"
                >
                  {lookupMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Press Enter to submit
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1.5: Campaign Selection (when multiple campaigns match the code) */}
      {step === "campaign_select" && multipleRecipients.length > 0 && (
        <CampaignSelectionStep
          recipients={multipleRecipients}
          redemptionCode={redemptionCode}
          onSelect={handleCampaignSelect}
          onCancel={handleStartNew}
          onResend={handleResendExistingCard}
          currentClientId={currentClient?.id}
          currentClientName={currentClient?.name}
        />
      )}

      {/* Step 2: Verify & Opt-In - Redesigned */}
      {step === "optin" && recipient && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Verify Customer
                </CardTitle>
                <CardDescription>
                  Send opt-in SMS to verify and continue
                </CardDescription>
              </div>
              {/* Customer badge */}
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg">
                <User className="h-4 w-4 text-slate-500" />
                <div>
                  <div className="font-medium text-sm">
                    {recipient.first_name} {recipient.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {recipient.redemption_code}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* PRIMARY: SMS Opt-In Section */}
            <div className="space-y-4 p-4 bg-slate-50/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="cellphone" className="text-base font-semibold">
                  Cell Phone Number
                </Label>
                {optInStatus.isOptedIn && (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  id="cellphone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={cellPhone}
                  onChange={(e) => setCellPhone(e.target.value)}
                  disabled={optInStatus.isOptedIn}
                  className="h-12 text-lg"
                />
                {!optInStatus.isOptedIn && (
                  <Button
                    onClick={sendOptInSms}
                    disabled={
                      !cellPhone ||
                      !campaign ||
                      isSendingOptIn ||
                      (optInStatus.status !== 'not_sent' && optInStatus.status !== 'invalid_response')
                    }
                    className="h-12 px-6"
                    size="lg"
                  >
                    {isSendingOptIn ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send SMS
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Status indicator - compact version */}
              <OptInStatusIndicator 
                status={optInStatus.status} 
                response={optInStatus.response}
                sentAt={optInStatus.sentAt}
                responseAt={optInStatus.responseAt}
                onRefresh={optInStatus.refresh}
                isLoading={optInStatus.isLoading}
                compact
              />

              {/* Resend button - visible when SMS was sent but no response yet */}
              {optInStatus.isPending && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resendOptInSms}
                    disabled={!cellPhone || isSendingOptIn}
                  >
                    {isSendingOptIn ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Resend
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Ask customer to reply YES
                  </span>
                </div>
              )}

              {/* Delivery phone option */}
              {optInStatus.isOptedIn && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Gift card will be sent to: <span className="font-medium">{formatPhoneNumber(cellPhone || phone)}</span>
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs h-auto p-0"
                      onClick={() => {
                        setShowDifferentDeliveryPhone(!showDifferentDeliveryPhone);
                        if (!showDifferentDeliveryPhone) {
                          setPhone(cellPhone);
                        }
                      }}
                    >
                      {showDifferentDeliveryPhone ? 'Use same number' : 'Use different number'}
                    </Button>
                  </div>
                  {showDifferentDeliveryPhone && (
                    <Input
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-2 h-10"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Campaign missing warning */}
            {!campaign && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Campaign not linked. Contact support.
                </AlertDescription>
              </Alert>
            )}

            {/* Opted out warning */}
            {optInStatus.isOptedOut && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Customer declined. Cannot proceed with gift card.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Call Notes with Quick Save */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Call Notes
                </Label>
                {callNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={async () => {
                      if (recipient?.id) {
                        await supabase
                          .from('recipients')
                          .update({ last_call_notes: callNotes })
                          .eq('id', recipient.id);
                        toast({ title: "Notes saved" });
                      }
                    }}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Add notes about this call..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="h-16 text-sm resize-none bg-slate-50/50"
              />
            </div>

            {/* Collapsible Customer Details */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 px-3 hover:bg-slate-50">
                  <span className="text-sm font-medium text-muted-foreground">Customer Details</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <EnrichmentPanel recipient={recipient} compact />
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Alternative Verification - More compact */}
            {!showSkipDisposition && !optInStatus.isOptedIn && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Alternative Options
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendEmailVerification}
                    disabled={!recipient?.email || isSendingEmailVerification || emailVerificationSent}
                    className="flex-1"
                  >
                    {isSendingEmailVerification ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : emailVerificationSent ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        Sent
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSkipDisposition(true)}
                    className="flex-1"
                  >
                    <SkipForward className="h-4 w-4 mr-1" />
                    Skip
                  </Button>
                </div>
              </div>
            )}

            {/* Skip Verification - Disposition Selection */}
            {showSkipDisposition && (
              <div className="space-y-3 p-3 border rounded-lg bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select Reason</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSkipDisposition(false)}
                    className="h-7"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {POSITIVE_DISPOSITIONS.map((d) => (
                    <Button
                      key={d.value}
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto py-2 text-left border-green-200 hover:bg-green-50"
                      onClick={() => handleSkipDisposition(d.value)}
                      disabled={isSubmittingDisposition}
                    >
                      <ThumbsUp className="h-3 w-3 mr-2 text-green-600 flex-shrink-0" />
                      <span className="text-xs">{d.label}</span>
                    </Button>
                  ))}
                  {NEGATIVE_DISPOSITIONS.map((d) => (
                    <Button
                      key={d.value}
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto py-2 text-left border-red-200 hover:bg-red-50"
                      onClick={() => handleSkipDisposition(d.value)}
                      disabled={isSubmittingDisposition}
                    >
                      <ThumbsDown className="h-3 w-3 mr-2 text-red-600 flex-shrink-0" />
                      <span className="text-xs">{d.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleBackFromOptIn}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start Over?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will clear all data and return to code entry.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartNew}>
                      Yes, Start Over
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                onClick={() => {
                  if (!phone) setPhone(cellPhone);
                  setStep("condition");
                }}
                disabled={!optInStatus.isOptedIn && !emailVerificationSent}
                className="flex-1"
              >
                {optInStatus.isOptedIn ? (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : emailVerificationSent ? (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Waiting for Response...
                  </>
                )}
              </Button>
            </div>
            
            {/* Mark Ineligible Button - Visible in optin step */}
            <div className="flex justify-end pt-3 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIneligibleDialog(true)}
                className="border-red-200 bg-red-50/50 text-red-700 hover:text-red-800 hover:bg-red-100 hover:border-red-300"
              >
                <UserX className="h-4 w-4 mr-1.5" />
                Mark Ineligible
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Step 3: Condition Selection - Redesigned */}
      {step === "condition" && recipient && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Select Condition
                </CardTitle>
                <CardDescription>
                  What did the customer complete?
                </CardDescription>
              </div>
              {/* Customer info */}
              <div className="text-right text-sm">
                <div className="font-medium">{recipient.first_name} {recipient.last_name}</div>
                <div className="text-muted-foreground">{formatPhoneNumber(phone || cellPhone)}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campaign info */}
            {campaign && (
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <span className="text-muted-foreground">Campaign: </span>
                <span className="font-medium">{campaign.name}</span>
              </div>
            )}

            {/* Condition selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Condition Completed</Label>
              <Select value={selectedConditionId} onValueChange={handleConditionSelect}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select condition..." />
                </SelectTrigger>
                <SelectContent>
                  {activeConditions.map((condition) => {
                    const isConfigured = condition.brand_id && condition.card_value && condition.card_value > 0;
                    return (
                      <SelectItem key={condition.id} value={condition.id}>
                        <div className="flex items-center gap-2">
                          <span>{condition.condition_name}</span>
                          {isConfigured && (
                            <Badge variant="secondary" className="text-xs">
                              ${condition.card_value}
                            </Badge>
                          )}
                          {!isConfigured && (
                            <Badge variant="destructive" className="text-xs">Not Set</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Gift Card Preview - Show when condition selected and configured */}
            {selectedConditionId && isConditionConfigured && selectedCondition && (
              <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Gift Card Preview</div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Gift className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      ${selectedCondition.card_value?.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Gift Card
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Not configured warning */}
            {selectedConditionId && !isConditionConfigured && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Gift card not configured</p>
                  <p className="text-sm">An admin must configure the gift card for this condition.</p>
                  {campaign?.id && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => window.open(`/campaigns/${campaign.id}?edit=true`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Edit Campaign
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("optin")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              {(() => {
                const hasValidVerification = optInStatus.isOptedIn ||
                  (verificationMethod === "skipped" && POSITIVE_DISPOSITIONS.some(d => d.value === selectedDisposition)) ||
                  (verificationMethod === "email");
                const canProvision = selectedConditionId && hasValidVerification && isConditionConfigured;
                
                return (
                  <Button
                    onClick={() => provisionMutation.mutate()}
                    disabled={!canProvision || provisionMutation.isPending}
                    className="flex-1"
                    size="lg"
                  >
                    {provisionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : !selectedConditionId ? (
                      "Select Condition"
                    ) : !isConditionConfigured ? (
                      "Not Configured"
                    ) : !hasValidVerification ? (
                      "Verification Required"
                    ) : (
                      <>
                        <Gift className="h-4 w-4 mr-2" />
                        Send Gift Card
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
            
            {/* Mark Ineligible Button - Visible in condition step */}
            <div className="flex justify-end pt-3 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIneligibleDialog(true)}
                className="border-red-200 bg-red-50/50 text-red-700 hover:text-red-800 hover:bg-red-100 hover:border-red-300"
              >
                <UserX className="h-4 w-4 mr-1.5" />
                Mark Ineligible
              </Button>
            </div>
            
            {/* Comprehensive Error Display */}
            {provisioningError && (
              <Card className="border-destructive bg-destructive/5 mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                    <XCircle className="h-5 w-5" />
                    Provisioning Failed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Error Code and Description */}
                  {provisioningError.errorCode && (
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="font-mono">
                        {provisioningError.errorCode}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {PROVISIONING_ERROR_INFO[provisioningError.errorCode]?.description || 'Unknown error'}
                      </span>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  <div className="bg-destructive/10 p-3 rounded-md">
                    <p className="text-sm font-medium text-destructive">
                      {provisioningError.message}
                    </p>
                  </div>
                  
                  {/* Request ID for Support */}
                  {provisioningError.requestId && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Request ID:</span>
                      <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                        {provisioningError.requestId}
                      </code>
                      <Button variant="ghost" size="sm" onClick={copyRequestId} className="h-6 px-2">
                        <ClipboardCopy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Recommendation */}
                  {provisioningError.errorCode && PROVISIONING_ERROR_INFO[provisioningError.errorCode] && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-700 text-sm">Recommendation</AlertTitle>
                      <AlertDescription className="text-blue-600 text-sm">
                        {PROVISIONING_ERROR_INFO[provisioningError.errorCode].recommendation}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {(provisioningError.canRetry || PROVISIONING_ERROR_INFO[provisioningError.errorCode || '']?.canRetry) && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setProvisioningError(null);
                          provisionMutation.mutate();
                        }}
                        disabled={provisionMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    )}
                    {provisioningError.requiresCampaignEdit && (
                      <Button 
                        variant="outline"
                        onClick={() => window.open(`/campaigns/${campaign?.id}/edit`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Edit Campaign
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      onClick={() => window.open('/admin/system-health?tab=gift-cards', '_blank')}
                      className="ml-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Trace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Gift Card Display */}
      {/* Step 4: Complete - Redesigned */}
      {step === "complete" && result && (
        <Card className="border-0 shadow-sm overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-50 p-6 text-center border-b border-green-100">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-800">Gift Card Sent</h2>
            <p className="text-sm text-green-600 mt-1">
              SMS delivered to {formatPhoneNumber(result.recipient.phone)}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Summary Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Customer</div>
                <div className="font-medium">{result.recipient.firstName} {result.recipient.lastName}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Campaign</div>
                <div className="font-medium">{campaign?.name || 'N/A'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Condition</div>
                <div className="font-medium">{selectedCondition?.condition_name || 'N/A'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Completed</div>
                <div className="font-medium">{new Date().toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Edit Customer Info - Collapsible */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                  <ChevronDown className="h-4 w-4 mr-1.5" />
                  Edit Customer Info
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <EnrichmentPanel
                  recipient={{
                    id: result.recipient.id,
                    first_name: result.recipient.firstName,
                    last_name: result.recipient.lastName,
                    phone: result.recipient.phone,
                    email: result.recipient.email,
                  }}
                  compact
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Gift Card Display */}
            <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10">
              {result.giftCard.gift_card_pools?.gift_card_brands?.logo_url && (
                <img
                  src={result.giftCard.gift_card_pools.gift_card_brands.logo_url}
                  alt={result.giftCard.gift_card_pools.gift_card_brands.brand_name}
                  className="h-10 mx-auto object-contain mb-2"
                />
              )}
              <div className="text-3xl font-bold text-primary">
                ${(result.giftCard.gift_card_pools?.card_value || result.giftCard.card_value || 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {result.giftCard.gift_card_pools?.gift_card_brands?.brand_name || 
                 result.giftCard.gift_card_pools?.provider || "Gift Card"}
              </div>
            </div>

            {/* Card Details - Collapsible for reference */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 px-3">
                  <span className="text-sm text-muted-foreground">Card Details</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Code</div>
                    <div className="font-mono font-medium">{result.giftCard.card_code}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={copyAllDetails}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {result.giftCard.card_number && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Card Number</div>
                    <div className="font-mono font-medium">{result.giftCard.card_number}</div>
                  </div>
                )}
                {result.giftCard.expiration_date && (
                  <div className="text-xs text-muted-foreground">
                    Expires: {new Date(result.giftCard.expiration_date).toLocaleDateString()}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Resend option */}
            {result.recipient.phone && (
              <div className="pt-2">
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
              </div>
            )}

            <Separator />

            {/* Main Action - Finished */}
            <Button 
              onClick={handleStartNew} 
              className="w-full h-12 text-base"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Finished - Next Customer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mark Ineligible Dialog - triggered by buttons in optin and condition steps */}
      {recipient && (
        <AlertDialog open={showIneligibleDialog} onOpenChange={setShowIneligibleDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600" />
                Mark Customer Ineligible
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will mark {recipient.first_name || 'this customer'} as ineligible and end the current session. Select a reason below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-2">
              {[
                { value: 'condition_not_met', label: 'Did Not Complete Condition' },
                { value: 'not_interested', label: 'Not Interested / Declined Offer' },
                { value: 'other', label: 'Other Reason' },
              ].map((reason) => (
                <Button
                  key={reason.value}
                  variant="outline"
                  className={`w-full justify-start h-auto py-2.5 ${
                    ineligibleReason === reason.value
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                  }`}
                  onClick={() => setIneligibleReason(reason.value)}
                >
                  {reason.label}
                </Button>
              ))}
              {(ineligibleReason === 'other' || ineligibleNote) && (
                <Textarea
                  placeholder="Add a note (optional)..."
                  value={ineligibleNote}
                  onChange={(e) => setIneligibleNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIneligibleReason("");
                  setIneligibleNote("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleMarkIneligible}
                disabled={!ineligibleReason || isMarkingIneligible}
              >
                {isMarkingIneligible ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm Ineligible'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Cross-Client Warning Dialog */}
      <AlertDialog open={showCrossClientWarning} onOpenChange={setShowCrossClientWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Different Client Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              This redemption code belongs to <strong>{crossClientInfo?.clientName || 'another client'}</strong>, 
              which is different from your currently selected client{currentClient ? ` (${currentClient.name})` : ''}.
              <br /><br />
              Are you sure you want to proceed with this code?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCrossClientCancel}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleCrossClientConfirm}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Proceed Anyway
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

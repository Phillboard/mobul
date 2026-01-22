import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { logger } from '@/core/services/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useToast } from '@shared/hooks';
import { Search, Gift, Copy, RotateCcw, CheckCircle, AlertCircle, User, Mail, Phone, MessageSquare, Loader2, ArrowRight, Send, Info, XCircle, SkipForward, ThumbsUp, ThumbsDown, Zap, ExternalLink, ClipboardCopy } from "lucide-react";
import { Separator } from "@/shared/components/ui/separator";
import { PoolInventoryWidget } from "./PoolInventoryWidget";
import { ResendSmsButton } from "./ResendSmsButton";
import { OptInStatusIndicator } from "./OptInStatusIndicator";
import { useOptInStatus } from '@/features/settings/hooks';

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
  
  // Simulation mode for testing - skip real SMS sending
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationCountdown, setSimulationCountdown] = useState(0);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Step 3: Contact Method (for SMS delivery)
  const [phone, setPhone] = useState("");
  
  // Step 4: Condition Selection
  const [selectedConditionId, setSelectedConditionId] = useState("");
  
  // Step 5: Result
  const [result, setResult] = useState<ProvisionResult | null>(null);
  
  // Error tracking for comprehensive error display
  const [provisioningError, setProvisioningError] = useState<ProvisioningError | null>(null);

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
    try {
      console.log('[SEND-OPT-IN] Calling edge function with:', {
        recipient_id: recipient.id,
        campaign_id: campaign.id,
        phone: cellPhone,
        client_name: clientName,
      });
      
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
      
      console.log('[SEND-OPT-IN] Edge function response:', { data, error });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Pre-fill delivery phone with opt-in phone
      setPhone(cellPhone);
      
      toast({
        title: "Opt-in SMS Sent!",
        description: "Ask customer to reply YES to continue. You can proceed with the spiel while waiting.",
      });
    } catch (error: any) {
      console.error('[SEND-OPT-IN] Error:', error);
      toast({
        title: "Failed to send SMS",
        description: error.message || "Please try again",
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
      logger.debug('[CALL-CENTER] Looking up code:', code.toUpperCase());

      // Primary lookup: Use campaign_id directly on recipients (new model)
      const { data: recipient, error: recipientError } = await supabase
        .from("recipients")
        .select(`
          *,
          campaign:campaigns (
            id,
            name,
            status,
            client_id,
            sms_opt_in_message,
            clients (id, name),
            campaign_conditions (*),
            campaign_gift_card_config (*)
          ),
          audience:audiences (
            id,
            name
          )
        `)
        .eq("redemption_code", code.toUpperCase())
        .maybeSingle();

      if (recipient) {
        logger.debug('[CALL-CENTER] Found recipient:', recipient.id);
        
        // If no direct campaign link, try to find via audience (fallback for old data)
        if (!recipient.campaign && recipient.audience_id) {
          const { data: audienceCampaign } = await supabase
            .from("campaigns")
            .select(`
              id,
              name,
              status,
              client_id,
              sms_opt_in_message,
              clients (id, name),
              campaign_conditions (*),
              campaign_gift_card_config (*)
            `)
            .eq("audience_id", recipient.audience_id)
            .maybeSingle();
          
          if (audienceCampaign) {
            recipient.campaign = audienceCampaign;
            
            // Backfill campaign_id on recipient for future lookups
            await supabase
              .from("recipients")
              .update({ campaign_id: audienceCampaign.id })
              .eq("id", recipient.id);
          }
        }
        
        // Check campaign status - only allow active campaigns for redemption
        // Active statuses: in_production, mailed, scheduled
        const campaign = recipient.campaign;
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

        // Check if a gift card was already provisioned for this recipient
        const { data: existingCard, error: cardError } = await supabase
          .from('gift_card_inventory')
          .select(`
            id,
            card_code,
            card_number,
            denomination,
            expiration_date,
            assigned_at,
            brand_id,
            gift_card_brands (
              id,
              brand_name,
              logo_url,
              balance_check_url
            )
          `)
          .eq('assigned_to_recipient_id', recipient.id)
          .eq('status', 'assigned')
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (existingCard) {
          logger.debug('[CALL-CENTER] Found existing provisioned card for recipient:', existingCard.id);
          // Return recipient with the existing card attached
          return {
            ...recipient,
            _alreadyProvisioned: true,
            _existingCard: existingCard,
          } as RecipientData & { _alreadyProvisioned: boolean; _existingCard: typeof existingCard };
        }
        
        return recipient as RecipientData;
      }

      // Secondary lookup: Check if recipient exists but has broken audience/campaign link
      // This catches cases where redemption_code exists but audience or campaign is missing
      logger.debug('[CALL-CENTER] Checking for orphaned recipient with this code...');
      const { data: orphanedRecipient, error: orphanError } = await supabase
        .from("recipients")
        .select(`
          id,
          redemption_code,
          first_name,
          last_name,
          audience_id,
          audiences (
            id,
            name,
            campaigns (id, name, status)
          )
        `)
        .eq("redemption_code", code.toUpperCase())
        .maybeSingle();

      if (orphanedRecipient) {
        logger.debug('[CALL-CENTER] Found orphaned recipient:', orphanedRecipient.id);
        
        // Diagnose the issue
        if (!orphanedRecipient.audience_id) {
          throw new Error(`Recipient found (${orphanedRecipient.first_name || 'Unknown'} ${orphanedRecipient.last_name || ''}) but not assigned to any audience. Please add this recipient to an audience first.`);
        }
        
        const audience = orphanedRecipient.audiences;
        if (!audience) {
          throw new Error(`Recipient found but their audience was deleted. Please reassign this recipient to a valid audience.`);
        }
        
        const campaigns = (audience as any).campaigns || [];
        if (campaigns.length === 0) {
          throw new Error(`Recipient found in audience "${(audience as any).name}" but this audience is not linked to any campaign. Please add this audience to a campaign first.`);
        }
        
        // Campaign exists but may have a status issue - this shouldn't happen as the primary query should have caught it
        throw new Error(`Recipient found but campaign configuration issue detected. Please contact support.`);
      }

      // Tertiary lookup: Try contacts table with customer_code
      // This handles cases where unique codes are stored on contacts
      logger.debug('[CALL-CENTER] Trying contacts.customer_code lookup...');
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, customer_code")
        .eq("customer_code", code.toUpperCase())
        .maybeSingle();

      if (contact) {
        logger.debug('[CALL-CENTER] Found contact:', contact.id, '- checking for campaign assignment...');
        
        // Find a recipient record linked to this contact (using direct contact_id link)
        // NOTE: A contact can be in multiple campaigns, so we get all and pick the first active one
        let { data: linkedRecipients, error: linkError } = await supabase
          .from("recipients")
          .select(`
            *,
            campaign:campaigns (
              id,
              name,
              status,
              client_id,
              clients (id, name),
              campaign_conditions (*),
              campaign_gift_card_config (*)
            ),
            audience:audiences (
              id,
              name
            )
          `)
          .eq("contact_id", contact.id);
        
        // If multiple recipients found (contact in multiple campaigns), prefer active campaigns
        let linkedRecipient = null;
        if (linkedRecipients && linkedRecipients.length > 0) {
          const activeStatuses = ["in_production", "mailed", "scheduled"];
          // First try to find a recipient in an active campaign
          linkedRecipient = linkedRecipients.find(r => 
            r.campaign && activeStatuses.includes(r.campaign.status)
          );
          // If no active campaigns, just take the first one (will show appropriate error later)
          if (!linkedRecipient) {
            linkedRecipient = linkedRecipients[0];
          }
          
          // Log if contact is in multiple campaigns
          if (linkedRecipients.length > 1) {
            logger.debug(`[CALL-CENTER] Contact in ${linkedRecipients.length} campaigns, selected: ${linkedRecipient.campaign?.name || 'N/A'}`);
          }
        }

        // FALLBACK: If no recipient linked via contact_id, try matching by redemption_code
        // This handles cases where recipient exists with matching code but no contact_id link
        if (!linkedRecipient && contact.customer_code) {
          logger.debug('[CALL-CENTER] No recipient via contact_id, trying redemption_code match...');
          const { data: codeMatchedRecipient } = await supabase
            .from("recipients")
            .select(`
              *,
              campaign:campaigns (
                id,
                name,
                status,
                client_id,
                clients (id, name),
                campaign_conditions (*),
                campaign_gift_card_config (*)
              ),
              audience:audiences (
                id,
                name
              )
            `)
            .eq("redemption_code", contact.customer_code.toUpperCase())
            .maybeSingle();
          
          if (codeMatchedRecipient) {
            linkedRecipient = codeMatchedRecipient;
            logger.debug('[CALL-CENTER] Found recipient via redemption_code match:', linkedRecipient.id);
            
            // Backfill contact_id for future lookups (fire and forget)
            supabase
              .from("recipients")
              .update({ contact_id: contact.id })
              .eq("id", linkedRecipient.id)
              .then(() => logger.debug('[CALL-CENTER] Backfilled contact_id for recipient:', linkedRecipient.id));
          }
        }

        if (linkedRecipient) {
          logger.debug('[CALL-CENTER] Found linked recipient via contact:', {
            recipientId: linkedRecipient.id,
            hasDirectCampaign: !!linkedRecipient.campaign,
            campaignId: linkedRecipient.campaign?.id || null,
            audienceId: linkedRecipient.audience_id || null,
            audienceName: (linkedRecipient.audience as any)?.name || null,
          });
          
          // FALLBACK: If no direct campaign link, try via audience (for old data without campaign_id)
          if (!linkedRecipient.campaign && linkedRecipient.audience_id) {
            logger.debug('[CALL-CENTER] No direct campaign_id, trying audience fallback...');
            const { data: audienceCampaign } = await supabase
              .from("campaigns")
              .select(`
                id,
                name,
                status,
                client_id,
                clients (id, name),
                campaign_conditions (*),
                campaign_gift_card_config (*)
              `)
              .eq("audience_id", linkedRecipient.audience_id)
              .maybeSingle();
            
            if (audienceCampaign) {
              linkedRecipient.campaign = audienceCampaign;
              
              // Backfill campaign_id for future lookups (fire and forget)
              supabase
                .from("recipients")
                .update({ campaign_id: audienceCampaign.id })
                .eq("id", linkedRecipient.id)
                .then(() => logger.debug('[CALL-CENTER] Backfilled campaign_id for recipient:', linkedRecipient.id));
              
              logger.debug('[CALL-CENTER] Found campaign via audience fallback:', audienceCampaign.id);
            }
          }
          
          // Check campaign status - only allow active campaigns for redemption
          // Active statuses: in_production, mailed, scheduled
          const campaign = linkedRecipient.campaign;
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
        
        // Check if there's a recipient linked to this contact but missing audience/campaign
        // NOTE: A contact can be in multiple campaigns, so check all recipients
        const { data: orphanedContactRecipients } = await supabase
          .from("recipients")
          .select(`id, audience_id, audiences (id, name)`)
          .eq("contact_id", contact.id);
        
        if (orphanedContactRecipients && orphanedContactRecipients.length > 0) {
          const orphanedContactRecipient = orphanedContactRecipients[0]; // Check first one
          if (!orphanedContactRecipient.audience_id) {
            throw new Error(`Contact "${contact.first_name || ''} ${contact.last_name || ''}" has a recipient record but is not assigned to any audience. Please add to an audience first.`);
          }
          const aud = orphanedContactRecipient.audiences as any;
          throw new Error(`Contact "${contact.first_name || ''} ${contact.last_name || ''}" is in audience "${aud?.name || 'Unknown'}" but this audience is not linked to an active campaign.`);
        }
        
        // Contact exists but has no recipient record at all
        throw new Error(`Contact "${contact.first_name || ''} ${contact.last_name || ''}" found but not assigned to any campaign. Please add this contact to a campaign first.`);
      }

      // Nothing found
      logger.debug('[CALL-CENTER] Code not found in recipients or contacts');
      throw new Error("Code not found. Please verify the code and ensure the contact has been added to an active campaign.");
    },
    onSuccess: (data: any) => {
      setRecipient(data);
      
      // Check if this recipient already has a provisioned card
      if (data._alreadyProvisioned && data._existingCard) {
        logger.debug('[CALL-CENTER] Showing existing provisioned card');
        const existingCard = data._existingCard;
        const brand = existingCard.gift_card_brands;
        
        // Build result from existing card
        const existingResult: ProvisionResult = {
          recipient: {
            id: data.id,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            email: data.email,
          },
          giftCard: {
            id: existingCard.id,
            card_code: existingCard.card_code,
            card_number: existingCard.card_number,
            card_value: existingCard.denomination,
            expiration_date: existingCard.expiration_date,
            gift_card_pools: {
              id: existingCard.id,
              pool_name: brand?.brand_name || 'Gift Card',
              card_value: existingCard.denomination,
              provider: brand?.brand_name,
              gift_card_brands: {
                id: brand?.id || '',
                brand_name: brand?.brand_name || 'Gift Card',
                logo_url: brand?.logo_url || null,
                balance_check_url: brand?.balance_check_url || null,
              },
            },
          },
        };
        
        setResult(existingResult);
        setStep("complete");
        
        toast({
          title: "Gift Card Already Provisioned",
          description: "This customer already has a gift card. Showing their existing card details.",
        });
        return;
      }
      
      // NEW: Go to opt-in step first instead of contact
      setStep("optin");
      
      // Notify parent with recipient data and clientId
      const recipientCampaign = data.campaign || data.audiences?.campaigns?.[0];
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

  // Step 3: Provision gift card with comprehensive error handling
  const provisionMutation = useMutation({
    mutationFn: async () => {
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

      // Pass IDs directly - recipient was already looked up on frontend
      // SMS delivery is disabled for now, card will be displayed in UI
      console.log('[Provision] Calling Edge Function with:', {
        recipientId: recipient.id,
        campaignId: provCampaign.id,
        brandId: condition.brand_id,
        denomination: condition.card_value,
        conditionId: selectedConditionId,
      });

      const { data, error } = await supabase.functions.invoke("provision-gift-card-for-call-center", {
        body: {
          recipientId: recipient.id,
          campaignId: provCampaign.id,
          brandId: condition.brand_id,
          denomination: condition.card_value,
          conditionId: selectedConditionId,
        }
      });

      console.log('[Provision] Edge Function response:', { data, error });

      if (error) {
        console.error('[Provision] Edge Function error:', error);
        
        // Extract the actual error message from the response
        let errorMessage = error.message || 'Edge Function error';
        let errorData: any = {};
        
        // The error.context contains the Response object with our JSON body
        if (error.context && typeof error.context.json === 'function') {
          try {
            errorData = await error.context.json();
            console.log('[Provision] Parsed error data:', errorData);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (parseErr) {
            console.warn('[Provision] Could not parse error context:', parseErr);
          }
        }
        
        const provError: ProvisioningError = {
          message: errorMessage,
          errorCode: errorData.errorCode,
          requestId: errorData.requestId,
          canRetry: errorData.canRetry ?? true,
          requiresCampaignEdit: errorData.requiresCampaignEdit,
        };
        setProvisioningError(provError);
        throw new Error(errorMessage);
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
          first_name: recipient?.first_name || '',
          last_name: recipient?.last_name || '',
          phone: recipient?.phone || null,
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
    onSuccess: (data) => {
      setResult(data);
      setProvisioningError(null);
      setStep("complete");
      toast({
        title: "Gift Card Provisioned",
        description: "Successfully redeemed gift card for customer.",
      });
    },
    onError: (error: any) => {
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
    setStep("code");
    setRedemptionCode("");
    setRecipient(null);
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
    // Reset simulation state
    setIsSimulatedMode(false);
    setIsSimulating(false);
    setSimulationCountdown(0);
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
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
                  disabled={optInStatus.status !== 'not_sent' && optInStatus.status !== 'invalid_response' && !isSimulating}
                  className="text-lg"
                />
                <Button 
                  onClick={sendOptInSms}
                  disabled={
                    !cellPhone || 
                    !campaign ||
                    isSendingOptIn || 
                    isSimulating ||
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
              
              {/* Simulation button for testing */}
              <div className="flex gap-2 items-center">
                <Button 
                  variant="outline"
                  onClick={simulateSmsOptIn}
                  disabled={
                    !cellPhone || 
                    isSimulating ||
                    optInStatus.isOptedIn
                  }
                  className="border-dashed border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Simulating... ({simulationCountdown}s)
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Imitate SMS Sent
                    </>
                  )}
                </Button>
                {isSimulatedMode && !isSimulating && optInStatus.isOptedIn && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-400">
                    🧪 Simulated Mode
                  </Badge>
                )}
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

            {/* Campaign missing warning */}
            {!campaign && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Campaign not linked.</strong> This recipient is not properly linked to a campaign. 
                  Please ensure the recipient's campaign_id is set in the database, or that their audience 
                  is linked to an active campaign.
                </AlertDescription>
              </Alert>
            )}

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
                  {activeConditions.map((condition) => {
                    const isConfigured = condition.brand_id && condition.card_value && condition.card_value > 0;
                    return (
                      <SelectItem key={condition.id} value={condition.id}>
                        <div className="flex items-center gap-2">
                          <span>Condition {condition.condition_number}: {condition.condition_name}</span>
                          {!isConfigured && (
                            <Badge variant="destructive" className="text-xs">Not Configured</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Warning: Selected condition missing gift card config */}
            {selectedConditionId && !isConditionConfigured && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-medium">⚠️ Gift Card Not Configured</p>
                    <p className="text-sm">
                      This condition is missing gift card configuration (brand and value). 
                      An administrator must edit the campaign and configure a gift card for this condition before provisioning.
                    </p>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>Steps to fix:</strong>
                      </p>
                      <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                        <li>Go to Campaigns in the sidebar</li>
                        <li>Find "{campaign?.name}" and click Edit</li>
                        <li>Navigate to Setup (Audiences & Rewards)</li>
                        <li>Select a gift card brand and value for each condition</li>
                        <li>Save the campaign</li>
                      </ol>
                    </div>
                    {campaign?.id && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.open(`/campaigns/${campaign.id}?edit=true`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Campaign Edit Page
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Warning: Some conditions missing config (informational) */}
            {conditionsNeedingConfig.length > 0 && selectedConditionId && isConditionConfigured && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    Note: {conditionsNeedingConfig.length} other condition(s) in this campaign need gift card configuration.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("contact")}>
                Back
              </Button>
              {(() => {
                // Check if verification was completed via any method
                const hasValidVerification = optInStatus.isOptedIn || 
                  (verificationMethod === "skipped" && POSITIVE_DISPOSITIONS.some(d => d.value === selectedDisposition)) ||
                  (verificationMethod === "email");
                
                // Also check if condition has gift card configured
                const canProvision = selectedConditionId && hasValidVerification && isConditionConfigured;
                
                return (
                  <Button
                    onClick={() => provisionMutation.mutate()}
                    disabled={!canProvision || provisionMutation.isPending}
                    className="flex-1"
                  >
                    {provisionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Provisioning...
                      </>
                    ) : !selectedConditionId ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Select Condition
                      </>
                    ) : !isConditionConfigured ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Gift Card Not Configured
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
                {result.giftCard.card_number && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Gift Card Number</div>
                    <div className="font-mono text-xl font-bold tracking-wider">
                      {result.giftCard.card_number}
                    </div>
                  </div>
                )}

                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Gift Card Code</div>
                  <div className="font-mono text-lg font-semibold">
                    {result.giftCard.card_code}
                  </div>
                </div>

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

              {/* Simulation Mode Banner */}
              {isSimulatedMode && (
                <Alert className="border-yellow-400 bg-yellow-50">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    <strong>🧪 Simulation Mode Active</strong> - SMS delivery was skipped. 
                    You can manually send the gift card details to the customer.
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {result.recipient.phone && !isSimulatedMode && (
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
                
                {/* Simulated mode - show imitate resend button */}
                {isSimulatedMode && result.recipient.phone && (
                  <Button 
                    className="w-full border-dashed border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "🧪 Simulated SMS Resent",
                        description: `Would send gift card to ${result.recipient.phone}`,
                      });
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Imitate SMS Resend
                  </Button>
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

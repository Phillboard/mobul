/**
 * Opt-In Step Component (V2)
 *
 * Handles SMS opt-in verification for the customer.
 * Includes: enrichment panel, call notes, resend SMS, delivery phone,
 * alternative verification methods, and disposition selection.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { OptInStatusIndicator } from '../OptInStatusIndicator';
import { EnrichmentPanel } from '../EnrichmentPanel';
import {
  Phone, Send, Loader2, User, Mail, SkipForward,
  XCircle, ThumbsUp, ThumbsDown, Zap, Info,
  ArrowRight, ArrowLeft, RotateCcw, AlertCircle, CheckCircle,
  StickyNote, RefreshCw, MessageSquare
} from 'lucide-react';
import type { RecipientData, VerificationMethod } from '../hooks/useRedemptionWorkflow';

// Disposition options
export const POSITIVE_DISPOSITIONS = [
  { value: 'verified_verbally', label: 'Verified Verbally', description: 'Customer confirmed identity over the phone' },
  { value: 'already_opted_in', label: 'Already Opted In', description: 'Customer previously opted in to SMS' },
  { value: 'vip_customer', label: 'VIP Customer', description: 'Special customer, skip verification required' },
];

export const NEGATIVE_DISPOSITIONS = [
  { value: 'do_not_call', label: 'Do Not Call', description: 'Add to Do Not Call list' },
  { value: 'not_interested', label: 'Not Interested', description: 'Customer declined offer' },
  { value: 'wrong_number', label: 'Wrong Number', description: 'Phone number is incorrect' },
  { value: 'call_back_later', label: 'Call Back Later', description: 'Schedule a follow-up call' },
  { value: 'invalid_contact', label: 'Invalid Contact', description: 'Contact info is invalid' },
];

interface OptInStepProps {
  recipient: RecipientData;
  cellPhone: string;
  onCellPhoneChange: (phone: string) => void;
  optInStatus: {
    status: string;
    response: string | null;
    sentAt: string | null;
    responseAt: string | null;
    isOptedIn: boolean;
    isOptedOut: boolean;
    isPending: boolean;
    isLoading: boolean;
    refresh: () => void;
  };
  isSimulating: boolean;
  simulationCountdown: number;
  isSimulatedMode: boolean;
  emailVerificationSent: boolean;
  showSkipDisposition: boolean;
  onSendOptIn: () => Promise<{ success: boolean; error?: string }>;
  onResendOptIn?: () => Promise<void>;
  onSimulateOptIn: () => void;
  onSendEmailVerification: () => Promise<{ success: boolean; error?: string }>;
  onSkipDisposition: (disposition: string, isPositive: boolean) => Promise<{ success: boolean }>;
  onShowSkipDisposition: (show: boolean) => void;
  onContinue: () => void;
  onBack?: () => void;
  onStartOver: () => void;
  /** Delivery phone (may differ from cellPhone for opt-in) */
  deliveryPhone?: string;
  onDeliveryPhoneChange?: (phone: string) => void;
  /** Call notes */
  callNotes?: string;
  onCallNotesChange?: (notes: string) => void;
  /** Campaign custom field IDs for filtering enrichment fields */
  campaignCustomFieldIds?: string[];
}

export function OptInStep({
  recipient,
  cellPhone,
  onCellPhoneChange,
  optInStatus,
  isSimulating,
  simulationCountdown,
  isSimulatedMode,
  emailVerificationSent,
  showSkipDisposition,
  onSendOptIn,
  onResendOptIn,
  onSimulateOptIn,
  onSendEmailVerification,
  onSkipDisposition,
  onShowSkipDisposition,
  onContinue,
  onBack,
  onStartOver,
  deliveryPhone,
  onDeliveryPhoneChange,
  callNotes,
  onCallNotesChange,
  campaignCustomFieldIds,
}: OptInStepProps) {
  const [isSendingOptIn, setIsSendingOptIn] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSubmittingDisposition, setIsSubmittingDisposition] = useState(false);
  const [showDifferentDeliveryPhone, setShowDifferentDeliveryPhone] = useState(false);

  const handleSendOptIn = async () => {
    setIsSendingOptIn(true);
    await onSendOptIn();
    setIsSendingOptIn(false);
  };

  const handleResendOptIn = async () => {
    if (!onResendOptIn) return;
    setIsSendingOptIn(true);
    await onResendOptIn();
    setIsSendingOptIn(false);
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    await onSendEmailVerification();
    setIsSendingEmail(false);
  };

  const handleDisposition = async (value: string) => {
    setIsSubmittingDisposition(true);
    const isPositive = POSITIVE_DISPOSITIONS.some(d => d.value === value);
    await onSkipDisposition(value, isPositive);
    setIsSubmittingDisposition(false);
  };

  const canContinue = optInStatus.isOptedIn || emailVerificationSent;
  const smsSentOrPending = optInStatus.status !== 'not_sent' && optInStatus.status !== 'invalid_response';

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Verify & Contact
        </CardTitle>
        <CardDescription>
          Customer information, opt-in verification, and delivery setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer info header */}
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

        {/* Enrichment Panel — always visible */}
        <EnrichmentPanel
          recipient={recipient}
          compact
          campaignCustomFieldIds={campaignCustomFieldIds}
        />

        {/* Call Notes */}
        {onCallNotesChange && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Call Notes
            </Label>
            <Textarea
              placeholder="Notes from this call..."
              value={callNotes || ""}
              onChange={(e) => onCallNotesChange(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        <Separator />

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
              onChange={(e) => onCellPhoneChange(e.target.value)}
              disabled={smsSentOrPending && optInStatus.status !== 'pending' && !isSimulating}
              className="text-lg"
            />
            <Button
              onClick={handleSendOptIn}
              disabled={!cellPhone || isSendingOptIn || isSimulating || smsSentOrPending}
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

          {/* Resend + Simulate row */}
          <div className="flex gap-2 items-center flex-wrap">
            {/* Resend button — visible when pending */}
            {optInStatus.isPending && onResendOptIn && (
              <Button
                variant="outline"
                onClick={handleResendOptIn}
                disabled={isSendingOptIn}
                className="border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700"
              >
                {isSendingOptIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Opt-In SMS
                  </>
                )}
              </Button>
            )}

            {/* Simulation button for testing */}
            <Button
              variant="outline"
              onClick={onSimulateOptIn}
              disabled={!cellPhone || isSimulating || optInStatus.isOptedIn}
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
                Simulated Mode
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
          onResend={onResendOptIn}
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

        {/* SMS Delivery Number — shown after opt-in confirmed */}
        {optInStatus.isOptedIn && onDeliveryPhoneChange && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Delivery Number
              </Label>
              {!showDifferentDeliveryPhone ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <span className="text-sm">Gift card will be sent to: </span>
                    <span className="font-semibold">{deliveryPhone || cellPhone}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDifferentDeliveryPhone(true)}
                  >
                    Change Number
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={deliveryPhone || ""}
                    onChange={(e) => onDeliveryPhoneChange(e.target.value)}
                    className="text-lg"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!deliveryPhone) onDeliveryPhoneChange(cellPhone);
                      setShowDifferentDeliveryPhone(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Alternative Verification Options */}
        {!showSkipDisposition && (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Alternative Verification Methods</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={!recipient?.email || isSendingEmail || emailVerificationSent}
                className="flex-1 min-w-[140px]"
              >
                {isSendingEmail ? (
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

              <Button
                variant="secondary"
                onClick={() => onShowSkipDisposition(true)}
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
                onClick={() => onShowSkipDisposition(false)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>

            {/* Positive Dispositions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <ThumbsUp className="h-4 w-4" />
                Positive (Customer Gets Gift Card)
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Admin will be notified if you skip verification with a positive disposition
              </p>
              <div className="grid gap-2">
                {POSITIVE_DISPOSITIONS.map((disposition) => (
                  <Button
                    key={disposition.value}
                    variant="outline"
                    className="justify-start h-auto py-2 border-green-200 hover:bg-green-50 hover:border-green-400"
                    onClick={() => handleDisposition(disposition.value)}
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

            {/* Negative Dispositions */}
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
                    onClick={() => handleDisposition(disposition.value)}
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

        {/* Bottom action buttons */}
        <div className="flex gap-2 pt-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          {/* Start Over with confirmation if SMS was sent */}
          {smsSentOrPending ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start Over?</AlertDialogTitle>
                  <AlertDialogDescription>
                    An opt-in SMS has already been sent. Starting over will clear all current progress
                    for this call. The SMS status will remain in the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onStartOver} className="bg-red-600 hover:bg-red-700">
                    Start Over
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="outline" onClick={onStartOver}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}

          <Button
            onClick={onContinue}
            disabled={!canContinue}
            className="flex-1"
          >
            {optInStatus.isOptedIn ? (
              <>
                Continue to Condition
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : emailVerificationSent ? (
              <>
                Continue (Email Sent)
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              'Waiting for Opt-In...'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

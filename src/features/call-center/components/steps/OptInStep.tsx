/**
 * Opt-In Step Component
 * 
 * Handles SMS opt-in verification for the customer.
 * Includes alternatives: email verification and skip with disposition.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { OptInStatusIndicator } from '../OptInStatusIndicator';
import { 
  Phone, Send, Loader2, User, Mail, SkipForward, 
  XCircle, ThumbsUp, ThumbsDown, Zap, Info, 
  ArrowRight, RotateCcw, AlertCircle, CheckCircle 
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
  onSimulateOptIn: () => void;
  onSendEmailVerification: () => Promise<{ success: boolean; error?: string }>;
  onSkipDisposition: (disposition: string, isPositive: boolean) => Promise<{ success: boolean }>;
  onShowSkipDisposition: (show: boolean) => void;
  onContinue: () => void;
  onStartOver: () => void;
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
  onSimulateOptIn,
  onSendEmailVerification,
  onSkipDisposition,
  onShowSkipDisposition,
  onContinue,
  onStartOver,
}: OptInStepProps) {
  const [isSendingOptIn, setIsSendingOptIn] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSubmittingDisposition, setIsSubmittingDisposition] = useState(false);

  const handleSendOptIn = async () => {
    setIsSendingOptIn(true);
    await onSendOptIn();
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

  return (
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
              onChange={(e) => onCellPhoneChange(e.target.value)}
              disabled={optInStatus.status !== 'not_sent' && optInStatus.status !== 'invalid_response' && !isSimulating}
              className="text-lg"
            />
            <Button
              onClick={handleSendOptIn}
              disabled={
                !cellPhone ||
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
                ⚠️ Admin will be notified if you skip verification with a positive disposition
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

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onStartOver}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
          <Button
            onClick={onContinue}
            disabled={!canContinue}
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
              'Waiting for Opt-In...'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

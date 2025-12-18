/**
 * Call Center Redemption Panel V2
 * 
 * Refactored version of the redemption panel using modular step components
 * and a state machine hook for better maintainability.
 * 
 * @module features/call-center
 */

import { useEffect } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { useToast } from '@shared/hooks';
import { useRedemptionWorkflow, type WorkflowStep, type RecipientData } from './hooks/useRedemptionWorkflow';
import {
  CodeEntryStep,
  OptInStep,
  ContactMethodStep,
  ConditionStep,
  CompleteStep,
} from './steps';

interface CallCenterRedemptionPanelV2Props {
  onRecipientLoaded?: (data: {
    clientId?: string;
    campaignId?: string;
    recipient: RecipientData;
    step: WorkflowStep;
  }) => void;
}

export function CallCenterRedemptionPanelV2({ onRecipientLoaded }: CallCenterRedemptionPanelV2Props) {
  const { toast } = useToast();

  const workflow = useRedemptionWorkflow({ onRecipientLoaded });
  const {
    state,
    updateState,
    setStep,
    reset,
    campaign,
    activeConditions,
    isConditionConfigured,
    optInStatus,
    lookupMutation,
    provisionMutation,
    sendOptInSms,
    simulateSmsOptIn,
    sendEmailVerification,
    handleSkipDisposition,
  } = workflow;

  // Auto-advance when opted in
  useEffect(() => {
    if (optInStatus.isOptedIn && state.step === 'optin') {
      toast({
        title: 'Customer Opted In!',
        description: 'You can now proceed with the gift card provisioning.',
      });
      setStep('contact');
    }
  }, [optInStatus.isOptedIn, state.step, toast, setStep]);

  // Handle lookup error toast
  useEffect(() => {
    if (lookupMutation.error) {
      toast({
        title: 'Lookup Failed',
        description: lookupMutation.error.message,
        variant: 'destructive',
      });
    }
  }, [lookupMutation.error, toast]);

  // Handle provisioning success/error toasts
  useEffect(() => {
    if (provisionMutation.isSuccess) {
      toast({
        title: 'Gift Card Provisioned',
        description: 'Successfully redeemed gift card for customer.',
      });
    }
    if (provisionMutation.error) {
      toast({
        title: 'Redemption Failed',
        description: provisionMutation.error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  }, [provisionMutation.isSuccess, provisionMutation.error, toast]);

  // Handle opt-in SMS result
  const handleSendOptIn = async () => {
    const result = await sendOptInSms();
    if (result?.success) {
      toast({
        title: 'Opt-in SMS Sent!',
        description: 'Ask customer to reply YES to continue.',
      });
    } else if (result?.error) {
      toast({
        title: 'Failed to send SMS',
        description: result.error,
        variant: 'destructive',
      });
    }
    return result || { success: false };
  };

  // Handle email verification result
  const handleSendEmail = async () => {
    const result = await sendEmailVerification();
    if (result.success) {
      toast({
        title: 'Verification Email Sent!',
        description: `Email sent to ${state.recipient?.email}`,
      });
    } else if (result.error) {
      toast({
        title: 'Failed to send email',
        description: result.error,
        variant: 'destructive',
      });
    }
    return result;
  };

  // Handle disposition result
  const handleDisposition = async (disposition: string, isPositive: boolean) => {
    const result = await handleSkipDisposition(disposition, isPositive);
    if (result.success) {
      if (isPositive) {
        toast({
          title: 'Proceeding with Positive Disposition',
          description: `Verification skipped with disposition`,
        });
      } else {
        toast({
          title: 'Call Marked',
          description: 'Disposition recorded',
        });
      }
    }
    return result;
  };

  // Copy request ID to clipboard
  const copyRequestId = () => {
    if (state.provisioningError?.requestId) {
      navigator.clipboard.writeText(state.provisioningError.requestId);
      toast({
        title: 'Copied!',
        description: 'Request ID copied to clipboard for support',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Badge variant={['code', 'optin', 'contact', 'condition', 'complete'].includes(state.step) ? 'default' : 'outline'}>
          1. Code
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge
          variant={['optin', 'contact', 'condition', 'complete'].includes(state.step) ? 'default' : 'outline'}
          className={state.step === 'optin' && optInStatus.isPending ? 'animate-pulse bg-yellow-500' : ''}
        >
          2. Opt-In
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={['contact', 'condition', 'complete'].includes(state.step) ? 'default' : 'outline'}>
          3. Contact
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={['condition', 'complete'].includes(state.step) ? 'default' : 'outline'}>
          4. Condition
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={state.step === 'complete' ? 'default' : 'outline'}>
          5. Complete
        </Badge>
      </div>

      {/* Step 1: Code Entry */}
      {state.step === 'code' && (
        <CodeEntryStep
          redemptionCode={state.redemptionCode}
          onCodeChange={(code) => updateState({ redemptionCode: code })}
          onLookup={() => lookupMutation.mutate(state.redemptionCode.trim())}
          isLoading={lookupMutation.isPending}
        />
      )}

      {/* Step 2: SMS Opt-In */}
      {state.step === 'optin' && state.recipient && (
        <OptInStep
          recipient={state.recipient}
          cellPhone={state.cellPhone}
          onCellPhoneChange={(phone) => updateState({ cellPhone: phone })}
          optInStatus={optInStatus}
          isSimulating={state.isSimulating}
          simulationCountdown={state.simulationCountdown}
          isSimulatedMode={state.isSimulatedMode}
          emailVerificationSent={state.emailVerificationSent}
          showSkipDisposition={state.showSkipDisposition}
          onSendOptIn={handleSendOptIn}
          onSimulateOptIn={simulateSmsOptIn}
          onSendEmailVerification={handleSendEmail}
          onSkipDisposition={handleDisposition}
          onShowSkipDisposition={(show) => updateState({ showSkipDisposition: show })}
          onContinue={() => setStep('contact')}
          onStartOver={reset}
        />
      )}

      {/* Step 3: Contact Method */}
      {state.step === 'contact' && state.recipient && (
        <ContactMethodStep
          recipient={state.recipient}
          phone={state.phone}
          cellPhone={state.cellPhone}
          onPhoneChange={(phone) => updateState({ phone })}
          onBack={() => setStep('optin')}
          onContinue={() => setStep('condition')}
        />
      )}

      {/* Step 4: Condition Selection */}
      {state.step === 'condition' && state.recipient && (
        <ConditionStep
          campaign={campaign}
          activeConditions={activeConditions}
          selectedConditionId={state.selectedConditionId}
          isConditionConfigured={isConditionConfigured}
          optInStatus={optInStatus}
          verificationMethod={state.verificationMethod}
          selectedDisposition={state.selectedDisposition}
          provisioningError={state.provisioningError}
          isProvisioning={provisionMutation.isPending}
          onConditionChange={(id) => updateState({ selectedConditionId: id })}
          onProvision={() => provisionMutation.mutate()}
          onBack={() => setStep('contact')}
          onClearError={() => updateState({ provisioningError: null })}
          onCopyRequestId={copyRequestId}
        />
      )}

      {/* Step 5: Complete */}
      {state.step === 'complete' && state.result && (
        <CompleteStep
          result={state.result}
          isSimulatedMode={state.isSimulatedMode}
          onStartNew={reset}
        />
      )}
    </div>
  );
}

export default CallCenterRedemptionPanelV2;

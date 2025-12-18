/**
 * Condition Step Component
 * 
 * Handles selecting which campaign condition the customer completed
 * and initiating gift card provisioning.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { 
  CheckCircle, AlertCircle, Gift, Loader2, 
  XCircle, Info, ExternalLink, RotateCcw, ClipboardCopy 
} from 'lucide-react';
import type { Campaign, CampaignCondition, ProvisioningError } from '../hooks/useRedemptionWorkflow';
import { POSITIVE_DISPOSITIONS } from './OptInStep';

// Error code descriptions
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

interface ConditionStepProps {
  campaign: Campaign | undefined;
  activeConditions: CampaignCondition[];
  selectedConditionId: string;
  isConditionConfigured: boolean;
  optInStatus: { isOptedIn: boolean };
  verificationMethod: string;
  selectedDisposition: string;
  provisioningError: ProvisioningError | null;
  isProvisioning: boolean;
  onConditionChange: (conditionId: string) => void;
  onProvision: () => void;
  onBack: () => void;
  onClearError: () => void;
  onCopyRequestId: () => void;
}

export function ConditionStep({
  campaign,
  activeConditions,
  selectedConditionId,
  isConditionConfigured,
  optInStatus,
  verificationMethod,
  selectedDisposition,
  provisioningError,
  isProvisioning,
  onConditionChange,
  onProvision,
  onBack,
  onClearError,
  onCopyRequestId,
}: ConditionStepProps) {
  const conditionsNeedingConfig = activeConditions.filter(
    c => !c.brand_id || !c.card_value || c.card_value === 0
  );

  const hasValidVerification = 
    optInStatus.isOptedIn ||
    (verificationMethod === 'skipped' && POSITIVE_DISPOSITIONS.some(d => d.value === selectedDisposition)) ||
    verificationMethod === 'email';

  const canProvision = selectedConditionId && hasValidVerification && isConditionConfigured;

  return (
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
        {/* Opt-in validation reminder */}
        {!hasValidVerification && (
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
          <Select value={selectedConditionId} onValueChange={onConditionChange}>
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
                  An administrator must edit the campaign and configure a gift card for this condition.
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

        {/* Info: Some conditions missing config */}
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
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={onProvision}
            disabled={!canProvision || isProvisioning}
            className="flex-1"
          >
            {isProvisioning ? (
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
                  <Button variant="ghost" size="sm" onClick={onCopyRequestId} className="h-6 px-2">
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
                      onClearError();
                      onProvision();
                    }}
                    disabled={isProvisioning}
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
                  onClick={() => window.open('/system-health?tab=gift-cards', '_blank')}
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
  );
}

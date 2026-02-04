/**
 * Campaign API Hooks
 * 
 * TanStack Query hooks for ALL campaign operations.
 * Covers drafts, conditions, validation, preview, and marketing.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Query Keys Factory
// ============================================================================

export const campaignKeys = {
  all: ['campaigns'] as const,
  drafts: () => ['campaigns', 'drafts'] as const,
  draft: (id: string) => ['campaigns', 'drafts', id] as const,
  conditions: (campaignId: string) => ['campaigns', campaignId, 'conditions'] as const,
  budget: (campaignId: string) => ['campaigns', campaignId, 'budget'] as const,
  preview: (campaignId: string) => ['campaigns', campaignId, 'preview'] as const,
  config: (campaignId: string) => ['campaigns', campaignId, 'config'] as const,
};

// ============================================================================
// Draft Types
// ============================================================================

export interface SaveDraftRequest {
  draftId?: string;
  clientId?: string;
  draftName?: string;
  formData: Record<string, unknown>;
  currentStep?: number;
}

export interface SaveDraftResponse {
  draft: {
    id: string;
    draft_name: string;
    current_step: number;
    updated_at: string;
  };
}

// ============================================================================
// Condition Types
// ============================================================================

export interface EvaluateConditionsRequest {
  campaignId: string;
  recipientId: string;
  conditionNumber?: number;
  eventType?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluateConditionsResponse {
  success: boolean;
  conditionsMet: boolean;
  conditionNumber?: number;
  triggeredActions?: string[];
  error?: string;
}

export interface CompleteConditionRequest {
  campaignId: string;
  recipientId: string;
  conditionNumber: number;
  metadata?: Record<string, unknown>;
}

export interface CompleteConditionResponse {
  success: boolean;
  rewardTriggered?: boolean;
  giftCardId?: string;
  error?: string;
}

// ============================================================================
// Budget & Validation Types
// ============================================================================

export interface ValidateBudgetRequest {
  campaignId: string;
  proposedBudget?: number;
}

export interface ValidateBudgetResponse {
  valid: boolean;
  availableCredit: number;
  requiredCredit: number;
  estimatedCost: number;
  errors?: string[];
  warnings?: string[];
}

export interface CalculateCreditRequest {
  campaignId?: string;
  recipientCount: number;
  giftCardValue: number;
  conditionsCount?: number;
}

export interface CalculateCreditResponse {
  totalRequired: number;
  breakdown: {
    giftCards: number;
    processing: number;
    buffer: number;
  };
}

// ============================================================================
// Token Types
// ============================================================================

export interface GenerateTokensRequest {
  campaignId: string;
  count?: number;
  audienceId?: string;
}

export interface GenerateTokensResponse {
  success: boolean;
  generated: number;
  tokens?: string[];
  error?: string;
}

// ============================================================================
// Preview Types
// ============================================================================

export interface PreviewAudienceRequest {
  campaignId: string;
  audienceId?: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

export interface PreviewAudienceResponse {
  success: boolean;
  totalCount: number;
  sample: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  }>;
  demographics?: {
    states: Record<string, number>;
    cities: Record<string, number>;
  };
}

export interface CreatePreviewLinkRequest {
  campaignId: string;
  password?: string;
  expiresInHours?: number;
  maxViews?: number;
}

export interface CreatePreviewLinkResponse {
  success: boolean;
  previewLink: {
    id: string;
    token: string;
    expires_at: string;
    max_views: number | null;
  };
  url: string;
}

// ============================================================================
// Config & Diagnostics Types
// ============================================================================

export interface DiagnoseConfigRequest {
  campaignId: string;
}

export interface DiagnoseConfigResponse {
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: Record<string, unknown>;
  }>;
  recommendations?: string[];
}

// ============================================================================
// Vendor Types
// ============================================================================

export interface SubmitToVendorRequest {
  campaignId: string;
}

export interface SubmitToVendorResponse {
  success: boolean;
  batchCount: number;
  totalRecipients: number;
  batches: Array<{
    id: string;
    batch_number: number;
  }>;
  estimatedCompletion: string;
}

// ============================================================================
// Marketing Types
// ============================================================================

export interface SendMarketingCampaignRequest {
  campaignId: string;
  testMode?: boolean;
  recipientIds?: string[];
}

export interface SendMarketingCampaignResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors?: Array<{
    recipientId: string;
    error: string;
  }>;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Save or update a campaign draft.
 */
export function useSaveCampaignDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SaveDraftRequest) =>
      callEdgeFunction<SaveDraftResponse>(
        Endpoints.campaigns.saveDraft,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.drafts() });
    },
  });
}

/**
 * Evaluate campaign conditions for a recipient.
 */
export function useEvaluateConditions() {
  return useMutation({
    mutationFn: (request: EvaluateConditionsRequest) =>
      callEdgeFunction<EvaluateConditionsResponse>(
        Endpoints.campaigns.evaluateConditions,
        request
      ),
  });
}

/**
 * Mark a condition as complete for a recipient.
 */
export function useCompleteCondition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CompleteConditionRequest) =>
      callEdgeFunction<CompleteConditionResponse>(
        Endpoints.campaigns.completeCondition,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: campaignKeys.conditions(variables.campaignId),
      });
    },
  });
}

/**
 * Validate campaign budget and credit requirements.
 */
export function useValidateCampaignBudget() {
  return useMutation({
    mutationFn: (request: ValidateBudgetRequest) =>
      callEdgeFunction<ValidateBudgetResponse>(
        Endpoints.campaigns.validateBudget,
        request
      ),
  });
}

/**
 * Calculate credit requirements for a campaign.
 */
export function useCalculateCreditRequirements() {
  return useMutation({
    mutationFn: (request: CalculateCreditRequest) =>
      callEdgeFunction<CalculateCreditResponse>(
        Endpoints.campaigns.calculateCredit,
        request
      ),
  });
}

/**
 * Generate unique recipient tokens.
 */
export function useGenerateRecipientTokens() {
  return useMutation({
    mutationFn: (request: GenerateTokensRequest) =>
      callEdgeFunction<GenerateTokensResponse>(
        Endpoints.campaigns.generateTokens,
        request
      ),
  });
}

/**
 * Preview campaign audience.
 */
export function usePreviewCampaignAudience() {
  return useMutation({
    mutationFn: (request: PreviewAudienceRequest) =>
      callEdgeFunction<PreviewAudienceResponse>(
        Endpoints.campaigns.previewAudience,
        request
      ),
  });
}

/**
 * Create a shareable preview link.
 */
export function useCreatePreviewLink() {
  return useMutation({
    mutationFn: (request: CreatePreviewLinkRequest) =>
      callEdgeFunction<CreatePreviewLinkResponse>(
        Endpoints.campaigns.createPreviewLink,
        request
      ),
  });
}

/**
 * Diagnose campaign configuration issues.
 */
export function useDiagnoseCampaignConfig() {
  return useMutation({
    mutationFn: (request: DiagnoseConfigRequest) =>
      callEdgeFunction<DiagnoseConfigResponse>(
        Endpoints.campaigns.diagnoseConfig,
        request
      ),
  });
}

/**
 * Submit campaign to print vendor.
 */
export function useSubmitToVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SubmitToVendorRequest) =>
      callEdgeFunction<SubmitToVendorResponse>(
        Endpoints.campaigns.submitToVendor,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

/**
 * Send marketing campaign.
 */
export function useSendMarketingCampaign() {
  return useMutation({
    mutationFn: (request: SendMarketingCampaignRequest) =>
      callEdgeFunction<SendMarketingCampaignResponse>(
        Endpoints.marketing.sendCampaign,
        request
      ),
  });
}

// ============================================================================
// Query Hooks
// ============================================================================/**
 * Query budget validation (for display without user action).
 */
export function useCampaignBudgetValidation(
  campaignId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: campaignKeys.budget(campaignId),
    queryFn: () =>
      callEdgeFunction<ValidateBudgetResponse>(
        Endpoints.campaigns.validateBudget,
        { campaignId }
      ),
    enabled: options?.enabled !== false && !!campaignId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}/**
 * Query campaign config diagnostics.
 */
export function useCampaignConfigDiagnostics(
  campaignId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: campaignKeys.config(campaignId),
    queryFn: () =>
      callEdgeFunction<DiagnoseConfigResponse>(
        Endpoints.campaigns.diagnoseConfig,
        { campaignId }
      ),
    enabled: options?.enabled !== false && !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Campaign API Hooks
 * Standardized TanStack Query hooks for campaign operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================
// Query Keys
// ============================================
export const campaignKeys = {
  all: ['campaigns'] as const,
  drafts: () => ['campaigns', 'drafts'] as const,
  draft: (id: string) => ['campaigns', 'drafts', id] as const,
  conditions: (campaignId: string) => ['campaigns', campaignId, 'conditions'] as const,
};

// ============================================
// Request/Response Types
// ============================================
export interface SaveDraftRequest {
  draftId?: string;
  clientId?: string;
  draftName?: string;
  formData: Record<string, any>;
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

export interface GenerateTokensRequest {
  campaignId: string;
  count?: number;
}

export interface GenerateTokensResponse {
  success: boolean;
  tokens?: string[];
  error?: string;
}

export interface EvaluateConditionsRequest {
  campaignId: string;
  recipientId: string;
  conditionNumber?: number;
}

export interface EvaluateConditionsResponse {
  success: boolean;
  conditionsMet: boolean;
  conditionNumber?: number;
  error?: string;
}

export interface CompleteConditionRequest {
  campaignId: string;
  recipientId: string;
  conditionNumber: number;
}

export interface CompleteConditionResponse {
  success: boolean;
  error?: string;
}

// ============================================
// Mutations
// ============================================

/**
 * Save or update a campaign draft
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
 * Generate unique recipient tokens
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
 * Evaluate campaign conditions for a recipient
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
 * Mark a condition as complete for a recipient
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
        queryKey: campaignKeys.conditions(variables.campaignId) 
      });
    },
  });
}


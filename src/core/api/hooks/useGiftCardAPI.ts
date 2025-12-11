/**
 * Gift Card API Hooks
 * Standardized TanStack Query hooks for gift card operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================
// Query Keys Factory
// ============================================
export const giftCardKeys = {
  all: ['gift-cards'] as const,
  balance: (cardId: string) => ['gift-cards', 'balance', cardId] as const,
  deliveries: (recipientId: string) => ['gift-cards', 'deliveries', recipientId] as const,
  provision: () => ['gift-cards', 'provision'] as const,
};

// ============================================
// Request/Response Types
// ============================================
export interface ProvisionGiftCardRequest {
  campaignId: string;
  recipientId: string;
  brandId: string;
  denomination: number;
  conditionNumber?: number;
}

export interface GiftCardProvisionResponse {
  success: boolean;
  giftCard?: {
    id: string;
    code: string;
    pin?: string;
    brand: string;
    denomination: number;
    url?: string;
  };
  error?: string;
}

export interface BalanceCheckRequest {
  cardId: string;
  brandCode: string;
}

export interface BalanceCheckResponse {
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

export interface ValidateCodeRequest {
  code: string;
}

export interface ValidateCodeResponse {
  valid: boolean;
  error?: string;
}

// ============================================
// Mutations
// ============================================

/**
 * Provision a gift card for a recipient
 */
export function useProvisionGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProvisionGiftCardRequest) => 
      callEdgeFunction<GiftCardProvisionResponse>(
        Endpoints.giftCards.provision,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
    },
  });
}

/**
 * Validate a gift card code
 */
export function useValidateGiftCardCode() {
  return useMutation({
    mutationFn: (code: string) => 
      callEdgeFunction<ValidateCodeResponse>(
        Endpoints.giftCards.validateCode,
        { code }
      ),
  });
}

// ============================================
// Queries
// ============================================

/**
 * Check gift card balance
 */
export function useCheckBalance(cardId: string, brandCode: string, enabled = true) {
  return useQuery({
    queryKey: giftCardKeys.balance(cardId),
    queryFn: () => 
      callEdgeFunction<BalanceCheckResponse>(
        Endpoints.giftCards.checkBalance,
        { cardId, brandCode }
      ),
    enabled: enabled && !!cardId && !!brandCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}


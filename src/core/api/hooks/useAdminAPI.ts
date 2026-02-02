/**
 * Admin API Hooks
 * 
 * TanStack Query hooks for administrative operations.
 * Covers credits, API keys, diagnostics, and system configuration.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { callEdgeFunction, callPublicEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Query Keys Factory
// ============================================================================

export const adminKeys = {
  all: ['admin'] as const,
  environment: () => ['admin', 'environment'] as const,
  provisioning: () => ['admin', 'provisioning'] as const,
  credits: (accountId?: string) => ['admin', 'credits', accountId] as const,
};

// ============================================================================
// Credit Types
// ============================================================================

export interface AllocateCreditRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reason?: string;
  expiresAt?: string;
}

export interface AllocateCreditResponse {
  success: boolean;
  transactionId?: string;
  fromBalance: number;
  toBalance: number;
  error?: string;
}

export interface CalculateCreditRequirementsRequest {
  campaignId?: string;
  recipientCount: number;
  giftCardValue: number;
  conditionsCount?: number;
}

export interface CalculateCreditRequirementsResponse {
  totalRequired: number;
  breakdown: {
    giftCards: number;
    processing: number;
    buffer: number;
  };
  estimatedCostPerRecipient: number;
}

// ============================================================================
// API Key Types
// ============================================================================

export interface GenerateApiKeyRequest {
  name: string;
  clientId: string;
  permissions?: string[];
  expiresInDays?: number;
}

export interface GenerateApiKeyResponse {
  success: boolean;
  apiKey?: string; // Only returned once on creation
  keyId?: string;
  prefix?: string;
  expiresAt?: string;
  error?: string;
}

// ============================================================================
// Environment Types
// ============================================================================

export interface ValidateEnvironmentResponse {
  valid: boolean;
  checks: Array<{
    name: string;
    category: string;
    status: 'configured' | 'missing' | 'invalid';
    value?: string;
    required: boolean;
  }>;
  summary: {
    total: number;
    configured: number;
    missing: number;
    invalid: number;
  };
}

// ============================================================================
// Diagnostics Types
// ============================================================================

export interface DiagnoseProvisioningRequest {
  clientId?: string;
  poolId?: string;
}

export interface DiagnoseProvisioningResponse {
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: Record<string, unknown>;
  }>;
  recommendations?: string[];
  timestamp: string;
}

// ============================================================================
// Invitation Types
// ============================================================================

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Allocate credits between accounts.
 * Admin/agency operation for credit distribution.
 */
export function useAllocateCredit() {
  return useMutation({
    mutationFn: (request: AllocateCreditRequest) =>
      callEdgeFunction<AllocateCreditResponse>(
        Endpoints.admin.allocateCredit,
        request
      ),
  });
}

/**
 * Calculate credit requirements for a campaign.
 */
export function useCalculateCreditRequirements() {
  return useMutation({
    mutationFn: (request: CalculateCreditRequirementsRequest) =>
      callEdgeFunction<CalculateCreditRequirementsResponse>(
        Endpoints.campaigns.calculateCredit,
        request
      ),
  });
}

/**
 * Generate a new API key.
 */
export function useGenerateApiKey() {
  return useMutation({
    mutationFn: (request: GenerateApiKeyRequest) =>
      callEdgeFunction<GenerateApiKeyResponse>(
        Endpoints.admin.generateApiKey,
        request
      ),
  });
}

/**
 * Diagnose provisioning setup.
 * Admin tool for troubleshooting gift card provisioning.
 */
export function useDiagnoseProvisioningSetup() {
  return useMutation({
    mutationFn: (request: DiagnoseProvisioningRequest) =>
      callEdgeFunction<DiagnoseProvisioningResponse>(
        Endpoints.admin.diagnoseProvisioning,
        request
      ),
  });
}

/**
 * Accept a user invitation.
 * Public endpoint - no authentication required.
 */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (request: AcceptInvitationRequest) =>
      callPublicEdgeFunction<AcceptInvitationResponse>(
        Endpoints.admin.acceptInvitation,
        request
      ),
  });
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Validate environment configuration.
 * Shows status of all required environment variables.
 */
export function useEnvironmentValidation(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminKeys.environment(),
    queryFn: () =>
      callEdgeFunction<ValidateEnvironmentResponse>(
        Endpoints.admin.validateEnvironment,
        {}
      ),
    enabled: options?.enabled !== false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get provisioning diagnostics.
 */
export function useProvisioningDiagnostics(
  request?: DiagnoseProvisioningRequest,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: adminKeys.provisioning(),
    queryFn: () =>
      callEdgeFunction<DiagnoseProvisioningResponse>(
        Endpoints.admin.diagnoseProvisioning,
        request || {}
      ),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

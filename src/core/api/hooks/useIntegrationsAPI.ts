/**
 * Integrations API Hooks
 * 
 * TanStack Query hooks for external integrations.
 * Covers Zapier, webhooks, wallet passes, and code approvals.
 */

import { useMutation } from '@tanstack/react-query';
import { callEdgeFunction, callPublicEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Zapier Types
// ============================================================================

export interface DispatchZapierEventRequest {
  eventType: string;
  data: Record<string, unknown>;
  zapId?: string;
  clientId?: string;
}

export interface DispatchZapierEventResponse {
  success: boolean;
  eventId?: string;
  dispatched: boolean;
  error?: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface TriggerWebhookRequest {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  secret?: string;
  retryCount?: number;
}

export interface TriggerWebhookResponse {
  success: boolean;
  statusCode?: number;
  response?: unknown;
  attempts?: number;
  error?: string;
}

// ============================================================================
// Wallet Pass Types
// ============================================================================

export interface GenerateAppleWalletPassRequest {
  giftCardId: string;
  recipientName?: string;
  recipientEmail?: string;
}

export interface GenerateAppleWalletPassResponse {
  success: boolean;
  passData?: string; // Base64 encoded .pkpass
  passUrl?: string;
  error?: string;
}

export interface GenerateGoogleWalletPassRequest {
  giftCardId: string;
  recipientName?: string;
  recipientEmail?: string;
}

export interface GenerateGoogleWalletPassResponse {
  success: boolean;
  saveUrl?: string;
  jwt?: string;
  error?: string;
}

// ============================================================================
// Code Approval Types
// ============================================================================

export interface ApproveCustomerCodeRequest {
  codeId: string;
  recipientId: string;
  campaignId?: string;
  notes?: string;
}

export interface ApproveCustomerCodeResponse {
  success: boolean;
  giftCardId?: string;
  notificationSent: boolean;
  error?: string;
}

export interface BulkApproveCodesRequest {
  codeIds: string[];
  campaignId?: string;
  notes?: string;
}

export interface BulkApproveCodesResponse {
  success: boolean;
  approved: number;
  failed: number;
  results: Array<{
    codeId: string;
    success: boolean;
    giftCardId?: string;
    error?: string;
  }>;
}

// ============================================================================
// Call Center Types
// ============================================================================

export interface HandleIncomingCallRequest {
  from: string;
  to: string;
  callSid: string;
  direction?: 'inbound' | 'outbound';
}

export interface HandleIncomingCallResponse {
  success: boolean;
  twiml?: string;
  callId?: string;
  recipientMatched?: boolean;
  error?: string;
}

export interface CompleteCallDispositionRequest {
  callId: string;
  disposition: string;
  notes?: string;
  outcome?: 'success' | 'callback' | 'no_answer' | 'declined' | 'other';
  scheduleCallback?: string;
}

export interface CompleteCallDispositionResponse {
  success: boolean;
  conditionTriggered?: boolean;
  giftCardProvisioned?: boolean;
  error?: string;
}

// ============================================================================
// Zapier Mutation Hooks
// ============================================================================

/**
 * Dispatch event to Zapier.
 * Triggers Zapier workflows.
 */
export function useDispatchZapierEvent() {
  return useMutation({
    mutationFn: (request: DispatchZapierEventRequest) =>
      callEdgeFunction<DispatchZapierEventResponse>(
        Endpoints.webhooks.dispatchZapier,
        request
      ),
  });
}

// ============================================================================
// Webhook Mutation Hooks
// ============================================================================

/**
 * Trigger an outgoing webhook.
 * Sends data to external systems.
 */
export function useTriggerWebhook() {
  return useMutation({
    mutationFn: (request: TriggerWebhookRequest) =>
      callEdgeFunction<TriggerWebhookResponse>(
        Endpoints.webhooks.trigger,
        request
      ),
  });
}

// ============================================================================
// Wallet Pass Mutation Hooks
// ============================================================================

/**
 * Generate Apple Wallet pass.
 * Creates .pkpass file for iOS.
 */
export function useGenerateAppleWalletPass() {
  return useMutation({
    mutationFn: (request: GenerateAppleWalletPassRequest) =>
      callPublicEdgeFunction<GenerateAppleWalletPassResponse>(
        Endpoints.wallet.applePass,
        request
      ),
  });
}

/**
 * Generate Google Wallet pass.
 * Creates JWT for Google Wallet.
 */
export function useGenerateGoogleWalletPass() {
  return useMutation({
    mutationFn: (request: GenerateGoogleWalletPassRequest) =>
      callPublicEdgeFunction<GenerateGoogleWalletPassResponse>(
        Endpoints.wallet.googlePass,
        request
      ),
  });
}

// ============================================================================
// Code Approval Mutation Hooks
// ============================================================================

/**
 * Approve a single customer code.
 * Triggers gift card provisioning.
 */
export function useApproveCustomerCode() {
  return useMutation({
    mutationFn: (request: ApproveCustomerCodeRequest) =>
      callEdgeFunction<ApproveCustomerCodeResponse>(
        Endpoints.callCenter.approveCode,
        request
      ),
  });
}

/**
 * Bulk approve customer codes.
 * Batch gift card provisioning.
 */
export function useBulkApproveCodes() {
  return useMutation({
    mutationFn: (request: BulkApproveCodesRequest) =>
      callEdgeFunction<BulkApproveCodesResponse>(
        Endpoints.callCenter.bulkApprove,
        request
      ),
  });
}

// ============================================================================
// Call Center Mutation Hooks
// ============================================================================

/**
 * Handle incoming call.
 * Used by Twilio webhook.
 */
export function useHandleIncomingCall() {
  return useMutation({
    mutationFn: (request: HandleIncomingCallRequest) =>
      callEdgeFunction<HandleIncomingCallResponse>(
        Endpoints.callCenter.handleIncomingCall,
        request
      ),
  });
}

/**
 * Complete call disposition.
 * Records call outcome.
 */
export function useCompleteCallDisposition() {
  return useMutation({
    mutationFn: (request: CompleteCallDispositionRequest) =>
      callEdgeFunction<CompleteCallDispositionResponse>(
        Endpoints.callCenter.completeDisposition,
        request
      ),
  });
}

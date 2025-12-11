/**
 * Messaging API Hooks
 * Standardized TanStack Query hooks for messaging/communication operations
 */

import { useMutation } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================
// Request/Response Types
// ============================================
export interface SendSMSRequest {
  to: string;
  message: string;
  campaignId?: string;
  recipientId?: string;
}

export interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  html?: string;
  campaignId?: string;
  recipientId?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendOptInRequest {
  to: string;
  campaignId?: string;
}

export interface SendOptInResponse {
  success: boolean;
  error?: string;
}

// ============================================
// Mutations
// ============================================

/**
 * Send SMS message
 */
export function useSendSMS() {
  return useMutation({
    mutationFn: (request: SendSMSRequest) => 
      callEdgeFunction<SendSMSResponse>(
        Endpoints.messaging.sendSMS,
        request
      ),
  });
}

/**
 * Send email message
 */
export function useSendEmail() {
  return useMutation({
    mutationFn: (request: SendEmailRequest) => 
      callEdgeFunction<SendEmailResponse>(
        Endpoints.messaging.sendEmail,
        request
      ),
  });
}

/**
 * Send SMS opt-in request
 */
export function useSendOptIn() {
  return useMutation({
    mutationFn: (request: SendOptInRequest) => 
      callEdgeFunction<SendOptInResponse>(
        Endpoints.messaging.optIn,
        request
      ),
  });
}


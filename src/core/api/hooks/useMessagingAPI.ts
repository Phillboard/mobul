/**
 * Messaging API Hooks
 * 
 * TanStack Query hooks for ALL messaging/communication operations.
 * Covers SMS, email, notifications, and user invitations.
 */

import { useMutation } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Base Types
// ============================================================================

export interface MessagingResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}

// ============================================================================
// SMS Types
// ============================================================================

export interface SendGiftCardSmsRequest {
  phone: string;
  recipientId?: string;
  giftCardId?: string;
  campaignId?: string;
  message?: string;
}

export interface SendMarketingSmsRequest {
  phone: string;
  message: string;
  campaignId?: string;
  recipientId?: string;
  templateId?: string;
}

export interface SendOptInRequest {
  phone: string;
  recipientId?: string;
  campaignId?: string;
  clientId?: string;
}

export interface RetryFailedSmsRequest {
  messageId: string;
  maxRetries?: number;
}

export interface RetryFailedSmsResponse extends MessagingResponse {
  retryCount: number;
  finalStatus: 'sent' | 'failed' | 'pending';
}

export interface TestSmsProviderRequest {
  phone: string;
  provider?: 'twilio' | 'infobip' | 'eztexting' | 'notificationapi';
  clientId?: string;
}

export interface TestSmsProviderResponse extends MessagingResponse {
  provider: string;
  deliveryTime?: number;
}

// ============================================================================
// Email Types
// ============================================================================

export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface SendGiftCardEmailRequest {
  email: string;
  recipientId?: string;
  giftCardId?: string;
  campaignId?: string;
  recipientName?: string;
}

export interface SendMarketingEmailRequest {
  email: string;
  subject: string;
  html: string;
  campaignId?: string;
  recipientId?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface SendVerificationEmailRequest {
  email: string;
  recipientId: string;
  campaignId?: string;
  verificationUrl?: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface SendApprovalNotificationRequest {
  campaignId: string;
  approverIds: string[];
  message?: string;
  urgency?: 'low' | 'normal' | 'high';
}

export interface SendCommentNotificationRequest {
  campaignId: string;
  commentId: string;
  authorId: string;
  mentionedUserIds?: string[];
}

// ============================================================================
// Invitation Types
// ============================================================================

export interface SendUserInvitationRequest {
  email: string;
  role: string;
  clientId?: string;
  agencyId?: string;
  invitedByUserId: string;
  customMessage?: string;
}

export interface SendUserInvitationResponse extends MessagingResponse {
  invitationId?: string;
  expiresAt?: string;
}

// ============================================================================
// SMS Mutation Hooks
// ============================================================================

/**
 * Send gift card via SMS.
 * Uses hierarchical Twilio credentials.
 */
export function useSendGiftCardSms() {
  return useMutation({
    mutationFn: (request: SendGiftCardSmsRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendGiftCardSms,
        request
      ),
  });
}

/**
 * Send SMS opt-in request.
 * Sends TCPA-compliant opt-in message.
 */
export function useSendSmsOptIn() {
  return useMutation({
    mutationFn: (request: SendOptInRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendOptIn,
        request
      ),
  });
}

/**
 * Send marketing SMS.
 * For bulk marketing campaigns.
 */
export function useSendMarketingSms() {
  return useMutation({
    mutationFn: (request: SendMarketingSmsRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendMarketingSms,
        request
      ),
  });
}

/**
 * Retry a failed SMS send.
 */
export function useRetryFailedSms() {
  return useMutation({
    mutationFn: (request: RetryFailedSmsRequest) =>
      callEdgeFunction<RetryFailedSmsResponse>(
        Endpoints.messaging.retrySms,
        request
      ),
  });
}

/**
 * Test SMS provider configuration.
 * Sends a test message to verify setup.
 */
export function useTestSmsProvider() {
  return useMutation({
    mutationFn: (request: TestSmsProviderRequest) =>
      callEdgeFunction<TestSmsProviderResponse>(
        Endpoints.messaging.testSmsProvider,
        request
      ),
  });
}

// ============================================================================
// Email Mutation Hooks
// ============================================================================

/**
 * Send generic email.
 */
export function useSendEmail() {
  return useMutation({
    mutationFn: (request: SendEmailRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendEmail,
        request
      ),
  });
}

/**
 * Send gift card via email.
 * Uses branded email template.
 */
export function useSendGiftCardEmail() {
  return useMutation({
    mutationFn: (request: SendGiftCardEmailRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendGiftCardEmail,
        request
      ),
  });
}

/**
 * Send marketing email.
 * For bulk marketing campaigns.
 */
export function useSendMarketingEmail() {
  return useMutation({
    mutationFn: (request: SendMarketingEmailRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendMarketingEmail,
        request
      ),
  });
}

/**
 * Send verification email.
 * For email address verification flow.
 */
export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: (request: SendVerificationEmailRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendVerificationEmail,
        request
      ),
  });
}

// ============================================================================
// Notification Mutation Hooks
// ============================================================================

/**
 * Send approval notification.
 * Notifies approvers about pending campaign.
 */
export function useSendApprovalNotification() {
  return useMutation({
    mutationFn: (request: SendApprovalNotificationRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendApprovalNotification,
        request
      ),
  });
}

/**
 * Send comment notification.
 * Notifies users about new comments/mentions.
 */
export function useSendCommentNotification() {
  return useMutation({
    mutationFn: (request: SendCommentNotificationRequest) =>
      callEdgeFunction<MessagingResponse>(
        Endpoints.messaging.sendCommentNotification,
        request
      ),
  });
}

// ============================================================================
// Invitation Mutation Hooks
// ============================================================================

/**
 * Send user invitation email.
 * Invites new users to the platform.
 */
export function useSendUserInvitation() {
  return useMutation({
    mutationFn: (request: SendUserInvitationRequest) =>
      callEdgeFunction<SendUserInvitationResponse>(
        Endpoints.messaging.sendUserInvitation,
        request
      ),
  });
}

// ============================================================================
// Backward Compatibility
// ============================================================================/** @deprecated Use useSendSmsOptIn instead */
export const useSendOptIn = useSendSmsOptIn;/** @deprecated Use useSendGiftCardSms instead */
export const useSendSMS = useSendGiftCardSms;

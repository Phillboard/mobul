/**
 * Form API Hooks
 * 
 * TanStack Query hooks for form submission and PURL handling.
 * Covers ACE forms, lead forms, and personalized URLs.
 */

import { useMutation } from '@tanstack/react-query';
import { callEdgeFunction, callPublicEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// ACE Form Types
// ============================================================================

export interface SubmitFormRequest {
  formId: string;
  data: Record<string, unknown>;
  recipientId?: string;
  campaignId?: string;
  code?: string;
}

export interface FormSubmissionResponse {
  success: boolean;
  submissionId?: string;
  giftCard?: {
    id: string;
    code: string;
    pin?: string;
    brand_name: string;
    card_value: number;
    redemption_url?: string;
  };
  message?: string;
  error?: string;
}

// ============================================================================
// Lead Form Types
// ============================================================================

export interface SubmitLeadFormRequest {
  campaignId: string;
  formData: Record<string, unknown>;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  utmParams?: Record<string, string>;
}

export interface SubmitLeadFormResponse {
  success: boolean;
  leadId?: string;
  recipientId?: string;
  conditionTriggered?: boolean;
  giftCard?: {
    id: string;
    code: string;
    brand_name: string;
    card_value: number;
  };
  error?: string;
}

// ============================================================================
// PURL Types
// ============================================================================

export interface HandlePurlRequest {
  token: string;
  action?: 'view' | 'submit';
  formData?: Record<string, unknown>;
}

export interface HandlePurlResponse {
  success: boolean;
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
  landingPage?: {
    id: string;
    html: string;
    config?: Record<string, unknown>;
  };
  conditionTriggered?: boolean;
  error?: string;
}

// ============================================================================
// AI Form Generation Types
// ============================================================================

export interface GenerateAIFormRequest {
  prompt: string;
  formType?: 'contact' | 'lead' | 'survey' | 'registration';
  fields?: string[];
  style?: 'minimal' | 'standard' | 'detailed';
}

export interface GenerateAIFormResponse {
  success: boolean;
  formConfig?: {
    title: string;
    description?: string;
    fields: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
      placeholder?: string;
      options?: string[];
    }>;
    submitButtonText?: string;
  };
  error?: string;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Submit an ACE form.
 * Public endpoint for form submissions.
 */
export function useSubmitForm() {
  return useMutation({
    mutationFn: (request: SubmitFormRequest) =>
      callPublicEdgeFunction<FormSubmissionResponse>(
        Endpoints.forms.submit,
        request
      ),
  });
}

/**
 * Submit a lead capture form.
 * Public endpoint for lead forms on landing pages.
 */
export function useSubmitLeadForm() {
  return useMutation({
    mutationFn: (request: SubmitLeadFormRequest) =>
      callPublicEdgeFunction<SubmitLeadFormResponse>(
        Endpoints.forms.submitLead,
        request
      ),
  });
}

/**
 * Handle personalized URL (PURL) requests.
 * Public endpoint for PURL landing pages.
 */
export function useHandlePurl() {
  return useMutation({
    mutationFn: (request: HandlePurlRequest) =>
      callPublicEdgeFunction<HandlePurlResponse>(
        Endpoints.forms.handlePurl,
        request
      ),
  });
}

/**
 * Generate a form using AI.
 * Public endpoint for AI-powered form creation.
 */
export function useGenerateAIForm() {
  return useMutation({
    mutationFn: (request: GenerateAIFormRequest) =>
      callPublicEdgeFunction<GenerateAIFormResponse>(
        Endpoints.ai.generateForm,
        request
      ),
  });
}

// ============================================================================
// Backward Compatibility
// ============================================================================

/** @deprecated Use useSubmitForm instead */
export const useSubmitAceForm = useSubmitForm;

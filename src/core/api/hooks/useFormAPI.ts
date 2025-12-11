/**
 * Form API Hooks
 * Standardized TanStack Query hooks for form operations
 */

import { useMutation } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================
// Request/Response Types
// ============================================
export interface SubmitFormRequest {
  formId: string;
  data: Record<string, any>;
  recipientId?: string;
  campaignId?: string;
}

export interface FormSubmissionResponse {
  success: boolean;
  submissionId?: string;
  error?: string;
}

export interface SubmitLeadFormRequest {
  formData: Record<string, any>;
  campaignId?: string;
}

export interface GenerateAIFormRequest {
  prompt: string;
  formType?: 'contact' | 'lead' | 'survey';
}

export interface GenerateAIFormResponse {
  success: boolean;
  formConfig?: Record<string, any>;
  error?: string;
}

// ============================================
// Mutations
// ============================================

/**
 * Submit an ACE form
 */
export function useSubmitAceForm() {
  return useMutation({
    mutationFn: (request: SubmitFormRequest) => 
      callEdgeFunction<FormSubmissionResponse>(
        Endpoints.forms.submit,
        request
      ),
  });
}

/**
 * Submit a lead form
 */
export function useSubmitLeadForm() {
  return useMutation({
    mutationFn: (request: SubmitLeadFormRequest) => 
      callEdgeFunction<FormSubmissionResponse>(
        Endpoints.forms.submitLead,
        request
      ),
  });
}

/**
 * Generate a form using AI
 */
export function useGenerateAIForm() {
  return useMutation({
    mutationFn: (request: GenerateAIFormRequest) => 
      callEdgeFunction<GenerateAIFormResponse>(
        Endpoints.forms.generateAI,
        request
      ),
  });
}


/**
 * AI API Hooks
 * 
 * TanStack Query hooks for AI operations.
 * Covers chat, landing page generation, form generation, and design assistance.
 */

import { useMutation } from '@tanstack/react-query';
import { callEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Base Types
// ============================================================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Chat Types
// ============================================================================

export interface AIChatRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIChatResponse extends AIResponse {
  message?: string;
}

export interface DrPhillipChatRequest {
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface DrPhillipChatResponse {
  success: boolean;
  response: string;
  sessionId?: string;
  suggestions?: string[];
  error?: string;
}

export interface AIDesignChatRequest {
  message: string;
  currentDesign?: Record<string, unknown>;
  designType?: 'landing_page' | 'email' | 'mailer';
  sessionId?: string;
}

export interface AIDesignChatResponse {
  success: boolean;
  response: string;
  designUpdates?: Record<string, unknown>;
  suggestions?: string[];
  error?: string;
}

// ============================================================================
// Landing Page Generation Types
// ============================================================================

export interface GenerateLandingPageRequest {
  prompt: string;
  brandName?: string;
  brandColors?: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  includeForm?: boolean;
  formType?: 'contact' | 'lead' | 'survey';
  style?: 'modern' | 'classic' | 'minimal' | 'bold';
  referenceImageUrl?: string;
}

export interface GenerateLandingPageResponse {
  success: boolean;
  html?: string;
  css?: string;
  config?: {
    title: string;
    sections: Array<{
      type: string;
      content: Record<string, unknown>;
    }>;
  };
  preview?: string;
  error?: string;
}

export interface AILandingPageChatRequest {
  message: string;
  sessionId?: string;
  currentPage?: {
    html?: string;
    config?: Record<string, unknown>;
  };
  action?: 'generate' | 'modify' | 'explain';
}

export interface AILandingPageChatResponse {
  success: boolean;
  response: string;
  html?: string;
  modifications?: Array<{
    type: string;
    description: string;
    applied: boolean;
  }>;
  sessionId?: string;
  error?: string;
}

// ============================================================================
// Form Generation Types
// ============================================================================

export interface GenerateFormAIRequest {
  prompt: string;
  formType?: 'contact' | 'lead' | 'survey' | 'registration';
  fields?: string[];
  style?: 'minimal' | 'standard' | 'detailed';
  includeValidation?: boolean;
}

export interface GenerateFormAIResponse {
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
      validation?: Record<string, unknown>;
    }>;
    submitButtonText?: string;
    successMessage?: string;
  };
  error?: string;
}

// ============================================================================
// Chat Mutation Hooks
// ============================================================================

/**
 * General OpenAI chat.
 * For general-purpose AI interactions.
 */
export function useOpenAIChat() {
  return useMutation({
    mutationFn: (request: AIChatRequest) =>
      callEdgeFunction<AIChatResponse>(
        Endpoints.ai.openaiChat,
        request
      ),
  });
}

/**
 * Dr. Phillip AI assistant chat.
 * Specialized assistant for platform guidance.
 */
export function useDrPhillipChat() {
  return useMutation({
    mutationFn: (request: DrPhillipChatRequest) =>
      callEdgeFunction<DrPhillipChatResponse>(
        Endpoints.ai.drPhillipChat,
        request
      ),
  });
}

/**
 * AI design assistant chat.
 * For design-related AI assistance.
 */
export function useAIDesignChat() {
  return useMutation({
    mutationFn: (request: AIDesignChatRequest) =>
      callEdgeFunction<AIDesignChatResponse>(
        Endpoints.ai.designChat,
        request
      ),
  });
}

// ============================================================================
// Generation Mutation Hooks
// ============================================================================

/**
 * Generate landing page with AI.
 * Full-featured landing page generation.
 */
export function useGenerateLandingPage() {
  return useMutation({
    mutationFn: (request: GenerateLandingPageRequest) =>
      callEdgeFunction<GenerateLandingPageResponse>(
        Endpoints.ai.generateLandingPage,
        request
      ),
  });
}

/**
 * AI landing page chat.
 * Interactive landing page creation/modification.
 */
export function useAILandingPageChat() {
  return useMutation({
    mutationFn: (request: AILandingPageChatRequest) =>
      callEdgeFunction<AILandingPageChatResponse>(
        Endpoints.ai.landingPageChat,
        request
      ),
  });
}

/**
 * Generate landing page (simple version).
 * Streamlined landing page generation.
 */
export function useGenerateLandingPageSimple() {
  return useMutation({
    mutationFn: (request: GenerateLandingPageRequest) =>
      callEdgeFunction<GenerateLandingPageResponse>(
        Endpoints.ai.generateLandingPageSimple,
        request
      ),
  });
}

/**
 * Generate form with AI.
 * AI-powered form creation.
 */
export function useGenerateFormAI() {
  return useMutation({
    mutationFn: (request: GenerateFormAIRequest) =>
      callEdgeFunction<GenerateFormAIResponse>(
        Endpoints.ai.generateForm,
        request
      ),
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Generic AI completion hook.
 * Use for custom AI integrations.
 */
export function useAICompletion() {
  return useMutation({
    mutationFn: async (request: {
      prompt: string;
      systemPrompt?: string;
      model?: string;
      temperature?: number;
    }) =>
      callEdgeFunction<AIResponse>(Endpoints.ai.openaiChat, {
        messages: [
          ...(request.systemPrompt
            ? [{ role: 'system' as const, content: request.systemPrompt }]
            : []),
          { role: 'user' as const, content: request.prompt },
        ],
        model: request.model,
        temperature: request.temperature,
      }),
  });
}

// ============================================================================
// Backward Compatibility
// ============================================================================

/** @deprecated Use useOpenAIChat instead */
export const useAIChat = useOpenAIChat;

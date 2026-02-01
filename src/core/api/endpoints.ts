/**
 * Typed Edge Function Endpoints
 * Provides type safety and documentation for all API calls
 */

import { callEdgeFunction, RequestConfig } from './client';

/**
 * Endpoint registry with organized categories
 * Use these constants instead of hardcoded strings
 */
export const Endpoints = {
  // Gift Card Operations
  giftCards: {
    provision: 'provision-gift-card-unified' as const,
    checkBalance: 'check-gift-card-balance' as const,
    validateCode: 'validate-gift-card-code' as const,
    recordDelivery: 'record-gift-card-delivery' as const,
  },
  
  // Campaign Operations  
  campaigns: {
    saveDraft: 'save-campaign-draft' as const,
    generateTokens: 'generate-recipient-tokens' as const,
    evaluateConditions: 'evaluate-conditions' as const,
    completeCondition: 'complete-condition' as const,
  },
  
  // Form Operations
  forms: {
    submit: 'submit-form' as const,
    submitLead: 'submit-lead-form' as const,
    generateAI: 'generate-form-ai' as const,
  },
  
  // Communication/Messaging
  messaging: {
    sendSMS: 'send-gift-card-sms' as const,
    sendEmail: 'send-gift-card-email' as const,
    optIn: 'send-sms-opt-in' as const,
  },
  
  // AI Operations
  ai: {
    chat: 'openai-chat' as const,
    drPhillip: 'dr-phillip-chat' as const,
    generateLandingPage: 'ai-landing-page-generate' as const,
    generateMail: 'ai-mail-generate' as const,
  },
  
  // Contact/Recipient Operations
  contacts: {
    enrich: 'enrich-contact' as const,
    import: 'import-contacts' as const,
  },
  
  // Wallet/Pass Operations
  wallet: {
    createPass: 'create-wallet-pass' as const,
    updatePass: 'update-wallet-pass' as const,
  },
} as const;

/**
 * Type-safe endpoint caller factory
 * Creates a typed wrapper around an endpoint
 */
export function createTypedEndpoint<TRequest, TResponse>(
  endpoint: string,
  defaultConfig?: RequestConfig
) {
  return {
    endpoint,
    call: (request: TRequest, config?: RequestConfig) => 
      callEdgeFunction<TResponse, TRequest>(endpoint, request, { ...defaultConfig, ...config }),
  };
}

/**
 * Get all endpoint names (useful for debugging/monitoring)
 */
export function getAllEndpoints(): string[] {
  const endpoints: string[] = [];
  
  Object.values(Endpoints).forEach(category => {
    Object.values(category).forEach(endpoint => {
      endpoints.push(endpoint as string);
    });
  });
  
  return endpoints;
}

/**
 * Check if a string is a valid endpoint
 */
export function isValidEndpoint(name: string): boolean {
  return getAllEndpoints().includes(name);
}


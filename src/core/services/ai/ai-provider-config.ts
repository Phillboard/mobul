/**
 * AI Provider Configuration
 * Manages OpenAI and Anthropic providers with fallback logic
 */

export type AIProvider = 'openai' | 'anthropic';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  model: string;
  fallbackProvider?: AIProvider;
  fallbackModel?: string;
}

export interface AIGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  imageUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerationResponse {
  html: string;
  css?: string;
  metadata?: {
    title?: string;
    description?: string;
    colors?: string[];
    fonts?: string[];
  };
  tokensUsed: number;
  provider: AIProvider;
  model: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  currentHtml?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIChatResponse {
  updatedHtml: string;
  explanation: string;
  changesMade: string[];
  tokensUsed: number;
  provider: AIProvider;
  model: string;
}

// Default configurations
export const DEFAULT_OPENAI_CONFIG: Partial<AIProviderConfig> = {
  provider: 'openai',
  model: 'gpt-4-vision-preview',
  fallbackProvider: 'anthropic',
  fallbackModel: 'claude-3-opus-20240229',
};

export const DEFAULT_ANTHROPIC_CONFIG: Partial<AIProviderConfig> = {
  provider: 'anthropic',
  model: 'claude-3-opus-20240229',
  fallbackProvider: 'openai',
  fallbackModel: 'gpt-4-vision-preview',
};

// Rate limiting configuration
export const RATE_LIMITS = {
  openai: {
    requestsPerMinute: 50,
    tokensPerMinute: 90000,
  },
  anthropic: {
    requestsPerMinute: 40,
    tokensPerMinute: 100000,
  },
};

/**
 * Get the active AI provider configuration
 */
export function getAIProviderConfig(): AIProviderConfig {
  // This would typically come from user settings or environment
  // For now, return a default configuration
  return {
    ...DEFAULT_OPENAI_CONFIG,
    apiKey: '', // Will be managed server-side
  } as AIProviderConfig;
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: AIProviderConfig): boolean {
  if (!config.provider || !config.model) {
    return false;
  }
  
  // API keys are managed server-side, so we don't validate them here
  return true;
}

/**
 * Get model display name
 */
export function getModelDisplayName(provider: AIProvider, model: string): string {
  const modelNames: Record<string, string> = {
    'gpt-4-vision-preview': 'GPT-4 Vision',
    'gpt-4-turbo-preview': 'GPT-4 Turbo',
    'gpt-4': 'GPT-4',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
  };
  
  return modelNames[model] || model;
}

/**
 * Check if provider supports vision API
 */
export function supportsVision(provider: AIProvider, model: string): boolean {
  if (provider === 'openai' && model.includes('vision')) {
    return true;
  }
  
  if (provider === 'anthropic' && model.includes('claude-3')) {
    return true;
  }
  
  return false;
}


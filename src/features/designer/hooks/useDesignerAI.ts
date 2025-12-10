/**
 * useDesignerAI Hook
 * 
 * AI-powered design assistant using OpenAI GPT-4o.
 * Converts natural language requests into design actions.
 * Supports image generation via DALL-E 3 (and Sora for video in the future).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@core/services/supabase';
import type {
  ChatMessage,
  AISuggestion,
  CanvasState,
  DesignerType,
} from '../types/designer';
import {
  getSystemPrompt,
  createDesignRequestPrompt,
  parseAIResponse,
  validateDesignActions,
} from '../utils/aiPrompts';

export interface UseDesignerAIOptions {
  /** Designer type (determines available actions) */
  designerType: DesignerType;
  /** Current canvas state */
  canvasState: CanvasState;
  /** OpenAI API key (optional, uses edge function if not provided) */
  apiKey?: string;
  /** Callback when actions are ready to apply */
  onSuggestion?: (suggestion: AISuggestion) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface UseDesignerAIReturn {
  // State
  messages: ChatMessage[];
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  applySuggestion: (suggestion: AISuggestion) => void;
  clearConversation: () => void;
  retryLastMessage: () => Promise<void>;
  generateImage: (prompt: string) => Promise<string | null>;
  
  // Current suggestion (if any)
  currentSuggestion: AISuggestion | null;
}

/**
 * AI design assistant hook using OpenAI
 */
export function useDesignerAI(
  options: UseDesignerAIOptions
): UseDesignerAIReturn {
  const {
    designerType,
    canvasState,
    apiKey,
    onSuggestion,
    onError,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState<AISuggestion | null>(null);
  
  const lastUserMessageRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Call OpenAI API via Edge Function
   */
  const callOpenAI = useCallback(async (
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      // Use Edge Function to call OpenAI (keeps API key secure)
      const { data, error: fnError } = await supabase.functions.invoke('openai-chat', {
        body: {
          systemPrompt,
          userPrompt,
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2048,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to call AI');
      }

      if (!data?.content) {
        throw new Error('No response from AI');
      }

      return data.content;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      throw new Error(err.message || 'AI request failed');
    }
  }, []);

  /**
   * Generate image using DALL-E 3
   */
  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('openai-chat', {
        body: {
          type: 'image',
          prompt,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid',
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate image');
      }

      return data?.url || null;
    } catch (err: any) {
      console.error('[useDesignerAI] Image generation error:', err);
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;

    lastUserMessageRef.current = content;
    setError(null);
    setIsGenerating(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Build the prompts
      const systemPrompt = getSystemPrompt(designerType);
      const userPrompt = createDesignRequestPrompt(
        content,
        canvasState,
        designerType
      );

      // Call OpenAI
      const aiResponse = await callOpenAI(systemPrompt, userPrompt);

      // Parse response
      const { actions, explanation } = parseAIResponse(aiResponse);

      // Validate actions
      const validation = validateDesignActions(actions);
      if (!validation.valid) {
        throw new Error(
          `Invalid AI response:\n${validation.errors.join('\n')}`
        );
      }

      // Create AI message
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: explanation,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Create suggestion
      if (actions.length > 0) {
        const suggestion: AISuggestion = {
          actions,
          explanation,
        };

        setCurrentSuggestion(suggestion);
        onSuggestion?.(suggestion);
      }

    } catch (err: any) {
      // Don't show error for aborted requests
      if (err.name === 'AbortError') return;

      const errorMessage = err.message || 'Failed to get AI response';
      setError(errorMessage);
      onError?.(err);

      // Add error message
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [
    isGenerating,
    designerType,
    canvasState,
    callOpenAI,
    onSuggestion,
    onError,
  ]);

  /**
   * Apply a suggestion (callback to parent)
   */
  const applySuggestion = useCallback((suggestion: AISuggestion) => {
    onSuggestion?.(suggestion);
    setCurrentSuggestion(null);
  }, [onSuggestion]);

  /**
   * Clear conversation history
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentSuggestion(null);
  }, []);

  /**
   * Retry the last message
   */
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove last AI response if it was an error
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'assistant') {
          return prev.slice(0, -1);
        }
        return prev;
      });

      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    messages,
    isGenerating,
    error,

    // Actions
    sendMessage,
    applySuggestion,
    clearConversation,
    retryLastMessage,
    generateImage,

    // Current suggestion
    currentSuggestion,
  };
}

/**
 * Hook for quick AI actions (no conversation)
 * Useful for one-off AI requests like "suggest a layout"
 */
export function useQuickAI(options: {
  designerType: DesignerType;
  canvasState: CanvasState;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executePrompt = useCallback(async (prompt: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('openai-chat', {
        body: {
          systemPrompt: getSystemPrompt(options.designerType),
          userPrompt: prompt,
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2048,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'AI request failed');
      }

      if (!data?.content) {
        throw new Error('No response from AI');
      }

      return data.content;
    } catch (err: any) {
      const errorMessage = err.message || 'AI request failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options.designerType]);

  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('openai-chat', {
        body: {
          type: 'image',
          prompt,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid',
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Image generation failed');
      }

      return data?.url || null;
    } catch (err: any) {
      const errorMessage = err.message || 'Image generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    executePrompt,
    generateImage,
    isLoading,
    error,
  };
}

/**
 * useDesignerAI Hook
 * 
 * AI-powered design assistant using Gemini API.
 * Converts natural language requests into design actions.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ChatMessage,
  DesignAction,
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
  /** Gemini API key */
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
  
  // Current suggestion (if any)
  currentSuggestion: AISuggestion | null;
}

/**
 * AI design assistant hook
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

  // Get API key from env if not provided
  const effectiveApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY;

  /**
   * Call Gemini API
   */
  const callGeminiAPI = useCallback(async (prompt: string): Promise<string> => {
    if (!effectiveApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${effectiveApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
        signal: abortControllerRef.current.signal,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API error: ${response.status}`
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from AI');
    }

    return text;
  }, [effectiveApiKey]);

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
      // Build the full prompt
      const systemPrompt = getSystemPrompt(designerType);
      const requestPrompt = createDesignRequestPrompt(
        content,
        canvasState,
        designerType
      );
      const fullPrompt = `${systemPrompt}\n\n${requestPrompt}`;

      // Call AI
      const aiResponse = await callGeminiAPI(fullPrompt);

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
    callGeminiAPI,
    onSuggestion,
    onError,
  ]);

  /**
   * Apply a suggestion (callback to parent)
   */
  const applySuggestion = useCallback((suggestion: AISuggestion) => {
    // This is handled by the parent component
    // The hook just triggers the callback
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
  apiKey?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executePrompt = useCallback(async (prompt: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = options.apiKey || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${getSystemPrompt(options.designerType)}\n\n${prompt}`,
              }],
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No response from AI');
      }

      return text;
    } catch (err: any) {
      const errorMessage = err.message || 'AI request failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options.designerType, options.apiKey]);

  return {
    executePrompt,
    isLoading,
    error,
  };
}

// Add useEffect import
import { useEffect } from 'react';


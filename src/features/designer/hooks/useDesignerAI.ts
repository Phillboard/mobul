/**
 * useDesignerAI Hook
 * 
 * AI-powered design assistant using OpenAI GPT-4o.
 * Converts natural language requests into design actions.
 * Supports image generation via DALL-E 3.
 * Supports reference image analysis via Vision API.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import type {
  ChatMessage,
  AISuggestion,
  CanvasState,
  DesignerType,
  ReferenceImageState,
  ReferenceAnalysis,
} from '../types/designer';
import {
  getSystemPrompt,
  createDesignRequestPrompt,
  parseAIResponse,
  validateDesignActions,
} from '../utils/aiPrompts';

/**
 * Convert File to Base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // Keep the full data URL for edge function
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  
  // Reference image features (for "generate similar" functionality)
  referenceImage: ReferenceImageState;
  analyzeReferenceImage: (file: File) => Promise<ReferenceAnalysis>;
  generateFromReference: (analysis: ReferenceAnalysis, additionalPrompt?: string) => Promise<string | null>;
  clearReferenceImage: () => void;
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
  
  // Reference image state for "generate similar" functionality
  const [referenceImage, setReferenceImage] = useState<ReferenceImageState>({
    file: null,
    previewUrl: null,
    analysis: null,
    isAnalyzing: false,
    error: null,
  });
  
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
      const data = await callEdgeFunction<{ message?: string }>(
        Endpoints.ai.openaiChat,
        {
          systemPrompt,
          userPrompt,
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2048,
        }
      );

      // Edge function returns "message" field, not "content"
      if (!data?.message) {
        throw new Error('No response from AI');
      }

      return data.message;
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
      const data = await callEdgeFunction<{ url?: string }>(
        Endpoints.ai.openaiChat,
        {
          type: 'image',
          prompt,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid',
        }
      );

      return data?.url || null;
    } catch (err: any) {
      console.error('[useDesignerAI] Image generation error:', err);
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Analyze a reference image using Vision API
   * Extracts color palette, style, mood, and layout information
   */
  const analyzeReferenceImage = useCallback(async (imageFile: File): Promise<ReferenceAnalysis> => {
    setReferenceImage(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      // Convert file to base64
      const base64 = await fileToBase64(imageFile);

      // Create preview URL
      const previewUrl = URL.createObjectURL(imageFile);
      setReferenceImage(prev => ({ ...prev, file: imageFile, previewUrl }));

      // Call vision API
      const data = await callEdgeFunction<{ analysis?: ReferenceAnalysis }>(
        Endpoints.ai.openaiChat,
        {
          type: 'vision',
          imageBase64: base64,
        }
      );

      if (!data?.analysis) {
        throw new Error('No analysis returned from Vision API');
      }

      const analysis = data.analysis;
      setReferenceImage(prev => ({ ...prev, analysis, isAnalyzing: false }));

      return analysis;
    } catch (err: any) {
      console.error('[useDesignerAI] Reference image analysis error:', err);
      setReferenceImage(prev => ({
        ...prev,
        isAnalyzing: false,
        error: err.message || 'Failed to analyze image',
      }));
      throw err;
    }
  }, []);

  /**
   * Generate a similar background using reference analysis
   */
  const generateFromReference = useCallback(async (
    analysis: ReferenceAnalysis,
    additionalPrompt?: string
  ): Promise<string | null> => {
    try {
      setIsGenerating(true);
      
      const basePrompt = additionalPrompt || 'Generate a similar professional background';

      const data = await callEdgeFunction<{ url?: string }>(
        Endpoints.ai.openaiChat,
        {
          type: 'image',
          prompt: basePrompt,
          size: '1792x1024', // Landscape for postcards
          quality: 'hd',
          style: 'natural',
          referenceAnalysis: {
            colorPalette: Object.values(analysis.colorPalette),
            style: analysis.style,
            mood: analysis.mood,
          },
        }
      );

      return data?.url || null;
    } catch (err: any) {
      console.error('[useDesignerAI] Generate from reference error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Clear reference image and revoke preview URL
   */
  const clearReferenceImage = useCallback(() => {
    if (referenceImage.previewUrl) {
      URL.revokeObjectURL(referenceImage.previewUrl);
    }
    setReferenceImage({
      file: null,
      previewUrl: null,
      analysis: null,
      isAnalyzing: false,
      error: null,
    });
  }, [referenceImage.previewUrl]);

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

    // Reference image features
    referenceImage,
    analyzeReferenceImage,
    generateFromReference,
    clearReferenceImage,
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
      const data = await callEdgeFunction<{ message?: string }>(
        Endpoints.ai.openaiChat,
        {
          systemPrompt: getSystemPrompt(options.designerType),
          userPrompt: prompt,
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2048,
        }
      );

      // Edge function returns "message" field, not "content"
      if (!data?.message) {
        throw new Error('No response from AI');
      }

      return data.message;
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
      const data = await callEdgeFunction<{ url?: string }>(
        Endpoints.ai.openaiChat,
        {
          type: 'image',
          prompt,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid',
        }
      );

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

/**
 * useImageGeneration Hook
 * 
 * React hook for generating images using Nano Banana Pro (Gemini 3 Pro Image).
 * Integrates with the designer context and canvas configuration.
 */

import { useState, useCallback } from 'react';
import {
  generateImage,
  generateImageWithRetry,
  GenerateImageOptions,
  GenerateImageResult,
  getAspectRatioFromDimensions,
  getSuggestedResolution,
  isGeminiConfigured,
} from '../services/imageGeneration';
import {
  buildFrontPrompt,
  buildBackPrompt,
  buildBackgroundPrompt,
  PromptContext,
  PromptConfig,
} from '../utils/promptBuilder';

// ============================================================================
// Types
// ============================================================================

export interface UseImageGenerationOptions {
  /** Callback when image generation succeeds */
  onSuccess?: (result: GenerateImageResult) => void;
  /** Callback when image generation fails */
  onError?: (error: Error) => void;
  /** Enable automatic retry on failure */
  enableRetry?: boolean;
  /** Maximum number of retries */
  maxRetries?: number;
}

export interface UseImageGenerationReturn {
  // Core generation function
  generate: (prompt: string, options: Omit<GenerateImageOptions, 'prompt'>) => Promise<void>;
  
  // Convenience methods for different design types
  generateFrontDesign: (context: PromptContext) => Promise<void>;
  generateBackDesign: (context: PromptContext) => Promise<void>;
  generateBackground: (context: PromptContext, style?: string) => Promise<void>;
  
  // State
  isGenerating: boolean;
  error: Error | null;
  result: GenerateImageResult | null;
  progress: number; // 0-100 percentage
  
  // Actions
  reset: () => void;
  cancel: () => void;
  
  // Configuration check
  isConfigured: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for generating images with Nano Banana Pro
 */
export function useImageGeneration(options: UseImageGenerationOptions = {}): UseImageGenerationReturn {
  const {
    onSuccess,
    onError,
    enableRetry = true,
    maxRetries = 2,
  } = options;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<GenerateImageResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [cancelRequested, setCancelRequested] = useState(false);
  
  /**
   * Core generation function
   */
  const generate = useCallback(async (
    prompt: string,
    genOptions: Omit<GenerateImageOptions, 'prompt'>
  ) => {
    // Reset state
    setIsGenerating(true);
    setError(null);
    setProgress(10);
    setCancelRequested(false);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      // Generate image
      const generateFn = enableRetry ? generateImageWithRetry : generateImage;
      const generationResult = await generateFn(
        { prompt, ...genOptions },
        maxRetries
      );
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // Check if cancelled
      if (cancelRequested) {
        setProgress(0);
        return;
      }
      
      // Success
      setProgress(100);
      setResult(generationResult);
      onSuccess?.(generationResult);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Generation failed');
      setError(error);
      onError?.(error);
      setProgress(0);
      
    } finally {
      setIsGenerating(false);
    }
  }, [enableRetry, maxRetries, cancelRequested, onSuccess, onError]);
  
  /**
   * Generate front design with campaign context
   */
  const generateFrontDesign = useCallback(async (context: PromptContext) => {
    // Build prompt config
    const config: PromptConfig = {
      type: 'front',
      orientation: 'landscape', // Default to landscape for postcards
      size: '6x4',
    };
    
    // Build prompt
    const prompt = buildFrontPrompt(context, config);
    
    // Generate
    await generate(prompt, {
      aspectRatio: '3:2',
      resolution: '2K',
      style: 'photorealistic',
    });
  }, [generate]);
  
  /**
   * Generate back design with campaign context
   */
  const generateBackDesign = useCallback(async (context: PromptContext) => {
    const config: PromptConfig = {
      type: 'back',
      orientation: 'landscape',
      size: '6x4',
    };
    
    const prompt = buildBackPrompt(context, config);
    
    await generate(prompt, {
      aspectRatio: '3:2',
      resolution: '2K',
      style: 'minimal',
    });
  }, [generate]);
  
  /**
   * Generate background only (no text)
   */
  const generateBackground = useCallback(async (
    context: PromptContext,
    style: string = 'photorealistic'
  ) => {
    const config: PromptConfig = {
      type: 'background-only',
      orientation: 'landscape',
      size: '6x4',
    };
    
    const prompt = buildBackgroundPrompt(context, config);
    
    await generate(prompt, {
      aspectRatio: '3:2',
      resolution: '2K',
      style: style as any,
    });
  }, [generate]);
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setProgress(0);
    setCancelRequested(false);
  }, []);
  
  /**
   * Cancel ongoing generation
   */
  const cancel = useCallback(() => {
    setCancelRequested(true);
    setIsGenerating(false);
    setProgress(0);
  }, []);
  
  return {
    // Core functions
    generate,
    generateFrontDesign,
    generateBackDesign,
    generateBackground,
    
    // State
    isGenerating,
    error,
    result,
    progress,
    
    // Actions
    reset,
    cancel,
    
    // Config
    isConfigured: isGeminiConfigured(),
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for canvas-aware image generation
 * Automatically determines aspect ratio and resolution from canvas config
 */
export function useCanvasImageGeneration(
  canvasWidth: number,
  canvasHeight: number,
  options: UseImageGenerationOptions = {}
): UseImageGenerationReturn & {
  generateForCanvas: (prompt: string) => Promise<void>;
} {
  const baseHook = useImageGeneration(options);
  
  const generateForCanvas = useCallback(async (prompt: string) => {
    const aspectRatio = getAspectRatioFromDimensions(canvasWidth, canvasHeight);
    const resolution = getSuggestedResolution(canvasWidth);
    
    await baseHook.generate(prompt, {
      aspectRatio,
      resolution,
      style: 'photorealistic',
    });
  }, [baseHook, canvasWidth, canvasHeight]);
  
  return {
    ...baseHook,
    generateForCanvas,
  };
}

/**
 * Hook for batch image generation
 * Generate multiple images in sequence
 */
export function useBatchImageGeneration(options: UseImageGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GenerateImageResult[]>([]);
  const [errors, setErrors] = useState<Error[]>([]);
  
  const generateBatch = useCallback(async (
    prompts: Array<{ prompt: string; options: Omit<GenerateImageOptions, 'prompt'> }>
  ) => {
    setIsGenerating(true);
    setCurrentIndex(0);
    setResults([]);
    setErrors([]);
    
    for (let i = 0; i < prompts.length; i++) {
      setCurrentIndex(i);
      
      try {
        const result = await generateImageWithRetry({
          prompt: prompts[i].prompt,
          ...prompts[i].options,
        });
        
        setResults(prev => [...prev, result]);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Generation failed');
        setErrors(prev => [...prev, error]);
      }
    }
    
    setIsGenerating(false);
  }, []);
  
  return {
    generateBatch,
    isGenerating,
    currentIndex,
    totalCount: 0, // Will be set when generateBatch is called
    results,
    errors,
    progress: 0, // Calculate from currentIndex
  };
}


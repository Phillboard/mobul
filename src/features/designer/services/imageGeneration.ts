/**
 * Nano Banana Pro Image Generation Service
 * 
 * Uses Google's Gemini 3 Pro Image (Nano Banana Pro) model for generating
 * high-quality images with excellent text rendering capabilities.
 * 
 * This service generates backgrounds and design elements for the unified designer.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// Types
// ============================================================================

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio: '3:2' | '2:3' | '1:1' | '16:9' | '9:16';
  resolution: '1K' | '2K' | '4K';
  style?: 'photorealistic' | 'illustrated' | 'minimal';
}

export interface GenerateImageResult {
  imageUrl: string;       // Data URI with base64 image
  width: number;
  height: number;
  generationTime: number; // milliseconds
}

// ============================================================================
// Constants
// ============================================================================

const MODEL_NAME = 'gemini-3-pro-image-preview';

// Base dimensions for different resolutions (width in pixels)
const RESOLUTION_MULTIPLIERS = {
  '1K': 1,
  '2K': 2,
  '4K': 4,
} as const;

const BASE_WIDTH = 1024; // Base width for 1K resolution

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate pixel dimensions based on aspect ratio and resolution
 */
function getWidthForAspectRatio(ratio: string, resolution: string): number {
  const multiplier = RESOLUTION_MULTIPLIERS[resolution as keyof typeof RESOLUTION_MULTIPLIERS] || 1;
  const baseWidth = BASE_WIDTH;
  
  switch (ratio) {
    case '3:2':
      return baseWidth * multiplier;
    case '2:3':
      return Math.round(baseWidth * 0.667 * multiplier);
    case '1:1':
      return baseWidth * multiplier;
    case '16:9':
      return baseWidth * multiplier;
    case '9:16':
      return Math.round(baseWidth * 0.5625 * multiplier);
    default:
      return baseWidth * multiplier;
  }
}

/**
 * Calculate height based on aspect ratio and width
 */
function getHeightForAspectRatio(ratio: string, resolution: string): number {
  const width = getWidthForAspectRatio(ratio, resolution);
  
  switch (ratio) {
    case '3:2':
      return Math.round(width / 1.5);
    case '2:3':
      return Math.round(width * 1.5);
    case '1:1':
      return width;
    case '16:9':
      return Math.round(width / 1.778);
    case '9:16':
      return Math.round(width * 1.778);
    default:
      return width;
  }
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Image Generation
// ============================================================================

/**
 * Get API key from environment or throw error
 */
function getApiKey(): string {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
  }
  return apiKey;
}

/**
 * Initialize Gemini AI client
 */
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = getApiKey();
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate an image using Nano Banana Pro (Gemini 3 Pro Image)
 */
export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const startTime = Date.now();
  
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Build the generation request
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: options.aspectRatio,
          imageSize: options.resolution,
        },
      },
    });
    
    const response = await result.response;
    
    // Extract image from response
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          
          return {
            imageUrl,
            width: getWidthForAspectRatio(options.aspectRatio, options.resolution),
            height: getHeightForAspectRatio(options.aspectRatio, options.resolution),
            generationTime: Date.now() - startTime,
          };
        }
      }
    }
    
    throw new Error('No image generated in response');
  } catch (error: any) {
    console.error('[ImageGeneration] Error:', error);
    throw new Error(error.message || 'Failed to generate image');
  }
}

/**
 * Generate image with automatic retry on failure
 */
export async function generateImageWithRetry(
  options: GenerateImageOptions,
  maxRetries: number = 2
): Promise<GenerateImageResult> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateImage(options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this wasn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const backoffMs = 1000 * Math.pow(2, attempt); // Exponential backoff
        console.log(`[ImageGeneration] Attempt ${attempt + 1} failed, retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
}

/**
 * Get suggested resolution based on canvas size
 */
export function getSuggestedResolution(canvasWidth: number): '1K' | '2K' | '4K' {
  if (canvasWidth >= 3000) return '4K';
  if (canvasWidth >= 1500) return '2K';
  return '1K';
}

/**
 * Get aspect ratio from canvas dimensions
 */
export function getAspectRatioFromDimensions(
  width: number,
  height: number
): '3:2' | '2:3' | '1:1' | '16:9' | '9:16' {
  const ratio = width / height;
  
  if (Math.abs(ratio - 1.5) < 0.1) return '3:2';
  if (Math.abs(ratio - 0.667) < 0.1) return '2:3';
  if (Math.abs(ratio - 1.0) < 0.1) return '1:1';
  if (Math.abs(ratio - 1.778) < 0.1) return '16:9';
  if (Math.abs(ratio - 0.5625) < 0.1) return '9:16';
  
  // Default to closest match
  if (ratio > 1.3) return '3:2';
  if (ratio < 0.8) return '2:3';
  return '1:1';
}


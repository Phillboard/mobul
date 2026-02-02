/**
 * OpenAI Chat Edge Function
 * 
 * Secure server-side proxy for OpenAI API calls.
 * Supports:
 * - GPT-4o for design assistance
 * - DALL-E 3 for image generation
 * - Vision API for image understanding
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  createAICompletion,
  generateImage,
  analyzeImage,
  extractJSON,
  type AIMessage,
} from '../_shared/ai-client.ts';

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  type?: 'chat' | 'image' | 'vision';
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  messages?: Array<{ role: string; content: string }>;
}

interface ImageGenerationRequest {
  type: 'image';
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  referenceAnalysis?: {
    colorPalette: string[];
    style: string;
    mood: string;
  };
  saveToStorage?: boolean;
  userId?: string;
}

interface VisionRequest {
  type: 'vision';
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
}

interface ReferenceAnalysis {
  colorPalette: string[];
  layout: string;
  style: string;
  imagery: string;
  mood: string;
  suitableFor: string[];
}

type OpenAIChatRequest = ChatRequest | ImageGenerationRequest | VisionRequest;

// ============================================================================
// Constants
// ============================================================================

const STORAGE_BUCKET = 'designer-backgrounds';

const SAFETY_PROMPT_SUFFIX = ' This is a background image only. No text, no names, no addresses, no phone numbers, no QR codes, no personal information of any kind.';

const DEFAULT_VISION_PROMPT = `Analyze this postcard/mailer design and describe:
1. COLOR PALETTE: List the main colors used (hex codes if possible)
2. LAYOUT: Describe the composition (where text goes, image placement)
3. STYLE: Modern, vintage, corporate, playful, etc.
4. IMAGERY: What type of images/photos are used
5. MOOD: The emotional feeling of the design
6. SUITABLE FOR: What business types this would work for

DO NOT describe any personalized text like names, addresses, or codes.
Focus only on the design elements that could be replicated.

Return ONLY valid JSON with these keys: colorPalette (array of hex codes), layout (string), style (string), imagery (string), mood (string), suitableFor (array of strings)`;

// ============================================================================
// Storage Helper
// ============================================================================

async function saveToStorage(
  imageUrl: string,
  userId?: string
): Promise<{ permanentUrl: string; storagePath: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[OPENAI-CHAT] Supabase storage not configured');
    return null;
  }

  try {
    const supabase = createServiceClient();

    // Download image from OpenAI
    console.log('[OPENAI-CHAT] Downloading image from OpenAI...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const hash = crypto.randomUUID().slice(0, 8);
    const path = `generated/${userId || 'anonymous'}/${timestamp}_${hash}.png`;

    // Upload to storage
    console.log('[OPENAI-CHAT] Uploading to Supabase:', path);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    console.log('[OPENAI-CHAT] Upload successful:', urlData.publicUrl);

    return {
      permanentUrl: urlData.publicUrl,
      storagePath: path,
    };
  } catch (error) {
    console.error('[OPENAI-CHAT] Storage upload failed:', error);
    return null;
  }
}

// ============================================================================
// Handlers
// ============================================================================

async function handleChat(request: ChatRequest) {
  const messages: AIMessage[] = request.messages?.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  })) || [];

  if (messages.length === 0) {
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.userPrompt });
  }

  console.log('[OPENAI-CHAT] Chat request:', {
    model: request.model || 'gpt-4o',
    messageCount: messages.length,
    temperature: request.temperature,
  });

  const result = await createAICompletion({
    provider: 'openai',
    model: request.model || 'gpt-4o',
    messages,
    temperature: request.temperature ?? 0.7,
    maxTokens: request.maxTokens ?? 2048,
  });

  return {
    message: result.content,
    usage: {
      prompt_tokens: result.usage.promptTokens,
      completion_tokens: result.usage.completionTokens,
      total_tokens: result.usage.totalTokens,
    },
    model: result.model,
  };
}

async function handleImageGeneration(request: ImageGenerationRequest) {
  let enhancedPrompt = request.prompt;

  // Add reference analysis styling if provided
  if (request.referenceAnalysis) {
    const { colorPalette, style, mood } = request.referenceAnalysis;
    const colorList = colorPalette?.join(', ') || 'natural colors';
    enhancedPrompt = `Create a background image matching this style: ${style}, using these colors: ${colorList}, with a ${mood} mood. ${request.prompt}`;
  }

  // Add safety prompt
  enhancedPrompt = enhancedPrompt + SAFETY_PROMPT_SUFFIX;

  console.log('[OPENAI-CHAT] Image generation:', {
    originalPromptLength: request.prompt.length,
    enhancedPromptLength: enhancedPrompt.length,
    hasReferenceAnalysis: !!request.referenceAnalysis,
    size: request.size,
    quality: request.quality,
  });

  const result = await generateImage({
    prompt: enhancedPrompt,
    size: request.size,
    quality: request.quality,
    style: request.style,
  });

  // Save to storage if requested
  let permanentUrl = result.url;
  let storagePath: string | null = null;

  if (request.saveToStorage !== false) {
    const storageResult = await saveToStorage(result.url, request.userId);
    if (storageResult) {
      permanentUrl = storageResult.permanentUrl;
      storagePath = storageResult.storagePath;
    }
  }

  return {
    url: permanentUrl,
    temporaryUrl: result.url,
    storagePath,
    savedToStorage: storagePath !== null,
    revisedPrompt: result.revisedPrompt,
    size: request.size || '1024x1024',
  };
}

async function handleVision(request: VisionRequest) {
  if (!request.imageUrl && !request.imageBase64) {
    throw new ApiError('Either imageUrl or imageBase64 is required', 'VALIDATION_ERROR', 400);
  }

  const analysisPrompt = request.prompt || DEFAULT_VISION_PROMPT;

  console.log('[OPENAI-CHAT] Vision analysis:', {
    hasUrl: !!request.imageUrl,
    hasBase64: !!request.imageBase64,
    customPrompt: !!request.prompt,
  });

  const result = await analyzeImage({
    imageUrl: request.imageUrl,
    imageBase64: request.imageBase64,
    prompt: analysisPrompt,
  });

  // Try to parse as JSON
  let analysis: ReferenceAnalysis | null = null;
  analysis = extractJSON<ReferenceAnalysis>(result.content);

  return {
    analysis,
    rawAnalysis: result.content,
    usage: {
      prompt_tokens: result.usage.promptTokens,
      completion_tokens: result.usage.completionTokens,
      total_tokens: result.usage.totalTokens,
    },
  };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleOpenAIChat(
  request: OpenAIChatRequest,
  _context: AuthContext
): Promise<unknown> {
  const type = (request as { type?: string }).type || 'chat';

  switch (type) {
    case 'chat':
      return await handleChat(request as ChatRequest);
    case 'image':
      return await handleImageGeneration(request as ImageGenerationRequest);
    case 'vision':
      return await handleVision(request as VisionRequest);
    default:
      throw new ApiError(`Unknown request type: ${type}`, 'VALIDATION_ERROR', 400);
  }
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleOpenAIChat, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'openai_chat',
}));

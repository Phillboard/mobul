/**
 * OpenAI Chat Edge Function
 * 
 * Secure server-side proxy for OpenAI API calls.
 * Supports:
 * - GPT-4o for design assistance
 * - DALL-E 3 for image generation
 * - Vision API for image understanding (analyzing reference postcards)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1';

// Supabase configuration for storage
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const STORAGE_BUCKET = 'designer-backgrounds';

// Valid DALL-E 3 sizes for postcards
const VALID_SIZES = ['1024x1024', '1024x1792', '1792x1024'] as const;
type ImageSize = typeof VALID_SIZES[number];

// Max image size for base64 (20MB)
const MAX_BASE64_SIZE = 20 * 1024 * 1024;

// Vision API timeout (30 seconds)
const VISION_TIMEOUT_MS = 30000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  messages?: Array<{ role: string; content: string }>;
}

interface VisionRequest {
  type: 'vision';
  imageUrl?: string;      // Public URL to analyze
  imageBase64?: string;   // Base64 encoded image
  prompt?: string;        // Optional custom analysis prompt
}

interface ReferenceAnalysis {
  colorPalette: string[];
  layout: string;
  style: string;
  imagery: string;
  mood: string;
  suitableFor: string[];
}

interface ImageGenerationRequest {
  prompt: string;
  size?: ImageSize;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  referenceAnalysis?: {
    colorPalette: string[];
    style: string;
    mood: string;
  };
  saveToStorage?: boolean;  // Whether to save to Supabase storage
  userId?: string;          // For organizing storage paths
}

// Safety prompt appended to ALL DALL-E generations
const SAFETY_PROMPT_SUFFIX = ' This is a background image only. No text, no names, no addresses, no phone numbers, no QR codes, no personal information of any kind.';

// Default vision analysis prompt
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured in Supabase secrets');
    }

    const { type = 'chat', ...payload } = await req.json();

    // Route to appropriate handler
    if (type === 'chat') {
      return await handleChat(payload as ChatRequest);
    } else if (type === 'image') {
      return await handleImageGeneration(payload as ImageGenerationRequest);
    } else if (type === 'vision') {
      return await handleVision(payload as VisionRequest);
    } else {
      throw new Error(`Unknown request type: ${type}. Valid types: chat, image, vision`);
    }
  } catch (error) {
    console.error('OpenAI Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Handle chat completion
 */
async function handleChat(request: ChatRequest) {
  const {
    systemPrompt,
    userPrompt,
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 2048,
    messages: existingMessages,
  } = request;

  // Build messages array
  const messages = existingMessages || [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: userPrompt },
  ];

  console.log('[OpenAI] Chat request:', {
    model,
    messageCount: messages.length,
    temperature,
  });

  // Call OpenAI API
  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[OpenAI] API Error:', errorData);
    throw new Error(errorData.error?.message || 'OpenAI API request failed');
  }

  const data = await response.json();
  const assistantMessage = data.choices[0]?.message?.content;

  if (!assistantMessage) {
    throw new Error('No response from OpenAI');
  }

  console.log('[OpenAI] Response received:', {
    tokens: data.usage,
    length: assistantMessage.length,
  });

  return new Response(
    JSON.stringify({
      message: assistantMessage,
      usage: data.usage,
      model: data.model,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Save generated image to Supabase Storage
 * 
 * Downloads the image from OpenAI's temporary URL and uploads
 * to Supabase storage for permanent access.
 */
async function saveToStorage(
  imageUrl: string,
  userId?: string
): Promise<{ permanentUrl: string; storagePath: string } | null> {
  // Check if Supabase storage is configured
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Storage] Supabase storage not configured, skipping upload');
    return null;
  }

  try {
    // Create Supabase client with service role key for storage operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch image from OpenAI's temporary URL
    console.log('[Storage] Downloading image from OpenAI...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    const blob = await response.blob();

    // 2. Generate unique filename
    const timestamp = Date.now();
    const hash = crypto.randomUUID().slice(0, 8);
    const path = `generated/${userId || 'anonymous'}/${timestamp}_${hash}.png`;

    // 3. Upload to Supabase Storage
    console.log('[Storage] Uploading to Supabase:', path);
    const { data, error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // 4. Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    console.log('[Storage] Upload successful:', urlData.publicUrl);

    return {
      permanentUrl: urlData.publicUrl,
      storagePath: path,
    };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    return null;
  }
}

/**
 * Handle image generation with DALL-E 3
 * 
 * Supports:
 * - Multiple postcard sizes (1024x1024, 1024x1792, 1792x1024)
 * - Reference-based generation using vision analysis
 * - Automatic safety prompt injection to prevent personal info
 * - Optional storage to Supabase for permanent URLs
 */
async function handleImageGeneration(request: ImageGenerationRequest) {
  const {
    prompt,
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    referenceAnalysis,
    saveToStorage: shouldSave = true,  // Default to saving
    userId,
  } = request;

  // Validate size
  if (!VALID_SIZES.includes(size as ImageSize)) {
    throw new Error(`Invalid size "${size}". Valid sizes: ${VALID_SIZES.join(', ')}`);
  }

  // Build enhanced prompt
  let enhancedPrompt = prompt;

  // If reference analysis provided, prepend style guidance
  if (referenceAnalysis) {
    const { colorPalette, style: refStyle, mood } = referenceAnalysis;
    const colorList = colorPalette?.join(', ') || 'natural colors';
    enhancedPrompt = `Create a background image matching this style: ${refStyle}, using these colors: ${colorList}, with a ${mood} mood. ${prompt}`;
  }

  // CRITICAL: Always append safety prompt to prevent personal info in images
  enhancedPrompt = enhancedPrompt + SAFETY_PROMPT_SUFFIX;

  console.log('[OpenAI] Image generation request:', {
    originalPromptLength: prompt.length,
    enhancedPromptLength: enhancedPrompt.length,
    hasReferenceAnalysis: !!referenceAnalysis,
    shouldSave,
    size,
    quality,
    style,
  });

  // Call DALL-E 3 API
  const response = await fetch(`${OPENAI_API_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size,
      quality,
      style,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[OpenAI] Image API Error:', errorData);
    throw new Error(errorData.error?.message || 'DALL-E API request failed');
  }

  const data = await response.json();
  const openaiImageUrl = data.data[0]?.url;

  if (!openaiImageUrl) {
    throw new Error('No image URL in response');
  }

  console.log('[OpenAI] Image generated successfully:', {
    size,
    hasRevisedPrompt: !!data.data[0]?.revised_prompt,
  });

  // Try to save to Supabase Storage for permanent URL
  let permanentUrl = openaiImageUrl;
  let storagePath: string | null = null;

  if (shouldSave) {
    const storageResult = await saveToStorage(openaiImageUrl, userId);
    if (storageResult) {
      permanentUrl = storageResult.permanentUrl;
      storagePath = storageResult.storagePath;
    }
  }

  return new Response(
    JSON.stringify({
      url: permanentUrl,                          // Permanent Supabase URL (or OpenAI fallback)
      temporaryUrl: openaiImageUrl,               // Keep original for debugging
      storagePath,                                // Path in storage bucket
      savedToStorage: storagePath !== null,       // Whether save was successful
      revisedPrompt: data.data[0]?.revised_prompt,
      size,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Handle Vision API for analyzing reference postcards/images
 * 
 * Analyzes uploaded images to extract:
 * - Color palette (hex codes)
 * - Layout composition
 * - Design style
 * - Imagery type
 * - Mood/feeling
 * - Suitable business types
 */
async function handleVision(request: VisionRequest): Promise<Response> {
  const { imageUrl, imageBase64, prompt } = request;

  // Validate input - need either URL or base64
  if (!imageUrl && !imageBase64) {
    throw new Error('Either imageUrl or imageBase64 is required for vision analysis');
  }

  // Check base64 size if provided
  if (imageBase64) {
    const sizeInBytes = (imageBase64.length * 3) / 4; // Approximate decoded size
    if (sizeInBytes > MAX_BASE64_SIZE) {
      throw new Error(`Image too large. Maximum size is 20MB. Your image is approximately ${Math.round(sizeInBytes / 1024 / 1024)}MB`);
    }
  }

  // Build the image content for GPT-4o
  let imageContent: { type: 'image_url'; image_url: { url: string; detail?: string } };
  
  if (imageUrl) {
    imageContent = {
      type: 'image_url',
      image_url: { url: imageUrl, detail: 'high' },
    };
  } else {
    // Validate base64 format
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Regex.test(imageBase64!)) {
      // If raw base64 without prefix, add it (assume JPEG)
      const formattedBase64 = imageBase64!.startsWith('data:') 
        ? imageBase64! 
        : `data:image/jpeg;base64,${imageBase64}`;
      imageContent = {
        type: 'image_url',
        image_url: { url: formattedBase64, detail: 'high' },
      };
    } else {
      imageContent = {
        type: 'image_url',
        image_url: { url: imageBase64!, detail: 'high' },
      };
    }
  }

  const analysisPrompt = prompt || DEFAULT_VISION_PROMPT;

  console.log('[OpenAI] Vision analysis request:', {
    hasUrl: !!imageUrl,
    hasBase64: !!imageBase64,
    customPrompt: !!prompt,
  });

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    // Call GPT-4o with vision capability
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              imageContent,
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[OpenAI] Vision API Error:', errorData);
      throw new Error(errorData.error?.message || 'Vision API request failed');
    }

    const data = await response.json();
    const analysisText = data.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis returned from Vision API');
    }

    console.log('[OpenAI] Vision analysis completed:', {
      tokens: data.usage,
      responseLength: analysisText.length,
    });

    // Try to parse as JSON for structured response
    let analysis: ReferenceAnalysis | null = null;
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]) as ReferenceAnalysis;
      }
    } catch (parseError) {
      console.warn('[OpenAI] Could not parse analysis as JSON, returning raw text');
    }

    return new Response(
      JSON.stringify({
        analysis,
        rawAnalysis: analysisText,
        usage: data.usage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Vision analysis timed out after ${VISION_TIMEOUT_MS / 1000} seconds. Try with a smaller image.`);
    }
    throw error;
  }
}


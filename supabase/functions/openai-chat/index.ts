/**
 * OpenAI Chat Edge Function
 * 
 * Secure server-side proxy for OpenAI API calls.
 * Supports:
 * - GPT-4o for design assistance
 * - DALL-E 3 for image generation
 * - Vision API for image understanding
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1';

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

interface ImageGenerationRequest {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

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
    } else {
      throw new Error(`Unknown request type: ${type}`);
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
 * Handle image generation with DALL-E 3
 */
async function handleImageGeneration(request: ImageGenerationRequest) {
  const {
    prompt,
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
  } = request;

  console.log('[OpenAI] Image generation request:', {
    promptLength: prompt.length,
    size,
    quality,
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
      prompt,
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
  const imageUrl = data.data[0]?.url;

  if (!imageUrl) {
    throw new Error('No image URL in response');
  }

  console.log('[OpenAI] Image generated successfully');

  return new Response(
    JSON.stringify({
      url: imageUrl,
      revisedPrompt: data.data[0]?.revised_prompt,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}


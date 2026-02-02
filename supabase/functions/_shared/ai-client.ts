/**
 * AI Client
 * 
 * Unified client for AI completions supporting multiple providers:
 * - OpenAI (GPT-4, DALL-E, Vision)
 * - Anthropic Claude
 * - Google Gemini
 * - Lovable AI Gateway (for Gemini with streaming)
 */

// ============================================================================
// Types
// ============================================================================

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'lovable';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | AIMultimodalContent[];
}

export interface AIMultimodalContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface AICompletionParams {
  provider?: AIProvider;
  model?: string;
  systemPrompt?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: 'text' | 'json';
  tools?: AITool[];
  toolChoice?: { type: 'function'; function: { name: string } } | 'auto' | 'none';
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AICompletionResult {
  content: string;
  toolCalls?: AIToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AIImageGenerationParams {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

export interface AIImageResult {
  url: string;
  revisedPrompt?: string;
}

export interface AIVisionParams {
  imageUrl?: string;
  imageBase64?: string;
  prompt: string;
  detail?: 'low' | 'high' | 'auto';
}

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const LOVABLE_API_URL = 'https://ai.gateway.lovable.dev/v1';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-opus-20240229',
  gemini: 'gemini-2.5-pro',
  lovable: 'google/gemini-2.5-flash',
};

const DEFAULT_MAX_TOKENS: Record<AIProvider, number> = {
  openai: 4096,
  anthropic: 4096,
  gemini: 8192,
  lovable: 4096,
};

// ============================================================================
// API Key Helpers
// ============================================================================

function getApiKey(provider: AIProvider): string {
  let key: string | undefined;

  switch (provider) {
    case 'openai':
      key = Deno.env.get('OPENAI_API_KEY');
      break;
    case 'anthropic':
      key = Deno.env.get('ANTHROPIC_API_KEY');
      break;
    case 'gemini':
      key = Deno.env.get('GEMINI_API_KEY');
      break;
    case 'lovable':
      key = Deno.env.get('LOVABLE_API_KEY');
      break;
  }

  if (!key) {
    throw new Error(`${provider.toUpperCase()} API key not configured`);
  }

  return key;
}

// ============================================================================
// OpenAI Client
// ============================================================================

async function openaiCompletion(params: AICompletionParams): Promise<AICompletionResult> {
  const apiKey = getApiKey('openai');
  const model = params.model || DEFAULT_MODELS.openai;

  // Build messages array
  const messages: Array<{ role: string; content: unknown }> = [];

  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }

  for (const msg of params.messages) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
    } else {
      // Multimodal content
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS.openai,
  };

  if (params.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
    if (params.toolChoice) {
      body.tool_choice = params.toolChoice;
    }
  }

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices[0];

  const result: AICompletionResult = {
    content: choice.message.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    model: data.model,
    provider: 'openai',
  };

  if (choice.message.tool_calls) {
    result.toolCalls = choice.message.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));
  }

  return result;
}

// ============================================================================
// Anthropic Client
// ============================================================================

async function anthropicCompletion(params: AICompletionParams): Promise<AICompletionResult> {
  const apiKey = getApiKey('anthropic');
  const model = params.model || DEFAULT_MODELS.anthropic;

  // Build messages (Anthropic doesn't have system role in messages)
  const messages: Array<{ role: string; content: unknown }> = [];

  for (const msg of params.messages) {
    if (msg.role !== 'system') {
      if (typeof msg.content === 'string') {
        messages.push({ role: msg.role, content: msg.content });
      } else {
        // Convert multimodal format for Anthropic
        const content = msg.content.map(c => {
          if (c.type === 'text') {
            return { type: 'text', text: c.text };
          } else if (c.type === 'image_url' && c.image_url) {
            // Anthropic expects base64 format
            const url = c.image_url.url;
            if (url.startsWith('data:')) {
              const [, base64] = url.split(',');
              const mediaType = url.match(/data:(.*?);/)?.[1] || 'image/jpeg';
              return {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              };
            }
            // For URLs, we'd need to fetch and convert - skip for now
            return { type: 'text', text: `[Image URL: ${url}]` };
          }
          return c;
        });
        messages.push({ role: msg.role, content });
      }
    }
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS.anthropic,
    messages,
  };

  if (params.systemPrompt) {
    body.system = params.systemPrompt;
  }

  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const response = await fetch(`${ANTHROPIC_API_URL}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${errorText}`);
  }

  const data = await response.json();

  const result: AICompletionResult = {
    content: data.content[0]?.text || '',
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    model: data.model,
    provider: 'anthropic',
  };

  // Check for tool use
  const toolUse = data.content.find((c: { type: string }) => c.type === 'tool_use');
  if (toolUse) {
    result.toolCalls = [{
      id: toolUse.id,
      name: toolUse.name,
      arguments: JSON.stringify(toolUse.input),
    }];
  }

  return result;
}

// ============================================================================
// Gemini Client
// ============================================================================

async function geminiCompletion(params: AICompletionParams): Promise<AICompletionResult> {
  const apiKey = getApiKey('gemini');
  const model = params.model || DEFAULT_MODELS.gemini;

  // Build contents array
  const contents: Array<{ parts: Array<{ text: string }> }> = [];

  // Combine system prompt with first message if needed
  let systemText = params.systemPrompt || '';

  for (const msg of params.messages) {
    if (typeof msg.content === 'string') {
      const text = msg.role === 'system' ? '' : msg.content;
      if (msg.role === 'system') {
        systemText = systemText ? `${systemText}\n\n${msg.content}` : msg.content;
      } else {
        contents.push({ parts: [{ text }] });
      }
    }
  }

  // Add system prompt to first user message
  if (systemText && contents.length > 0) {
    contents[0].parts[0].text = `${systemText}\n\nUser Request: ${contents[0].parts[0].text}`;
  }

  const body = {
    contents,
    generationConfig: {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxTokens ?? DEFAULT_MAX_TOKENS.gemini,
    },
  };

  const response = await fetch(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    content,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    model,
    provider: 'gemini',
  };
}

// ============================================================================
// Lovable Gateway Client
// ============================================================================

async function lovableCompletion(params: AICompletionParams): Promise<AICompletionResult> {
  const apiKey = getApiKey('lovable');
  const model = params.model || DEFAULT_MODELS.lovable;

  // Build messages array (same format as OpenAI)
  const messages: Array<{ role: string; content: string }> = [];

  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }

  for (const msg of params.messages) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: params.temperature ?? 0.7,
  };

  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
    if (params.toolChoice) {
      body.tool_choice = params.toolChoice;
    }
  }

  const response = await fetch(`${LOVABLE_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits.');
    }
    const errorText = await response.text();
    throw new Error(`Lovable Gateway error: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices[0];

  const result: AICompletionResult = {
    content: choice.message.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    model: data.model || model,
    provider: 'lovable',
  };

  if (choice.message.tool_calls) {
    result.toolCalls = choice.message.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));
  }

  return result;
}

// ============================================================================
// Streaming Client (Lovable/OpenAI compatible)
// ============================================================================

export async function createStreamingCompletion(
  params: AICompletionParams
): Promise<Response> {
  const provider = params.provider || 'lovable';
  const apiKey = getApiKey(provider);
  const model = params.model || DEFAULT_MODELS[provider];

  const messages: Array<{ role: string; content: string }> = [];

  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }

  for (const msg of params.messages) {
    if (typeof msg.content === 'string') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  const url = provider === 'openai'
    ? `${OPENAI_API_URL}/chat/completions`
    : `${LOVABLE_API_URL}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: params.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    if (response.status === 402) {
      throw new Error('Payment required');
    }
    throw new Error(`Streaming error: ${response.status}`);
  }

  return response;
}

// ============================================================================
// Main Completion Function
// ============================================================================

export async function createAICompletion(
  params: AICompletionParams
): Promise<AICompletionResult> {
  const provider = params.provider || 'openai';

  console.log(`[AI-CLIENT] Creating completion with ${provider}`, {
    model: params.model || DEFAULT_MODELS[provider],
    messageCount: params.messages.length,
    hasSystemPrompt: !!params.systemPrompt,
    hasTools: !!(params.tools && params.tools.length > 0),
  });

  switch (provider) {
    case 'openai':
      return await openaiCompletion(params);
    case 'anthropic':
      return await anthropicCompletion(params);
    case 'gemini':
      return await geminiCompletion(params);
    case 'lovable':
      return await lovableCompletion(params);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ============================================================================
// Image Generation (OpenAI DALL-E)
// ============================================================================

export async function generateImage(params: AIImageGenerationParams): Promise<AIImageResult> {
  const apiKey = getApiKey('openai');

  console.log('[AI-CLIENT] Generating image', {
    promptLength: params.prompt.length,
    size: params.size,
    quality: params.quality,
    style: params.style,
  });

  const response = await fetch(`${OPENAI_API_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: params.prompt,
      n: 1,
      size: params.size || '1024x1024',
      quality: params.quality || 'standard',
      style: params.style || 'vivid',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(errorData.error?.message || `DALL-E API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    url: data.data[0]?.url || '',
    revisedPrompt: data.data[0]?.revised_prompt,
  };
}

// ============================================================================
// Vision Analysis (OpenAI GPT-4V)
// ============================================================================

export async function analyzeImage(params: AIVisionParams): Promise<AICompletionResult> {
  if (!params.imageUrl && !params.imageBase64) {
    throw new Error('Either imageUrl or imageBase64 is required');
  }

  let imageContent: AIMultimodalContent;

  if (params.imageUrl) {
    imageContent = {
      type: 'image_url',
      image_url: { url: params.imageUrl, detail: params.detail || 'high' },
    };
  } else {
    // Handle base64
    let base64 = params.imageBase64!;
    if (!base64.startsWith('data:')) {
      base64 = `data:image/jpeg;base64,${base64}`;
    }
    imageContent = {
      type: 'image_url',
      image_url: { url: base64, detail: params.detail || 'high' },
    };
  }

  return await createAICompletion({
    provider: 'openai',
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: params.prompt },
        imageContent,
      ],
    }],
    maxTokens: 1024,
    temperature: 0.3,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
export function extractJSON<T = unknown>(content: string): T | null {
  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Try to extract from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find JSON object
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Give up
      }
    }

    return null;
  }
}

/**
 * Extract HTML from AI response (handles markdown code blocks)
 */
export function extractHTML(content: string): string {
  let html = content;

  if (html.includes('```html')) {
    html = html.split('```html')[1].split('```')[0].trim();
  } else if (html.includes('```')) {
    html = html.split('```')[1].split('```')[0].trim();
  }

  return html;
}

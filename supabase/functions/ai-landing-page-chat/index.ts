import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  landingPageId: string;
  message: string;
  currentHtml: string;
  provider?: 'openai' | 'anthropic';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { landingPageId, message, currentHtml, provider = 'openai' }: ChatRequest = await req.json();

    console.log('AI Landing Page Chat:', {
      user: user.id,
      landingPageId,
      provider,
      messageLength: message.length,
    });

    // Get or create chat session
    let chatSession = await getOrCreateChatSession(supabase, landingPageId, user.id, provider);

    // Generate response
    const result = provider === 'openai'
      ? await chatWithOpenAI(message, currentHtml, chatSession.messages)
      : await chatWithAnthropic(message, currentHtml, chatSession.messages);

    // Update chat history
    const updatedMessages = [
      ...chatSession.messages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: result.explanation, timestamp: new Date().toISOString() },
    ];

    await supabase
      .from('landing_page_ai_chats')
      .update({
        messages: updatedMessages,
        total_tokens: chatSession.total_tokens + result.tokensUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatSession.id);

    // Update landing page tokens
    await supabase.rpc('increment_landing_page_tokens', {
      page_id: landingPageId,
      tokens_used: result.tokensUsed,
    });

    return new Response(
      JSON.stringify({
        success: true,
        updatedHtml: result.updatedHtml,
        explanation: result.explanation,
        changesMade: result.changesMade,
        tokensUsed: result.tokensUsed,
        provider,
        model: result.model,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process chat message' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Get or create chat session
 */
async function getOrCreateChatSession(supabase: any, landingPageId: string, userId: string, provider: string) {
  // Try to get existing session
  const { data: existing } = await supabase
    .from('landing_page_ai_chats')
    .select('*')
    .eq('landing_page_id', landingPageId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return existing;
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from('landing_page_ai_chats')
    .insert({
      landing_page_id: landingPageId,
      user_id: userId,
      provider,
      messages: [],
      total_tokens: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create chat session');
  }

  return newSession;
}

/**
 * Chat with OpenAI
 */
async function chatWithOpenAI(userMessage: string, currentHtml: string, chatHistory: any[]) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = `You are a helpful web design assistant helping users refine their landing page.

RULES:
1. Maintain the overall structure and design unless specifically asked to change it
2. Make changes that improve conversion and user experience
3. Ensure all changes maintain accessibility (WCAG 2.1 AA)
4. Keep the design mobile-responsive
5. Use Tailwind CSS classes for all styling
6. Output the COMPLETE updated HTML, not just the changes

CURRENT HTML:
\`\`\`html
${currentHtml}
\`\`\`

Respond with a JSON object containing:
{
  "updatedHtml": "complete updated HTML",
  "explanation": "friendly explanation of changes",
  "changesMade": ["list", "of", "specific", "changes"]
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-5).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  const tokensUsed = data.usage.total_tokens;

  return {
    updatedHtml: result.updatedHtml || currentHtml,
    explanation: result.explanation || 'Changes applied',
    changesMade: result.changesMade || [],
    tokensUsed,
    model: 'gpt-4-turbo-preview',
  };
}

/**
 * Chat with Anthropic Claude
 */
async function chatWithAnthropic(userMessage: string, currentHtml: string, chatHistory: any[]) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const systemPrompt = `You are a helpful web design assistant. The user is refining their landing page design.

CURRENT HTML:
\`\`\`html
${currentHtml}
\`\`\`

RULES:
- Maintain structure unless specifically asked to change it
- Ensure accessibility (WCAG 2.1 AA)
- Keep mobile-responsive with Tailwind CSS
- Output COMPLETE updated HTML

Respond with JSON:
{
  "updatedHtml": "complete HTML",
  "explanation": "what you changed",
  "changesMade": ["specific changes"]
}`;

  const messages = [
    ...chatHistory.slice(-5).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

  // Try to parse JSON response
  let result;
  try {
    // Find JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    // Fallback: use the content as explanation
    result = {
      updatedHtml: currentHtml,
      explanation: content,
      changesMade: ['See explanation for details'],
    };
  }

  return {
    updatedHtml: result.updatedHtml || currentHtml,
    explanation: result.explanation || content,
    changesMade: result.changesMade || [],
    tokensUsed,
    model: 'claude-3-opus-20240229',
  };
}


/**
 * AI Landing Page Chat Edge Function
 * 
 * Chat interface for refining landing page designs.
 * Maintains chat history and tracks token usage.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createAICompletion, extractJSON, type AIProvider } from '../_shared/ai-client.ts';

// ============================================================================
// Types
// ============================================================================

interface LandingPageChatRequest {
  landingPageId: string;
  message: string;
  currentHtml: string;
  provider?: AIProvider;
}

interface LandingPageChatResponse {
  updatedHtml: string;
  explanation: string;
  changesMade: string[];
  tokensUsed: number;
  provider: AIProvider;
  model: string;
}

interface ChatSession {
  id: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  total_tokens: number;
}

// ============================================================================
// System Prompts
// ============================================================================

function buildSystemPrompt(currentHtml: string): string {
  return `You are a helpful web design assistant helping users refine their landing page.

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
}

// ============================================================================
// Chat Session Management
// ============================================================================

async function getOrCreateChatSession(
  supabase: ReturnType<typeof createServiceClient>,
  landingPageId: string,
  userId: string,
  provider: string
): Promise<ChatSession> {
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
    return existing as ChatSession;
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
    throw new ApiError('Failed to create chat session', 'DATABASE_ERROR', 500);
  }

  return newSession as ChatSession;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleLandingPageChat(
  request: LandingPageChatRequest,
  context: AuthContext
): Promise<LandingPageChatResponse> {
  const supabase = createServiceClient();
  const provider = request.provider || 'openai';

  console.log('[AI-LP-CHAT] Request:', {
    landingPageId: request.landingPageId,
    provider,
    messageLength: request.message.length,
  });

  // Get or create chat session
  const chatSession = await getOrCreateChatSession(
    supabase,
    request.landingPageId,
    context.user.id,
    provider
  );

  const systemPrompt = buildSystemPrompt(request.currentHtml);

  // Build messages with history
  const messages = chatSession.messages.slice(-5).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  messages.push({
    role: 'user' as const,
    content: request.message,
  });

  // Generate response
  const result = await createAICompletion({
    provider,
    systemPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 4000,
    responseFormat: provider === 'openai' ? 'json' : 'text',
  });

  // Parse response
  let parsedResult = extractJSON<{
    updatedHtml: string;
    explanation: string;
    changesMade: string[];
  }>(result.content);

  if (!parsedResult) {
    // Fallback if JSON parsing fails
    parsedResult = {
      updatedHtml: request.currentHtml,
      explanation: result.content,
      changesMade: ['See explanation for details'],
    };
  }

  // Update chat history
  const updatedMessages = [
    ...chatSession.messages,
    { role: 'user', content: request.message, timestamp: new Date().toISOString() },
    { role: 'assistant', content: parsedResult.explanation, timestamp: new Date().toISOString() },
  ];

  await supabase
    .from('landing_page_ai_chats')
    .update({
      messages: updatedMessages,
      total_tokens: chatSession.total_tokens + result.usage.totalTokens,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chatSession.id);

  // Update landing page tokens
  await supabase.rpc('increment_landing_page_tokens', {
    page_id: request.landingPageId,
    tokens_used: result.usage.totalTokens,
  }).catch(() => {
    // Ignore if RPC doesn't exist
  });

  console.log('[AI-LP-CHAT] Response generated:', {
    changesCount: parsedResult.changesMade?.length || 0,
    tokensUsed: result.usage.totalTokens,
  });

  return {
    updatedHtml: parsedResult.updatedHtml || request.currentHtml,
    explanation: parsedResult.explanation || 'Changes applied',
    changesMade: parsedResult.changesMade || [],
    tokensUsed: result.usage.totalTokens,
    provider,
    model: result.model,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleLandingPageChat, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'ai_landing_page_chat',
}));

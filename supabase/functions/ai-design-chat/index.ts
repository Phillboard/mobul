/**
 * AI Design Chat Edge Function
 * 
 * Helps users refine their design through conversation.
 * Uses tool calling to return structured design updates.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createAICompletion, type AITool } from '../_shared/ai-client.ts';

// ============================================================================
// Types
// ============================================================================

interface AIDesignChatRequest {
  designType: 'landing_page' | 'print';
  designId: string;
  currentHtml: string;
  userMessage: string;
  chatHistory: Array<{ role: string; content: string }>;
}

interface AIDesignChatResponse {
  message: string;
  updatedHtml: string;
  changesMade: string[];
}

// ============================================================================
// System Prompt Builder
// ============================================================================

function buildSystemPrompt(designType: 'landing_page' | 'print'): string {
  const basePrompt = `You are an expert ${designType === 'landing_page' ? 'web' : 'print'} designer helping users refine their design through conversation.

CURRENT DESIGN TYPE: ${designType === 'landing_page' ? 'Landing Page (Web)' : 'Print Mailer (Postcard)'}

YOUR CAPABILITIES:
- Modify HTML/CSS to improve design
- Adjust colors, typography, spacing, layout
- Add/remove/reorganize content sections
- Optimize for ${designType === 'landing_page' ? 'conversions and SEO' : 'print quality and readability'}
${designType === 'landing_page' ? '- Ensure mobile responsiveness' : '- Maintain print specifications (DPI, CMYK, bleed)'}`;

  const designPrinciples = designType === 'landing_page'
    ? `
DESIGN PRINCIPLES TO FOLLOW:
1. Clear visual hierarchy with compelling headlines
2. Strong call-to-action that stands out
3. Social proof (testimonials, reviews)
4. Mobile-first responsive design
5. Fast loading (inline styles, optimized images)
6. Accessibility (semantic HTML, ARIA labels)`
    : `
DESIGN PRINCIPLES TO FOLLOW:
1. High-contrast, readable typography (min 16pt body text)
2. Print-safe colors (avoid pure black, use rich black)
3. Bleed zone considerations (0.125" extension)
4. Safe zone for critical content (0.25" from trim)
5. CMYK color mode for accurate printing
6. 300 DPI for images and graphics`;

  const constraints = designType === 'landing_page'
    ? `
CONSTRAINTS:
- Keep all styles inline (no external CSS)
- Maintain required IDs: #redemption-form, #gift-card-code, #submit-button
- Use semantic HTML (section, article, header, footer, etc.)
- Use HSL colors with CSS variables when possible`
    : `
CONSTRAINTS:
- All styles must be inline
- Fixed canvas dimensions based on postcard size
- No interactive elements (no forms, no JavaScript)
- Consider print bleed and safe zones
- Use print-safe fonts and colors`;

  return `${basePrompt}
${designPrinciples}

RESPONSE FORMAT:
Always respond with a tool call using the "update_design" function.
Provide clear explanations of what you changed and why.
Be conversational and helpful.
${constraints}`;
}

// ============================================================================
// Tool Definition
// ============================================================================

const UPDATE_DESIGN_TOOL: AITool = {
  type: 'function',
  function: {
    name: 'update_design',
    description: 'Update the HTML design based on user request',
    parameters: {
      type: 'object',
      properties: {
        updatedHtml: {
          type: 'string',
          description: 'The complete updated HTML with all changes applied',
        },
        explanation: {
          type: 'string',
          description: 'Clear explanation of what was changed and why (user-friendly language)',
        },
        changesMade: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific changes made',
        },
      },
      required: ['updatedHtml', 'explanation', 'changesMade'],
    },
  },
};

// ============================================================================
// Main Handler
// ============================================================================

async function handleAIDesignChat(
  request: AIDesignChatRequest,
  _context: AuthContext
): Promise<AIDesignChatResponse> {
  const { designType, currentHtml, userMessage, chatHistory } = request;

  console.log('[AI-DESIGN-CHAT] Request:', {
    designType,
    designId: request.designId,
    messageLength: userMessage.length,
  });

  const systemPrompt = buildSystemPrompt(designType);

  // Build messages with chat history
  const messages = chatHistory.slice(-10).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  // Add current request with HTML context
  messages.push({
    role: 'user' as const,
    content: `Current HTML design:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nUser request: ${userMessage}`,
  });

  const result = await createAICompletion({
    provider: 'lovable',
    model: 'google/gemini-2.5-flash',
    systemPrompt,
    messages,
    tools: [UPDATE_DESIGN_TOOL],
    toolChoice: { type: 'function', function: { name: 'update_design' } },
  });

  // Extract tool call result
  if (!result.toolCalls || result.toolCalls.length === 0) {
    throw new ApiError('No tool call in AI response', 'AI_ERROR', 500);
  }

  const toolCall = result.toolCalls[0];
  const { updatedHtml, explanation, changesMade } = JSON.parse(toolCall.arguments);

  // Validate HTML for design type
  if (designType === 'landing_page') {
    if (!updatedHtml.includes('id="redemption-form"')) {
      console.warn('[AI-DESIGN-CHAT] Missing redemption-form ID');
    }
  } else {
    if (updatedHtml.includes('<script')) {
      throw new ApiError('Print designs cannot contain JavaScript', 'VALIDATION_ERROR', 400);
    }
  }

  console.log('[AI-DESIGN-CHAT] Response generated:', {
    changesCount: changesMade?.length || 0,
    tokensUsed: result.usage.totalTokens,
  });

  return {
    message: explanation,
    updatedHtml,
    changesMade: changesMade || [],
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleAIDesignChat, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'ai_design_chat',
}));

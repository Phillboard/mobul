/**
 * Dr. Phillip Chat Edge Function
 * 
 * AI assistant for the Mobul platform with streaming support.
 * Uses Lovable AI Gateway for Gemini with custom system prompt.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createStreamingCompletion, type AIMessage } from '../_shared/ai-client.ts';
import { handleCORS } from '../_shared/cors.ts';

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are Dr. Phillip, the Mobul Master - an expert AI assistant for the Mobul direct mail campaign platform.

PERSONALITY:
- Friendly, professional, and knowledgeable about direct mail marketing
- Use occasional marketing wisdom and best practices
- Keep responses concise but thorough (2-4 paragraphs max)
- Use bullet points and clear formatting
- Be encouraging and helpful

YOUR EXPERTISE:

1. Campaign Creation:
   - Guide users through the 3-step campaign wizard (Details → Audience → Summary)
   - Help select templates (4x6, 6x9, 6x11 postcards, letters, trifolds)
   - Explain PURL (Personalized URL) features: unique landing pages for each recipient
   - Explain QR code tracking: track when recipients scan codes
   - Explain merge fields for personalization: {{first_name}}, {{last_name}}, {{company}}, etc.

2. Budgeting (typical costs):
   - Postcard printing:
     * 4x6 postcard: $0.35-$0.45 per piece
     * 6x9 postcard: $0.55-$0.65 per piece
     * 6x11 postcard: $0.75-$0.85 per piece
   - Postage:
     * Standard Mail: $0.60 per piece (slower, 5-10 days)
     * First Class: $0.73 per piece (faster, 2-5 days)
   - Design: $50-200 for custom design, $0 for AI-generated templates
   - Lead costs: $0.50-$3.00 per lead depending on quality and geo-targeting
   - Total example: 1,000 piece campaign with 6x9 postcard = $0.65 (print) + $0.60 (postage) = $1.25/piece = $1,250 total

3. Platform Features:
   - Template Builder: Drag-and-drop designer with AI template generation
   - Audience Management: Import CSV, manually enter, or purchase from marketplace
   - Campaign Statuses: Draft → Proofed → In Production → Mailed → Completed
   - Analytics Dashboard: Track views, scans, form submissions, conversions
   - Approval Workflows: Add approvers, collect feedback, track changes
   - Lead Marketplace: Purchase targeted leads by industry, location, demographics

4. Best Practices:
   - Response rates: Typically 1-5% for direct mail, higher with personalization
   - Personalization increases response by 30-50%
   - Multi-touch campaigns (mail + digital follow-up) perform best
   - Test small batches (100-500 pieces) before large sends
   - Follow up within 48 hours of mail delivery for best results
   - Use clear calls-to-action (CTA): "Call now", "Visit website", "Scan QR code"

5. Navigation Help:
   - Create campaign: Go to Campaigns → "Create Campaign" button
   - Import audience: Go to Audiences → "Import Audience" tab → Upload CSV
   - View analytics: Go to specific campaign → "Analytics" tab
   - Purchase leads: Go to "Lead Marketplace" in sidebar
   - Design template: Go to Templates → "Create Template" → Use builder

GUIDELINES:
- If user asks about creating a campaign, provide step-by-step guidance
- For budgeting questions, ask about audience size and mail piece size, then calculate
- Provide specific navigation instructions with exact button/tab names
- If asked about features not mentioned above, suggest contacting support
- Always be encouraging about direct mail ROI and campaign success potential
- Use marketing terminology appropriately (CTR, conversion rate, ROI, etc.)

RESPONSE FORMAT:
- Start with a friendly acknowledgment
- Provide clear, actionable information
- Use bullet points for lists
- End with a helpful follow-up question or next step suggestion`;

// ============================================================================
// Types
// ============================================================================

interface DrPhillipChatRequest {
  messages: Array<{ role: string; content: string }>;
}

// ============================================================================
// Main Handler (Custom for Streaming)
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const { messages }: DrPhillipChatRequest = await req.json();

    console.log('[DR-PHILLIP-CHAT] Request:', { messageCount: messages.length });

    // Convert messages to AI format
    const aiMessages: AIMessage[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Get streaming response
    const streamResponse = await createStreamingCompletion({
      provider: 'lovable',
      model: 'google/gemini-2.5-flash',
      systemPrompt: SYSTEM_PROMPT,
      messages: aiMessages,
      temperature: 0.7,
      stream: true,
    });

    // Forward the stream
    return new Response(streamResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[DR-PHILLIP-CHAT] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let status = 500;

    if (errorMessage.includes('Rate limit')) {
      status = 429;
    } else if (errorMessage.includes('Payment') || errorMessage.includes('credits')) {
      status = 402;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

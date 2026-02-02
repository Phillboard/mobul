/**
 * Generate Landing Page AI Edge Function
 * 
 * Simple landing page generation using Gemini.
 * Lighter weight alternative to ai-landing-page-generate.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createAICompletion, extractHTML } from '../_shared/ai-client.ts';

// ============================================================================
// Types
// ============================================================================

interface GenerateRequest {
  prompt: string;
  styleGuide?: {
    colors?: {
      primary?: string;
      secondary?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
    };
    style?: string;
  };
  postcardImageUrl?: string;
  websiteUrl?: string;
  campaignId?: string;
  includeForm?: boolean;
  includeGiftCardRedemption?: boolean;
}

interface GenerateResponse {
  html: string;
  styleGuide?: typeof GenerateRequest.prototype.styleGuide;
}

// ============================================================================
// System Prompt
// ============================================================================

const LANDING_PAGE_EXPERT_PROMPT = `You are an expert landing page designer specializing in direct mail campaign landing pages.

Your task is to generate beautiful, conversion-optimized landing pages with:
- Modern, responsive design (mobile-first approach)
- Clear call-to-action buttons prominently displayed
- Trust signals (testimonials, guarantees, social proof)
- Fast loading with optimized, clean code
- Accessible (WCAG AA compliant)
- SEO-friendly structure

Generate a complete, standalone HTML page that includes:
1. Embedded CSS using Tailwind classes or inline styles
2. Minimal JavaScript for interactivity (if needed)
3. Responsive design that works on mobile, tablet, and desktop
4. Form integration for lead capture (if requested)
5. Gift card redemption form (if requested)
6. Smooth animations and transitions
7. Professional typography and spacing

Output ONLY valid HTML5. No markdown, no explanations, just the complete HTML document.`;

// ============================================================================
// Main Handler
// ============================================================================

async function handleGenerateLandingPageAI(
  request: GenerateRequest,
  _context: PublicContext
): Promise<GenerateResponse> {
  const {
    prompt,
    styleGuide,
    postcardImageUrl,
    websiteUrl,
    includeForm = true,
    includeGiftCardRedemption = false,
  } = request;

  // Build context prompt
  let contextPrompt = prompt;

  if (styleGuide) {
    contextPrompt += `\n\nStyle Guide:
- Primary Color: ${styleGuide.colors?.primary || 'brand primary'}
- Secondary Color: ${styleGuide.colors?.secondary || 'brand secondary'}
- Heading Font: ${styleGuide.fonts?.heading || 'modern sans-serif'}
- Body Font: ${styleGuide.fonts?.body || 'readable sans-serif'}
- Brand Voice: ${styleGuide.style || 'professional'}`;
  }

  if (postcardImageUrl) {
    contextPrompt += '\n\nPostcard image provided. Match the visual style and messaging from the postcard.';
  }

  if (websiteUrl) {
    contextPrompt += `\n\nWebsite URL: ${websiteUrl}. Match the brand style from this website.`;
  }

  if (includeForm) {
    contextPrompt += '\n\nInclude a lead capture form with fields: Name, Email, Phone, Company (optional).';
  }

  if (includeGiftCardRedemption) {
    contextPrompt += '\n\nInclude a gift card redemption form where users can enter their unique code.';
  }

  console.log('[GENERATE-LP-AI] Request:', {
    promptLength: prompt.length,
    hasStyleGuide: !!styleGuide,
    includeForm,
    includeGiftCardRedemption,
  });

  // Call Gemini via shared client
  const result = await createAICompletion({
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    systemPrompt: LANDING_PAGE_EXPERT_PROMPT,
    messages: [{ role: 'user', content: contextPrompt }],
    temperature: 0.7,
    maxTokens: 8192,
  });

  // Extract HTML from response
  let html = extractHTML(result.content);

  // Ensure valid HTML structure
  if (!html.toLowerCase().includes('<!doctype html') && !html.toLowerCase().includes('<html')) {
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  console.log('[GENERATE-LP-AI] Generated:', {
    htmlLength: html.length,
    tokensUsed: result.usage.totalTokens,
  });

  return {
    html,
    styleGuide,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleGenerateLandingPageAI, {
  requireAuth: false, // This is a lighter weight endpoint, can be called without auth
  parseBody: true,
  auditAction: 'generate_landing_page_ai',
}));

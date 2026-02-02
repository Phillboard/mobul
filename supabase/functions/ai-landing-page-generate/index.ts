/**
 * AI Landing Page Generate Edge Function
 * 
 * Full-featured landing page generation with:
 * - OpenAI and Anthropic provider support
 * - Vision API for image analysis
 * - URL scraping for style matching
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import {
  createAICompletion,
  analyzeImage,
  extractHTML,
  type AIProvider,
} from '../_shared/ai-client.ts';

// ============================================================================
// Types
// ============================================================================

interface GenerateRequest {
  prompt: string;
  pageType?: 'product' | 'lead_gen' | 'thank_you' | 'event' | 'gift_card' | 'generic';
  industry?: 'real_estate' | 'automotive' | 'healthcare' | 'retail' | 'restaurant' | 'service' | 'generic';
  brandColors?: string[];
  brandFonts?: string[];
  targetAudience?: string;
  keyMessage?: string;
  callToAction?: string;
  includeForm?: boolean;
  includeTestimonials?: boolean;
  imageUrl?: string;
  sourceUrl?: string;
  provider?: AIProvider;
}

interface GenerateResponse {
  html: string;
  metadata: Record<string, unknown>;
  tokensUsed: number;
  provider: AIProvider;
  model: string;
}

// ============================================================================
// System Prompt Builder
// ============================================================================

function generateSystemPrompt(request: GenerateRequest): string {
  let prompt = `You are an expert web designer specializing in high-converting landing pages.

CORE PRINCIPLES:
1. Generate complete, production-ready HTML with inline Tailwind CSS classes
2. Create mobile-first, responsive designs that work on all devices
3. Use semantic HTML5 elements for accessibility
4. Include ARIA labels and alt text for accessibility
5. Ensure WCAG 2.1 AA compliance for color contrast
6. Include Tailwind CSS CDN in the <head>
7. Use clear visual hierarchy with compelling headlines
8. Include strong, action-oriented CTAs

TECHNICAL REQUIREMENTS:
- Output pure HTML with inline Tailwind CSS classes
- Include <script src="https://cdn.tailwindcss.com"></script> in <head>
- Ensure all colors have sufficient contrast (4.5:1 minimum)
- Include proper meta tags for SEO
- Use system fonts or Google Fonts
- Make fully responsive with Tailwind's responsive classes`;

  if (request.pageType) {
    prompt += '\n\n' + getPageTypeInstructions(request.pageType);
  }

  if (request.industry) {
    prompt += '\n\n' + getIndustryInstructions(request.industry);
  }

  if (request.brandColors?.length) {
    prompt += `\n\nBRAND COLORS: Use these colors: ${request.brandColors.join(', ')}`;
  }

  if (request.brandFonts?.length) {
    prompt += `\n\nBRAND FONTS: Use these fonts: ${request.brandFonts.join(', ')}`;
  }

  if (request.targetAudience) {
    prompt += `\n\nTARGET AUDIENCE: ${request.targetAudience}`;
  }

  if (request.keyMessage) {
    prompt += `\n\nKEY MESSAGE: ${request.keyMessage}`;
  }

  if (request.callToAction) {
    prompt += `\n\nCALL TO ACTION: ${request.callToAction}`;
  }

  if (request.includeForm) {
    prompt += '\n\nINCLUDE: Contact or lead generation form';
  }

  if (request.includeTestimonials) {
    prompt += '\n\nINCLUDE: Testimonials section with 2-3 reviews';
  }

  return prompt;
}

function getPageTypeInstructions(pageType: string): string {
  const instructions: Record<string, string> = {
    product: 'Include: Hero with product image, features grid, pricing, testimonials, FAQ, strong CTAs',
    lead_gen: 'Include: Compelling headline, lead magnet description, short form (name, email), benefits list, social proof',
    thank_you: 'Include: Confirmation headline, next steps, download/access button, social sharing, additional resources',
    event: 'Include: Event details (date, time, location), agenda, speaker bios, registration form, countdown timer',
    gift_card: 'Include: Celebratory hero, gift card value display, redemption form, benefits grid, FAQ section',
    generic: 'Include: Clear headline, well-organized content, appropriate CTAs',
  };
  return instructions[pageType] || instructions.generic;
}

function getIndustryInstructions(industry: string): string {
  const instructions: Record<string, string> = {
    real_estate: 'Style: Professional blues, property showcase, virtual tour option, agent contact form',
    automotive: 'Style: Bold colors, vehicle showcase, key specs, financing options, test drive CTA',
    healthcare: 'Style: Calming blues/greens, trust emphasis, provider credentials, appointment booking',
    retail: 'Style: Energetic, product showcase, pricing, add to cart, customer reviews',
    restaurant: 'Style: Warm colors, food photography, menu highlights, reservation form',
    service: 'Style: Professional, clear service offerings, process explanation, testimonials',
    generic: 'Style: Clean, professional, clear value proposition',
  };
  return instructions[industry] || instructions.generic;
}

// ============================================================================
// Webpage Analysis
// ============================================================================

async function analyzeWebpage(url: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);

    return {
      title: titleMatch ? titleMatch[1] : '',
      description: descMatch ? descMatch[1] : '',
      url,
    };
  } catch (error) {
    console.error('[AI-LP-GENERATE] Webpage analysis error:', error);
    return { title: '', description: '', url };
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleGenerateLandingPage(
  request: GenerateRequest,
  _context: AuthContext
): Promise<GenerateResponse> {
  const provider = request.provider || 'openai';

  console.log('[AI-LP-GENERATE] Request:', {
    provider,
    pageType: request.pageType,
    hasImage: !!request.imageUrl,
    hasSourceUrl: !!request.sourceUrl,
  });

  const systemPrompt = generateSystemPrompt(request);
  let userPrompt = request.prompt;
  let metadata: Record<string, unknown> = {};

  // Handle image analysis
  if (request.imageUrl) {
    const imageAnalysisPrompt = `Analyze this direct mail piece and create a landing page that:
1. Matches the visual style and branding
2. Converts the print layout to web-optimized design
3. Maintains message consistency
4. Enhances with web-specific features

${request.prompt}`;

    const visionResult = await analyzeImage({
      imageUrl: request.imageUrl,
      prompt: imageAnalysisPrompt,
    });

    metadata.sourceImage = request.imageUrl;
    metadata.imageAnalysis = visionResult.content;

    // Use the analysis as part of the prompt
    userPrompt = `Based on this image analysis:\n${visionResult.content}\n\n${request.prompt}`;
  }

  // Handle URL analysis
  if (request.sourceUrl) {
    const extractedData = await analyzeWebpage(request.sourceUrl);
    userPrompt = `Create a landing page inspired by this website:
Title: ${extractedData.title}
Description: ${extractedData.description}

User request: ${request.prompt}

Create original content that matches the style but is unique.`;
    metadata.sourceAnalysis = extractedData;
  }

  // Generate landing page
  const result = await createAICompletion({
    provider,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.7,
    maxTokens: 4000,
  });

  // Extract and validate HTML
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

  // Extract metadata from generated HTML
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descMatch = html.match(/<meta name="description" content="(.*?)"/i);

  metadata.title = titleMatch ? titleMatch[1] : '';
  metadata.description = descMatch ? descMatch[1] : '';

  console.log('[AI-LP-GENERATE] Generated:', {
    htmlLength: html.length,
    tokensUsed: result.usage.totalTokens,
    model: result.model,
  });

  return {
    html,
    metadata,
    tokensUsed: result.usage.totalTokens,
    provider,
    model: result.model,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleGenerateLandingPage, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'ai_landing_page_generate',
}));

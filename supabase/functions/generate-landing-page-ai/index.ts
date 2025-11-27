import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      styleGuide,
      postcardImageUrl,
      websiteUrl,
      campaignId,
      includeForm = true,
      includeGiftCardRedemption = false,
    } = await req.json();

    // Get Gemini API key from environment
    const geminiAPIKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiAPIKey) {
      throw new Error('Gemini API key not configured');
    }

    // Build context from style guide
    let contextPrompt = prompt;
    
    if (styleGuide) {
      contextPrompt += `\n\nStyle Guide:
- Primary Color: ${styleGuide.colors?.primary}
- Secondary Color: ${styleGuide.colors?.secondary}
- Heading Font: ${styleGuide.fonts?.heading}
- Body Font: ${styleGuide.fonts?.body}
- Brand Voice: ${styleGuide.style}`;
    }

    if (postcardImageUrl) {
      contextPrompt += `\n\nPostcard image provided. Match the visual style and messaging from the postcard.`;
    }

    if (websiteUrl) {
      contextPrompt += `\n\nWebsite URL: ${websiteUrl}. Match the brand style from this website.`;
    }

    if (includeForm) {
      contextPrompt += `\n\nInclude a lead capture form with fields: Name, Email, Phone, Company (optional).`;
    }

    if (includeGiftCardRedemption) {
      contextPrompt += `\n\nInclude a gift card redemption form where users can enter their unique code.`;
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiAPIKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${LANDING_PAGE_EXPERT_PROMPT}\n\nUser Request: ${contextPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error('Gemini API request failed');
    }

    const geminiData = await geminiResponse.json();
    const generatedHTML = geminiData.candidates[0]?.content?.parts[0]?.text || '';

    // Extract HTML if wrapped in code blocks
    let html = generatedHTML;
    if (html.includes('```html')) {
      html = html.split('```html')[1].split('```')[0].trim();
    } else if (html.includes('```')) {
      html = html.split('```')[1].split('```')[0].trim();
    }

    // Ensure it's valid HTML
    if (!html.toLowerCase().includes('<!doctype html') && !html.toLowerCase().includes('<html')) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page</title>
</head>
<body>
  ${html}
</body>
</html>`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        html,
        styleGuide,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Landing page generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate landing page',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


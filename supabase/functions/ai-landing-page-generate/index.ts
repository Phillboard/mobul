import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  imageUrl?: string; // For vision API
  sourceUrl?: string; // For link analysis
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

    const requestData: GenerateRequest = await req.json();
    const provider = requestData.provider || 'openai';
    
    console.log('AI Landing Page Generate:', {
      user: user.id,
      provider,
      pageType: requestData.pageType,
      hasImage: !!requestData.imageUrl,
    });

    // Generate the system prompt
    let systemPrompt = generateSystemPrompt(requestData);
    let userPrompt = requestData.prompt;

    // Handle different generation modes
    let html: string;
    let metadata: any = {};
    let tokensUsed = 0;
    let model: string;

    if (requestData.imageUrl && provider === 'openai') {
      // Use OpenAI Vision API
      const result = await generateFromImage(requestData, systemPrompt);
      html = result.html;
      metadata = result.metadata;
      tokensUsed = result.tokensUsed;
      model = result.model;
    } else if (requestData.imageUrl && provider === 'anthropic') {
      // Use Anthropic Claude with vision
      const result = await generateFromImageAnthropic(requestData, systemPrompt);
      html = result.html;
      metadata = result.metadata;
      tokensUsed = result.tokensUsed;
      model = result.model;
    } else if (requestData.sourceUrl) {
      // Analyze source URL first
      const extractedData = await analyzeWebpage(requestData.sourceUrl);
      userPrompt = generateLinkAnalysisPrompt(extractedData, requestData.prompt);
      const result = await generateFromText(userPrompt, systemPrompt, provider);
      html = result.html;
      metadata = { ...result.metadata, sourceAnalysis: extractedData };
      tokensUsed = result.tokensUsed;
      model = result.model;
    } else {
      // Standard text-based generation
      const result = await generateFromText(requestData.prompt, systemPrompt, provider);
      html = result.html;
      metadata = result.metadata;
      tokensUsed = result.tokensUsed;
      model = result.model;
    }

    // Extract metadata from generated HTML
    const extractedMetadata = extractMetadata(html);

    return new Response(
      JSON.stringify({
        success: true,
        html,
        metadata: { ...metadata, ...extractedMetadata },
        tokensUsed,
        provider,
        model,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate landing page' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Generate system prompt based on context
 */
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

  // Add page type specific instructions
  if (request.pageType) {
    prompt += '\n\n' + getPageTypeInstructions(request.pageType);
  }

  // Add industry specific instructions
  if (request.industry) {
    prompt += '\n\n' + getIndustryInstructions(request.industry);
  }

  // Add brand customization
  if (request.brandColors && request.brandColors.length > 0) {
    prompt += `\n\nBRAND COLORS: Use these colors: ${request.brandColors.join(', ')}`;
  }

  if (request.brandFonts && request.brandFonts.length > 0) {
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

/**
 * Generate from text using OpenAI or Anthropic
 */
async function generateFromText(userPrompt: string, systemPrompt: string, provider: 'openai' | 'anthropic') {
  if (provider === 'openai') {
    return await generateWithOpenAI(userPrompt, systemPrompt);
  } else {
    return await generateWithAnthropic(userPrompt, systemPrompt);
  }
}

/**
 * Generate with OpenAI
 */
async function generateWithOpenAI(userPrompt: string, systemPrompt: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const html = data.choices[0].message.content;
  const tokensUsed = data.usage.total_tokens;

  return {
    html,
    metadata: {},
    tokensUsed,
    model: 'gpt-4-turbo-preview',
  };
}

/**
 * Generate with Anthropic Claude
 */
async function generateWithAnthropic(userPrompt: string, systemPrompt: string) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

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
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  const html = data.content[0].text;
  const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

  return {
    html,
    metadata: {},
    tokensUsed,
    model: 'claude-3-opus-20240229',
  };
}

/**
 * Generate from image using OpenAI Vision
 */
async function generateFromImage(request: GenerateRequest, systemPrompt: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const imageAnalysisPrompt = `Analyze this direct mail piece and create a landing page that:
1. Matches the visual style and branding
2. Converts the print layout to web-optimized design
3. Maintains message consistency
4. Enhances with web-specific features

${request.prompt}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: imageAnalysisPrompt },
            { type: 'image_url', image_url: { url: request.imageUrl } },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Vision API error: ${error}`);
  }

  const data = await response.json();
  const html = data.choices[0].message.content;
  const tokensUsed = data.usage.total_tokens;

  return {
    html,
    metadata: { sourceImage: request.imageUrl },
    tokensUsed,
    model: 'gpt-4-vision-preview',
  };
}

/**
 * Generate from image using Anthropic Claude with vision
 */
async function generateFromImageAnthropic(request: GenerateRequest, systemPrompt: string) {
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  // Fetch and convert image to base64
  const imageResponse = await fetch(request.imageUrl!);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg';

  const imageAnalysisPrompt = `Analyze this direct mail piece and create a landing page that matches its style. ${request.prompt}`;

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
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: imageAnalysisPrompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic Vision API error: ${error}`);
  }

  const data = await response.json();
  const html = data.content[0].text;
  const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

  return {
    html,
    metadata: { sourceImage: request.imageUrl },
    tokensUsed,
    model: 'claude-3-opus-20240229',
  };
}

/**
 * Analyze webpage for link-based generation
 */
async function analyzeWebpage(url: string) {
  try {
    const response = await fetch(url);
    const html = await response.text();

    // Basic extraction (in production, use a proper HTML parser)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    
    return {
      title: titleMatch ? titleMatch[1] : '',
      description: descMatch ? descMatch[1] : '',
      url,
    };
  } catch (error) {
    console.error('Webpage analysis error:', error);
    return {
      title: '',
      description: '',
      url,
    };
  }
}

function generateLinkAnalysisPrompt(extractedData: any, userPrompt: string): string {
  return `Create a landing page inspired by this website:
Title: ${extractedData.title}
Description: ${extractedData.description}

User request: ${userPrompt}

Create original content that matches the style but is unique.`;
}

/**
 * Extract metadata from generated HTML
 */
function extractMetadata(html: string) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
  
  return {
    title: titleMatch ? titleMatch[1] : '',
    description: descMatch ? descMatch[1] : '',
  };
}


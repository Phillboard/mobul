import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callClaudeAI(messages: any[]) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      messages,
      temperature: 0.9,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude AI error:', error);
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to your workspace.');
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function cleanForGrapesJS(html: string): string {
  // Remove any markdown code fences first
  html = html.replace(/```html\s*/gi, '');
  html = html.replace(/```\s*/g, '');

  // Remove DOCTYPE and html/head/body tags
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
  html = html.replace(/<\/?html[^>]*>/gi, '');
  html = html.replace(/<\/?head[^>]*>/gi, '');
  html = html.replace(/<\/?body[^>]*>/gi, '');

  // Remove style and script tags (GrapesJS uses inline styles)
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Extract the main container (div or section)
  const match = html.match(/<(div|section)[^>]*>[\s\S]*<\/\1>/i);
  if (match) {
    return match[0].trim();
  }

  // If no container found, wrap in a div to ensure GrapesJS compatibility
  html = html.trim();
  if (!html.startsWith('<div') && !html.startsWith('<section')) {
    return `<div style="width: 100%; min-height: 100vh;">${html}</div>`;
  }

  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { sourceType, sourceUrl, sourceFile, sourceDescription, clientId, giftCardBrand, giftCardValue, userAction } = body;
    
    console.log('AI Generation request:', { sourceType, clientId, hasFile: !!sourceFile, hasUrl: !!sourceUrl, hasDescription: !!sourceDescription });
    
    // Validate required fields
    if (!sourceType) {
      return new Response(
        JSON.stringify({ error: 'sourceType is required (url, image, or description)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'clientId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!giftCardBrand) {
      return new Response(
        JSON.stringify({ error: 'giftCardBrand is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!giftCardValue) {
      return new Response(
        JSON.stringify({ error: 'giftCardValue is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!userAction) {
      return new Response(
        JSON.stringify({ error: 'userAction is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate source-specific requirements
    if (sourceType === 'url' && !sourceUrl) {
      return new Response(
        JSON.stringify({ error: 'sourceUrl is required when sourceType is "url"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (sourceType === 'image' && !sourceFile) {
      return new Response(
        JSON.stringify({ error: 'sourceFile is required when sourceType is "image"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (sourceType === 'description' && !sourceDescription) {
      return new Response(
        JSON.stringify({ error: 'sourceDescription is required when sourceType is "description"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Extracting branding...');
    
    let brandingMessages: any[] = [];
    const brandingPrompt = `Extract branding from this ${sourceType}. Return ONLY JSON:
{
  "companyName": "name",
  "industry": "type",
  "primaryColor": "#hex",
  "accentColor": "#hex",
  "backgroundColor": "#hex",
  "textColor": "#hex",
  "tagline": "text",
  "designStyle": "modern|bold|luxury|professional",
  "emotionalTone": "friendly|professional|exciting|trustworthy",
  "fontFamily": "font name"
}`;

    if (sourceType === 'image' && sourceFile) {
      brandingMessages = [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: sourceFile } },
          { type: 'text', text: brandingPrompt }
        ]
      }];
    } else if (sourceType === 'url') {
      brandingMessages = [{ role: 'user', content: `${brandingPrompt}\n\nURL: ${sourceUrl}` }];
    } else {
      brandingMessages = [{ role: 'user', content: `${brandingPrompt}\n\nDescription: ${sourceDescription}` }];
    }

    const brandingText = await callClaudeAI(brandingMessages);
    const branding = JSON.parse(brandingText.replace(/```json\s*/g, '').replace(/```\s*/g, ''));
    console.log('Branding extracted:', branding);

    console.log('Generating 3 variations...');

    const createPrompt = (style: string, desc: string) => `You are an expert web designer creating a stunning, conversion-optimized gift card redemption landing page.

BRANDING CONTEXT:
${JSON.stringify(branding, null, 2)}

GIFT CARD DETAILS:
- Brand: ${giftCardBrand}
- Value: $${giftCardValue}
- User earned this by: ${userAction}

DESIGN STYLE: ${style}
${desc}

CRITICAL TECHNICAL REQUIREMENTS (NON-NEGOTIABLE):
❌ NEVER include: <!DOCTYPE>, <html>, <head>, <body>, <style>, <script>, or any tags outside the main container
✅ START with a single <div> or <section> container
✅ ALL styles MUST be inline (style="...") - no external stylesheets
✅ REQUIRED form elements with EXACT IDs:
   - <form id="giftCardRedemptionForm">
   - <input id="codeInput" type="text" placeholder="Enter your gift card code">
   - <button id="submitButton" type="submit">
✅ Mobile-first responsive design using inline media queries if needed
✅ Use modern CSS (flexbox, grid) for layouts
✅ Ensure accessibility (proper labels, ARIA attributes where helpful)

DESIGN GUIDELINES:
1. **Hero Section** (Above the fold):
   - Eye-catching headline emphasizing the gift value
   - Subheadline thanking them for ${userAction}
   - Use ${branding.primaryColor} and ${branding.accentColor} strategically
   - High-contrast, visually appealing gradient or solid backgrounds
   - Include brand name: ${branding.companyName}

2. **Visual Hierarchy**:
   - Make the gift card value ($${giftCardValue} ${giftCardBrand}) prominent
   - Use typography hierarchy (48px+ headlines, 18px+ body)
   - Ample whitespace for breathing room
   - Strategic use of ${branding.emotionalTone} tone

3. **Redemption Form** (Center of attention):
   - Large, beautiful form centered on page
   - Clear input field with placeholder
   - Prominent CTA button (e.g., "Claim My $${giftCardValue} ${giftCardBrand} Gift Card")
   - Button should use ${branding.accentColor} or a high-converting color
   - Add subtle shadows, borders, or 3D effects for depth
   - Include form validation hints visually

4. **How It Works** (3 simple steps):
   - Icon or number for each step
   - Step 1: Enter your code
   - Step 2: Confirm your details
   - Step 3: Receive your ${giftCardBrand} gift card
   - Use cards or panels with subtle shadows

5. **Trust & Benefits Section**:
   - 3-4 benefit points (Fast delivery, No fees, Instant redemption, etc.)
   - Use icons or visual markers
   - Reinforce brand trust and ${branding.emotionalTone} tone

6. **Footer**:
   - Company name: ${branding.companyName}
   - Professional, subtle
   - Copyright and privacy link placeholders
   - Use ${branding.backgroundColor} or complementary color

DESIGN EXCELLENCE CRITERIA:
- Use gradients, shadows, and modern visual effects
- Implement card-based layouts with proper spacing
- Add hover effects on buttons (use :hover pseudo-class in inline styles if possible, or make button visually 3D)
- Use ${branding.fontFamily} if web-safe, otherwise use system fonts (Inter, SF Pro, Roboto)
- Ensure text is readable with proper contrast ratios
- Make it feel premium and conversion-focused
- The page should look like it was designed by a professional agency, not a template

COLOR PALETTE TO USE:
- Primary: ${branding.primaryColor}
- Accent: ${branding.accentColor}
- Background: ${branding.backgroundColor}
- Text: ${branding.textColor}

RETURN ONLY THE HTML CODE. No explanations, no markdown fences, just pure HTML starting with <div> or <section>.`;

    console.log('Generating 3 variations with Claude Sonnet 4.5...');

    const [html1, html2, html3] = await Promise.all([
      callClaudeAI([{ role: 'user', content: createPrompt('Modern Minimalist (Apple-inspired)', 'Clean lines, generous whitespace, subtle gradients with soft shadows, premium feel with understated elegance. Think Apple product pages - simple but sophisticated.') }]),
      callClaudeAI([{ role: 'user', content: createPrompt('Bold & Energetic (Startup vibe)', 'Vibrant, eye-popping colors with high contrast. Large, bold typography. Energetic gradients. Modern, fun, and exciting. Think Stripe or Spotify landing pages.') }]),
      callClaudeAI([{ role: 'user', content: createPrompt('Professional Luxury (High-end)', 'Sophisticated, elegant design with premium typography. Use gold (#D4AF37) accents, deep colors, and refined spacing. Think luxury brands like Rolex or high-end hotels.') }])
    ]);

    const variations = [
      {
        id: 'v1-minimalist',
        name: 'Modern Minimalist',
        style: 'minimalist',
        description: 'Clean, Apple-inspired design with subtle elegance',
        colors: [branding.primaryColor, branding.accentColor, branding.backgroundColor],
        component: cleanForGrapesJS(html1),
        generatedAt: new Date().toISOString()
      },
      {
        id: 'v2-bold',
        name: 'Bold & Energetic',
        style: 'vibrant',
        description: 'Vibrant colors and large typography for impact',
        colors: [branding.accentColor, branding.primaryColor, branding.backgroundColor],
        component: cleanForGrapesJS(html2),
        generatedAt: new Date().toISOString()
      },
      {
        id: 'v3-luxury',
        name: 'Professional Luxury',
        style: 'professional',
        description: 'Sophisticated, high-end design for premium brands',
        colors: [branding.textColor, '#D4AF37', branding.backgroundColor],
        component: cleanForGrapesJS(html3),
        generatedAt: new Date().toISOString()
      }
    ];

    const contentJson = {
      metadata: {
        generatedAt: new Date().toISOString(),
        aiModel: 'anthropic/claude-sonnet-4-5',
        sourceType,
        version: '2.0'
      },
      branding,
      giftCard: { brand: giftCardBrand, value: giftCardValue, userAction },
      variations,
      selectedVariation: 0,
      pages: [],
      grapesJSCompatible: true
    };

    const slug = `${branding.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const { data: page, error } = await supabase
      .from('landing_pages')
      .insert({
        client_id: clientId,
        name: `${branding.companyName} - Gift Card Redemption`,
        slug,
        content_json: contentJson,
        ai_generated: true,
        ai_prompt: sourceDescription || sourceUrl || 'Image upload',
        editor_type: 'grapesjs',
        published: false,
        meta_title: `Redeem Your ${giftCardBrand} Gift Card - ${branding.companyName}`,
        meta_description: `Claim your ${giftCardBrand} $${giftCardValue} gift card from ${branding.companyName}.`
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        landingPageId: page.id,
        slug,
        previewUrl: `${supabaseUrl}/lp/${slug}`,
        branding,
        variations: variations.map(v => ({ id: v.id, name: v.name, style: v.style, description: v.description, colors: v.colors }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

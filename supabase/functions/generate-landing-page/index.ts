import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callLovableAI(messages: any[]) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lovable AI error:', error);
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
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
  html = html.replace(/<\/?html[^>]*>/gi, '');
  html = html.replace(/<\/?head[^>]*>/gi, '');
  html = html.replace(/<\/?body[^>]*>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/```html\s*/gi, '');
  html = html.replace(/```\s*/g, '');
  
  const match = html.match(/<(div|section)[^>]*>[\s\S]*<\/\1>/i);
  return match ? match[0].trim() : html.trim();
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

    const brandingText = await callLovableAI(brandingMessages);
    const branding = JSON.parse(brandingText.replace(/```json\s*/g, '').replace(/```\s*/g, ''));
    console.log('Branding extracted:', branding);

    console.log('Generating 3 variations...');

    const createPrompt = (style: string, desc: string) => `Create a STUNNING gift card redemption page.

BRANDING: ${JSON.stringify(branding)}
GIFT CARD: ${giftCardBrand} $${giftCardValue}
USER ACTION: ${userAction}

DESIGN STYLE: ${style}
${desc}

CRITICAL RULES:
❌ NO: <!DOCTYPE>, <html>, <head>, <body>, <style>, <script>
✅ START with <div> or <section>
✅ ALL styles inline (style="...")
✅ MUST include: <form id="redemption-form">, <input id="gift-card-code">, <button id="submit-button">
✅ Simple HTML, mobile-responsive

SECTIONS:
1. Hero - Bold headline
2. How It Works - 3 steps
3. Redemption Form - Centered, beautiful
4. Benefits
5. Footer - ${branding.companyName}

Make it BEAUTIFUL!`;

    const [html1, html2, html3] = await Promise.all([
      callLovableAI([{ role: 'user', content: createPrompt('Modern Minimalist (Apple-inspired)', 'Clean lines, whitespace, subtle gradients, soft shadows') }]),
      callLovableAI([{ role: 'user', content: createPrompt('Bold & Energetic (Startup vibe)', 'Vibrant colors, large typography, high contrast, exciting energy') }]),
      callLovableAI([{ role: 'user', content: createPrompt('Professional Luxury (High-end)', 'Elegant typography, sophisticated colors, premium aesthetic, gold accents') }])
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
      metadata: { generatedAt: new Date().toISOString(), aiModel: 'claude-sonnet-4-5', sourceType },
      branding,
      giftCard: { brand: giftCardBrand, value: giftCardValue, userAction },
      variations,
      selectedVariation: 0,
      pages: []
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

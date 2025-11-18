import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const templates = {
  modernLuxury: { id: "modern-luxury", name: "Modern Luxury" },
  boldEnergetic: { id: "bold-energetic", name: "Bold & Energetic" },
  professionalTrust: { id: "professional-trust", name: "Professional Trust" }
};

function selectTemplateByIndustry(industry: string): string {
  const industryMap: Record<string, string> = {
    auto: "modern-luxury", realestate: "modern-luxury", financial: "professional-trust",
    fitness: "bold-energetic", restaurant: "bold-energetic", healthcare: "professional-trust"
  };
  for (const [key, templateId] of Object.entries(industryMap)) {
    if (industry.toLowerCase().includes(key)) return templateId;
  }
  return "modern-luxury";
}

function validateGeneratedHTML(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!html.includes('<!DOCTYPE html>')) errors.push('Missing DOCTYPE');
  if (!html.includes('<html')) errors.push('Missing html tag');
  if (!html.includes('giftCardRedemptionForm')) errors.push('Missing form ID');
  if (!html.includes('codeInput')) errors.push('Missing input ID');
  if (!html.includes('submitButton')) errors.push('Missing button ID');
  return { valid: errors.length === 0, errors };
}

async function exponentialBackoff(attemptNumber: number, maxDelay: number = 10000): Promise<void> {
  const delay = Math.min(Math.pow(2, attemptNumber) * 1000, maxDelay);
  console.log(`⏳ Backing off for ${delay}ms...`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return { base64: btoa(binary), mimeType: blob.type || 'image/jpeg' };
}

const BRANDING_SYSTEM = `You are an expert brand strategist. Extract comprehensive branding guidelines.
CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.`;

const HTML_SYSTEM = `You are a world-class web designer creating $10,000+ premium landing pages.
Design philosophy: Apple/Tesla aesthetic, bold typography, dramatic gradients, smooth animations.
CRITICAL: Return ONLY complete HTML. No markdown, no code blocks, no explanations.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return Response.json({ error: "No authorization header" }, { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

    const { sourceType, sourceUrl, sourceImage, sourceDescription, clientId, giftCardBrand, giftCardValue, userAction } = await req.json();
    if (!sourceType || !clientId || !giftCardBrand || !userAction) {
      return Response.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    // PHASE 1: BRANDING EXTRACTION
    const extractionMessages: any[] = [];
    if (sourceType === "url") {
      if (!sourceUrl) return Response.json({ error: "URL required" }, { status: 400, headers: corsHeaders });
      extractionMessages.push({ role: "user", content: `<task>Extract branding from: ${sourceUrl}</task>
<schema>{"companyName":"str","industry":"str","primaryColor":"#hex","accentColor":"#hex","backgroundColor":"#hex","textColor":"#hex","tagline":"str","designStyle":"modern|minimalist|bold|professional|luxury","emotionalTone":"str","fontStyle":"sans-serif|serif","logoUrl":"str|null"}</schema>` });
    } else if (sourceType === "image") {
      if (!sourceImage) return Response.json({ error: "Image required" }, { status: 400, headers: corsHeaders });
      const imageUrl = typeof sourceImage === 'string' ? sourceImage : sourceImage.url;
      const { base64, mimeType } = await fetchImageAsBase64(imageUrl);
      extractionMessages.push({
        role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
          { type: "text", text: `<task>Extract branding from image</task>
<schema>{"companyName":"str","industry":"str","primaryColor":"#hex","accentColor":"#hex","backgroundColor":"#hex","textColor":"#hex","tagline":"str","designStyle":"str","emotionalTone":"str","fontStyle":"str","logoUrl":null}</schema>` }
        ]
      });
    } else {
      extractionMessages.push({ role: "user", content: `<task>Create branding for: ${sourceDescription}</task>
<schema>{"companyName":"str","industry":"str","primaryColor":"#hex","accentColor":"#hex","backgroundColor":"#hex","textColor":"#hex","tagline":"str","designStyle":"str","emotionalTone":"str","fontStyle":"str","logoUrl":null}</schema>` });
    }

    let extractedBranding: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system: BRANDING_SYSTEM, messages: extractionMessages, temperature: 1.0 })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err.error?.type === 'rate_limit_error' && attempt < 3) { await exponentialBackoff(attempt); continue; }
          if (err.error?.type === 'overloaded_error' && attempt < 3) { await exponentialBackoff(attempt, 15000); continue; }
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        const content = data.content[0].text;
        try { extractedBranding = JSON.parse(content); break; }
        catch { const match = content.match(/\{[\s\S]*\}/); if (match) { extractedBranding = JSON.parse(match[0]); break; } }
        if (attempt === 3) throw new Error("Could not parse branding");
      } catch (error) {
        if (attempt === 3) return Response.json({ error: "Branding extraction failed" }, { status: 500, headers: corsHeaders });
        await exponentialBackoff(attempt);
      }
    }

    // PHASE 2: HTML GENERATION
    const { primaryColor, accentColor } = extractedBranding;
    const htmlPrompt = `<task>Create premium gift card landing page</task>
<branding>${JSON.stringify(extractedBranding)}</branding>
<gift_card>${giftCardBrand} - $${giftCardValue}</gift_card>
<mandatory_ids>form: giftCardRedemptionForm, input: codeInput, button: submitButton</mandatory_ids>
<design>Apple/Tesla aesthetic, text-7xl+ headlines, gradients from-[${primaryColor}] to-[${accentColor}], py-24+ spacing, shadow-2xl depth, hover animations, mobile responsive</design>
<sections>1.Hero(full viewport, animated gradient, huge company name), 2.Redemption(centered, 3D gift card, large input, trust badges), 3.Benefits(3 cards), 4.Footer</sections>`;

    let generatedContent: string = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 20000, system: HTML_SYSTEM, messages: [{ role: "user", content: htmlPrompt }], temperature: 1.0 })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err.error?.type === 'rate_limit_error' && attempt < 3) { await exponentialBackoff(attempt); continue; }
          if (err.error?.type === 'overloaded_error' && attempt < 3) { await exponentialBackoff(attempt, 15000); continue; }
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        let html = data.content[0].text;
        const mdMatch = html.match(/```(?:html)?\s*\n?([\s\S]*?)\n?```/);
        if (mdMatch) html = mdMatch[1];
        if (!html.includes('<!DOCTYPE html>') && html.includes('<html')) html = '<!DOCTYPE html>\n' + html.substring(html.indexOf('<html'));
        const validation = validateGeneratedHTML(html);
        if (!validation.valid && attempt === 3) throw new Error("Validation failed: " + validation.errors.join(', '));
        if (validation.valid) { generatedContent = html; break; }
      } catch (error) {
        if (attempt === 3) return Response.json({ error: "HTML generation failed" }, { status: 500, headers: corsHeaders });
        await exponentialBackoff(attempt);
      }
    }
    
    if (!generatedContent) {
      return Response.json({ error: "Failed to generate valid HTML content" }, { status: 500, headers: corsHeaders });
    }

    // SAVE
    const slug = `${extractedBranding.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const { data: landingPage, error: insertError } = await supabase.from("landing_pages").insert({
      client_id: clientId, name: `${extractedBranding.companyName} - Gift Card`, slug, html_content: generatedContent,
      content_json: { branding: extractedBranding, giftCard: { brand: giftCardBrand, value: giftCardValue }, userAction },
      ai_generated: true, published: false, editor_type: 'ai', created_by_user_id: user.id
    }).select().single();

    if (insertError) return Response.json({ error: "Save failed" }, { status: 500, headers: corsHeaders });
    return Response.json({ success: true, landingPageId: landingPage.id, slug: landingPage.slug, previewUrl: `/landing/${landingPage.slug}`, branding: extractedBranding }, { headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return Response.json({ error: "Unexpected error", details: errorMessage }, { status: 500, headers: corsHeaders });
  }
});

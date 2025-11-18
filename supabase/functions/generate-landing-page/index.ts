import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function callLovableAI(messages: any[], isVision: boolean = false): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const model = isVision ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 1.0 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

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
    console.log("🔍 Starting branding extraction...");
    let brandingPrompt = "";
    let isVision = false;

    if (sourceType === "url") {
      if (!sourceUrl) return Response.json({ error: "URL required" }, { status: 400, headers: corsHeaders });
      brandingPrompt = `You are an expert brand strategist. Extract comprehensive branding from this URL: ${sourceUrl}

Return ONLY valid JSON with this exact structure (no markdown, no explanations):
{"companyName":"string","industry":"string","primaryColor":"#hex","accentColor":"#hex","backgroundColor":"#hex","textColor":"#hex","tagline":"string","designStyle":"modern|minimalist|bold|professional|luxury","emotionalTone":"string","fontStyle":"sans-serif|serif","logoUrl":"string or null"}`;
    } else if (sourceType === "image") {
      if (!sourceImage) return Response.json({ error: "Image required" }, { status: 400, headers: corsHeaders });
      isVision = true;
      brandingPrompt = `You are an expert brand strategist. Analyze this image and extract comprehensive branding.

Return ONLY valid JSON with this exact structure (no markdown, no explanations):
{"companyName":"string","industry":"string","primaryColor":"#hex","accentColor":"#hex","backgroundColor":"#hex","textColor":"#hex","tagline":"string","designStyle":"modern|minimalist|bold|professional|luxury","emotionalTone":"string","fontStyle":"sans-serif|serif","logoUrl":null}

Image: ${typeof sourceImage === 'string' ? sourceImage : sourceImage.url}`;
    } else {
      brandingPrompt = `You are an expert brand strategist. Create comprehensive branding for: ${sourceDescription}

Return ONLY valid JSON with this exact structure (no markdown, no explanations):
{"companyName":"string","industry":"string","primaryColor":"#hex","accentColor":"#hex","backgroundColor":"#hex","textColor":"#hex","tagline":"string","designStyle":"modern|minimalist|bold|professional|luxury","emotionalTone":"string","fontStyle":"sans-serif|serif","logoUrl":null}`;
    }

    let extractedBranding: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔍 Branding extraction attempt ${attempt}/3`);
        const content = await callLovableAI([{ role: "user", content: brandingPrompt }], isVision);
        console.log(`📝 Received branding content (${content.length} chars)`);
        
        try { 
          extractedBranding = JSON.parse(content); 
          break; 
        } catch { 
          console.log(`🔧 Attempting to extract JSON from response...`);
          const match = content.match(/\{[\s\S]*\}/); 
          if (match) { 
            extractedBranding = JSON.parse(match[0]); 
            break; 
          } 
        }
        
        if (attempt === 3) {
          console.error(`❌ Failed to parse branding JSON after 3 attempts`);
          return Response.json({ error: "Could not parse branding from AI", details: content.substring(0, 500) }, { status: 500, headers: corsHeaders });
        }
      } catch (error) {
        console.error(`❌ Exception on attempt ${attempt}:`, error);
        if (attempt === 3) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return Response.json({ error: "Branding extraction failed", details: errorMsg }, { status: 500, headers: corsHeaders });
        }
        await exponentialBackoff(attempt);
      }
    }

    // PHASE 2: HTML GENERATION
    console.log("🎨 Starting HTML generation...");
    const { primaryColor, accentColor } = extractedBranding;
    const htmlPrompt = `You are a world-class web designer creating premium gift card landing pages.

Create a complete HTML page with this branding:
${JSON.stringify(extractedBranding, null, 2)}

Gift Card: ${giftCardBrand} - $${giftCardValue}

CRITICAL REQUIREMENTS:
- Return ONLY complete HTML (no markdown, no code blocks, no explanations)
- Must include DOCTYPE and complete html structure
- MANDATORY IDs: form="giftCardRedemptionForm", input="codeInput", button="submitButton"
- Design: Apple/Tesla aesthetic, bold typography, gradients from ${primaryColor} to ${accentColor}
- Sections: 1. Hero (full viewport, animated gradient, huge company name), 2. Redemption form (centered, 3D gift card visual, large input, trust badges), 3. Benefits (3 cards), 4. Footer
- Mobile responsive with Tailwind CSS
- Smooth animations and hover effects`;

    let generatedContent: string = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🎨 HTML generation attempt ${attempt}/3`);
        let html = await callLovableAI([{ role: "user", content: htmlPrompt }], false);
        console.log(`📝 Received HTML content (${html.length} chars)`);
        
        const mdMatch = html.match(/```(?:html)?\s*\n?([\s\S]*?)\n?```/);
        if (mdMatch) html = mdMatch[1];
        if (!html.includes('<!DOCTYPE html>') && html.includes('<html')) {
          html = '<!DOCTYPE html>\n' + html.substring(html.indexOf('<html'));
        }
        
        const validation = validateGeneratedHTML(html);
        if (!validation.valid) {
          console.log(`⚠️ Validation issues:`, validation.errors);
          if (attempt === 3) {
            return Response.json({ error: "Generated HTML validation failed", details: validation.errors }, { status: 500, headers: corsHeaders });
          }
        } else {
          generatedContent = html;
          console.log(`✅ HTML generation successful`);
          break;
        }
      } catch (error) {
        console.error(`❌ Exception on attempt ${attempt}:`, error);
        if (attempt === 3) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return Response.json({ error: "HTML generation failed", details: errorMsg }, { status: 500, headers: corsHeaders });
        }
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
    return Response.json({ success: true, id: landingPage.id, slug: landingPage.slug, previewUrl: `/p/${landingPage.slug}`, extractedBranding, branding: extractedBranding }, { headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return Response.json({ error: "Unexpected error", details: errorMessage }, { status: 500, headers: corsHeaders });
  }
});

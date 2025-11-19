import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validateGrapesJSComponent(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lowerHTML = html.toLowerCase();
  
  // GrapesJS should NOT have these
  if (lowerHTML.includes('<!doctype')) errors.push('Contains DOCTYPE (not allowed for GrapesJS)');
  if (lowerHTML.includes('<html')) errors.push('Contains <html> tag (not allowed for GrapesJS)');
  if (lowerHTML.includes('<head')) errors.push('Contains <head> tag (not allowed for GrapesJS)');
  if (lowerHTML.includes('<body')) errors.push('Contains <body> tag (not allowed for GrapesJS)');
  
  // Must have required IDs
  if (!html.includes('id="redemption-form"')) errors.push('Missing id="redemption-form"');
  if (!html.includes('id="gift-card-code"')) errors.push('Missing id="gift-card-code"');
  if (!html.includes('id="submit-button"')) errors.push('Missing id="submit-button"');
  
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

    // PHASE 2: GRAPESJS COMPONENT GENERATION
    console.log("🎨 Starting GrapesJS component generation...");
    const { primaryColor, accentColor } = extractedBranding;
    const giftCardFormatted = `${giftCardBrand} $${giftCardValue}`;
    
    const htmlPrompt = `You are a world-class web designer creating a beautiful gift card redemption component.

BRANDING:
${JSON.stringify(extractedBranding, null, 2)}

GIFT CARD: ${giftCardFormatted}
USER ACTION: ${userAction}

🚨 CRITICAL GRAPESJS REQUIREMENTS - DO NOT VIOLATE THESE:
1. ❌ NEVER include: <!DOCTYPE>, <html>, <head>, <body>, <style>, or <script> tags
2. ✅ START IMMEDIATELY with a <div> or <section> element
3. ✅ ALL styles MUST be inline using style="" attributes
4. ✅ Include these EXACT element IDs:
   - id="redemption-form" on the <form> element
   - id="gift-card-code" on the <input> element
   - id="submit-button" on the submit <button>

IMPORTANT: Your response should START with "<div" or "<section" - nothing before it!

DESIGN STRUCTURE:
- Hero section: Gradient background using ${primaryColor} and ${accentColor}, company name, compelling headline
- How it works section: 3 simple steps with icons
- Redemption form: Prominent, centered, easy to use
- Benefits section: Trust indicators, why redeem
- Footer: Company info, legal

STYLING REQUIREMENTS (inline only):
- Responsive using max-width and percentages
- Modern gradients: linear-gradient(135deg, ${primaryColor}, ${accentColor})
- Font families: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Padding/margins for proper spacing
- Border-radius for modern look (8px-16px)
- Box shadows for depth
- Hover effects using :hover pseudo-class where applicable
- High contrast for readability

EXAMPLE STRUCTURE:
<div style="font-family: -apple-system, sans-serif; margin: 0; padding: 0;">
  <header style="background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); padding: 80px 20px; text-align: center; color: white;">
    <h1 style="margin: 0 0 20px; font-size: 48px; font-weight: bold;">[Company Name]</h1>
    <p style="font-size: 24px; margin: 0;">[Compelling headline about gift card]</p>
  </header>
  
  <section style="padding: 60px 20px; max-width: 1200px; margin: 0 auto;">
    <!-- Content sections -->
  </section>
  
  <section style="padding: 60px 20px; background: #f9fafb;">
    <div style="max-width: 600px; margin: 0 auto;">
      <form id="redemption-form" style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Enter Your Code</label>
        <input id="gift-card-code" type="text" placeholder="XXXX-XXXX-XXXX" style="width: 100%; padding: 16px; font-size: 18px; border: 2px solid #d1d5db; border-radius: 8px; margin-bottom: 16px;" />
        <button id="submit-button" type="submit" style="width: 100%; padding: 18px; background: ${accentColor}; color: white; border: none; border-radius: 8px; font-size: 20px; font-weight: 600; cursor: pointer;">Claim Your Gift Card</button>
      </form>
    </div>
  </section>
</div>

Return ONLY the component HTML (no DOCTYPE, no explanations, no markdown blocks).`;

    let generatedContent: string = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🎨 Component generation attempt ${attempt}/3`);
        let html = await callLovableAI([{ role: "user", content: htmlPrompt }], false);
        console.log(`📝 Received component HTML (${html.length} chars)`);
        
        // Strip markdown if present
        const mdMatch = html.match(/```(?:html)?\s*\n?([\s\S]*?)\n?```/);
        if (mdMatch) html = mdMatch[1].trim();
        
        // Auto-fix: Strip DOCTYPE, html, head, body tags if present
        html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
        html = html.replace(/<\/?html[^>]*>/gi, '');
        html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
        html = html.replace(/<\/?body[^>]*>/gi, '');
        html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        html = html.trim();
        
        const validation = validateGrapesJSComponent(html);
        if (!validation.valid) {
          console.log(`⚠️ Validation issues:`, validation.errors);
          if (attempt === 3) {
            return Response.json({ error: "Component validation failed", details: validation.errors }, { status: 500, headers: corsHeaders });
          }
        } else {
          generatedContent = html;
          console.log(`✅ GrapesJS component generation successful`);
          break;
        }
      } catch (error) {
        console.error(`❌ Exception on attempt ${attempt}:`, error);
        if (attempt === 3) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return Response.json({ error: "Component generation failed", details: errorMsg }, { status: 500, headers: corsHeaders });
        }
        await exponentialBackoff(attempt);
      }
    }
    
    if (!generatedContent) {
      return Response.json({ error: "Failed to generate valid component" }, { status: 500, headers: corsHeaders });
    }

    // SAVE IN GRAPESJS FORMAT
    const slug = `${extractedBranding.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const { data: landingPage, error: insertError } = await supabase.from("landing_pages").insert({
      client_id: clientId,
      name: `${extractedBranding.companyName} - Gift Card Redemption`,
      slug,
      html_content: null, // GrapesJS doesn't use html_content
      content_json: {
        pages: [{
          name: "Home",
          component: generatedContent
        }],
        branding: extractedBranding,
        giftCard: { brand: giftCardBrand, value: giftCardValue },
        userAction
      },
      ai_generated: true,
      published: false,
      editor_type: 'grapesjs',
      created_by_user_id: user.id
    }).select().single();

    if (insertError) {
      console.error("Save error:", insertError);
      return Response.json({ error: "Failed to save landing page", details: insertError.message }, { status: 500, headers: corsHeaders });
    }
    
    console.log(`✅ Landing page saved: ${landingPage.id}`);
    return Response.json({ 
      success: true, 
      id: landingPage.id, 
      slug: landingPage.slug, 
      previewUrl: `/p/${landingPage.slug}`, 
      extractedBranding 
    }, { headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return Response.json({ error: "Unexpected error", details: errorMessage }, { status: 500, headers: corsHeaders });
  }
});

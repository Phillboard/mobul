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
    
    const htmlPrompt = `You are a world-class web designer creating a beautiful gift card redemption page for GrapesJS editor.

BRANDING:
${JSON.stringify(extractedBranding, null, 2)}

GIFT CARD: ${giftCardFormatted}
USER ACTION: ${userAction}

🚨 CRITICAL GRAPESJS REQUIREMENTS - DO NOT VIOLATE THESE:
1. ❌ NEVER include: <!DOCTYPE>, <html>, <head>, <body>, <style>, or <script> tags
2. ✅ START IMMEDIATELY with a <div> or <section> element (no text before tags)
3. ✅ ALL styles MUST be inline using style="" attributes (no external CSS)
4. ✅ Use simple, semantic HTML structure (div, section, header, form, button, input, p, h1-h6)
5. ✅ Include these EXACT element IDs:
   - id="redemption-form" on the <form> element
   - id="gift-card-code" on the <input> element
   - id="submit-button" on the submit <button>
6. ✅ Keep nesting reasonable (avoid deeply nested structures)
7. ✅ Use clear, editable text content (avoid complex text formatting)

IMPORTANT: Your response MUST start with "<div" or "<section" - absolutely nothing before the opening tag!

🎨 MODERN DESIGN REQUIREMENTS:

1. HERO SECTION (must be visually stunning):
   - Full-width gradient background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)
   - Large, bold typography (h1: 56px-72px, tagline: 24px-28px)
   - Generous padding (100px-120px vertical, 40px horizontal)
   - White text with subtle text shadows for depth
   - Consider adding a semi-transparent overlay pattern
   - Company logo/name prominently displayed

2. HOW IT WORKS SECTION (visual step-by-step):
   - 3-4 steps in a horizontal grid
   - Large emoji icons (64px) or icon placeholders (🎁 💳 ✨ 🎉)
   - Step numbers in large, colored circles
   - Short, clear descriptions
   - Use of accent colors for visual interest
   - Background: light gradient or subtle pattern

3. REDEMPTION FORM (centerpiece):
   - Maximum width 600px, centered
   - Elevated card design with prominent shadow (0 10px 40px rgba(0,0,0,0.12))
   - 50-60px padding inside card
   - Large input field (56px height) with clear borders
   - Prominent CTA button (full-width, 56px height, bold text)
   - Button gradient matching brand colors
   - Icon above form (🎁 or 💳 at 80px size)
   - Clear microcopy explaining the process

4. BENEFITS/TRUST SECTION:
   - 3-4 benefit cards in grid layout
   - Icons for each benefit (✓ 🔒 ⚡ 💯)
   - Short headlines with supporting text
   - Subtle background colors or borders
   - Use brand accent colors strategically

5. FOOTER:
   - Subtle background (#f8f9fa or light brand tint)
   - Company info, support links
   - Legal/privacy text (small, 14px)
   - Proper spacing and organization

STYLING EXCELLENCE (inline styles only):
- Font system: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif
- Typography scale: 14px, 16px, 20px, 24px, 32px, 48px, 64px
- Line heights: 1.5 for body, 1.2 for headlines
- Color contrast: Ensure WCAG AA minimum (4.5:1 for text)
- Spacing scale: 8px, 16px, 24px, 32px, 48px, 64px, 80px, 120px
- Border radius: 8px (small), 16px (medium), 24px (large)
- Shadows: 
  - Small: 0 2px 8px rgba(0,0,0,0.08)
  - Medium: 0 4px 16px rgba(0,0,0,0.12)
  - Large: 0 10px 40px rgba(0,0,0,0.15)
- Buttons: 16px padding vertical, 32px horizontal, bold text, rounded corners
- Inputs: 16px padding, clear borders (2px solid #e5e7eb), rounded (8px)
- Container max-widths: 1200px (full), 800px (content), 600px (forms)
- Responsive: Use max-width percentages (90%, 95%) and center with margin: 0 auto

VISUAL HIERARCHY:
- Use size, weight, and color to create clear hierarchy
- Generous whitespace between sections (80px-120px)
- Consistent alignment (center for hero, left for content)
- Color pops: Use accent color strategically (15-20% of design)
- Clear visual flow from top to bottom

EXAMPLE STRUCTURE:
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; line-height: 1.6; color: #1f2937;">
  <!-- HERO -->
  <header style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); padding: 120px 40px; text-align: center; color: white; position: relative;">
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="font-size: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; opacity: 0.95;">[Company Name]</div>
      <h1 style="margin: 0 0 24px; font-size: 64px; font-weight: 800; line-height: 1.1; text-shadow: 0 2px 20px rgba(0,0,0,0.1);">[Exciting Headline]</h1>
      <p style="font-size: 24px; margin: 0; opacity: 0.95; font-weight: 300;">[Compelling subheadline about the gift card]</p>
    </div>
  </header>
  
  <!-- HOW IT WORKS -->
  <section style="padding: 100px 40px; max-width: 1200px; margin: 0 auto; text-align: center;">
    <h2 style="font-size: 48px; font-weight: 700; margin: 0 0 64px; color: #111827;">How It Works</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 48px;">
      <div style="padding: 32px;">
        <div style="font-size: 64px; margin-bottom: 24px;">🎁</div>
        <div style="width: 48px; height: 48px; background: ${accentColor}; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin-bottom: 16px;">1</div>
        <h3 style="font-size: 24px; font-weight: 600; margin: 16px 0; color: #111827;">Step Title</h3>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">Step description</p>
      </div>
      <!-- Repeat for 2-3 more steps -->
    </div>
  </section>
  
  <!-- REDEMPTION FORM -->
  <section style="padding: 100px 40px; background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);">
    <div style="max-width: 600px; margin: 0 auto; text-align: center;">
      <div style="font-size: 80px; margin-bottom: 32px;">💳</div>
      <h2 style="font-size: 40px; font-weight: 700; margin: 0 0 16px; color: #111827;">Claim Your Reward</h2>
      <p style="font-size: 18px; color: #6b7280; margin: 0 0 40px;">Enter your unique code to redeem your ${giftCardFormatted}</p>
      
      <form id="redemption-form" style="background: white; padding: 48px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); text-align: left;">
        <label style="display: block; margin-bottom: 12px; font-weight: 600; font-size: 16px; color: #374151;">Gift Card Code</label>
        <input id="gift-card-code" type="text" placeholder="XXXX-XXXX-XXXX" style="width: 100%; padding: 16px; font-size: 18px; border: 2px solid #d1d5db; border-radius: 8px; margin-bottom: 20px; box-sizing: border-box;" />
        <button id="submit-button" type="submit" style="width: 100%; padding: 18px; background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); color: white; border: none; border-radius: 12px; font-size: 20px; font-weight: 700; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">Claim Your Gift Card</button>
        <p style="margin-top: 16px; font-size: 14px; color: #9ca3af; text-align: center;">Your information is secure and encrypted</p>
      </form>
    </div>
  </section>
  
  <!-- BENEFITS -->
  <section style="padding: 100px 40px; max-width: 1200px; margin: 0 auto;">
    <h2 style="font-size: 40px; font-weight: 700; text-align: center; margin: 0 0 64px; color: #111827;">Why Choose Us</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px;">
      <div style="text-align: center; padding: 32px; background: #f9fafb; border-radius: 16px;">
        <div style="font-size: 56px; margin-bottom: 20px;">✓</div>
        <h3 style="font-size: 22px; font-weight: 600; margin: 0 0 12px; color: #111827;">Instant Delivery</h3>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0;">Get your reward immediately after verification</p>
      </div>
      <div style="text-align: center; padding: 32px; background: #f9fafb; border-radius: 16px;">
        <div style="font-size: 56px; margin-bottom: 20px;">🔒</div>
        <h3 style="font-size: 22px; font-weight: 600; margin: 0 0 12px; color: #111827;">Secure Process</h3>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0;">Your data is protected with enterprise-grade security</p>
      </div>
      <div style="text-align: center; padding: 32px; background: #f9fafb; border-radius: 16px;">
        <div style="font-size: 56px; margin-bottom: 20px;">💯</div>
        <h3 style="font-size: 22px; font-weight: 600; margin: 0 0 12px; color: #111827;">100% Guaranteed</h3>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0;">Every code is verified and honored</p>
      </div>
    </div>
  </section>
  
  <!-- FOOTER -->
  <footer style="background: #f3f4f6; padding: 60px 40px 40px; margin-top: 60px; text-align: center; color: #6b7280;">
    <div style="max-width: 1200px; margin: 0 auto;">
      <div style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px;">[Company Name]</div>
      <p style="font-size: 14px; margin: 0 0 24px;">Questions? Contact support@company.com</p>
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">© 2024 [Company Name]. All rights reserved. | Privacy Policy | Terms of Service</p>
    </div>
  </footer>
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

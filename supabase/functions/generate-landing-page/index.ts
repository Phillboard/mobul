import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Import template system (inline for edge function)
const templates = {
  modernLuxury: { id: "modern-luxury", name: "Modern Luxury" },
  boldEnergetic: { id: "bold-energetic", name: "Bold & Energetic" },
  professionalTrust: { id: "professional-trust", name: "Professional Trust" }
};

function selectTemplateByIndustry(industry: string): string {
  const industryMap: Record<string, string> = {
    auto: "modern-luxury",
    realestate: "modern-luxury",
    financial: "professional-trust",
    fitness: "bold-energetic",
    restaurant: "bold-energetic",
    healthcare: "professional-trust"
  };
  
  for (const [key, templateId] of Object.entries(industryMap)) {
    if (industry.toLowerCase().includes(key)) return templateId;
  }
  
  return "modern-luxury"; // Default
}

function validateGeneratedHTML(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Flexible validation - check for essential structure
  if (!html.includes('<!DOCTYPE html>')) errors.push('Missing DOCTYPE');
  if (!html.includes('<html')) errors.push('Missing html tag');
  if (!html.includes('form') && !html.includes('giftCardRedemptionForm')) {
    errors.push('Missing redemption form');
  }
  
  return { valid: errors.length === 0, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ error: "No authorization header" }, { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { sourceType, sourceUrl, sourceImage, sourceDescription, clientId, giftCardBrand, giftCardValue, userAction } = await req.json();
    
    console.log("Request params:", { sourceType, clientId, giftCardBrand, userAction });

    if (!sourceType || !clientId || !giftCardBrand || !userAction) {
      return Response.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    // Build extraction prompt based on source type
    let extractionPrompt = "";
    const extractionMessages: any[] = [];
    
    if (sourceType === "url") {
      if (!sourceUrl) {
        return Response.json({ error: "URL is required for url source type" }, { status: 400, headers: corsHeaders });
      }
      extractionPrompt = `Analyze this company website URL and extract detailed branding information: ${sourceUrl}

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "companyName": "Company Name",
  "industry": "industry type",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "backgroundColor": "#hexcolor (light neutral background)",
  "textColor": "#hexcolor (dark readable text)",
  "tagline": "compelling tagline",
  "designStyle": "modern/minimalist/bold/professional/luxury",
  "emotionalTone": "friendly/professional/exciting/trustworthy",
  "fontStyle": "sans-serif/serif recommendation",
  "logoUrl": "if visible on site"
}`;
      extractionMessages.push({ role: "user", content: extractionPrompt });
    } else if (sourceType === "image") {
      if (!sourceImage) {
        return Response.json({ error: "Image is required for image source type" }, { status: 400, headers: corsHeaders });
      }
      extractionMessages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this marketing flyer/image and extract detailed branding information.

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "companyName": "Company Name",
  "industry": "industry type",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "backgroundColor": "#hexcolor (light neutral background)",
  "textColor": "#hexcolor (dark readable text)",
  "tagline": "compelling tagline",
  "designStyle": "modern/minimalist/bold/professional/luxury",
  "emotionalTone": "friendly/professional/exciting/trustworthy",
  "fontStyle": "sans-serif/serif recommendation",
  "logoUrl": "if visible in image"
}`
          },
          {
            type: "image_url",
            image_url: { url: sourceImage }
          }
        ]
      });
    } else if (sourceType === "description") {
      if (!sourceDescription) {
        return Response.json({ error: "Description is required for description source type" }, { status: 400, headers: corsHeaders });
      }
      extractionPrompt = `Based on this business description, infer detailed company branding: "${sourceDescription}"

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "companyName": "inferred company name",
  "industry": "inferred industry type",
  "primaryColor": "#hexcolor (appropriate for the industry)",
  "accentColor": "#hexcolor (complementary color)",
  "backgroundColor": "#f8f9fa or appropriate light color",
  "textColor": "#1a1a1a or appropriate dark color",
  "tagline": "compelling suggested tagline",
  "designStyle": "modern/minimalist/bold/professional/luxury (based on industry)",
  "emotionalTone": "friendly/professional/exciting/trustworthy (based on industry)",
  "fontStyle": "sans-serif/serif recommendation"
}`;
      extractionMessages.push({ role: "user", content: extractionPrompt });
    } else {
      return Response.json({ error: "Invalid source type" }, { status: 400, headers: corsHeaders });
    }

    // Extract branding using AI with retry logic
    let extractedBranding;
    let extractionAttempts = 0;
    const maxAttempts = 3;

    while (extractionAttempts < maxAttempts) {
      extractionAttempts++;
      console.log(`Branding extraction attempt ${extractionAttempts}/${maxAttempts}...`);
      
      try {
        const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`
          },
          body: JSON.stringify({
            model: "openai/gpt-5",
            response_format: { type: "json_object" },
            messages: extractionMessages,
            max_completion_tokens: 6000
          }),
        });

        if (!extractionResponse.ok) {
          const errorText = await extractionResponse.text();
          console.error(`Attempt ${extractionAttempts} - Extraction API error:`, extractionResponse.status, errorText);
          if (extractionAttempts === maxAttempts) {
            return Response.json({ 
              error: `GPT-5 extraction failed after ${maxAttempts} attempts: ${extractionResponse.status}`,
              details: "The AI model encountered an error. Please try again."
            }, { status: 500, headers: corsHeaders });
          }
          continue;
        }

        const extractionData = await extractionResponse.json();
        console.log(`Attempt ${extractionAttempts} - Extraction response received`);

        // Log token usage
        if (extractionData.usage) {
          console.log("Branding extraction token usage:", {
            total: extractionData.usage.completion_tokens,
            prompt: extractionData.usage.prompt_tokens,
            reasoning: extractionData.usage.completion_tokens_details?.reasoning_tokens || 0,
            output: extractionData.usage.completion_tokens - (extractionData.usage.completion_tokens_details?.reasoning_tokens || 0)
          });
        }

        if (!extractionData.choices?.[0]?.message?.content) {
          console.error(`Attempt ${extractionAttempts} - Invalid response structure:`, extractionData);
          if (extractionAttempts === maxAttempts) {
            return Response.json({ 
              error: "GPT-5 returned invalid response structure after all attempts",
              details: "The AI model needs more processing capacity. Please try again."
            }, { status: 500, headers: corsHeaders });
          }
          continue;
        }

        const content = extractionData.choices[0].message.content;
        
        try {
          extractedBranding = JSON.parse(content);
          console.log(`✓ Branding extracted successfully on attempt ${extractionAttempts}`);
          break;
        } catch {
          const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            extractedBranding = JSON.parse(jsonMatch[1]);
            console.log(`✓ Branding extracted from markdown on attempt ${extractionAttempts}`);
            break;
          } else {
            console.error(`Attempt ${extractionAttempts} - Could not parse branding from:`, content);
            if (extractionAttempts === maxAttempts) {
              return Response.json({ 
                error: "GPT-5 returned unparseable response after all attempts",
                details: "The AI model's response could not be parsed. Please try again."
              }, { status: 500, headers: corsHeaders });
            }
            continue;
          }
        }
      } catch (error) {
        console.error(`Attempt ${extractionAttempts} - Unexpected error:`, error);
        if (extractionAttempts === maxAttempts) {
          return Response.json({ 
            error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
            details: "An unexpected error occurred. Please try again."
          }, { status: 500, headers: corsHeaders });
        }
      }
    }

    const { companyName, industry, primaryColor, accentColor, tagline } = extractedBranding;
    console.log("Extracted branding:", { companyName, industry, primaryColor, accentColor });

    // Generate complete branded HTML landing page
    console.log("Generating complete HTML landing page...");
    
    const htmlPrompt = `⚠️ CRITICAL REQUIREMENTS - YOU MUST INCLUDE THESE EXACT IDs ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE FORM MUST HAVE THESE EXACT IDs OR THE PAGE WILL NOT WORK:
1. <form id="giftCardRedemptionForm"> ← REQUIRED
2. <input id="codeInput"> ← REQUIRED  
3. <button id="submitButton"> ← REQUIRED

DO NOT CHANGE THESE IDS. DO NOT OMIT THESE IDS. COPY THEM EXACTLY.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 DESIGN MISSION: CREATE A PREMIUM, VISUALLY STUNNING LANDING PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This MUST look like a $10,000 custom-designed landing page, NOT a generic template.
Think Apple, Tesla, luxury brands - premium, modern, sophisticated, visually striking.

REQUIRED VISUAL ELEMENTS (YOU MUST INCLUDE ALL):
✓ Bold, attention-grabbing gradients using brand colors
✓ Smooth animations on scroll and hover
✓ Large, impactful typography (text-6xl to text-9xl)
✓ Deep shadows and 3D depth effects
✓ Glassmorphism or neumorphism design elements
✓ Subtle background patterns or textures
✓ Strategic use of white space
✓ Premium color combinations and contrasts
✓ Interactive hover states on all elements

You are creating a premium landing page for:

BRANDING CONTEXT:
- Company: ${companyName}
- Industry: ${industry}
- Primary Brand Color: ${primaryColor}
- Accent Color: ${accentColor}
- Background: ${extractedBranding.backgroundColor || '#f8f9fa'}
- Text Color: ${extractedBranding.textColor || '#1a1a1a'}
- Design Style: ${extractedBranding.designStyle || 'modern'}
- Emotional Tone: ${extractedBranding.emotionalTone || 'professional'}
- Tagline: ${tagline || 'Professional service you can trust'}
- Customer Action: ${userAction}
- Gift Card Reward: $${giftCardValue} ${giftCardBrand}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY DESIGN PATTERN - USE EXACTLY THIS STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU MUST FOLLOW THIS EXACT STRUCTURE. DO NOT SIMPLIFY OR SKIP ELEMENTS.

1. HERO SECTION - Full-screen, bold, immersive experience:

<section class="relative min-h-screen overflow-hidden flex items-center justify-center">
  <!-- Dynamic gradient background with multiple layers -->
  <div class="absolute inset-0 bg-gradient-to-br from-[${primaryColor}] via-[${accentColor}] to-[${primaryColor}]/80"></div>
  
  <!-- Animated mesh gradient overlay -->
  <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent"></div>
  
  <!-- Subtle pattern overlay -->
  <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\\"100\\" height=\\"100\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cpath d=\\"M50 0L100 50L50 100L0 50Z\\" fill=\\"none\\" stroke=\\"white\\" stroke-width=\\"2\\"/%3E%3C/svg%3E'); background-size: 100px 100px;"></div>
  
  <!-- Large animated blobs for depth -->
  <div class="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
  <div class="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
  
  <!-- Content -->
  <div class="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center">
    <!-- Company badge with glassmorphism -->
    <div class="inline-flex items-center gap-3 backdrop-blur-xl bg-white/20 border border-white/30 rounded-full px-8 py-4 mb-12 shadow-2xl">
      <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
      <span class="text-white font-bold text-xl tracking-wide">${companyName}</span>
    </div>
    
    <!-- Massive hero headline -->
    <h1 class="text-7xl md:text-9xl font-black text-white mb-8 leading-[0.9] tracking-tight drop-shadow-2xl">
      <span class="block animate-fade-in-up">Congratulations!</span>
      <span class="block text-white/90 mt-4 animate-fade-in-up" style="animation-delay: 0.2s;">You've Earned</span>
      <span class="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-100 to-white mt-4 animate-fade-in-up" style="animation-delay: 0.4s;">Your Reward</span>
    </h1>
    
    <!-- Compelling subheadline -->
    <p class="text-3xl md:text-5xl font-bold text-white/95 mb-16 max-w-4xl mx-auto leading-tight drop-shadow-lg animate-fade-in-up" style="animation-delay: 0.6s;">
      Claim your <span class="text-yellow-200">$${giftCardValue}</span> ${giftCardBrand} gift card for ${userAction.toLowerCase()}
    </p>
    
    <!-- Scroll indicator -->
    <div class="animate-bounce mt-20" style="animation-delay: 1s;">
      <div class="w-8 h-14 border-4 border-white/40 rounded-full mx-auto relative">
        <div class="w-2 h-3 bg-white rounded-full absolute left-1/2 top-3 -translate-x-1/2 animate-pulse"></div>
      </div>
      <p class="text-white/70 text-sm font-semibold mt-4 tracking-widest uppercase">Scroll to Claim</p>
    </div>
  </div>
</section>

2. REDEMPTION SECTION - Premium card design with depth and interactivity:

<section class="relative py-32 px-6 bg-gradient-to-b from-gray-50 via-white to-gray-50">
  <!-- Background decorative elements -->
  <div class="absolute inset-0 overflow-hidden">
    <div class="absolute -top-40 -left-40 w-80 h-80 bg-[${primaryColor}]/10 rounded-full blur-3xl"></div>
    <div class="absolute top-1/2 -right-40 w-80 h-80 bg-[${accentColor}]/10 rounded-full blur-3xl"></div>
  </div>
  
  <div class="relative z-10 max-w-3xl mx-auto">
    <!-- Section heading -->
    <div class="text-center mb-16">
      <h2 class="text-5xl md:text-6xl font-black text-gray-900 mb-6">Your Exclusive Reward</h2>
      <p class="text-2xl text-gray-600 font-semibold">Just one step away from your gift card</p>
    </div>
    
    <!-- Premium gift card with 3D effect -->
    <div class="relative group">
      <!-- Glow effect -->
      <div class="absolute -inset-4 bg-gradient-to-r from-[${primaryColor}]/30 via-[${accentColor}]/30 to-[${primaryColor}]/30 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <!-- Main card -->
      <div class="relative bg-gradient-to-br from-[${primaryColor}] via-[${accentColor}] to-[${primaryColor}]/90 rounded-3xl shadow-2xl overflow-hidden transform group-hover:scale-[1.02] transition-all duration-500">
        <!-- Shine effect -->
        <div class="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:skew-x-12 transition-transform duration-700"></div>
        
        <!-- Light spots -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div class="relative z-10 p-12 md:p-16">
          <!-- Gift card value display -->
          <div class="text-center mb-12 space-y-4">
            <div class="inline-flex items-center gap-4 backdrop-blur-sm bg-white/20 rounded-2xl px-8 py-4 border border-white/30">
              <svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-white/90 text-2xl font-bold tracking-wide">${giftCardBrand} Gift Card</span>
            </div>
            
            <div class="space-y-2">
              <p class="text-9xl md:text-[10rem] font-black text-white drop-shadow-2xl leading-none tracking-tighter">$${giftCardValue}</p>
              <p class="text-2xl text-white/80 font-bold">Redeemable Now</p>
            </div>
          </div>
          
          <!-- Redemption form -->
          <form id="giftCardRedemptionForm" class="space-y-8">
            <div class="space-y-4">
              <label for="codeInput" class="block text-center">
                <span class="text-white text-2xl font-bold tracking-wide">Enter Your Unique Code</span>
                <span class="block text-white/70 text-base font-medium mt-2">Found on your postcard</span>
              </label>
              
              <input 
                type="text" 
                id="codeInput"
                placeholder="XXXX-XXXX-XXXX"
                class="w-full px-8 py-6 text-center text-4xl font-black tracking-widest rounded-2xl bg-white shadow-2xl border-4 border-white/50 focus:border-white focus:ring-8 focus:ring-white/30 focus:outline-none transition-all duration-300 text-gray-900 placeholder-gray-300 uppercase"
                required
                autocomplete="off"
                maxlength="20"
              />
            </div>
            
            <button 
              type="submit"
              id="submitButton"
              class="group relative w-full overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-105"
            >
              <div class="absolute inset-0 bg-white"></div>
              <div class="absolute inset-0 bg-gradient-to-r from-white via-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span class="relative block px-12 py-6 text-3xl font-black bg-gradient-to-r from-[${primaryColor}] to-[${accentColor}] bg-clip-text text-transparent">
                Claim My Gift Card →
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Trust indicators -->
    <div class="mt-16 text-center space-y-4">
      <div class="flex items-center justify-center gap-3 text-gray-600">
        <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <span class="text-lg font-semibold">Secure & Instant</span>
      </div>
      <p class="text-gray-500 max-w-md mx-auto">Your code is encrypted and your gift card will be available immediately after validation</p>
    </div>
  </div>
</section>

3. BENEFITS SECTION (Industry-specific with icons):
<section class="py-32 px-4 bg-white">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-20">
      <h2 class="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-[${primaryColor}] to-[${accentColor}] bg-clip-text text-transparent">
        Why Choose ${companyName}?
      </h2>
      <p class="text-2xl text-gray-600 font-semibold max-w-3xl mx-auto">
        ${tagline}
      </p>
    </div>
    
    <div class="grid md:grid-cols-3 gap-10">
      <div class="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-gradient-to-br from-[${primaryColor}] to-[${accentColor}] shadow-lg group-hover:scale-110 transition-transform duration-300">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>
        <h3 class="text-3xl font-black mb-4 text-gray-900">Benefit One</h3>
        <p class="text-gray-600 text-lg leading-relaxed">Industry-specific value proposition that resonates with ${industry} customers.</p>
      </div>
      
      <div class="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-gradient-to-br from-[${primaryColor}] to-[${accentColor}] shadow-lg group-hover:scale-110 transition-transform duration-300">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <h3 class="text-3xl font-black mb-4 text-gray-900">Benefit Two</h3>
        <p class="text-gray-600 text-lg leading-relaxed">Another compelling reason why customers choose ${companyName}.</p>
      </div>
      
      <div class="group bg-gradient-to-br from-gray-50 to-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100">
        <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-gradient-to-br from-[${primaryColor}] to-[${accentColor}] shadow-lg group-hover:scale-110 transition-transform duration-300">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 class="text-3xl font-black mb-4 text-gray-900">Benefit Three</h3>
        <p class="text-gray-600 text-lg leading-relaxed">Final key benefit that drives customer decisions.</p>
      </div>
    </div>
  </div>
</section>

4. CTA FOOTER (Bold, branded, actionable):
<footer class="py-24 px-4 bg-gradient-to-br from-[${primaryColor}] to-[${accentColor}] relative overflow-hidden">
  <div class="absolute inset-0 bg-black/10"></div>
  <div class="max-w-4xl mx-auto text-center relative z-10">
    <h3 class="text-5xl md:text-6xl font-black mb-8 text-white drop-shadow-lg">
      Ready to Experience Excellence?
    </h3>
    <p class="text-2xl mb-12 text-white/90 font-semibold">
      Contact ${companyName} today
    </p>
    <div class="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
      <a 
        href="tel:+1234567890" 
        class="inline-flex items-center gap-3 bg-white text-gray-900 font-black text-xl px-10 py-5 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
        </svg>
        Call Now
      </a>
      <a 
        href="mailto:info@company.com" 
        class="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white font-black text-xl px-10 py-5 rounded-2xl shadow-2xl hover:bg-white hover:text-gray-900 transition-all duration-300"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        Email Us
      </a>
    </div>
    <p class="text-white/75 text-lg">
      © 2025 ${companyName}. ${tagline}
    </p>
  </div>
</footer>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED HTML STRUCTURE:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You - ${companyName}</title>
  <meta name="description" content="Claim your $${giftCardValue} ${giftCardBrand} gift card from ${companyName}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Premium animations */
    @keyframes fade-in { 
      from { opacity: 0; } 
      to { opacity: 1; } 
    }
    @keyframes fade-in-up { 
      from { 
        opacity: 0; 
        transform: translateY(40px); 
      } 
      to { 
        opacity: 1; 
        transform: translateY(0); 
      } 
    }
    @keyframes slide-up { 
      from { 
        opacity: 0; 
        transform: translateY(30px); 
      } 
      to { 
        opacity: 1; 
        transform: translateY(0); 
      } 
    }
    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    
    .animate-fade-in { animation: fade-in 1.2s ease-out forwards; }
    .animate-fade-in-up { animation: fade-in-up 1s ease-out forwards; opacity: 0; }
    .animate-slide-up { animation: slide-up 0.8s ease-out forwards; opacity: 0; }
    .animate-scale-in { animation: scale-in 0.6s ease-out forwards; opacity: 0; }
    
    /* Smooth scrolling */
    html { scroll-behavior: smooth; }
    
    /* Custom focus states for accessibility */
    *:focus-visible {
      outline: 3px solid rgba(59, 130, 246, 0.5);
      outline-offset: 2px;
    }
  </style>

</head>
<body class="antialiased">
  [ALL SECTIONS HERE]
</body>
</html>

DESIGN QUALITY REQUIREMENTS (MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VISUAL HIERARCHY & TYPOGRAPHY:
   ✓ Headlines: text-7xl to text-9xl, font-black, dramatic leading
   ✓ Subheadlines: text-3xl to text-5xl, font-bold
   ✓ Body: text-lg to text-2xl, never smaller than text-base
   ✓ Use tracking-tight for headlines, tracking-wide for labels

2. COLOR & GRADIENTS:
   ✓ Use brand colors [${primaryColor}] and [${accentColor}] as primary focus
   ✓ Multi-layer gradients: bg-gradient-to-br, bg-gradient-to-tr
   ✓ Transparency layers: /90, /80, /70 for depth
   ✓ White overlays: white/10, white/20 for glassmorphism

3. SPACING & LAYOUT:
   ✓ Generous padding: p-12, p-16, py-24, py-32
   ✓ Max-width constraints: max-w-7xl, max-w-6xl for readability
   ✓ Gap between elements: gap-8, gap-12, gap-16

4. DEPTH & SHADOWS:
   ✓ Cards: shadow-2xl with hover:shadow-3xl
   ✓ Elements: drop-shadow-2xl for text
   ✓ Layered shadows for premium 3D effect
   ✓ Blur effects: blur-2xl, blur-3xl for ambient glow

5. INTERACTIVITY & ANIMATIONS:
   ✓ Hover states: hover:scale-105, hover:scale-110
   ✓ Transitions: transition-all duration-300 or duration-500
   ✓ Entrance animations: animate-fade-in-up with delays
   ✓ Smooth transforms on all interactive elements

6. MODERN DESIGN ELEMENTS:
   ✓ Glassmorphism: backdrop-blur-xl with bg-white/20
   ✓ Neumorphism for cards and buttons
   ✓ Gradient text: bg-clip-text text-transparent
   ✓ Rounded corners: rounded-2xl, rounded-3xl everywhere
   ✓ Border highlights: border-2 border-white/30

7. RESPONSIVE DESIGN:
   ✓ Mobile-first: Use sm:, md:, lg: prefixes extensively
   ✓ Stack on mobile: flex-col sm:flex-row
   ✓ Scale typography: text-5xl md:text-7xl lg:text-9xl
   ✓ Adjust padding: p-6 md:p-12 lg:p-16

8. ACCESSIBILITY:
   ✓ High contrast text on backgrounds
   ✓ Focus states with rings: focus:ring-8
   ✓ Semantic HTML structure
   ✓ Alt text for decorative SVGs

⚠️⚠️⚠️ FINAL REMINDER - THESE IDs ARE MANDATORY ⚠️⚠️⚠️
Your HTML MUST include:
- <form id="giftCardRedemptionForm">
- <input id="codeInput">
- <button id="submitButton">
Copy these EXACTLY from the example above!

OUTPUT FORMAT:
Return ONLY a JSON object with properly escaped HTML:
{
  "html": "complete HTML as escaped string",
  "metadata": {
    "title": "Thank You - ${companyName}",
    "description": "Claim your reward from ${companyName}"
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY STANDARD - READ THIS CAREFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This landing page MUST look like:
• A $10,000+ custom design from a top marketing agency
• Award-winning modern web design (Awwwards.com quality)
• 2024-2025 design trends: bold typography, dramatic gradients, smooth animations
• Apple/Tesla/luxury brand aesthetic: premium, sophisticated, clean
• Every element intentionally placed with purpose and beauty

DO NOT CREATE:
✗ Generic templates with bland colors
✗ Simple flat designs without depth
✗ Small text or cramped layouts
✗ Static pages without hover effects
✗ Plain white backgrounds without texture

DO CREATE:
✓ BOLD, attention-grabbing hero sections
✓ DRAMATIC gradients using brand colors
✓ LARGE typography (text-7xl to text-9xl)
✓ SMOOTH animations and transitions
✓ DEEP shadows and 3D depth effects
✓ PREMIUM glassmorphism and modern effects

Think LUXURY. Think PREMIUM. Think WOW FACTOR.`;


    // Generate HTML with retry logic
    let generatedContent;
    let htmlAttempts = 0;
    const maxHtmlAttempts = 3;

    while (htmlAttempts < maxHtmlAttempts) {
      htmlAttempts++;
      console.log(`HTML generation attempt ${htmlAttempts}/${maxHtmlAttempts}...`);
      
      try {
        const htmlResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`
          },
          body: JSON.stringify({
            model: "openai/gpt-5",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: htmlPrompt }],
            max_completion_tokens: 25000
          }),
        });

        if (!htmlResponse.ok) {
          const errorText = await htmlResponse.text();
          console.error(`Attempt ${htmlAttempts} - HTML generation API error:`, htmlResponse.status, errorText);
          if (htmlAttempts === maxHtmlAttempts) {
            return Response.json({ 
              error: `GPT-5 HTML generation failed after ${maxHtmlAttempts} attempts: ${htmlResponse.status}`,
              details: "The AI model encountered an error. Please try again."
            }, { status: 500, headers: corsHeaders });
          }
          continue;
        }

        const htmlData = await htmlResponse.json();
        console.log(`Attempt ${htmlAttempts} - HTML generation response received`);

        // Log token usage
        if (htmlData.usage) {
          console.log("HTML generation token usage:", {
            total: htmlData.usage.completion_tokens,
            prompt: htmlData.usage.prompt_tokens,
            reasoning: htmlData.usage.completion_tokens_details?.reasoning_tokens || 0,
            output: htmlData.usage.completion_tokens - (htmlData.usage.completion_tokens_details?.reasoning_tokens || 0)
          });
        }

        if (!htmlData.choices?.[0]?.message?.content) {
          console.error(`Attempt ${htmlAttempts} - Invalid HTML response structure:`, htmlData);
          if (htmlAttempts === maxHtmlAttempts) {
            return Response.json({ 
              error: "GPT-5 returned invalid HTML response after all attempts",
              details: "The AI model needs more processing capacity. Please try again."
            }, { status: 500, headers: corsHeaders });
          }
          continue;
        }

        const htmlContent = htmlData.choices[0].message.content;
        
        try {
          // Try to parse as JSON first
          try {
            generatedContent = JSON.parse(htmlContent);
          } catch {
            // Try to extract from markdown code blocks
            const jsonMatch = htmlContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              generatedContent = JSON.parse(jsonMatch[1]);
            } else {
              // If not JSON, wrap the HTML content
              generatedContent = {
                html: htmlContent,
                metadata: {
                  title: `Thank You - ${companyName}`,
                  description: `Claim your reward from ${companyName}`
                }
              };
            }
          }

          // Validate generated HTML
          const validation = validateGeneratedHTML(generatedContent.html);
          if (!validation.valid) {
            console.error(`Attempt ${htmlAttempts} - HTML validation failed:`, validation.errors);
            if (htmlAttempts === maxHtmlAttempts) {
              return Response.json({ 
                error: `Generated HTML validation failed after all attempts: ${validation.errors.join(', ')}`,
                details: "The generated HTML is missing required elements. Please try again."
              }, { status: 500, headers: corsHeaders });
            }
            continue;
          }
          
          console.log(`✓ HTML generated and validated successfully on attempt ${htmlAttempts}`);
          break;

        } catch (parseError) {
          console.error(`Attempt ${htmlAttempts} - Failed to parse HTML content:`, parseError);
          if (htmlAttempts === maxHtmlAttempts) {
            return Response.json({ 
              error: "Failed to parse HTML content after all attempts",
              details: "The AI model's HTML could not be parsed. Please try again."
            }, { status: 500, headers: corsHeaders });
          }
          continue;
        }
      } catch (error) {
        console.error(`Attempt ${htmlAttempts} - Unexpected error:`, error);
        if (htmlAttempts === maxHtmlAttempts) {
          return Response.json({ 
            error: `HTML generation failed: ${error instanceof Error ? error.message : String(error)}`,
            details: "An unexpected error occurred. Please try again."
          }, { status: 500, headers: corsHeaders });
        }
      }
    }

    // Create landing page in database with HTML content
    const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    
    const { data: lpData, error: lpError } = await supabase
      .from("landing_pages")
      .insert({
        client_id: clientId,
        name: `${companyName} - Gift Card Landing Page`,
        slug,
        content_json: {
          html: generatedContent.html,
          branding: extractedBranding,
          giftCard: {
            brand: giftCardBrand,
            value: giftCardValue,
            userAction
          }
        },
        html_content: generatedContent.html,
        meta_title: generatedContent.metadata?.title || `Thank You - ${companyName}`,
        meta_description: generatedContent.metadata?.description,
        editor_type: 'ai-html',
        ai_generated: true,
        ai_prompt: sourceDescription || sourceUrl || 'Generated from uploaded image',
        published: true,
        created_by_user_id: user.id,
      })
      .select()
      .single();

    if (lpError) {
      console.error("Database error:", lpError);
      return Response.json({ 
        error: `Database error: ${lpError.message}` 
      }, { status: 500, headers: corsHeaders });
    }

    console.log("Landing page created successfully:", lpData.id);
    return Response.json({ 
      success: true, 
      id: lpData.id,
      slug,
      previewUrl: `/p/${slug}`,
      extractedBranding 
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ 
      error: errorMessage 
    }, { status: 500, headers: corsHeaders });
  }
});

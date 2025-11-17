import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation function for generated HTML
function validateGeneratedHTML(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required form elements
  if (!html.includes('id="giftCardRedemptionForm"')) {
    errors.push('Missing required form with id="giftCardRedemptionForm"');
  }
  if (!html.includes('id="codeInput"')) {
    errors.push('Missing required input with id="codeInput"');
  }
  if (!html.includes('id="submitButton"')) {
    errors.push('Missing required button with id="submitButton"');
  }
  
  // Check for essential HTML structure
  if (!html.includes('<!DOCTYPE html>')) {
    errors.push('Missing DOCTYPE declaration');
  }
  if (!html.includes('<html')) {
    errors.push('Missing html tag');
  }
  if (!html.includes('tailwindcss')) {
    errors.push('Missing Tailwind CSS CDN');
  }
  
  // Check for basic content sections
  if (!html.includes('Thank You') && !html.includes('thank you')) {
    errors.push('Missing "Thank You" message');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
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

    // Extract branding using AI
    console.log("Calling AI for branding extraction...");
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
        max_completion_tokens: 2000
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error("Extraction API error:", extractionResponse.status, errorText);
      return Response.json({ 
        error: `AI extraction failed: ${extractionResponse.status} - ${errorText}` 
      }, { status: 500, headers: corsHeaders });
    }

    const extractionData = await extractionResponse.json();
    console.log("Extraction response successful");

    if (!extractionData.choices?.[0]?.message?.content) {
      console.error("Invalid extraction response structure:", extractionData);
      return Response.json({ 
        error: "AI returned invalid response structure" 
      }, { status: 500, headers: corsHeaders });
    }

    let extractedBranding;
    const content = extractionData.choices[0].message.content;
    
    try {
      // Try to parse JSON directly first
      extractedBranding = JSON.parse(content);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        extractedBranding = JSON.parse(jsonMatch[1]);
      } else {
        console.error("Could not parse branding from:", content);
        return Response.json({ 
          error: "AI returned unparseable response" 
        }, { status: 500, headers: corsHeaders });
      }
    }

    const { companyName, industry, primaryColor, accentColor, tagline } = extractedBranding;
    console.log("Extracted branding:", { companyName, industry, primaryColor, accentColor });

    // Generate complete branded HTML landing page
    console.log("Generating complete HTML landing page...");
    
    const htmlPrompt = `You are an expert web designer creating a premium, award-winning landing page. This should look like a professional marketing agency designed it, with modern 2024-2025 design trends.

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
CONCRETE DESIGN EXAMPLES - FOLLOW THESE PATTERNS EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. HERO SECTION (Full-screen branded experience):
<section class="min-h-screen bg-gradient-to-br from-[${primaryColor}] via-[${primaryColor}]/90 to-[${accentColor}] flex items-center justify-center px-4 py-20 relative overflow-hidden">
  <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
  <div class="max-w-5xl mx-auto text-center relative z-10">
    <div class="inline-block bg-white/20 backdrop-blur-sm rounded-full px-8 py-3 mb-8 animate-fade-in">
      <p class="text-white font-semibold text-lg">${companyName}</p>
    </div>
    <h1 class="text-6xl md:text-8xl lg:text-9xl font-black mb-8 text-white drop-shadow-2xl leading-none animate-slide-up">
      Thank You for<br/>${userAction}!
    </h1>
    <p class="text-2xl md:text-4xl text-white/95 font-bold mb-12 drop-shadow-lg animate-slide-up animation-delay-200">
      Your $${giftCardValue} ${giftCardBrand} Gift Card is Ready to Claim
    </p>
    <div class="animate-bounce mt-16">
      <svg class="w-14 h-14 mx-auto text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
      </svg>
    </div>
  </div>
</section>

2. GIFT CARD REDEMPTION (3D-style card with gorgeous gradients):
<section class="py-24 px-4 bg-gradient-to-b from-gray-50 to-white relative -mt-20 z-20">
  <div class="max-w-2xl mx-auto">
    <div class="relative">
      <div class="absolute inset-0 bg-gradient-to-r from-[${primaryColor}]/20 to-[${accentColor}]/20 blur-3xl"></div>
      <div class="relative bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 rounded-3xl shadow-2xl p-12 transform hover:scale-105 transition-all duration-500 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent"></div>
        <div class="absolute -top-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        
        <div class="relative z-10 text-center mb-10">
          <p class="text-white/90 text-2xl font-bold mb-4 tracking-wide uppercase">${giftCardBrand} Gift Card</p>
          <p class="text-white text-9xl font-black drop-shadow-2xl mb-2">$${giftCardValue}</p>
          <p class="text-white/80 text-lg font-semibold">Exclusive Reward for You</p>
        </div>
        
        <form id="giftCardRedemptionForm" class="relative z-10 space-y-6">
          <div>
            <label for="codeInput" class="block text-white text-lg font-bold mb-3 text-center">Enter Your Unique Redemption Code</label>
            <input 
              type="text" 
              id="codeInput"
              placeholder="XXXX-XXXX-XXXX"
              class="w-full px-8 py-6 text-3xl font-black text-center rounded-2xl border-4 border-white/40 focus:border-white focus:ring-8 focus:ring-white/50 transition-all duration-300 text-gray-900 placeholder-gray-400 shadow-inner bg-white/95"
              required
              autocomplete="off"
            />
          </div>
          <button 
            type="submit"
            id="submitButton"
            class="w-full bg-white text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 font-black text-2xl py-6 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 relative overflow-hidden group"
            style="background: white;"
          >
            <span class="relative z-10 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">🎉 Claim Your Gift Card Now</span>
            <div class="absolute inset-0 bg-gradient-to-r from-orange-50 to-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </form>
        
        <p class="text-white/75 text-sm text-center mt-6">
          Your code was sent to you via SMS. Check your messages!
        </p>
      </div>
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
    body { font-family: 'Inter', sans-serif; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fade-in 1s ease-out; }
    .animate-slide-up { animation: slide-up 0.8s ease-out; }
    .animation-delay-200 { animation-delay: 0.2s; }
  </style>
</head>
<body class="antialiased">
  [ALL SECTIONS HERE]
</body>
</html>

DESIGN QUALITY REQUIREMENTS:
✓ Typography: text-base (16px), text-lg (18px), text-xl (20px), text-2xl (24px), text-3xl (30px), text-4xl (36px), text-5xl (48px), text-6xl (60px), text-7xl (72px), text-8xl (96px), text-9xl (128px)
✓ Spacing: p-4, p-6, p-8, p-10, p-12, py-20, py-24, py-32 (generous spacing)
✓ Shadows: shadow-lg, shadow-xl, shadow-2xl, shadow-3xl (depth and elevation)
✓ Corners: rounded-lg, rounded-xl, rounded-2xl, rounded-3xl (modern smooth corners)
✓ Gradients: Use bg-gradient-to-br, bg-gradient-to-r with brand colors
✓ Hover Effects: hover:scale-105, hover:shadow-2xl, transition-all duration-300
✓ Colors: Use brand colors [${primaryColor}] and [${accentColor}] extensively
✓ Mobile-First: All text and spacing should scale down on mobile (sm:, md:, lg:)

CRITICAL FORM REQUIREMENTS:
- Form MUST have id="giftCardRedemptionForm"
- Input MUST have id="codeInput" 
- Button MUST have id="submitButton"
- All three are REQUIRED for functionality

OUTPUT FORMAT:
Return ONLY a JSON object:
{
  "html": "complete HTML as string",
  "metadata": {
    "title": "Thank You - ${companyName}",
    "description": "Claim your reward from ${companyName}"
  }
}

QUALITY STANDARD:
Make this look like a $10,000 professional marketing agency designed it. Use modern 2024-2025 design trends. This should win a design award. Every pixel should be intentional and beautiful.`;

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
        max_completion_tokens: 12000
      }),
    });

    if (!htmlResponse.ok) {
      const errorText = await htmlResponse.text();
      console.error("HTML generation API error:", htmlResponse.status, errorText);
      return Response.json({ 
        error: `HTML generation failed: ${htmlResponse.status} - ${errorText}` 
      }, { status: 500, headers: corsHeaders });
    }

    const htmlData = await htmlResponse.json();
    console.log("HTML generation successful");

    if (!htmlData.choices?.[0]?.message?.content) {
      console.error("Invalid HTML response structure:", htmlData);
      return Response.json({ 
        error: "AI returned invalid HTML response" 
      }, { status: 500, headers: corsHeaders });
    }

    let generatedContent;
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
    } catch (parseError) {
      console.error("Failed to parse HTML content:", parseError);
      return Response.json({ 
        error: "Failed to parse HTML content" 
      }, { status: 500, headers: corsHeaders });
    }

    // Validate generated HTML
    const validation = validateGeneratedHTML(generatedContent.html);
    if (!validation.valid) {
      console.error("HTML validation failed:", validation.errors);
      return Response.json({ 
        error: `Generated HTML validation failed: ${validation.errors.join(', ')}` 
      }, { status: 500, headers: corsHeaders });
    }
    
    console.log("HTML validation passed");

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

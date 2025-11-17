import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        model: "google/gemini-2.5-pro",
        messages: extractionMessages,
        max_tokens: 2000
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
    
    const htmlPrompt = `Create a complete, beautiful, responsive HTML landing page for ${companyName}.

CONTEXT:
- Company: ${companyName}
- Industry: ${industry}
- Primary Color: ${primaryColor}
- Accent Color: ${accentColor}
- Tagline: ${tagline || 'Professional service you can trust'}
- Customer Action: ${userAction}
- Gift Card: $${giftCardValue} ${giftCardBrand}

REQUIRED PAGE STRUCTURE:

1. HERO SECTION (full-width, branded):
   - Large "Thank You for ${userAction}!" headline
   - Subheadline about the gift card reward
   - Use gradient background with brand colors
   - Professional, modern design
   - Generous padding and spacing

2. GIFT CARD REDEMPTION SECTION (prominent, centered):
   - Clear "$${giftCardValue} ${giftCardBrand} Gift Card" display
   - Branded card visual with gradient using ${primaryColor} and ${accentColor}
   - Form with ID "giftCardRedemptionForm" containing:
     <input type="text" id="codeInput" placeholder="Enter your unique code" class="..." required />
     <button type="submit" id="submitButton" class="...">Claim Your Gift Card</button>
   - Instructions for redemption
   - Beautiful styling with shadows and rounded corners

3. COMPANY MARKETING SECTION:
   - "Why Choose ${companyName}?" headline
   - 3-4 benefit cards with icons (use emoji or simple SVG icons)
   - Industry-specific value propositions for ${industry}
   - Clean grid layout with hover effects

4. CALL-TO-ACTION FOOTER:
   - Contact information section
   - Strong CTA to engage further
   - Brand-consistent design with ${primaryColor}

CRITICAL DESIGN REQUIREMENTS:
- Use Tailwind CSS classes EXCLUSIVELY - no custom CSS
- Modern, clean, professional aesthetic
- Fully responsive (mobile-first approach)
- Beautiful typography hierarchy (use different font sizes, weights)
- Generous white space and padding
- Subtle gradients: bg-gradient-to-br from-[${primaryColor}] to-[${accentColor}]
- Smooth shadows: shadow-lg, shadow-xl
- Rounded corners: rounded-xl, rounded-2xl
- Professional color palette based on brand colors
- Smooth transitions and hover effects
- Form inputs should be large and easy to use (text-lg, py-3, px-4)
- Buttons should be prominent and inviting

Return ONLY a JSON object with this structure:
{
  "html": "<complete HTML string with DOCTYPE, all Tailwind classes, and all sections>",
  "metadata": {
    "title": "Thank You - ${companyName}",
    "description": "Claim your reward and learn more about ${companyName}"
  }
}

The HTML must be production-ready, beautiful, fully styled with Tailwind classes, and render perfectly standalone.`;

    const htmlResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: htmlPrompt }],
        max_tokens: 8000
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

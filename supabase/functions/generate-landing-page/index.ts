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

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { 
      prompt, 
      clientId, 
      companyName, 
      industry, 
      primaryColor, 
      accentColor, 
      giftCardBrand, 
      giftCardValue,
      userAction,
      includeCodeEntry, 
      fullPage 
    } = await req.json();

    if (!prompt || !clientId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    const systemPrompt = `You are an expert landing page designer creating VISUALLY STUNNING, modern, CLIENT-BRANDED thank-you pages.

🎨 CRITICAL DESIGN RULES - NON-NEGOTIABLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. EVERY section MUST include visual elements (images, gradients, or both)
2. ALWAYS use real Unsplash image URLs - format: https://images.unsplash.com/photo-[ID]?w=1200&q=80
3. Use modern design: gradients, shadows (shadow-xl, shadow-2xl), rounded corners (rounded-xl, rounded-2xl)
4. Create visual hierarchy with size, color, and spacing
5. Make it look like a professional marketing page from 2024

BUSINESS CONTEXT:
- ${companyName} (${industry} company) paid for this campaign
- Customer completed: ${userAction}
- Reward: $${giftCardValue} ${giftCardBrand} gift card
- Page PURPOSE: Thank customer + reinforce brand + deliver reward

BRAND IDENTITY:
✅ This IS ${companyName}'s page (use ${primaryColor} and ${accentColor})
✅ Focus on ${companyName}'s expertise in ${industry}
❌ NOT a ${giftCardBrand} page (gift card is just the reward)

🖼️ IMAGE REQUIREMENTS (MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Industry-specific Unsplash images for ${industry}:
${industry === "Insurance" ? `
- Hero: https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80 (business handshake)
- Section: https://images.unsplash.com/photo-1554224311-beee460c201f?w=800&q=80 (family protection)
- Icon: https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=80 (trust/security)` : ""}
${industry === "Auto Warranty" ? `
- Hero: https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80 (luxury car)
- Section: https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80 (mechanic working)
- Icon: https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80 (car maintenance)` : ""}
${industry === "Solar Energy" ? `
- Hero: https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=80 (solar panels)
- Section: https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&q=80 (modern home)
- Icon: https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&q=80 (energy/environment)` : ""}
${industry === "Home Services" ? `
- Hero: https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80 (modern home)
- Section: https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=800&q=80 (home improvement)
- Icon: https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&q=80 (tools/service)` : ""}
${!["Insurance", "Auto Warranty", "Solar Energy", "Home Services"].includes(industry) ? `
- Hero: https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80 (professional business)
- Section: https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80 (team collaboration)
- Icon: https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80 (success/growth)` : ""}

ALWAYS include at least 3-5 images throughout the page!


${fullPage ? `
📐 PAGE STRUCTURE - MODERN DESIGN PATTERNS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🎯 HERO SECTION (FULL-WIDTH, VISUALLY STUNNING):
   - Background: Gradient overlay on hero image
   - Style: "background: linear-gradient(135deg, rgba(${primaryColor}, 0.9), rgba(${accentColor}, 0.8)), url([HERO_IMAGE])"
   - Headline: "Thank You for ${userAction}! Here's Your $${giftCardValue} ${giftCardBrand} Gift Card"
   - Design: Large text (text-4xl md:text-6xl), bold, white text on gradient
   - CTA Button: Prominent ${accentColor}, shadow-xl, rounded-xl
   - MUST USE: One of the hero images listed above

2. 💎 BENEFITS GRID (3-4 CARDS):
   - Modern card style: bg-white, shadow-2xl, rounded-2xl, p-8
   - Each card includes:
     * Gradient background or small image at top
     * Large icon (from Lucide/Heroicons)
     * Bold title
     * Description
   - Grid layout: grid grid-cols-1 md:grid-cols-3 gap-8
   - Hover effect: hover:shadow-3xl, hover:scale-105 transition

3. 📊 HOW IT WORKS (VISUAL TIMELINE):
   - 3 steps with circular numbered badges
   - Style: Large circle with gradient background
   - Icons for each step
   - Connected with gradient line

4. 🖼️ ABOUT SECTION (IMAGE + TEXT):
   - Side-by-side layout (60% text, 40% image)
   - Include industry-relevant Unsplash image
   - Rounded corners on image (rounded-2xl)
   - Shadow on image (shadow-xl)

5. ✨ TRUST SIGNALS (BADGES/STATS):
   - Modern stat cards with large numbers
   - Icons + stats + description
   - Gradient backgrounds
   - Example: "50,000+ Happy Customers"

6. 🎁 GIFT CARD SECTION (HIGHLIGHTED):
   - Prominent CTA section
   - Visual gift card representation
   - ${giftCardBrand} logo or card image
   - Gradient background with ${accentColor}

7. 📱 FOOTER:
   - Clean, modern footer
   - ${companyName} branding
   - Contact info, social links
   - ${companyName} contact information
   - "Powered by ${companyName}"
   - Privacy Policy & Terms links
   - Copyright ${new Date().getFullYear()} ${companyName}
` : `
SIMPLE PAGE STRUCTURE:
- Hero with ${companyName} branding
- Thank you message for ${userAction}
- 2-3 text sections about ${companyName}
- Gift card redemption
`}

Return ONLY valid JSON in this exact format:
{
  "name": "${companyName} - Thank You Page",
  "slug": "company-name-thank-you",
  "meta_title": "${companyName} - Your $${giftCardValue} ${giftCardBrand} Gift Card",
  "meta_description": "Thank you for ${userAction.toLowerCase()}! Claim your $${giftCardValue} ${giftCardBrand} reward from ${companyName}.",
  "client_branding": {
    "company_name": "${companyName}",
    "primary_color": "${primaryColor}",
    "accent_color": "${accentColor}",
    "industry": "${industry}"
  },
  "gift_card": {
    "brand": "${giftCardBrand}",
    "value": ${giftCardValue}
  },
  "user_context": {
    "action": "${userAction}"
  },
  "content": {
    "hero": {
      "heading": "Thank You for ${userAction}! Here's Your $${giftCardValue} ${giftCardBrand} Gift Card",
      "subheading": "Brief value prop for ${companyName} in ${industry}",
      ${fullPage ? '"backgroundImage": "Description of industry-appropriate hero image",' : ''}
      ${fullPage ? `"backgroundColor": "Use gradient with ${primaryColor} (e.g., 'linear-gradient(135deg, ${primaryColor} 0%, [lighter] 100%)')"` : ''}
    },
    ${fullPage ? `"benefits": [
      {
        "icon": "shield|check|star|zap",
        "title": "${companyName} benefit for ${industry}",
        "description": "Why this matters to customer"
      }
    ],
    "about": {
      "heading": "About ${companyName}",
      "paragraphs": [
        "Paragraph about ${companyName}'s expertise in ${industry}",
        "Why customers trust ${companyName}",
        "Company mission and commitment"
      ]
    },
    "steps": [
      {
        "number": 1,
        "title": "You ${userAction}",
        "description": "Customer took action",
        "icon": "phone|check|calendar"
      },
      {
        "number": 2,
        "title": "We Process Your Reward",
        "description": "Instant delivery",
        "icon": "gift"
      },
      {
        "number": 3,
        "title": "Enjoy Your $${giftCardValue} ${giftCardBrand}",
        "description": "Redeem anywhere",
        "icon": "sparkles"
      }
    ],
    "trustSection": {
      "heading": "Why Choose ${companyName}?",
      "badges": ["Industry certification", "Customer stat", "Trust badge"],
      "testimonial": "Optional customer quote about ${companyName}"
    },` : ''}
    "sections": [
      {
        "type": "text",
        "heading": "About ${companyName}",
        "content": "2-3 paragraphs about ${companyName} expertise in ${industry}"
      }
    ]
  }
}

CRITICAL REMINDERS:
- Page name should be "${companyName} - Thank You" NOT "${giftCardBrand} Gift Card"
- Use ${primaryColor} and ${accentColor} for branding colors
- Focus content on ${companyName}'s value in ${industry}
- Gift card is the reward, not the main focus`;

    // Call Lovable AI Gateway with GPT-5 for better quality
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: 8000
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      return Response.json(
        { error: "Failed to generate page" },
        { status: 500, headers: corsHeaders }
      );
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices[0].message.content;
    
    // Extract JSON from markdown code blocks if present
    let pageContent;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      pageContent = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid AI response format");
    }

    // Create slug
    const generateSlug = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    };

    const slug = pageContent.slug || generateSlug(pageContent.name || prompt);

    // Enrich content with client branding metadata
    const enrichedContent = {
      ...pageContent.content,
      _metadata: {
        company_name: companyName,
        industry,
        primary_color: primaryColor,
        accent_color: accentColor,
        gift_card_brand: giftCardBrand,
        gift_card_value: giftCardValue,
        user_action: userAction,
      }
    };

    // Insert landing page into database
    const { data: landingPage, error: insertError } = await supabase
      .from("landing_pages")
      .insert({
        client_id: clientId,
        name: pageContent.name || `${companyName} - Thank You Page`,
        slug,
        content_json: enrichedContent,
        meta_title: pageContent.meta_title,
        meta_description: pageContent.meta_description,
        ai_generated: true,
        ai_prompt: prompt,
        created_by_user_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return Response.json(
        { error: "Failed to save landing page" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("Landing page generated successfully:", landingPage.id);
    return Response.json(landingPage, { headers: corsHeaders });
  } catch (error) {
    console.error("Error in generate-landing-page:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
});

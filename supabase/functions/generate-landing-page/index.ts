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

    const systemPrompt = `You are an expert landing page designer creating visually stunning, CLIENT-BRANDED thank-you pages for businesses that reward customers with gift cards.

CRITICAL CONTEXT - READ CAREFULLY:
These pages are NOT generic gift card redemption pages. They are BRANDED MARKETING PAGES for the client company.

BUSINESS MODEL:
- ${companyName} (a ${industry} company) paid for this campaign
- Customer completed action: ${userAction}
- Reward: $${giftCardValue} ${giftCardBrand} gift card
- Page PURPOSE: Thank customer, reinforce ${companyName}'s brand, deliver reward, build trust

PAGE IDENTITY:
✅ This IS a ${companyName} page (use their branding, colors, messaging)
✅ Focus on ${companyName}'s value proposition and expertise in ${industry}
❌ This is NOT a ${giftCardBrand} page (gift card is just the reward)
❌ Don't use ${giftCardBrand} colors as primary branding

VISUAL REQUIREMENTS - CRITICAL:
✅ ALWAYS include high-quality, industry-relevant images using Unsplash URLs
✅ Use actual image URLs in this format: https://images.unsplash.com/photo-[id]?w=800&q=80
✅ Include hero images, feature images, and section backgrounds
✅ Add gradients, shadows, and visual depth
✅ Create dynamic, modern layouts with visual hierarchy
✅ Use icons from popular icon sets (Lucide, Heroicons, etc.)


${fullPage ? `
DESIGN REQUIREMENTS:
- Use ${primaryColor} as primary brand color (hero, CTAs, accents)
- Use ${accentColor} for secondary highlights and visual interest
- Professional, conversion-optimized design with visual hierarchy
- Industry-appropriate imagery for ${industry}
- Celebratory but professional tone
- Trust-building elements specific to ${industry}

STRUCTURE (Generate ALL sections):

1. HERO SECTION:
   Headline formula: "Thank You for [${userAction}]! Here's Your $${giftCardValue} ${giftCardBrand} Gift Card"
   - Subheading: Reinforce ${companyName}'s value proposition (why they're the best in ${industry})
   - Background: Use gradient with ${primaryColor} (e.g., "linear-gradient(135deg, ${primaryColor} 0%, [lighter shade] 100%)")
   - MUST include a high-quality hero image using Unsplash URL relevant to ${industry}
   - Example: https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80 (for office/business)
   - Celebratory but professional visual with modern design

2. COMPANY BENEFITS (3-4 cards):
   Focus on ${companyName}'s strengths in ${industry}:
   Examples for ${industry}:
   ${industry === "Auto Warranty" ? "- 24/7 Roadside Assistance\n   - Nationwide Coverage\n   - Easy Claims Process\n   - Certified Mechanics" : ""}
   ${industry === "Insurance" ? "- Comprehensive Coverage\n   - Fast Claims\n   - Trusted Advisors\n   - Competitive Rates" : ""}
   ${industry === "Solar Energy" ? "- Massive Savings\n   - Eco-Friendly\n   - Expert Installation\n   - 25-Year Warranty" : ""}
   - Each card with relevant icon (shield, check, star, etc.)
   - Include small supporting images from Unsplash where appropriate
   - Modern card design with shadows and hover effects
   - Professional benefit cards with visual depth

3. HOW IT WORKS (3 steps):
   Step 1: "You ${userAction}"
   Step 2: "We Deliver Your Reward"
   Step 3: "Enjoy Your $${giftCardValue} ${giftCardBrand} Gift Card"
   - Numbered circular badges
   - Clear, simple descriptions

4. ABOUT ${companyName}:
   - 2-3 paragraphs establishing expertise in ${industry}
   - Why customers trust ${companyName}
   - Company mission/values
   - Reinforce why customer made the right choice

5. TRUST SIGNALS:
   Industry-specific for ${industry}:
   ${industry === "Auto Warranty" ? "- BBB Accredited, A+ Rating\n   - 50,000+ Happy Customers\n   - Licensed & Bonded" : ""}
   ${industry === "Insurance" ? "- Licensed in All 50 States\n   - $2M+ Claims Paid\n   - 4.8★ Customer Rating" : ""}
   - Include relevant certifications, stats, testimonial

6. GIFT CARD REDEMPTION:
   - "Claim Your $${giftCardValue} ${giftCardBrand} Reward"
   - Clear instructions
   - Visual ${giftCardBrand} card representation
   - Code entry form (will be added automatically)

7. FOOTER:
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

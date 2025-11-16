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

    const { prompt, businessType, tone, includeCodeEntry, clientId, fullPage } = await req.json();

    if (!prompt || !clientId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    const systemPrompt = `You are an expert landing page designer for gift card redemption pages. Generate a ${fullPage ? 'stunning, visually rich' : 'simple'} landing page optimized for conversions.

${fullPage ? `
DESIGN REQUIREMENTS FOR BEAUTIFUL PAGES:
- Use rich, evocative descriptions for visual elements
- Include imagery suggestions (hero images, background patterns, icons)
- Specify color schemes with gradients and accents
- Add visual hierarchy with varied text sizes and weights
- Include decorative elements (shapes, dividers, cards)
- Suggest animations and micro-interactions
- Create depth with shadows, overlays, and layering

STRUCTURE FOR FULL PAGE:
1. Hero Section:
   - Eye-catching headline with brand colors
   - Compelling subheading
   - Background image or gradient
   - Visual accent elements

2. Benefits Section (3-4 cards):
   - Icon for each benefit
   - Benefit title and description
   - Visual cards with shadows/borders

3. How It Works (3 steps):
   - Step numbers with circular badges
   - Clear step titles
   - Brief descriptions
   - Icons or illustrations

4. Trust Signals:
   - Security badges
   - Success metrics (if applicable)
   - Testimonial or trust statement

5. Code Entry Section:
   - Prominent CTA
   - Clear instructions
   - Form with validation hints
   - Success state design

6. Footer:
   - Copyright
   - Links
   - Social proof
` : `
SIMPLE PAGE STRUCTURE:
- Hero section with headline and subheading
- 2-3 short text sections
- Code entry form (automatic)
`}

Return ONLY valid JSON in this exact format:
{
  "name": "Page name (e.g., 'Starbucks Gift Card Redemption')",
  "slug": "url-friendly-slug",
  "meta_title": "SEO title under 60 chars",
  "meta_description": "SEO description under 160 chars",
  "content": {
    "hero": {
      "heading": "Main headline",
      "subheading": "Supporting text",
      ${fullPage ? '"backgroundImage": "Description of hero image (e.g., \'Coffee cup with steam on wooden table\')",' : ''}
      ${fullPage ? '"backgroundColor": "Gradient or color (e.g., \'linear-gradient(135deg, #2d5016 0%, #4a7c2b 100%)\')"' : ''}
    },
    ${fullPage ? `"benefits": [
      {
        "icon": "gift|check|star|sparkles",
        "title": "Benefit title",
        "description": "Brief benefit description"
      }
    ],
    "steps": [
      {
        "number": 1,
        "title": "Step title",
        "description": "Step description",
        "icon": "relevant-icon-name"
      }
    ],
    "trustSection": {
      "title": "Trust section title",
      "content": "Trust message or statistic"
    },` : ''}
    "sections": [
      {
        "type": "text",
        "content": "Paragraph text"
      }
    ]
  }
}`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
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

    // Insert landing page into database
    const { data: landingPage, error: insertError } = await supabase
      .from("landing_pages")
      .insert({
        client_id: clientId,
        name: pageContent.name || `AI Generated - ${new Date().toLocaleDateString()}`,
        slug,
        content_json: pageContent.content,
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

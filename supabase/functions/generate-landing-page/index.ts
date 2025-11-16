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

    const { prompt, businessType, tone, includeCodeEntry, clientId } = await req.json();

    if (!prompt || !clientId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    // System prompt for AI
    const systemPrompt = `You are a professional landing page designer specializing in conversion-optimized pages for ${businessType || "businesses"}.

Create a landing page structure using these block types:
- hero: Main heading, subheading, and hero image
- text: Body paragraphs with descriptive content
- image: Image placeholders with descriptions
- codeEntry: Form for entering redemption codes
- giftCardDisplay: Where the redeemed gift card will appear
- cta: Call-to-action buttons
- testimonial: Customer testimonials (optional)

Design Guidelines:
- Tone: ${tone || "friendly and professional"}
- Focus on conversion and trust
- Clear value proposition
- Simple, clean design
- Mobile-friendly layout

Return a JSON object with this structure:
{
  "name": "Landing page title",
  "slug": "url-friendly-slug",
  "meta_title": "SEO title",
  "meta_description": "SEO description",
  "blocks": [
    {
      "type": "hero",
      "content": {
        "heading": "Main heading",
        "subheading": "Supporting text",
        "imageUrl": "placeholder"
      },
      "styles": {
        "backgroundColor": "#f9fafb",
        "padding": "80px 20px",
        "textAlign": "center"
      }
    }
  ]
}`;

    // Call Lovable AI (no API key needed!)
    const aiResponse = await fetch("https://api.lovable.app/v1/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
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
    const pageContent = JSON.parse(aiResult.choices[0].message.content);

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
        content_json: {
          version: "1.0",
          blocks: pageContent.blocks || [],
        },
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

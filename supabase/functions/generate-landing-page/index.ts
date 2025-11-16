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

    const systemPrompt = `You are an expert landing page designer for gift card redemption pages. Generate a simple, conversion-optimized landing page.

The page should include:
- Hero section with compelling headline and subheading
- 2-3 short text sections explaining the process or benefits
- The page ALWAYS includes a gift card code entry form (don't include in JSON, it's automatic)

Design guidelines:
- Keep it simple and focused on gift card redemption
- Use warm, inviting copy
- Match colors to the gift card brand if mentioned
- Make the process clear and easy to understand

Return ONLY valid JSON in this exact format:
{
  "name": "Page name (e.g., 'Starbucks Gift Card Redemption')",
  "slug": "url-friendly-slug",
  "meta_title": "SEO title under 60 chars",
  "meta_description": "SEO description under 160 chars",
  "content": {
    "hero": {
      "heading": "Main headline (e.g., 'Claim Your Starbucks Gift Card')",
      "subheading": "Supporting text (e.g., 'Enter your code below to receive your reward')"
    },
    "sections": [
      {
        "type": "text",
        "content": "Brief paragraph 1"
      },
      {
        "type": "text",
        "content": "Brief paragraph 2"
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

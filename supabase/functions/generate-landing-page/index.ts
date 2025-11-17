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

    if (!sourceType || !clientId || !giftCardBrand || !userAction) {
      return Response.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    // Extract branding
    let extractionMessages: any[] = [];
    if (sourceType === "url") {
      extractionMessages = [{ role: "user", content: `Extract branding from ${sourceUrl}: company name, industry, colors (hex)` }];
    } else if (sourceType === "image") {
      extractionMessages = [{ role: "user", content: [
        { type: "text", text: "Extract branding: company name, industry, colors" },
        { type: "image_url", image_url: { url: sourceImage } }
      ]}];
    } else {
      extractionMessages = [{ role: "user", content: `From description: "${sourceDescription}" - infer company name, industry, generate colors` }];
    }

    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
      body: JSON.stringify({ model: "claude-sonnet-4-5", messages: extractionMessages, max_tokens: 1000 }),
    });

    const extractionData = await extractionResponse.json();
    const content = extractionData.choices[0].message.content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const extractedBranding = JSON.parse(jsonMatch ? jsonMatch[1] : content);

    const { companyName, industry, primaryColor, accentColor } = extractedBranding;

    // Generate page
    const pageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: `Create landing page JSON for ${companyName} (${industry}), $${giftCardValue} ${giftCardBrand} reward for ${userAction}. Use ${primaryColor} and ${accentColor}.` }],
        max_tokens: 8000
      }),
    });

    const pageData = await pageResponse.json();
    const pageContent = pageData.choices[0].message.content;
    const pageJsonMatch = pageContent.match(/```json\n([\s\S]*?)\n```/) || pageContent.match(/```\n([\s\S]*?)\n```/);
    const generatedContent = JSON.parse(pageJsonMatch ? pageJsonMatch[1] : pageContent);

    const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-thank-you`;

    const { data: lpData, error: lpError } = await supabase.from("landing_pages").insert({
      client_id: clientId,
      name: `${companyName} - Gift Card Thank You`,
      slug,
      content_json: { ...generatedContent, extractedBranding },
      meta_title: `Thank You - ${companyName}`,
      published: false,
      ai_generated: true,
      editor_type: "ai",
      created_by_user_id: user.id,
    }).select().single();

    if (lpError) throw lpError;

    return Response.json({ success: true, id: lpData.id, extractedBranding }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});

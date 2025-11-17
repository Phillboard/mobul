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
      extractionPrompt = `Analyze this company website URL and extract branding information: ${sourceUrl}

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "companyName": "Company Name",
  "industry": "industry type",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "tagline": "optional tagline"
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
            text: `Analyze this marketing flyer/image and extract branding information.

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "companyName": "Company Name",
  "industry": "industry type",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "tagline": "optional tagline"
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
      extractionPrompt = `Based on this business description, infer the company branding: "${sourceDescription}"

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "companyName": "inferred company name",
  "industry": "inferred industry type",
  "primaryColor": "#hexcolor (appropriate for the industry)",
  "accentColor": "#hexcolor (complementary color)",
  "tagline": "suggested tagline"
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
        model: "claude-sonnet-4-5",
        messages: extractionMessages,
        max_tokens: 1000
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
    console.log("Extraction response:", JSON.stringify(extractionData, null, 2));

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

    const { companyName, industry, primaryColor, accentColor } = extractedBranding;
    console.log("Extracted branding:", { companyName, industry, primaryColor, accentColor });

    // Generate landing page content
    const pagePrompt = `Create a beautiful landing page for ${companyName} (${industry}).

Context:
- They are offering a $${giftCardValue} ${giftCardBrand} gift card
- Customer action: ${userAction}
- Brand colors: Primary ${primaryColor}, Accent ${accentColor}

Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "headline": "Catchy headline",
  "subheadline": "Supporting text",
  "heroText": "Main hero section text",
  "ctaText": "Call to action button text",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content"
    }
  ]
}`;

    console.log("Generating landing page content...");
    const pageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: pagePrompt }],
        max_tokens: 2000
      }),
    });

    if (!pageResponse.ok) {
      const errorText = await pageResponse.text();
      console.error("Page generation API error:", pageResponse.status, errorText);
      return Response.json({ 
        error: `AI page generation failed: ${pageResponse.status} - ${errorText}` 
      }, { status: 500, headers: corsHeaders });
    }

    const pageData = await pageResponse.json();
    console.log("Page response:", JSON.stringify(pageData, null, 2));

    if (!pageData.choices?.[0]?.message?.content) {
      console.error("Invalid page response structure:", pageData);
      return Response.json({ 
        error: "AI returned invalid page structure" 
      }, { status: 500, headers: corsHeaders });
    }

    let generatedContent;
    const pageContent = pageData.choices[0].message.content;
    
    try {
      generatedContent = JSON.parse(pageContent);
    } catch {
      const jsonMatch = pageContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        generatedContent = JSON.parse(jsonMatch[1]);
      } else {
        console.error("Could not parse page content from:", pageContent);
        return Response.json({ 
          error: "AI returned unparseable page content" 
        }, { status: 500, headers: corsHeaders });
      }
    }

    // Create landing page in database
    const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-thank-you`;
    
    const { data: lpData, error: lpError } = await supabase
      .from("landing_pages")
      .insert({
        client_id: clientId,
        name: `${companyName} - Gift Card Thank You`,
        slug,
        content_json: {
          ...generatedContent,
          branding: extractedBranding,
          giftCard: {
            brand: giftCardBrand,
            value: giftCardValue,
            userAction
          }
        },
        meta_title: `Thank You - ${companyName}`,
        published: false,
        ai_generated: true,
        editor_type: "ai",
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

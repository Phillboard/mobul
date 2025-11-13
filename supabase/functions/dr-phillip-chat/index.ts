import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Dr. Phillip, the Ace Engage Master - an expert AI assistant for the Ace Engage direct mail campaign platform.

PERSONALITY:
- Friendly, professional, and knowledgeable about direct mail marketing
- Use occasional marketing wisdom and best practices
- Keep responses concise but thorough (2-4 paragraphs max)
- Use bullet points and clear formatting
- Be encouraging and helpful

YOUR EXPERTISE:

1. Campaign Creation:
   - Guide users through the 3-step campaign wizard (Details → Audience → Summary)
   - Help select templates (4x6, 6x9, 6x11 postcards, letters, trifolds)
   - Explain PURL (Personalized URL) features: unique landing pages for each recipient
   - Explain QR code tracking: track when recipients scan codes
   - Explain merge fields for personalization: {{first_name}}, {{last_name}}, {{company}}, etc.

2. Budgeting (typical costs):
   - Postcard printing:
     * 4x6 postcard: $0.35-$0.45 per piece
     * 6x9 postcard: $0.55-$0.65 per piece
     * 6x11 postcard: $0.75-$0.85 per piece
   - Postage:
     * Standard Mail: $0.60 per piece (slower, 5-10 days)
     * First Class: $0.73 per piece (faster, 2-5 days)
   - Design: $50-200 for custom design, $0 for AI-generated templates
   - Lead costs: $0.50-$3.00 per lead depending on quality and geo-targeting
   - Total example: 1,000 piece campaign with 6x9 postcard = $0.65 (print) + $0.60 (postage) = $1.25/piece = $1,250 total

3. Platform Features:
   - Template Builder: Drag-and-drop designer with AI template generation
   - Audience Management: Import CSV, manually enter, or purchase from marketplace
   - Campaign Statuses: Draft → Proofed → In Production → Mailed → Completed
   - Analytics Dashboard: Track views, scans, form submissions, conversions
   - Approval Workflows: Add approvers, collect feedback, track changes
   - Lead Marketplace: Purchase targeted leads by industry, location, demographics

4. Best Practices:
   - Response rates: Typically 1-5% for direct mail, higher with personalization
   - Personalization increases response by 30-50%
   - Multi-touch campaigns (mail + digital follow-up) perform best
   - Test small batches (100-500 pieces) before large sends
   - Follow up within 48 hours of mail delivery for best results
   - Use clear calls-to-action (CTA): "Call now", "Visit website", "Scan QR code"

5. Navigation Help:
   - Create campaign: Go to Campaigns → "Create Campaign" button
   - Import audience: Go to Audiences → "Import Audience" tab → Upload CSV
   - View analytics: Go to specific campaign → "Analytics" tab
   - Purchase leads: Go to "Lead Marketplace" in sidebar
   - Design template: Go to Templates → "Create Template" → Use builder

GUIDELINES:
- If user asks about creating a campaign, provide step-by-step guidance
- For budgeting questions, ask about audience size and mail piece size, then calculate
- Provide specific navigation instructions with exact button/tab names
- If asked about features not mentioned above, suggest contacting support
- Always be encouraging about direct mail ROI and campaign success potential
- Use marketing terminology appropriately (CTR, conversion rate, ROI, etc.)

RESPONSE FORMAT:
- Start with a friendly acknowledgment
- Provide clear, actionable information
- Use bullet points for lists
- End with a helpful follow-up question or next step suggestion`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Dr. Phillip chat request:", { messageCount: messages.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Dr. Phillip chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

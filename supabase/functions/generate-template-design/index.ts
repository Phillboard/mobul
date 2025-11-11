import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, size, industryVertical } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Determine canvas size based on template size
    const sizeMap: Record<string, { width: number; height: number }> = {
      "4x6": { width: 1800, height: 1200 },
      "6x9": { width: 2700, height: 1800 },
      "6x11": { width: 3300, height: 1800 },
      "letter": { width: 2550, height: 3300 },
      "trifold": { width: 3300, height: 2550 },
    };
    
    const canvasSize = sizeMap[size] || sizeMap["4x6"];

    const systemPrompt = `You are an expert direct mail postcard designer with 20+ years of experience. Create visually stunning, high-converting postcard designs.

CRITICAL DESIGN RULES:
1. ALWAYS create a full background first (rect covering entire canvas)
2. Layer elements properly: background → decorative shapes → text (front to back)
3. NEVER overlap text elements - maintain minimum 40px spacing between text blocks
4. Use visual hierarchy: Large headline (72-120px) → Subheadline (36-48px) → Body (24-32px) → Fine print (18-20px)
5. White space is essential - don't crowd the design
6. Align elements to an invisible grid for professional appearance
7. Use 2-3 colors max (plus white/black) for cohesive design

LAYOUT STRUCTURE (for ${canvasSize.width}x${canvasSize.height}px):
- Main Headline: Top 1/3, centered or left-aligned with 60-100px margins
- Hero/Offer: Middle section with strong visual contrast
- Call-to-action: Bottom 1/3, highly visible with contrasting color
- Leave 80-120px margins on all sides for safe printing area

TYPOGRAPHY HIERARCHY:
- Headlines: Bold, 72-120px, eye-catching colors
- Subheadlines: Bold, 36-48px, complementary colors  
- Body text: Regular or Bold, 24-32px, high contrast for readability
- Contact info: Regular, 20-24px, clearly visible

COLOR PALETTES BY INDUSTRY (${industryVertical}):
- Real Estate: Navy #1e3a8a + Gold #f59e0b + White, or Sky Blue #0ea5e9 + Dark Gray #1f2937
- Healthcare: Teal #0d9488 + Light Blue #7dd3fc + White, or Green #10b981 + Navy #1e3a8a
- Retail: Bold Red #dc2626 + Black + White, or Orange #ea580c + Yellow #fbbf24 + Dark background
- Restaurant/Food: Warm Red #991b1b + Cream #fef3c7, or Orange #c2410c + Brown #78350f + Light background
- Roofing/Services: Orange #ea580c + Navy #1e3a8a + White, or Red #dc2626 + Dark Gray #374151
- Legal/Financial: Navy #1e40af + Gray #6b7280 + White, or Forest Green #065f46 + Gold #d97706
- Fitness/Gym: Electric Red #dc2626 + Black, or Bold Orange #ea580c + Charcoal #1f2937
- Default: Primary #3b82f6 + Accent #8b5cf6 + White/Light Gray background

PERSONALIZATION MERGE FIELDS (use strategically):
- {{first_name}} - in headline or greeting
- {{company}} - if B2B context
- {{address1}}, {{city}}, {{state}} - for local relevance
- {{phone}} - for contact info
- Use these naturally, not forced

REQUIRED ELEMENTS (create 5-8 total layers):
1. Background rectangle (full canvas, use industry-appropriate color)
2. Optional: 1-2 decorative shapes for visual interest (positioned behind text)
3. Main headline (large, bold, positioned strategically)
4. Supporting text or offer details (medium size, complementary position)
5. Call-to-action text (prominent, action-oriented)
6. Optional: QR code (bottom-right, 200-250px square)
7. Contact information (small, bottom area)

Canvas: ${canvasSize.width}x${canvasSize.height}px
Industry: ${industryVertical}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Create a professional, high-converting postcard design for: ${description}

Key requirements:
- Start with a full-canvas background rectangle
- Create clear visual hierarchy with properly sized text
- Ensure NO overlapping text elements
- Use industry-appropriate colors
- Include strategic white space
- Follow the layout structure guidelines
- Make it visually appealing and balanced` 
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_template_design',
            description: 'Generate a complete postcard template design with layers',
            parameters: {
              type: 'object',
              properties: {
                layers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Unique layer ID' },
                      type: { 
                        type: 'string', 
                        enum: ['text', 'rect', 'qr_code'],
                        description: 'Layer type'
                      },
                      x: { type: 'number', description: 'X position in pixels' },
                      y: { type: 'number', description: 'Y position in pixels' },
                      width: { type: 'number', description: 'Width in pixels' },
                      height: { type: 'number', description: 'Height in pixels' },
                      text: { type: 'string', description: 'Text content (for text layers)' },
                      fontSize: { type: 'number', description: 'Font size (for text layers)' },
                      fontFamily: { 
                        type: 'string', 
                        enum: ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New'],
                        description: 'Font family'
                      },
                      fontWeight: { 
                        type: 'string',
                        enum: ['normal', 'bold'],
                        description: 'Font weight'
                      },
                      fill: { type: 'string', description: 'Fill color (hex format)' },
                      align: {
                        type: 'string',
                        enum: ['left', 'center', 'right'],
                        description: 'Text alignment'
                      },
                      stroke: { type: 'string', description: 'Border color (hex format, optional)' },
                      strokeWidth: { type: 'number', description: 'Border width (optional)' },
                      visible: { type: 'boolean', description: 'Layer visibility' },
                      locked: { type: 'boolean', description: 'Layer locked state' },
                      name: { type: 'string', description: 'Layer name for organization' },
                      zIndex: { type: 'number', description: 'Layer stacking order - background=0, shapes=1-2, text=3-10 (higher numbers appear on top)' }
                    },
                    required: ['id', 'type', 'x', 'y', 'width', 'height', 'fill', 'visible', 'locked', 'name', 'zIndex']
                  },
                  description: 'Array of design layers'
                }
              },
              required: ['layers'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_template_design' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const designData = JSON.parse(toolCall.function.arguments);

    const templateData = {
      version: '1.0',
      canvasSize,
      layers: designData.layers
    };

    return new Response(
      JSON.stringify({ templateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-template-design:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

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

    const systemPrompt = `You are an expert direct mail postcard designer. Generate professional postcard designs with proper layout, colors, and typography.

Design Guidelines:
- Use bold, attention-grabbing headlines
- Include clear call-to-action elements
- Use appropriate colors for the industry
- Position elements with proper spacing and hierarchy
- All text should be readable (min 14px font size)
- Use merge fields like {{first_name}}, {{company}}, {{phone}}, {{address1}}, etc. for personalization

Canvas size: ${canvasSize.width}x${canvasSize.height}px
Industry: ${industryVertical}

Common color palettes by industry:
- Real Estate: Blues (#1e3a8a, #3b82f6), Golds (#f59e0b)
- Healthcare: Blues (#0ea5e9), Greens (#10b981), Whites
- Retail: Reds (#dc2626), Yellows (#fbbf24), Bold colors
- Roofing/Services: Oranges (#ea580c), Navy (#1e3a8a), Professional tones
- Legal: Navy (#1e3a8a), Grays (#374151), Professional
- Financial: Blues (#1e40af), Greens (#059669), Trust colors`;

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
          { role: 'user', content: `Create a postcard design for: ${description}` }
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
                      name: { type: 'string', description: 'Layer name for organization' }
                    },
                    required: ['id', 'type', 'x', 'y', 'width', 'height', 'fill', 'visible', 'locked', 'name']
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

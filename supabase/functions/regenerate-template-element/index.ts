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
    const { layerId, currentLayer, templateContext, userRequest, canvasSize } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert postcard designer. Regenerate a specific design element based on user feedback while maintaining design consistency.

Current Template Context:
- Canvas size: ${canvasSize.width}x${canvasSize.height}px
- Element to regenerate: ${currentLayer.type} (${currentLayer.name || 'Unnamed'})
- Current properties: ${JSON.stringify(currentLayer, null, 2)}

Design Guidelines:
- Maintain professional appearance
- Use readable font sizes (min 14px)
- Keep proper spacing and hierarchy
- Use appropriate colors for the design
- Position elements logically based on existing layout
- For text elements, include merge fields when appropriate: {{first_name}}, {{company}}, {{phone}}, etc.

When regenerating:
- Preserve the layer type unless explicitly asked to change it
- Keep similar positioning unless repositioning is requested
- Maintain design consistency with other elements
- Apply industry-standard spacing and sizing`;

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
            content: `Regenerate this element: ${userRequest}\n\nOther layers in template: ${JSON.stringify(templateContext.otherLayers, null, 2)}` 
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'regenerate_element',
            description: 'Regenerate a single template design element',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Keep the same layer ID' },
                type: { 
                  type: 'string', 
                  enum: ['text', 'rect', 'qr_code'],
                  description: 'Element type'
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
                name: { type: 'string', description: 'Layer name' },
                zIndex: { type: 'number', description: 'Layer stacking order (preserve from original)' }
              },
              required: ['id', 'type', 'x', 'y', 'width', 'height', 'fill', 'visible', 'locked', 'name'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'regenerate_element' } }
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

    const regeneratedLayer = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ regeneratedLayer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-template-element:', error);
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

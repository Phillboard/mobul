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
    const { prompt, context } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extract context with defaults
    const companyName = context?.companyName || 'Your Company';
    const industry = context?.industry || 'general';
    const giftCardBrands = context?.giftCardBrands || ['gift card'];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call Lovable AI to generate form structure
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert form designer for data enrichment systems.

CONTEXT:
- Company: ${companyName}
- Industry: ${industry}
- Purpose: Collect customer data to enrich existing contact database
- Incentive: Gift card redemption (brands: ${giftCardBrands.join(', ')})

CRITICAL RULES:
1. ALWAYS include a "gift-card-code" field type for redemption
2. Focus on data enrichment - collect info that's valuable for ${industry} businesses
3. For automotive/warranty: vehicle info, mileage, service history, preferences
4. For insurance: policy updates, coverage interests, contact changes
5. For healthcare: patient info, insurance updates, appointment preferences
6. Keep forms SHORT (5-8 fields max) - people won't fill out 20 fields for a $25 gift card
7. Use smart defaults based on industry
8. Include marketing opt-in checkbox (GDPR compliant)
9. Set appropriate validation rules
10. Make forms user-friendly with good placeholders and help text
11. Return ONLY valid JSON, no markdown, no explanation

Response format (JSON only):
{
  "name": "Form Name",
  "description": "Brief description",
  "config": {
    "fields": [
      {
        "id": "unique_id",
        "type": "gift-card-code|text|email|phone|select|checkbox|radio|textarea|date",
        "label": "Field Label",
        "placeholder": "Optional placeholder",
        "helpText": "Optional help text",
        "required": true|false,
        "options": ["option1", "option2"] // only for select, radio, checkbox
      }
    ],
    "settings": {
      "title": "Form Title",
      "description": "Form description",
      "submitButtonText": "Submit",
      "successMessage": "Thank you for submitting!",
      "primaryColor": "#6366f1"
    }
  }
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_form",
              description: "Generate a complete form configuration",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Form name" },
                  description: { type: "string", description: "Form description" },
                  config: {
                    type: "object",
                    properties: {
                      fields: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            type: { type: "string", enum: ["gift-card-code", "text", "email", "phone", "select", "checkbox", "radio", "textarea", "date"] },
                            label: { type: "string" },
                            placeholder: { type: "string" },
                            helpText: { type: "string" },
                            required: { type: "boolean" },
                            options: { type: "array", items: { type: "string" } }
                          },
                          required: ["id", "type", "label", "required"]
                        }
                      },
                      settings: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          submitButtonText: { type: "string" },
                          successMessage: { type: "string" },
                          primaryColor: { type: "string" }
                        }
                      }
                    },
                    required: ["fields", "settings"]
                  }
                },
                required: ["name", "description", "config"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_form" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse));
    
    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No form generated by AI');
    }

    const formData = JSON.parse(toolCall.function.arguments);
    
    // Validate that gift-card-code field exists
    const hasGiftCardField = formData.config.fields.some(
      (field: any) => field.type === 'gift-card-code'
    );
    
    if (!hasGiftCardField) {
      // Add gift card field if AI forgot it
      formData.config.fields.unshift({
        id: 'code',
        type: 'gift-card-code',
        label: 'Gift Card Code',
        placeholder: 'Enter your gift card code',
        required: true,
        helpText: 'Enter the code from your gift card to redeem'
      });
    }

    return new Response(
      JSON.stringify(formData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating form:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate form'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

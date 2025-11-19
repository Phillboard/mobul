import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { designType, designId, currentHtml, userMessage, chatHistory } = await req.json();
    
    console.log('AI Design Chat:', { designType, designId, messageLength: userMessage.length });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    // Build context-aware system prompt
    const systemPrompt = `You are an expert ${designType === 'landing_page' ? 'web' : 'print'} designer helping users refine their design through conversation.

CURRENT DESIGN TYPE: ${designType === 'landing_page' ? 'Landing Page (Web)' : 'Print Mailer (Postcard)'}

YOUR CAPABILITIES:
- Modify HTML/CSS to improve design
- Adjust colors, typography, spacing, layout
- Add/remove/reorganize content sections
- Optimize for ${designType === 'landing_page' ? 'conversions and SEO' : 'print quality and readability'}
${designType === 'landing_page' ? '- Ensure mobile responsiveness' : '- Maintain print specifications (DPI, CMYK, bleed)'}

DESIGN PRINCIPLES TO FOLLOW:
${designType === 'landing_page' ? `
1. Clear visual hierarchy with compelling headlines
2. Strong call-to-action that stands out
3. Social proof (testimonials, reviews)
4. Mobile-first responsive design
5. Fast loading (inline styles, optimized images)
6. Accessibility (semantic HTML, ARIA labels)
` : `
1. High-contrast, readable typography (min 16pt body text)
2. Print-safe colors (avoid pure black, use rich black)
3. Bleed zone considerations (0.125" extension)
4. Safe zone for critical content (0.25" from trim)
5. CMYK color mode for accurate printing
6. 300 DPI for images and graphics
`}

RESPONSE FORMAT:
Always respond with a tool call using the "update_design" function.
Provide clear explanations of what you changed and why.
Be conversational and helpful.

CONSTRAINTS:
${designType === 'landing_page' ? `
- Keep all styles inline (no external CSS)
- Maintain required IDs: #redemption-form, #gift-card-code, #submit-button
- Use semantic HTML (section, article, header, footer, etc.)
- Use HSL colors with CSS variables when possible
` : `
- All styles must be inline
- Fixed canvas dimensions based on postcard size
- No interactive elements (no forms, no JavaScript)
- Consider print bleed and safe zones
- Use print-safe fonts and colors
`}`;

    // Build messages array with chat history
    const messages: any[] = [];
    
    chatHistory.slice(-10).forEach((msg: any) => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    });
    
    messages.push({
      role: 'user',
      content: `Current HTML design:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nUser request: ${userMessage}`,
    });
    
    // Call Lovable AI Gateway
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
          ...messages,
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'update_design',
              description: 'Update the HTML design based on user request',
              parameters: {
                type: 'object',
                properties: {
                  updatedHtml: {
                    type: 'string',
                    description: 'The complete updated HTML with all changes applied',
                  },
                  explanation: {
                    type: 'string',
                    description: 'Clear explanation of what was changed and why (user-friendly language)',
                  },
                  changesMade: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of specific changes made',
                  },
                },
                required: ['updatedHtml', 'explanation', 'changesMade'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'update_design' } },
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
    console.log('AI Response received');
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }
    
    const { updatedHtml, explanation, changesMade } = JSON.parse(toolCall.function.arguments);
    
    // Validate HTML for design type
    if (designType === 'landing_page') {
      if (!updatedHtml.includes('id="redemption-form"')) {
        console.warn('Missing redemption-form ID');
      }
    } else {
      if (updatedHtml.includes('<script')) {
        throw new Error('Print designs cannot contain JavaScript');
      }
    }
    
    return new Response(
      JSON.stringify({
        message: explanation,
        updatedHtml,
        changesMade,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error: any) {
    console.error('AI design chat error:', error);
    
    if (error.status === 429) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          code: 'RATE_LIMIT',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process design update',
        code: 'AI_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

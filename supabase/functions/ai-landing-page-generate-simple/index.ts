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
    const { prompt, currentHtml, chatHistory = [], availableForms = [] } = await req.json();
    
    console.log('Request:', { 
      prompt: prompt?.substring(0, 50), 
      hasCurrentHtml: !!currentHtml,
      chatHistoryLength: chatHistory.length 
    });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const selectedFormId = availableForms.length > 0 ? availableForms[0].id : 'demo-form';
    
    // Different prompts for create vs edit
    const isEdit = !!currentHtml;
    
    const systemPrompt = isEdit 
      ? `You are a landing page editor. The user has an existing HTML page and wants to modify it.

CURRENT HTML:
\`\`\`html
${currentHtml}
\`\`\`

INSTRUCTIONS:
1. Make ONLY the changes the user requests
2. Keep everything else exactly the same
3. Preserve the overall structure and styling
4. Return the COMPLETE modified HTML (not just the changed parts)
5. Do NOT add markdown code blocks - return raw HTML only
6. Start with <!DOCTYPE html>`

      : `You are a landing page designer. Create a stunning, modern landing page.

REQUIREMENTS:
1. Start with <!DOCTYPE html>
2. Include <script src="https://cdn.tailwindcss.com"></script> in head
3. Use modern design: gradients, shadows, glass effects, professional typography
4. Include this form: <iframe src="/f/${selectedFormId}" class="w-full h-[500px] border-0 rounded-xl shadow-lg" title="Form"></iframe>
5. Make it BEAUTIFUL - deep colors, smooth gradients, professional look
6. Return ONLY raw HTML - no markdown, no code blocks, no explanations

DESIGN TIPS:
- Use dark themes with gradients (from-slate-900 via-blue-900 to-slate-800)
- Add glass effects (bg-white/10 backdrop-blur-lg)
- Include trust badges, benefits sections, testimonials
- Make it mobile responsive`;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add chat history for context (only for edits)
    if (isEdit && chatHistory.length > 0) {
      // Add previous exchanges for context
      for (const msg of chatHistory.slice(-6)) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else {
          messages.push({ role: 'assistant', content: 'I updated the page as requested.' });
        }
      }
    }

    // Add current request
    messages.push({ 
      role: 'user', 
      content: isEdit 
        ? `Please make this change to the page: ${prompt}`
        : `Create a landing page for: ${prompt}`
    });

    console.log('Calling OpenAI with', messages.length, 'messages...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let html = data.choices[0].message.content;

    // Clean up any markdown artifacts
    html = html.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();
    html = html.replace(/^```\n?/i, '').replace(/\n?```$/i, '').trim();
    
    // Ensure it starts with DOCTYPE
    if (!html.toLowerCase().startsWith('<!doctype')) {
      html = '<!DOCTYPE html>\n' + html;
    }

    console.log('Success! Generated', html.length, 'chars');

    // Generate a friendly message
    const message = isEdit 
      ? "Done! I made those changes to your page."
      : "I created your landing page! Tell me what you'd like to change.";

    return new Response(
      JSON.stringify({ html, message, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const isEdit = !!currentHtml;
    
    const designSystem = `
DESIGN SYSTEM - CREATE STUNNING, AWARD-WINNING PAGES:

COLOR PALETTES (pick one based on industry):
- Auto/Warranty: Deep navy (#0f172a) → Electric blue (#3b82f6) → Cyan accents (#22d3ee)
- Real Estate: Charcoal (#1c1917) → Warm amber (#f59e0b) → Cream (#fef3c7)
- Healthcare: Slate (#334155) → Teal (#14b8a6) → Mint (#99f6e4)
- Restaurant: Dark burgundy (#450a0a) → Rich red (#dc2626) → Gold (#fbbf24)
- Finance: Navy (#1e3a5f) → Royal blue (#2563eb) → Silver (#e2e8f0)
- Default: Slate (#0f172a) → Violet (#8b5cf6) → Pink (#ec4899)

VISUAL EFFECTS (use liberally):
- Hero gradients: bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900
- Glass cards: bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl
- Glow effects: shadow-2xl shadow-blue-500/25
- Floating elements: Use transform hover:scale-105 transition-all duration-500
- Animated gradients: Use background-size: 200% with animation
- Mesh gradients: Layer multiple radial gradients for depth

TYPOGRAPHY:
- Headlines: text-5xl md:text-7xl font-black tracking-tight
- Subheadlines: text-xl md:text-2xl font-light text-white/70
- Use gradient text: bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent

LAYOUT PATTERNS:
- Full-bleed hero with min-h-screen
- Floating cards with -mt-20 overlap effects
- Asymmetric grids for visual interest
- Generous whitespace (py-24, px-8)

MICRO-INTERACTIONS:
- Buttons: hover:shadow-lg hover:shadow-blue-500/50 hover:-translate-y-1 transition-all
- Cards: hover:border-white/20 hover:bg-white/10 transition-all duration-300
- Images: hover:scale-105 transition-transform duration-700

TRUST ELEMENTS:
- Star ratings with gold color
- "As seen on" logo bars
- Security badges
- Customer count ("Join 50,000+ customers")
- Money-back guarantees`;

    const systemPrompt = isEdit 
      ? `You are an elite landing page designer. Modify the existing page based on user requests.

CURRENT HTML:
\`\`\`html
${currentHtml}
\`\`\`

RULES:
1. Make ONLY the changes requested
2. Keep everything else exactly the same
3. Maintain the design quality
4. Return COMPLETE HTML (not fragments)
5. NO markdown - raw HTML only
6. Start with <!DOCTYPE html>

${designSystem}`

      : `You are an elite, award-winning landing page designer known for creating stunning, conversion-optimized pages.

CREATE A BREATHTAKING LANDING PAGE with these requirements:

TECHNICAL:
1. Start with <!DOCTYPE html>
2. Include: <script src="https://cdn.tailwindcss.com"></script>
3. Add custom Tailwind config for animations:
   <script>
     tailwind.config = {
       theme: {
         extend: {
           animation: {
             'float': 'float 6s ease-in-out infinite',
             'glow': 'glow 2s ease-in-out infinite alternate',
           }
         }
       }
     }
   </script>
   <style>
     @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
     @keyframes glow { from { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); } to { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8); } }
   </style>

FORM EMBED (place prominently):
<iframe src="/f/${selectedFormId}" class="w-full h-[550px] border-0 rounded-2xl" title="Claim Form"></iframe>

${designSystem}

PAGE STRUCTURE:
1. HERO (min-h-screen): 
   - Full-screen gradient background with subtle pattern overlay
   - Massive headline with gradient text
   - Compelling subheadline
   - Floating decorative elements (blurred circles, etc.)
   - Trust badges row

2. SOCIAL PROOF:
   - Customer logos or "As featured in" section
   - Stats bar (e.g., "50,000+ Happy Customers | $2M+ Rewards Given | 4.9★ Rating")

3. BENEFITS (3-4 cards):
   - Glass-morphism cards
   - Icons with glow effects
   - Hover animations

4. FORM SECTION:
   - Dark card container with glow
   - Clear headline "Claim Your Reward"
   - The embedded form
   - Security badges below

5. TESTIMONIALS:
   - 2-3 customer quotes
   - Star ratings
   - Customer photos (use placeholder)

6. FAQ (optional):
   - Accordion-style or simple list

7. FOOTER:
   - Minimal, dark
   - Copyright + "Powered by ACE Engage"

OUTPUT: Return ONLY the complete HTML. No markdown. No explanations.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (isEdit && chatHistory.length > 0) {
      for (const msg of chatHistory.slice(-6)) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else {
          messages.push({ role: 'assistant', content: 'Done.' });
        }
      }
    }

    messages.push({ 
      role: 'user', 
      content: isEdit 
        ? `Make this change: ${prompt}`
        : `Create a stunning landing page for: ${prompt}. Make it BEAUTIFUL and modern.`
    });

    console.log('Calling OpenAI GPT-4o...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Using full GPT-4o for better design
        messages,
        max_tokens: 8000,
        temperature: 0.8,  // Slightly higher for more creativity
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let html = data.choices[0].message.content;

    // Clean up markdown artifacts
    html = html.replace(/^```html\n?/gi, '').replace(/\n?```$/gi, '').trim();
    html = html.replace(/^```\n?/gi, '').replace(/\n?```$/gi, '').trim();
    
    if (!html.toLowerCase().startsWith('<!doctype')) {
      html = '<!DOCTYPE html>\n' + html;
    }

    console.log('Success! Generated', html.length, 'chars');

    const message = isEdit 
      ? "✨ Updated! What else would you like to change?"
      : "🎨 Created your page! Tell me what to tweak.";

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

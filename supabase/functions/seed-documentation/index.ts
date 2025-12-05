import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const folderToCategory: Record<string, string> = {
  '1-GETTING-STARTED': 'getting-started',
  '2-ARCHITECTURE': 'architecture',
  '3-FEATURES': 'features',
  '4-DEVELOPER-GUIDE': 'developer-guide',
  '5-API-REFERENCE': 'api-reference',
  '6-USER-GUIDES': 'user-guides',
  '7-IMPLEMENTATION': 'implementation',
  '8-OPERATIONS': 'operations',
  '9-TROUBLESHOOTING': 'troubleshooting',
};

const categoryVisibility: Record<string, string[]> = {
  'getting-started': ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center'],
  'architecture': ['admin', 'tech_support', 'developer'],
  'features': ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer'],
  'developer-guide': ['admin', 'tech_support', 'developer'],
  'api-reference': ['admin', 'tech_support', 'developer'],
  'user-guides': ['admin', 'tech_support'],
  'implementation': ['admin', 'tech_support'],
  'operations': ['admin', 'tech_support'],
  'troubleshooting': ['admin', 'tech_support'],
};

const userGuideVisibility: Record<string, string[]> = {
  'admin-guide': ['admin'],
  'agency-guide': ['admin', 'tech_support', 'agency_owner'],
  'client-guide': ['admin', 'tech_support', 'agency_owner', 'company_owner'],
  'call-center-guide': ['admin', 'tech_support', 'agency_owner', 'company_owner', 'call_center'],
};

const slugToFile: Record<string, { folder: string; file: string }> = {
  'quickstart': { folder: '1-GETTING-STARTED', file: 'QUICKSTART.md' },
  'overview': { folder: '1-GETTING-STARTED', file: 'OVERVIEW.md' },
  'first-campaign': { folder: '1-GETTING-STARTED', file: 'FIRST_CAMPAIGN.md' },
  'terminology': { folder: '1-GETTING-STARTED', file: 'TERMINOLOGY.md' },
  'mvp-setup': { folder: '1-GETTING-STARTED', file: 'MVP_SETUP.md' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const docs = [];

    // For now, just seed the key documents we need
    const baseUrl = 'https://raw.githubusercontent.com/Phillboard/mobul/main/public/docs';
    
    for (const [slug, file] of Object.entries(slugToFile)) {
      try {
        const url = `${baseUrl}/${file.folder}/${file.file}`;
        const response = await fetch(url);
        
        if (!response.ok) continue;
        
        const content = await response.text();
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : slug;
        
        const category = folderToCategory[file.folder];
        const visibility = categoryVisibility[category] || ['admin'];
        
        docs.push({
          category,
          slug,
          title,
          content,
          file_path: `/docs/${file.folder}/${file.file}`,
          visible_to_roles: visibility,
          doc_audience: category === 'getting-started' ? 'public' : 'user',
          order_index: 1,
        });
      } catch (e) {
        console.error(`Failed to fetch ${slug}:`, e);
      }
    }

    // Upsert all docs
    const { error } = await supabaseClient
      .from('documentation_pages')
      .upsert(docs, { onConflict: 'slug' });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: docs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

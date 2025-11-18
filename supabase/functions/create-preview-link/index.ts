import { createClient } from 'npm:@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { campaignId, password, expiresInHours, maxViews } = await req.json();

    // Generate unique token
    const tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      passwordHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 168)); // Default 7 days

    // Create preview link
    const { data, error } = await supabase
      .from('preview_links')
      .insert({
        campaign_id: campaignId,
        token,
        password_hash: passwordHash,
        expires_at: expiresAt.toISOString(),
        max_views: maxViews || null,
        created_by_user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Preview link created for campaign ${campaignId}: ${token}`);

    return new Response(
      JSON.stringify({
        success: true,
        previewLink: data,
        url: `${Deno.env.get('SUPABASE_URL')?.replace('/v1', '')}/preview/${token}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating preview link:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

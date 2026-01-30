import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createActivityLogger } from '../_shared/activity-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const activityLogger = createActivityLogger(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { client_id, name } = await req.json();

    if (!client_id || !name) {
      throw new Error('Missing required fields: client_id, name');
    }

    // Verify user has access to this client
    const { data: clientAccess, error: accessError } = await supabaseClient
      .rpc('user_can_access_client', { 
        _user_id: user.id, 
        _client_id: client_id 
      });

    if (accessError || !clientAccess) {
      throw new Error('You do not have permission to create API keys for this client');
    }

    // Generate a cryptographically secure API key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const apiKey = `ace_live_${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    // Hash the API key for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create key prefix for display (e.g., "ace_live_••••••••3x7k")
    const keyPrefix = apiKey.substring(0, 9) + '••••••••' + apiKey.slice(-4);

    // Insert the API key into the database
    const { data: apiKeyData, error } = await supabaseClient
      .from('api_keys')
      .insert({
        client_id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`API key created: ${apiKeyData.id} for client ${client_id}`);

    // Log activity
    await activityLogger.api('api_key_created', 'success', {
      userId: user.id,
      clientId: client_id,
      description: `API key "${name}" created`,
      metadata: {
        api_key_id: apiKeyData.id,
        key_name: name,
        key_prefix: keyPrefix,
      },
    });

    return new Response(
      JSON.stringify({
        id: apiKeyData.id,
        api_key: apiKey, // Return full key only once
        key_prefix: keyPrefix,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating API key:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

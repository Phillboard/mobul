/**
 * Shared Supabase Client for Edge Functions
 * Use this instead of creating clients manually
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

let serviceClient: SupabaseClient | null = null;

/**
 * Create a Supabase client with service role (admin) access
 * Use for server-side operations that need full access
 */
export function createServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  
  return serviceClient;
}

/**
 * Create a Supabase client with user's JWT token
 * Use for operations that should respect RLS
 */
export function createUserClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false },
  });
}

